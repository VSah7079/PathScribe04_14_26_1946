<<<<<<< HEAD
=======
// Stub only — real implementation pending backend cutover.
// mockMacroService.ts is the active implementation; this satisfies the
// service interface's contract so the swap to a real backend is a
// one-line change in services/index.ts when that backend exists.

>>>>>>> upstream/main
// TODO: implement Firestore version
// import { IMacroService } from './IMacroService';
const notImplemented = (): never => { throw new Error('firestoreMacroService.ts: not yet implemented'); };
export const firestoreMacroService = new Proxy({}, { get: () => notImplemented }) as any;
