import { formatDate, postHref, type BlogHrefFrom, type BlogPostSummary } from '../../lib/blog';
import { Reveal } from '../ui/Reveal';
import { PostTags } from './PostTags';

/**
 * The post list, shared by the homepage preview and the blog index page. The only
 * difference between them is which posts are passed in and the directory the
 * links are resolved from, so one component can serve both.
 */
export function PostList({
  items,
  from,
}: {
  items: BlogPostSummary[];
  /** Where this list is rendered, which decides the relative post links. */
  from: BlogHrefFrom;
}) {
  if (items.length === 0) {
    return <p className="text-muted">No posts yet.</p>;
  }

  return (
    <ul className="max-w-2xl space-y-10">
      {items.map((post, index) => (
        <Reveal as="li" key={post.slug} delay={Math.min(index * 50, 150)}>
          <PostRow post={post} from={from} />
        </Reveal>
      ))}
    </ul>
  );
}

function PostRow({ post, from }: { post: BlogPostSummary; from: BlogHrefFrom }) {
  return (
    <article className="group relative">
      <p className="label-mono text-muted">
        <time dateTime={post.date}>{formatDate(post.date)}</time>
        <span className="px-2 text-border-strong">/</span>
        {post.readingTime} min read
      </p>

      <h3 className="mt-3 text-xl font-medium leading-snug tracking-tight text-balance sm:text-2xl">
        <a
          href={postHref(post.slug, from)}
          className="transition-colors after:absolute after:inset-0 group-hover:text-accent"
        >
          {post.title}
        </a>
      </h3>

      {post.tags.length > 0 ? (
        <div className="mt-3">
          <PostTags tags={post.tags} />
        </div>
      ) : null}

      <p className="mt-3 font-mono text-sm text-muted transition-colors group-hover:text-accent">
        Read post →
      </p>
    </article>
  );
}
