// src/components/Common/FontSizeField.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 612: the font size box of a report style, with what it prints at.
// A size in points says so ("Font size (pt)") and shows the printed size; a
// size saved before points (pixels) says that, shows what it prints at, and
// points at "Convert to points". Shared by Document Style and Template
// Assembly. The decisions are in services/reportAppearance/fontUnits.ts.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { FontUnits, LabelConfig } from '../../types/template';
import { Label, TextInput } from '../TemplateBuilder/TemplateInspector';
import { printedPointsText, unitsOf } from '../../services/reportAppearance/fontUnits';

interface Props {
  style: LabelConfig;
  /** The template's units, for a style with none of its own. */
  templateUnits?: FontUnits;
  /** The label for a size in points (each screen has its own words). */
  pointsLabel: string;
  fallbackSize: number;
  onChange: (size: number) => void;
}

export const FontSizeField: React.FC<Props> = ({ style, templateUnits, pointsLabel, fallbackSize, onChange }) => {
  const { t } = useTranslation();
  const units = unitsOf(style, templateUnits);
  const size = style.fontSize ?? fallbackSize;
  const printed = printedPointsText(size, units);
  return (
    <>
      <Label>{units === 'pt' ? pointsLabel : t('fontUnits.sizeLabelLegacy')}</Label>
      <TextInput
        value={String(size)}
        onChange={v => onChange(parseInt(v) || fallbackSize)}
        placeholder={String(fallbackSize)}
      />
      {printed !== null && <div className="ps-fontunits__note">{t('fontUnits.printsAt', { points: printed })}</div>}
      {units === 'legacy_px' && <div className="ps-fontunits__note ps-fontunits__note--legacy">{t('fontUnits.legacyHint')}</div>}
    </>
  );
};
