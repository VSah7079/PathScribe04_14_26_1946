// src/services/labeling/labelStyleEditor.ts
// Batch 715: the decisions behind the facility editor's letters-or-numbers
// selectors (kept out of the component): which choices each record offers, what
// a choice stores, what the preset menu stands for. Pure.

import {
  DEFAULT_LABEL_STYLE, LABEL_PRESETS, matchingPreset, ownLabelStyle,
  type LabelDesignation, type LabelLevel, type LabelStyleCarrier, type LabelStyleSetting, type SpecimenLabelStyle,
} from './labelStyle';

/** A selector value: follow the enterprise, or set it here. */
export type LabelChoice = 'inherit' | LabelDesignation;

/** The choices a record offers: the enterprise sets a value; a lab can also follow it. */
export function labelChoices(isEnterprise: boolean | undefined): LabelChoice[] {
  return isEnterprise ? ['letters', 'numbers'] : ['inherit', 'letters', 'numbers'];
}

/** The selector's current value for a level. */
export function labelChoiceOf(record: LabelStyleCarrier, level: LabelLevel, isEnterprise: boolean | undefined): LabelChoice {
  return ownLabelStyle(record)[level] ?? (isEnterprise ? DEFAULT_LABEL_STYLE[level] : 'inherit');
}

/** The record's own setting after one selector changes. The legacy preset is folded in, so nothing it said is lost. */
export function applyLabelChoice(record: LabelStyleCarrier, level: LabelLevel, choice: LabelChoice): LabelStyleSetting {
  const next = ownLabelStyle(record);
  if (choice === 'inherit') delete next[level]; else next[level] = choice;
  return next;
}

/** The setting after a preset is picked (specimen and block together; slides untouched). */
export function applyLabelPreset(record: LabelStyleCarrier, preset: SpecimenLabelStyle): LabelStyleSetting {
  return { ...ownLabelStyle(record), ...LABEL_PRESETS[preset] };
}

/** The preset the record's specimen and block choices amount to, or '' (custom or inherited). */
export function labelPresetOf(record: LabelStyleCarrier): SpecimenLabelStyle | '' {
  return matchingPreset(ownLabelStyle(record)) ?? '';
}

/**
 * What the facility editor stores: the per-level choices in `labelStyle`, and
 * the old preset field cleared (its meaning is folded into `labelStyle`).
 * Nothing set at all stores nothing, so the record follows its enterprise.
 */
export function labelStyleFieldsToSave(record: LabelStyleCarrier): { labelStyle: LabelStyleSetting | undefined; specimenLabelStyle: undefined } {
  const own = ownLabelStyle(record);
  return { labelStyle: Object.keys(own).length > 0 ? own : undefined, specimenLabelStyle: undefined };
}
