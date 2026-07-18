// Stub only — real implementation pending backend cutover.
// mockRoleService.ts is the active implementation; this satisfies the
// service interface's contract so the swap to a real backend is a
// one-line change in services/index.ts when that backend exists.

import { IRoleService } from './IRoleService';

const notImplemented = (): never => { throw new Error('firestoreRoleService: not yet implemented'); };

export const firestoreRoleService: IRoleService = {
  getAll:  notImplemented,
  getById: notImplemented,
  add:     notImplemented,
  update:  notImplemented,
  delete:  notImplemented,
};
