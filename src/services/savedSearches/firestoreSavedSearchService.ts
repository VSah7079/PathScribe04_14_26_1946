// Stub only — real implementation pending backend cutover.
// mockSavedSearchService.ts is the active implementation; this satisfies the
// service interface's contract so the swap to a real backend is a
// one-line change in services/index.ts when that backend exists.

// TODO: implement Firestore version
// import { ISavedSearchService } from './ISavedSearchService';
const notImplemented = (): never => { throw new Error('firestoreSavedSearchService.ts: not yet implemented'); };
export const firestoreSavedSearchService = new Proxy({}, { get: () => notImplemented }) as any;
