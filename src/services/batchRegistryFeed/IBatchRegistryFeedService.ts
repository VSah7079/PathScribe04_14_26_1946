// src/services/batchRegistryFeed/IBatchRegistryFeedService.ts
// Batch 620 part S (PS-800): the batch file feed for registries and screening programmes that take a file.
// Contract: docs/architecture/BATCH_REGISTRY_FEED_API.md
import type { ID, ServiceResult } from '../types';
import type { BatchProfileInput, BatchProgramProfile, BatchRunManifest, FileAcknowledgement, ProfileProblem } from './batchRegistryFeed';

/** What the next file would hold, without making it. Counts only. */
export interface RunPreview {
  /** Entries waiting for this program's file. */
  waiting: number;
  /** Of those, how many the registry's schedule lets go in a run made now. */
  dueNow: number;
  /** Of those due, how many a required field is missing from (they are held back, not sent). */
  wouldBeHeldBack: number;
  /** Past the registry's reporting deadline (the schedule's reportingDeadlineDays, counted from sign-out). */
  overdue: number;
  /** When the next run is due under the schedule, when there is one. */
  nextDueAt: string | null;
  /** False when the registry's schedule is not a batch schedule: the run then follows what that schedule allows. */
  scheduleIsBatch: boolean;
}

export type BatchFeedError =
  | 'NOT_PERMITTED' | 'NOT_FOUND' | 'PROFILE_PROTECTED' | 'PROFILE_DISABLED' | 'FORMAT_NOT_AVAILABLE' | 'PROFILE_INVALID' | 'NO_RECORDS'
  | 'CHECKSUM_MISMATCH' | 'ALREADY_ANSWERED' | `PROFILE_REFUSED:${string}`;

export interface IBatchRegistryFeedService {
  /** Every program profile (the shipped example and the NAACCR XML placeholder included). */
  getProfiles(): Promise<ServiceResult<BatchProgramProfile[]>>;
  /** Create a profile, or replace the one named by `id`. Refused with `PROFILE_REFUSED:<problem>` (a ProfileProblem) when it is not valid. Needs config:batch-registry-feed:manage. */
  saveProfile(input: BatchProfileInput): Promise<ServiceResult<BatchProgramProfile>>;
  /** Remove a profile. The two shipped ones stay (PROFILE_PROTECTED); turn them off instead. Needs config:batch-registry-feed:manage. */
  removeProfile(id: ID): Promise<ServiceResult<void>>;
  /** Whether a screening registry's submissions wait for a file: an enabled profile is keyed to it. The sign-out asks this to queue instead of send. */
  isBatchProgram(screeningRegistryId: string): Promise<ServiceResult<boolean>>;
  /** Every run, newest first; one program's when `profileId` is given. No file contents. */
  getRuns(profileId?: ID): Promise<ServiceResult<BatchRunManifest[]>>;
  preview(profileId: ID): Promise<ServiceResult<RunPreview>>;
  /**
   * Make the file for a program now. By default only what the registry's schedule allows goes in; `manual` takes everything waiting
   * (a person asked for it ahead of the schedule). Records missing a required field are held back and named by field. The entries in the
   * file are marked sent and wait for the registry's answer. The file is returned to the caller for the interface engine and is not kept.
   * Needs registry:batch-file:generate (high risk, audited).
   */
  buildRun(profileId: ID, options?: { manual?: boolean }): Promise<ServiceResult<{ run: BatchRunManifest; content: string }>>;
  /**
   * The registry's answer to a file, as the interface engine reports it (system to system, like every acknowledgement). It becomes one answer per record
   * through the existing acknowledgement path, so a refused record shows as rejected on the Outbound Queue screen and can be resubmitted into a later file.
   */
  recordFileAcknowledgement(runId: ID, ack: FileAcknowledgement): Promise<ServiceResult<BatchRunManifest>>;
}

export type { ProfileProblem };
