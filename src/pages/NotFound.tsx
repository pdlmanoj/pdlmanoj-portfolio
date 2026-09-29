import { ArrowLeft } from 'lucide-react';
import { navigate } from '../hooks/useHashRoute';

interface NotFoundProps {
  path: string;
}

export function NotFound({ path }: NotFoundProps) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-start px-5 pt-24 pb-32 sm:px-8">
      <p className="label-mono text-accent">404</p>
      <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">Page not found</h1>
      <p className="mt-5 leading-relaxed text-muted">
        Nothing is routed at <span className="font-mono text-text">#{path}</span>. It may have been
        renamed, or the link may be out of date.
      </p>
      <a
        href="#/"
        onClick={(event) => {
          event.preventDefault();
          navigate('#/');
        }}
        className="group mt-8 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-accent"
      >
        <ArrowLeft
          className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
          aria-hidden="true"
        />
        Back to home
      </a>
    </div>
  );
}
