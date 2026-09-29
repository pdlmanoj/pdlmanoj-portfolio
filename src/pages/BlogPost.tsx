import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { setPageMeta } from '../lib/seo';
import { profile } from '../data/profile';
import {
  blogHref,
  formatDate,
  loadPost,
  neighbouringPosts,
  postHref,
  type BlogPost,
  type BlogPostSummary,
} from '../lib/blog';

/**
 * A single blog post.
 *
 * The HTML was produced at build time from `src/content/blog/<slug>.md`
 * (see `build/markdown.ts`), so this page only lays it out. It is inserted with
 * `dangerouslySetInnerHTML` on purpose: the markup comes from your own markdown
 * at build time, never from a user or an API, so there is nothing untrusted to
 * sanitise.
 */
export function BlogPostPage({ slug }: { slug: string }) {
  const [post, setPost] = useState<BlogPost | undefined>(undefined);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let active = true;
    setPost(undefined);
    setMissing(false);

    loadPost(slug).then((loaded) => {
      if (!active) return;
      if (!loaded) {
        setMissing(true);
        return;
      }
      setPost(loaded);
      // Keep the live tab's tags in step. Social networks do not use these — they
      // read the static page generated at build time — but the canonical URL has
      // to be the post's real path, not the hash.
      setPageMeta({
        title: `${loaded.frontmatter.title} — ${profile.name}`,
        description: loaded.frontmatter.description ?? profile.tagline,
        path: `/blog/${loaded.slug}/`,
        type: 'article',
        publishedTime: loaded.frontmatter.date,
        image: loaded.frontmatter.image,
      });
    });

    return () => {
      active = false;
    };
  }, [slug]);

  if (missing) {
    return (
      <div className="left-gutter mx-auto w-full max-w-3xl px-5 pt-24 pb-32 sm:px-8">
        <p className="label-mono text-accent">404</p>
        <h1 className="mt-5 text-3xl font-medium tracking-tight sm:text-4xl">Post not found</h1>
        <p className="mt-5 leading-relaxed text-muted">
          There is no post at <span className="font-mono text-text">/blog/{slug}/</span>. It may
          have been renamed, or the link is out of date.
        </p>
        <a
          href={blogHref('post')}
          className="link-underline mt-8 inline-flex items-center gap-2 text-base text-text transition-colors hover:text-accent"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All posts
        </a>
      </div>
    );
  }

  if (!post) {
    // One frame of nothing while the post chunk loads.
    return <div className="min-h-[60vh]" aria-hidden="true" />;
  }

  const { newer, older } = neighbouringPosts(post.slug);

  return (
    <article className="left-gutter mx-auto w-full max-w-3xl px-5 pt-12 pb-24 sm:px-8 sm:pt-16">
      <a
        href={blogHref('post')}
        className="group inline-flex items-center gap-2 font-mono text-sm text-muted transition-colors hover:text-accent"
      >
        <ArrowLeft
          className="h-4 w-4 transition-transform duration-150 group-hover:-translate-x-0.5 motion-reduce:transition-none"
          aria-hidden="true"
        />
        All posts
      </a>

      <header className="mt-8 border-b border-border pb-8">
        <p className="label-mono text-muted">
          <time dateTime={post.frontmatter.date}>{formatDate(post.frontmatter.date)}</time>
          <span className="px-2 text-border-strong">/</span>
          {post.readingTime} min read
        </p>
        <h1 className="mt-4 text-3xl font-medium tracking-tight text-balance sm:text-4xl">
          {post.frontmatter.title}
        </h1>
        {post.frontmatter.description ? (
          <p className="mt-4 text-lg leading-relaxed text-muted">{post.frontmatter.description}</p>
        ) : null}
      </header>

      {/*
        Copy button: one delegated listener instead of a React component per
        code block, because the blocks arrive as HTML.
      */}
      <div
        className="prose mt-10"
        onClick={(event) => {
          const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
            '[data-copy-code]',
          );
          if (!button) return;

          const code = button.closest('.code-block')?.querySelector('code')?.textContent ?? '';
          void copyText(code).then((copied) => {
            if (!copied) return;
            button.textContent = 'Copied';
            window.setTimeout(() => {
              button.textContent = 'Copy';
            }, 1600);
          });
        }}
        dangerouslySetInnerHTML={{ __html: post.html }}
      />

      <PostLink post={older} direction="older" />
      <PostLink post={newer} direction="newer" />
    </article>
  );
}

function PostLink({ post, direction }: { post?: BlogPostSummary; direction: 'newer' | 'older' }) {
  if (!post) return null;
  const isNewer = direction === 'newer';

  return (
    <a
      href={postHref(post.slug, 'post')}
      className={`group mt-10 flex flex-col gap-1 border-t border-border pt-6 transition-colors hover:text-accent ${
        isNewer ? 'items-end text-right' : 'items-start'
      }`}
    >
      <span className="label-mono text-muted">{isNewer ? 'Newer post' : 'Older post'}</span>
      <span className="inline-flex items-center gap-2 text-lg font-medium tracking-tight">
        {isNewer ? post.title : null}
        {isNewer ? null : post.title}
        {isNewer ? (
          <ArrowRight
            className="h-4 w-4 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none"
            aria-hidden="true"
          />
        ) : (
          <ArrowRight
            className="h-4 w-4 shrink-0 rotate-180 transition-transform duration-150 group-hover:-translate-x-0.5 motion-reduce:transition-none"
            aria-hidden="true"
          />
        )}
      </span>
    </a>
  );
}

/**
 * Copy with the async clipboard API, falling back to the old `execCommand` path
 * where it is blocked (insecure context, permission denied, older browsers).
 * Resolves to false rather than throwing so the button can stay quiet.
 */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '0';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();

    const copied = document.execCommand('copy');
    area.remove();
    return copied;
  }
}
