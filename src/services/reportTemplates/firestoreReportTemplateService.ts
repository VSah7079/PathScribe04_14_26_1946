// Stub only — real implementation pending backend cutover.
// mockReportTemplateService.ts is the active implementation; this satisfies the
// service interface's contract so the swap to a real backend is a
// one-line change in services/index.ts when that backend exists.

// src/services/reportTemplates/firestoreReportTemplateService.ts
// TODO: implement Firestore version
// import { IReportTemplateService } from './IReportTemplateService';
const notImplemented = (): never => { throw new Error('firestoreReportTemplateService.ts: not yet implemented'); };
export const firestoreReportTemplateService = new Proxy({}, { get: () => notImplemented }) as any;
