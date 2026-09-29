import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { navigate } from '../../hooks/useHashRoute';

interface PageHeaderProps {
  /** The page `h1`. Every page has exactly one. */
  title: string;
  /** One or two sentences under the title: what this page is and what is on it. */
  intro: ReactNode;
}

/**
 * The top of every page that is not the homepage: a way back, the page `h1`, and
 * one line saying what the page holds. Shared so the three pages are the same
 * shape rather than three near-copies that drift apart.
 */
export function PageHeader({ title, intro }: PageHeaderProps) {
  return (
    <header className="max-w-2xl">
      <a
        href="#/"
        onClick={(event) => {
          // The wordmark does the same thing, so this is a plain link and stays
          // one for middle-click and "open in new tab".
          event.preventDefault();
          navigate('#/');
        }}
        className="group inline-flex items-center gap-2 font-mono text-sm text-muted transition-colors hover:text-accent"
      >
        <ArrowLeft
          className="h-4 w-4 transition-transform duration-150 group-hover:-translate-x-0.5 motion-reduce:transition-none"
          aria-hidden="true"
        />
        Home
      </a>

      <h1 className="mt-8 text-3xl font-medium tracking-tight text-balance sm:text-4xl">{title}</h1>

      <div className="mt-4 text-lg leading-relaxed text-muted">{intro}</div>
    </header>
  );
}
