// src/services/usEpath/epathProfile.ts
// ─────────────────────────────────────────────────────────────────────
// Batch 620 (part E, PS-800, Pete Oct 19): US electronic pathology (ePath) reporting. One base message
// (NPCR ePath, HL7 v2.5.1: hl7/epathBuilder.ts) plus a STATE PROFILE per jurisdiction. A profile says which
// fields a state requires, which it accepts, how it is reached, which checks run before a case is released, and
// where the state's own codes replace the base ones. Adding a state means adding a profile, not changing the builder.
//
// Only ONE profile ships, and it is an EXAMPLE (example: true, state 'XX'): it shows the shape and makes no claim
// about any state's requirements. Each real profile must be written from that state's published specification.
//
// PathScribe holds the profile and the destination settings and checks a case against them; the interface engine does
// the transport (epathTransport.ts). Contract: docs/architecture/US_EPATH_API.md. Pure.
// ─────────────────────────────────────────────────────────────────────

/** How the state is reached. The engine owns the transport; PathScribe holds the label and the status. */
export const EPATH_TRANSPORTS = ['phinMs', 'sftp', 'directTcp', 'httpsApi'] as const;
export type EpathTransportKind = (typeof EPATH_TRANSPORTS)[number];

/** The checks a profile can switch on (fixed ids; the screen translates them). */
export const EPATH_RULE_IDS = [
  'icdOMorphologyRequired', 'snomedRequired', 'specimenIdentifierRequired', 'finalReportOnly', 'providerNpiRequired',
] as const;
export type EpathRuleId = (typeof EPATH_RULE_IDS)[number];

/** Which facility decides the state when the technical work was done somewhere other than the reading lab (PS-336). */
export const EPATH_FACILITY_BASES = ['technicalComponent', 'reading'] as const;
export type EpathFacilityBasis = (typeof EPATH_FACILITY_BASES)[number];

/** 'fixed' puts the state's own value in the field; 'required' only insists the field is filled. */
export const EPATH_EXTENSION_MODES = ['required', 'fixed'] as const;
export type EpathExtensionMode = (typeof EPATH_EXTENSION_MODES)[number];

export interface EpathExtension { field: string; mode: EpathExtensionMode; value?: string }

export interface EpathStateProfile {
  id: string;
  /** Two-letter US state or territory code; 'XX' only on the example profile. */
  state: string;
  /** The shipped example: shows the shape, claims no state's requirements. */
  example: boolean;
  /** A label an administrator gives it (data; the example profile has none and the screen words it). */
  name: string;
  /** Fields (SEG-n, never MSH) that must be filled. */
  requiredFields: string[];
  /** Fields the state accepts when present. */
  optionalFields: string[];
  transport: EpathTransportKind;
  validationRules: EpathRuleId[];
  extensions: EpathExtension[];
  facilityBasis: EpathFacilityBasis;
  updatedAt: string;
}

export type EpathProfileInput = Omit<EpathStateProfile, 'id' | 'updatedAt' | 'example'> & { id?: string };

/** A profile chosen for the whole enterprise (facilityId null) or for one performing facility. */
export interface EpathProfileAssignment { id: string; facilityId: string | null; profileId: string; updatedAt: string }
export type EpathAssignmentInput = Pick<EpathProfileAssignment, 'facilityId' | 'profileId'>;

export const EPATH_FIELD_PATTERN = /^(PID|PV1|ORC|OBR|OBX|SPM|NTE)-([1-9]\d{0,2})$/;
export const EPATH_STATE_PATTERN = /^[A-Z]{2}$/;

export const EXAMPLE_PROFILE_ID = 'example-us';

/** The shipped example. It is a shape, not a state's rules. */
export const exampleProfile = (at: string): EpathStateProfile => ({
  id: EXAMPLE_PROFILE_ID, state: 'XX', example: true, name: '',
  requiredFields: ['PID-3', 'PID-5', 'PID-7', 'PID-8', 'PID-11', 'OBR-3', 'OBR-4', 'OBR-7', 'OBR-25'],
  optionalFields: ['PV1-2', 'PID-10', 'OBR-16'],
  transport: 'phinMs',
  validationRules: ['icdOMorphologyRequired', 'snomedRequired', 'specimenIdentifierRequired', 'finalReportOnly'],
  extensions: [{ field: 'OBR-4', mode: 'fixed', value: 'EXAMPLE^Example service code^L' }],
  facilityBasis: 'technicalComponent',
  updatedAt: at,
});

export const seedProfiles = (at: string): EpathStateProfile[] => [exampleProfile(at)];

export type EpathProfileProblem =
  | 'stateInvalid' | 'fieldInvalid' | 'fieldOverlap' | 'transportInvalid' | 'ruleInvalid' | 'extensionInvalid' | 'fixedValueRequired' | 'facilityBasisInvalid';

/** What is wrong with a profile, as fixed codes (empty = valid). The example profile alone may use state 'XX'. */
export function validateProfile(p: Pick<EpathStateProfile, 'state' | 'requiredFields' | 'optionalFields' | 'transport' | 'validationRules' | 'extensions' | 'facilityBasis'> & { example?: boolean }): EpathProfileProblem[] {
  const out = new Set<EpathProfileProblem>();
  if (!(EPATH_STATE_PATTERN.test(p.state) && (p.state !== 'XX' || p.example))) out.add('stateInvalid');
  for (const f of [...p.requiredFields, ...p.optionalFields]) if (!EPATH_FIELD_PATTERN.test(f)) out.add('fieldInvalid');
  if (p.requiredFields.some(f => p.optionalFields.includes(f))) out.add('fieldOverlap');
  if (!EPATH_TRANSPORTS.includes(p.transport)) out.add('transportInvalid');
  if (p.validationRules.some(r => !EPATH_RULE_IDS.includes(r))) out.add('ruleInvalid');
  if (!EPATH_FACILITY_BASES.includes(p.facilityBasis)) out.add('facilityBasisInvalid');
  for (const e of p.extensions) {
    if (!EPATH_FIELD_PATTERN.test(e.field) || !EPATH_EXTENSION_MODES.includes(e.mode)) out.add('extensionInvalid');
    else if (e.mode === 'fixed' && !(e.value ?? '').trim()) out.add('fixedValueRequired');
  }
  return [...out];
}

/** A profile keyed in its stored form: fields upper-cased and de-duplicated, empty entries dropped. */
export function normalizeFieldList(list: readonly string[]): string[] {
  return [...new Set(list.map(f => f.trim().toUpperCase()).filter(Boolean))];
}
