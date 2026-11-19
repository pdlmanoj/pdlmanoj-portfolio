import { useEffect, useId, useState } from 'react';
import type { TocEntry } from '../../lib/blog';

/** Just below the sticky navbar, so a heading counts as read once it clears it. */
const ACTIVE_TOP = 96;

/**
 * A reading map for one post. The ids come from the build, which writes them into
 * the rendered HTML and hands the same list here, so the links keep working in the
 * prerendered page and after React replaces it.
 */
export function PostToc({ items }: { items: TocEntry[] }) {
  const headingId = useId();
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const headings = items
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => element !== null);
    if (headings.length === 0) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      let active = headings[0].id;
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top > ACTIVE_TOP) break;
        active = heading.id;
      }
      // The last section can be too short to reach the top of the viewport.
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
        active = headings[headings.length - 1].id;
      }
      setActiveId(active);
    };
    const schedule = () => {
      if (frame === 0) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.cancelAnimationFrame(frame);
    };
  }, [items]);

  // A shared #heading link lands before the post's lazy chunk has put it in the DOM.
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || hash.startsWith('#/') || hash === '#') return;
    const id = decodeURIComponent(hash.slice(1));
    if (!items.some((item) => item.id === id)) return;
    document.getElementById(id)?.scrollIntoView({ behavior: 'auto', block: 'start' });
  }, [items]);

  if (items.length < 2) return null;

  return (
    <nav aria-labelledby={headingId} className="border-y border-border py-5">
      <p id={headingId} className="label-mono text-muted">
        On this page
      </p>
      <ol className="mt-4 space-y-1">
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <li key={item.id} className={item.level === 3 ? 'pl-5' : ''}>
              <a
                href={`#${item.id}`}
                aria-current={active ? 'location' : undefined}
                className={`block text-sm leading-relaxed transition-colors ${
                  active ? 'text-accent' : 'text-muted hover:text-text'
                }`}
              >
                <span className="link-underline">{item.text}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
