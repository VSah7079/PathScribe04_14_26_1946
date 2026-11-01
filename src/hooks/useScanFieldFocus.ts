// src/hooks/useScanFieldFocus.ts
// Touch spec T1: keep a station's scan field focused. Focuses it when it appears, and puts focus back when focus
// falls to the page (after a tap on a button, or when a panel it was in closes), by the rules in
// utils/touch/scanFieldFocus.ts. Never takes focus from another field or an open window.
import { useCallback, useEffect, type RefObject } from 'react';
import { scanFieldShouldReclaim, OPEN_DIALOG_SELECTOR } from '@/utils/touch/scanFieldFocus';

export function useScanFieldFocus(ref: RefObject<HTMLInputElement | null>, enabled = true): () => void {
  const reclaim = useCallback(() => {
    const field = ref.current;
    if (!field || !enabled) return;
    const selection = window.getSelection?.();
    const ok = scanFieldShouldReclaim({
      active: document.activeElement,
      body: document.body,
      dialogOpen: !!document.querySelector(OPEN_DIALOG_SELECTOR),
      selectionActive: !!selection && !selection.isCollapsed && selection.toString().length > 0,
      fieldVisible: field.isConnected && field.getClientRects().length > 0,
    });
    if (ok) field.focus({ preventScroll: true });
  }, [ref, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const field = ref.current;
    if (field && (document.activeElement === null || document.activeElement === document.body)) field.focus({ preventScroll: true });
    // After focus moves (or a tap lands on something that cannot take focus), check on the next tick, when the
    // browser has settled where focus went.
    let timer: number | undefined;
    const later = () => { window.clearTimeout(timer); timer = window.setTimeout(reclaim, 0); };
    document.addEventListener('focusout', later);
    document.addEventListener('pointerup', later);
    return () => { window.clearTimeout(timer); document.removeEventListener('focusout', later); document.removeEventListener('pointerup', later); };
  }, [ref, enabled, reclaim]);

  return reclaim;
}
