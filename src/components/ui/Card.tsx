import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';

interface CardProps {
  /** Where the whole card goes. Built with `pageUrl`, never a bare path. */
  href: string;
  /** Small mono label at the top left: what kind of thing this is. */
  eyebrow: string;
  /**
   * How many of them there are, shown at the top right in the accent. The count is
   * the one number on the card, so it is the one thing that gets the colour.
   */
  count?: ReactNode;
  /** The one piece of writing on the card. Set in the serif face; see below. */
  description: string;
  /** The action along the bottom, e.g. `View posts`. The arrow is added here. */
  action: string;
}

/**
 * The card the homepage uses to open a page. One component for all of them, so the
 * border, the radius, the padding, the height and the hover are the same on every
 * card by construction rather than by remembering to copy them.
 *
 * There is no title: the description says what the page is, and a second line of
 * type above it repeated the same thing. The label and the count share the top row
 * instead, the count pushed right, which is the only number on the card.
 *
 * The description is the serif face, and that is the only reason it does not look
 * like the rest of the site: label, action and body are all one muted sans, so a
 * card was three greys and a red digit. The serif gives the writing its own voice
 * against the furniture around it, and it ties the card to the hero's warm
 * sentence, which is the same family at the same italic.
 *
 * The height is the grid's, not the content's: `h-full` plus a `mt-auto` action row
 * means the divider above the action lands on the same line in all three cards
 * whatever the description happens to be.
 *
 * The whole card is the target, through an overlay on the action link, which is what
 * a card is expected to be. `focus-within` mirrors the hover, so a keyboard user
 * sees the same affordance a pointer does.
 */
export function Card({ href, eyebrow, count, description, action }: CardProps) {
  return (
    <article className="group relative flex h-full flex-col rounded-lg border border-border bg-surface p-6 shadow-[0_1px_2px_var(--surface-shadow)] transition duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[0_8px_20px_var(--surface-shadow-hover)] focus-within:-translate-y-0.5 focus-within:border-border-strong focus-within:shadow-[0_8px_20px_var(--surface-shadow-hover)] motion-reduce:transform-none motion-reduce:transition-none">
      <div className="flex items-baseline justify-between gap-4">
        <p className="label-mono text-muted">{eyebrow}</p>
        {count !== undefined ? <p className="label-mono text-accent">{count}</p> : null}
      </div>

      {/* The one piece of writing on the card, and the only reason to look at it, so
          it gets the serif the hero's warm sentence uses — the same voice, in grey
          rather than red, which keeps it from competing with that line. It also
          stops the card reading as one flat block of grey: the label and the action
          below are still muted sans, so serif against sans is what separates the
          content from the furniture on either side of it. Roman size is left at 1rem
          because Georgia's x-height fills that where Inter's leaves room. */}
      <p className="mt-3 font-serif italic leading-relaxed text-balance text-muted">
        {description}
      </p>

      {/* `mt-auto` pushes the action to the bottom of the card so the divider above
          it lines up across the grid; `pt-6` keeps a gap under the description even
          when the card is exactly as tall as its content. */}
      <div className="mt-auto pt-6">
        <p className="flex items-center gap-2 border-t border-border pt-4 font-mono text-sm text-muted transition-colors group-hover:text-accent">
          <a href={href} className="after:absolute after:inset-0 after:content-['']">
            {action}
          </a>
          <ArrowRight
            className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none"
            aria-hidden="true"
          />
        </p>
      </div>
    </article>
  );
}
