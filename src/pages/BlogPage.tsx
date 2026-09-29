import { PageHeader } from '../components/layout/PageHeader';
import { PostList } from '../components/blog/PostList';
import { posts } from '../lib/blog';

/**
 * The blog archive, served at `/blog/`.
 *
 * It is a real page rather than a homepage section so that the one link worth
 * sharing for "everything I have written" has its own address, its own preview
 * and its own entry in the sitemap. `build/post-pages.ts` writes the static
 * version of this page at build time for crawlers, which do not run JavaScript.
 */
export function BlogPage() {
  return (
    <div className="left-gutter mx-auto w-full max-w-5xl px-5 pt-12 pb-24 sm:px-8 sm:pt-16">
      <PageHeader
        title="Blog"
        intro={
          <>
            {/* The count line, if you want it back:
            {posts.length === 0
              ? 'Nothing published yet.'
              : `${posts.length} post${posts.length === 1 ? '' : 's'} on backend systems, networking and the tools around them. Newest first.`} */}
            My notes on backend systems, their fundamentals, and what happens under the hood.
          </>
        }
      />

      <div className="mt-12 sm:mt-16">
        <PostList items={posts} from="blog" />
      </div>
    </div>
  );
}
