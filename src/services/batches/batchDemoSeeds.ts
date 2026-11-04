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
//   DEMO-EMBED   Batch 726: a sealed processor basket with S26-4403's blocks,
//                ready to be scanned at the Embedding workstation, where it
//                moves to Embedding (spec §2 row 2) and its blocks are
//                checked off as they are scanned (Decision 1).
//   Batch 744 (S14), open cytology batches with items (services/cases/demoFluidCases.ts):
//   CYP-DEMO-TP  Liquid-Based Cytology Processing on the ThinPrep processor (LBC_PROC_01): S26-5107's vial, in process.
//   CYP-DEMO-SP  The same on the SurePath processor (LBC_PROC_02): S26-5108's vial, loaded. Each has its instrument order
//                (molecularOrderDemoSeed.ts).
//   CYS-DEMO     Cytology Staining, Diff-Quik: S26-5103's second cytospin, on the stainer.
//   CYI-DEMO     Cytology Imaging: S26-4652's coverslipped ThinPrep Pap, scanned on the imager.
// Added to a browser's stored batches when missing; never replaces a batch.
//
// Pure: takes a clock, returns the batches.
// ─────────────────────────────────────────────────────────────────────────────

import type { Batch, BatchItem } from './IBatchService';
import { REFERENCE_LAB_IDS } from '../facilities/referenceLabSeeds';

export const BATCH_DEMO_IDS = {
  reconciling: 'batch-demo-recon', referral: 'batch-demo-referral', processing: 'batch-demo-processing', toEmbedding: 'batch-demo-to-embedding',
  cytoProcessingThinPrep: 'batch-demo-cyto-proc-tp', cytoProcessingSurePath: 'batch-demo-cyto-proc-sp', cytoStaining: 'batch-demo-cyto-stain', cytoImaging: 'batch-demo-cyto-image',
} as const;
/** Batch 744: the master barcodes of the two liquid-based processing batches (their instrument orders name them). */
export const LBC_DEMO_BATCH_BARCODES = { thinPrep: 'CONT-CYP-DEMO-TP', surePath: 'CONT-CYP-DEMO-SP' } as const;

export function batchDemoSeeds(now: number = Date.now()): Batch[] {
  const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString();
  const tech = { createdByUserId: 'HT-001', createdByUserName: 'Histology Tech' };
  const cytoBy = { createdByUserId: 'CT-001', createdByUserName: 'Priya Desai' };
  const cyto = { addedByUserId: 'CT-001', addedByUserName: 'Priya Desai' };
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
    {
      id: BATCH_DEMO_IDS.toEmbedding, masterBarcode: 'CONT-PRC-DEMO-EMBED', containerType: 'Tissue Processor Basket', identifierMode: 'disposable',
      processingNode: 'Processing', protocol: 'Overnight routine', priority: 'Routine', status: 'active',
      items: [item('bdi-emb-1', 'block', 'S26-4403-A1', 'S26-4403', 14), item('bdi-emb-2', 'block', 'S26-4403-A2', 'S26-4403', 14)],
      unexpectedScans: [],
      sealedAt: hoursAgo(13), sealedByUserId: tech.createdByUserId, sealedByUserName: tech.createdByUserName,
      stationId: 'station-embed-1',
      createdAt: hoursAgo(15), ...tech,
    },
    // ── Batch 744 (S14): cytology ──
    {
      id: BATCH_DEMO_IDS.cytoProcessingThinPrep, masterBarcode: LBC_DEMO_BATCH_BARCODES.thinPrep, containerType: 'Ad-Hoc Batch', identifierMode: 'disposable',
      processingNode: 'Cytology Processing', protocol: 'ThinPrep Pap, standard', priority: 'Routine', status: 'active',
      processorEquipmentId: 'eq-lbc-proc-01', cytologyInstrumentStatus: 'In Process',
      items: [{ ...item('bdi-cyp-tp-1', 'decant', 'S26-5107-CYT-001-AD1', 'S26-5107-CYT-001', 1), ...cyto }],
      unexpectedScans: [], createdAt: hoursAgo(1), ...cytoBy,
    },
    {
      id: BATCH_DEMO_IDS.cytoProcessingSurePath, masterBarcode: LBC_DEMO_BATCH_BARCODES.surePath, containerType: 'Ad-Hoc Batch', identifierMode: 'disposable',
      processingNode: 'Cytology Processing', protocol: 'SurePath Pap, standard', priority: 'Routine', status: 'active',
      processorEquipmentId: 'eq-lbc-proc-02', cytologyInstrumentStatus: 'Loaded to Instrument',
      items: [{ ...item('bdi-cyp-sp-1', 'decant', 'S26-5108-CYT-001-AD1', 'S26-5108-CYT-001', 0.5), ...cyto }],
      unexpectedScans: [], createdAt: hoursAgo(0.5), ...cytoBy,
    },
    {
      id: BATCH_DEMO_IDS.cytoStaining, masterBarcode: 'CONT-CYS-DEMO', containerType: 'Staining Rack', identifierMode: 'disposable',
      processingNode: 'Cytology Staining', protocol: 'Diff-Quik, rapid', priority: 'STAT', status: 'active', cytologyStainTypeId: 'st-diffquik',
      items: [{ ...item('bdi-cys-1', 'decant_slide', 'S26-5103-CYT-001-AD3-L2', 'S26-5103-CYT-001', 1), ...cyto }],
      unexpectedScans: [], createdAt: hoursAgo(1), ...cytoBy,
    },
    {
      id: BATCH_DEMO_IDS.cytoImaging, masterBarcode: 'CONT-CYI-DEMO', containerType: 'Ad-Hoc Batch', identifierMode: 'disposable',
      processingNode: 'Cytology Imaging', protocol: 'Imager, GYN', priority: 'Routine', status: 'active',
      items: [{ ...item('bdi-cyi-1', 'decant_slide', 'S26-4652-CYT-001-AD1-L1', 'S26-4652-CYT-001', 2), fovCount: 22, ...cyto }],
      unexpectedScans: [], createdAt: hoursAgo(2), ...cytoBy,
    },
  ];
}
