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

// Batch 730 (Lab Workflow & Batch spec §9.3): + station_events, batches, add_on_orders (the reporting data layer).
// Batch 731 (spec §10.4, §10.5): + parent_item_key on station_events (lineage) and item_end_states.
export const BI_DATASET_IDS = ['cases', 'specimens', 'billing', 'qa', 'workload', 'audit', 'station_events', 'batches', 'add_on_orders', 'item_end_states'] as const;
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
  // Batch 730: the station scan log (STATION_TRACKING_API.md). Item ids carry the accession, so they are removed in
  // the de-identified feed; case_key joins to `cases`. from_carrier marks a carrier-wide event (§10.3). Timestamps
  // are generalised to the month when de-identified (dates of service identify), so the turnaround measures use
  // minutes_since_accession, which is kept.
  {
    id: 'station_events', identifiable: true,
    fields: [
      f('event_key', 'code'), f('event_at', 'datetime', 'generalised'), f('minutes_since_accession', 'number'), f('event_date_offset_days', 'number'), f('item_id', 'text', 'removed'), f('item_key', 'code'), f('material_type', 'code'),
      f('case_key', 'code'), f('carrier_id', 'code'), f('batch_key', 'code'), f('station_id', 'code'), f('station_name', 'text'),
      f('station_stage', 'code'), f('step', 'code'), f('facility_id', 'code'), f('user_id', 'code'), f('action', 'code'),
      f('result', 'code'), f('from_carrier', 'boolean'), f('is_research', 'boolean'), f('parent_item_key', 'code'),
    ],
  },
  {
    id: 'item_end_states', identifiable: true,
    fields: [
      f('end_state_key', 'code'), f('item_id', 'text', 'removed'), f('item_key', 'code'), f('parent_item_key', 'code'), f('material_type', 'code'),
      f('case_key', 'code'), f('state', 'code'), f('reason', 'text', 'removed'), f('source', 'code'), f('user_id', 'code'),
      f('station_id', 'code'), f('recorded_at', 'datetime', 'generalised'), f('minutes_since_accession', 'number'), f('is_research', 'boolean'),
    ],
  },
  {
    id: 'batches', identifiable: false,
    fields: [
      f('batch_key', 'code'), f('carrier_id', 'code'), f('container_type', 'code'), f('purpose', 'code'), f('current_step', 'code'),
      f('status', 'code'), f('priority', 'code'), f('created_at', 'datetime'), f('sealed_at', 'datetime'), f('completed_at', 'datetime'),
      f('target_minutes', 'number'), f('item_count', 'number'), f('missing_count', 'number'), f('unexpected_count', 'number'),
      f('override', 'boolean'), f('facility_id', 'code'), f('step_history', 'text'),
    ],
  },
  {
    id: 'add_on_orders', identifiable: true,
    fields: [
      f('order_key', 'code'), f('case_key', 'code'), f('block_id', 'text', 'removed'), f('order_type', 'code'), f('stain_name', 'text'),
      f('priority', 'code'), f('ordered_at', 'datetime', 'generalised'), f('cut_at', 'datetime', 'generalised'), f('minutes_to_cut', 'number'), f('status', 'code'),
      f('routed_queue', 'code'), f('performing_lab_id', 'code'), f('is_research', 'boolean'),
      // Batch 732 (spec §11): the block type, slide size, levels on the slide and how many pieces it was ordered for.
      f('block_type', 'code'), f('slide_size', 'code'), f('level_count', 'number'), f('piece_count', 'number'),
    ],
  },
];

export const datasetById = (id: string): BiDataset | undefined => BI_DATASETS.find(d => d.id === id);
