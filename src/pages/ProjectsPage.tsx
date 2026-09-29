import { PageHeader } from '../components/layout/PageHeader';
import { ProjectCard } from '../components/projects/ProjectCard';
import { Reveal } from '../components/ui/Reveal';
import { orderedProjects } from '../lib/projects';

/**
 * The projects page, served at `/projects/`.
 *
 * A real page rather than a homepage section, for the same reason the blog is: it
 * is a link worth sharing and a page worth indexing, so it has its own address, its
 * own preview and its own sitemap entry. `build/post-pages.ts` writes the static
 * version for crawlers, which do not run JavaScript.
 *
 * Each project still links straight out to its repository — there is no detail page
 * — and the card says everything there is to say.
 */
export function ProjectsPage() {
  const projects = orderedProjects();

  return (
    <div className="left-gutter mx-auto w-full max-w-5xl px-5 pt-12 pb-24 sm:px-8 sm:pt-16">
      <PageHeader
        title="Projects"
        intro="Projects I build to understand how real systems are actually built and how they work."
      />

      <ul className="mt-12 max-w-2xl space-y-12 sm:mt-16 sm:space-y-14">
        {projects.map((project, index) => (
          <Reveal as="li" key={project.title} delay={Math.min(index * 50, 150)}>
            <ProjectCard project={project} />
          </Reveal>
        ))}
      </ul>
    </div>
  );
}
