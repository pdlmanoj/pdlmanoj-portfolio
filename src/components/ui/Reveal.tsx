import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react';

interface RevealProps {
  children: ReactNode;
  /** Stagger in milliseconds. Keep small — this is a fade, not a showreel. */
  delay?: number;
  as?: ElementType;
  className?: string;
}

const canAnimate = () =>
  typeof window !== 'undefined' &&
  'IntersectionObserver' in window &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Fades content in the first time it enters the viewport.
 *
 * Content is only hidden when we already know the animation is safe to run
 * (IntersectionObserver available, reduced motion not requested) and we set
 * `data-reveal="pending"` synchronously during render, so no-JS and
 * reduced-motion visitors always see the content.
 */
export function Reveal({ children, delay = 0, as, className = '' }: RevealProps) {
  const Component = (as ?? 'div') as ElementType;
  const [state, setState] = useState<'idle' | 'pending' | 'visible'>(() =>
    canAnimate() ? 'pending' : 'idle',
  );
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (state !== 'pending') return;
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setState('visible');
            observer.disconnect();
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [state]);

  return (
    <Component
      ref={ref}
      className={`reveal ${className}`}
      data-reveal={state}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Component>
  );
}
