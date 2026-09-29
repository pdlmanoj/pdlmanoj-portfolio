import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { Marked, Renderer, type Tokens } from 'marked';
import { codeToHtml } from 'shiki';
import type { Plugin } from 'vite';
import {
  writePostPages,
  writeRobots,
  writeSitemap,
  writeCname,
  patchIndexHtml,
  type ListingPageData,
} from './post-pages';

/**
 * ---------------------------------------------------------------------------
 * Markdown blog pipeline.
 *
 * Everything here runs at BUILD TIME, on your machine or in CI. That is the
 * whole point: the deployed site is plain HTML, so posts are fast, work with no
 * backend, and the markdown itself never reaches the browser.
 *
 * Drop an `index.md` file in a folder under `src/content/blog/` and that folder
 * name becomes the post: it appears in the list and gets its own page at
 * `/blog/<folder-name>/`. Nothing else to register.
 *
 * A post is one folder: the markdown plus every asset it references, so a post
 * and its images are moved, renamed or deleted together. Images go next to the
 * `index.md` and are written `![alt](./diagram.svg)`, the same as before.
 *
 * What it does per post:
 *   1. reads YAML frontmatter (title, date, description)
 *   2. renders markdown to HTML
 *   3. syntax-highlights code fences with Shiki, in a light AND a dark colour
 *      scheme, so code blocks follow the site's theme toggle
 *   4. copies the images the post references into the build with a hashed
 *      filename, so `![alt](./diagram.svg)` just works
 *   5. emits a `virtual:blog-index` module with the metadata for the list page
 *   6. after the build, writes `blog/<slug>/index.html` for every post with its
 *      own title, description, canonical URL and social card tags, so a link
 *      shared on Twitter or Slack shows the post instead of the homepage
 * ---------------------------------------------------------------------------
 */

/**
 * Absolute, because Vite reports changed files and module ids as absolute paths.
 * A relative prefix here would silently never match.
 */
const POSTS_DIR = path.resolve('src/content/blog');
const SITE_DATA = 'src/data/site.ts';
const SEO_DATA = 'src/lib/seo.ts';
/** The listing pages written at build time, in the order the sitemap lists them. */
const LISTING_PAGES = ['projects', 'experience'] as const;
const PROJECTS_DATA = 'src/data/projects.ts';
const EXPERIENCE_DATA = 'src/data/experience.ts';
/** Every post folder holds this file. It is what makes the folder a post. */
const POST_ENTRY = 'index.md';
/** Fallback card. A post can override it with public/og/<slug>.png. */
const DEFAULT_PREVIEW = '/og.png';
const VIRTUAL_INDEX = 'virtual:blog-index';
const RESOLVED_INDEX = `\0${VIRTUAL_INDEX}`;
const WORDS_PER_MINUTE = 220;
/** Meta description for the blog archive page, `/blog/`. */
const BLOG_DESCRIPTION =
  'Every post on backend systems, networking and the tools around them, newest first.';

/** Fence info looks like: python title="app.py" */
function parseFence(info: string): { lang: string; title?: string } {
  const [lang = '', ...rest] = info.trim().split(/\s+/);
  const titleMatch = rest.join(' ').match(/title="([^"]+)"/);
  return { lang: lang || 'text', title: titleMatch?.[1] };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}

/** Reads a post from disk and returns its metadata for the list page. */
function readSummary(slug: string): {
  slug: string;
  title: string;
  date?: string;
  description?: string;
  readingTime: number;
} {
  const fullPath = postPath(slug);
  const { data, content } = matter(fs.readFileSync(fullPath, 'utf8'));

  if (!data.title || typeof data.title !== 'string') {
    throw new Error(`[blog] ${fullPath} is missing a "title" in its frontmatter.`);
  }

  const words = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`\-[\]()]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;

  return {
    slug,
    title: data.title,
    date: data.date instanceof Date ? data.date.toISOString().slice(0, 10) : data.date,
    description: typeof data.description === 'string' ? data.description : undefined,
    readingTime: Math.max(1, Math.round(words / WORDS_PER_MINUTE)),
  };
}

/** Absolute path of a post's entry file, from its slug. */
function postPath(slug: string): string {
  return path.join(POSTS_DIR, slug, POST_ENTRY);
}

/**
 * Every post slug, in a stable order. A slug is a folder under POSTS_DIR that
 * contains an `index.md`.
 */
function postSlugs(): string[] {
  assertNoStrayMarkdown();

  return fs
    .readdirSync(POSTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(postPath(entry.name)))
    .map((entry) => entry.name)
    .sort();
}

/**
 * Markdown sitting anywhere other than a post folder's `index.md` is never
 * imported, so it would never be published and would fail silently. That is the
 * worst outcome for a new post — you write it, refresh, and it is simply not
 * there — so it fails the build instead, and says where a post has to live.
 */
function assertNoStrayMarkdown(): void {
  const strays: string[] = [];

  for (const entry of fs.readdirSync(POSTS_DIR, { withFileTypes: true })) {
    if (entry.isFile()) {
      if (entry.name.endsWith('.md')) strays.push(entry.name);
      continue;
    }
    if (!entry.isDirectory()) continue;

    // Any .md other than the entry means the post is split across two files.
    const dir = path.join(POSTS_DIR, entry.name);
    strays.push(
      ...fs
        .readdirSync(dir, { withFileTypes: true })
        .filter(
          (child) => child.isFile() && child.name.endsWith('.md') && child.name !== POST_ENTRY,
        )
        .map((child) => `${entry.name}/${child.name}`),
    );
  }

  if (strays.length) {
    throw new Error(
      `[blog] not a post: ${strays.join(', ')}. A post is a folder holding an ${POST_ENTRY} — ` +
        `src/content/blog/<slug>/${POST_ENTRY} — with that post's images beside it.`,
    );
  }
}

/**
 * The same rule, for the single post being transformed. `postSlugs` covers the
 * files on disk; this catches a path that only reaches the module graph, such
 * as a hand-written import.
 */
function assertIsPost(id: string): string {
  const relative = path.relative(POSTS_DIR, id);
  const [slug, entry, ...extra] = relative.split(path.sep);

  if (entry !== POST_ENTRY || !slug || extra.length) {
    throw new Error(
      `[blog] ${relative} is not a post. A post is a folder holding an ${POST_ENTRY}: ` +
        `src/content/blog/<slug>/${POST_ENTRY}, with that post's images beside it.`,
    );
  }

  return slug;
}

/**
 * Preview image for a post's social card. Social networks only accept raster
 * formats, so the card is a PNG: `public/og/<slug>.png` when you have made one,
 * otherwise the site-wide `public/og.png`.
 */
function previewImage(slug: string): string {
  return fs.existsSync(`public/og/${slug}.png`) ? `/og/${slug}.png` : DEFAULT_PREVIEW;
}

/**
 * The string fields of each object literal in a data file, in file order.
 *
 * The projects and the experience are the two pages whose HTML is written here, and
 * their content lives in `src/data/*.ts` as TypeScript the app imports. That code is
 * compiled by Vite for the app and is not importable from this file, so it is read as
 * text, the same way the site url above is. Both files are a flat list of plain
 * objects with quoted string fields, which is all a crawler's fallback list needs;
 * anything else (an array field, a nested object) is skipped, because a value
 * without quotes is not what this reads.
 *
 * A file that stops looking like that would silently produce an empty list, so an
 * empty result fails the build instead of shipping a blank page.
 */
function readDataObjects(file: string): Record<string, string>[] {
  // Full-line comments are dropped so an option that is written out but commented
  // out is not read as content. A `//` inside a value, as in `https://`, is left
  // alone, because only a whole line counts here.
  const source = fs.readFileSync(file, 'utf8').replace(/^\s*\/\/.*$/gm, '');

  const objects = [...source.matchAll(/\{([^{}]*)\}/g)]
    .map(([, body]) => {
      const fields: Record<string, string> = {};
      for (const [, key, value] of body.matchAll(/(\w+):\s*'((?:[^'\\]|\\.)*)'/g)) {
        fields[key] = value.replace(/\\'/g, "'");
      }
      return fields;
    })
    // Braces that hold no quoted field are not entries: `import type { Project }`
    // and a commented-out option would both turn up here.
    .filter((fields) => Object.keys(fields).length > 0);

  if (objects.length === 0) {
    throw new Error(
      `[build] read no entries out of ${file}. The static pages for it are written from ` +
        'those entries, so this stops the build rather than shipping an empty page.',
    );
  }

  return objects;
}

/** One page's copy, read from the single place the app reads it from. */
function readListingPage(id: string): ListingPageData {
  const source = fs.readFileSync(SEO_DATA, 'utf8');
  const match = source.match(new RegExp(`${id}:\\s*'((?:[^'\\\\]|\\\\.)*)'`));
  const description = match?.[1];

  if (!description) {
    throw new Error(`[build] no description for the ${id} page in ${SEO_DATA}.`);
  }

  if (id === 'projects') {
    return {
      id,
      description,
      image: DEFAULT_PREVIEW,
      items: readDataObjects(PROJECTS_DATA).map((project) => ({
        text: project.title,
        href: project.githubUrl,
      })),
    };
  }

  return {
    id,
    description,
    image: DEFAULT_PREVIEW,
    items: readDataObjects(EXPERIENCE_DATA).map((entry) => {
      // Newest first is how the data file is written, and it is the order a reader
      // wants here too. The period goes in brackets because it is itself a span
      // between two dashes, and two of them in a row is unreadable.
      const who = [entry.role, entry.company].filter(Boolean).join(' — ');
      return { text: entry.period ? `${who} (${entry.period})` : who };
    }),
  };
}

/**
 * The deployed site URL, read from src/data/site.ts so there is one place to
 * change it. Kept as a regex rather than an import: this file is compiled by
 * Vite, not by the app, and importing app code here would be fragile.
 */
function readSiteUrl(): string {
  const source = fs.readFileSync(SITE_DATA, 'utf8');
  const match = source.match(/\burl:\s*'([^']+)'/);

  if (!match) {
    throw new Error(`[blog] could not read the site url from ${SITE_DATA}.`);
  }
  return match[1].replace(/\/+$/, '');
}

/** Just enough of Vite's module graph to invalidate it from a hot update. */
/** Tokens carrying HTML this plugin produced in its pre-pass. */
type RenderedCode = Tokens.Code & { html?: string };
type RenderedImage = Tokens.Image & { html?: string };

function imageTag(src: string, token: Tokens.Image): string {
  return `<img src="${escapeAttribute(src)}" alt="${escapeAttribute(token.text)}"${
    token.title ? ` title="${escapeAttribute(token.title)}"` : ''
  } loading="lazy" decoding="async" />`;
}

/** Remote images pass through; local ones return null so the caller can emit them. */
function renderImage(token: Tokens.Image): string | null {
  return /^(https?:)?\/\//.test(token.href) || token.href.startsWith('/')
    ? imageTag(token.href, token)
    : null;
}

/** One fenced block: Shiki-highlighted, with a language label and a copy button. */
async function renderCodeBlock(token: Tokens.Code): Promise<string> {
  const { lang, title } = parseFence(token.lang ?? '');
  const source = token.text.replace(/\n$/, '');
  const themes = { light: 'github-light', dark: 'github-dark' } as const;

  let highlighted: string;
  try {
    highlighted = await codeToHtml(source, { lang, themes, defaultColor: false });
  } catch {
    // Unknown language: show the code unhighlighted rather than fail the build.
    highlighted = await codeToHtml(source, { lang: 'text', themes, defaultColor: false });
  }

  return [
    `<figure class="code-block">`,
    `<figcaption class="code-block-bar">`,
    `<span class="code-block-name">${escapeAttribute(title ?? lang)}</span>`,
    `<button type="button" class="code-copy" data-copy-code>Copy</button>`,
    `</figcaption>`,
    highlighted,
    `</figure>`,
  ].join('');
}

export function markdownBlog(): Plugin {
  /** Set in `build`, read in `transform`. */
  let isServe = false;

  return {
    name: 'markdown-blog',

    configResolved(config) {
      isServe = config.command === 'serve';
    },

    resolveId(id) {
      return id === VIRTUAL_INDEX ? RESOLVED_INDEX : null;
    },

    /**
     * Puts the real site URL into `index.html` before anything reads it. Runs in
     * `serve` too, so the dev server serves the same canonical and Open Graph URLs
     * the deployed site does rather than a token. Every page the app writes is
     * rendered from the patched `index.html`, so this is the one substitution all
     * of them inherit.
     */
    transformIndexHtml(html) {
      return patchIndexHtml(html, readSiteUrl());
    },

    /**
     * Adding, editing or deleting a post has to rebuild the index, which the
     * dev server would otherwise keep serving from its module graph. Invalidate
     * it and hand it back so Vite pushes the update; it has no `accept` handler,
     * so an open page just reloads with the new list.
     */
    hotUpdate(ctx) {
      if (!ctx.file.startsWith(`${POSTS_DIR}/`) || !ctx.file.endsWith('.md')) return;

      const { environment } = this;
      const graph = environment.moduleGraph;

      /**
       * The post itself is a module too, and the browser will re-request it
       * after the reload below. Its transform result is cached, so it has to be
       * dropped here or the reload is served the text from before the edit.
       */
      for (const mod of graph.getModulesByFile(ctx.file) ?? []) {
        graph.invalidateModule(mod);
      }

      /**
       * The index carries every post's summary, so adding, editing or deleting a
       * file changes it. It has to be invalidated, or the reload below would be
       * served a stale transform.
       */
      const index = graph.getModuleById(RESOLVED_INDEX);
      if (index) graph.invalidateModule(index);

      /**
       * The reader holds the post it loaded in React state, so swapping the
       * module in place would leave the old text on screen. A reload is the
       * honest signal that what is on screen matches the file, and it is what
       * makes a new or deleted post appear in the list.
       */
      environment.hot.send({ type: 'full-reload', path: '*' });

      // Nothing to hot-update: the client is reloading the page instead.
      return [];
    },

    load(id) {
      if (id !== RESOLVED_INDEX) return null;

      const summaries = postSlugs().map(readSummary);
      // Newest first. Undated posts fall to the end, then alphabetical.
      summaries.sort((a, b) => {
        if (a.date === b.date) return a.slug.localeCompare(b.slug);
        if (!a.date) return 1;
        if (!b.date) return -1;
        return b.date.localeCompare(a.date);
      });

      return `export const posts = ${JSON.stringify(summaries, null, 2)};\n`;
    },

    async transform(code, id) {
      if (!id.endsWith('.md')) return null;

      const slug = assertIsPost(id);
      const { data, content } = matter(code);

      if (!data.title || typeof data.title !== 'string') {
        throw new Error(`[blog] ${slug}/${POST_ENTRY} is missing a "title" in its frontmatter.`);
      }

      // Asset references collected while rendering images, filled in below.
      const assets: string[] = [];
      const markdownDir = path.dirname(id);
      // `this` inside a marked renderer is the renderer, so keep Vite's context.
      const emitAsset = this.emitFile.bind(this);

      const marked = new Marked({ gfm: true });

      /**
       * Shiki highlighting and asset emission are async, but marked's parser is
       * synchronous and happily stringifies a promise as "[object Promise]".
       * So the two async node types are rendered up front, in document order,
       * and the synchronous renderer below just hands the results back.
       */
      const tokens = marked.lexer(content);
      const pending: Promise<unknown>[] = [];

      marked.walkTokens(tokens, (token) => {
        if (token.type === 'code') {
          const node = token as RenderedCode;
          pending.push(
            renderCodeBlock(node).then((html) => {
              node.html = html;
            }),
          );
        } else if (token.type === 'image') {
          const node = token as RenderedImage;
          const html = renderImage(node);
          if (html !== null) {
            node.html = html;
          } else {
            const filePath = path.resolve(markdownDir, node.href);
            if (!fs.existsSync(filePath)) {
              throw new Error(
                `[blog] ${slug}/${POST_ENTRY} references a missing image: ${node.href}`,
              );
            }
            if (isServe) {
              // `emitFile` throws in dev, so serve the file straight from disk.
              // The dev server exposes project files under /@fs/.
              node.html = imageTag(`/@fs${filePath}`, node);
            } else {
              const slot = assets.length;
              assets.push(
                emitAsset({
                  type: 'asset',
                  /**
                   * Namespaced by slug on purpose: two posts both shipping a
                   * `diagram.svg` would otherwise land on the same output name,
                   * and the second one would silently overwrite the first.
                   */
                  name: `${slug}/${path.basename(filePath)}`,
                  source: fs.readFileSync(filePath),
                }),
              );
              node.html = imageTag(`__ASSET_${slot}__`, node);
            }
          }
        }
      });

      await Promise.all(pending);

      const renderer = new Renderer();
      const fallbackCode = renderer.code.bind(renderer);
      const fallbackImage = renderer.image.bind(renderer);
      renderer.code = (token) => (token as RenderedCode).html ?? fallbackCode(token);
      renderer.image = (token) => (token as RenderedImage).html ?? fallbackImage(token);

      let html = marked.parser(tokens, { ...marked.defaults, renderer });

      // Wrap standalone images in a <figure> so captions and spacing behave.
      html = html.replace(
        /<p>(\s*<img src="(?:__ASSET_\d+__|\/|[^"]*?\.(?:png|jpg|jpeg|gif|webp|svg))"[^>]*>\s*)<\/p>/g,
        '<figure class="prose-figure">$1</figure>',
      );

      const frontmatter = {
        title: data.title as string,
        image: previewImage(slug),
        date:
          data.date instanceof Date
            ? data.date.toISOString().slice(0, 10)
            : typeof data.date === 'string'
              ? data.date
              : undefined,
        description: typeof data.description === 'string' ? data.description : undefined,
      };

      const assetImports = assets
        .map((reference, slot) => `assets[${slot}] = import.meta.ROLLUP_FILE_URL_${reference};`)
        .join('\n');

      const substitutions = assets.length
        ? `\nconst assets = [];\n${assetImports}\nfor (const [slot, url] of assets.entries()) {\n  html = html.split(\`__ASSET_\${slot}__\`).join(url);\n}\n`
        : '';

      return {
        code: [
          `const frontmatter = ${JSON.stringify(frontmatter)};`,
          `let html = ${JSON.stringify(html)};`,
          substitutions,
          `export const slug = ${JSON.stringify(slug)};`,
          `export { frontmatter, html };`,
          `export default { slug, frontmatter, html };`,
        ]
          .filter(Boolean)
          .join('\n'),
        map: null,
      };
    },

    /**
     * Runs once the bundle is written. Every post becomes a real static page
     * under `blog/<slug>/`, and the sitemap picks them up.
     */
    closeBundle() {
      if (isServe) return;

      const siteUrl = readSiteUrl();
      const posts = postSlugs().map((slug) => {
        const summary = readSummary(slug);
        return { ...summary, image: previewImage(summary.slug) };
      });

      const options = {
        outDir: 'dist',
        siteUrl,
        posts,
        blog: { description: BLOG_DESCRIPTION, image: DEFAULT_PREVIEW },
        pages: LISTING_PAGES.map(readListingPage),
      };
      const written = writePostPages(options);
      writeSitemap(options);
      writeRobots(options);
      /**
       * Written after the pages, and from the same `options`, so the domain Pages
       * will serve the site at is the one every canonical, OG tag and sitemap
       * entry in those pages was built with.
       */
      writeCname(options);

      this.info(
        `wrote the blog archive, ${LISTING_PAGES.length} listing pages and ` +
          `${written.length - LISTING_PAGES.length - 1} post pages, plus ` +
          `sitemap.xml, robots.txt and CNAME`,
      );
    },

    configureServer(server) {
      // Adding or deleting a post changes the virtual index, so drop its cache.
      server.watcher.on('add', (file) => {
        if (file.endsWith('.md')) {
          const mod = server.moduleGraph.getModuleById(RESOLVED_INDEX);
          if (mod) server.moduleGraph.invalidateModule(mod);
          server.ws.send({ type: 'full-reload' });
        }
      });
      server.watcher.on('unlink', (file) => {
        if (file.endsWith('.md')) {
          const mod = server.moduleGraph.getModuleById(RESOLVED_INDEX);
          if (mod) server.moduleGraph.invalidateModule(mod);
          server.ws.send({ type: 'full-reload' });
        }
      });
    },
  };
}
