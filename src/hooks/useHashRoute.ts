import { useEffect, useState } from 'react';
import { legacyHashes, navItems } from '../data/site';
import { siteRootFrom } from '../lib/assets';

export type Route =
  | { name: 'home'; section?: string }
  | { name: 'blog' }
  | { name: 'post'; slug: string }
  | { name: 'projects' }
  | { name: 'experience' }
  | { name: 'not-found'; path: string };

const sectionIds = new Set(navItems.filter((item) => item.kind === 'section').map((i) => i.id));
const pageIds = navItems.filter((item) => item.kind === 'page').map((item) => item.id);

/**
 * Router.
 *
 * GitHub Pages serves static files only, so a heading inside a page lives in the
 * hash (`#/about`): the browser resolves the hash before the request is made, so
 * it works on a hard refresh with no server config.
 *
 * Everything else is a real path. A link is read by crawlers — Twitter, X, Slack,
 * WhatsApp — and they fetch a URL without running JavaScript, so a page behind
 * `#/projects` would preview as the homepage and a post behind `#/blog/my-post`
 * would preview as the homepage too. So each one is a real static page, generated
 * at build time by `build/post-pages.ts`, and this router reads it from the path:
 *
 *   /                     -> home
 *   #/about               -> home, scrolled to the intro. The about text lives
 *                             in the hero, so this lands at the top of the page.
 *   /blog/                -> the blog index
 *   /blog/my-post/        -> a blog post
 *   /projects/            -> the projects page
 *   /experience/          -> the experience page
 *   #/projects            -> the projects page (legacy link, still works)
 *   #/experience          -> the experience page (legacy link, still works)
 *   #/blog                -> the blog index (legacy link, still works)
 *   #/blog/my-post        -> a blog post (legacy link, still works)
 *
 * The legacy hashes matter: the navbar used to be hash links, so those URLs are
 * already in bookmarks, in the search index and in other people's messages. They
 * are worth keeping, and they cost one lookup each.
 */
function parseRoute(hash: string, pathname: string): Route {
  /**
   * An explicit hash route wins. The navbar, the wordmark and every section
   * link navigate with `#/...`, and on a post page the path is still
   * `/blog/my-post/` — so the path must not overrule what was just clicked.
   * The path is only used for a direct load or a refresh, where there is no
   * hash to go on.
   */
  if (hash.startsWith('#/') || hash === '#') return parseHash(hash);

  const path = pathname.replace(/\/+$/, '');

  if (path.endsWith('/blog')) return { name: 'blog' };

  const fromPath = pathname.match(/\/blog\/([^/]+)\/?$/);
  if (fromPath) return { name: 'post', slug: decodeURIComponent(fromPath[1]) };

  // Only the top-level pages, so a post slug or a section name can never shadow one.
  const page = pageIds.find((id) => id !== 'blog' && path.endsWith(`/${id}`));
  if (page) return { name: page } as Route;

  return parseHash(hash);
}

function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '').replace(/^\/+|\/+$/g, '');
  if (!path) return { name: 'home' };

  const segments = path.split('/');
  const [head, ...rest] = segments;

  // The skip link points at #main, which is the top of the page.
  if (path === 'main') return { name: 'home' };

  if (head === 'blog') {
    // `#/blog` used to scroll the homepage; it is the index page now.
    return rest.length > 0 ? { name: 'post', slug: decodeURIComponent(rest[0]) } : { name: 'blog' };
  }

  // `#/projects` and `#/experience` used to scroll the homepage.
  if (rest.length === 0 && pageIds.includes(head)) return { name: head } as Route;

  // A section that lost its navbar item is still a valid target for an old link.
  if (rest.length === 0 && (sectionIds.has(head) || legacyHashes.includes(head))) {
    return { name: 'home', section: head };
  }

  return { name: 'not-found', path };
}

function currentRoute(): Route {
  return parseRoute(window.location.hash, window.location.pathname);
}

export function navigate(to: string): void {
  const target = to.startsWith('#') ? to : `#${to}`;
  if (window.location.hash === target) {
    // Same URL: nothing will fire `hashchange`, so handle it directly.
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    return;
  }
  window.location.hash = target;
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(currentRoute);

  useEffect(() => {
    const onHashChange = () => setRoute(currentRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  /**
   * Leaving a page for a homepage section only changes the hash, so the address
   * bar would keep the old page's path in front of it. That looks wrong, and it
   * breaks the homepage's post links, which are relative to the site root.
   * Rewriting the path to the root keeps the address honest and the relative links
   * correct, without adding a history entry. The pages themselves are real URLs,
   * so they are left alone.
   */
  useEffect(() => {
    if (route.name !== 'home' && route.name !== 'not-found') return;

    const root = siteRootFrom(window.location.pathname);
    if (root === undefined) return;

    window.history.replaceState(
      null,
      '',
      `${root}${window.location.hash || '#/'}`.replace(/#$/, '#/'),
    );
  }, [route]);

  return route;
}

/**
 * Scrolls to the section referenced by the route, or back to the top when the
 * route is a page. Runs on every route change, including the first render.
 */
export function useScrollToRoute(route: Route): void {
  useEffect(() => {
    if (route.name === 'home' && route.section) {
      const target = document.getElementById(route.section);
      if (target) {
        target.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'auto'
            : 'smooth',
          block: 'start',
        });
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [route]);
}
