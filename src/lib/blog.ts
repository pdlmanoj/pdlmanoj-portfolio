import { posts as summaries } from 'virtual:blog-index';

/**
 * ---------------------------------------------------------------------------
 * BLOG DATA
 *
 * Posts live as markdown in `src/content/blog/<slug>/index.md` and are turned
 * into HTML at build time by `build/markdown.ts`. The folder name is the URL:
 *
 *   src/content/blog/my-post/index.md   ->   /blog/my-post/
 *
 * A post is a folder so its images sit beside the markdown that references
 * them, and the post moves, renames and deletes as one unit.
 *
 * The index (title, date, reading time) comes from a virtual module built by
 * the same plugin, so adding a folder is all it takes — no registration anywhere.
 * ---------------------------------------------------------------------------
 */

export interface BlogPostSummary {
  slug: string;
  title: string;
  /** `YYYY-MM-DD`, straight from the frontmatter. */
  date?: string;
  /** `YYYY-MM-DD` of the last revision, when the post names one. */
  updated?: string;
  /** What the post is about, e.g. `['python', 'memory']`. Never empty-but-undefined. */
  tags: string[];
  /** The post's opening paragraph, as a description length. See `BlogFrontmatter`. */
  summary?: string;
  readingTime: number;
}

export interface BlogFrontmatter {
  title: string;
  date?: string;
  /**
   * The post's own words for what it is about. Shown on the archive row and
   * under the post's title, and nothing more: they are labels, not links, and
   * there is no tag archive to filter by.
   */
  tags: string[];
  /**
   * The post's own share card, from `image:` in the frontmatter, resolved by the
   * build to the URL it published the file at — `/blog/<slug>/og.png`. Absent
   * when the post names no image, and then the page carries no `og:image` at
   * all, so a shared link shows the post's title rather than a picture that
   * belongs to the site. Set here so the page can tag the link it was opened
   * from without guessing at the file system at runtime.
   */
  image?: string;
  /**
   * `updated:` from the frontmatter: when the post was last revised. Absent means
   * it has never been, and the byline then says nothing about modification rather
   * than inventing a date. The build refuses an `updated` earlier than `date`.
   */
  updated?: string;
  /**
   * The post's opening paragraph, cut to a length a search result can show.
   *
   * Derived by the build from the body rather than written by hand, so it cannot
   * disagree with the post. This is what the page puts in the description and
   * Open Graph tags after the app boots — the static HTML already has the same
   * text, and this is how the live tab agrees with it.
   */
  summary?: string;
}

/** What one markdown file compiles to. */
export interface BlogPost extends BlogPostSummary {
  frontmatter: BlogFrontmatter;
  html: string;
}

/** Every post, newest first. */
export const posts: BlogPostSummary[] = summaries;

/** Lazy loaders, one chunk per post, so the homepage never ships post HTML. */
const modules = import.meta.glob<{
  default: { slug: string; frontmatter: BlogFrontmatter; html: string };
}>('../content/blog/*/index.md');

/** Loads one post's rendered HTML. Returns undefined for an unknown slug. */
export async function loadPost(slug: string): Promise<BlogPost | undefined> {
  const loader = modules[`../content/blog/${slug}/index.md`];
  if (!loader) return undefined;

  const { slug: postSlug, frontmatter, html } = (await loader()).default;
  const summary = posts.find((post) => post.slug === postSlug);

  return {
    slug: postSlug,
    title: frontmatter.title,
    date: frontmatter.date,
    updated: frontmatter.updated,
    tags: frontmatter.tags,
    summary: frontmatter.summary,
    readingTime: summary?.readingTime ?? 1,
    frontmatter,
    html,
  };
}

/**
 * Post links use real paths, not hashes, so link previews and search engines see
 * a per-post page. They are relative to keep the site portable to any base path:
 *
 *   from the homepage  blog/my-post/   -> <base>/blog/my-post/
 *   from a post        ../my-post/     -> <base>/blog/my-post/
 *
 * `../..` from a post is the site root, which is where the "All posts" link
 * goes; the hash on the end of it lands back on the blog section.
 */
/**
 * Where a link is rendered from. Post URLs are real paths, so the href has to
 * climb the right number of levels or the browser resolves it against the wrong
 * directory: from `/blog/my-post/`, `blog/other/` would be `/blog/my-post/blog/other/`.
 */
export type BlogHrefFrom = 'home' | 'blog' | 'post';

export function postHref(slug: string, from: BlogHrefFrom = 'home'): string {
  if (from === 'post') return `../${slug}/`;
  if (from === 'blog') return `${slug}/`;
  return `blog/${slug}/`;
}

/** The blog index page, `/blog/`, relative to wherever the link sits. */
export function blogHref(from: BlogHrefFrom = 'home'): string {
  if (from === 'post') return '../';
  if (from === 'blog') return './';
  return 'blog/';
}

/** Neighbouring posts in publish order, for the links at the end of a post. */
export function neighbouringPosts(slug: string): {
  newer?: BlogPostSummary;
  older?: BlogPostSummary;
} {
  const index = posts.findIndex((post) => post.slug === slug);
  if (index === -1) return {};
  return {
    newer: posts[index - 1],
    older: posts[index + 1],
  };
}

/**
 * Posts that share a tag with this one, most overlapping first.
 *
 * This is the site's internal link graph, and it is the one ranking lever a
 * blog controls outright: a post linked from other posts is a post a crawler
 * can reach and a reader can keep reading. Tags are what make the link mean
 * something — without them every post can only link to the ones before and after
 * it, which is a chain, not a cluster.
 *
 * The tags stay inert labels on the page; the links they produce are ordinary
 * post links, so nothing here needs a tag archive or a filter to exist.
 */
export function relatedPosts(slug: string, limit = 3): BlogPostSummary[] {
  const post = posts.find((entry) => entry.slug === slug);
  if (!post) return [];

  return (
    posts
      .filter((entry) => entry.slug !== slug)
      .map((entry) => ({
        post: entry,
        shared: entry.tags.filter((tag) => post.tags.includes(tag)).length,
      }))
      .filter((entry) => entry.shared > 0)
      /**
       * `posts` is newest first, so a stable sort on the overlap count alone
       * leaves equally related posts in date order.
       */
      .sort((a, b) => b.shared - a.shared)
      .slice(0, limit)
      .map((entry) => entry.post)
  );
}

/**
 * `2026-02-14` -> `14 Feb 2026`.
 * Formatted by hand rather than with `new Date()` so a timezone west of UTC
 * cannot shift the day.
 */
export function formatDate(value?: string): string {
  if (!value) return '';
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value;
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const [, year, month, day] = match;
  return `${Number(day)} ${months[Number(month) - 1]} ${year}`;
}
