// src/services/clinical/clinicalHistoryText.ts
// Batch 439 (PS-145): the order's structured clinical history as plain text
// for the mismatch check. Category, code and any free text; metadata values
// only (never patient identifiers, which this structure doesn't carry). Pure.

import type { RecordedClinicalHistoryEntry } from '@/types/clinicalHistory/RecordedClinicalHistoryEntry';

const CATEGORY: Record<string, string> = {
  SCR: 'Screening', SYM: 'Symptom', RAD_LAB: 'Imaging or laboratory', PRIOR_PATH: 'Prior pathology',
  MAL_STAGE: 'Known malignancy', HIGH_RISK: 'High risk',
};

export function clinicalHistoryText(entries: readonly RecordedClinicalHistoryEntry[] | undefined): string {
  return (entries ?? []).map(e => {
    const parts = [e.historyCode, e.unmappedTextFallback, ...Object.values(e.metadata ?? {})].filter(Boolean);
    return `${CATEGORY[e.categoryCode] ?? e.categoryCode}${parts.length ? `: ${parts.join(', ')}` : ''}`;
  }).join('; ');
}
