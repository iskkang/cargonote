import { useEffect, useState } from 'react';

/** True when the viewport is at or below `bp`. Safe in jsdom (returns false when matchMedia is absent). */
export function useIsMobile(bp = 760): boolean {
  const [m, setM] = useState<boolean>(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(`(max-width:${bp}px)`).matches : false);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(`(max-width:${bp}px)`);
    const h = () => setM(mq.matches);
    h();
    mq.addEventListener?.('change', h);
    return () => mq.removeEventListener?.('change', h);
  }, [bp]);
  return m;
}
