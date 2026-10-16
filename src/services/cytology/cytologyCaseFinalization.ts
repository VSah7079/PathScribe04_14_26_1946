// src/services/cytology/cytologyCaseFinalization.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 411 (PS-359; Pete: multi-site FNAs and concurrent Non-GYN and FNA
// specimens under one accession are common). A cytology case is signed out
// specimen by specimen:
//
//   • each cytology or FNA specimen is signed out on its own (its own final
//     diagnosis, record and report);
//   • the case becomes Final only when every one of them is signed out
//     (resolveCytologyCaseFinalization, used by signOutCytologyCase);
//   • or earlier, by someone holding cytology:case:finalize, with a reason:
//     finalizeCytologyCaseEarly, audited, naming the specimens left unsigned.
//     They can still be signed out afterwards.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import type { CytologyWorkspaceDeps } from './cytologyWorkspacePorts';
import { saveCaseChangeFrom } from './cytologyCaseWriteDeps';

/** Which of the case's cytology specimens are still to be signed out, and whether none are. */
export function resolveCytologyCaseFinalization(cytologySpecimenIds: string[], signedOutSpecimenIds: Iterable<string>) {
  const signed = new Set(signedOutSpecimenIds);
  const remaining = cytologySpecimenIds.filter(id => !signed.has(id));
  return { allSignedOut: cytologySpecimenIds.length > 0 && remaining.length === 0, remaining };
}

/** Stored on the case when it was finalized before every cytology specimen was signed out. */
export interface CytologyEarlyFinalization {
  finalizedBy: string;
  finalizedByName: string;
  finalizedAt: string;
  reason: string;
  unsignedSpecimenIds: string[];
}

export async function finalizeCytologyCaseEarly(
  input: { caseData: Case; cytologySpecimenIds: string[]; signedOutSpecimenIds: string[]; reason: string; user: { id: string; name: string } },
  deps: Pick<CytologyWorkspaceDeps, 'enforce' | 'getCase' | 'updateCase' | 'logAudit' | 'now'>
    /** Batch 532: release the consolidated case report (releaseFinalizedCytologyCase). */
    & { releaseCase?: (caseId: string, previousStatus?: string) => Promise<void> },
): Promise<'notPermitted' | 'reasonRequired' | 'nothingSignedOut' | 'alreadyComplete' | 'finalized'> {
  const decision = await deps.enforce('cytology:case:finalize', { caseId: input.caseData.id });
  if (!decision.allowed) return 'notPermitted';
  const reason = input.reason.trim();
  if (!reason) return 'reasonRequired';
  const { allSignedOut, remaining } = resolveCytologyCaseFinalization(input.cytologySpecimenIds, input.signedOutSpecimenIds);
  if (allSignedOut) return 'alreadyComplete';
  // Nothing has been reported yet: there is nothing to finalize.
  if (remaining.length === input.cytologySpecimenIds.length) return 'nothingSignedOut';

  const early: CytologyEarlyFinalization = {
    finalizedBy: input.user.id, finalizedByName: input.user.name, finalizedAt: deps.now().toISOString(), reason, unsignedSpecimenIds: remaining,
  };
  // PS-71 (Batch 458): saved with the version the screen loaded; if someone
  // saved since, re-applied to the newer case (a lasting conflict throws).
  await saveCaseChangeFrom(input.caseData, () => ({ status: 'finalized', cytologyEarlyFinalization: early } as Partial<Case>),
    { getCase: id => deps.getCase(id, 'current'), updateCase: deps.updateCase });
  deps.logAudit({
    type: 'user', event: 'Cytology case finalized before all specimens signed out',
    detail: `Unsigned specimens: ${remaining.join(', ')}. Reason: ${reason}`,
    user: input.user.name || input.user.id, caseId: input.caseData.accession?.fullAccession ?? input.caseData.id, confidence: null,
  });
  // Batch 532 (Pete, Oct 12): the case report is released now, listing the unsigned specimens as not reported.
  await deps.releaseCase?.(input.caseData.id, input.caseData.status).catch(() => {});
  return 'finalized';
}
