import { useEffect, useRef, useState } from 'react';
import { comments } from '../../data/comments';

const GISCUS_ORIGIN = 'https://giscus.app';

function readTheme(): 'light' | 'dark' {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

/**
 * The comment thread at the foot of a post.
 *
 * Giscus is an iframe hosted at giscus.app: a script from that origin reads the
 * settings below and drops the frame into the container. There is nothing to
 * prerender here — crawlers do not need comments, and a static page with an
 * empty comment box would only ship a broken-looking first paint.
 */
export function PostComments() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const enabled = comments.enabled && comments.provider === 'giscus';
  const active = enabled && (!comments.giscus.lazy || visible);

  useEffect(() => {
    if (!enabled || !comments.giscus.lazy) return;
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setVisible(true);
        observer.disconnect();
      },
      { rootMargin: '200px' },
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, [enabled]);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container || container.querySelector('script[data-giscus]')) return;

    const config = comments.giscus;
    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.dataset.giscus = 'true';
    script.setAttribute('data-repo', config.repo);
    script.setAttribute('data-repo-id', config.repoId);
    script.setAttribute('data-category', config.category);
    script.setAttribute('data-category-id', config.categoryId);
    script.setAttribute('data-mapping', config.mapping);
    script.setAttribute('data-input-position', config.inputPosition);
    script.setAttribute('data-reactions-enabled', config.reactionsEnabled);
    script.setAttribute('data-theme', readTheme());
    script.setAttribute('data-lang', config.lang);
    container.append(script);

    const applyTheme = (): boolean => {
      const frame = container.querySelector<HTMLIFrameElement>('iframe.giscus-frame');
      if (!frame) return false;
      frame.contentWindow?.postMessage(
        { giscus: { setConfig: { theme: readTheme() } } },
        GISCUS_ORIGIN,
      );
      return true;
    };

    // The iframe arrives after the script. Watching both ends covers a theme
    // toggle made before it loads as well as every one made afterwards.
    const themeObserver = new MutationObserver(applyTheme);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    const frameObserver = new MutationObserver(() => {
      if (applyTheme()) frameObserver.disconnect();
    });
    frameObserver.observe(container, { childList: true, subtree: true });

    return () => {
      themeObserver.disconnect();
      frameObserver.disconnect();
    };
  }, [active]);

  if (!enabled) return null;

  return (
    <section className="mt-14 border-t border-border pt-8" aria-labelledby="comments-heading">
      <h2 id="comments-heading" className="label-mono text-muted">
        Comments
      </h2>
      <div ref={containerRef} className="mt-6 min-h-8" />
    </section>
  );
}
