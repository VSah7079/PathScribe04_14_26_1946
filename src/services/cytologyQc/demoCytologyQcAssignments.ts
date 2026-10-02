// src/services/cytologyQc/demoCytologyQcAssignments.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 395 (Pete: "add some Cytology QC Peer Review ... cases for Pete Nimmo so
// I can test"). Demo QC peer-review assignments on three cytology cases Pete's
// organisation owns (Desert Valley, HOSP-001), one per priority tier. The
// primary sign-out provider is Dr. Sarah Johnson (PATH-SJ-001), so Pete can take
// them: the self-review rule refuses a reviewer who signed the case out.
// Loaded only when the store has never been written (a new browser, or after a
// demo Full Reset); nothing is added to an existing store.
// ─────────────────────────────────────────────────────────────────────────────

import type { CytologyQcCaseAssignment } from '@/types/cytologyQc/CytologyQcRule';

const hoursFromNow = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

export function demoCytologyQcAssignments(): CytologyQcCaseAssignment[] {
  const createdAt = new Date(Date.now() - 2 * 3_600_000).toISOString();
  const base = { state: 'QC_PENDING' as const, primarySignOutProviderId: 'PATH-SJ-001', slaEscalationCount: 0, createdAt };
  return [
    { ...base, id: 'qc-demo-1', caseId: 'S26-5002-CYT-001', specimenId: 'S26-5002-SP-1', triggerSource: 'rose_discrepancy', priorityTier: 'high_escalation', badges: ['ROSE Discrepancy'], slaDeadline: hoursFromNow(6) },
    { ...base, id: 'qc-demo-2', caseId: 'S26-5001-CYT-001', specimenId: 'S26-5001-SP-1', triggerSource: 'rule_match', matchedRuleId: 'qc-rule-hsil', priorityTier: 'targeted_high_consequence', badges: [], slaDeadline: hoursFromNow(22) },
    { ...base, id: 'qc-demo-3', caseId: 'S26-5007-CYT-001', specimenId: 'S26-5007-SP-1', triggerSource: 'rule_match', matchedRuleId: 'qc-rule-random', priorityTier: 'routine_random', badges: [], slaDeadline: hoursFromNow(46) },
  ] as CytologyQcCaseAssignment[];
}
