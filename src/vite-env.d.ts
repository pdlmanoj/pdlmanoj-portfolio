/// <reference types="vite/client" />

/**
 * Types for the markdown pipeline in `build/markdown.ts`. Each `.md` file in
 * `src/content/blog/` becomes a module with its frontmatter and rendered HTML —
 * both produced at build time, so nothing is parsed in the browser.
 *
 * The shapes here are the contract with `build/markdown.ts`: the plugin writes
 * exactly these fields, and `src/lib/blog.ts` re-exports them as `BlogFrontmatter`
 * and `BlogPostSummary`. Change one and change all three.
 */
declare module '*.md' {
  const post: {
    slug: string;
    frontmatter: {
      title: string;
      date?: string;
      updated?: string;
      tags: string[];
      summary?: string;
      image?: string;
    };
    html: string;
  };
  export default post;
}

declare module 'virtual:blog-index' {
  export const posts: {
    slug: string;
    title: string;
    date?: string;
    updated?: string;
    tags: string[];
    summary?: string;
    readingTime: number;
  }[];
}
