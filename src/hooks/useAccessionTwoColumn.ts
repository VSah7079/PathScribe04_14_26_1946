// src/hooks/useAccessionTwoColumn.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 721. True while the window is wide enough for the Accession screen's
// two-column layout (the query and the breakpoint live in
// services/accessioning/resolveAccessionPanels.ts). Follows the window as it is
// resized. Where the browser has no matchMedia (a test environment), it answers
// false, which is the existing one-panel-at-a-time tab layout.
// ─────────────────────────────────────────────────────────────────────────────

import { useSyncExternalStore } from 'react';
import { ACCESSION_TWO_COLUMN_QUERY } from '@/services/accessioning/resolveAccessionPanels';

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
  const mql = window.matchMedia(ACCESSION_TWO_COLUMN_QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

function getSnapshot(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(ACCESSION_TWO_COLUMN_QUERY).matches;
}

export function useAccessionTwoColumn(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
