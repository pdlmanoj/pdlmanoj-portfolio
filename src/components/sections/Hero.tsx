import { profile } from '../../data/profile';
import { assetUrl } from '../../lib/assets';
import { Reveal } from '../ui/Reveal';

/**
 * Who I am, in my own words: the greeting, the role, the one warm sentence and the
 * about paragraphs. It is a block, not a section — the homepage puts it and the
 * card grid in one section, so the page is one piece of writing that then opens
 * onto the work.
 *
 * The greeting is the `h1`, which is why the first line of `profile.about` has to
 * keep the name in it: that sentence is what a reader and a crawler both see as the
 * heading of the page. It also names the section it sits in, for the same reason.
 * Everything under it steps down a size at a time.
 *
 * From `lg` up the introduction is two columns: the portrait leads on the left
 * and the prose runs beside it toward the middle, so the page starts from the left
 * edge and the text comes to rest near the centre. Below `lg` it collapses back to
 * a single column with the photo as a badge on the greeting line.
 *
 * Nothing here is a call to action, and nothing here links anywhere. The card grid
 * below is where the site asks for anything, so this stays one uninterrupted
 * introduction: who I am, what I do, why.
 */
export function Hero() {
  const [greeting, ...about] = profile.about;

  return (
    <>
      {/* Status line: the one thing that changes, so it sits on top. */}
      {profile.availability ? (
        <Reveal>
          <p className="label-mono flex items-center gap-2.5 text-muted">
            <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60 motion-reduce:hidden" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            {profile.availability}
          </p>
        </Reveal>
      ) : null}

      {/*
        Two columns from `lg` up, the portrait on the left and the prose on the
        right. The prose still holds its single narrow measure so the lines stay
        readable. The order is flipped with `order` only, not by moving the markup:
        the greeting stays first in the DOM (a screen reader and a crawler read it
        before the photo), while the grid paints the photo first. Below `lg` it is
        the one column it used to be, with the photo as a badge on the greeting line.
        There is no link and no box on this page — just the text and the photo.
      */}
      <div className="mt-6 sm:mt-7 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,16rem)] lg:items-start lg:gap-x-14">
        <div className="min-w-0">
          <div className="flex items-center gap-3 sm:gap-5">
            {/* Greeting: the loudest thing on the page, and the only h1. It comes
                first in the markup, so the photo is moved back into place with
                `order` and the heading stays the first thing read. */}
            <Reveal delay={50} className="min-w-0">
              {/* Balanced from `sm` up only: on a phone the line is too narrow to
                  balance without adding a third line. */}
              <h1
                id="about-title"
                className="text-3xl font-medium tracking-[-0.03em] sm:text-balance sm:text-5xl"
              >
                {greeting}
              </h1>
            </Reveal>

            {/* The badge is for the single-column layout only: on `lg` the photo
                moves into the rail, and two copies on one screen would read as a
                mistake. */}
            {profile.avatar ? (
              <Reveal delay={50} className="order-first shrink-0 lg:hidden">
                <img
                  src={assetUrl(profile.avatar)}
                  alt={profile.name}
                  // The file is square, so the circle never crops or reflows.
                  width={440}
                  height={440}
                  loading="eager"
                  decoding="async"
                  className="h-12 w-12 rounded-full object-cover ring-1 ring-border sm:h-[4.5rem] sm:w-[4.5rem]"
                />
              </Reveal>
            ) : null}
          </div>

          <Reveal delay={100}>
            <p className="label-mono mt-6 text-text">{profile.role}</p>
          </Reveal>

          {/* The one warm sentence on the page, in the same red every link and hover
              uses. A step down from the name, a step up from the about paragraphs.
              It is the only serif on the site: a drawn Georgia italic rather than a
              slanted Inter, which is what makes the one warm line read as a voice
              of its own instead of a highlighted paragraph. Georgia has no
              semibold, so `font-semibold` is drawn as bold — it states the intent
              and starts to work if a real semibold is ever loaded. `text-lg` below
              is what the section-level checks find it by, so it stays in the class
              list even where a larger size overrides it.

              The accent at full strength made this the loudest thing in the hero and
              it pulled the eye off the name, which is supposed to win. At 80% the
              sentence is still clearly red and still the only warm note, but it sits
              back. 80% is the floor: on the light page it is ~4.4:1, so one more step down
              would fail contrast for 18px body-size text. The dark value is lighter
              and has room to spare.

              The fade is `opacity-80` on the element rather than `text-accent/80`,
              which would look the same. `text-accent` stays in the class list on
              purpose: the section-level checks look the tagline up by its classes
              and read its computed colour, and a faded colour would answer to
              neither. */}
          <Reveal delay={150}>
            <p className="mt-5 max-w-xl font-serif text-lg font-semibold italic leading-relaxed text-pretty text-accent opacity-80 sm:text-2xl">
              {profile.heroParagraph}
            </p>
          </Reveal>

          {/* The about text. Held to one measure and a line height meant for
              reading, because paragraphs of prose in a hero are the part of the page
              most likely to be skimmed. */}
          <Reveal delay={200}>
            <div className="mt-7 max-w-xl space-y-6">
              {about.map((paragraph) => (
                <p key={paragraph} className="text-lg leading-relaxed text-pretty text-muted">
                  {paragraph}
                </p>
              ))}
            </div>
          </Reveal>
        </div>

        {/* The portrait, `lg` and up only. It leads on the left so the page starts from
            the left edge; the prose comes to rest beside it, toward the middle.
            Borderless on purpose: it is the photo alone, not a box beside the text. */}
        {profile.avatar ? (
          <Reveal delay={250} className="hidden lg:block lg:self-center lg:-mt-16 lg:order-1">
            <div className="lg:w-64">
              <img
                src={assetUrl(profile.avatar)}
                alt={profile.name}
                width={440}
                height={440}
                loading="eager"
                decoding="async"
                // A rounded square, not a circle, so it reads as a portrait card
                // rather than an avatar badge. Centred in the rail beside the
                // text, and nudged a little above the true centre because a photo
                // exactly in the middle of the page feels heavy. The small badge
                // below `lg` stays a circle — at 48px a squircle reads as a bug.
                className="h-60 w-55 rounded-3xl object-cover ring-1 ring-border"
              />
            </div>
          </Reveal>
        ) : null}
      </div>
    </>
  );
}
