// src/services/molecular/supersedeMolecularBatchLive.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 669: supersedeMolecularBatch wired to today's services. The order engine is loaded when needed (it reads the
// batch service too).
// ─────────────────────────────────────────────────────────────────────────────

import { molecularBatchService } from './molecularBatchServiceInstance';
import { supersedeMolecularBatch, type SupersedeOutcome } from './supersedeMolecularBatch';
import type { ServiceResult } from '../types';

export function supersedeMolecularBatchNow(originalBatchId: string, reason: string, byUserId: string, byUserName: string): Promise<ServiceResult<SupersedeOutcome>> {
  return supersedeMolecularBatch(originalBatchId, reason, byUserId, byUserName, {
    batchService: molecularBatchService,
    moveOrders: async (uuid, clone) => (await import('../molecularOrders/molecularOrderEngineLive')).molecularOrderEngine.onPlateSuperseded(uuid, clone),
  });
}
