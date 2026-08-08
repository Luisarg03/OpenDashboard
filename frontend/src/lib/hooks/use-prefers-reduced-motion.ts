import { useEffect, useState } from 'react';

/**
 * Reactive match for the OS / browser `prefers-reduced-motion` setting.
 *
 * Returns `true` while `prefers-reduced-motion: reduce` matches and stays in
 * sync with the media query (changing the OS setting without a page reload
 * updates the value). Shared by the focus dim and the timeline enter/exit
 * animation.
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPrefersReducedMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return prefersReducedMotion;
}
