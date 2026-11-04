// src/services/surgicalSignOut/completeAssistFinalize.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 649 follow-up: Assist-mode Finalize used to record its signature inside
// finalizeCase, before the report version existed, so the signature carried no
// version id, number or PDF SHA-256 (Orchestration sign-out and the resident's
// release already link theirs; see completeSurgicalSignOut.ts).
//
// Now the order is: finalize (status saved, signature held, not recorded), the
// release of a waiting amendment or addendum and the Assist report version, and
// only then the signature record, linked to that version. When no version was
// written (nothing to version, the release was refused, or the version write
// failed) the signature is still recorded, without a link: the case was
// finalized and the signer's confirmation must not be lost. Dependencies are
// passed in. Used by the four gate-resume paths and both Finalize entry points.
// ─────────────────────────────────────────────────────────────────────────────

import type { ReportVersionRecord } from '@/types/reports/ReportVersionRecord';
import type { SignatureRecord, SignatureRecordLink } from '../signatures/ISignatureRecordService';
import { reportVersionLink } from './completeSurgicalSignOut';

export interface CompleteAssistFinalizeDeps {
  /** Saves the finalized status; true when the case was finalized. Does not record the signature. */
  finalize: () => Promise<boolean>;
  /** Releases a waiting amendment/addendum and writes the Assist version, reporting the version through `onVersion`. */
  release: (onVersion: (version: ReportVersionRecord) => void) => Promise<unknown>;
  commitSignature: (link?: SignatureRecordLink) => Promise<SignatureRecord | null>;
}

/** Returns whether the case was finalized (the signature is recorded in that case). */
export async function completeAssistFinalize(deps: CompleteAssistFinalizeDeps): Promise<boolean> {
  if (!(await deps.finalize())) return false;
  let version: ReportVersionRecord | null = null;
  try {
    await deps.release(v => { version = v; });
  } catch (e) {
    console.error('[completeAssistFinalize] The release or version step failed after finalizing; the signature is recorded without a version link:', e);
  }
  const signature = await deps.commitSignature(version ? reportVersionLink(version) : undefined);
  if (!signature) console.error('[completeAssistFinalize] Finalized, but no signature record was saved');
  return true;
}
