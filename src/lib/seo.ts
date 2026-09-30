import { absoluteUrl, site } from '../data/site';

interface PageMeta {
  title: string;
  /**
   * Meta description. Posts leave it out: there is no `description` in a post's
   * frontmatter, and the site-wide sentence in `index.html` is about the author
   * rather than the post, so a network is better off reading the post's own
   * first lines than being handed that.
   */
  description?: string;
  /** Path relative to the site root, e.g. `/` or `/blog/my-post/`. */
  path: string;
  /** Open Graph type. Posts are `article`, everything else `website`. */
  type?: 'website' | 'article';
  /** ISO date, for `article:published_time`. */
  publishedTime?: string;
  /**
   * Path of the preview image, relative to the site root, e.g.
   * `/blog/my-post/og.png`. Omit it and the page carries no image tags at all.
   * Social networks only accept JPEG, PNG, GIF or WebP — an SVG card is ignored,
   * which is why the build refuses one. `build/markdown.ts` writes the tags for
   * every post into its static page, so the crawler sees them without running
   * any JavaScript.
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

/**
 * Takes a tag back out of the head.
 *
 * Needed because a client-side navigation can move from a page that has a card
 * to one that has none, and leaving the last card behind would attribute this
 * page's share link with the previous page's image. An empty `content` would
 * not do: a network that reads it still requests a URL that is not there.
 */
function removeMeta(selector: string) {
  document.head.querySelector(selector)?.remove();
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
  const preview = image ? absoluteUrl(image) : undefined;

  document.title = title;

  if (description) {
    upsertMeta('meta[name="description"]', 'name', 'description', description);
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', description);
  } else {
    // Same reasoning as the image tags below: a stale description is worse than
    // none, so the tag is taken out rather than left saying something else.
    removeMeta('meta[name="description"]');
    removeMeta('meta[property="og:description"]');
  }
  upsertLink('canonical', url);

  upsertMeta('meta[property="og:type"]', 'property', 'og:type', type ?? 'website');
  // `site.author`, not `site.title`: the title carries the role, and og:site_name
  // is read as the name of the site. For a portfolio that is the person, which is
  // also what index.html ships, so the two cannot disagree after a navigation.
  upsertMeta('meta[property="og:site_name"]', 'property', 'og:site_name', site.author);
  upsertMeta('meta[property="og:locale"]', 'property', 'og:locale', site.locale);
  upsertMeta('meta[property="og:title"]', 'property', 'og:title', title);
  upsertMeta('meta[property="og:url"]', 'property', 'og:url', url);
  if (publishedTime) {
    upsertMeta(
      'meta[property="article:published_time"]',
      'property',
      'article:published_time',
      publishedTime,
    );
  }

  // `summary_large_image` is the big card, and it is only right when there is an
  // image; `summary` is the text card a page without one gets.
  upsertMeta(
    'meta[name="twitter:card"]',
    'name',
    'twitter:card',
    preview ? 'summary_large_image' : 'summary',
  );
  upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
  if (description) {
    upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
  } else {
    removeMeta('meta[name="twitter:description"]');
  }

  /**
   * No width and height tags, for the reason in `build/post-pages.ts`: the card
   * is the author's file now, and its real dimensions are not known here.
   */
  if (preview) {
    upsertMeta('meta[property="og:image"]', 'property', 'og:image', preview);
    upsertMeta('meta[property="og:image:alt"]', 'property', 'og:image:alt', title);
    upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', preview);
    upsertMeta('meta[name="twitter:image:alt"]', 'name', 'twitter:image:alt', title);
  } else {
    removeMeta('meta[property="og:image"]');
    removeMeta('meta[property="og:image:alt"]');
    removeMeta('meta[name="twitter:image"]');
    removeMeta('meta[name="twitter:image:alt"]');
  }
}

export const homeMeta: PageMeta = {
  title: site.title,
  description: site.description,
  path: '/',
};

/** The blog archive at `/blog/` — the one blog link worth sharing. */
export const blogMeta: PageMeta = {
  title: `Blog — ${site.author}`,
  description: 'My notes on backend systems, their fundamentals, and what happens under the hood.',
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
