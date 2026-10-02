// src/hooks/useSurgicalQaReview.ts
// Batch 396: loads the Surgical Post-Sign-Out QA items and records or
// dismisses them, for the queue (every case) and for one case's report page
// (caseId given). The decisions are in services/quality/surgicalQaReview.ts.

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@contexts/AuthContext';
import { caseRouter } from '@/services/cases/CaseRouter';
import { authorizationService, qaActivityRecordService, qaActivityTypeService } from '@/services';
import {
  activityTypeForSurgicalQaRow,
  buildSurgicalQaRows,
  dismissSurgicalCorrelationCandidate,
  recordSurgicalQaReview,
  type SurgicalQaActionResult,
  type SurgicalQaCorrelationRow,
  type SurgicalQaReviewDeps,
  type SurgicalQaRow,
} from '@/services/quality/surgicalQaReview';
import type { QaActivityType } from '@/types/quality/QaActivityType';
import type { QaReviewCaptureSubmission } from '@/components/QualityAssurance/QaReviewCaptureForm';

const DEPS: SurgicalQaReviewDeps = {
  enforce: (cap, ctx) => authorizationService.enforce(cap as any, ctx as any),
  createRecord: rec => qaActivityRecordService.create(rec),
  getCase: id => caseRouter.getCase(id),
  updateCase: (id, updates) => caseRouter.updateCase(id, updates),
};

export type SurgicalQaMessage = 'notPermitted' | 'failed' | null;

export function useSurgicalQaReview(caseId?: string) {
  const { user } = useAuth();
  const [rows, setRows] = useState<SurgicalQaRow[]>([]);
  const [activityTypes, setActivityTypes] = useState<QaActivityType[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<SurgicalQaMessage>(null);

  const refresh = useCallback(async () => {
    const [cases, typesRes] = await Promise.all([
      caseId
        ? caseRouter.getCase(caseId).then(c => (c ? [c] : []))
        : caseRouter.getAll().then(r => (r.ok ? r.data : [])),
      qaActivityTypeService.getAll(),
    ]);
    if (typesRes.ok) setActivityTypes(typesRes.data);
    setRows(buildSurgicalQaRows(cases));
  }, [caseId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const activityTypeFor = useCallback((row: SurgicalQaRow) => activityTypeForSurgicalQaRow(row, activityTypes), [activityTypes]);

  const settle = async (result: SurgicalQaActionResult): Promise<boolean> => {
    if (result.ok) { setMessage(null); await refresh(); return true; }
    setMessage(result.notPermitted ? 'notPermitted' : 'failed');
    return false;
  };

  const record = useCallback(async (row: SurgicalQaRow, submission: QaReviewCaptureSubmission): Promise<boolean> => {
    const activityType = activityTypeFor(row);
    if (!user || !activityType) return false;
    setBusy(true);
    try {
      return await settle(await recordSurgicalQaReview(row, activityType, submission, { userId: user.id, userName: user.name }, DEPS));
    } finally {
      setBusy(false);
    }
  }, [user, activityTypeFor]); // eslint-disable-line react-hooks/exhaustive-deps

  const dismiss = useCallback(async (row: SurgicalQaCorrelationRow): Promise<boolean> => {
    setBusy(true);
    try {
      return await settle(await dismissSurgicalCorrelationCandidate(row, DEPS));
    } finally {
      setBusy(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { rows, busy, message, activityTypeFor, record, dismiss, refresh };
}
