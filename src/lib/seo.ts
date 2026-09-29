import { absoluteUrl, site } from '../data/site';

interface PageMeta {
  title: string;
  description: string;
  /** Path relative to the site root, e.g. `/` or `/blog/my-post/`. */
  path: string;
  /** Open Graph type. Posts are `article`, everything else `website`. */
  type?: 'website' | 'article';
  /** ISO date, for `article:published_time`. */
  publishedTime?: string;
  /**
   * Path of the preview image, relative to the site root. Social networks only
   * accept JPEG, PNG, GIF or WebP — an SVG card is ignored. `build/markdown.ts`
   * writes the tags for every post into its static page, so the crawler sees
   * them without running any JavaScript.
   */
  image?: string;
}

function upsertMeta(
  selector: string,
  attribute: 'name' | 'property',
  key: string,
  content: string,
) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

/**
 * Applies title, description, canonical, Open Graph and Twitter metadata to the
 * document. The static defaults live in index.html; this refines them per route
 * so a shared link gets its own preview. Crawlers never run this — that is what
 * the generated post pages are for — but it keeps the live tab correct after a
 * client-side navigation.
 */
export function setPageMeta({ title, description, path, type, publishedTime, image }: PageMeta) {
  const url = absoluteUrl(path);
  const preview = absoluteUrl(image ?? '/og.png');

  document.title = title;

  upsertMeta('meta[name="description"]', 'name', 'description', description);
  upsertLink('canonical', url);

  upsertMeta('meta[property="og:type"]', 'property', 'og:type', type ?? 'website');
  // `site.author`, not `site.title`: the title carries the role, and og:site_name
  // is read as the name of the site. For a portfolio that is the person, which is
  // also what index.html ships, so the two cannot disagree after a navigation.
  upsertMeta('meta[property="og:site_name"]', 'property', 'og:site_name', site.author);
  upsertMeta('meta[property="og:locale"]', 'property', 'og:locale', site.locale);
  upsertMeta('meta[property="og:title"]', 'property', 'og:title', title);
  upsertMeta('meta[property="og:description"]', 'property', 'og:description', description);
  upsertMeta('meta[property="og:url"]', 'property', 'og:url', url);
  upsertMeta('meta[property="og:image"]', 'property', 'og:image', preview);
  upsertMeta('meta[property="og:image:alt"]', 'property', 'og:image:alt', title);
  upsertMeta('meta[property="og:image:width"]', 'property', 'og:image:width', '1200');
  upsertMeta('meta[property="og:image:height"]', 'property', 'og:image:height', '630');
  if (publishedTime) {
    upsertMeta(
      'meta[property="article:published_time"]',
      'property',
      'article:published_time',
      publishedTime,
    );
  }

  upsertMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
  upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
  upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
  upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', preview);
  upsertMeta('meta[name="twitter:image:alt"]', 'name', 'twitter:image:alt', title);
}

export const homeMeta: PageMeta = {
  title: site.title,
  description: site.description,
  path: '/',
};

/** The blog archive at `/blog/` — the one blog link worth sharing. */
export const blogMeta: PageMeta = {
  title: `Blog — ${site.author}`,
  description: 'Every post on backend systems, networking and the tools around them, newest first.',
  path: '/blog/',
};

/**
 * One line of copy per listing page, keyed by its path segment. It is the only
 * literal in this file, because `build/markdown.ts` reads these two strings out of
 * the source to write the same description into the static HTML a crawler reads.
 * Titles are composed here and there from the path segment, so they cannot drift.
 */
export const pageDescriptions: Record<string, string> = {
  projects:
    'Backend projects I build to learn how real systems are made: what they do, what I chose and why.',
  experience:
    'Where I have worked as a backend developer, the systems I have worked on, and what I owned.',
};

/** The listing pages, `/projects/` and `/experience/`, from the navbar. */
export function listingMeta(page: string): PageMeta {
  return {
    title: `${page[0].toUpperCase()}${page.slice(1)} — ${site.author}`,
    description: pageDescriptions[page],
    path: `/${page}/`,
  };
}
