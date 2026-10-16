// src/utils/a11y/focusAfterRemoval.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 569 (WCAG 2.4.3 Focus Order): when the item that had keyboard focus is
// removed from a list (deleted, restored to another folder), focus goes to the
// next item, or the one before when it was the last, instead of dropping to
// the page. Null when the list is left empty (the caller focuses the list).
// Batch 570: given the list as it is now (`idsNow`), the nearest item that is
// still there, so two quick deletes don't send focus to one already gone.
// ─────────────────────────────────────────────────────────────────────────────

export function focusTargetAfterRemoval(ids: readonly string[], removedId: string, idsNow?: readonly string[]): string | null {
  const i = ids.indexOf(removedId);
  if (i < 0) return null;
  const present = (id: string) => id !== removedId && (!idsNow || idsNow.includes(id));
  for (let j = i + 1; j < ids.length; j++) if (present(ids[j])) return ids[j];
  for (let j = i - 1; j >= 0; j--) if (present(ids[j])) return ids[j];
  return null;
}

/**
 * Batch 570: whether a click came from the keyboard or a screen reader rather than a mouse: `detail` is 0 for
 * Enter / Space (and VoiceOver, NVDA in Chrome); Firefox marks a screen reader's synthesized click with
 * `mozInputSource` 0 (MOZ_SOURCE_UNKNOWN) and `detail` 1.
 */
export function isNonPointerClick(e: { detail: number; nativeEvent?: Event }): boolean {
  if (e.detail === 0) return true;
  const native = e.nativeEvent as (Event & { mozInputSource?: number }) | undefined;
  return !!native && native.isTrusted && native.mozInputSource === 0;
}
