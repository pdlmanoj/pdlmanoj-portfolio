/**
 * ---------------------------------------------------------------------------
 * SITE-WIDE CONFIG + SEO
 * ---------------------------------------------------------------------------
 * This is the only file that configures the domain: nothing else in src/, build/
 * or index.html spells it out. DEPLOY.md has the DNS records that have to point
 * at this host, and the one-line procedure for moving it.
 */

export const site = {
  /**
   * The custom domain, apex only: GitHub Pages serves the site at the root of
   * `pdlmanoj.com.np`, so there is no path component and no `www` redirect to
   * think about. `https://www.pdlmanoj.com.np` is not a second copy of the site,
   * so the canonical below is the only address worth indexing.
   *
   * NO TRAILING SLASH, and that is load-bearing rather than cosmetic: the build
   * concatenates this value with `/blog/<slug>/`, `/sitemap.xml` and every other
   * path, and a slash here ships a `//` into each one of them.
   */
  url: 'https://pdlmanoj.com.np',
  title: 'Manoj Paudel — Junior Backend Engineer',
  /** Used for <meta name="description">, Open Graph and Twitter cards. */
  description:
    'Backend engineer building reliable systems with Python, FastAPI, PostgreSQL, Redis and Docker. Notes on how backend systems actually work.',
  /**
   * Content language for `og:locale`. Open Graph wants the underscore form
   * ("en_US"), unlike `lang` on <html>, which wants the hyphen form.
   */
  locale: 'en_US',
  /**
   * Your name, as it appears in page titles ("Blog — Manoj Paudel") and as the
   * author in every JSON-LD block. Keep it the same string as `profile.name` and
   * as `og:site_name` in index.html, or the site's own name changes the first
   * time a visitor navigates.
   */
  author: 'Manoj Paudel',
} as const;

/**
 * Absolute URL helper, so metadata is correct at any deploy path.
 *
 * On the custom domain the base path is empty and this is just origin + path. The
 * base path is still read rather than discarded because the site also has to be
 * correct at `https://pdlmanoj.github.io/portfolio-site/`, the fallback address
 * GitHub serves before DNS has moved — and a build that only works at the root
 * is how a half-finished DNS change turns into broken metadata.
 *
 * `new URL('/og.svg', 'https://user.github.io/repo')` would otherwise resolve to
 * `https://user.github.io/og.svg`, dropping the subpath.
 */
export function absoluteUrl(path: string): string {
  const base = new URL(site.url);
  const basePath = base.pathname.replace(/\/+$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return new URL(`${basePath}${suffix || '/'}`, base.origin).toString();
}

/** Navigation is data-driven: add or remove items here, not in the Navbar. */
export interface NavItem {
  /** URL segment, and the `#/...` id an old link to this item used. */
  id: string;
  label: string;
  /**
   * `page` is a real static page with its own address, its own preview and its own
   * entry in the sitemap: `/blog/`, `/projects/`, `/experience/`. `section` is a
   * heading on the homepage, reached with a hash. The kind is what the router and
   * the navbar read, so a new item is one line here and nothing else.
   */
  kind: 'page' | 'section';
}

export const navItems: NavItem[] = [
  { id: 'blog', label: 'Blogs', kind: 'page' },
  { id: 'projects', label: 'Projects', kind: 'page' },
  { id: 'experience', label: 'Experience', kind: 'page' },
];

/**
 * Homepage hashes that old links still point at, with no navbar item and no
 * section of their own any more. `/#/about` and `/#/contact` are in bookmarks, in
 * the search index and in other people's messages from when they were nav links,
 * so they still land on the homepage rather than on a 404.
 */
export const legacyHashes: string[] = ['about', 'contact'];
