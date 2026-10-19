// src/services/retentionHolds/retentionHoldsQueue.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 610 (queue entry #12): every active retention hold, across cases.
// A retention hold keeps a case's material from the disposal queue
// (computeDisposalQueue skips a case with an active one). Holds live on each case
// (Case.retentionHolds); this lists the active ones, oldest first, so someone can
// see what is being held and why, and release it from one place. Pure.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import type { RetentionHold, RetentionHoldReason } from '@/types/case/RetentionHold';

export interface RetentionHoldRow {
  caseId: string;
  accession: string;
  facilityId: string | null;
  holdId: string;
  reason: RetentionHoldReason;
  /** Free text the person typed when placing the hold; it can name people. */
  note: string;
  setAt: string;
  setByUserName: string;
}

type CaseForHolds = Pick<Case, 'id' | 'accession' | 'retentionHolds'> & { order?: { facilityId?: string | null } | null };

/** The active retention holds on the given cases, oldest first. A released hold is never listed. */
export function computeRetentionHoldsQueue(cases: readonly CaseForHolds[]): RetentionHoldRow[] {
  const rows: RetentionHoldRow[] = [];
  for (const c of cases) {
    for (const h of (c.retentionHolds ?? []) as RetentionHold[]) {
      if (!h.active) continue;
      rows.push({
        caseId: c.id,
        accession: c.accession?.fullAccession || c.accession?.accessionNumber || c.id,
        facilityId: c.order?.facilityId ?? null,
        holdId: h.id, reason: h.reason, note: h.note ?? '',
        setAt: h.setAt, setByUserName: h.setByUserName,
      });
    }
  }
  return rows.sort((a, b) => a.setAt.localeCompare(b.setAt));
}

/** Text filter over accession, reason label, who and note (case-insensitive). */
export function filterRetentionHoldRows(rows: readonly RetentionHoldRow[], text: string, reasonLabel: (r: RetentionHoldReason) => string): RetentionHoldRow[] {
  const q = text.trim().toLowerCase();
  if (!q) return [...rows];
  return rows.filter(r => [r.accession, reasonLabel(r.reason), r.setByUserName, r.note].some(v => v.toLowerCase().includes(q)));
}

/** The CSV rows: case, reason, who, when (the note is left out: it is free text and can name people). */
export function retentionHoldCsvRows(rows: readonly RetentionHoldRow[], reasonLabel: (r: RetentionHoldReason) => string): Record<string, string>[] {
  return rows.map(r => ({ Case: r.accession, Reason: reasonLabel(r.reason), 'Placed by': r.setByUserName, 'Placed at': r.setAt }));
}
