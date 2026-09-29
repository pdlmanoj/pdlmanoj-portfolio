/// <reference types="vite/client" />

/**
 * Types for the markdown pipeline in `build/markdown.ts`. Each `.md` file in
 * `src/content/blog/` becomes a module with its frontmatter and rendered HTML —
 * both produced at build time, so nothing is parsed in the browser.
 */
declare module '*.md' {
  const post: {
    slug: string;
    frontmatter: { title: string; date?: string; description?: string };
    html: string;
  };
  export default post;
}

declare module 'virtual:blog-index' {
  export const posts: {
    slug: string;
    title: string;
    date?: string;
    description?: string;
    readingTime: number;
  }[];
}
