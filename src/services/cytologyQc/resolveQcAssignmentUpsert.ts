// src/services/cytologyQc/resolveQcAssignmentUpsert.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 501 (Pete, Oct 9 — the layered QC model). One open QC assignment per
// specimen, never a duplicate. Three mechanisms can select a specimen at
// sign-out, in this order of precedence:
//   1. ROSE discrepancy (fixed system event): top tier, 4-hour SLA.
//   2. The QC Rules engine (Configuration → Cytology QC Rules): the matched
//      rule's tier, SLA and reviewer pool.
//   3. Peer-review selection (QC Settings rates, high-risk): a passive flag on
//      the specimen only. It never creates an assignment itself; when a rule
//      or ROSE selects the same specimen, the flag is recorded as one of the
//      assignment's selection reasons.
//
// When a trigger finds an OPEN assignment (QC_PENDING or QC_IN_REVIEW) for the
// same specimen it upgrades it instead of creating another:
//   • tier: the higher of the two;
//   • SLA: the earlier deadline;
//   • reviewer pool: the pool of whichever trigger now sets the tier (the
//     more senior pool when the tier rises); at equal tiers the existing pool
//     stays unless it had none;
//   • the trigger is added to selectionReasons and a history line is written.
// A resolved assignment is left alone: a new trigger opens a new one.
//
// Pure: the caller fetches the specimen's assignments and persists the result.
// ─────────────────────────────────────────────────────────────────────────────

import type { CytologyQcCaseAssignment, QcAssignmentHistoryEntry, QcPeerReviewPriorityTier, QcTriggerSource } from '@/types/cytologyQc/CytologyQcRule';

export const QC_TIER_RANK: Record<QcPeerReviewPriorityTier, number> = {
  routine_random: 1,
  targeted_high_consequence: 2,
  high_escalation: 3,
};

/** Precedence of what created/raised an assignment: ROSE above a rule. */
const TRIGGER_RANK: Record<QcTriggerSource, number> = { rule_match: 1, ct_escalation: 2, rose_discrepancy: 3 };

export const isOpenQcAssignment = (a: Pick<CytologyQcCaseAssignment, 'state'>) => a.state === 'QC_PENDING' || a.state === 'QC_IN_REVIEW';

export interface QcAssignmentCandidate {
  triggerSource: QcTriggerSource;
  matchedRuleId?: string;
  priorityTier: QcPeerReviewPriorityTier;
  slaHours: number;
  eligibleReviewerRoles?: string[];
  badge?: string;
  /** This trigger, as a selection reason ("rose_discrepancy", "rule:<id>"). */
  selectionReason: string;
}

export type QcAssignmentUpsert =
  | { kind: 'create'; assignment: Omit<CytologyQcCaseAssignment, 'id'> }
  | { kind: 'update'; id: string; changes: Partial<CytologyQcCaseAssignment>; history: QcAssignmentHistoryEntry; upgraded: boolean };

export const qcRuleSelectionReason = (ruleId: string) => `rule:${ruleId}`;
export const peerReviewFlagSelectionReason = (flagReason: string) => `peer_review_flag:${flagReason}`;

const union = (a: string[] | undefined, b: string[]) => [...new Set([...(a ?? []), ...b])];
const addHours = (iso: string, hours: number) => new Date(new Date(iso).getTime() + hours * 3_600_000).toISOString();

export function resolveQcAssignmentUpsert(input: {
  existing: CytologyQcCaseAssignment[];
  caseId: string;
  specimenId: string;
  primarySignOutProviderId: string;
  candidate: QcAssignmentCandidate;
  /** Other reasons already true of the specimen (e.g. its peer-review flag). */
  otherReasons?: string[];
  now: string;
}): QcAssignmentUpsert {
  const { candidate, now } = input;
  const reasons = union([candidate.selectionReason], input.otherReasons ?? []);
  const candidateDeadline = addHours(now, candidate.slaHours);
  const open = input.existing.find(a => a.caseId === input.caseId && a.specimenId === input.specimenId && isOpenQcAssignment(a));

  if (!open) {
    return {
      kind: 'create',
      assignment: {
        caseId: input.caseId,
        specimenId: input.specimenId,
        triggerSource: candidate.triggerSource,
        ...(candidate.matchedRuleId ? { matchedRuleId: candidate.matchedRuleId } : {}),
        priorityTier: candidate.priorityTier,
        badges: candidate.badge ? [candidate.badge] : [],
        state: 'QC_PENDING',
        primarySignOutProviderId: input.primarySignOutProviderId,
        slaDeadline: candidateDeadline,
        slaEscalationCount: 0,
        createdAt: now,
        ...(candidate.eligibleReviewerRoles?.length ? { eligibleReviewerRoles: candidate.eligibleReviewerRoles } : {}),
        selectionReasons: reasons,
        history: [{ at: now, event: 'created', reason: candidate.selectionReason, detail: `Created: tier ${candidate.priorityTier}, SLA ${candidateDeadline}` }],
      },
    };
  }

  const changes: Partial<CytologyQcCaseAssignment> = {};
  const notes: string[] = [];
  const tierRises = QC_TIER_RANK[candidate.priorityTier] > QC_TIER_RANK[open.priorityTier];
  if (tierRises) {
    changes.priorityTier = candidate.priorityTier;
    notes.push(`tier ${open.priorityTier} → ${candidate.priorityTier}`);
  }
  if (candidateDeadline < open.slaDeadline) {
    changes.slaDeadline = candidateDeadline;
    notes.push(`SLA ${open.slaDeadline} → ${candidateDeadline}`);
  }
  const candidatePool = candidate.eligibleReviewerRoles?.length ? candidate.eligibleReviewerRoles : undefined;
  if (candidatePool && (tierRises || (!open.eligibleReviewerRoles?.length && QC_TIER_RANK[candidate.priorityTier] === QC_TIER_RANK[open.priorityTier]))) {
    if (JSON.stringify(candidatePool) !== JSON.stringify(open.eligibleReviewerRoles ?? [])) {
      changes.eligibleReviewerRoles = candidatePool;
      notes.push(`reviewer pool ${(open.eligibleReviewerRoles ?? []).join('/') || 'any'} → ${candidatePool.join('/')}`);
    }
  }
  if (TRIGGER_RANK[candidate.triggerSource] > TRIGGER_RANK[open.triggerSource]) {
    changes.triggerSource = candidate.triggerSource;
  }
  if (candidate.matchedRuleId && !open.matchedRuleId) changes.matchedRuleId = candidate.matchedRuleId;
  if (candidate.badge && !open.badges.includes(candidate.badge)) changes.badges = [...open.badges, candidate.badge];
  const existingReasons = open.selectionReasons ?? [open.matchedRuleId ? qcRuleSelectionReason(open.matchedRuleId) : open.triggerSource];
  changes.selectionReasons = union(existingReasons, reasons);

  const upgraded = notes.length > 0;
  const history: QcAssignmentHistoryEntry = {
    at: now,
    event: upgraded ? 'upgraded' : 'reason_added',
    reason: candidate.selectionReason,
    detail: upgraded ? `Upgraded by ${candidate.selectionReason}: ${notes.join('; ')}` : `Also selected by ${candidate.selectionReason}`,
  };
  changes.history = [...(open.history ?? []), history];
  return { kind: 'update', id: open.id, changes, history, upgraded };
}
