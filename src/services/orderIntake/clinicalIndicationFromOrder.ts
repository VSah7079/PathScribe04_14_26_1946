// src/services/orderIntake/clinicalIndicationFromOrder.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 714: where the Clinical Indication on an order comes from.
//
// The ordering system states why the specimen was taken. On the wire that is
// HL7 v2 OBR-31 (Reason for Study), ORC-16 (Order Control Code Reason), the DG1
// diagnosis segments or a reason NTE; in FHIR R4 it is ServiceRequest.reasonCode
// or a reasonReference to a Condition. This one pure rule picks the text and
// names the field it came from, so the Accession screen can say "From the
// order: OBR-31 Reason for Study" and the Clinical-Pathologic Mismatch Check
// reads the ordering clinician's own words.
//
// CONTRACT, NOT AN INTERFACE. This repo has no inbound order parser: orders
// reach it already mapped to IncomingOrder by the interface engine / API
// server (docs/architecture/ACCESSIONING_API.md section 1a). The server team
// applies this rule when it builds IncomingOrder.clinicalIndication and
// IncomingOrder.clinicalIndicationSource. Nothing is invented: a source with
// no text is skipped, and when no source has text the result is null.
// ─────────────────────────────────────────────────────────────────────────────

/** Priority order (first source with text wins). Ids double as the locale key
 *  suffix under accessionPage.clinicalIndication.sources.*. */
export const CLINICAL_INDICATION_SOURCE_IDS = [
  'obr31', 'orc16', 'dg1', 'nte', 'fhirReasonCode', 'fhirReasonReference',
] as const;
export type ClinicalIndicationSourceId = typeof CLINICAL_INDICATION_SOURCE_IDS[number];

/** A coded value as received (HL7 CWE/CE, FHIR Coding): text first, then the display, then the code as given. */
export interface CodedText { text?: string; display?: string; code?: string }
/** A diagnosis as received (DG1-3 code, DG1-4 description). Code and description are joined only as given. */
export interface Dg1Diagnosis { code?: string; description?: string }
/** FHIR CodeableConcept. */
export interface FhirCodeableConcept { text?: string; coding?: CodedText[] }

/** What the interface engine extracted from one order. Every part is optional. */
export interface ClinicalIndicationCandidates {
  /** OBR-31 Reason for Study (repeats allowed). */
  obr31?: (string | CodedText)[];
  /** ORC-16 Order Control Code Reason. */
  orc16?: (string | CodedText)[];
  /** DG1 segments in message order. */
  dg1?: Dg1Diagnosis[];
  /** NTE text the sender marked as the reason for the order (not every NTE). */
  nte?: string[];
  /** FHIR ServiceRequest.reasonCode. */
  fhirReasonCode?: FhirCodeableConcept[];
  /** Text of the Conditions / Observations ServiceRequest.reasonReference points to (their code.text or display). */
  fhirReasonReference?: (string | FhirCodeableConcept)[];
}

export interface ClinicalIndicationFromOrder { text: string; source: ClinicalIndicationSourceId }

const clean = (s: string | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

const codedText = (v: string | CodedText): string =>
  typeof v === 'string' ? clean(v) : clean(v.text) || clean(v.display) || clean(v.code);

const concept = (v: string | FhirCodeableConcept): string => {
  if (typeof v === 'string') return clean(v);
  return clean(v.text) || (v.coding ?? []).map(codedText).filter(Boolean).join('; ');
};

const dg1Text = (d: Dg1Diagnosis): string => {
  const code = clean(d.code);
  const description = clean(d.description);
  return code && description ? `${description} (${code})` : description || code;
};

const join = (parts: string[], sep: string): string => [...new Set(parts.filter(Boolean))].join(sep);

/** The text each source would contribute (empty when it has none). */
function sourceText(id: ClinicalIndicationSourceId, c: ClinicalIndicationCandidates): string {
  switch (id) {
    case 'obr31': return join((c.obr31 ?? []).map(codedText), '; ');
    case 'orc16': return join((c.orc16 ?? []).map(codedText), '; ');
    case 'dg1': return join((c.dg1 ?? []).map(dg1Text), '; ');
    case 'nte': return join((c.nte ?? []).map(clean), ' ');
    case 'fhirReasonCode': return join((c.fhirReasonCode ?? []).map(concept), '; ');
    case 'fhirReasonReference': return join((c.fhirReasonReference ?? []).map(concept), '; ');
  }
}

/** The order's clinical indication and the field it came from, or null when no source carries text. */
export function clinicalIndicationFromOrder(candidates: ClinicalIndicationCandidates | null | undefined): ClinicalIndicationFromOrder | null {
  if (!candidates) return null;
  for (const source of CLINICAL_INDICATION_SOURCE_IDS) {
    const text = sourceText(source, candidates);
    if (text) return { text, source };
  }
  return null;
}
