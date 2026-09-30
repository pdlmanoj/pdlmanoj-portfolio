/**
 * A post's tags.
 *
 * One component because the archive row and the post header show the same list,
 * and two hand-written versions of it would drift: the archive is where a reader
 * decides whether to open a post, and the header is where they confirm they got
 * the right one.
 *
 * Each tag is a box, which is what makes a handful of them read as a set rather
 * than as a stray line of text in the middle of the post. The box is a hairline
 * and the fill is the surface colour, so it sits in the page instead of on it,
 * and the text stays in the muted colour: a tag says what the post is about, and
 * the title and the prose are what the page is for. The `#` is inside the box
 * because outside it a leading hash reads as a link, and these are not links —
 * there is no tag page, so they carry no `href` and no affordance that would go
 * nowhere. See the content model in AGENTS.md before adding one.
 */
export function PostTags({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;

  return (
    <ul className="flex flex-wrap items-center gap-2">
      {tags.map((tag) => (
        <li
          key={tag}
          className="rounded-full border border-border bg-surface px-2.5 py-1 font-mono text-sm leading-none text-muted"
        >
          #{tag}
        </li>
      ))}
    </ul>
  );
}
