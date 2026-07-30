// src/utils/caseRevisionDisplay.ts
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for turning (status, lastRevisionType) into the
// CAP-aligned display label and accent color used across HeaderBar's status
// pill, WorklistTable's status dot/card, and SearchPage's status pills.
//
// Replaces the old 'amended' CaseStatus value's display duties now that
// case status and revision kind are split — see
// AMENDMENT_STATUS_REDESIGN_BRIEF.md. A finalized case with revision
// history shows "Final (Amended)" / "Final (Corrected)" / "Final
// (Addendum)"; everything else falls back to a Title Case of the raw
// status string, same as before.
// ─────────────────────────────────────────────────────────────────────────────
import type { RevisionType } from '@/types/reports/AmendmentRecord';

const REVISION_LABEL: Record<Exclude<RevisionType, 'original'>, string> = {
  amendment: 'Amended',
  correction: 'Corrected',
  addendum: 'Addendum',
};

/** The violet accent the old 'amended' CaseStatus used to carry — reused
 *  here, keyed off revisionType instead so it survives finalized cases
 *  with real revision history. */
export const REVISION_ACCENT = { bg: 'rgba(139,92,246,0.15)', color: '#8B5CF6', border: 'rgba(139,92,246,0.3)' };

export function hasDisplayableRevision(status: string, lastRevisionType?: RevisionType): boolean {
  return status === 'finalized' && !!lastRevisionType && lastRevisionType !== 'original';
}

/** e.g. "Final (Amended)" / "Final (Corrected)" / "Final (Addendum)",
 *  or a Title Case fallback of the raw status for every other case. */
export function getCaseStatusLabel(status: string, lastRevisionType?: RevisionType): string {
  if (hasDisplayableRevision(status, lastRevisionType)) {
    return `Final (${REVISION_LABEL[lastRevisionType as Exclude<RevisionType, 'original'>]})`;
  }
  return status.replace(/-/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());
}
