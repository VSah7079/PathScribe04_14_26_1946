// src/services/labeling/labelStyle.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 715 (Pete, Oct 28 2026): "There should be an update to the settings for
// the enterprise or performing facility: letters or numbers for blocks and
// slides. We need to support this."
//
// Three independent choices, each Letters or Numbers:
//   specimen   Specimen A, B, C   |  Specimen 1, 2, 3
//   block      Block A, B, C      |  Block 1, 2, 3     (joined to the specimen: A1, 1A)
//   slide      Slide La, Lb, Lc   |  Slide L1, L2, L3   (the "L" is the level prefix)
//
// The enterprise holds the default; a performing facility may override any of
// the three (an unset part follows the enterprise). See resolveLabelStyle.ts.
//
// The old single choice (Facility.specimenLabelStyle) is kept as a PRESET so
// existing facilities keep today's labels:
//   'alpha-specimen'   -> specimen letters, block numbers    (A1, A2)
//   'numeric-specimen' -> specimen numbers, block letters    (1A, 1B)
// Neither preset says anything about slides: slides stay Numbers (L1, L2).
//
// What a slide "designation" is: the slide's printed level text. The level code
// stored in a slide's id and barcode stays L1, L2, ... whatever the setting
// (scanning, reprints and every existing slide depend on it); Letters changes
// the human-readable text on the slide label only. See slideLevelText().
// ─────────────────────────────────────────────────────────────────────────────

export type LabelDesignation = 'letters' | 'numbers';

/** A fully resolved choice for the three levels. */
export interface LabelStyle {
  specimen: LabelDesignation;
  block: LabelDesignation;
  slide: LabelDesignation;
}

/** What one record sets of its own. An unset part is inherited. */
export type LabelStyleSetting = Partial<LabelStyle>;

/** The pre-Batch-715 single choice, kept as a preset. */
export type SpecimenLabelStyle = 'alpha-specimen' | 'numeric-specimen';

export const LABEL_LEVELS = ['specimen', 'block', 'slide'] as const;
export type LabelLevel = (typeof LABEL_LEVELS)[number];

export const LABEL_DESIGNATIONS: readonly LabelDesignation[] = ['letters', 'numbers'];

/** What applies when neither the facility nor its enterprise sets a part: today's labels. */
export const DEFAULT_LABEL_STYLE: LabelStyle = { specimen: 'letters', block: 'numbers', slide: 'numbers' };

export const LABEL_PRESETS: Record<SpecimenLabelStyle, Pick<LabelStyle, 'specimen' | 'block'>> = {
  'alpha-specimen': { specimen: 'letters', block: 'numbers' },
  'numeric-specimen': { specimen: 'numbers', block: 'letters' },
};

export const isLabelDesignation = (v: unknown): v is LabelDesignation => v === 'letters' || v === 'numbers';

/** The setting a legacy preset stands for (specimen and block only). */
export function presetToSetting(preset: SpecimenLabelStyle | undefined): LabelStyleSetting {
  return preset && LABEL_PRESETS[preset] ? { ...LABEL_PRESETS[preset] } : {};
}

/** The preset whose specimen and block match this style, if one does. */
export function matchingPreset(style: LabelStyleSetting): SpecimenLabelStyle | undefined {
  return (Object.keys(LABEL_PRESETS) as SpecimenLabelStyle[])
    .find(p => LABEL_PRESETS[p].specimen === style.specimen && LABEL_PRESETS[p].block === style.block);
}

/** A record that can carry a label style (a facility). */
export interface LabelStyleCarrier {
  labelStyle?: LabelStyleSetting | null;
  specimenLabelStyle?: SpecimenLabelStyle;
}

/** What the record sets of its own: the legacy preset first, then its own per-level choices over it (pure). */
export function ownLabelStyle(record: LabelStyleCarrier | null | undefined): LabelStyleSetting {
  if (!record) return {};
  const own: LabelStyleSetting = { ...presetToSetting(record.specimenLabelStyle) };
  for (const level of LABEL_LEVELS) {
    const v = record.labelStyle?.[level];
    if (isLabelDesignation(v)) own[level] = v;
  }
  return own;
}

/** Whether two settings choose the same thing for every level (pure). */
export function sameLabelSetting(a: LabelStyleSetting, b: LabelStyleSetting): boolean {
  return LABEL_LEVELS.every(l => (a[l] ?? null) === (b[l] ?? null));
}

/** Specimen and block of the same kind join into labels that can be read two ways (AA, 11) (pure). */
export function isAmbiguousCombination(style: Pick<LabelStyle, 'specimen' | 'block'>): boolean {
  return style.specimen === style.block;
}
