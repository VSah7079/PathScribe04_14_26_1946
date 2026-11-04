// src/services/help/helpAnchorStore.ts
// ─────────────────────────────────────────────────────────
// Batch 669d (Pete, Oct 24, 2026: the top-bar Help button should also be on Configuration, and open the Administrator Guide at
// the section that is open, such as Printer Profiles). The Configuration page knows which tab and section are open; the top bar
// does not. The page publishes the guide anchor here while it is on screen, and the top bar reads it. Holds only the anchor
// for the screen now showing, never any data.
// ─────────────────────────────────────────────────────────
let current: string | null = null;
const listeners = new Set<() => void>();

export const getHelpAnchor = (): string | null => current;

export function setHelpAnchor(anchor: string | null): void {
  if (anchor === current) return;
  current = anchor;
  listeners.forEach(l => l());
}

export function subscribeHelpAnchor(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
