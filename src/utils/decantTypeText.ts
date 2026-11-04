// src/utils/decantTypeText.ts
// Batch 739 (fluid decision 6): a decant's type in the reader's language; an aliquot says what it is for
// ("Aliquot for flow cytometry"). Replaces the English-only DECANT_TYPE_LABEL on screen (it stays for label print data).
import type { TFunction } from 'i18next';
import type { Decant } from '@/types/case/Material';

const K = 'cytologyScreening.materialDrawer';

export function decantTypeText(t: TFunction, d: Pick<Decant, 'decantType' | 'aliquotPurpose'>): string {
  if (d.decantType === 'aliquot' && d.aliquotPurpose) return t(`${K}.aliquotType`, { purpose: t(`${K}.aliquotPurpose.${d.aliquotPurpose}`) });
  return t(`${K}.decantType.${d.decantType}`);
}
