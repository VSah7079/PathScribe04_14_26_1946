// src/services/molecular/supersedeMolecularBatch.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 669 (mol-9): Clone & Supersede, with the plate's in-house orders. The batch service makes the clone (keeping
// the wells bound to waiting orders, cloneWellsForSupersede.ts); this then points those orders at the new plate, so
// they stay on a plate that can still be dispatched and Take off plate keeps working. The two steps are separate
// because the order engine reads the batch service, not the other way round. Refusals pass through unchanged.
// ─────────────────────────────────────────────────────────────────────────────

import type { ServiceResult } from '../types';
import type { IMolecularBatchService, MolecularBatch } from './IMolecularBatchService';

export interface SupersedeDeps {
  batchService: Pick<IMolecularBatchService, 'getById' | 'cloneAndSupersede'>;
  /** Points the orders still waiting on the superseded plate at the clone; how many moved. */
  moveOrders: (originalBatchUuid: string, clone: MolecularBatch) => Promise<number>;
}

export interface SupersedeOutcome { clone: MolecularBatch; ordersMoved: number }

export async function supersedeMolecularBatch(
  originalBatchId: string, reason: string, byUserId: string, byUserName: string, deps: SupersedeDeps,
): Promise<ServiceResult<SupersedeOutcome>> {
  const before = await deps.batchService.getById(originalBatchId);
  const res = await deps.batchService.cloneAndSupersede(originalBatchId, reason, byUserId, byUserName);
  if (res.ok === false) return { ok: false, error: 'error' in res ? res.error : 'generic' } as ServiceResult<SupersedeOutcome>;
  // The clone is made and the original closed; a failure moving the orders must not hide that, so it reads as none moved.
  const ordersMoved = before.ok
    ? await deps.moveOrders(before.data.batchUuid, res.data).catch((e: unknown) => { console.error('Orders were not moved to the replacement plate', e); return 0; })
    : 0;
  return { ok: true, data: { clone: res.data, ordersMoved } };
}
