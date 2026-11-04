// src/services/molecular/molecularDemoSeed.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 456 (demo baseline): the Molecular workcenter that Daniel Kim (MT-001,
// Molecular Technologist) signs in to has work at each stage after a Full
// Reset. The specimens are the three Batch 455 baseline Paps whose HPV co-test
// is pending (services/cases/demoBaselineCases.ts):
//
//   RACK-MOLE-00456   S26-4652 vial received and racked, awaiting extraction
//                     (Molecular → Rack worklist; not yet placed on a deck)
//   mb-demo-456-run   S26-4650 on Panther 2 now: worklist dispatched, run in
//                     progress (Molecular → Active Batches & Runs)
//   mb-demo-456-fail  S26-4651's first run: the instrument reported a failed
//                     run, the high positive control came up low, so the run is
//                     BLOCKED and its results wait for the technologist (Active
//                     tab; open it to see the results and the blocked banner).
//                     The repeat is Clone & Supersede (molecular:batch:supersede).
//
// HPV High-Risk Screening is the in-house assay the catalog runs on a plate
// (Hologic Panther). The breast and colon molecular tests in the catalog
// (HER2 FISH, NGS Solid Tumor Panel, MSI by PCR) are send-outs or FISH, not
// plate runs, so they don't belong in this workcenter.
//
// Ids are fixed so a browser that already stored molecular data gets these
// added (withMissingSeedRecords); dates are relative to today.
// ─────────────────────────────────────────────────────────────────────────────

import type { MolecularBatch, MolecularMovementRecord, MolecularReagentLot, MolecularWell } from './IMolecularBatchService';
import type { MolecularExtractionRack, MolecularRackPosition } from './IMolecularExtractionRackService';
import { generateMolecularBatchBarcode, generateMolecularPlateBarcode, generateSpecimenContainerBarcode } from './resolveMolecularBarcodes';

const HOUR = 3_600_000;
const hoursAgo = (h: number) => new Date(Date.now() - h * HOUR);
const iso = (h: number) => hoursAgo(h).toISOString();
const inDays = (d: number) => new Date(Date.now() + d * 24 * HOUR).toISOString();

const DANIEL = { byUserId: 'MT-001', byUserName: 'Daniel Kim' };
const STATION = { stationId: 'station-molecular-1', stationName: 'Molecular — Amplification Bay' };
const HPV_ASSAY = { assayCode: 'st-hpv-highrisk-screen', assayName: 'HPV High-Risk Screening' };

/** The vials (primary container barcodes are dated the day they were labelled). */
export const MOLECULAR_DEMO_VIALS = {
  'S26-4650-CYT-001': generateSpecimenContainerBarcode(hoursAgo(48), 4650),
  'S26-4651-CYT-001': generateSpecimenContainerBarcode(hoursAgo(48), 4651),
  'S26-4652-CYT-001': generateSpecimenContainerBarcode(hoursAgo(24), 4652),
} as const;
type DemoAccession = keyof typeof MOLECULAR_DEMO_VIALS;

const move = (from: MolecularMovementRecord['fromLevel'], to: MolecularMovementRecord['toLevel'], fromBarcode: string, toBarcode: string, h: number): MolecularMovementRecord =>
  ({ fromLevel: from, toLevel: to, fromBarcode, toBarcode, at: iso(h), ...DANIEL, ...STATION });

const lots: MolecularReagentLot[] = [
  { componentType: 'EXTRACTION_BUFFER', lotNumber: 'EX-2026-0412', expirationDate: inDays(120), qcStatus: 'signed_off' },
  { componentType: 'MASTER_MIX', lotNumber: 'MM-2026-9310', expirationDate: inDays(150), qcStatus: 'signed_off' },
];

/** The two controls the HPV control rule fixes at A01 / A02 (mockMolecularAssayControlRuleService). */
const controls = (): MolecularWell[] => [
  { wellPosition: 'A01', sampleType: 'CONTROL_NTC', controlInfo: { controlId: 'NTC-LOT-512', controlLotNumber: 'NTC-LOT-512', controlExpirationDate: inDays(150), expectedValue: 'NEGATIVE' } },
  { wellPosition: 'A02', sampleType: 'CONTROL_PTC_HIGH', controlInfo: { controlId: 'PTC-LOT-977', controlLotNumber: 'PTC-LOT-977', controlExpirationDate: inDays(150), expectedValue: 'POSITIVE' } },
];

const patientWell = (wellPosition: string, accession: DemoAccession, rackBarcode: string, plateBarcode: string, h: number): MolecularWell => ({
  wellPosition, sampleType: 'PATIENT_SPECIMEN', accessionNumber: accession, containerBarcode: MOLECULAR_DEMO_VIALS[accession], aliquotVolumeUl: 400,
  movementHistory: [
    move('primary_vial', 'secondary_rack', MOLECULAR_DEMO_VIALS[accession], `${rackBarcode}:1`, h + 2),
    move('secondary_rack', 'plate_well', `${rackBarcode}:1`, `${plateBarcode}:${wellPosition}`, h),
  ],
});

const RUN_PLATE = generateMolecularPlateBarcode(HPV_ASSAY.assayCode, hoursAgo(3), 456);
const FAIL_PLATE = generateMolecularPlateBarcode(HPV_ASSAY.assayCode, hoursAgo(26), 455);
const EGFR_PLATE = generateMolecularPlateBarcode('st-egfr-pcr', hoursAgo(1), 467);

export const MOLECULAR_DEMO_BATCHES: MolecularBatch[] = [
  {
    // Running now on Panther 2.
    id: 'mb-demo-456-run',
    batchBarcode: generateMolecularBatchBarcode(hoursAgo(3), 456),
    batchUuid: '4f6b2c1e-8a3d-4e57-9b02-456000000001',
    ...HPV_ASSAY,
    targetInstrumentId: 'PANTHER_02', deckSlot: 'SLOT_A4',
    plateUuid: '9d1e7a54-2c6b-4f38-8e0a-456000000011', plateBarcode: RUN_PLATE, plateLayout: '96_well',
    reagentLots: lots,
    wells: [...controls(), patientWell('A03', 'S26-4650-CYT-001', 'RACK-MOLE-00455', RUN_PLATE, 3)],
    status: 'active',
    createdAt: iso(3), createdByUserId: DANIEL.byUserId, createdByUserName: DANIEL.byUserName,
    worklistDispatchedAt: iso(2.5),
  },
  {
    // Yesterday's run: the instrument reported FAILED and the high positive
    // control read low, so the results are blocked for the technologist.
    id: 'mb-demo-456-fail',
    batchBarcode: generateMolecularBatchBarcode(hoursAgo(26), 455),
    batchUuid: '4f6b2c1e-8a3d-4e57-9b02-456000000002',
    ...HPV_ASSAY,
    targetInstrumentId: 'PANTHER_02', deckSlot: 'SLOT_A4',
    plateUuid: '9d1e7a54-2c6b-4f38-8e0a-456000000012', plateBarcode: FAIL_PLATE, plateLayout: '96_well',
    reagentLots: lots,
    wells: [...controls(), patientWell('A03', 'S26-4651-CYT-001', 'RACK-MOLE-00454', FAIL_PLATE, 26)],
    status: 'awaiting_results',
    createdAt: iso(26), createdByUserId: DANIEL.byUserId, createdByUserName: DANIEL.byUserName,
    worklistDispatchedAt: iso(25.5),
    controlsPassed: false,
    reviewStatus: 'BLOCKED',
    results: [
      { well_position: 'A01', specimen_uuid: null, raw_data: { internal_control_ct: 27.8 }, interpretation: 'NEGATIVE', flag: 'NONE' },
      { well_position: 'A02', specimen_uuid: null, raw_data: { ct_value: 38.6, internal_control_ct: 28.1, rfu_signal: 410 }, interpretation: 'INVALID', flag: 'LOW_SIGNAL' },
      { well_position: 'A03', specimen_uuid: null, accession_number: 'S26-4651-CYT-001', raw_data: { ct_value: 31.2, internal_control_ct: 29.4 }, interpretation: 'INDETERMINATE', flag: 'REPEAT_REQUIRED' },
    ],
  },
  {
    // Batch 467: today's in-house EGFR mutation PCR plate at Desert Valley, built with its two controls and waiting
    // for orders from the Order Queue (services/molecularOrders/). No worklist sent yet.
    id: 'mb-demo-467-egfr',
    batchBarcode: generateMolecularBatchBarcode(hoursAgo(1), 467),
    batchUuid: '4f6b2c1e-8a3d-4e57-9b02-467000000001',
    assayCode: 'st-egfr-pcr', assayName: 'EGFR mutation PCR',
    targetInstrumentId: 'PCR_01',
    plateUuid: '9d1e7a54-2c6b-4f38-8e0a-467000000011', plateBarcode: EGFR_PLATE, plateLayout: '96_well',
    reagentLots: lots,
    wells: controls(),
    status: 'draft',
    createdAt: iso(1), createdByUserId: DANIEL.byUserId, createdByUserName: DANIEL.byUserName,
  },
];

const RACK_BARCODE = 'RACK-MOLE-00456';
const emptyPositions = (from: number, to: number): MolecularRackPosition[] =>
  Array.from({ length: to - from + 1 }, (_, i) => ({ positionLabel: String(from + i) }));

export const MOLECULAR_DEMO_RACKS: MolecularExtractionRack[] = [
  {
    // S26-4652's vial, received this morning: racked, awaiting extraction.
    id: 'rack-demo-456',
    rackBarcode: RACK_BARCODE,
    rackUuid: 'b85e3f20-6c1a-4d9e-a7f4-456000000021',
    capacity: 12,
    positions: [
      {
        positionLabel: '1', accessionNumber: 'S26-4652-CYT-001', containerBarcode: MOLECULAR_DEMO_VIALS['S26-4652-CYT-001'],
        movementHistory: [move('primary_vial', 'secondary_rack', MOLECULAR_DEMO_VIALS['S26-4652-CYT-001'], `${RACK_BARCODE}:1`, 1)],
      },
      ...emptyPositions(2, 12),
    ],
    createdAt: iso(1.5), createdByUserId: DANIEL.byUserId, createdByUserName: DANIEL.byUserName,
    rackType: 'sample_tube_rack',
  },
];
