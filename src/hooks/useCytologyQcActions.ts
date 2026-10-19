// src/hooks/useCytologyQcActions.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 396: taking a cytology QC review and recording its verdict, for the
// queue and for the review bar on the case's screening page (Pete: record it
// where you review it). The service checks cytology:qc-review:record; a
// refusal or failure comes back as a message key to show. Batch 432: and
// escalating an SLA breach, and the supervisor bypass.
// ─────────────────────────────────────────────────────────────────────────────

import { useCapabilities } from '@/hooks/useCapabilities';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@contexts/AuthContext';
import { cytologyQcCaseAssignmentService, userService } from '@/services';
import { effectiveQcReviewerRoles } from '@/services/cytologyQc/resolveQcReviewerEligibility';
import { cytologyQcErrorKey, resolveCytologyQcCaseReview, type CytologyQcCaseReview } from '@/services/cytologyQc/resolveCytologyQcCaseReview';
import type { CytologyQcCaseAssignment } from '@/types/cytologyQc/CytologyQcRule';
import type { CytologyQcDiscrepancyInput } from '@/components/CytologyQc/CytologyQcDiscrepancyModal';

export type CytologyQcMessage = 'notPermitted' | 'selfReview' | 'notInPool' | 'failed' | null;

/** Batch 608: the reviewer pools the signed-in person belongs to (Config > Staff). */
export function useMyQcReviewerRoles(userId: string | null | undefined): string[] {
  const [roles, setRoles] = useState<string[]>([]);
  useEffect(() => {
    let live = true;
    if (!userId) { setRoles([]); return; }
    void userService.getById(userId).then(r => { if (live) setRoles(r.ok ? effectiveQcReviewerRoles(r.data) : []); });
    return () => { live = false; };
  }, [userId]);
  return roles;
}

export function useCytologyQcActions(onChanged: () => void | Promise<void>) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<CytologyQcMessage>(null);

  const run = useCallback(async (action: () => Promise<{ ok: boolean; error?: string }>): Promise<boolean> => {
    setBusy(true);
    try {
      const result = await action();
      setMessage(result.ok ? null : cytologyQcErrorKey(result.error));
      await onChanged();
      return result.ok;
    } finally {
      setBusy(false);
    }
  }, [onChanged]);

  const assignToMe = useCallback((id: string) => (user ? run(() => cytologyQcCaseAssignmentService.assignReviewer(id, user.id) as any) : Promise.resolve(false)), [run, user]);
  const recordConcurrence = useCallback((id: string) => run(() => cytologyQcCaseAssignmentService.recordConcurrence(id) as any), [run]);
  const recordDiscrepancy = useCallback((id: string, input: CytologyQcDiscrepancyInput) => run(() => cytologyQcCaseAssignmentService.recordDiscrepancy(id, input) as any), [run]);
  // Batch 432: escalate an SLA-breached review back to the queue
  // (cytology:qc-review:record), and the supervisor bypass
  // (cytology:qc-review:bypass). Both need a reason; the service checks.
  const escalate = useCallback((id: string, reason: string) => run(() => cytologyQcCaseAssignmentService.escalateForSlaBreach(id, new Date().toISOString(), reason) as any), [run]);
  const bypass = useCallback((id: string, justification: string) => (user ? run(() => cytologyQcCaseAssignmentService.supervisorBypass(id, user.id, justification) as any) : Promise.resolve(false)), [run, user]);

  return { userId: user?.id ?? null, busy, message, assignToMe, recordConcurrence, recordDiscrepancy, escalate, bypass };
}

/** One case's QC review, for the review bar on its screening page. */
export function useCytologyQcCaseReview(caseId: string | undefined) {
  const [assignments, setAssignments] = useState<CytologyQcCaseAssignment[]>([]);
  const refresh = useCallback(async () => {
    if (!caseId) { setAssignments([]); return; }
    const r = await cytologyQcCaseAssignmentService.getByCaseId(caseId);
    setAssignments(r.ok ? r.data : []);
  }, [caseId]);
  useEffect(() => { void refresh(); }, [refresh]);

  const actions = useCytologyQcActions(refresh);
  // Batch 434: the buttons follow cytology:qc-review:record.
  const { has } = useCapabilities();
  const myPools = useMyQcReviewerRoles(actions.userId);
  const review: CytologyQcCaseReview = resolveCytologyQcCaseReview(assignments, actions.userId, has('cytology:qc-review:record'), myPools);
  return { review, ...actions };
}
