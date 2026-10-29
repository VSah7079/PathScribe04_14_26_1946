// src/services/cases/caseDisplayNumber.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 709 (Pete, Oct 28, 2026): the Worklist shows the case number people can
// see on the labels, cassettes, blocks, slides and report headers (the accession
// number), not the internal routing id. The internal id (Case.id) stays the key
// for links, routing and storage; it is only the fallback when a case has no
// accession number of its own.
// ─────────────────────────────────────────────────────────────────────────────
import type { Case } from '@/types/case/Case';

/** The visible case number: the accession number printed on artifacts, else the internal id. */
export function caseDisplayNumber(c: { id: string; accession?: Pick<Case['accession'], 'fullAccession'> | null }): string {
  const full = c.accession?.fullAccession?.trim();
  return full ? full : c.id;
}
