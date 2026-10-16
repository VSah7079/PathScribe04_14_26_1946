// src/utils/formatPercent.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 514 (PS-269): percentages and percentage-point changes in the user's
// language. French and German write "12,3 %", Korean and English "12.3%".
//
// A percentage-point change also needs its unit word, which each language
// writes differently (Pete, Oct 10, 2026): English "pp", German
// "Prozentpunkt(e)", French "point(s) de pourcentage" (never abbreviated),
// Dutch "procentpunt(en)", Korean "퍼센트포인트". The unit is a translation
// key with a `_one` / `_other` form; formatPercentagePointChange says which.
// ─────────────────────────────────────────────────────────────────────────────

/** A plain number with a fixed number of decimals, in the language's format ("1,25" in French). */
export function formatDecimal(value: number, language: string, fractionDigits = 2): string {
  return new Intl.NumberFormat(language, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }).format(value);
}

/** A value already in percent units (12.3 means 12.3 %), in the language's own format. */
export function formatPercent(percent: number, language: string, fractionDigits = 1): string {
  return new Intl.NumberFormat(language, {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(percent / 100);
}

export interface PercentagePointChange {
  /** The signed number, one decimal, in the language's format: "+2.3", "−1,5", "0.0". */
  value: string;
  /** Which form of the unit word goes with it ("1,5 point", "2,3 points"). Passed as the i18next `context`. */
  form: 'one' | 'other';
}

/** A change in percentage points, signed, with the unit-word form that matches the number as shown. */
export function formatPercentagePointChange(points: number, language: string): PercentagePointChange {
  const shown = Math.round(points * 10) / 10;
  const value = new Intl.NumberFormat(language, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    signDisplay: 'exceptZero',
  }).format(shown);
  // Plural rules see the number as displayed (one decimal), so German and
  // Dutch "1,0" take the plural, as they should; French 0–1.9 takes the singular.
  const category = new Intl.PluralRules(language, { minimumFractionDigits: 1 }).select(Math.abs(shown));
  return { value, form: category === 'one' ? 'one' : 'other' };
}
