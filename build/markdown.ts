import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { Marked, Renderer, type Tokens } from 'marked';
import { codeToHtml } from 'shiki';
import type { Plugin } from 'vite';
import {
  writePostPages,
  writePreviewImages,
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
 * `/blog/<folder-name>/`. Nothing else to register. `published: false` in the
 * frontmatter holds it back while it is being written — see `parsePublished`.
 *
 * A post is one folder: the markdown plus every asset it references, so a post
 * and its images are moved, renamed or deleted together. Images go next to the
 * `index.md` and are written `![alt](./diagram.svg)`, the same as before. The
 * share card is named in the frontmatter the same way, `image: ./cover.png`.
 *
 * What it does per post:
 *   1. reads YAML frontmatter (title, date, description, image, published)
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
/**
 * Formats a share card can be in. Social networks fetch the image and read its
 * type, so anything else is a blank preview: Twitter, Slack and WhatsApp all
 * ignore an SVG card, which is the one mistake here that fails silently.
 */
const CARD_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
const VIRTUAL_INDEX = 'virtual:blog-index';
const RESOLVED_INDEX = `\0${VIRTUAL_INDEX}`;
const WORDS_PER_MINUTE = 220;
/**
 * Characters of a derived description. Google's snippets run to about 160 and
 * get truncated past that anyway, so anything longer is a longer string that
 * still ends up cut somewhere.
 */
const SUMMARY_LIMIT = 155;
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

/**
 * The tags in a post's frontmatter.
 *
 * A bare string is accepted as a single tag, because `tags: python` is what most
 * people write first and failing a build over it teaches nothing. Anything else
 * is refused: a tag is shown to a reader, so a number or a nested list would
 * render as `[object Object]` in the middle of the page.
 */
function parseTags(value: unknown, slug: string): string[] {
  if (value === undefined || value === null) return [];

  const list = Array.isArray(value) ? value : [value];
  if (!list.every((tag) => typeof tag === 'string')) {
    throw new Error(
      `[blog] ${slug}/${POST_ENTRY} has a "tags" that is not a list of words: ` +
        `${JSON.stringify(value)}. Write them as a list, e.g. tags: ['python', 'memory'].`,
    );
  }

  return (list as string[]).map((tag) => tag.trim()).filter(Boolean);
}

/**
 * The post's own description, derived from its first paragraph.
 *
 * A `description` field in the frontmatter is one more thing to forget and one
 * more thing to leave stale, and a stale one is worse than none: Google shows
 * it in the result, so a wrong one costs the click. A post's opening paragraph
 * is already a deliberate sentence about the post, so it is the description, and
 * there is nothing to keep in sync.
 *
 * Cut on a word boundary and without an ellipsis, because Google's own snippet
 * generator does the same thing and an ellipsis in a meta description reads as
 * truncated rather than chosen.
 */
function deriveSummary(content: string): string | undefined {
  const paragraph = content
    /**
     * Frontmatter is already stripped, but a fenced block inside the body is
     * not prose: its contents are code, and a post that opens with one has no
     * sentence to quote.
     */
    .replace(/```[\s\S]*?```/g, ' ')
    /**
     * A lead image carries its own alt text, which is already in the article
     * body, and a link's label is the sentence, not its URL.
     */
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .split(/\n\s*\n/)
    .map((block) =>
      block
        /**
         * A heading introduces a section rather than describing the post, and a
         * list of three short lines reads as a fragment when cut to one line.
         */
        .replace(/^[#>\s-]+/, '')
        .replace(/[*_`]/g, '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .find((block) => block.length > 0);

  if (!paragraph) return undefined;
  if (paragraph.length <= SUMMARY_LIMIT) return paragraph;

  /**
   * Prefer a whole sentence. Google's own generator drops a half-finished clause
   * rather than cutting mid-word, and so does a reader scanning a result page: a
   * snippet that ends on a full stop reads as written, one that ends on "when I"
   * reads as broken.
   */
  const window = paragraph.slice(0, SUMMARY_LIMIT);
  const lastStop = Math.max(window.lastIndexOf('. '), window.lastIndexOf('? '));
  if (lastStop > SUMMARY_LIMIT / 2) return window.slice(0, lastStop + 1).trim();

  const lastSpace = window.lastIndexOf(' ');
  return (lastSpace > SUMMARY_LIMIT / 2 ? window.slice(0, lastSpace) : window).trim();
}

/**
 * A post's html with every `__ASSET_n__` placeholder replaced by the URL the
 * emitted asset ended up at.
 *
 * Written document-relative on purpose: the same string is dropped into
 * `dist/blog/<slug>/index.html`, and `renderPage` rewrites `./` against that
 * page's own depth the same way it does for the app's assets.
 */
function resolveAssetPlaceholders(
  html: string,
  assets: string[],
  getFileName: (reference: string) => string,
): string {
  return assets.reduce((out, reference, slot) => {
    const fileName = getFileName(reference);
    /**
     * A silent `src=""` is worse than a failed build: the page still serves, the
     * image is still gone, and nothing says why. `assetsInlineLimit: 0` below is
     * what keeps this unreachable by not inlining post images in the first place.
     */
    if (!fileName) {
      throw new Error(`[blog] an image was inlined instead of emitted, so it has no URL.`);
    }
    return out.split(`__ASSET_${slot}__`).join(`./${fileName}`);
  }, html);
}

/**
 * The post's modification date, from `updated:` in the frontmatter.
 *
 * Optional, and absent means the post has never been revised — which is a fact
 * worth stating rather than filling in. The obvious alternative, the file's last
 * commit date, is not usable: the deploy workflow checks out a shallow clone, so
 * there is no history to read there, and a build that guessed would claim a post
 * was revised when only its bundle was rebuilt.
 */
function resolveUpdated(slug: string, value: unknown, published?: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;

  const updated = value instanceof Date ? value.toISOString().slice(0, 10) : value;
  if (typeof updated !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(updated)) {
    throw new Error(
      `[blog] ${slug}/${POST_ENTRY} has an "updated" that is not a date: ${JSON.stringify(value)}. ` +
        `Write it as YYYY-MM-DD, e.g. updated: '2026-01-02'.`,
    );
  }

  if (published && updated < published) {
    throw new Error(
      `[blog] ${slug}/${POST_ENTRY} was updated on ${updated}, before it was published on ` +
        `${published}. A post cannot be revised before it exists.`,
    );
  }

  return updated;
}

/**
 * `published: false` in the frontmatter holds a post back.
 *
 * A draft gets no listing entry, no page, no sitemap row and no share card, so
 * pushing one cannot show a half-written post to a reader or a crawler. It is
 * how a post is written on the live repo: the folder and its markdown are
 * committed as they are, and the one line that publishes them is added when the
 * writing is done.
 *
 * Absent means published, not the other way round. A new field defaulting to
 * hidden would silently unpublish every post that does not name it, and a blog
 * that quietly loses its posts is worse than one that shows a draft; opting in
 * to a draft is also one word to forget, while removing a word to publish is the
 * step you take deliberately.
 *
 * Only `true` and `false` are accepted. This is the one field where a typo is
 * dangerous rather than noisy — `published: 'false'` or `published: no` read as
 * a non-empty string, which is not `false`, so a post marked as a draft would
 * publish instead. Refusing the value is the only outcome that is safe here.
 */
function parsePublished(slug: string, value: unknown): boolean {
  if (value === undefined || value === null) return true;

  if (typeof value !== 'boolean') {
    throw new Error(
      `[blog] ${slug}/${POST_ENTRY} has a "published" that is not true or false: ` +
        `${JSON.stringify(value)}. Write it unquoted as published: false to hold the post ` +
        `back, or leave the field out to publish it.`,
    );
  }

  return value;
}

/**
 * The post's title, which every published post has to have: it is the `h1`, the
 * `<title>`, the Open Graph title and the archive row.
 *
 * A draft is the exception, because a draft is often written before it is
 * finished and a post that is mid-write is exactly the one whose title is not
 * written yet. Its slug stands in, which is never published and only ever read
 * in the dev server.
 */
function resolveTitle(slug: string, value: unknown, published: boolean): string {
  if (typeof value === 'string' && value.trim()) return value;

  if (published) {
    throw new Error(`[blog] ${slug}/${POST_ENTRY} is missing a "title" in its frontmatter.`);
  }

  return slug;
}

/** One post's metadata, as the index and the static page writers consume it. */
interface PostSummary {
  slug: string;
  title: string;
  date?: string;
  updated?: string;
  tags: string[];
  summary?: string;
  readingTime: number;
}

/**
 * Reads a post from disk: its metadata for the list page, and whether it opted
 * out of publication.
 *
 * The flag travels beside the metadata rather than inside it because every
 * consumer of a summary wants one or the other, never both: the reader of the
 * index wants posts that are published, and the filter wants to know which are
 * not.
 */
function readSummary(slug: string): { summary: PostSummary; published: boolean } {
  const fullPath = postPath(slug);
  const { data, content } = matter(fs.readFileSync(fullPath, 'utf8'));
  const published = parsePublished(slug, data.published);
  const date = data.date instanceof Date ? data.date.toISOString().slice(0, 10) : data.date;

  const words = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`\-[\]()]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;

  return {
    published,
    summary: {
      slug,
      title: resolveTitle(slug, data.title, published),
      date,
      updated: published ? resolveUpdated(slug, data.updated, date) : undefined,
      tags: parseTags(data.tags, slug),
      summary: deriveSummary(content),
      readingTime: Math.max(1, Math.round(words / WORDS_PER_MINUTE)),
    },
  };
}

/**
 * Every published post's metadata, newest first. Undated posts fall to the end,
 * then alphabetical.
 *
 * Drafts are dropped here, which is the one place that keeps them out of
 * everything: the index is what the archive, the homepage count and the prev/next
 * and related links are all built from, so a draft can be neither listed nor
 * linked, and this is the same list the static pages and the sitemap are written
 * from. The dev server filters drafts out of the index too, so the list it shows
 * is the list the deployed site will show.
 */
function publishedSummaries(): PostSummary[] {
  const summaries = postSlugs()
    .map(readSummary)
    .filter((read) => read.published)
    .map((read) => read.summary);

  summaries.sort((a, b) => {
    if (a.date === b.date) return a.slug.localeCompare(b.slug);
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date.localeCompare(a.date);
  });

  return summaries;
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

/** One post's share card: the file to copy, and the URL the meta tags carry. */
interface PreviewImage {
  /** Site-root-relative, e.g. `/blog/my-post/og.png`. */
  url: string;
  /** Absolute path of the file to copy into the build. */
  source: string;
}

/**
 * The share card a post names in its own frontmatter, `image: './cover.png'`,
 * resolved against the post folder so the picture sits beside the markdown like
 * every other image in a post and the post still moves and deletes as one unit.
 *
 * A post with no `image` gets no card at all. There used to be a site-wide
 * fallback here, which meant every post previewed as a photo of the author with
 * no hint of the post: a text card carrying the post's own title is worth more
 * than a picture that says nothing, so the tags are simply not written.
 */
function resolvePreview(slug: string, value: unknown, postDir: string): PreviewImage | undefined {
  if (value === undefined || value === null) return undefined;

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(
      `[blog] ${slug}/${POST_ENTRY} has an "image" that is not a file name: ` +
        `${JSON.stringify(value)}.`,
    );
  }

  const file = path.resolve(postDir, value);
  const extension = path.extname(file).toLowerCase();

  if (!CARD_EXTENSIONS.includes(extension)) {
    const named = extension ? `a .${extension.slice(1)} file` : 'a name with no file extension';
    throw new Error(
      `[blog] ${slug}/${POST_ENTRY} has "image: ${value}", and ${named} is not a format social ` +
        'networks read. Twitter, Slack and WhatsApp ignore an SVG card, so the share preview ' +
        'would come out blank or fall back to whatever they scrape. Export a PNG, 1200x630, ' +
        'beside the markdown instead.',
    );
  }

  if (!fs.existsSync(file)) {
    throw new Error(
      `[blog] ${slug}/${POST_ENTRY} names a share image that does not exist: ${value}. It is ` +
        `read from the post's own folder, so the file has to sit beside the markdown.`,
    );
  }

  // `og.<ext>` rather than the author's file name: one predictable URL per post,
  // and nothing from a file name ends up in a URL a crawler records. The
  // extension is kept because it is the type the network checks first.
  return { url: `/blog/${slug}/og${extension}`, source: file };
}

/** The share card of one post, read from disk. Used by the static page writers. */
function postPreview(slug: string): PreviewImage | undefined {
  const { data } = matter(fs.readFileSync(postPath(slug), 'utf8'));
  return resolvePreview(slug, data.image, path.dirname(postPath(slug)));
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
      items: readDataObjects(PROJECTS_DATA).map((project) => ({
        text: project.title,
        href: project.githubUrl,
      })),
    };
  }

  return {
    id,
    description,
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

  /**
   * Every post's rendered html, keyed by slug, as `transform` produced it, plus
   * the Rollup reference each `__ASSET_n__` placeholder is waiting on.
   */
  const rendered = new Map<string, { html: string; assets: string[] }>();
  /**
   * The same html with real asset URLs, filled in by `generateBundle` and read by
   * `closeBundle`, which is the first hook that runs with `dist/` on disk.
   */
  const prerendered = new Map<string, string>();

  return {
    name: 'markdown-blog',

    configResolved(config) {
      isServe = config.command === 'serve';
    },

    /**
     * Every image a post shows has to have a real URL in the prerendered page —
     * an inlined asset exists only inside the JavaScript bundle, so a no-JS reader
     * and an image crawler would get nothing. None of the site's other images are
     * emitted from source, so nothing else is affected by not inlining.
     */
    config() {
      return { build: { assetsInlineLimit: 0 } };
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

      return `export const posts = ${JSON.stringify(publishedSummaries(), null, 2)};\n`;
    },

    async transform(code, id) {
      if (!id.endsWith('.md')) return null;

      const slug = assertIsPost(id);
      const { data, content } = matter(code);
      const published = parsePublished(slug, data.published);

      /**
       * A draft is still transformed, because `src/lib/blog.ts` globs every post
       * folder and a missing module is a build error. What it must not do is
       * refuse a half-written post: the title, the share card and the `updated`
       * check are all checked only for a post that is about to be published, so
       * a post being written cannot fail the deploy of everything else. The dev
       * server is the only place a draft is ever read.
       */

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

      const date =
        data.date instanceof Date
          ? data.date.toISOString().slice(0, 10)
          : typeof data.date === 'string'
            ? data.date
            : undefined;

      const frontmatter = {
        title: resolveTitle(slug, data.title, published),
        image: published ? resolvePreview(slug, data.image, markdownDir)?.url : undefined,
        date,
        updated: published ? resolveUpdated(slug, data.updated, date) : undefined,
        tags: parseTags(data.tags, slug),
        summary: deriveSummary(content),
        published,
      };

      /**
       * Kept for the static page this post gets below, with the `__ASSET_n__`
       * placeholders still unresolved. The module itself resolves them at
       * runtime from `import.meta.ROLLUP_FILE_URL_*`; the prerendered copy needs
       * real URLs, which only exist once Rollup has named the assets.
       */
      rendered.set(slug, { html, assets });

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
     * Runs after every module is transformed but before `dist/` exists, which is
     * the only place the final asset filenames are known: the module resolves
     * `__ASSET_n__` at runtime from `import.meta.ROLLUP_FILE_URL_*`, and the
     * prerendered copy in the static page cannot.
     */
    generateBundle() {
      const getFileName = this.getFileName.bind(this);
      for (const [slug, post] of rendered) {
        prerendered.set(slug, resolveAssetPlaceholders(post.html, post.assets, getFileName));
      }
    },

    /**
     * Runs once the bundle is written. Every published post becomes a real static
     * page under `blog/<slug>`, and the sitemap picks them up. A draft is left
     * out of all of it: no directory, no sitemap entry, no share card.
     */
    closeBundle() {
      if (isServe) return;

      const siteUrl = readSiteUrl();
      const posts = publishedSummaries().map((summary) => {
        const preview = postPreview(summary.slug);
        /**
         * Fail rather than ship a thin page. A post whose html is missing here
         * means its module was never transformed, so the crawler copy would
         * silently be the "needs JavaScript" stub — the exact failure this
         * prerender exists to remove.
         */
        const html = prerendered.get(summary.slug);
        if (!html) {
          throw new Error(
            `[blog] ${summary.slug}/${POST_ENTRY} was not transformed, so it has no html.`,
          );
        }
        return { ...summary, html, image: preview?.url, imageSource: preview?.source };
      });

      const options = {
        outDir: 'dist',
        siteUrl,
        posts,
        blog: { description: BLOG_DESCRIPTION },
        pages: LISTING_PAGES.map(readListingPage),
      };
      const written = writePostPages(options);
      /**
       * After the pages, because `writePostPages` clears `dist/blog` before it
       * writes the post directories, and the card goes into one of those.
       */
      writePreviewImages(options);
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
