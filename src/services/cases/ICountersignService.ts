// src/services/cases/ICountersignService.ts
import { ServiceResult } from '../types';
import type { CountersignRecord } from '@/types/case/CountersignRecord';

export interface ICountersignService {
  getAll(): Promise<ServiceResult<CountersignRecord[]>>;
  /** Real, per direct guidance ("Continue" — closing the gap where a
   *  rejection's own real attendingFeedback was captured but never
   *  actually shown to the resident anywhere): matches 'pending' OR
   *  'returned' — both real, active states a caller might genuinely
   *  need this record for. 'countersigned' (terminal, done) is
   *  deliberately excluded — a caller wanting completed-record
   *  history should use getAll()/filter, not this.
   *
   *  Batch 483: returns at most ONE record, so it only suits a case that
   *  genuinely has a single pending release at a time — true for every
   *  current caller (surgical pathology, autopsy), never true for
   *  cytology once more than one of its specimens is independently
   *  pending (CountersignRecord.specimenId). A cytology caller needing
   *  this should filter getAll() by caseId AND specimenId instead. */
  getForCase(caseId: string): Promise<ServiceResult<CountersignRecord | null>>;
  /** Called when a resident's sign-out is intercepted — creates the
   *  pending record and snapshots current answers for later delta
   *  comparison. */
  release(input: {
    caseId: string;
    subspecialtyId?: string;
    residentId: string;
    residentName: string;
    releasedAnswersSnapshot: Record<string, Record<string, string | string[]>>;
    /** Real, per direct follow-up — set only by Autopsy's own PAD/FAD
     *  signing flow (signAutopsyReport.ts). See CountersignRecord's
     *  own doc comment for the full, real reasoning. */
    autopsyReportTier?: 'PAD' | 'FAD';
    /** Batch 483 — set only by cytology's per-specimen sign-out
     *  (signOutCytologyCase.ts). See CountersignRecord.specimenId's own
     *  doc comment: this is what keeps a second specimen's release from
     *  destroying a first, still-pending specimen's record. */
    specimenId?: string;
  }): Promise<ServiceResult<CountersignRecord>>;
  /** Called when the attending actually finalizes a case that was
   *  pending countersign — computes the real delta against the
   *  snapshot and marks the record complete.
   *
   *  Batch 485 (PS-359 tracker follow-up — "Cytology: case-level
   *  countersign", the deeper gap Batch 483 disclosed but didn't
   *  build): `specimenId` is the same scoping release() gained in
   *  Batch 483, for the same reason — a cytology case can have more
   *  than one specimen independently pending countersign at once.
   *  Optional, defaulting to undefined: surgical pathology and
   *  autopsy never set it (their own CountersignRecord never carries
   *  a specimenId either), so matching on it is a no-op for them. */
  countersign(input: {
    caseId: string;
    attendingId: string;
    attendingName: string;
    currentAnswersByInstance: Record<string, Record<string, string | string[]>>;
    attendingFeedback?: string;
    specimenId?: string;
  }): Promise<ServiceResult<CountersignRecord>>;
  /** Real, per direct guidance ("Yes we should scope 'Return to
   *  Trainee'/'Reject with Notes'"): called when the attending
   *  declines to countersign as-is and sends the case back for
   *  revision instead. attendingFeedback is required here (unlike
   *  countersign's own optional feedback) — a rejection with no
   *  explanation gives the resident nothing to act on.
   *
   *  Batch 485: `specimenId`, same scoping as countersign() above. */
  reject(input: {
    caseId: string;
    attendingId: string;
    attendingName: string;
    attendingFeedback: string;
    specimenId?: string;
  }): Promise<ServiceResult<CountersignRecord>>;
  /** Batch 485: the pending (or returned) record for ONE specimen on a
   *  cytology case, where getForCase's own single-record contract
   *  doesn't suit a case with more than one independently-pending
   *  specimen. Surgical pathology and autopsy have no reason to call
   *  this — getForCase already suits them. */
  getForSpecimen(caseId: string, specimenId: string): Promise<ServiceResult<CountersignRecord | null>>;
}
