// src/services/aiGovernance/matchStrength.ts
// ─────────────────────────────────────────────────
// Batch 690: AI Output Governance. In the documentation profile an AI-suggested code shows a plain
// label instead of a percentage. The label describes how closely the case text matches the code's
// description (a search-style match). It is not a probability that the code is correct and it never
// changes what the pathologist must review. 85 is the line the percentage display already used.
// ─────────────────────────────────────────────────
export type MatchStrength = 'strong' | 'possible';
export const STRONG_MATCH_FROM = 85;
export const matchStrength = (confidence: number | undefined | null): MatchStrength => ((confidence ?? 0) >= STRONG_MATCH_FROM ? 'strong' : 'possible');
