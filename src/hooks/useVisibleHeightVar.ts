// src/hooks/useVisibleHeightVar.ts
// Batch 736: the height of the part of the page the on-screen keyboard leaves visible, as the CSS custom property
// --ps-visible-height on the page. iPad Safari does not shrink the page (100vh) when the keyboard opens, so a
// window sized to 100vh runs under the keyboard; sized to this property it stays above it (the header search's
// results, touchChrome.css). Without visualViewport the property is not set and the CSS falls back to 100vh.
import { useEffect } from 'react';

export const VISIBLE_HEIGHT_VAR = '--ps-visible-height';

export function useVisibleHeightVar(): void {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    const update = () => root.style.setProperty(VISIBLE_HEIGHT_VAR, `${Math.round(vv.height)}px`);
    update();
    vv.addEventListener('resize', update);
    return () => { vv.removeEventListener('resize', update); root.style.removeProperty(VISIBLE_HEIGHT_VAR); };
  }, []);
}
