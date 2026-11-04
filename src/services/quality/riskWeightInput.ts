// src/services/quality/riskWeightInput.ts
// Batch 432: what a risk-weight box holds. Blank means no weight (1×); a
// number above 0 is the multiplier; anything else is refused (pure; tested).
export function parseRiskWeightInput(raw: string): number | null | 'invalid' {
  const text = raw.trim();
  if (text === '') return null;
  const n = Number(text);
  return Number.isFinite(n) && n > 0 && n <= 10 ? Math.round(n * 100) / 100 : 'invalid';
}
