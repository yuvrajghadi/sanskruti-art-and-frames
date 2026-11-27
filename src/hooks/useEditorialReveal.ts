import { DependencyList, RefObject, useEffect } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Observes elements marked with `[data-reveal]` under `rootRef` using a single
 * IntersectionObserver and marks them `.is-revealed` once they enter the viewport.
 *
 * Guarantees content stays visible when `IntersectionObserver` is unavailable,
 * throws, or `prefers-reduced-motion: reduce` is enabled.
 */
export function useEditorialReveal(
  rootRef: RefObject<HTMLElement | null>,
  deps: DependencyList = []
): void {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof window === 'undefined') return;

    const revealImmediately = () => {
      root.classList.remove('atelier-motion-ready');
      root.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
        el.classList.add('is-revealed');
      });
    };

    const mediaQuery =
      typeof window.matchMedia === 'function' ? window.matchMedia(REDUCED_MOTION_QUERY) : null;

    if (mediaQuery?.matches || !('IntersectionObserver' in window)) {
      revealImmediately();
      return;
    }

    const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (targets.length === 0) return;

    const viewportCutoff = window.innerHeight * 0.94;
    const pendingTargets: HTMLElement[] = [];

    for (const el of targets) {
      if (el.classList.contains('is-revealed')) continue;
      const rect = el.getBoundingClientRect();
      if (rect.top <= viewportCutoff) {
        el.classList.add('is-revealed');
      } else {
        pendingTargets.push(el);
      }
    }

    root.classList.add('atelier-motion-ready');

    let observer: IntersectionObserver | null = null;
    try {
      observer = new IntersectionObserver(
        (entries, obs) => {
          for (const entry of entries) {
            if (entry.isIntersecting || entry.boundingClientRect.top <= window.innerHeight) {
              entry.target.classList.add('is-revealed');
              obs.unobserve(entry.target);
            }
          }
        },
        {
          root: null,
          rootMargin: '0px 0px -36px 0px',
          threshold: 0.06,
        }
      );

      for (const el of pendingTargets) {
        observer.observe(el);
      }
    } catch {
      revealImmediately();
    }

    const onReducedMotionChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        revealImmediately();
        observer?.disconnect();
      }
    };

    mediaQuery?.addEventListener?.('change', onReducedMotionChange);

    return () => {
      observer?.disconnect();
      mediaQuery?.removeEventListener?.('change', onReducedMotionChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
