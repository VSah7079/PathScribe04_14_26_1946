// src/services/intraop/IIntraoperativeService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real interface for the Intraop Pre-Check queue's desktop-side service —
// same interface+implementation split every other service in this app
// follows (IFlagService/mockFlagService, IContainerTypeService/
// mockContainerTypeService, etc.).
//
// Session/specimen split: createSession makes the shell (patient/OR/
// surgeon, no specimens yet), addSpecimen adds one, and both
// addMilestone and setFrozenSectionDiagnosis operate on a specific
// specimen within a session — not the session as a whole, since
// different specimens in the same session can be at genuinely different
// points in their own workflow.
// ─────────────────────────────────────────────────────────────────────────────
import { ServiceResult } from '../types';
import type { IntraoperativeEntry, MatchCandidate, MilestoneType, SkipReason, EntryMatch, FrozenCategory } from '@/types/intraop/IntraoperativeEntry';

export interface IIntraoperativeService {
  /** Simulated ADT feed lookup by MRN — real, deterministic result for
   *  a known MRN (e.g. '12345' for demo purposes), null when there's no
   *  match, same as a real hospital registry returning nothing found. */
  lookupAdtRecord(mrn: string): Promise<ServiceResult<{ patientName: string; dateOfBirth: string } | null>>;

  getAll(): Promise<ServiceResult<IntraoperativeEntry[]>>;
  getPending(): Promise<ServiceResult<IntraoperativeEntry[]>>;

  createSession(input: {
    patientMatch: { source: 'barcode' | 'adt_match'; patientName: string; mrn: string; dateOfBirth?: string };
    performedBy: { userId: string; userName: string };
    orNumber: string;
    surgeon: string;
  }): Promise<ServiceResult<IntraoperativeEntry>>;

  addSpecimen(sessionId: string, specimenLabel: string): Promise<ServiceResult<IntraoperativeEntry>>;

  /** Inverse direction — called by AccessionPage right after a formal
   *  accession succeeds, to check for any pending intraop session that
   *  might belong to the case that was just created. */
  findMatchesForNewCase(caseInfo: { patientName: string; mrn: string; surgeon: string; accessionedAt: string }): Promise<ServiceResult<EntryMatch[]>>;

  getMatchCandidates(entryId: string): Promise<ServiceResult<MatchCandidate[]>>;

  addMilestone(
    sessionId: string,
    specimenId: string,
    milestone: MilestoneType,
    skipReason?: SkipReason,
    skipReasonNote?: string,
    /** Required content when milestone is 'gross_logged' — enforced as
     *  a real, hard requirement in the implementation, not optional. */
    quickGrossText?: string
  ): Promise<ServiceResult<IntraoperativeEntry>>;

  setFrozenSectionDiagnosis(sessionId: string, specimenId: string, diagnosis: string, category?: FrozenCategory): Promise<ServiceResult<IntraoperativeEntry>>;

  merge(entryId: string, caseId: string): Promise<ServiceResult<IntraoperativeEntry>>;
}
