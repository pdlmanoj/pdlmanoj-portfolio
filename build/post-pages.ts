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
  description?: string;
  /** `YYYY-MM-DD`. */
  date?: string;
  /** Site-root-relative preview image, e.g. `/og/my-post.png`. */
  image: string;
}

interface PostPagesOptions {
  /** Built site directory, i.e. `dist`. */
  outDir: string;
  /** Absolute site URL with no trailing slash, e.g. `https://x.github.io/site`. */
  siteUrl: string;
  posts: PostPageData[];
  /** Copy for the blog archive page at `/blog/`. */
  blog: { description: string; image: string };
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
  /** Site-root-relative preview image. */
  image: string;
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
  const homeDescription = metaContent(indexHtml, 'name', 'description') ?? '';
  // `siteUrl` already carries the base path, e.g. https://user.github.io/repo

  // Stale pages from deleted posts would otherwise linger in the build.
  const blogDir = path.join(outDir, 'blog');
  fs.rmSync(blogDir, { recursive: true, force: true });

  for (const post of posts) {
    const description = post.description || homeDescription;
    const url = `${siteUrl}/blog/${post.slug}/`;
    const imageUrl = `${siteUrl}${post.image}`;

    const html = renderPage(indexHtml, {
      pageTitle: `${post.title} — ${author}`,
      title: post.title,
      description,
      url,
      imageUrl,
      imageAlt: post.title,
      type: 'article',
      publishedTime: post.date,
      // `blog/<slug>/` is two levels down from the site root.
      depth: '../..',
      noscript: [
        `<h1>${escapeHtml(post.title)}</h1>`,
        post.date ? `<p><small>${escapeHtml(post.date)}</small></p>` : '',
        `<p>${escapeHtml(description)}</p>`,
        NO_JS_NOTE,
      ],
      jsonLd: postJsonLd({
        title: post.title,
        description,
        url,
        imageUrl,
        author,
        siteName,
        date: post.date,
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
      imageUrl: `${siteUrl}${blog.image}`,
      imageAlt: `Blog — ${author}`,
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
        imageUrl: `${siteUrl}${page.image}`,
        imageAlt: title,
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
  description: string;
  /** Absolute canonical URL. */
  url: string;
  imageUrl: string;
  imageAlt: string;
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
    `<meta name="description" content="${escapeHtml(page.description)}" />`,
    `<link rel="canonical" href="${escapeHtml(page.url)}" />`,
    `<meta property="og:type" content="${page.type}" />`,
    `<meta property="og:title" content="${escapeHtml(page.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(page.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(page.url)}" />`,
    `<meta property="og:image" content="${escapeHtml(page.imageUrl)}" />`,
    `<meta property="og:image:alt" content="${escapeHtml(page.imageAlt)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    page.publishedTime
      ? `<meta property="article:published_time" content="${page.publishedTime}" />`
      : '',
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(page.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(page.description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(page.imageUrl)}" />`,
    `<meta name="twitter:image:alt" content="${escapeHtml(page.imageAlt)}" />`,
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
  ].join('\n');

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
    .map(
      (post) =>
        `        <li><a href="${post.slug}/">${escapeHtml(post.title)}</a>${
          post.date ? ` <small>${escapeHtml(post.date)}</small>` : ''
        }</li>`,
    )
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
}: {
  title: string;
  description: string;
  url: string;
  imageUrl: string;
  author: string;
  siteName: string;
  date?: string;
}): string {
  return `<script type="application/ld+json">\n${indentJson({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description,
    url,
    image: imageUrl,
    inLanguage: 'en',
    author: { '@type': 'Person', name: author },
    publisher: { '@type': 'Person', name: siteName },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    ...(date ? { datePublished: date } : {}),
  })}\n    </script>`;
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
