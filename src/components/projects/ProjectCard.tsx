import type { Project } from '../../types';
import { Icon } from '../ui/Icon';
import { Tag } from '../ui/Tag';

interface ProjectCardProps {
  project: Project;
}

const statusLabels: Record<NonNullable<Project['status']>, string> = {
  live: 'Live',
  'in-progress': 'In Progress',
  archived: 'Archived',
};

/**
 * Projects link straight out to the repository. There is no detail page: what
 * you read here is what the visitor gets, and the code lives on GitHub.
 *
 * With no `githubUrl` in the data the card is plain text — no dead links.
 */
export function ProjectCard({ project }: ProjectCardProps) {
  const isFeatured = Boolean(project.featured);
  const statusLabel =
    project.status && project.status !== 'live' ? statusLabels[project.status] : '';
  const repo = project.githubUrl;

  return (
    <article className="group relative max-w-2xl">
      {project.image ? (
        <img
          src={project.image}
          alt={project.imageAlt ?? `${project.title} screenshot`}
          loading="lazy"
          decoding="async"
          className="mb-6 w-full"
        />
      ) : null}

      {isFeatured || statusLabel ? (
        <p className="label-mono text-muted">
          <Tag>{[isFeatured ? 'Featured' : '', statusLabel].filter(Boolean).join(' · ')}</Tag>
        </p>
      ) : null}

      <h3
        className={[
          'mt-3 font-medium tracking-tight',
          isFeatured ? 'text-2xl sm:text-3xl' : 'text-xl',
        ].join(' ')}
      >
        {repo ? (
          <a
            href={repo}
            target="_blank"
            rel="noreferrer noopener"
            className="transition-colors after:absolute after:inset-0 group-hover:text-accent"
          >
            {project.title}
          </a>
        ) : (
          <span className="transition-colors group-hover:text-accent">{project.title}</span>
        )}
      </h3>

      <p className="mt-3 leading-relaxed text-muted">{project.description}</p>

      <p className="mt-4 font-mono text-sm text-muted">{project.technologies.join(' · ')}</p>

      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2">
        {/* `relative z-10` keeps these clickable above the title overlay. */}
        {repo ? (
          <a
            href={repo}
            target="_blank"
            rel="noreferrer noopener"
            title={`${project.title} on GitHub`}
            className="link-underline group/source relative z-10 inline-flex items-center gap-2 font-mono text-sm text-muted transition-colors hover:text-accent"
          >
            <Icon name="github" className="h-4 w-4" />
            Code
          </a>
        ) : null}

        {/* Only appears when the project has a deployed demo in the data. */}
        {project.liveUrl ? (
          <a
            href={project.liveUrl}
            target="_blank"
            rel="noreferrer noopener"
            title={`${project.title} live demo`}
            className="link-underline group/demo relative z-10 inline-flex items-center gap-2 font-mono text-sm text-muted transition-colors hover:text-accent"
          >
            <Icon name="demo" className="h-4 w-4" />
            Demo
          </a>
        ) : null}
      </div>
    </article>
  );
}
