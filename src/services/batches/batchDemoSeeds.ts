// src/services/batches/batchDemoSeeds.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 404 (Pete: seed and demo data "to execute the functionality"). Three
// demo batches, one for each Batch Management override, so each can be tried
// straight away:
//   DEMO-RECON   Staining, reconciling, one slide missing and one unexpected
//                scan: "Supervisor override" (batch:reconciliation:override).
//   DEMO-REF     External referral to Summit Molecular with an unacknowledged
//                cold-chain excursion: "Acknowledge" (batch:cold-chain-
//                excursion:acknowledge).
//   DEMO-PROC    Processing, active: "Abort batch" (batch:run:abort, reason
//                required).
// Added to a browser's stored batches when missing; never replaces a batch.
//
// Pure: takes a clock, returns the batches.
// ─────────────────────────────────────────────────────────────────────────────

import type { Batch, BatchItem } from './IBatchService';
import { REFERENCE_LAB_IDS } from '../facilities/referenceLabSeeds';

export const BATCH_DEMO_IDS = { reconciling: 'batch-demo-recon', referral: 'batch-demo-referral', processing: 'batch-demo-processing' } as const;

export function batchDemoSeeds(now: number = Date.now()): Batch[] {
  const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString();
  const tech = { createdByUserId: 'HT-001', createdByUserName: 'Histology Tech' };
  const item = (id: string, materialType: BatchItem['materialType'], displayId: string, caseAccession: string, h: number, reconciliationStatus?: BatchItem['reconciliationStatus']): BatchItem => ({
    id, materialType, displayId, caseAccession, addedAt: hoursAgo(h), addedByUserId: tech.createdByUserId, addedByUserName: tech.createdByUserName,
    ...(reconciliationStatus ? { reconciliationStatus } : {}),
  });
  return [
    {
      id: BATCH_DEMO_IDS.reconciling, masterBarcode: 'CONT-STN-DEMO-RECON', containerType: 'Staining Rack', identifierMode: 'disposable',
      processingNode: 'Staining', protocol: 'H&E routine', priority: 'Routine', status: 'reconciling',
      items: [
        item('bdi-recon-1', 'slide', 'S26-4401-A1-L1', 'S26-4401-BX-001', 5, 'matched'),
        item('bdi-recon-2', 'slide', 'S26-4401-A2-L1', 'S26-4401-BX-001', 5, 'missing'),
      ],
      unexpectedScans: [{ id: 'bdu-recon-1', scannedDisplayId: 'S26-4405-A1-L2', at: hoursAgo(1), byUserId: tech.createdByUserId, byUserName: tech.createdByUserName }],
      createdAt: hoursAgo(6), ...tech,
      reconciliationStartedAt: hoursAgo(1), reconciliationStartedByUserId: tech.createdByUserId, reconciliationStartedByUserName: tech.createdByUserName,
    },
    {
      id: BATCH_DEMO_IDS.referral, masterBarcode: 'CONT-REF-DEMO-COLD', containerType: 'Ad-Hoc Batch', identifierMode: 'disposable',
      processingNode: 'External Referral', protocol: 'Refrigerated courier', priority: 'Routine', status: 'active',
      referralDestinationFacilityId: REFERENCE_LAB_IDS.summit, referralTestRequested: 'HER2 FISH',
      items: [item('bdi-ref-1', 'block', 'S26-4401-A1', 'S26-4401-BX-001', 3)],
      unexpectedScans: [],
      coldChainExcursion: { detectedAt: hoursAgo(2), readingId: 'demo-reading-9', temperatureCelsius: 11.4 },
      createdAt: hoursAgo(4), ...tech,
    },
    {
      id: BATCH_DEMO_IDS.processing, masterBarcode: 'CONT-PRC-DEMO-RUN', containerType: 'Tissue Processor Basket', identifierMode: 'disposable',
      processingNode: 'Processing', protocol: 'Overnight biopsy', priority: 'Routine', status: 'active',
      items: [item('bdi-proc-1', 'block', 'S26-4405-A1', 'S26-4405', 2), item('bdi-proc-2', 'block', 'S26-4405-A2', 'S26-4405', 2)],
      unexpectedScans: [],
      createdAt: hoursAgo(3), ...tech,
    },
  ];
}
