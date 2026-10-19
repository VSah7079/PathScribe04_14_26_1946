// src/services/specimens/simulateSpecimenLisAck.ts
// ─────────────────────────────────────────────────
// Batch 605: after a specimen on an LIS case is saved, its change is written
// back to the LIS (LIS_SYNC through the interface dispatch). The demo has no LIS,
// so the simulated engine answers: acknowledged moves the specimen to Sent,
// rejected (by the Mock Interface Engine mode) to Rejected. The audit entry names
// the case and the outcome only.
// ─────────────────────────────────────────────────
import type { Specimen, SpecimenLisSyncState } from '@/types/case/Specimen';
import { dispatchInterfaceMessage } from '../interfaceDispatch/dispatchInterfaceMessage';
import { isEngineSimulated } from '../mockInterfaceEngine/simulatedEngineReceiver';
import { mockAuditService } from '../auditlog/mockAuditService';

/** The state a specimen moves to once the LIS has answered. Pure. */
export function lisSyncStateAfterAnswer(answered: boolean): Extract<SpecimenLisSyncState, 'sync_sent' | 'sync_rejected'> {
  return answered ? 'sync_sent' : 'sync_rejected';
}

export interface SpecimenWriteBackResult { state: Extract<SpecimenLisSyncState, 'sync_sent' | 'sync_rejected'>; simulated: boolean; error?: string }

/** Sends the specimen change and returns the new sync state; null when the specimen has nothing waiting. Never throws. */
export async function writeBackSpecimenToLis(caseId: string, specimen: Pick<Specimen, 'id' | 'label' | 'lisSyncState'>, actor: string): Promise<SpecimenWriteBackResult | null> {
  if (specimen.lisSyncState !== 'pending_sync') return null;
  const simulated = isEngineSimulated();
  let ok = false; let error: string | undefined;
  try {
    const r = await dispatchInterfaceMessage(`spec-${caseId}-${specimen.id}-${Date.now().toString(36)}`, 'LIS_SYNC',
      { kind: 'specimen-update', caseId, specimenId: specimen.id, specimenLabel: specimen.label });
    ok = r.ok; error = r.error;
  } catch (e) { error = e instanceof Error ? e.message : 'The write-back failed.'; }
  const state = lisSyncStateAfterAnswer(ok);
  await mockAuditService.logEvent({
    type: 'system', event: simulated ? 'Simulated LIS Acknowledgement' : 'LIS Write-back Answered',
    detail: `${simulated ? 'SIMULATED (no LIS): ' : ''}specimen ${specimen.label} write-back ${ok ? 'acknowledged (Sent)' : 'rejected (Rejected)'}.`,
    user: actor, caseId, confidence: null,
  }).catch(() => {});
  return { state, simulated, ...(error ? { error } : {}) };
}
