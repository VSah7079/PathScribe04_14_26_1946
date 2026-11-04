// src/services/quality/qaActivityTypeIds.ts
// Batch 672: the QA activity-type ids, kept apart from the mock services so server-backed code
// can use them without importing a mock. The mocks re-export them, so older imports still work.

export const FROZEN_FINAL_ACTIVITY_TYPE_ID = 'qa-activity-frozen-final';
export const ABNORMAL_FINDING_CONFIRMATION_ACTIVITY_TYPE_ID = 'qa-activity-abnormal-finding-confirmation';
export const GYN_CYTOLOGY_SECONDARY_SCREENING_ACTIVITY_TYPE_ID = 'qa-activity-gyn-cytology-secondary-screening';
export const CYTO_HISTO_CORRELATION_ACTIVITY_TYPE_ID = 'qa-activity-cyto-histo';
export const SURGICAL_PEER_REVIEW_ACTIVITY_TYPE_ID = 'qa-activity-surgical-peer-review';
export const SURGICAL_BIOPSY_RESECTION_CORRELATION_ACTIVITY_TYPE_ID = 'qa-activity-surgical-biopsy-resection';
export const FPPE_ACTIVITY_TYPE_ID = 'qa-activity-fppe-credentialing';
export const CYTOTECH_COMPETENCY_ACTIVITY_TYPE_ID = 'qa-activity-cytotech-competency';
