// src/services/relatedCases/relatedCaseRules.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 613: the decisions behind "related cases" (pure; no storage, no screen).
//   • findRelatedCandidates: this patient's OTHER cases that are released, that the signed-in user
//     may already see, oldest first. A case that is not released (open, draft, pending release) is
//     never offered, so unsigned work can't leave the lab in someone else's report.
//   • buildRelatedSnapshot: the text copy of one released case.
//   • amendedRelatedCases: the frozen section is never rewritten; a changed source is flagged.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import { caseReleasedInstant } from '../caseSearch/caseSearchMatching';
import type { AmendedRelatedCase, RelatedCaseAttachment, RelatedCaseSnapshot } from './relatedCaseTypes';

export const MAX_RELATED_CASES = 10;

export function isReleasedCase(c: Case): boolean {
  return !!caseReleasedInstant(c);
}

const accessionOf = (c: Case) => c.accession?.fullAccession ?? c.accession?.accessionNumber ?? '';

/** One short line per specimen: what the case recorded, without inventing text. */
export function specimenLines(c: Case): string[] {
  return (c.specimens ?? [])
    .map(sp => String((sp as { description?: string }).description ?? '').trim())
    .filter(Boolean);
}

function copyToOf(c: Case): string[] {
  const list = (c.order as { copyToProviders?: string[] } | undefined)?.copyToProviders;
  return Array.isArray(list) ? list.map(s => String(s).trim()).filter(Boolean) : [];
}

/** The text copy of a released case. `intraopText` is that case's own frozen section diagnosis, if any. */
export function buildRelatedSnapshot(c: Case, intraopText: string | null | undefined): RelatedCaseSnapshot {
  const dx = c.diagnostic;
  const secondary = (dx?.secondaryDiagnoses ?? []).filter(Boolean);
  return {
    sourceCaseId: c.id,
    accession: accessionOf(c),
    releasedAt: caseReleasedInstant(c) ?? '',
    sourceVersion: typeof c.version === 'number' ? c.version : 0,
    specimens: specimenLines(c),
    diagnosis: [dx?.primaryDiagnosis ?? '', ...secondary].filter(Boolean).join('\n'),
    ...(intraopText ? { intraoperativeDiagnosis: intraopText } : {}),
    ...(dx?.finalizedBy ? { signedBy: dx.finalizedBy } : {}),
    ...(c.order?.requestingProvider ? { orderingPhysician: c.order.requestingProvider } : {}),
    copyToPhysicians: copyToOf(c),
    ...(c.order?.facilityName ? { client: c.order.facilityName } : {}),
  };
}

export interface FindRelatedInput {
  /** The cases the signed-in user may see (already filtered by the access rules). */
  visibleCases: Case[];
  /** Every identity confirmed to be this patient (the record and any linked records). */
  patientIds: string[];
  /** The case being reported or viewed: never offered to itself. */
  currentCaseId?: string;
  /** Intraoperative diagnosis text per case id. */
  intraopByCaseId?: ReadonlyMap<string, string>;
}

/** This patient's other released cases the user may see, oldest first. */
export function findRelatedCandidates(input: FindRelatedInput): RelatedCaseSnapshot[] {
  const ids = new Set(input.patientIds.filter(Boolean));
  return input.visibleCases
    .filter(c => c.id !== input.currentCaseId && !!c.patient?.id && ids.has(c.patient.id) && isReleasedCase(c))
    .map(c => buildRelatedSnapshot(c, input.intraopByCaseId?.get(c.id)))
    .sort((a, b) => a.releasedAt.localeCompare(b.releasedAt));
}

/** Tick or untick one case in a chosen list, keeping the list oldest first and within the limit. */
export function toggleRelatedSelection(
  chosen: readonly RelatedCaseSnapshot[],
  candidate: RelatedCaseSnapshot,
): RelatedCaseSnapshot[] {
  const has = chosen.some(c => c.sourceCaseId === candidate.sourceCaseId);
  const next = has
    ? chosen.filter(c => c.sourceCaseId !== candidate.sourceCaseId)
    : [...chosen, candidate].slice(0, MAX_RELATED_CASES);
  return next.sort((a, b) => a.releasedAt.localeCompare(b.releasedAt));
}

/** Attached cases whose source case has a newer record version than the snapshot (it was amended or corrected since). */
export function amendedRelatedCases(
  attachment: RelatedCaseAttachment | null | undefined,
  currentVersionOf: (sourceCaseId: string) => number | undefined,
): AmendedRelatedCase[] {
  if (!attachment?.frozenAt) return [];
  const out: AmendedRelatedCase[] = [];
  for (const s of attachment.cases) {
    const current = currentVersionOf(s.sourceCaseId);
    if (typeof current === 'number' && current > s.sourceVersion) {
      out.push({ sourceCaseId: s.sourceCaseId, accession: s.accession, snapshotVersion: s.sourceVersion, currentVersion: current });
    }
  }
  return out;
}

/** The plain-text form of the attached section (outbound narrative and the text report). One block per case. */
export function relatedCaseTextLines(
  cases: readonly RelatedCaseSnapshot[],
  labels: { title: string; notice: string; released: string; intraop: string; ordering: string; copyTo: string; client: string },
): string[] {
  if (cases.length === 0) return [];
  const lines = [labels.title, labels.notice, ''];
  for (const s of cases) {
    lines.push(`${s.accession} — ${labels.released} ${s.releasedAt.slice(0, 10)}`);
    for (const sp of s.specimens) lines.push(`  ${sp}`);
    if (s.intraoperativeDiagnosis) lines.push(`  ${labels.intraop}: ${s.intraoperativeDiagnosis.replace(/\n/g, '; ')}`);
    lines.push(`  ${s.diagnosis.replace(/\n/g, '; ')}`);
    if (s.orderingPhysician) lines.push(`  ${labels.ordering}: ${s.orderingPhysician}`);
    if (s.copyToPhysicians.length) lines.push(`  ${labels.copyTo}: ${s.copyToPhysicians.join(', ')}`);
    if (s.client) lines.push(`  ${labels.client}: ${s.client}`);
    lines.push('');
  }
  return lines;
}
