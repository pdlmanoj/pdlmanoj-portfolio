import { ArrowUp } from 'lucide-react';
import { profile } from '../../data/profile';
import { navigate } from '../../hooks/useHashRoute';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="py-12">
      <div className="left-gutter mx-auto w-full max-w-5xl px-5 sm:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="label-mono text-muted">
            © {year} {profile.name} · Backend Developer
          </p>
          <a
            href="#/"
            onClick={(event) => {
              event.preventDefault();
              navigate('#/');
              window.scrollTo({
                top: 0,
                behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                  ? 'auto'
                  : 'smooth',
              });
            }}
            className="group inline-flex items-center gap-1.5 font-mono text-sm text-muted transition-colors hover:text-accent"
          >
            Top
            <ArrowUp
              className="h-3.5 w-3.5 transition-transform duration-150 group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0"
              aria-hidden="true"
            />
          </a>
        </div>
      </div>
    </footer>
  );
}
