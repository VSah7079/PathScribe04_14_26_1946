// src/services/followUp/IFollowUpService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-483, Pete's decision Oct 18: command-based). Follow-up tracking
// as COMMANDS: the browser says what the user did ("mark this case", "record
// this outcome", "reopen", "send this email"); the SERVER works out the window,
// the status today, who did it and when. The browser never sends a whole
// record, a status, a window or a user id to the server.
//
// The demo (mockFollowUpService) keeps the same commands and computes status
// locally from the browser store. Contract: docs/architecture/FOLLOW_UP_API.md.
// ─────────────────────────────────────────────────────────────────────────────
import type { FollowUpActionResult, FollowUpUser } from './followUpActions';
import type { EffectiveFollowUpSettings } from './followUpSettings';
import type { FollowUpDisposition, FollowUpExpectation, FollowUpItem, FollowUpRecord } from './followUpTypes';

export interface LoadedFollowUps {
  items: FollowUpItem[];
  /** The settings that apply to each item's facility ('' = none). */
  settingsFor: (facilityId: string | undefined) => EffectiveFollowUpSettings;
}

/** What a command needs to name a follow-up. The server needs only the key; the demo also uses the rest for its permission check and audit row. */
export type FollowUpRef = Pick<FollowUpItem, 'key' | 'caseId' | 'accession' | 'facilityId'>;

export interface IFollowUpService {
  /** Every follow-up with its status today. `allCases` is for the demo's alert sweep only; the server always limits the list to cases the caller can open. */
  loadItems(opts?: { allCases?: boolean; now?: Date }): Promise<LoadedFollowUps>;
  /** The "follow-up expected" mark on a case, or null. */
  getExpectation(caseId: string): Promise<FollowUpExpectation | null>;
  /** Command: mark the case "follow-up expected". The window is the facility's biopsy-to-resection rule, worked out by the server. */
  markExpected(caseId: string, opts: { afterSignOut?: boolean }, actor: FollowUpUser): Promise<FollowUpActionResult<FollowUpExpectation>>;
  /** Command: record what happened, which closes the follow-up. */
  recordDisposition(ref: FollowUpRef, value: FollowUpDisposition, note: string | undefined, actor: FollowUpUser): Promise<FollowUpActionResult<FollowUpRecord>>;
  /** Command: remove the outcome, so the follow-up is tracked again. */
  reopen(ref: FollowUpRef, actor: FollowUpUser): Promise<FollowUpActionResult<FollowUpRecord>>;
  /** Command: send the reviewed email to the ordering clinician. */
  emailClinician(ref: FollowUpRef, draft: { to: string; subject: string; body: string }, actor: FollowUpUser): Promise<FollowUpActionResult<FollowUpRecord>>;
}
