import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { setPageMeta } from '../lib/seo';
import { profile } from '../data/profile';
import { assetUrl } from '../lib/assets';
import { PostTags } from '../components/blog/PostTags';
import {
  blogHref,
  formatDate,
  loadPost,
  neighbouringPosts,
  postHref,
  relatedPosts,
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
        path: `/blog/${loaded.slug}/`,
        type: 'article',
        publishedTime: loaded.frontmatter.date,
        image: loaded.frontmatter.image,
        // The build's derived first paragraph, so the live tab carries the same
        // description the static page already has. `setPageMeta` takes the tag out
        // when there is none, rather than leaving the homepage's sentence behind.
        description: loaded.frontmatter.summary,
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
  const related = relatedPosts(post.slug);

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

      <header className="mt-8">
        {/**
         * The date is not here any more: the byline below states it as
         * "Published", and printing the same date twice on one screen reads as a
         * mistake rather than as metadata.
         */}
        <p className="label-mono text-muted">{post.readingTime} min read</p>
        <h1 className="mt-4 text-3xl font-medium tracking-tight text-balance sm:text-4xl">
          {post.frontmatter.title}
        </h1>
        {post.frontmatter.tags.length > 0 ? (
          <div className="mt-5">
            <PostTags tags={post.frontmatter.tags} />
          </div>
        ) : null}
      </header>

      <PostByline post={post} />

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

      <RelatedPosts posts={related} />

      <PostLink post={older} direction="older" />
      <PostLink post={newer} direction="newer" />
    </article>
  );
}

/**
 * Who writes this, and when, between the title and the first paragraph.
 *
 * A byline belongs with the title rather than at the foot of the page: it is
 * metadata about the post, not a note tacked on after it. It is also the one
 * place a reader is told the post came from a person rather than a feed.
 *
 * The dates are stated rather than implied. "Published" is the frontmatter date;
 * "Modified" appears only when the post carries an `updated:` one, because a
 * build timestamp would claim a post had been revised when only its bundle had
 * been rebuilt. Leaving the row off is the honest answer, not a gap.
 *
 * Held deliberately quiet — a 48px photo, the name in the muted colour, the red
 * line a size down from the one in the hero — because the post itself is why the
 * reader is here, and this sits directly above the first word of it. Anything
 * louder here would be read before the content rather than alongside it.
 *
 * The hairline is below the byline, not above it: the title block owns the top of
 * the page and the post body owns the rule that opens the prose, so the byline
 * reads as part of the header rather than as the header's own footer. One rule,
 * immediately above the content, is also the mark that says the front matter has
 * ended — a rule above the byline closed a box around nothing instead.
 */
function PostByline({ post }: { post: BlogPost }) {
  const published = post.frontmatter.date;
  const modified = post.frontmatter.updated;

  return (
    <aside className="mt-6 flex items-start gap-3 border-b border-border pb-8">
      {profile.avatar ? (
        <img
          src={assetUrl(profile.avatar)}
          alt={profile.name}
          width={440}
          height={440}
          loading="eager"
          decoding="async"
          // A circle, at 48px. The hero's rounded square is a portrait card; this
          // is a byline, and at that size the square reads as a card too.
          // Eager, not lazy: it is above the fold, so lazy loading it would only
          // delay a picture the reader is about to look at.
          className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-border"
        />
      ) : null}
      <div className="min-w-0">
        <p className="text-sm text-muted">{profile.name}</p>
        {profile.heroParagraph ? (
          <p className="mt-0.5 font-serif text-base italic leading-snug text-pretty text-accent opacity-80">
            {profile.heroParagraph}
          </p>
        ) : null}
        {/**
         * The same mono metadata voice as the line above the title, so the two
         * read as one set of facts about the post rather than two designs.
         */}
        <p className="label-mono mt-3 text-muted">
          {published ? (
            <span>
              Published <time dateTime={published}>{formatDate(published)}</time>
            </span>
          ) : null}
          {modified ? (
            <>
              <span className="px-2 text-border-strong"> / </span>
              <span>
                Modified <time dateTime={modified}>{formatDate(modified)}</time>
              </span>
            </>
          ) : null}
        </p>
      </div>
    </aside>
  );
}

/**
 * Other posts on the same subject, by shared tag.
 *
 * These are ordinary links to real post pages, which is the point: they are the
 * site's internal link graph, and a crawler reaches a post through the posts
 * around it. The tags stay labels on the page — nothing here is a tag archive.
 *
 * Renders nothing when the post shares no tag with any other, because a heading
 * over an empty section is worse than no section.
 */
function RelatedPosts({ posts }: { posts: BlogPostSummary[] }) {
  if (posts.length === 0) return null;

  return (
    <section className="mt-14" aria-labelledby="related-heading">
      <h2 id="related-heading" className="label-mono text-muted">
        Related
      </h2>
      <ul className="mt-4 flex flex-col gap-3">
        {posts.map((post) => (
          <li key={post.slug}>
            <a
              href={postHref(post.slug, 'post')}
              className="group flex flex-col gap-1 text-lg font-medium tracking-tight transition-colors hover:text-accent"
            >
              <span>{post.title}</span>
              <span className="label-mono text-muted">
                {formatDate(post.date)} / {post.readingTime} min read
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
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
