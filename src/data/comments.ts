/**
 * Giscus settings, carried over from the old Jekyll site.
 *
 * The repo and category ids are not secrets: they are the public identifiers
 * giscus needs to find the discussion for a post. They must stay in step with
 * the repo and category in GitHub — changing one there without the other here
 * leaves the widget with nowhere to put a comment.
 */
export const comments = {
  enabled: true,
  provider: 'giscus',
  giscus: {
    repo: 'pdlmanoj/blog-comments',
    repoId: 'R_kgDOOhH6UQ',
    category: 'Announcements',
    categoryId: 'DIC_kwDOOhH6Uc4Cpjeo',
    /**
     * The discussion is keyed by the post's URL path. That is what lets the
     * comments from the old site carry over when the post paths match; renaming
     * a slug leaves its discussion behind on the old path.
     */
    mapping: 'pathname',
    inputPosition: 'top',
    reactionsEnabled: '1',
    lang: 'en',
    /** Load the widget only when a reader scrolls close to it. */
    lazy: true,
  },
} as const;
