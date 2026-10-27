// src/services/printing/simulatedPrint.ts
// ─────────────────────────────────────────────────
// Batch 606: the demo stand-in for printers, engravers, the PathScribe Agent,
// the interface engine's print route and the middleware that receives scan
// events. With no API server (the demo), a label or job sent down a route that
// has no real transport yet is recorded here, labelled Simulated, shown to the
// person (toast) and audited, instead of failing or pretending to print.
// With an API server configured nothing here is used: a missing transport is a
// real error. The audit entry carries no patient data: the kind, the printer
// and the count only.
// ─────────────────────────────────────────────────
import i18n from 'i18next';
import { toast } from 'react-toastify';
import { storageGet, storageSet } from '../mockStorage';
import { auditService } from '../auditlog/auditServiceInstance';
import { dataMayPersistInBrowser } from '../browserData/browserDataPolicy';

export const SIMULATED_PRINT_STORAGE_KEY = 'simulatedPrintLog';
export const SIMULATED_PRINT_FAILURE_KEY = 'simulatedPrintFailure';
export const SIMULATED_PRINT_LIMIT = 200;

export type SimulatedPrintKind = 'label' | 'engrave' | 'network' | 'agent' | 'report' | 'scan-event' | 'molecular';
export type SimulatedPrintOutcome = 'delivered' | 'failed';

export interface SimulatedPrintRecord {
  id: string;
  /** Always true; carried on the record so no export can drop the label. */
  simulated: true;
  at: string;
  kind: SimulatedPrintKind;
  /** The route that has no real transport yet, e.g. 'bartender_rest', 'pathscribe_agent', 'engraver'. */
  transport: string;
  /** Printer or station name; never a patient identifier. */
  destination: string;
  copies: number;
  outcome: SimulatedPrintOutcome;
}

/** True when a missing transport may be simulated: the demo, with no API server. */
export const simulationAllowed = (): boolean => dataMayPersistInBrowser();

let _cache: SimulatedPrintRecord[] = storageGet<SimulatedPrintRecord[]>(SIMULATED_PRINT_STORAGE_KEY, []);
let _seq = 0;
const listeners = new Set<() => void>();
export const subscribeSimulatedPrint = (fn: () => void): (() => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
const notify = () => listeners.forEach(fn => fn());

/** The failure simulator: while on, simulated sends come back failed, so the failure path can be shown. */
export function getSimulatedPrintFailure(): boolean { return storageGet<boolean>(SIMULATED_PRINT_FAILURE_KEY, false); }
export function setSimulatedPrintFailure(on: boolean): void { storageSet(SIMULATED_PRINT_FAILURE_KEY, on); notify(); }

/** Records one simulated send and says how it went. */
export function recordSimulatedPrint(input: { kind: SimulatedPrintKind; transport: string; destination: string; copies?: number; user?: string }): SimulatedPrintRecord {
  const outcome: SimulatedPrintOutcome = getSimulatedPrintFailure() ? 'failed' : 'delivered';
  const record: SimulatedPrintRecord = {
    id: `sim-print-${Date.now().toString(36)}-${(_seq++).toString(36)}`, simulated: true, at: new Date().toISOString(),
    kind: input.kind, transport: input.transport, destination: input.destination, copies: input.copies ?? 1, outcome,
  };
  _cache = [record, ..._cache].slice(0, SIMULATED_PRINT_LIMIT);
  storageSet(SIMULATED_PRINT_STORAGE_KEY, _cache);
  notify();
  if (typeof window !== 'undefined') {
    try {
      const key = outcome === 'delivered' ? 'simulatedPrint.toast' : 'simulatedPrint.toastFailed';
      const text = i18n.t(key, { kind: i18n.t(`simulatedPrint.kinds.${record.kind}`), destination: record.destination });
      if (outcome === 'delivered') toast.info(text); else toast.warning(text);
    } catch { /* no toast host */ }
  }
  auditService.logEvent({
    type: 'system', event: 'Simulated Print Recorded',
    detail: `SIMULATED (no ${record.transport} transport): ${record.kind} to ${record.destination}, ${record.copies} cop${record.copies === 1 ? 'y' : 'ies'}, ${outcome}. Nothing was printed or sent.`,
    user: input.user ?? 'system', caseId: null, confidence: null,
  }).catch(() => {});
  return record;
}

export const listSimulatedPrints = (): readonly SimulatedPrintRecord[] => _cache;

export function clearSimulatedPrints(user = 'system'): void {
  const n = _cache.length;
  _cache = [];
  storageSet(SIMULATED_PRINT_STORAGE_KEY, _cache);
  notify();
  auditService.logEvent({ type: 'system', event: 'Simulated Print Log Cleared', detail: `${n} simulated print record${n === 1 ? '' : 's'} removed.`, user, caseId: null, confidence: null }).catch(() => {});
}

/** Test seam: forgets everything and the failure switch, without auditing. */
export function resetSimulatedPrintForTests(): void { _cache = []; storageSet(SIMULATED_PRINT_STORAGE_KEY, []); storageSet(SIMULATED_PRINT_FAILURE_KEY, false); }
