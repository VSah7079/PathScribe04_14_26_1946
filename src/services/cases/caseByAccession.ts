// src/services/cases/caseByAccession.ts
// Batch 756 (Pete, Nov 1, 2026: "fix the bugs, then record" Video 1): a case made on Accession has two numbers, its
// internal id (O26-0031) and the accession number the lab sees on every label and screen (S26-0001). Scans and lookups
// that start from a label carry the accession number, which is not the id, so CaseRouter.getCase falls back to this
// match when the id finds nothing. Pure, no service.
import type { Case } from '@/types/case/Case';

const norm = (s: string) => s.trim().toUpperCase();

/** The one case whose accession number is the entry (ignoring case and outer spaces); null for none, an empty entry,
 *  or more than one match (refusing beats guessing which case a label means). */
export function caseByAccessionNumber(cases: readonly Case[], accession: string): Case | null {
  const want = norm(accession);
  if (!want) return null;
  const hits = cases.filter(c => norm(c.accession?.fullAccession ?? '') === want);
  return hits.length === 1 ? hits[0] : null;
}
