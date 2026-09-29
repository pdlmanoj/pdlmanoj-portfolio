import { experience } from '../../data/experience';
import { projects } from '../../data/projects';
import { posts } from '../../lib/blog';
import { pageUrl } from '../../lib/assets';
import { SectionHeader } from '../layout/SectionHeader';
import { Card } from '../ui/Card';

/**
 * The number on a card, on its own: `2`, not `2 posts`. The eyebrow beside it
 * already says what is being counted, so the noun was the same word twice on one
 * line. It stays in the markup for a screen reader, which reads the two apart and
 * would otherwise announce a bare figure. A wrong number on a portfolio reads as a
 * bug, so the count still comes from the data rather than being typed in.
 */
function count(n: number, singular: string, plural = `${singular}s`) {
  return (
    <>
      {n}
      <span className="sr-only"> {n === 1 ? singular : plural}</span>
    </>
  );
}

/**
 * The way into everything on the site: three cards, one page each. It shares a
 * section with the about text, so the introduction runs straight into the work.
 *
 * Projects, Experience and the blog used to be three long sections on this page,
 * which meant a visitor who wanted one of them had to scroll past the other two,
 * and none of them had an address worth sharing. They are pages now — a card is the
 * whole of what is left here.
 *
 * Order is writing, experience, projects: the thing I am doing now, then where it
 * came from, then what I built on the side. Add or remove a card by editing the
 * list below; the grid and the card styling do not change.
 */
export function Explore() {
  return (
    <>
      {/* The margin above is the gap between the about text and this heading: the
          section is one column of writing, and the cards are where it opens up. */}
      <SectionHeader
        id="work"
        className="mt-12 sm:mt-16"
        title="Explore my work"
        intro="my blogs, experience and things I am building"
      />

      <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <li className="h-full">
          <Card
            href={pageUrl('blog/')}
            eyebrow="Blogs"
            count={count(posts.length, 'post')}
            description="My notes on backend systems, their fundamentals, and what happens under the hood."
            action="View posts"
          />
        </li>

        <li className="h-full">
          <Card
            href={pageUrl('experience/')}
            eyebrow="Experience"
            count={count(experience.length, 'role')}
            description="The systems I have worked on and the impact I've made."
            action="View experience"
          />
        </li>

        <li className="h-full">
          <Card
            href={pageUrl('projects/')}
            eyebrow="Projects"
            count={count(projects.length, 'project')}
            description="Projects I build to understand how real systems are actually built and how they work."
            action="View projects"
          />
        </li>
      </ul>
    </>
  );
}
