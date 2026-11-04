// src/services/intraop/intraopCriticalResultSeeds.ts
// Batch 399: the critical intraoperative results dictionary's starting entries.
import type { IntraopCriticalResultEntry } from '@/types/intraop/IntraopCriticalResult';

// Starting entries: the findings that most often change surgical management.
// A lab edits, deactivates or adds to these.
export const SEED_INTRAOP_CRITICAL_RESULTS: IntraopCriticalResultEntry[] = [
  {
    id: 'icr-malignancy', name: 'Malignancy on frozen section', status: 'Active',
    description: 'A malignant frozen diagnosis, expected or not. Unexpected malignancy most often changes the operation.',
    frozenCategories: ['malignant'],
    matchTerms: ['carcinoma', 'malignant', 'malignancy', 'lymphoma', 'sarcoma', 'melanoma', 'metastatic', 'metastasis'],
  },
  {
    id: 'icr-positive-margin', name: 'Positive or close margin', status: 'Active',
    description: 'Tumour at or near a margin, which may mean further excision now.',
    frozenCategories: [],
    matchTerms: ['positive margin', 'margin positive', 'margin involved', 'involved margin', 'tumor at margin', 'tumour at margin', 'tumor at the margin', 'tumour at the margin', 'close margin'],
  },
  {
    id: 'icr-atypical', name: 'Atypical or suspicious for malignancy', status: 'Active',
    description: 'An atypical or suspicious frozen result that may change the extent of resection.',
    frozenCategories: ['atypical_suspicious'],
    matchTerms: ['suspicious for malignancy', 'suspicious for carcinoma'],
  },
  {
    id: 'icr-positive-node', name: 'Positive lymph node', status: 'Active',
    description: 'Tumour in a lymph node sent for frozen section (e.g. sentinel node).',
    frozenCategories: [],
    matchTerms: ['positive lymph node', 'positive sentinel node', 'node positive', 'nodal metastasis'],
  },
];

