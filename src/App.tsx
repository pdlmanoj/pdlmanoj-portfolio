import { useEffect } from 'react';
import { Footer } from './components/layout/Footer';
import { Navbar } from './components/layout/Navbar';
import { profile } from './data/profile';
import { useHashRoute, useScrollToRoute } from './hooks/useHashRoute';
import { blogMeta, homeMeta, listingMeta, setPageMeta } from './lib/seo';
import { BlogPage } from './pages/BlogPage';
import { BlogPostPage } from './pages/BlogPost';
import { ExperiencePage } from './pages/ExperiencePage';
import { Home } from './pages/Home';
import { NotFound } from './pages/NotFound';
import { ProjectsPage } from './pages/ProjectsPage';

export default function App() {
  const route = useHashRoute();
  useScrollToRoute(route);

  // Per-route metadata, so the blog archive and a 404 are never indexed as the
  // homepage.
  useEffect(() => {
    if (route.name === 'blog') {
      setPageMeta(blogMeta);
    } else if (route.name === 'projects' || route.name === 'experience') {
      setPageMeta(listingMeta(route.name));
    } else if (route.name === 'not-found') {
      setPageMeta({ ...homeMeta, title: `Page not found — ${profile.name}` });
    } else {
      setPageMeta(homeMeta);
    }
  }, [route]);

  // Home, the blog archive, a blog post, the projects or experience page, or the
  // 404 page.
  const page =
    route.name === 'home' ? (
      <Home />
    ) : route.name === 'blog' ? (
      <BlogPage />
    ) : route.name === 'post' ? (
      <BlogPostPage slug={route.slug} />
    ) : route.name === 'projects' ? (
      <ProjectsPage />
    ) : route.name === 'experience' ? (
      <ExperiencePage />
    ) : (
      <NotFound path={route.path} />
    );

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        onClick={(event) => {
          // Move focus to <main> for keyboard and screen reader users.
          event.preventDefault();
          document.getElementById('main')?.focus();
        }}
        className="sr-only rounded-sm bg-accent px-4 py-2 font-mono text-sm text-bg focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50"
      >
        Skip to content
      </a>

      <Navbar route={route} />

      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <div key={route.name === 'post' ? `post-${route.slug}` : route.name} className="page-enter">
          {page}
        </div>
      </main>

      <Footer />
    </div>
  );
}
