// src/services/molecularOrders/mockMolecularOrderStore.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 467: where the mock engine keeps in-house molecular orders (browser
// storage, like every mock service). The API server keeps them in SQL Server
// (docs/architecture/MOLECULAR_ORDERS_API.md). Seeded with the demo's orders: S26-4493's in-house EGFR mutation PCR
// (queued for Desert Valley's PCR plate), S26-4401's HER2 FISH (sent out to Summit) and (Batch 467b) MFT26-8801's MSI
// by PCR (send-out, its reference lab still to be chosen). Batch 746 (S7): twelve more in-house orders waiting for a plate
// (EGFR and KRAS) and three resulted ones (services/molecular/molecularRunHistoryDemoSeed.ts). A seed order missing from
// storage is added (orders are never deleted, only cancelled).
// ─────────────────────────────────────────────────────────────────────────────

import { storageGet, storageSet } from '../mockStorage';
import { withMissingSeedRecords } from '../mockSeedMerge';
import { REFERENCE_LAB_IDS } from '../facilities/referenceLabSeeds';
import type { MolecularOrder } from './molecularOrderTypes';
import { MOLECULAR_RUN_HISTORY_ORDERS } from '../molecular/molecularRunHistoryDemoSeed';

const STORE_KEY = 'molecular_orders_v1';
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

export const MOLECULAR_ORDER_SEED: readonly MolecularOrder[] = [
  {
    orderId: 'MO-2026-0467-01', caseId: 'S26-4493', accession: 'S26-4493', specimenId: 'S26-4493-SP-1', specimenLabel: 'A',
    blockId: 'blk-4493-a1', blockLabel: '1', assayTarget: 'st-egfr-pcr', assayName: 'EGFR mutation PCR', routing: 'IN_HOUSE',
    performingLabFacilityId: 'c-ent-dvmc', stainOrderId: 'addon-4493-egfr',
    orderedBy: 'PATH-001', orderedByName: 'Pete Nimmo', orderedAt: hoursAgo(3), status: 'QUEUED',
  },
  {
    orderId: 'MO-2026-0403-01', caseId: 'S26-4401-BX-001', accession: 'S26-4401-BX-001', specimenId: 'S26-4401-SP-1', specimenLabel: 'A',
    blockId: 'blk-4401-a1', blockLabel: '1', assayTarget: 'st-her2-fish', assayName: 'HER2 FISH', routing: 'SEND_OUT',
    sendOutLabId: REFERENCE_LAB_IDS.summit, sendOutLabName: 'Summit Molecular Reference Laboratory',
    stainOrderId: 'addon-demo-her2-fish', orderedBy: 'PATH-001', orderedByName: 'Pete Nimmo', orderedAt: hoursAgo(20), status: 'QUEUED',
  },
  {
    // Batch 467b: MSI by PCR has no approved reference lab, so its lab is chosen in the Order Queue (any active one).
    orderId: 'MO-2026-0467-02', caseId: 'MFT26-8801-CR-RES', accession: 'MFT26-8801-CR-RES', specimenId: 'MFT26-8801-SP-1', specimenLabel: 'A',
    blockId: '', blockLabel: '', assayTarget: 'st-msi-pcr', assayName: 'MSI by PCR', routing: 'SEND_OUT',
    orderedBy: 'PATH-001', orderedByName: 'Pete Nimmo', orderedAt: hoursAgo(5), status: 'QUEUED',
  },
  ...MOLECULAR_RUN_HISTORY_ORDERS,
];

type Keyed = MolecularOrder & { id: string };
export function loadMolecularOrders(): MolecularOrder[] {
  const stored = storageGet<MolecularOrder[] | null>(STORE_KEY, null);
  const keyed = (list: readonly MolecularOrder[]): Keyed[] => list.map(o => ({ ...o, id: o.orderId }));
  const { records, added } = withMissingSeedRecords(stored ? keyed(stored) : null, keyed(MOLECULAR_ORDER_SEED));
  const orders = records.map(({ id: _id, ...o }) => o as MolecularOrder);
  if (!stored || added > 0) storageSet(STORE_KEY, orders);
  return orders;
}
export function saveMolecularOrders(orders: MolecularOrder[]): void {
  storageSet(STORE_KEY, orders);
}
