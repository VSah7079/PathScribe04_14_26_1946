// Stub only — real implementation pending backend cutover.
// mockNarrativeSignalService.ts is the active implementation; this satisfies the
// service interface's contract so the swap to a real backend is a
// one-line change in services/index.ts when that backend exists.

// src/services/narrativeSignals/firestoreNarrativeSignalService.ts
// TODO: Collection: organisations/{orgId}/narrativeSignals/{signalId}
// Security note: Only store de-identified signals (aiGeneratedClean, finalTextClean)
// Raw clinical text must NEVER be written to Firestore from client side.
const notImplemented = (): never => { throw new Error('firestoreNarrativeSignalService: not yet implemented'); };
export const firestoreNarrativeSignalService = new Proxy({}, { get: () => notImplemented }) as any;
