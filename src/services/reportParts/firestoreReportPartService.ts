// Stub only — real implementation pending backend cutover.
// mockReportPartService.ts is the active implementation; this satisfies the
// service interface's contract so the swap to a real backend is a
// one-line change in services/index.ts when that backend exists.

// src/services/reportParts/firestoreReportPartService.ts
// TODO: implement Firestore version
// import { IReportPartService } from './IReportPartService';
const notImplemented = (): never => { throw new Error('firestoreReportPartService.ts: not yet implemented'); };
export const firestoreReportPartService = new Proxy({}, { get: () => notImplemented }) as any;
