// src/hooks/useFillViewportHeight.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 395 (Pete: "use more of the window to present rows. Seems like a large
// space at the bottom."). Keeps a panel's height reaching the bottom of the
// window. The Worklist measured once, 50 ms after it opened; when the banners
// and tiles above it finished loading and got shorter, the table moved up but
// kept its first, smaller height, leaving empty space below it. This measures
// again whenever the window is resized or anything above the panel changes
// size (the page body grows or shrinks with it), on the next animation frame.
// The number comes from utils/fillViewportHeight.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import { fillViewportHeight } from '@/utils/fillViewportHeight';

export function useFillViewportHeight<T extends HTMLElement>(initialPx = 400) {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState(initialPx);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const next = fillViewportHeight(el.getBoundingClientRect().top, window.innerHeight);
    setHeight(prev => (prev === next ? prev : next));
  }, []);

  useEffect(() => {
    let frame = 0;
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    schedule();
    window.addEventListener('resize', schedule);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
    observer?.observe(document.body);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', schedule);
      observer?.disconnect();
    };
  }, [measure]);

  return { ref, height };
}
