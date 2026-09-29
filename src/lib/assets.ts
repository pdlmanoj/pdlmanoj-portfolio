/**
 * ---------------------------------------------------------------------------
 * PUBLIC ASSETS
 *
 * Files in `public/` are copied to the site root untouched, so a component that
 * wants one has to build the URL itself, and there is no such thing as a plain
 * absolute path here: `base: './'` in `vite.config.ts` is what lets the site run
 * from a project path (`https://<user>.github.io/<repo>/`), where
 * `/profile.jpeg` would 404.
 *
 * A document-relative `./profile.jpeg` has the mirror problem. The homepage can
 * render while the address bar still holds a post path — click a section link
 * from `/blog/my-post/` and the router swaps the page in the same tick it
 * rewrites the path — and the browser would then look for
 * `/blog/my-post/profile.jpeg`. The broken image stays broken, because nothing
 * re-resolves an `src` that has already been fetched.
 *
 * So the URL is built from the site root at runtime, which is the one directory
 * the homepage and every post have in common.
 * ---------------------------------------------------------------------------
 */

/**
 * A directory holding one of the site's own pages. All of them are one level
 * down from the root except a post, which is two, so this is what tells a URL
 * inside the site apart from a URL that is already at the site root.
 */
const PAGE_PATH = /\/(?:blog(?:\/[^/]+)?|projects|experience)\/?$/;

/**
 * The site root for a URL inside the site, e.g. `/repo/blog/my-post/` ->
 * `/repo/`. Returns undefined when the path is not inside a known page, so there
 * is nothing to clean up.
 */
export function siteRootFrom(pathname: string): string | undefined {
  const root = pathname.replace(PAGE_PATH, '');
  if (root === pathname) return undefined;
  return root.endsWith('/') ? root : `${root}/`;
}

/** The site root, or `./` when the document is already sitting at it. */
function siteRoot(): string {
  return siteRootFrom(window.location.pathname) ?? './';
}

/**
 * A file in `public/`, addressed from the site root. Pass the file name only,
 * e.g. `assetUrl('profile.jpeg')`, never a path: the build copies the file to
 * the root as it is.
 */
export function assetUrl(file: string): string {
  return `${siteRoot()}${file}`;
}

/**
 * One of the site's own pages, addressed from the site root, e.g.
 * `pageUrl('projects/')`. Pass the path with its trailing slash, the way the page
 * is written into `dist/`.
 *
 * This is how a link to another page is built, instead of a `./` or `../` prefix
 * that assumes how deep the document is. That assumption goes stale in three cases
 * that all really happen: a page renders while the address bar still holds a post
 * path, the homepage is reached from a post, and a legacy `#/projects` renders the
 * projects page from the homepage's own URL. Resolving from the site root at
 * runtime is correct in every one of them.
 */
export function pageUrl(path: string): string {
  return `${siteRoot()}${path}`;
}
