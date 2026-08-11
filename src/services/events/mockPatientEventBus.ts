// src/services/events/mockPatientEventBus.ts
import type { IPatientEventBus, PatientEvent, PatientEventType, PatientEventListener } from './IPatientEventBus';

const typedListeners = new Map<PatientEventType, Set<PatientEventListener>>();
const allListeners = new Set<PatientEventListener>();

export const mockPatientEventBus: IPatientEventBus = {
  publish(event: PatientEvent): void {
    const forType = typedListeners.get(event.type);
    if (forType) {
      // Real, defensive copy before iterating - a listener that
      // unsubscribes itself (or another listener) mid-publish should
      // never corrupt this real, in-flight iteration.
      for (const listener of [...forType]) {
        try {
          listener(event);
        } catch {
          // A real, misbehaving subscriber must never break the
          // publisher - the same "notifications are best-effort, never
          // load-bearing for the operation that triggered them"
          // reasoning already established for mockAuditService calls
          // throughout this codebase.
        }
      }
    }
    for (const listener of [...allListeners]) {
      try {
        listener(event);
      } catch {
        // Same reasoning as above.
      }
    }
  },

  subscribe(type: PatientEventType, listener: PatientEventListener): () => void {
    if (!typedListeners.has(type)) typedListeners.set(type, new Set());
    typedListeners.get(type)!.add(listener);
    return () => {
      typedListeners.get(type)?.delete(listener);
    };
  },

  subscribeAll(listener: PatientEventListener): () => void {
    allListeners.add(listener);
    return () => {
      allListeners.delete(listener);
    };
  },
};
