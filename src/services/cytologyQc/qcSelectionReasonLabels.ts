// src/services/cytologyQc/qcSelectionReasonLabels.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 501: what the Peer Review queue shows for an assignment's selection
// reasons ("Selected by: ROSE discrepancy, Rule: All GYN, Random peer review").
// Pure: returns translation keys and values; the screen translates and joins
// them with the user's locale list format. Rule names are admin data, shown
// as stored.
// ─────────────────────────────────────────────────────────────────────────────

import type { CytologyQcCaseAssignment } from '@/types/cytologyQc/CytologyQcRule';

export interface QcReasonLabel { key: string; values?: Record<string, string> }

const K = 'cytologyQcQueue.selectedBy.reason';

export function qcSelectionReasonLabel(reason: string, ruleNames: Record<string, string>): QcReasonLabel {
  if (reason === 'rose_discrepancy') return { key: `${K}.roseDiscrepancy` };
  if (reason === 'ct_escalation') return { key: `${K}.ctEscalation` };
  if (reason.startsWith('rule:')) {
    const id = reason.slice('rule:'.length);
    return { key: `${K}.rule`, values: { name: ruleNames[id] ?? id } };
  }
  if (reason === 'peer_review_flag:random_selection') return { key: `${K}.peerReviewRandom` };
  if (reason === 'peer_review_flag:targeted_high_risk') return { key: `${K}.peerReviewTargeted` };
  return { key: `${K}.other`, values: { reason } };
}

/** An assignment's reasons; an older one with none falls back to its own trigger. */
export function qcSelectionReasons(a: Pick<CytologyQcCaseAssignment, 'selectionReasons' | 'triggerSource' | 'matchedRuleId'>): string[] {
  if (a.selectionReasons?.length) return a.selectionReasons;
  if (a.triggerSource === 'rule_match' && a.matchedRuleId) return [`rule:${a.matchedRuleId}`];
  return [a.triggerSource];
}
