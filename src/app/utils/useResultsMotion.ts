import { useEffect, useRef, type DependencyList } from 'react';

/**
 * Animates an already-mounted results region after filters, sorting or view mode change.
 * Never rekeys/unmounts result cards and never updates application state.
 */
export function useResultsMotion(dependencies: DependencyList) {
  const regionRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      return;
    }
    const region = regionRef.current;
    if (!region || typeof window === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // A single small animation is cheaper than animating each row or card.
    const animation = region.animate([
      { opacity: 0.87, transform: 'translate3d(0, 5px, 0)' },
      { opacity: 1, transform: 'translate3d(0, 0, 0)' },
    ], {
      duration: 185,
      easing: 'cubic-bezier(.2, .7, .2, 1)',
    });
    return () => animation.cancel();
  }, dependencies);

  return regionRef;
}
