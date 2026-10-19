// src/components/Common/MarginInkChip.tsx
// Batch 610 (#9): the ink colour recorded on a margin, shown next to the margin's name
// (organ-map legend, synoptic margin labels). A colour swatch when the code is a hex colour,
// then the colour's name; an earlier ink, when there is one, is in the tooltip.
import React from 'react';
import { useTranslation } from 'react-i18next';
import { swatchColor, type MarginInkEntry } from '@/services/grossing/marginInkLabels';

export const MarginInkChip: React.FC<{ ink: MarginInkEntry }> = ({ ink }) => {
  const { t } = useTranslation();
  const hex = swatchColor(ink.colorCode);
  const title = ink.earlier.length > 0
    ? t('marginInk.titleWithEarlier', { color: ink.colorName, earlier: ink.earlier.map(e => e.colorName).join(', ') })
    : t('marginInk.title', { color: ink.colorName });
  return (
    <span className="ps-margin-ink-chip" title={title} data-testid={`margin-ink-${ink.marginId}`}>
      {hex && (
        <svg className="ps-margin-ink-swatch" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="5" fill={hex} stroke="currentColor" strokeWidth="1" /></svg>
      )}
      <span className="ps-margin-ink-name">{ink.colorName}</span>
    </span>
  );
};
