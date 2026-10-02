// src/services/fieldRequirements/molecularBatchChecks.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-359, Batch 405. What the molecular plate builder needs before it acts,
// per the organisation's Field Requirements (page "molecularBatch"):
//   - creating a run                          molecularCreateMissing
//   - which patient wells lack their specimen molecularWellsMissingSpecimen
//   - superseding a run                       molecularSupersedeMissing
// Well rules apply per well: patient wells for the specimen and volume,
// control wells for the lot number and expiry. The locked ones are enforced in
// services/molecular/mockMolecularBatchService.ts too.
//
// Pure.
// ─────────────────────────────────────────────────────────────────────────────

import {
  missingRequiredFields, resolveFieldRequirements, isFieldRequired,
  type FieldGroup, type ResolvedFieldRequirement,
} from './fieldRequirementRules';
import type { MolecularWell, MolecularReagentLot } from '../molecular/IMolecularBatchService';

export const MOLECULAR_BATCH_DEFAULT_REQUIREMENTS: readonly ResolvedFieldRequirement[] = resolveFieldRequirements('molecularBatch');

const filled = (v: string | undefined | null): string => (v ?? '').trim();
const inGroup = (requirements: readonly ResolvedFieldRequirement[], group: FieldGroup) =>
  requirements.filter(f => f.group === group);
const CONTROL_TYPES = ['CONTROL_NTC', 'CONTROL_PTC_HIGH', 'CONTROL_PTC_LOW', 'CALIBRATOR'];

export function molecularFieldRequired(requirements: readonly ResolvedFieldRequirement[], fieldId: string): boolean {
  return isFieldRequired(requirements, fieldId);
}

const isPatient = (w: MolecularWell) => w.sampleType === 'PATIENT_SPECIMEN';
const isControl = (w: MolecularWell) => !!w.sampleType && CONTROL_TYPES.includes(w.sampleType);
/** A patient well names its specimen by container barcode or accession. */
export const wellHasSpecimen = (w: MolecularWell): boolean => !!(filled(w.containerBarcode) || filled(w.accessionNumber));
const wellHasVolume = (w: MolecularWell): boolean => typeof w.aliquotVolumeUl === 'number' && w.aliquotVolumeUl > 0;
const wellHasControlLot = (w: MolecularWell): boolean => !!(filled(w.controlInfo?.controlLotNumber) && filled(w.controlInfo?.controlExpirationDate));

/** The patient wells (positions) that don't name their specimen. */
export function molecularWellsMissingSpecimen(wells: readonly MolecularWell[]): string[] {
  return wells.filter(w => isPatient(w) && !wellHasSpecimen(w)).map(w => w.wellPosition);
}

export interface MolecularCreateValues {
  assayCode: string;
  assayName: string;
  targetInstrumentId: string;
  deckSlot?: string;
  reagentLots: readonly MolecularReagentLot[];
  wells: readonly MolecularWell[];
}

/** Creating a run. */
export function molecularCreateMissing(v: MolecularCreateValues, requirements: readonly ResolvedFieldRequirement[]): string[] {
  const patients = v.wells.filter(isPatient);
  const controls = v.wells.filter(isControl);
  const ok = 'yes';
  return missingRequiredFields([...inGroup(requirements, 'molecularRun'), ...inGroup(requirements, 'molecularWells')], {
    assayCode: filled(v.assayCode),
    assayName: filled(v.assayName),
    targetInstrument: filled(v.targetInstrumentId),
    deckSlot: filled(v.deckSlot),
    reagentLots: v.reagentLots.length > 0 ? ok : '',
    patientSpecimen: patients.every(wellHasSpecimen) ? ok : '',
    aliquotVolume: patients.every(wellHasVolume) ? ok : '',
    controlLotInfo: controls.every(wellHasControlLot) ? ok : '',
  }).map(f => f.id);
}

/** Superseding a run. */
export function molecularSupersedeMissing(reason: string | null | undefined, requirements: readonly ResolvedFieldRequirement[]): string[] {
  return missingRequiredFields(inGroup(requirements, 'molecularSupersede'), { supersedeReason: filled(reason) }).map(f => f.id);
}
