// src/types/case/AiFieldSuggestion.ts
// Batch 759: moved out of Case.ts unchanged (Case.ts is over 1,000 lines and may not grow); Case.ts re-exports both.
export type AiFieldVerification = 'unverified' | 'verified' | 'disputed';

export interface AiFieldSuggestion {
  value: string | string[];
  confidence: number;        // 0–100
  source: string;            // e.g. 'Gross: "2.3 × 1.8 × 1.5 cm"'
  verification: AiFieldVerification;
}
