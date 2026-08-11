// src/types/patients/BreakGlassReasonCode.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real feature, per direct confirmation, building Phase B of the
// "Interface Exception & Case-Binding Module": the standard reason
// code taxonomy for a Break-Glass rebind — attaching a Case created
// under a temporary/downtime placeholder identity (e.g.
// DOE^JOHN_1234) to the real, confirmed EHR patient once it's known.
//
// Deliberately a closed, real taxonomy rather than free text alone —
// a mandatory reason CODE (not just a note) is what makes this
// auditable and reportable across many rebind events, the same real
// reasoning behind every other closed reason-code list already in
// this app (e.g. discharge disposition, deficiency types).
// ─────────────────────────────────────────────────────────────────────────────

export type BreakGlassReasonCode =
  | 'OUTAGE_EHR'
  | 'OUTAGE_NETWORK'
  | 'DOWNTIME_PROCEDURE'
  | 'EMERGENCY_TRAUMA'
  | 'UNIDENTIFIED_PATIENT'
  | 'TYPO_DEMOGRAPHIC'
  | 'MISLABELED_SPECIMEN';

export interface BreakGlassReasonCodeOption {
  code: BreakGlassReasonCode;
  category: 'System & Network Outages (IT Operations)' | 'Clinical Emergency / Unidentified Patients' | 'Laboratory Administrative & Registration Corrections';
  label: string;
  description: string;
}

/** Real, standard taxonomy, per direct confirmation. Order matches
 *  the confirmed category grouping — used directly to group the real
 *  UI dropdown, not re-sorted or re-categorized here. */
export const BREAK_GLASS_REASON_CODES: BreakGlassReasonCodeOption[] = [
  {
    code: 'OUTAGE_EHR',
    category: 'System & Network Outages (IT Operations)',
    label: 'Registration / EHR System Outage',
    description: 'The hospital registration interface was down when the specimen arrived, requiring a local placeholder MRN.',
  },
  {
    code: 'OUTAGE_NETWORK',
    category: 'System & Network Outages (IT Operations)',
    label: 'Network / Interface Downtime',
    description: 'The network or interface engine (HL7 engine/broker) went offline, preventing ADT message propagation to PathScribe.',
  },
  {
    code: 'DOWNTIME_PROCEDURE',
    category: 'System & Network Outages (IT Operations)',
    label: 'Downtime Paper Requisitions',
    description: 'The case was grossed/accessioned using manual paper downtime forms during scheduled or unscheduled system downtime.',
  },
  {
    code: 'EMERGENCY_TRAUMA',
    category: 'Clinical Emergency / Unidentified Patients',
    label: 'Emergency / Trauma Admission',
    description: 'Rapid specimen delivery for an unidentified trauma/code patient (e.g., Trauma John Doe) where a permanent MRN was assigned post-procedure.',
  },
  {
    code: 'UNIDENTIFIED_PATIENT',
    category: 'Clinical Emergency / Unidentified Patients',
    label: 'Unidentified / Temporary Identity',
    description: 'Intraoperative frozen section or urgent biopsy received before formal patient registration in the HIS was complete.',
  },
  {
    code: 'TYPO_DEMOGRAPHIC',
    category: 'Laboratory Administrative & Registration Corrections',
    label: 'Typo / Data Entry Error at Accessioning',
    description: "Local clerk entered an incorrect local MRN or accession number during specimen check-in that needs manual correction to match the EHR order.",
  },
  {
    code: 'MISLABELED_SPECIMEN',
    category: 'Laboratory Administrative & Registration Corrections',
    label: 'Misidentified / Mislabeled Specimen Correction',
    description: "Clinical correction where a specimen was initially accessioned under the wrong patient's order, resolved after formal HIM/Lab Quality review.",
  },
];

/**
 * Real, confirmed UI rule: "Free-Text Justification (Min 10 chars):
 * If selecting an outage or error code, require a brief free-text
 * explanation." Deliberately applied to EVERY real reason code here,
 * not just the outage/error subset the rule names as examples — a
 * break-glass rebind is inherently rare and compliance-critical for
 * ALL seven real reasons (a MISLABELED_SPECIMEN correction needs the
 * HIM/Lab Quality ticket reference just as much as an outage needs
 * its own explanation), so requiring it universally closes a real gap
 * rather than leaving certain codes with a weaker audit trail than
 * others.
 */
export const BREAK_GLASS_MIN_NOTE_LENGTH = 10;
