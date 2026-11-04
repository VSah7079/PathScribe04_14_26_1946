// src/services/cases/returnCaseToTrainee.ts
// Batch 608 (#32, #84): the attending's Return to Trainee on a case released for
// countersign, for the paths that have no sign-out panel of their own: a
// cytology specimen (`specimenId` given) and an autopsy report (none).
// Feedback is required. The countersign record is marked returned (the
// service's own reject), the case goes back to status 'returned' and the
// trainee becomes the primary assignee again, as on the surgical path
// (useSignOutWorkflow.handleReturnToTrainee).

import type { Case } from '@/types/case/Case';
import type { CaseStatus } from '@/types/case/CaseStatus';
import type { CountersignRecord } from '@/types/case/CountersignRecord';
import type { ICountersignService } from './ICountersignService';
import { syncPrimaryAssignee } from './caseAssignmentSync';
import { updateCaseWithRetry, type CaseWriteDeps } from './caseWrite';

export interface ReturnCaseToTraineeDeps {
  countersign: Pick<ICountersignService, 'reject' | 'getForSpecimen' | 'getForCase'>;
  write: CaseWriteDeps;
}

export type ReturnCaseToTraineeResult =
  | { outcome: 'returned'; record: CountersignRecord }
  | { outcome: 'feedbackRequired' | 'notPending' | 'ownRelease' | 'failed'; error?: string };

export async function returnCaseToTrainee(
  input: { caseId: string; specimenId?: string; attending: { id: string; name: string }; feedback: string },
  deps: ReturnCaseToTraineeDeps,
): Promise<ReturnCaseToTraineeResult> {
  const feedback = input.feedback.trim();
  if (!feedback) return { outcome: 'feedbackRequired' };

  const pending = input.specimenId
    ? await deps.countersign.getForSpecimen(input.caseId, input.specimenId)
    : await deps.countersign.getForCase(input.caseId);
  const rec = pending.ok ? pending.data : null;
  if (!rec || rec.status !== 'pending') return { outcome: 'notPending' };
  if (rec.residentId === input.attending.id) return { outcome: 'ownRelease' };

  const rejected = await deps.countersign.reject({
    caseId: input.caseId, specimenId: input.specimenId,
    attendingId: input.attending.id, attendingName: input.attending.name, attendingFeedback: feedback,
  });
  if (!rejected.ok) return { outcome: 'failed', error: (rejected as { ok: false; error: string }).error };

  const written = await updateCaseWithRetry(input.caseId, (current: Case) => ({
    ...syncPrimaryAssignee(current, rec.residentId, input.attending.id, rec.residentName),
    status: 'returned' as CaseStatus,
    returnedBy: input.attending.id,
  }), deps.write);
  if (written.ok === false) return { outcome: 'failed', error: written.reason };
  return { outcome: 'returned', record: rejected.data };
}
