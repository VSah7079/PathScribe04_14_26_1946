// src/services/cytology/describeQcOverrideRates.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 512: what the Cytology QC settings screen shows for a facility or
// staff override row. An override may set only one of the two rates (the
// layered model: staff > facility > enterprise, see
// resolveEffectiveCytologyQcSettings.ts), so each rate is either the
// override's own value or inherited:
//   • facility row: inherits the enterprise rate, shown with its value;
//   • staff row: inherits from the facility where the work is done, which
//     varies, so it is shown as "inherited" without a number.
// Before, a missing rate displayed as "undefined%".
// ─────────────────────────────────────────────────────────────────────────────

import type { CytologyQcSettingsConfig } from './ICytologyQcSettingsService';

export type QcRateDisplay =
  | { kind: 'own'; value: number }
  | { kind: 'inherited'; value: number }
  | { kind: 'inherited'; value: null };

type RateOverrides = Partial<Pick<CytologyQcSettingsConfig, 'negativeRandomSelectionRatePercent' | 'nonNegativeRandomSelectionRatePercent'>>;

function one(own: number | undefined, inheritedValue: number | undefined | null): QcRateDisplay {
  if (typeof own === 'number') return { kind: 'own', value: own };
  return typeof inheritedValue === 'number' ? { kind: 'inherited', value: inheritedValue } : { kind: 'inherited', value: null };
}

/** `inheritsFrom`: the enterprise settings for a facility row; null for a staff row. */
export function describeQcOverrideRates(
  overrides: RateOverrides,
  inheritsFrom: CytologyQcSettingsConfig | null,
): { negative: QcRateDisplay; nonNegative: QcRateDisplay } {
  return {
    negative: one(overrides.negativeRandomSelectionRatePercent, inheritsFrom?.negativeRandomSelectionRatePercent),
    nonNegative: one(overrides.nonNegativeRandomSelectionRatePercent, inheritsFrom?.nonNegativeRandomSelectionRatePercent),
  };
}
