// src/services/screeningRegistry/screeningRegistryDefinitions.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 414 (PS-359; Pete: "First release so kind of need to support them
// all, or at least flexible enough so the engine can be implemented").
//
// Every cervical screening registry PathScribe can report to, as data: one
// definition per programme, and one engine (screeningRegistryEngine.ts) that
// reads it. A country is a definition plus the lab's configuration (code
// mappings), never new dispatch code. Each definition says:
//
//   • where it applies (jurisdictions) and what it takes (GYN only);
//   • the patient identifier it keys on, from IDENTIFIER_FORMAT_LIBRARY
//     (a submission whose MRN doesn't look like that identifier is held);
//   • how results are coded: a built-in coder PathScribe already has
//     (CSMS action code, NCSR LOINC result codes, PALGA's CISOE-A score),
//     or the lab's own code-mapping table from the programme's
//     specification (screeningRegistryConfig), or the result text;
//   • the wire format the interface engine turns PathScribe's structured
//     payload into (PathScribe never writes the wire format itself);
//   • whether it was built from the programme's published specification
//     ('verified') or is ready for the lab to configure from theirs
//     ('configurable': confirm codes and format with the programme first).
//
// The US has no national cervical screening registry, so it has none.
// Canada screens province by province: one definition, pointed at each
// province's programme by a facility override.
// ─────────────────────────────────────────────────────────────────────────────

import type { Jurisdiction } from '@/types/systemConfig';

export type ScreeningRegistryId =
  | 'csms_uk' | 'nicsp_northern_ireland' | 'sccrs_scotland' | 'cervicalcheck_ireland'
  | 'palga_netherlands' | 'germany_okfe' | 'france_crcdc' | 'belgium_chr'
  | 'ncsr_australia' | 'ncsp_new_zealand' | 'canada_provincial' | 'kncsp_kccr_korea';

/** The review fields a lab can map to a programme's own codes. */
export type RegistryCodedField = 'adequacy' | 'primaryInterpretation' | 'additionalInterpretation' | 'recommendation';

export interface ScreeningRegistryDefinition {
  id: ScreeningRegistryId;
  /** Locale key suffix under screeningRegistry.registries. */
  labelId: string;
  jurisdictions: Jurisdiction[];
  programme: 'cervical';
  eligibility: { gynOnly: boolean };
  /** IDENTIFIER_FORMAT_LIBRARY id of the national identifier it keys on; absent = the MRN is accepted. */
  patientIdentifierFormatId?: string;
  resultCoding: 'builtIn' | 'mappingTable' | 'text';
  /** resultCoding 'builtIn': which coder. */
  builtIn?: 'csms_uk' | 'palga_netherlands' | 'ncsr_australia';
  /** The fields the programme expects coded (mapping table), when the lab requires codes. */
  codedFields: RegistryCodedField[];
  wireFormat: 'hl7v2_oru' | 'fhir' | 'batch_file' | 'programme_module';
  specStatus: 'verified' | 'configurable';
  /** A case-level flag the registry needs raised, e.g. CSMS's missing reason for study (f36). */
  eligibilityFlag?: { when: 'missingReasonForStudy'; flagDefinitionId: string };
}

const CODED_ALL: RegistryCodedField[] = ['adequacy', 'primaryInterpretation', 'additionalInterpretation', 'recommendation'];

export const SCREENING_REGISTRY_DEFINITIONS: readonly ScreeningRegistryDefinition[] = [
  // United Kingdom
  { id: 'csms_uk', labelId: 'csmsUk', jurisdictions: ['GB_EW'], programme: 'cervical', eligibility: { gynOnly: true },
    patientIdentifierFormatId: 'mrn_nhs', resultCoding: 'builtIn', builtIn: 'csms_uk', codedFields: CODED_ALL,
    wireFormat: 'hl7v2_oru', specStatus: 'verified', eligibilityFlag: { when: 'missingReasonForStudy', flagDefinitionId: 'f36' } },
  { id: 'nicsp_northern_ireland', labelId: 'nicspNorthernIreland', jurisdictions: ['GB_NIR'], programme: 'cervical', eligibility: { gynOnly: true },
    patientIdentifierFormatId: 'mrn_hc', resultCoding: 'mappingTable', codedFields: CODED_ALL, wireFormat: 'hl7v2_oru', specStatus: 'configurable' },
  { id: 'sccrs_scotland', labelId: 'sccrsScotland', jurisdictions: ['GB_SCT'], programme: 'cervical', eligibility: { gynOnly: true },
    patientIdentifierFormatId: 'mrn_chi', resultCoding: 'mappingTable', codedFields: CODED_ALL, wireFormat: 'hl7v2_oru', specStatus: 'configurable' },
  // Ireland
  { id: 'cervicalcheck_ireland', labelId: 'cervicalCheckIreland', jurisdictions: ['IE'], programme: 'cervical', eligibility: { gynOnly: true },
    resultCoding: 'text', codedFields: CODED_ALL, wireFormat: 'hl7v2_oru', specStatus: 'configurable' },
  // Europe
  { id: 'palga_netherlands', labelId: 'palgaNetherlands', jurisdictions: ['NL'], programme: 'cervical', eligibility: { gynOnly: true },
    patientIdentifierFormatId: 'mrn_bsn', resultCoding: 'builtIn', builtIn: 'palga_netherlands', codedFields: [], wireFormat: 'programme_module', specStatus: 'verified' },
  { id: 'germany_okfe', labelId: 'germanyOkfe', jurisdictions: ['DE'], programme: 'cervical', eligibility: { gynOnly: true },
    patientIdentifierFormatId: 'mrn_kvnr', resultCoding: 'mappingTable', codedFields: CODED_ALL, wireFormat: 'batch_file', specStatus: 'configurable' },
  { id: 'france_crcdc', labelId: 'franceCrcdc', jurisdictions: ['FR'], programme: 'cervical', eligibility: { gynOnly: true },
    patientIdentifierFormatId: 'mrn_ins', resultCoding: 'mappingTable', codedFields: CODED_ALL, wireFormat: 'batch_file', specStatus: 'configurable' },
  { id: 'belgium_chr', labelId: 'belgiumChr', jurisdictions: ['BE'], programme: 'cervical', eligibility: { gynOnly: true },
    patientIdentifierFormatId: 'mrn_be', resultCoding: 'mappingTable', codedFields: CODED_ALL, wireFormat: 'batch_file', specStatus: 'configurable' },
  // Asia-Pacific
  { id: 'ncsr_australia', labelId: 'ncsrAustralia', jurisdictions: ['AU'], programme: 'cervical', eligibility: { gynOnly: true },
    patientIdentifierFormatId: 'mrn_ihi', resultCoding: 'builtIn', builtIn: 'ncsr_australia', codedFields: [], wireFormat: 'hl7v2_oru', specStatus: 'verified' },
  { id: 'ncsp_new_zealand', labelId: 'ncspNewZealand', jurisdictions: ['NZ'], programme: 'cervical', eligibility: { gynOnly: true },
    patientIdentifierFormatId: 'mrn_nhi', resultCoding: 'mappingTable', codedFields: CODED_ALL, wireFormat: 'hl7v2_oru', specStatus: 'configurable' },
  { id: 'kncsp_kccr_korea', labelId: 'kncspKccrKorea', jurisdictions: ['KR'], programme: 'cervical', eligibility: { gynOnly: true },
    resultCoding: 'text', codedFields: CODED_ALL, wireFormat: 'hl7v2_oru', specStatus: 'configurable' },
  // North America
  { id: 'canada_provincial', labelId: 'canadaProvincial', jurisdictions: ['CA'], programme: 'cervical', eligibility: { gynOnly: true },
    resultCoding: 'mappingTable', codedFields: CODED_ALL, wireFormat: 'hl7v2_oru', specStatus: 'configurable' },
];

export function screeningRegistryDefinition(id: string | undefined): ScreeningRegistryDefinition | undefined {
  return SCREENING_REGISTRY_DEFINITIONS.find(d => d.id === id);
}

/** The registries for a jurisdiction first, then the rest (a lab may report across a border). */
export function screeningRegistriesFor(jurisdiction: Jurisdiction | undefined): ScreeningRegistryDefinition[] {
  const mine = SCREENING_REGISTRY_DEFINITIONS.filter(d => jurisdiction && d.jurisdictions.includes(jurisdiction));
  return [...mine, ...SCREENING_REGISTRY_DEFINITIONS.filter(d => !mine.includes(d))];
}
