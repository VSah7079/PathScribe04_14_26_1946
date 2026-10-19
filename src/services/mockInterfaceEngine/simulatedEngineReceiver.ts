// src/services/mockInterfaceEngine/simulatedEngineReceiver.ts
// ─────────────────────────────────────────────────
// Batch 605: the demo stand-in for the interface engine's receiving end. With
// no engine address configured, every outbound message (dispatchInterfaceMessage)
// is handed to this instead of the network. It answers in the mode chosen on the
// Mock Interface Engine page (succeed, reject, time out), keeps what it received
// in a list labelled Simulated, and writes a PHI-free audit entry. Nothing
// leaves the browser. With an engine address configured, this is not used.
// ─────────────────────────────────────────────────
import { storageGet, storageSet } from '../mockStorage';
import { mockAuditService } from '../auditlog/mockAuditService';
import { getMockInterfaceEngineSettings } from './mockInterfaceEngineSettings';
import { dataMayPersistInBrowser } from '../browserData/browserDataPolicy';
import { appEnv } from '../runtimeConfig/runtimeEnv';
import { simulateWsiScanner, type ManifestLike } from './simulateWsiScanner';
import type { InterfaceDispatchEnvelope, InterfaceDispatchResult } from '../interfaceDispatch/dispatchInterfaceMessage';

export const SIMULATED_ENGINE_STORAGE_KEY = 'simulatedEngineReceived';
export const SIMULATED_ENGINE_LIMIT = 200;

export interface SimulatedEngineMessage {
  id: string;
  simulated: true;
  receivedAt: string;
  queueEntryId: string;
  transactionType: string;
  outcome: 'accepted' | 'rejected' | 'timed-out';
  /** Why it was refused, when it was. */
  reason?: string;
  /** The JSON the engine would have received. */
  envelopeJson: string;
}

let cache: SimulatedEngineMessage[] = storageGet<SimulatedEngineMessage[]>(SIMULATED_ENGINE_STORAGE_KEY, []);
const persist = () => storageSet(SIMULATED_ENGINE_STORAGE_KEY, cache);
let seq = 0;
const listeners = new Set<() => void>();
export const subscribeSimulatedEngine = (fn: () => void): (() => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
const notify = () => listeners.forEach(fn => fn());

export function listSimulatedEngineMessages(): readonly SimulatedEngineMessage[] { return cache; }

export function clearSimulatedEngineMessages(): void { cache = []; persist(); notify(); }

/** Test seam: forgets everything, no audit. */
export function resetSimulatedEngineForTests(): void { clearSimulatedEngineMessages(); }

/** Whether the simulated engine should take a message: the demo, no engine address set, the dev-only network mock off, and not switched off. Pure. */
export function shouldUseSimulatedEngine(input: { demo: boolean; endpointConfigured: boolean; networkMockEnabled: boolean; simulatedEngine: boolean | undefined }): boolean {
  return input.demo && !input.endpointConfigured && !input.networkMockEnabled && input.simulatedEngine !== false;
}

function record(envelope: InterfaceDispatchEnvelope, outcome: SimulatedEngineMessage['outcome'], reason?: string): void {
  const msg: SimulatedEngineMessage = {
    id: `sim-eng-${Date.now().toString(36)}-${(seq++).toString(36)}`, simulated: true, receivedAt: new Date().toISOString(),
    queueEntryId: envelope.queueEntryId, transactionType: envelope.transactionType, outcome, ...(reason ? { reason } : {}),
    envelopeJson: JSON.stringify(envelope, null, 2),
  };
  cache = [msg, ...cache].slice(0, SIMULATED_ENGINE_LIMIT);
  persist();
  notify();
  // Only the type and the outcome: a payload holds patient data.
  mockAuditService.logEvent({
    type: 'system', event: 'Simulated Engine Message Received',
    detail: `SIMULATED (no interface engine): ${envelope.transactionType} ${outcome}${reason ? ` (${reason})` : ''}. Nothing left the browser.`,
    user: 'system', caseId: null, confidence: null,
  }).catch(() => {});
}

/** What the engine would answer, and a record of the message. */
export async function simulateEngineReceive(envelope: InterfaceDispatchEnvelope): Promise<InterfaceDispatchResult> {
  const settings = getMockInterfaceEngineSettings();
  if (!envelope || !envelope.transactionType || !envelope.payload || typeof envelope.payload !== 'object') {
    record(envelope, 'rejected', 'envelope incomplete');
    return { ok: false, errorCode: 'DISPATCH_REJECTED', error: 'The simulated interface engine rejected this message: the envelope has no transaction type or payload.' };
  }
  if (settings.mode === 'timeout') {
    record(envelope, 'timed-out');
    return { ok: false, errorCode: 'DISPATCH_TIMEOUT', error: 'The simulated interface engine did not respond (mode: time out). Change the mode on the Mock Interface Engine page.' };
  }
  if (settings.mode === 'always_fail') {
    record(envelope, 'rejected', `HTTP ${settings.failureStatus}`);
    return { ok: false, errorCode: 'DISPATCH_REJECTED', error: `The simulated interface engine rejected this message (HTTP ${settings.failureStatus}, mode: always fail).` };
  }
  record(envelope, 'accepted');
  if (envelope.transactionType === 'WSI_SCAN_MANIFEST' && settings.simulateWsiScanner !== false) simulateWsiScanner(envelope.payload as ManifestLike);
  return { ok: true };
}

/** True when a message sent now would go to the simulated engine (the screen uses it to say "Simulated"). */
export function isEngineSimulated(): boolean {
  const s = getMockInterfaceEngineSettings();
  return shouldUseSimulatedEngine({
    demo: dataMayPersistInBrowser(), endpointConfigured: !!appEnv().VITE_INTERFACE_RECEIVER_ENDPOINT?.trim(),
    networkMockEnabled: s.enabled, simulatedEngine: s.simulatedEngine,
  });
}
