// src/services/cases/caseEditingSignal.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 573 (review): whether the case report's unsaved changes came from the
// person, not from the page setting itself up. Some panels fill in form
// values just after a case loads, which marks the page as having unsaved
// changes; the page's own "you have unsaved changes" warning has long ignored
// a change marked within a few seconds of loading. Presence ("editing") uses
// the same rule, so opening a case never shows as editing.
//
// Batch 576: the limit this had (set-up marked the page, so a real edit soon
// after didn't change the flag and the person showed as viewing until they
// saved) is gone: the page also notes the person's first edit (`editedAt`):
// any change it marks unsaved except the two set-up can mark (the synoptic
// form's prefill, a restored draft), and typing or choosing in the synoptic
// form itself.
// ─────────────────────────────────────────────────────────────────────────────

/** A change marked this soon after the case loaded is the page setting itself up. */
export const SETUP_DIRTY_WINDOW_MS = 4_000;

export function isPersonsEdit(hasUnsavedChanges: boolean, dirtySetAt: number | null, caseLoadedAt: number, editedAt: number | null = null): boolean {
  if (!hasUnsavedChanges) return false;
  // Batch 576: the person typed or changed something in the report since the case loaded.
  if (editedAt !== null && editedAt >= caseLoadedAt) return true;
  return !(dirtySetAt !== null && dirtySetAt - caseLoadedAt < SETUP_DIRTY_WINDOW_MS);
}

/** Batch 576: the unsaved-change kinds the page's own set-up can mark; any other is the person's. */
export const SETUP_DIRTY_SECTIONS: readonly string[] = ['synopticFields', 'restoredDraft'];
export const isPersonsDirtySection = (section: string) => !SETUP_DIRTY_SECTIONS.includes(section);

/**
 * Batch 576: whether an input or change event is the person editing the synoptic form (whose prefill can also
 * mark the page unsaved). Other controls in the report either mark their own change (above) or save at once.
 */
export function isReportEditEvent(target: { closest?: (selector: string) => unknown } | null | undefined): boolean {
  return !!target?.closest?.('.ps-syn-panel');
}
