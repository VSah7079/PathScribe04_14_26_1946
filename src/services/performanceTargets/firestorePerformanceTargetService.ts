// Stub only — real implementation pending backend cutover.
// mockPerformanceTargetService.ts is the active implementation; this satisfies the
// service interface's contract so the swap to a real backend is a
// one-line change in services/index.ts when that backend exists.

// src/services/performanceTargets/firestorePerformanceTargetService.ts
import { IPerformanceTargetService } from './IPerformanceTargetService';
const notImpl = (): never => { throw new Error('firestorePerformanceTargetService: not yet implemented'); };
export const firestorePerformanceTargetService: IPerformanceTargetService = {
  getAll: notImpl, getByKey: notImpl, getById: notImpl,
  add: notImpl, update: notImpl, delete: notImpl,
};
