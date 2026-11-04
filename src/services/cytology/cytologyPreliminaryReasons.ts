// src/services/cytology/cytologyPreliminaryReasons.ts
// Batch 533 (Pete, Oct 12, 2026; click economy): why an urgent cytology
// preliminary report is sent, as quick picks. Stored as the code; the screen
// shows `cytologyPreliminary.reasons.<code>` and the PDF prints the matching
// `cytologyPdf.preliminaryReason…` label in the report's language. Pure.
import type { CytologyPdfLabelKey } from './cytologyPdfLabels';

export const CYTOLOGY_PRELIMINARY_REASONS = ['criticalFinding', 'clinicianRequest', 'urgentManagement'] as const;
export type CytologyPreliminaryReason = typeof CYTOLOGY_PRELIMINARY_REASONS[number];

const PDF_LABEL: Record<CytologyPreliminaryReason, CytologyPdfLabelKey> = {
  criticalFinding: 'preliminaryReasonCriticalFinding',
  clinicianRequest: 'preliminaryReasonClinicianRequest',
  urgentManagement: 'preliminaryReasonUrgentManagement',
};

export function isCytologyPreliminaryReason(code: string): code is CytologyPreliminaryReason {
  return (CYTOLOGY_PRELIMINARY_REASONS as readonly string[]).includes(code);
}

/** The PDF label for a reason code; an unknown code prints as stored. */
export function cytologyPreliminaryReasonText(code: string, labels: Record<CytologyPdfLabelKey, string>): string {
  return isCytologyPreliminaryReason(code) ? labels[PDF_LABEL[code]] : code;
}
