// src/services/cancerRegistry/cancerRegistryDefinitions.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 422 (Registry Engine SRS v2.1, step 6). Every population cancer
// registry PathScribe can report to, as data, the way the screening
// programmes have been since Batch 414: where it applies, the national
// patient identifier it keys on, the wire format the interface engine
// (ForMedrixAI's, shipped with PathScribe; Batch 424 correction) turns
// PathScribe's canonical JSON into, and whether its
// specification has been signed off.
//
// Batch 422 adds the five the SRS found missing:
//   ncri_ireland            National Cancer Registry Ireland
//   phs_scotland            Public Health Scotland (Scottish Cancer Registry)
//   nicr_northern_ireland   Northern Ireland Cancer Registry
//   nkr_netherlands         Nederlandse Kankerregistratie (IKNL); PALGA is the
//                           pathology archive that feeds it, not the registry
//   bcr_belgium             Belgian Cancer Registry (Stichting Kankerregister)
//
// Every definition is 'configurable': identifiers and wire formats are as the
// SRS Appendix A lists them, from public descriptions; each must be confirmed
// by the JCP's sign-off lead against the registry's own specification
// (SRS FR-008.10) before it is marked 'verified'. Nothing here is a claim that
// a registry has accepted a PathScribe submission.
// ─────────────────────────────────────────────────────────────────────────────

import type { Jurisdiction } from '@/types/systemConfig';

export type CancerRegistryDefinitionId =
  | 'naaccr_us' | 'epath_npcr_us' | 'cpac_canada'
  | 'cosd_uk' | 'phs_scotland' | 'nicr_northern_ireland' | 'ncri_ireland'
  | 'nkr_netherlands' | 'inca_france' | 'adt_gekid_germany' | 'bcr_belgium'
  | 'aihw_australia' | 'nz_cancer_registry' | 'kccr_korea';

export type CancerRegistryWireFormat = 'naaccr_xml' | 'hl7v2_oru' | 'cosd_xml' | 'obds_xml' | 'cda_cr_acp' | 'hd_s4s_json' | 'palga_protocol';

/** Batch 425: data a registry will not take a report without. A report missing any is held
 *  (HOLD_MISSING_MANDATORY_DATA, cancerRegistryMandatoryData.ts); sign-out never waits for it. */
export type CancerRegistryMandatoryField = 'patientIdentifier' | 'dateOfBirth' | 'diagnosisDate' | 'primaryDiagnosis' | 'icdOCode';

export interface CancerRegistryDefinition {
  id: CancerRegistryDefinitionId;
  /** Locale key suffix under cancerRegistrySection.registries. */
  labelId: string;
  jurisdictions: Jurisdiction[];
  /** IDENTIFIER_FORMAT_LIBRARY id of the national identifier it keys on; absent = matched on demographics. */
  patientIdentifierFormatId?: string;
  wireFormat: CancerRegistryWireFormat;
  specStatus: 'verified' | 'configurable';
  /** Batch 425: what the registry requires. Like the identifiers, to be confirmed against each
   *  registry's own specification at sign-off (SRS FR-008.10). */
  mandatoryFields: CancerRegistryMandatoryField[];
}

/** Every registry needs the diagnosis, its date, an ICD-O code and the date of birth; one keyed on a
 *  national identifier needs that identifier too (verified, or at least the right format). */
const BASE: CancerRegistryMandatoryField[] = ['dateOfBirth', 'diagnosisDate', 'primaryDiagnosis', 'icdOCode'];
const KEYED: CancerRegistryMandatoryField[] = ['patientIdentifier', ...BASE];

export const CANCER_REGISTRY_DEFINITIONS: readonly CancerRegistryDefinition[] = [
  // North America
  { id: 'naaccr_us', labelId: 'naaccrUs', jurisdictions: ['US'], wireFormat: 'naaccr_xml', specStatus: 'configurable', mandatoryFields: BASE },
  // Batch 620 (part E, PS-800): real-time electronic pathology to the state registry (NPCR ePath, HL7 v2.5.1) with a state profile (services/usEpath/).
  { id: 'epath_npcr_us', labelId: 'epathNpcrUs', jurisdictions: ['US'], wireFormat: 'hl7v2_oru', specStatus: 'configurable', mandatoryFields: BASE },
  { id: 'cpac_canada', labelId: 'cpacCanada', jurisdictions: ['CA'], patientIdentifierFormatId: 'id_ca_phn', wireFormat: 'naaccr_xml', specStatus: 'configurable', mandatoryFields: KEYED },
  // United Kingdom and Ireland
  { id: 'cosd_uk', labelId: 'cosdUk', jurisdictions: ['GB_EW'], patientIdentifierFormatId: 'mrn_nhs', wireFormat: 'cosd_xml', specStatus: 'configurable', mandatoryFields: KEYED },
  { id: 'phs_scotland', labelId: 'phsScotland', jurisdictions: ['GB_SCT'], patientIdentifierFormatId: 'mrn_chi', wireFormat: 'hl7v2_oru', specStatus: 'configurable', mandatoryFields: KEYED },
  { id: 'nicr_northern_ireland', labelId: 'nicrNorthernIreland', jurisdictions: ['GB_NIR'], patientIdentifierFormatId: 'mrn_hc', wireFormat: 'hl7v2_oru', specStatus: 'configurable', mandatoryFields: KEYED },
  { id: 'ncri_ireland', labelId: 'ncriIreland', jurisdictions: ['IE'], patientIdentifierFormatId: 'id_ie_ihi', wireFormat: 'hl7v2_oru', specStatus: 'configurable', mandatoryFields: KEYED },
  // Europe
  { id: 'nkr_netherlands', labelId: 'nkrNetherlands', jurisdictions: ['NL'], patientIdentifierFormatId: 'mrn_bsn', wireFormat: 'palga_protocol', specStatus: 'configurable', mandatoryFields: KEYED },
  { id: 'inca_france', labelId: 'incaFrance', jurisdictions: ['FR'], patientIdentifierFormatId: 'mrn_ins', wireFormat: 'cda_cr_acp', specStatus: 'configurable', mandatoryFields: KEYED },
  { id: 'adt_gekid_germany', labelId: 'adtGekidGermany', jurisdictions: ['DE'], patientIdentifierFormatId: 'mrn_kvnr', wireFormat: 'obds_xml', specStatus: 'configurable', mandatoryFields: KEYED },
  { id: 'bcr_belgium', labelId: 'bcrBelgium', jurisdictions: ['BE'], patientIdentifierFormatId: 'mrn_be', wireFormat: 'hd_s4s_json', specStatus: 'configurable', mandatoryFields: KEYED },
  // Asia-Pacific
  { id: 'aihw_australia', labelId: 'aihwAustralia', jurisdictions: ['AU'], patientIdentifierFormatId: 'mrn_ihi', wireFormat: 'hl7v2_oru', specStatus: 'configurable', mandatoryFields: KEYED },
  { id: 'nz_cancer_registry', labelId: 'nzCancerRegistry', jurisdictions: ['NZ'], patientIdentifierFormatId: 'mrn_nhi', wireFormat: 'hl7v2_oru', specStatus: 'configurable', mandatoryFields: KEYED },
  // KCCR: the RRN is processed only under statutory authority (PIPA); left to the lab to confirm, so not keyed on here.
  { id: 'kccr_korea', labelId: 'kccrKorea', jurisdictions: ['KR'], wireFormat: 'hl7v2_oru', specStatus: 'configurable', mandatoryFields: BASE },
];

export function cancerRegistryDefinition(id: string | undefined): CancerRegistryDefinition | undefined {
  return CANCER_REGISTRY_DEFINITIONS.find(d => d.id === id);
}

/** The registries for a jurisdiction first, then the rest (a lab may report across a border). */
export function cancerRegistriesFor(jurisdiction: Jurisdiction | undefined): CancerRegistryDefinition[] {
  const mine = CANCER_REGISTRY_DEFINITIONS.filter(d => jurisdiction && d.jurisdictions.includes(jurisdiction));
  return [...mine, ...CANCER_REGISTRY_DEFINITIONS.filter(d => !mine.includes(d))];
}
