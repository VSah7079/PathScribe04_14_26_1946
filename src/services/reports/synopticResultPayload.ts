// src/services/reports/synopticResultPayload.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 426 (Pete and his developer, Oct 1 2026: "Assist Synoptic Dispatch",
// schema v1.0.0). One synoptic workup (a SynopticReportInstance) as the
// structured result the interface engine maps into the LIS: OBX segments or
// FHIR Observations. Both modes use it:
//   - Assist: it IS the result. Sent on Finalize, and on each correction and
//     addendum (dispatchAssistSynopticResult.ts). There's no formal report;
//     the LIS puts this into its own.
//   - Orchestration: carried alongside the ORU^R01's narrative and report PDF
//     (buildOruR01Payload.ts `synopticResult`).
//
// Pure. What it carries:
//   header        ids and versions:
//                 - the workup's own id;
//                 - its version and status (FINAL / CORRECTED / ADDENDUM);
//                 - the id of the workup's PDF (one PDF per workup), so the
//                   LIS replaces exactly this workup and nothing else;
//                 - the LIS's placer and filler order numbers, echoed back;
//                 - the template and its version;
//                 - the signer and their NPI.
//   patient_context  MRN and encounter only (name and birth date stay out;
//                 the accession and MRN bind the record).
//   specimens     every part the workup covers. For each: its codes, every
//                 one with its system and version, and, in Assist only,
//                 SUGGESTED CPT codes without modifiers (Pete: the LIS owns
//                 billing in Assist; in Orchestration charges go on
//                 PathScribe's own billing feed, so none here).
//   staging       pT / pN / pM / FIGO, read from the template fields tagged
//                 with that reporting role, coded with the chosen answer's
//                 SNOMED CT concept. Null when the template has no such field.
//   synoptic_observations  one per answered field: value, unit, SNOMED (the
//                 field's concept and the chosen answer's), the block a field
//                 names (reporting role 'block'), and whether the pathologist
//                 changed what the AI suggested.
//
// Code system versions come from the deployment (codeVersions); a version
// nobody has set is null, never guessed.
// ─────────────────────────────────────────────────────────────────────────────

export const SYNOPTIC_PAYLOAD_SCHEMA_VERSION = '1.0.0';

/** Template fields can be tagged with what they report (Batch 426). */
export type SynopticReportingRole = 'pT' | 'pN' | 'pM' | 'figo' | 'block';
export const SYNOPTIC_REPORTING_ROLES: SynopticReportingRole[] = ['pT', 'pN', 'pM', 'figo', 'block'];

export type WorkupStatus = 'FINAL' | 'CORRECTED' | 'ADDENDUM';

export interface CodeSystemVersions { snomed?: string; icd10?: string; icdO?: string }

interface TemplateOptionLike { id: string; label: string; snomed?: string }
interface TemplateFieldLike {
  id: string; label: string; type: string; snomed?: string; unit?: string;
  reportingRole?: SynopticReportingRole; options?: TemplateOptionLike[];
}
export interface TemplateLike {
  id: string; name?: string; version?: string; ajccEdition?: string;
  sections: { fields: TemplateFieldLike[] }[];
}
interface SpecimenLike {
  id: string; label?: string; description?: string; displayId?: string;
  coding?: { cpt?: string[]; icd10?: { code: string; description: string }[]; snomed?: { code: string; description: string }[]; icdO?: { code: string; description: string }[] };
}
export interface CaseLike {
  id: string;
  encounterId?: string;
  accession?: { accessionNumber?: string; fullAccession?: string };
  patient?: { mrn?: string };
  order?: { placerOrderNumber?: string; fillerOrderNumber?: string; externalOrderId?: string };
  specimens?: SpecimenLike[];
}
export interface InstanceLike {
  instanceId: string;
  specimenId: string;
  /** Batch 426: further parts one workup covers (a resection protocol spanning containers). */
  additionalSpecimenIds?: string[];
  templateId: string;
  templateName?: string;
  answers?: Record<string, string | string[]>;
  aiSuggestions?: Record<string, { value: string | string[]; verification?: string }>;
}

export interface CodedValue { code: string; display: string; system: string; version: string | null }

export interface SynopticObservation {
  field_id: string;
  label: string;
  value: string | string[];
  unit: string | null;
  block_id: string | null;
  snomed: { concept_code: string | null; value_code: string | null; value_codes?: string[]; system: 'SNOMED CT'; version: string | null } | null;
  /** True when the pathologist's answer differs from the AI's suggestion, or they disputed it. */
  overridden: boolean;
  /** True when the AI suggested a value for this field at all. */
  ai_suggested: boolean;
}

export interface SynopticResultPayloadV1 {
  $schema_version: string;
  mode: 'assist' | 'orchestrator';
  header: {
    pathscribe_report_id: string;
    /** The PDF this workup's version is in: its own (one PDF per workup), the case's combined PDF (Batch 427,
     *  a site that takes one PDF per accession), or null when the only PDF is Orchestration's full report. */
    pdf_document_id: string | null;
    accession_number: string;
    placer_order_number: string | null;
    filler_order_number: string | null;
    specimen_ids: string[];
    workup_status: WorkupStatus;
    workup_version: number;
    template: { id: string; name: string | null; version: string | null };
    signature: { signer_id: string; npi: string | null; signed_timestamp: string };
  };
  patient_context: { mrn: string | null; encounter_id: string | null };
  specimens: {
    specimen_id: string;
    description: string | null;
    snomed: CodedValue[];
    icd10: CodedValue[];
    icd_o_3: CodedValue[];
    suggested_cpt_codes?: { code: string }[];
  }[];
  staging: {
    ajcc_edition: string | null;
    pT: { value: string; snomed: string | null } | null;
    pN: { value: string; snomed: string | null } | null;
    pM: { value: string; snomed: string | null } | null;
    figo: { value: string; snomed: string | null } | null;
  };
  synoptic_observations: SynopticObservation[];
}

export interface BuildSynopticResultInput {
  mode: 'assist' | 'orchestrator';
  caseData: CaseLike;
  instance: InstanceLike;
  template: TemplateLike | null;
  workup: { status: WorkupStatus; version: number };
  signer: { id: string; npi?: string; signedAt: string };
  codeVersions?: CodeSystemVersions;
  /** Batch 427: the PDF this version is in, when it isn't the workup's own (see header.pdf_document_id). */
  pdfDocumentId?: string | null;
}

/** The workup's stable id: the same for every version, so the LIS can replace it. */
export const workupReportId = (caseId: string, instanceId: string) => `PSR-${caseId}-${instanceId}`;
/** Batch 427: the id of one version of a case's combined PDF (every workup in one document). */
export const casePdfDocumentId = (caseId: string, version: number) => `PSR-${caseId}-CASE-V${version}`;
/** The id of one version's PDF. */
export const workupPdfDocumentId = (caseId: string, instanceId: string, version: number) => `${workupReportId(caseId, instanceId)}-V${version}`;

const isEmpty = (v: string | string[] | undefined) => v === undefined || v === '' || (Array.isArray(v) && v.length === 0);
const same = (a: unknown, b: unknown) => JSON.stringify(Array.isArray(a) ? [...a].sort() : a) === JSON.stringify(Array.isArray(b) ? [...b].sort() : b);

function coded(list: { code: string; description: string }[] | undefined, system: string, version: string | undefined): CodedValue[] {
  return (list ?? []).filter(c => c.code).map(c => ({ code: c.code, display: c.description ?? '', system, version: version || null }));
}

/** A field's answer as labels (choice fields) and the chosen answers' SNOMED codes. */
function resolveValue(field: TemplateFieldLike, raw: string | string[]): { value: string | string[]; codes: string[] } {
  if (!field.options?.length) return { value: raw, codes: [] };
  const ids = Array.isArray(raw) ? raw : [raw];
  const chosen = ids.map(id => field.options!.find(o => o.id === id));
  const labels = ids.map((id, i) => chosen[i]?.label ?? id);
  return { value: Array.isArray(raw) ? labels : labels[0], codes: chosen.map(o => o?.snomed ?? '').filter(Boolean) };
}

export function buildSynopticResultPayload(input: BuildSynopticResultInput): SynopticResultPayloadV1 {
  const { caseData, instance, template, workup, signer, mode } = input;
  const v = input.codeVersions ?? {};
  const fields = (template?.sections ?? []).flatMap(s => s.fields);
  const answers = instance.answers ?? {};
  const specimenIds = [instance.specimenId, ...(instance.additionalSpecimenIds ?? [])];
  const specimens = specimenIds
    .map(id => (caseData.specimens ?? []).find(s => s.id === id))
    .filter((s): s is SpecimenLike => !!s);

  const observations: SynopticObservation[] = [];
  const staging: SynopticResultPayloadV1['staging'] = { ajcc_edition: template?.ajccEdition || null, pT: null, pN: null, pM: null, figo: null };
  for (const field of fields) {
    const raw = answers[field.id];
    if (isEmpty(raw)) continue;
    const { value, codes } = resolveValue(field, raw!);
    const sug = instance.aiSuggestions?.[field.id];
    const multi = Array.isArray(raw);
    observations.push({
      field_id: field.id,
      label: field.label,
      value,
      unit: field.unit || null,
      block_id: field.reportingRole === 'block' ? (Array.isArray(value) ? value.join(', ') : value) : null,
      snomed: field.snomed || codes.length
        ? { concept_code: field.snomed || null, value_code: multi ? null : codes[0] ?? null, ...(multi ? { value_codes: codes } : {}), system: 'SNOMED CT', version: v.snomed || null }
        : null,
      overridden: !!sug && (sug.verification === 'disputed' || !same(sug.value, raw)),
      ai_suggested: !!sug,
    });
    if (field.reportingRole && field.reportingRole !== 'block') {
      staging[field.reportingRole] = { value: Array.isArray(value) ? value.join(', ') : value, snomed: codes[0] ?? null };
    }
  }

  return {
    $schema_version: SYNOPTIC_PAYLOAD_SCHEMA_VERSION,
    mode,
    header: {
      pathscribe_report_id: workupReportId(caseData.id, instance.instanceId),
      pdf_document_id: input.pdfDocumentId !== undefined ? input.pdfDocumentId : workupPdfDocumentId(caseData.id, instance.instanceId, workup.version),
      accession_number: caseData.accession?.fullAccession ?? caseData.accession?.accessionNumber ?? caseData.id,
      // Orchestration: the EMR's order number is the placer, PathScribe's accession the filler.
      placer_order_number: caseData.order?.placerOrderNumber ?? (mode === 'orchestrator' ? caseData.order?.externalOrderId ?? null : null),
      filler_order_number: caseData.order?.fillerOrderNumber ?? (mode === 'orchestrator' ? caseData.accession?.fullAccession ?? caseData.accession?.accessionNumber ?? null : null),
      specimen_ids: specimens.length ? specimens.map(s => s.label || s.id) : specimenIds,
      workup_status: workup.status,
      workup_version: workup.version,
      template: { id: template?.id ?? instance.templateId, name: template?.name ?? instance.templateName ?? null, version: template?.version || null },
      signature: { signer_id: signer.id, npi: signer.npi || null, signed_timestamp: signer.signedAt },
    },
    patient_context: { mrn: caseData.patient?.mrn || null, encounter_id: caseData.encounterId || null },
    specimens: specimens.map(s => ({
      specimen_id: s.label || s.id,
      description: s.description || null,
      snomed: coded(s.coding?.snomed, 'SNOMED CT', v.snomed),
      icd10: coded(s.coding?.icd10, 'ICD-10-CM', v.icd10),
      icd_o_3: coded(s.coding?.icdO, 'ICD-O-3', v.icdO),
      ...(mode === 'assist' ? { suggested_cpt_codes: (s.coding?.cpt ?? []).filter(Boolean).map(code => ({ code: code.replace(/-(26|TC)$/i, '') })) } : {}),
    })),
    staging,
    synoptic_observations: observations,
  };
}

/** Which workup status a release is (Assist's LIS-sync kinds and Orchestration's result states alike). */
export function workupStatusFor(kind: string): WorkupStatus {
  if (kind === 'corrected' || kind === 'corrected_with_addition' || kind === 'CORRECTED') return 'CORRECTED';
  if (kind === 'new_instance' || kind === 'ADDENDUM') return 'ADDENDUM';
  return 'FINAL';
}
