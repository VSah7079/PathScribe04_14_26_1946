// src/services/billing/frozenSectionSuggestionReview.ts
// ─────────────────────────────────────────────────
// Batch 605: frozen section CPT suggestions (88331 first block, 88332 each
// additional block, per specimen) shown in the billing review, labelled
// unconfirmed. A person accepts or dismisses each; the decision is kept per case
// and audited. An accepted suggestion is a recorded decision for the coder: it
// does not post a charge.
// ─────────────────────────────────────────────────
import { storageGet, storageSet } from '../mockStorage';
import { mockAuditService } from '../auditlog/mockAuditService';
import { suggestFrozenSectionCptCodesFromSpecimens } from './frozenSectionBilling';
import type { IntraopSpecimen } from '@/types/intraop/IntraoperativeEntry';

export type FrozenDecision = 'accepted' | 'dismissed';
export interface FrozenSuggestionRow { key: string; specimenId: string; specimenLabel: string; billingCode: 'FROZEN-FIRST' | 'FROZEN-ADDL'; cpt: string; ordinal: number; decision?: FrozenDecision }

const KEY = 'frozenSectionSuggestionDecisions';
type Store = Record<string, Record<string, FrozenDecision>>; // caseId -> row key -> decision
const load = (): Store => storageGet<Store>(KEY, {});

const FALLBACK_CPT = { 'FROZEN-FIRST': '88331', 'FROZEN-ADDL': '88332' } as const;

/** The rows to show for a case's frozen-section specimens. Pure apart from reading saved decisions. */
export function buildFrozenSuggestionRows(caseId: string, specimens: Pick<IntraopSpecimen, 'id' | 'specimenLabel' | 'preparations'>[], cptFor: (code: 'FROZEN-FIRST' | 'FROZEN-ADDL') => string = c => FALLBACK_CPT[c]): FrozenSuggestionRow[] {
  const decisions = load()[caseId] ?? {};
  const label = new Map(specimens.map(s => [s.id, s.specimenLabel]));
  return suggestFrozenSectionCptCodesFromSpecimens(specimens).flatMap(s => s.suggestions.map((code, i) => {
    const key = `${s.specimenId}:${i + 1}`;
    const billingCode = code as 'FROZEN-FIRST' | 'FROZEN-ADDL';
    return { key, specimenId: s.specimenId, specimenLabel: label.get(s.specimenId) ?? s.specimenId, billingCode, cpt: cptFor(billingCode), ordinal: i + 1, decision: decisions[key] };
  }));
}

export async function decideFrozenSuggestion(caseId: string, row: Pick<FrozenSuggestionRow, 'key' | 'billingCode' | 'cpt' | 'specimenLabel'>, decision: FrozenDecision, actor: string): Promise<void> {
  const all = load();
  storageSet(KEY, { ...all, [caseId]: { ...(all[caseId] ?? {}), [row.key]: decision } });
  await mockAuditService.logEvent({
    type: 'user', event: decision === 'accepted' ? 'Frozen Section CPT Suggestion Accepted' : 'Frozen Section CPT Suggestion Dismissed',
    detail: `${row.cpt} (${row.billingCode}) for specimen ${row.specimenLabel} ${decision} by the reviewer. The suggestion was unconfirmed; no charge was posted by this action.`,
    user: actor, caseId, confidence: null,
  }).catch(() => {});
}
