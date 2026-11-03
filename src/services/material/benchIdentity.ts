// src/services/material/benchIdentity.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 759 (Patient Verification, Outside Case Tracking and Audit Logging spec, Pete, Nov 2, 2026): what a bench
// shows to identify the work, with no patient name, date of birth or MRN (§1): the accession number, the specimen
// part and its source (§2.3, the two identifiers checked against the container), and for an outside case the Foreign
// Identifier (§2.1): the originating institution's case number, and the outside number of the block, slide or decant
// being worked when it came with one. Pure.
// ─────────────────────────────────────────────────────────────────────────────
import type { OriginatingCase } from '@/types/case/OriginatingCase';

export interface ForeignIdentifier {
  value: string;
  source?: string;
  /** The case's own number at the originating institution, or the outside number of the item being worked. */
  scope: 'case' | 'item';
}

type Labelled = { externalId?: string; externalIdSource?: string } | null | undefined;

/** `items`: the item being worked first, then what it came from (the block, then its specimen): the first outside
 *  number found is shown. */
export function foreignIdentifiersOf(order: { originatingCase?: OriginatingCase } | undefined, items: readonly Labelled[] = []): ForeignIdentifier[] {
  const out: ForeignIdentifier[] = [];
  const caseNumber = order?.originatingCase?.caseNumber?.trim();
  if (caseNumber) out.push({ value: caseNumber, source: order?.originatingCase?.institution?.trim() || undefined, scope: 'case' });
  const item = items.find(i => i?.externalId?.trim());
  const itemId = item?.externalId?.trim();
  if (itemId && itemId.toUpperCase() !== caseNumber?.toUpperCase()) out.push({ value: itemId, source: item?.externalIdSource?.trim() || undefined, scope: 'item' });
  return out;
}

/** The specimen parts of a case as "A: description" pairs, for checking a case-level screen against its containers. */
export function specimenSources(specimens: readonly { label: string; description?: string }[] | undefined): { label: string; description: string }[] {
  return (specimens ?? []).map(s => ({ label: s.label, description: s.description?.trim() || '—' }));
}

/** Batch 759: the specimen a synoptic instance belongs to, as "part: description", for a review row that names a
 *  report field (Margin Exception Review). Null when the instance or its specimen is gone. */
export function specimenOfInstance(
  caseData: { synopticReports?: readonly { instanceId: string; specimenId: string }[]; specimens?: readonly { id: string; label: string; description?: string }[] } | null | undefined,
  instanceId: string,
): { label: string; description: string } | null {
  const inst = (caseData?.synopticReports ?? []).find(r => r.instanceId === instanceId);
  const sp = inst ? (caseData?.specimens ?? []).find(s => s.id === inst.specimenId) : undefined;
  return sp ? { label: sp.label, description: sp.description?.trim() || '—' } : null;
}
