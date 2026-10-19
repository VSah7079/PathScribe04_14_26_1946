// src/services/relatedCases/relatedCaseAttachments.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 613 (Pete, Oct 18, 2026): the other released cases of this patient that the signer chose
// to attach to the report. Kept per case, as text copies (relatedCaseTypes.ts).
//
//   • setRelatedCases: the signer's choice. Needs `report:related-cases:attach`. Refused once the
//     case has been signed out (the section is then frozen).
//   • freezeRelatedCases: run when the case is signed out. From then on the section is fixed; it
//     travels with the signed report (print, PDF, outbound result) exactly as the signer saw it.
//   • The audit detail is PHI-free: counts only, never an accession of another case.
//
// DEMO: kept in the browser's data store. With the API server the attachment is stored with the
// signed report version (docs/architecture/RELATED_CASES_API.md).
// ─────────────────────────────────────────────────────────────────────────────

import { storageGet, storageSet } from '../mockStorage';
import { mockAuditService as auditService } from '../auditlog/mockAuditService';
import type { RelatedCaseAttachment, RelatedCaseSnapshot } from './relatedCaseTypes';
import { MAX_RELATED_CASES } from './relatedCaseRules';

export const RELATED_CASE_ATTACHMENTS_KEY = 'relatedCaseAttachments';

export type SetRelatedFailure = 'notPermitted' | 'frozen' | 'tooMany';
export type SetRelatedResult = { ok: true; attachment: RelatedCaseAttachment | null } | { ok: false; reason: SetRelatedFailure };

export interface RelatedCaseDeps {
  enforce: (context: { caseId: string | null; facilityId: string | null }) => Promise<{ allowed: boolean }>;
  audit: (entry: { event: string; detail: string; user: string; caseId: string }) => void;
  now: () => string;
}

const defaultDeps: RelatedCaseDeps = {
  enforce: async context => {
    const { authorizationService } = await import('../authorization/defaultAuthorizationService');
    return authorizationService.enforce('report:related-cases:attach', context);
  },
  audit: entry => {
    auditService.logEvent({ type: 'system', event: entry.event, detail: entry.detail, user: entry.user, caseId: entry.caseId, confidence: null }).catch(() => {});
  },
  now: () => new Date().toISOString(),
};

let records: RelatedCaseAttachment[] = storageGet<RelatedCaseAttachment[]>(RELATED_CASE_ATTACHMENTS_KEY, []);
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(fn => fn());
const persist = () => storageSet(RELATED_CASE_ATTACHMENTS_KEY, records);

export function subscribeRelatedCaseAttachments(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** What is attached to this case's report, or null. */
export function getRelatedCaseAttachment(caseId: string | null | undefined): RelatedCaseAttachment | null {
  if (!caseId) return null;
  return records.find(r => r.caseId === caseId) ?? null;
}

/** The attached cases to send to the report renderer: empty when nothing is attached. */
export function attachedRelatedCases(caseId: string | null | undefined): RelatedCaseSnapshot[] {
  return getRelatedCaseAttachment(caseId)?.cases ?? [];
}

export interface SetRelatedInput {
  caseId: string;
  facilityId?: string | null;
  cases: readonly RelatedCaseSnapshot[];
  user: string;
}

export async function setRelatedCases(input: SetRelatedInput, deps: RelatedCaseDeps = defaultDeps): Promise<SetRelatedResult> {
  if (!(await deps.enforce({ caseId: input.caseId, facilityId: input.facilityId ?? null })).allowed) return { ok: false, reason: 'notPermitted' };
  const existing = getRelatedCaseAttachment(input.caseId);
  if (existing?.frozenAt) return { ok: false, reason: 'frozen' };
  if (input.cases.length > MAX_RELATED_CASES) return { ok: false, reason: 'tooMany' };
  const others = records.filter(r => r.caseId !== input.caseId);
  if (input.cases.length === 0) {
    records = others;
    persist(); notify();
    if (existing) deps.audit({ event: 'RELATED_CASES_CLEARED', detail: 'Related cases taken off the report before sign-out', user: input.user, caseId: input.caseId });
    return { ok: true, attachment: null };
  }
  const attachment: RelatedCaseAttachment = {
    caseId: input.caseId,
    cases: [...input.cases].sort((a, b) => a.releasedAt.localeCompare(b.releasedAt)),
    updatedAt: deps.now(),
    updatedBy: input.user,
  };
  records = [...others, attachment];
  persist(); notify();
  deps.audit({ event: 'RELATED_CASES_ATTACHED', detail: `${attachment.cases.length} related released case(s) chosen for the report`, user: input.user, caseId: input.caseId });
  return { ok: true, attachment };
}

/** Sign-out: fix the attached section. A report with nothing attached is untouched. */
export function freezeRelatedCases(caseId: string, user: string, deps: RelatedCaseDeps = defaultDeps): RelatedCaseAttachment | null {
  const existing = getRelatedCaseAttachment(caseId);
  if (!existing || existing.frozenAt) return existing;
  const frozen: RelatedCaseAttachment = { ...existing, frozenAt: deps.now(), frozenBy: user };
  records = records.map(r => (r.caseId === caseId ? frozen : r));
  persist(); notify();
  deps.audit({ event: 'RELATED_CASES_FROZEN', detail: `${frozen.cases.length} related case(s) fixed in the signed report`, user, caseId });
  return frozen;
}

/** Test and reset support. */
export function resetRelatedCaseAttachmentsForTests(): void {
  records = [];
  listeners.clear();
}
