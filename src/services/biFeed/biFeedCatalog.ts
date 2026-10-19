// src/services/biFeed/biFeedCatalog.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 613 (PS-787): the datasets the reporting feed offers and the fields in
// each. This is the field catalogue the Configuration screen shows and
// docs/architecture/BI_FEED_API.md specifies; the API server implements the
// same list. Pure data.
//
// Field ids are the column names an analyst sees in Power BI. They are schema
// identifiers, not screen wording, so they are not translated.
//
// "identifiable" datasets carry fields that could point to a patient. In the
// default de-identified mode those fields are removed or generalised (dates to
// the month; age over 89 to "90+"). A token only gets the full fields when the
// organisation has recorded a named approver (see biFeedRules.ts).
// ─────────────────────────────────────────────────────────────────────────────

export const BI_DATASET_IDS = ['cases', 'specimens', 'billing', 'qa', 'workload', 'audit'] as const;
export type BiDatasetId = typeof BI_DATASET_IDS[number];

export type BiFieldType = 'text' | 'number' | 'date' | 'datetime' | 'boolean' | 'code';
/** What the de-identified feed does with a field. */
export type BiFieldHandling = 'kept' | 'removed' | 'generalised';

export interface BiField { id: string; type: BiFieldType; deidentified: BiFieldHandling }
export interface BiDataset { id: BiDatasetId; identifiable: boolean; fields: readonly BiField[] }

const f = (id: string, type: BiFieldType, deidentified: BiFieldHandling = 'kept'): BiField => ({ id, type, deidentified });

export const BI_DATASETS: readonly BiDataset[] = [
  {
    id: 'cases', identifiable: true,
    fields: [
      f('case_key', 'code'), f('accession_number', 'text', 'removed'), f('patient_name', 'text', 'removed'),
      f('mrn', 'text', 'removed'), f('date_of_birth', 'date', 'removed'), f('age_years', 'number', 'generalised'),
      f('sex', 'code'), f('case_type', 'code'), f('status', 'code'), f('priority', 'code'),
      f('facility_id', 'code'), f('submitting_facility_id', 'code'), f('pathologist_id', 'code'), f('subspecialty', 'code'),
      f('accessioned_at', 'datetime', 'generalised'), f('signed_out_at', 'datetime', 'generalised'),
      f('turnaround_hours', 'number'), f('diagnosis_text', 'text', 'removed'),
      f('snomed_codes', 'code'), f('icd_codes', 'code'), f('result_flags', 'code'),
    ],
  },
  {
    id: 'specimens', identifiable: true,
    fields: [
      f('specimen_key', 'code'), f('case_key', 'code'), f('specimen_type', 'code'), f('description', 'text', 'removed'),
      f('collected_at', 'datetime', 'generalised'), f('received_at', 'datetime', 'generalised'),
      f('blocks_count', 'number'), f('slides_count', 'number'), f('stains_count', 'number'),
      f('container_type', 'code'), f('facility_id', 'code'),
    ],
  },
  {
    id: 'billing', identifiable: true,
    fields: [
      f('billing_event_key', 'code'), f('case_key', 'code'), f('event_type', 'code'), f('cpt_code', 'code'),
      f('quantity', 'number'), f('charge_amount', 'number'), f('financial_class', 'code'), f('payer_name', 'text', 'removed'),
      f('event_at', 'datetime', 'generalised'), f('send_status', 'code'), f('facility_id', 'code'), f('performing_lab_id', 'code'),
    ],
  },
  {
    id: 'qa', identifiable: true,
    fields: [
      f('qa_event_key', 'code'), f('case_key', 'code'), f('qa_type', 'code'), f('severity', 'code'), f('outcome', 'code'),
      f('opened_at', 'datetime', 'generalised'), f('closed_at', 'datetime', 'generalised'),
      f('reviewer_id', 'code'), f('note_text', 'text', 'removed'), f('facility_id', 'code'),
    ],
  },
  {
    id: 'workload', identifiable: false,
    fields: [
      f('period_date', 'date'), f('facility_id', 'code'), f('staff_id', 'code'), f('role', 'code'),
      f('cases_signed_out', 'number'), f('specimens_processed', 'number'), f('blocks_embedded', 'number'),
      f('slides_cut', 'number'), f('weighted_units', 'number'),
    ],
  },
  {
    id: 'audit', identifiable: false,
    fields: [
      f('period_date', 'date'), f('facility_id', 'code'), f('event_type', 'code'),
      f('allowed_count', 'number'), f('denied_count', 'number'), f('high_risk_count', 'number'),
    ],
  },
];

export const datasetById = (id: string): BiDataset | undefined => BI_DATASETS.find(d => d.id === id);
