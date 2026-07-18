// src/services/reports/IAmendmentService.ts
import { ServiceResult } from '../types';
import type { AmendmentRecord, AmendmentType, ClinicalNotification } from '@/types/reports/AmendmentRecord';

export interface IAmendmentService {
  getByCaseId(caseId: string): Promise<ServiceResult<AmendmentRecord[]>>;

  /** Every open (status: 'draft') amendment or addendum a pathologist
   *  currently has in progress, across all their cases — this is what
   *  the worklist triage tile queries to keep an active draft "firmly
   *  rooted" in that view until it's actually re-finalized/released,
   *  per the exit-gate rule: an open draft can't be cleared by review,
   *  only committed. */
  getOpenDraftsForPathologist(pathologistId: string): Promise<ServiceResult<AmendmentRecord[]>>;

  /** Opens a draft — captures initiatedAt immediately, matching the
   *  spec's explicit "date/time the workspace was opened" requirement,
   *  distinct from whenever it eventually gets released. */
  startDraft(input: {
    caseId: string;
    type: AmendmentType;
    authoringPathologist: { userId: string; userName: string };
    triggeredByLisNotice?: boolean;
  }): Promise<ServiceResult<AmendmentRecord>>;

  /** Stage 1 of the amendment pipeline — fires when "Amend" is clicked,
   *  before any editing happens. The real hard gate lives here: rejects
   *  without both an explanation and the Clinical Notification Log.
   *  Record stays 'draft' — nothing transmitted yet, purely internal
   *  tracking while the template is unlocked for editing. Amendment-only;
   *  addenda release in a single step via release() below. */
  captureFields(id: string, fields: {
    explanationOfChange: string;
    notification: ClinicalNotification;
    /** The real "immutable archive" snapshot — must be captured here,
     *  at Stage 1, before the template unlocks for editing. There's no
     *  reliable way to recover it later. */
    originalReportSnapshot: unknown;
  }): Promise<ServiceResult<AmendmentRecord>>;

  /** Stage 2 — fires at actual re-sign-out (amendment) or immediately
   *  (addendum, single-stage). Marks the record 'released', which is
   *  the moment a real external transmission would happen. If
   *  captureFields already ran, this only needs the final body; if it
   *  didn't (the addendum path, or a direct amendment call bypassing
   *  Stage 1), the same hard gate is checked here so it can't be skipped. */
  release(id: string, fields: {
    addendumTitle?: string;
    explanationOfChange?: string;
    notification?: ClinicalNotification;
    body: string;
  }): Promise<ServiceResult<AmendmentRecord>>;
}
