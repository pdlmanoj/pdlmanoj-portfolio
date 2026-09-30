import fs from 'node:fs';
import path from 'node:path';

/**
 * ---------------------------------------------------------------------------
 * STATIC PAGES
 *
 * Social networks, Slack and search engines fetch a URL and read the HTML they
 * get back. They do not run JavaScript, and a hash (`#/projects`) never reaches
 * the server at all — so a page behind a hash can only ever preview as the
 * homepage.
 *
 * This writes a real page per post, `dist/blog/<slug>/index.html`, the blog
 * archive, and one page for each data-driven listing (`dist/projects/`,
 * `dist/experience/`), each with its own title, description, canonical URL and
 * Open Graph / Twitter tags baked into the markup. The app then boots on that page
 * and the router picks the route up from the path, so a shared link works for
 * people and crawlers alike.
 * ---------------------------------------------------------------------------
 */

interface PostPageData {
  slug: string;
  title: string;
  /** `YYYY-MM-DD`. */
  date?: string;
  /** `YYYY-MM-DD`, when the post has been revised since. Absent means never. */
  updated?: string;
  /** The post's own words for what it is about, shown on the archive and the post. */
  tags: string[];
  /**
   * The post's opening paragraph, used as the meta description. Derived from the
   * body rather than written in the frontmatter, so it cannot go stale.
   */
  summary?: string;
  /**
   * Site-root-relative preview image, e.g. `/blog/my-post/og.png`, or absent
   * when the post's frontmatter names no `image`. Absent is a real state and not
   * a gap to paper over: the page then carries no `og:image` at all and the
   * network renders a text card from the post's own title.
   */
  image?: string;
  /** Absolute path of the file `image` names, copied into the build. */
  imageSource?: string;
  /**
   * The post's rendered body, with every asset URL already resolved. Written into
   * the page inside `<noscript>`, which is what makes the article readable to a
   * crawler that does not run JavaScript and to a reader who has it turned off.
   */
  html: string;
}

interface PostPagesOptions {
  /** Built site directory, i.e. `dist`. */
  outDir: string;
  /** Absolute site URL with no trailing slash, e.g. `https://x.github.io/site`. */
  siteUrl: string;
  posts: PostPageData[];
  /** Copy for the blog archive page at `/blog/`. */
  blog: { description: string };
  /** The data-driven listing pages, e.g. `/projects/` and `/experience/`. */
  pages?: ListingPageData[];
}

/** A page written straight from a data file, e.g. `/projects/`. */
export interface ListingPageData {
  /**
   * URL segment, which is also the output directory and the page title: `projects`
   * becomes `Projects — <author>`, the same way `blog` becomes `Blog — <author>`.
   */
  id: string;
  description: string;
  /** What a reader without JavaScript sees: the list on the page. */
  items: { text: string; href?: string }[];
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (char) => HTML_ESCAPES[char] ?? char);
}

function escapeJson(value: string): string {
  return value.replace(/</g, '\\u003c');
}

/**
 * The token every absolute URL in `index.html` is written with. `index.html` is
 * static, so it cannot read `src/data/site.ts`, but the domain still has to live in
 * exactly one place or the canonical URL, the share card and the sitemap end up
 * naming three different sites. The build substitutes it on the way through.
 */
const SITE_URL_TOKEN = '%SITE_URL%';

/**
 * Puts the real site URL into `index.html` on its way to `dist/`. Runs before
 * Vite's own HTML processing, so the token is still plain text in the markup at
 * this point and cannot have been minified into something else.
 */
export function patchIndexHtml(html: string, siteUrl: string): string {
  return html.split(SITE_URL_TOKEN).join(siteUrl);
}

/** Content of one meta tag, so defaults can be reused. */
function metaContent(html: string, attribute: string, key: string): string | undefined {
  const match = html.match(new RegExp(`<meta ${attribute}="${key}"[^>]*content="([^"]*)"`));
  return match?.[1];
}

/**
 * Writes the blog archive at `dist/blog/index.html`, one page per post at
 * `dist/blog/<slug>/index.html`, one page per listing at `dist/<id>/index.html`,
 * plus a fresh sitemap and a 404 page.
 */
export function writePostPages({
  outDir,
  siteUrl,
  posts,
  blog,
  pages = [],
}: PostPagesOptions): string[] {
  const indexPath = path.join(outDir, 'index.html');
  const indexHtml = fs.readFileSync(indexPath, 'utf-8');
  const written: string[] = [];

  const siteName = metaContent(indexHtml, 'property', 'og:site_name') ?? siteUrl;
  const author = metaContent(indexHtml, 'name', 'author') ?? siteName;
  // `siteUrl` already carries the base path, e.g. https://user.github.io/repo

  // Stale pages from deleted posts would otherwise linger in the build.
  const blogDir = path.join(outDir, 'blog');
  fs.rmSync(blogDir, { recursive: true, force: true });

  for (const post of posts) {
    const url = `${siteUrl}/blog/${post.slug}/`;
    const imageUrl = post.image ? `${siteUrl}${post.image}` : undefined;

    const html = renderPage(indexHtml, {
      pageTitle: `${post.title} — ${author}`,
      title: post.title,
      description: post.summary,
      url,
      imageUrl,
      imageAlt: post.title,
      type: 'article',
      publishedTime: post.date,
      // `blog/<slug>/` is two levels down from the site root.
      depth: '../..',
      noscript: [
        `<h1>${escapeHtml(post.title)}</h1>`,
        `<p><small>Published ${escapeHtml(post.date ?? '')}</small></p>`,
        post.updated ? `<p><small>Modified ${escapeHtml(post.updated)}</small></p>` : '',
        /**
         * The whole article, and the reason this page is worth having at all: the
         * app's own markup only exists once JavaScript runs, so without this the
         * words of the post are absent from the served HTML entirely.
         *
         * `prose` because the body arrives as bare `<p>`, `<h2>` and `<figure>`
         * with no wrapper to hang the article styles on, and a no-JS reader
         * should get the same measure and code blocks as everyone else.
         */
        `<div class="prose">${post.html}</div>`,
        /**
         * The internal link graph, in the served HTML rather than only in the DOM
         * the app builds after it boots: a crawler that does not run JavaScript
         * can still reach the posts around this one.
         */
        relatedFallback(post, posts),
      ],
      jsonLd: postJsonLd({
        title: post.title,
        description: post.summary,
        url,
        imageUrl,
        author,
        siteName,
        date: post.date,
        updated: post.updated,
      }),
    });

    const dir = path.join(blogDir, post.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), html);
    written.push(path.relative(outDir, path.join(dir, 'index.html')));
  }

  const blogUrl = `${siteUrl}/blog/`;
  fs.writeFileSync(
    path.join(blogDir, 'index.html'),
    renderPage(indexHtml, {
      pageTitle: `Blog — ${author}`,
      title: `Blog — ${author}`,
      description: blog.description,
      url: blogUrl,
      type: 'website',
      // `blog/` is one level down from the site root.
      depth: '..',
      noscript: blogFallback(posts),
      jsonLd: blogJsonLd({ url: blogUrl, description: blog.description, author, posts }),
    }),
  );
  written.push('blog/index.html');

  for (const page of pages) {
    const title = `${page.id[0].toUpperCase()}${page.id.slice(1)} — ${author}`;
    const url = `${siteUrl}/${page.id}/`;

    const dir = path.join(outDir, page.id);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'index.html'),
      renderPage(indexHtml, {
        pageTitle: title,
        title,
        description: page.description,
        url,
        type: 'website',
        // `/projects/` is one level down from the site root, same as `blog/`.
        depth: '..',
        noscript: listingFallback({ ...page, title }),
        jsonLd: collectionJsonLd({ title, description: page.description, url, author }),
      }),
    );
    written.push(`${page.id}/index.html`);
  }

  writeNotFoundPage({ outDir, siteUrl, indexHtml });

  return written;
}

/**
 * GitHub Pages serves `404.html` at whatever path was requested, so the app
 * still boots for a renamed or mistyped post URL instead of the host's plain
 * 404 page. That means the assets cannot be relative: they are rewritten to the
 * site's base path, which is the one case where an absolute path is needed.
 */
function writeNotFoundPage({
  outDir,
  siteUrl,
  indexHtml,
}: {
  outDir: string;
  siteUrl: string;
  indexHtml: string;
}): void {
  const basePath = new URL(siteUrl).pathname.replace(/\/+$/, '');
  const html = indexHtml
    .replace(/(href|src)="\.\//g, `$1="${basePath}/`)
    .replace(/<title>[\s\S]*?<\/title>/, '<title>Page not found</title>')
    // The 404 body is served for any missing URL, so it must never be indexed
    // even if a host answers with 200.
    .replace(
      '<meta name="author"',
      '<meta name="robots" content="noindex, follow" />\n    <meta name="author"',
    );

  fs.writeFileSync(path.join(outDir, '404.html'), html);
}

/**
 * Copies each post's share card into the build as `dist/blog/<slug>/og.png`.
 *
 * The author's file only exists in the post folder in `src/content`, and a card
 * has to be a real file at a URL a network can fetch, so the build puts one
 * beside the page it belongs to. Two things about that are deliberate:
 *
 *  - It runs after `writePostPages`, which clears `dist/blog` before it writes
 *    the post directories, so a card copied earlier would be deleted.
 *  - The name is fixed rather than hashed. Every other image in a post goes
 *    through Vite's asset pipeline and lands under `assets/` with a hash, which
 *    is right for content a page references and wrong for a share image: a
 *    hashed name changes on every deploy, so every network that had cached the
 *    old URL has to fetch it again for no reason, and the URL in the metadata
 *    is the one a person reads when a preview looks wrong.
 */
export function writePreviewImages({ outDir, posts }: PostPagesOptions): void {
  for (const post of posts) {
    if (!post.image || !post.imageSource) continue;
    fs.copyFileSync(post.imageSource, path.join(outDir, post.image.replace(/^\//, '')));
  }
}

/**
 * Writes `sitemap.xml` with the homepage, the blog archive, each data-driven
 * listing page and one entry per post.
 *
 * Unconditional on purpose. It used to bail out when the file was missing, which
 * meant deleting the placeholder `public/sitemap.xml` — the obvious thing to do
 * once the build generates one — would silently ship a site with no sitemap at
 * all, and nothing would say so. The file is an output, so it is written.
 */
export function writeSitemap({ outDir, siteUrl, posts, pages = [] }: PostPagesOptions): void {
  const file = path.join(outDir, 'sitemap.xml');
  const today = new Date().toISOString().slice(0, 10);

  const entries = [
    { loc: `${siteUrl}/`, lastmod: today, priority: '1.0' },
    { loc: `${siteUrl}/blog/`, lastmod: today, priority: '0.8' },
    ...pages.map((page) => ({ loc: `${siteUrl}/${page.id}/`, lastmod: today, priority: '0.8' })),
    ...posts.map((post) => ({
      loc: `${siteUrl}/blog/${post.slug}/`,
      lastmod: post.date ?? today,
      priority: '0.7',
    })),
  ];

  const body = entries
    .map(
      (entry) => `  <url>
    <loc>${entry.loc}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${entry.priority}</priority>
  </url>`,
    )
    .join('\n');

  fs.writeFileSync(
    file,
    `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated at build time by build/post-pages.ts: the homepage, the blog
     archive, each data-driven listing page and one entry per post. The
     homepage's own headings are hash routes, so they are deliberately not
     listed. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`,
  );
}

/**
 * Writes `robots.txt`, generated rather than hand-maintained.
 *
 * It was a static file in `public/`, which meant the one absolute URL in it — the
 * sitemap it points a crawler at — was a second copy of the domain. It drifted,
 * and a crawler that cannot fetch the sitemap it is told about treats the site as
 * having no sitemap at all. There is nothing to crawl here beyond the pages
 * already in the sitemap, so the file is three lines and no indexable surprises:
 * `Allow: /` rather than `Disallow:` is deliberate, and the 404 asks not to be
 * indexed through its own `<meta name="robots">`.
 */
export function writeRobots({ outDir, siteUrl }: { outDir: string; siteUrl: string }): void {
  fs.writeFileSync(
    path.join(outDir, 'robots.txt'),
    `# Generated at build time by build/post-pages.ts, from the url in
# src/data/site.ts. Point a crawler at the sitemap and it can find every page.
User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`,
  );
}

/**
 * Writes `CNAME`, the domain GitHub Pages serves the site at.
 *
 * Generated, and not committed to `public/`, for the same reason `robots.txt` and
 * `sitemap.xml` are not: the file exists only to name the domain, and a committed
 * copy is a second place to edit it that no test reads. A mismatch here is worse
 * than a missing one — Pages would publish the site at one domain while every
 * canonical, OG tag and sitemap entry in the build names the other, and the whole
 * page would be indexed as a duplicate of itself. From `site.url` the two cannot
 * disagree.
 *
 * The artifact carries it, so the custom domain survives a deploy, and reading it
 * from one source means a domain change is still the single edit described in
 * DEPLOY.md. `dist/CNAME` is written last, over anything Vite copied, so it
 * always describes the URL the pages were actually built with.
 */
export function writeCname({ outDir, siteUrl }: { outDir: string; siteUrl: string }): void {
  fs.writeFileSync(path.join(outDir, 'CNAME'), `${new URL(siteUrl).hostname}\n`);
}

/** Copy for a reader whose browser never runs the app. */
const NO_JS_NOTE = '<p>This page is rendered by a small React app, so it needs JavaScript.</p>';

interface PageInput {
  /** `<title>`, which carries the site name. */
  pageTitle: string;
  /** `og:title` and `twitter:title`, without the site name. */
  title: string;
  /**
   * Meta description, or absent. Posts have none: there is no `description` in
   * a post's frontmatter, and the site-wide sentence in `index.html` is about
   * the author rather than the post, so repeating it on every post is a worse
   * preview than letting a network use the first lines of the post itself.
   */
  description?: string;
  /** Absolute canonical URL. */
  url: string;
  /**
   * Absolute preview image URL, or absent. Absent means the page has no card of
   * its own and none is written: a share link then shows the title and the
   * description, which beats a picture that only says who wrote it.
   */
  imageUrl?: string;
  imageAlt?: string;
  type: 'article' | 'website';
  publishedTime?: string;
  /** Relative prefix that moves assets up out of this page's directory. */
  depth: string;
  /** Body lines shown to a reader without JavaScript. */
  noscript: (string | false)[];
  jsonLd: string;
}

/**
 * Takes the built homepage and swaps in page-specific metadata. Asset URLs are
 * rewritten for the page's directory depth, which is what keeps `base: './'`
 * working for a site hosted in a subpath.
 */
function renderPage(template: string, page: PageInput): string {
  let html = template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(page.pageTitle)}</title>`)
    /**
     * Drop the homepage's own preview tags; the replacements below are per-page.
     * `\s+` rather than a space, because `index.html` wraps some of these tags
     * across lines, and a tag that is not matched here survives next to its
     * replacement — two descriptions on one page, and the crawler reads the wrong
     * one.
     */
    .replace(/<link\s+rel="canonical"[^>]*>\n?/g, '')
    .replace(/<meta\s+name="description"[^>]*>\n?/g, '')
    .replace(
      /<meta\s+property="og:(type|title|description|url|image|image:alt|image:width|image:height)"[^>]*>\n?/g,
      '',
    )
    .replace(/<meta\s+name="twitter:(card|title|description|image|image:alt)"[^>]*>\n?/g, '')
    // Relative asset paths, moved up to the site root.
    .replace(/(href|src)="\.\//g, `$1="${page.depth}/`);

  const tags = [
    page.description ? `<meta name="description" content="${escapeHtml(page.description)}" />` : '',
    `<link rel="canonical" href="${escapeHtml(page.url)}" />`,
    `<meta property="og:type" content="${page.type}" />`,
    `<meta property="og:title" content="${escapeHtml(page.title)}" />`,
    page.description
      ? `<meta property="og:description" content="${escapeHtml(page.description)}" />`
      : '',
    `<meta property="og:url" content="${escapeHtml(page.url)}" />`,
    /**
     * No `og:image:width` / `og:image:height` alongside the URL. They were 1200x630
     * because every card was the same generated file; a card is now whatever the
     * author exported, and declaring dimensions that may not be the image's own is
     * a false statement in the markup. Networks measure the file they fetch.
     */
    page.imageUrl ? `<meta property="og:image" content="${escapeHtml(page.imageUrl)}" />` : '',
    page.imageUrl && page.imageAlt
      ? `<meta property="og:image:alt" content="${escapeHtml(page.imageAlt)}" />`
      : '',
    page.publishedTime
      ? `<meta property="article:published_time" content="${page.publishedTime}" />`
      : '',
    /**
     * `summary_large_image` asks for a big card, which is only right when there is
     * an image; on a page without one it makes networks fetch a thumbnail of
     * nothing. `summary` is the plain text card.
     */
    `<meta name="twitter:card" content="${page.imageUrl ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${escapeHtml(page.title)}" />`,
    page.description
      ? `<meta name="twitter:description" content="${escapeHtml(page.description)}" />`
      : '',
    page.imageUrl ? `<meta name="twitter:image" content="${escapeHtml(page.imageUrl)}" />` : '',
    page.imageUrl && page.imageAlt
      ? `<meta name="twitter:image:alt" content="${escapeHtml(page.imageAlt)}" />`
      : '',
    page.jsonLd,
  ].filter(Boolean);

  html = html.replace(
    '    <meta name="color-scheme"',
    `    ${tags.join('\n    ')}\n\n    <meta name="color-scheme"`,
  );

  const fallback = [
    '    <noscript>',
    '      <div style="max-width: 40rem; margin: 4rem auto; padding: 0 1.5rem; font-family: sans-serif">',
    ...page.noscript.filter(Boolean).map((line) => `        ${line}`),
    '      </div>',
    '    </noscript>',
    /**
     * The same depth rewrite the document got above, applied here because the
     * fallback is spliced in after it: a post's body carries its own `./assets/…`
     * URLs, and without this they would resolve against `blog/<slug>/` and every
     * image in the crawler copy would be broken.
     */
  ]
    .join('\n')
    .replace(/(href|src)="\.\//g, `$1="${page.depth}/`);

  return html.replace(/ {4}<noscript>[\s\S]*? {4}<\/noscript>/, fallback);
}

/** The list a no-JS reader sees on a listing page, with the links it can follow. */
function listingFallback(page: ListingPageData & { title: string }): (string | false)[] {
  if (page.items.length === 0) return [`<h1>${escapeHtml(page.title)}</h1>`, NO_JS_NOTE];

  const items = page.items
    .map((item) =>
      item.href
        ? `        <li><a href="${escapeHtml(item.href)}">${escapeHtml(item.text)}</a></li>`
        : `        <li>${escapeHtml(item.text)}</li>`,
    )
    .join('\n');

  return [
    `<h1>${escapeHtml(page.title)}</h1>`,
    `<p>${escapeHtml(page.description)}</p>`,
    `<ul>\n${items}\n      </ul>`,
    NO_JS_NOTE,
  ];
}

/** The list a no-JS reader sees on the blog archive, with working links. */
function blogFallback(posts: PostPageData[]): (string | false)[] {
  if (posts.length === 0) return ['<h1>Blog</h1>', NO_JS_NOTE];

  const items = posts
    .map((post) => {
      const tags = post.tags.length
        ? ` <small>${post.tags.map(escapeHtml).join(', ')}</small>`
        : '';
      return (
        `        <li><a href="${post.slug}/">${escapeHtml(post.title)}</a>` +
        `${post.date ? ` <small>${escapeHtml(post.date)}</small>` : ''}${tags}</li>`
      );
    })
    .join('\n');

  return ['<h1>Blog</h1>', `<ul>\n${items}\n      </ul>`, NO_JS_NOTE];
}

function indentJson(value: unknown): string {
  return escapeJson(JSON.stringify(value, null, 2))
    .split('\n')
    .map((line) => `      ${line}`)
    .join('\n');
}

function postJsonLd({
  title,
  description,
  url,
  imageUrl,
  author,
  siteName,
  date,
  updated,
}: {
  title: string;
  description?: string;
  url: string;
  imageUrl?: string;
  author: string;
  siteName: string;
  date?: string;
  updated?: string;
}): string {
  return `<script type="application/ld+json">\n${indentJson({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    url,
    inLanguage: 'en',
    ...(description ? { description } : {}),
    author: { '@type': 'Person', name: author },
    publisher: { '@type': 'Person', name: siteName },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    // A post with no card has no image to name, and an `image` of `undefined`
    // would serialize away on its own, dropping the key instead.
    ...(imageUrl ? { image: imageUrl } : {}),
    ...(date ? { datePublished: date } : {}),
    // Only when the author says the post was revised. An absent `dateModified`
    // is the claim that the original is current, which is the honest default.
    ...(updated ? { dateModified: updated } : {}),
  })}\n    </script>`;
}

/**
 * Posts sharing a tag with this one, most overlapping first.
 *
 * The same rule `relatedPosts` applies at runtime in `src/lib/blog.ts`, written
 * out a second time because the build cannot import app code and an empty read
 * fails the build. The two must stay in step: this one is what puts the links in
 * the served HTML, and that one is what the app renders after it boots. Keep them
 * together, and change both in the same commit.
 */
function relatedTo(post: PostPageData, posts: PostPageData[], limit = 3): PostPageData[] {
  return (
    posts
      .filter((entry) => entry.slug !== post.slug)
      .map((entry) => ({
        post: entry,
        shared: entry.tags.filter((tag) => post.tags.includes(tag)).length,
      }))
      .filter((entry) => entry.shared > 0)
      /** `posts` is slug-sorted, which is stable, so equal overlap keeps that order. */
      .sort((a, b) => b.shared - a.shared)
      .slice(0, limit)
      .map((entry) => entry.post)
  );
}

/** The related-post links a no-JS reader and a crawler both get. */
function relatedFallback(post: PostPageData, posts: PostPageData[]): string {
  const related = relatedTo(post, posts);
  if (related.length === 0) return '';

  const items = related
    .map((entry) => {
      /**
       * `../<slug>/` rather than `./<slug>/`: a sibling post is one level up from
       * `blog/<slug>/`, and `renderPage` rewrites a leading `./` to the page's own
       * depth, which would send this to the site root instead.
       */
      const line = `          <li><a href="../${escapeHtml(entry.slug)}/">${escapeHtml(entry.title)}</a></li>`;
      return entry.date
        ? line.replace('</li>', ` <small>${escapeHtml(entry.date)}</small></li>`)
        : line;
    })
    .join('\n');

  return `<h2>Related</h2>\n        <ul>\n${items}\n        </ul>`;
}

function blogJsonLd({
  url,
  description,
  author,
  posts,
}: {
  url: string;
  description: string;
  author: string;
  posts: PostPageData[];
}): string {
  return `<script type="application/ld+json">\n${indentJson({
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: `Blog — ${author}`,
    description,
    url,
    inLanguage: 'en',
    author: { '@type': 'Person', name: author },
    blogPost: posts.map((post) => ({
      '@type': 'BlogPosting',
      headline: post.title,
      url: `${url}${post.slug}/`,
      ...(post.summary ? { description: post.summary } : {}),
      ...(post.date ? { datePublished: post.date } : {}),
    })),
  })}\n    </script>`;
}

/**
 * A listing page that is not a blog: the projects and the experience. `CollectionPage`
 * is the closest honest type — there is no schema.org type for a page of projects.
 */
function collectionJsonLd({
  title,
  description,
  url,
  author,
}: {
  title: string;
  description: string;
  url: string;
  author: string;
}): string {
  return `<script type="application/ld+json">\n${indentJson({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    url,
    inLanguage: 'en',
    author: { '@type': 'Person', name: author },
  })}\n    </script>`;
}
