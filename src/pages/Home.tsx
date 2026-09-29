import { Explore } from '../components/sections/Explore';
import { Hero } from '../components/sections/Hero';

/**
 * The homepage: one section.
 *
 * The about text and the card grid are the same section on purpose. They are one
 * piece of writing — who I am, then what that turned into — so a single section
 * that runs straight from the introduction into the cards says that better than two
 * blocks with a gap between them, and the page ends where the cards do. The hero is
 * two columns from `lg` up (prose plus a portrait/focus rail), but it is still one
 * block in this one section. The section is named by the `h1` in the about text, so
 * `#/about` still scrolls here.
 *
 * Projects, Experience and the writing are cards to real pages, not sections here,
 * so the page stays a page and each of those has an address worth sharing. There is
 * no contact section: the navbar carries the socials and the email, and a section
 * that repeated them was the one part of the page that asked for nothing.
 */
export function Home() {
  return (
    <section id="about" className="scroll-mt-28" aria-labelledby="about-title">
      <div className="left-gutter mx-auto w-full max-w-5xl px-5 pt-14 pb-16 sm:px-8 sm:pt-20 sm:pb-20">
        <Hero />
        <Explore />
      </div>
    </section>
  );
}
