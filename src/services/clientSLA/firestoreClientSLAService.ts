// Stub only — real implementation pending backend cutover.
// mockClientSLAService.ts is the active implementation; this satisfies the
// service interface's contract so the swap to a real backend is a
// one-line change in services/index.ts when that backend exists.

// src/services/clientSLA/firestoreClientSLAService.ts
import { IClientSLAService } from './IClientSLAService';
const notImpl = (): never => { throw new Error('firestoreClientSLAService: not yet implemented'); };
export const firestoreClientSLAService: IClientSLAService = {
  getAll: notImpl, getById: notImpl, getByAssigningAuthority: notImpl,
  add: notImpl, update: notImpl, delete: notImpl,
};
