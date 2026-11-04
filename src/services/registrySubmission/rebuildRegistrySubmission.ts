// src/services/registrySubmission/rebuildRegistrySubmission.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 421. Rebuild a queued registry submission from today's data, for the
// worklist's resend: a cytology entry through the screening registry's prepare
// step, a cancer entry through the cancer registry's. Nothing is queued here.
// ─────────────────────────────────────────────────────────────────────────────

import type { RegistryRebuild } from './resendRegistrySubmission';
import type { RegistryQueueEntryForWorklist, RegistryQueueName } from './registryExceptions';
import type { PreparedScreeningSubmission } from '../screeningRegistry/submitScreeningRegistryResult';
import type { PreparedCancerSubmission } from '../cancerRegistry/dispatchCancerRegistryReportIfApplicable';
import { registryHoldMessage } from '../screeningRegistry/screeningRegistryEngine';
import { isSyntheticCaseId } from '../registryGoLive/syntheticTestSuite';

export interface RebuildDeps {
  getCase: (caseId: string) => Promise<any | null | undefined>;
  /** The sign-out record the entry was built from, and the review its result came from. */
  getSignOutRecordAndReview: (caseId: string, signOutRecordId: string) => Promise<{ record: any; review: any } | null>;
  getCategories: () => Promise<any[]>;
  prepareScreening: (input: { caseData: any; record: any; review: any; categories: any[]; isGynCytology: boolean }) => Promise<PreparedScreeningSubmission>;
  prepareCancer: (caseData: any, facilityId: string, facilityName: string | undefined) => Promise<PreparedCancerSubmission>;
  /** Batch 424: the send gate (registrySendGate.ts): a resend is held or skipped the same way a first send is. */
  sendGate: (queue: RegistryQueueName, registryId: string, synthetic: boolean) => Promise<{ action: 'send' | 'hold' | 'skip'; message?: string }>;
}

const gated = (gate: { action: 'send' | 'hold' | 'skip'; message?: string }, body: object, contentHash: string): RegistryRebuild =>
  gate.action === 'send' ? { status: 'ready', body, contentHash }
    : gate.action === 'hold' ? { status: 'held', message: gate.message ?? '' }
      : { status: 'notApplicable', reason: gate.message ?? '' };

export async function rebuildRegistrySubmission(queue: RegistryQueueName, entry: RegistryQueueEntryForWorklist, deps: RebuildDeps): Promise<RegistryRebuild> {
  const caseData = await deps.getCase(entry.caseId);
  if (!caseData) return { status: 'notApplicable', reason: 'The case can no longer be found.' };
  const facilityId = caseData.order?.facilityId as string | undefined;
  if (!facilityId) return { status: 'notApplicable', reason: 'The case has no ordering facility.' };

  if (queue === 'cytology') {
    const found = entry.signOutRecordId ? await deps.getSignOutRecordAndReview(entry.caseId, entry.signOutRecordId) : null;
    if (!found) return { status: 'notApplicable', reason: 'The signed-out result this was built from can no longer be found.' };
    // The entry was queued, so the specimen was GYN when it was signed out.
    const p = await deps.prepareScreening({ caseData, record: found.record, review: found.review, categories: await deps.getCategories(), isGynCytology: true });
    if (p.outcome === 'noRegistry') return { status: 'notApplicable', reason: 'The facility no longer reports to a screening registry.' };
    if (p.outcome === 'excludedByConsent') return { status: 'notApplicable', reason: p.consentMessage ?? 'Excluded by consent.' };
    if (p.definition?.id !== entry.registryId) return { status: 'notApplicable', reason: `The facility now reports to ${p.definition?.id}, not ${entry.registryId}.` };
    if (p.outcome === 'notEligible') return { status: 'notApplicable', reason: 'The result is no longer eligible for this registry.' };
    if (p.decision!.holdReasons.length) return { status: 'held', message: registryHoldMessage(p.decision!, p.definition!) };
    return gated(await deps.sendGate('cytology', entry.registryId, isSyntheticCaseId(entry.caseId)), p.body!, p.contentHash!);
  }

  const p = await deps.prepareCancer(caseData, facilityId, caseData.order?.facilityName);
  if (p.outcome === 'noSettings' || p.outcome === 'noRegistry') return { status: 'notApplicable', reason: 'The facility no longer reports to a cancer registry.' };
  if (p.outcome === 'notReportable') return { status: 'notApplicable', reason: 'The case no longer has a reportable finding.' };
  if (p.outcome === 'excludedByConsent') return { status: 'notApplicable', reason: p.consentMessage ?? 'Excluded by consent.' };
  if (p.registryId !== entry.registryId) return { status: 'notApplicable', reason: `The facility now reports to ${p.registryId}, not ${entry.registryId}.` };
  // Batch 425: still missing the registry's mandatory data.
  if (p.outcome === 'missingMandatoryData') return { status: 'held', message: p.holdMessage ?? '' };
  // Batch 620 (part E): the US ePath state profile still finds something to look at.
  if (p.outcome === 'epathReview') return { status: 'held', message: p.holdMessage ?? '' };
  return gated(await deps.sendGate('cancer', entry.registryId, isSyntheticCaseId(entry.caseId)), p.body!, p.contentHash!);
}
