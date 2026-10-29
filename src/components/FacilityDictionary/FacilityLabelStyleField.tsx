// src/components/FacilityDictionary/FacilityLabelStyleField.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 715 (Pete, Oct 28 2026): "letters or numbers for blocks and slides."
// Three selectors (specimens, blocks, slides) with a live example. On the
// enterprise it sets the default; on a performing lab each part can follow the
// enterprise ("Same as enterprise (Letters)") or be set here. The old single
// "Specimen A / Block A1" choice stays as a preset.
//
// Presentation only: what each choice stores is in labeling/labelStyleEditor.ts,
// the example text in utils/specimenLabeling.ts, who wins in resolveLabelStyle.ts.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import './FacilityLabelStyleField.css';
import { useTranslation } from 'react-i18next';
import {
  LABEL_LEVELS, isAmbiguousCombination, matchingPreset,
  type LabelLevel, type LabelStyleCarrier, type LabelStyleSetting, type SpecimenLabelStyle,
} from '@/services/labeling/labelStyle';
import { resolveLabelStyle } from '@/services/labeling/resolveLabelStyle';
import {
  applyLabelChoice, applyLabelPreset, labelChoiceOf, labelChoices, labelPresetOf, type LabelChoice,
} from '@/services/labeling/labelStyleEditor';
import { exampleLabels } from '@/utils/specimenLabeling';

interface Props {
  /** The facility being edited (its current, possibly unsaved, label fields). */
  record: LabelStyleCarrier & { isEnterprise?: boolean };
  /** The enterprise this facility sits under, if any (its default shows in the "Same as enterprise" choice). */
  enterprise?: LabelStyleCarrier | null;
  /** The new own setting; the caller stores it with labelStyleFieldsToSave. */
  onChange: (next: LabelStyleSetting) => void;
}

const LEVEL_KEY: Record<LabelLevel, string> = {
  specimen: 'facilityEditorModal.labelStyle.specimenLevel',
  block: 'facilityEditorModal.labelStyle.blockLevel',
  slide: 'facilityEditorModal.labelStyle.slideLevel',
};

export const FacilityLabelStyleField: React.FC<Props> = ({ record, enterprise, onChange }) => {
  const { t } = useTranslation();
  const isEnterprise = !!record.isEnterprise;
  const effective = resolveLabelStyle(isEnterprise ? null : enterprise, record);
  const inherited = resolveLabelStyle(null, enterprise);
  const example = exampleLabels(effective);
  const choiceText = (c: LabelChoice, level: LabelLevel) =>
    c === 'inherit'
      ? t('facilityEditorModal.labelStyle.inherit', { value: t(`facilityEditorModal.labelStyle.${inherited[level]}`) })
      : t(`facilityEditorModal.labelStyle.${c}`);
  // An enterprise shows the preset its defaults amount to; a lab only a preset it set itself (an inherited value is not its choice).
  const preset = isEnterprise ? (matchingPreset(effective) ?? '') : labelPresetOf(record);

  return (
    <div className="ps-labelstyle" data-testid="facility-label-style">
      <div className="ps-labelstyle-grid">
        {LABEL_LEVELS.map(level => (
          <label key={level} className="ps-labelstyle-cell">
            <span className="ps-labelstyle-level">{t(LEVEL_KEY[level])}</span>
            <select
              aria-label={t(LEVEL_KEY[level])} className="cem-input" data-testid={`label-style-${level}`}
              value={labelChoiceOf(record, level, isEnterprise)}
              onChange={e => onChange(applyLabelChoice(record, level, e.target.value as LabelChoice))}
            >
              {labelChoices(isEnterprise).map(c => <option key={c} value={c}>{choiceText(c, level)}</option>)}
            </select>
          </label>
        ))}
        <label className="ps-labelstyle-cell">
          <span className="ps-labelstyle-level">{t('facilityEditorModal.labelStyle.preset')}</span>
          <select
            aria-label={t('facilityEditorModal.labelStyle.preset')} className="cem-input" data-testid="label-style-preset"
            value={preset}
            onChange={e => { if (e.target.value) onChange(applyLabelPreset(record, e.target.value as SpecimenLabelStyle)); }}
          >
            <option value="">{t('facilityEditorModal.labelStyle.presetCustom')}</option>
            <option value="alpha-specimen">{t('facilityEditorModal.general.specimenLabelingAlpha')}</option>
            <option value="numeric-specimen">{t('facilityEditorModal.general.specimenLabelingNumeric')}</option>
          </select>
        </label>
      </div>
      <div className="ps-labelstyle-example" data-testid="label-style-example">
        {t('facilityEditorModal.labelStyle.example', { specimen: example.specimen, block: example.block, slide: example.slide })}
      </div>
      <div className="cem-hint" data-testid="label-style-example-cassette">
        {t('facilityEditorModal.labelStyle.exampleCassette', { cassette: example.cassette, slide: example.slide })}
      </div>
      {isAmbiguousCombination(effective) && (
        <div className="ps-labelstyle-warning" role="note" data-testid="label-style-warning">
          {t(effective.specimen === 'letters' ? 'facilityEditorModal.labelStyle.ambiguousLetters' : 'facilityEditorModal.labelStyle.ambiguousNumbers')}
        </div>
      )}
      <div className="cem-hint">{t(isEnterprise ? 'facilityEditorModal.labelStyle.hintEnterprise' : 'facilityEditorModal.labelStyle.hintLab')}</div>
      <div className="cem-hint">{t('facilityEditorModal.labelStyle.slideNote')}</div>
    </div>
  );
};
