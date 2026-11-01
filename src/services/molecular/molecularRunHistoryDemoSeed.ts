// src/services/molecular/molecularRunHistoryDemoSeed.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 746 (Pete's Demo Seed Data Requirements, row S7: "Molecular data end to end", Videos 3 and 5). Joins the
// Batch 456 and 467 seed (molecularDemoSeed.ts, molecularOrders/mockMolecularOrderStore.ts). Fictional data only; every
// time is relative to the reset. The cases are in services/cases/demoMolecularCases.ts.
//
// Order Queue (Molecular Workspace, first tab): twelve in-house orders waiting for a plate, across two assays at Desert
//   Valley: seven EGFR mutation PCR (S26-5201 to 5207) and five KRAS mutation PCR (S26-5211 to 5215). With S26-4493's
//   EGFR order that is thirteen; the send-out orders (HER2 FISH to Summit, MSI by PCR) stay.
// Completed runs (History tab), each with its readouts and Trace:
//   mb-demo-746-hpv-done     HPV High-Risk Screening on Panther 2: S26-5001 Negative, S26-5002 Positive (the results
//                            those Paps already show)
//   mb-demo-746-egfr-done    EGFR mutation PCR on Real-time PCR 1: S26-5208 Positive, S26-5209 Negative; both results are
//                            in the cases' Lung Adenocarcinoma synoptic (EGFR Mutation Status)
//   mb-demo-746-kras-fail    KRAS mutation PCR, first run: the no-template control amplified, so the run is BLOCKED (the red
//                            banner) and was superseded by the repeat (Clone & Supersede, with its reason)
//   mb-demo-746-kras-repeat  the repeat: controls passed, S26-5216 Positive
// The master mix lot of the failed KRAS run then failed its QC; the reagent lot registry has it as Failed, and an EGFR
// lot that has expired (mockReagentLotService.ts).
// ─────────────────────────────────────────────────────────────────────────────

import type { MolecularBatch, MolecularMovementRecord, MolecularReagentLot, MolecularWell } from './IMolecularBatchService';
import type { MolecularWellResult } from '@/types/events/MolecularRunResultsPayload';
import type { MolecularOrder } from '../molecularOrders/molecularOrderTypes';
import { generateMolecularBatchBarcode, generateMolecularPlateBarcode, generateSpecimenContainerBarcode } from './resolveMolecularBarcodes';
import {
  DESERT_VALLEY_LAB, MOLECULAR_DEMO_ASSAYS, MOLECULAR_DEMO_CASE_SPECS, molecularDemoAddOnId, molecularDemoBlockId, molecularDemoSpecimenId,
  type MolecularDemoCaseSpec,
} from '../cases/demoMolecularCases';

const HOUR = 3_600_000;
const NOW = Date.now();
const hoursAgo = (h: number) => new Date(NOW - h * HOUR);
const iso = (h: number) => hoursAgo(h).toISOString();
const inDays = (d: number) => new Date(NOW + d * 24 * HOUR).toISOString();

const DANIEL = { byUserId: 'MT-001', byUserName: 'Daniel Kim' };
const MOLECULAR_STATION = { stationId: 'station-molecular-1', stationName: 'Molecular — Amplification Bay' };

/** The registry's lot numbers (mockReagentLotService.ts), as each run recorded them. */
export const MOLECULAR_DEMO_LOT_NUMBERS = {
  extraction: 'EX-2026-0412',
  hpvMasterMix: 'MM-2026-9310',
  egfrMasterMix: 'EGFR-MM-26104',
  egfrMasterMixExpired: 'EGFR-MM-26041',
  krasMasterMix: 'KRAS-MM-26102',
  krasMasterMixFailedQc: 'KRAS-MM-26087',
} as const;

const lots = (masterMix: string): MolecularReagentLot[] => [
  { componentType: 'EXTRACTION_BUFFER', lotNumber: MOLECULAR_DEMO_LOT_NUMBERS.extraction, expirationDate: inDays(120), qcStatus: 'signed_off' },
  { componentType: 'MASTER_MIX', lotNumber: masterMix, expirationDate: inDays(110), qcStatus: 'signed_off' },
];

/** The two controls each assay's control rule fixes at A01 and A02 (mockMolecularAssayControlRuleService.ts). */
const controls = (positiveLot: string): MolecularWell[] => [
  { wellPosition: 'A01', sampleType: 'CONTROL_NTC', controlInfo: { controlId: 'NTC-LOT-512', controlLotNumber: 'NTC-LOT-512', controlExpirationDate: inDays(150), expectedValue: 'NEGATIVE' } },
  { wellPosition: 'A02', sampleType: 'CONTROL_PTC_HIGH', controlInfo: { controlId: positiveLot, controlLotNumber: positiveLot, controlExpirationDate: inDays(150), expectedValue: 'POSITIVE' } },
];

const move = (from: MolecularMovementRecord['fromLevel'], to: MolecularMovementRecord['toLevel'], fromBarcode: string, toBarcode: string, h: number): MolecularMovementRecord =>
  ({ fromLevel: from, toLevel: to, fromBarcode, toBarcode, at: iso(h), ...DANIEL, ...MOLECULAR_STATION });

/** A patient well: the tube scanned into the extraction rack, then the extract into its well. */
function patientWell(position: string, accession: string, specimenUuid: string | undefined, tube: string, rack: string, plate: string, h: number, orderId?: string): MolecularWell {
  return {
    wellPosition: position, sampleType: 'PATIENT_SPECIMEN', accessionNumber: accession, specimenUuid, containerBarcode: tube, aliquotVolumeUl: 200,
    ...(orderId ? { orderId } : {}),
    movementHistory: [move('primary_vial', 'secondary_rack', tube, `${rack}:${position.slice(1)}`, h + 2), move('secondary_rack', 'plate_well', `${rack}:${position.slice(1)}`, `${plate}:${position}`, h)],
  };
}

const spec = (id: string) => MOLECULAR_DEMO_CASE_SPECS.find(s => s.id === id)!;
export const molecularDemoOrderId = (s: Pick<MolecularDemoCaseSpec, 'id'>) => `MO-2026-${s.id.slice(4)}-01`;
const curlsTube = (s: MolecularDemoCaseSpec) => generateSpecimenContainerBarcode(hoursAgo(s.orderedHoursAgo - 2), Number(s.id.slice(4)));

const result = (well: string, interpretation: MolecularWellResult['interpretation'], raw: MolecularWellResult['raw_data'], flag: MolecularWellResult['flag'] = 'NONE', patient?: { accession: string; specimenUuid?: string; orderId?: string }): MolecularWellResult => ({
  well_position: well, specimen_uuid: patient?.specimenUuid ?? null, ...(patient ? { accession_number: patient.accession } : {}),
  ...(patient?.orderId ? { order_id: patient.orderId } : {}), raw_data: raw, interpretation, flag,
});

// ── The completed HPV run (the two Paps' results) ───────────────────────────────────────────────────────────────────
const HPV = { assayCode: 'st-hpv-highrisk-screen', assayName: 'HPV High-Risk Screening' };
const HPV_PLATE = generateMolecularPlateBarcode(HPV.assayCode, hoursAgo(22), 746);
const HPV_RACK = 'RACK-MOLE-00745';
const PAP_VIALS = { 'S26-5001-CYT-001': generateSpecimenContainerBarcode(hoursAgo(24), 5001), 'S26-5002-CYT-001': generateSpecimenContainerBarcode(hoursAgo(72), 5002) } as const;

// ── EGFR and KRAS ───────────────────────────────────────────────────────────────────────────────────────────────────
const EGFR_PLATE = generateMolecularPlateBarcode(MOLECULAR_DEMO_ASSAYS.egfr.stainTypeId, hoursAgo(40), 747);
const KRAS_FAIL_PLATE = generateMolecularPlateBarcode(MOLECULAR_DEMO_ASSAYS.kras.stainTypeId, hoursAgo(100), 748);
const KRAS_REPEAT_PLATE = generateMolecularPlateBarcode(MOLECULAR_DEMO_ASSAYS.kras.stainTypeId, hoursAgo(96), 749);
const surgicalWell = (position: string, id: string, rack: string, plate: string, h: number) => {
  const s = spec(id);
  return patientWell(position, s.id, molecularDemoSpecimenId(s.id), curlsTube(s), rack, plate, h, molecularDemoOrderId(s));
};
const surgicalPatient = (id: string) => ({ accession: id, specimenUuid: molecularDemoSpecimenId(id), orderId: molecularDemoOrderId({ id }) });

export const MOLECULAR_RUN_HISTORY_BATCHES: MolecularBatch[] = [
  {
    id: 'mb-demo-746-hpv-done',
    batchBarcode: generateMolecularBatchBarcode(hoursAgo(22), 746), batchUuid: '4f6b2c1e-8a3d-4e57-9b02-746000000001',
    ...HPV, targetInstrumentId: 'PANTHER_02', deckSlot: 'SLOT_A4',
    plateUuid: '9d1e7a54-2c6b-4f38-8e0a-746000000011', plateBarcode: HPV_PLATE, plateLayout: '96_well',
    reagentLots: lots(MOLECULAR_DEMO_LOT_NUMBERS.hpvMasterMix),
    wells: [
      ...controls('PTC-LOT-977'),
      patientWell('A03', 'S26-5001-CYT-001', undefined, PAP_VIALS['S26-5001-CYT-001'], HPV_RACK, HPV_PLATE, 22),
      patientWell('A04', 'S26-5002-CYT-001', undefined, PAP_VIALS['S26-5002-CYT-001'], HPV_RACK, HPV_PLATE, 22),
    ],
    status: 'completed', createdAt: iso(22), createdByUserId: DANIEL.byUserId, createdByUserName: DANIEL.byUserName,
    worklistDispatchedAt: iso(21.5), controlsPassed: true, reviewStatus: 'AUTO_PASSED',
    results: [
      result('A01', 'NEGATIVE', { internal_control_ct: 27.5 }),
      result('A02', 'POSITIVE', { ct_value: 24.1, internal_control_ct: 27.9, rfu_signal: 4210 }),
      result('A03', 'NEGATIVE', { internal_control_ct: 28.3 }, 'NONE', { accession: 'S26-5001-CYT-001' }),
      result('A04', 'POSITIVE', { ct_value: 26.7, internal_control_ct: 28.0, rfu_signal: 3380 }, 'NONE', { accession: 'S26-5002-CYT-001' }),
    ],
  },
  {
    id: 'mb-demo-746-egfr-done',
    batchBarcode: generateMolecularBatchBarcode(hoursAgo(40), 747), batchUuid: '4f6b2c1e-8a3d-4e57-9b02-746000000002',
    assayCode: MOLECULAR_DEMO_ASSAYS.egfr.stainTypeId, assayName: MOLECULAR_DEMO_ASSAYS.egfr.name, targetInstrumentId: 'PCR_01',
    plateUuid: '9d1e7a54-2c6b-4f38-8e0a-746000000012', plateBarcode: EGFR_PLATE, plateLayout: '96_well',
    reagentLots: lots(MOLECULAR_DEMO_LOT_NUMBERS.egfrMasterMix),
    wells: [...controls('EGFR-PTC-0388'), surgicalWell('A03', 'S26-5208', 'RACK-MOLE-00746', EGFR_PLATE, 40), surgicalWell('A04', 'S26-5209', 'RACK-MOLE-00746', EGFR_PLATE, 40)],
    status: 'completed', createdAt: iso(40), createdByUserId: DANIEL.byUserId, createdByUserName: DANIEL.byUserName,
    worklistDispatchedAt: iso(39.5), controlsPassed: true, reviewStatus: 'AUTO_PASSED',
    results: [
      result('A01', 'NEGATIVE', { internal_control_ct: 29.1 }),
      result('A02', 'POSITIVE', { ct_value: 25.4, internal_control_ct: 28.8 }),
      result('A03', 'POSITIVE', { ct_value: 27.9, internal_control_ct: 29.0 }, 'NONE', surgicalPatient('S26-5208')),
      result('A04', 'NEGATIVE', { internal_control_ct: 28.6 }, 'NONE', surgicalPatient('S26-5209')),
    ],
  },
  {
    id: 'mb-demo-746-kras-fail',
    batchBarcode: generateMolecularBatchBarcode(hoursAgo(100), 748), batchUuid: '4f6b2c1e-8a3d-4e57-9b02-746000000003',
    assayCode: MOLECULAR_DEMO_ASSAYS.kras.stainTypeId, assayName: MOLECULAR_DEMO_ASSAYS.kras.name, targetInstrumentId: 'PCR_01',
    plateUuid: '9d1e7a54-2c6b-4f38-8e0a-746000000013', plateBarcode: KRAS_FAIL_PLATE, plateLayout: '96_well',
    reagentLots: lots(MOLECULAR_DEMO_LOT_NUMBERS.krasMasterMixFailedQc),
    wells: [...controls('KRAS-PTC-0215'), surgicalWell('A03', 'S26-5216', 'RACK-MOLE-00747', KRAS_FAIL_PLATE, 100)],
    status: 'superseded', createdAt: iso(100), createdByUserId: DANIEL.byUserId, createdByUserName: DANIEL.byUserName,
    worklistDispatchedAt: iso(99.5), controlsPassed: false, reviewStatus: 'BLOCKED',
    results: [
      result('A01', 'POSITIVE', { ct_value: 36.4, internal_control_ct: 29.2 }, 'REPEAT_REQUIRED'),
      result('A02', 'POSITIVE', { ct_value: 25.0, internal_control_ct: 28.7 }),
      result('A03', 'POSITIVE', { ct_value: 28.3, internal_control_ct: 29.4 }, 'REPEAT_REQUIRED', surgicalPatient('S26-5216')),
    ],
    supersededByBatchId: 'mb-demo-746-kras-repeat', supersededAt: iso(97), supersededByUserId: DANIEL.byUserId, supersededByUserName: DANIEL.byUserName,
    supersededReason: 'No-template control amplified (Ct 36.4), possible contamination. Repeated on a fresh plate with master mix lot KRAS-MM-26102.',
  },
  {
    id: 'mb-demo-746-kras-repeat',
    batchBarcode: generateMolecularBatchBarcode(hoursAgo(96), 749), batchUuid: '4f6b2c1e-8a3d-4e57-9b02-746000000004',
    assayCode: MOLECULAR_DEMO_ASSAYS.kras.stainTypeId, assayName: MOLECULAR_DEMO_ASSAYS.kras.name, targetInstrumentId: 'PCR_01',
    plateUuid: '9d1e7a54-2c6b-4f38-8e0a-746000000014', plateBarcode: KRAS_REPEAT_PLATE, plateLayout: '96_well',
    reagentLots: lots(MOLECULAR_DEMO_LOT_NUMBERS.krasMasterMix),
    wells: [...controls('KRAS-PTC-0215'), surgicalWell('A03', 'S26-5216', 'RACK-MOLE-00747', KRAS_REPEAT_PLATE, 96)],
    status: 'completed', createdAt: iso(96), createdByUserId: DANIEL.byUserId, createdByUserName: DANIEL.byUserName,
    worklistDispatchedAt: iso(95.5), controlsPassed: true, reviewStatus: 'AUTO_PASSED', clonedFromBatchId: 'mb-demo-746-kras-fail',
    results: [
      result('A01', 'NEGATIVE', { internal_control_ct: 28.9 }),
      result('A02', 'POSITIVE', { ct_value: 24.8, internal_control_ct: 28.5 }),
      result('A03', 'POSITIVE', { ct_value: 28.0, internal_control_ct: 29.1 }, 'NONE', surgicalPatient('S26-5216')),
    ],
  },
];

/** The run each resulted case's order came back on. */
const RESULTED_ON: Record<string, MolecularBatch> = {
  'S26-5208': MOLECULAR_RUN_HISTORY_BATCHES[1], 'S26-5209': MOLECULAR_RUN_HISTORY_BATCHES[1], 'S26-5216': MOLECULAR_RUN_HISTORY_BATCHES[3],
};

function orderFor(s: MolecularDemoCaseSpec): MolecularOrder {
  const assay = MOLECULAR_DEMO_ASSAYS[s.assay];
  const base: MolecularOrder = {
    orderId: molecularDemoOrderId(s), caseId: s.id, accession: s.id, specimenId: molecularDemoSpecimenId(s.id), specimenLabel: 'A',
    blockId: molecularDemoBlockId(s), blockLabel: s.blockLabel, assayTarget: assay.stainTypeId, assayName: assay.name, routing: 'IN_HOUSE',
    performingLabFacilityId: DESERT_VALLEY_LAB, stainOrderId: molecularDemoAddOnId(s),
    orderedBy: s.pathologist.id, orderedByName: s.pathologist.name, orderedAt: iso(s.orderedHoursAgo), status: 'QUEUED',
  };
  const run = RESULTED_ON[s.id];
  if (!s.result || !run) return base;
  const well = run.wells.find(w => w.orderId === base.orderId)!;
  const receivedAt = iso(s.id === 'S26-5216' ? 92 : 36);
  return {
    ...base, status: 'RESULTED',
    plate: { batchId: run.id, batchUuid: run.batchUuid, plateBarcode: run.plateBarcode, wellPosition: well.wellPosition },
    result: { interpretation: s.result, flag: 'NONE', controlsPassed: true, receivedAt, batchUuid: run.batchUuid },
    hydration: s.assay === 'egfr'
      ? { outcome: 'hydrated', instanceId: `${molecularDemoSpecimenId(s.id)}_lung_adeno_demo`, fieldId: 'egfr_status', at: receivedAt }
      : { outcome: 'notBound', at: receivedAt },
  };
}

/** Twelve waiting in-house orders and the three resulted ones. */
export const MOLECULAR_RUN_HISTORY_ORDERS: MolecularOrder[] = MOLECULAR_DEMO_CASE_SPECS.map(orderFor);
