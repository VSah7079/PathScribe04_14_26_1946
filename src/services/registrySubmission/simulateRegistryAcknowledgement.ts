// src/services/registrySubmission/simulateRegistryAcknowledgement.ts
// ─────────────────────────────────────────────────
// Batch 605: the demo has no registry and no engine to carry its answer back.
// This plays the part: for a submission already sent, it builds the engine's
// normalised answer JSON (accepted, accepted with warnings, rejected, or no
// answer at all) and feeds it to recordRegistryAcknowledgement, the same function
// the real inbound endpoint will call. The audit entry that function writes holds
// the submission id and outcome; this one adds that it was simulated.
// ─────────────────────────────────────────────────
import { recordRegistryAcknowledgement, type RecordAckOutcome, type RegistryAckDeps, type RegistryQueueName } from './recordRegistryAcknowledgement';

export type SimulatedRegistryAnswer = 'accepted' | 'warnings' | 'rejectedRecoverable' | 'rejectedFatal' | 'silent';
export const SIMULATED_REGISTRY_ANSWERS: readonly SimulatedRegistryAnswer[] = ['accepted', 'warnings', 'rejectedRecoverable', 'rejectedFatal', 'silent'];

export interface SimulatableSubmission { queue: RegistryQueueName; entryId: string; caseId: string; registryId: string; submissionGuid: string; registryStatus?: string }

/** The answer body the engine would post. Pure. */
export function buildSimulatedAnswerBody(submissionGuid: string, answer: Exclude<SimulatedRegistryAnswer, 'silent'>): string {
  const base = { submissionGuid, responseCode: answer === 'accepted' || answer === 'warnings' ? 'AA' : 'AE' };
  const status = answer === 'accepted' ? 'ACCEPTED' : answer === 'warnings' ? 'ACCEPTED_WITH_WARNINGS' : answer === 'rejectedRecoverable' ? 'REJECTED_RECOVERABLE' : 'REJECTED_FATAL';
  const findings = answer === 'accepted' ? []
    : answer === 'warnings' ? [{ severity: 'WARNING', code: 'SIM-W01', message: 'Simulated warning: a recommended field was empty.' }]
    : answer === 'rejectedRecoverable' ? [{ severity: 'CRITICAL_REJECT', code: 'SIM-R01', message: 'Simulated rejection: a required field was missing. Correct it and resend.', tier: 2 }]
    : [{ severity: 'FATAL', code: 'SIM-F01', message: 'Simulated fatal rejection: the registry cannot accept this submission.', tier: 1 }];
  return JSON.stringify({ ...base, status, findings });
}

/** Submissions that have been sent and carry a submission id. */
export async function listSimulatableSubmissions(deps: RegistryAckDeps): Promise<SimulatableSubmission[]> {
  const out: SimulatableSubmission[] = [];
  for (const queue of ['cytology', 'cancer'] as RegistryQueueName[]) {
    const all = await deps.queues[queue].getAll();
    if (!all.ok) continue;
    for (const e of all.data) {
      if (e.submission?.submissionGuid) out.push({ queue, entryId: e.id, caseId: e.caseId, registryId: e.registryId, submissionGuid: e.submission.submissionGuid, registryStatus: (e as { registryStatus?: string }).registryStatus });
    }
  }
  return out;
}

export interface SimulatedAckResult { answer: SimulatedRegistryAnswer; outcome: RecordAckOutcome['outcome'] | 'silent'; registryStatus?: string }

/** 'silent' records nothing: the submission stays awaiting an answer (and goes overdue after 72 hours). */
export async function simulateRegistryAcknowledgement(submissionGuid: string, answer: SimulatedRegistryAnswer, deps: RegistryAckDeps, actor = 'system'): Promise<SimulatedAckResult> {
  if (answer === 'silent') {
    deps.logAudit({ type: 'system', event: 'Simulated Registry Silence', detail: `SIMULATED (no registry): no answer given for submission ${submissionGuid}.`, user: actor, caseId: null, confidence: null });
    return { answer, outcome: 'silent' };
  }
  const r = await recordRegistryAcknowledgement({ format: 'statusJson', body: buildSimulatedAnswerBody(submissionGuid, answer), submissionGuid }, deps);
  deps.logAudit({ type: 'system', event: 'Simulated Registry Answer', detail: `SIMULATED (no registry): ${answer} answer applied to submission ${submissionGuid}: ${r.outcome}.`, user: actor, caseId: null, confidence: null });
  return { answer, outcome: r.outcome, registryStatus: r.registryStatus };
}
