// Stub only — real implementation pending backend cutover.
// mockValidationStudyService.ts is the active implementation; this satisfies the
// service interface's contract so the swap to a real backend is a
// one-line change in services/index.ts when that backend exists.

// src/services/validationStudies/firestoreValidationStudyService.ts
// TODO: implement — Collection: organisations/{orgId}/validationStudies/{studyId}
const notImplemented = (): never => { throw new Error('firestoreValidationStudyService: not yet implemented'); };
export const firestoreValidationStudyService = new Proxy({}, { get: () => notImplemented }) as any;
