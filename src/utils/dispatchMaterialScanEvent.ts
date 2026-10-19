// src/utils/dispatchMaterialScanEvent.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, honest stand-in for actually transmitting a real
// MaterialScanEventPayload to an external LIS/middleware engine — same
// discipline as dispatchCassetteLabel.ts/dispatchSlideLabel.ts: no real
// transport (HTTP endpoint, MLLP socket) exists anywhere in this app
// yet, and fabricating one here would repeat the exact "guess at an
// integration that was never verified" mistake this whole area is
// built to avoid (see cerebroAdapter.ts/vantageAdapter.ts's own
// header comments). Records the real intent — inspectable, testable —
// rather than silently doing nothing or pretending to have sent
// something that didn't go anywhere.
//
// Real trigger wiring (useMaterialScanTracking.ts) can be built and
// tested now; only this one function's real body needs to change once
// a real transport target exists.
// ─────────────────────────────────────────────────────────────────────────────

import { recordSimulatedPrint, simulationAllowed } from '@/services/printing/simulatedPrint';
import { dispatchInterfaceMessage } from '@/services/interfaceDispatch/dispatchInterfaceMessage';
import type { MaterialScanEventPayload } from '@/types/events/MaterialScanEventPayload';

export interface MaterialScanDispatchResult {
  dispatched: boolean;
  /** Always 'stub' until a real transport target exists. */
  method: 'stub';
}

const DISPATCHED_LOG: MaterialScanEventPayload[] = [];

/**
 * Never throws — a real dispatch failure here must never block the
 * tech's own work at the bench, same fire-and-forget posture as
 * every other real dispatch in this app.
 */
export async function dispatchMaterialScanEvent(payload: MaterialScanEventPayload): Promise<MaterialScanDispatchResult> {
  DISPATCHED_LOG.push(payload);
  console.info(
    `[PathScribe] Material scan event dispatch — STUB, no real transport wired yet. ` +
    `Would send: ${payload.rawScanValue} scanned at "${payload.stationName}".`,
  );
  // Batch 606: labelled Simulated send with a visible result and an audit entry (station name only, no patient data).
  if (simulationAllowed()) recordSimulatedPrint({ kind: 'scan-event', transport: 'middleware', destination: payload.stationName });
  // Batch 605: the scan event also goes through the interface dispatch (the simulated engine answers in the demo,
  // and the message shows in the Outbound Dispatch Trail). A failure here never blocks the bench.
  try { await dispatchInterfaceMessage(payload.messageId, 'MATERIAL_SCAN_EVENT', payload); } catch { /* never blocks the bench */ }
  return { dispatched: true, method: 'stub' };
}

/** Real, dedicated inspection method — for tests, and so a real UI
 *  could eventually show "what would have been sent" while no real
 *  transport exists. */
export function getDispatchedMaterialScanEvents(): readonly MaterialScanEventPayload[] {
  return DISPATCHED_LOG;
}

/** Test-only reset — same pattern as dispatchCassetteLabel.ts's own
 *  identical helper. */
export function _resetDispatchedMaterialScanEventsForTests(): void {
  DISPATCHED_LOG.length = 0;
}
