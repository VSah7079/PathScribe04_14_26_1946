// src/services/cytology/hpvGenotype.ts
// Batch 631: keeps the 18/45 group consistent with the separate HPV 18 and HPV 45 flags when the sender gives them.
import type { HpvGenotypeDetail } from '@/types/case/HpvGenotype';

export function normalizeHpvGenotype(g: HpvGenotypeDetail | undefined): HpvGenotypeDetail | undefined {
  if (!g) return g;
  const separated = g.hpv18 === true || g.hpv45 === true;
  return separated && !g.hpv18Or45 ? { ...g, hpv18Or45: true } : g;
}

/** The types a result names, for a register message: 16, 18 and "other" (45 and the rest). Empty when the sender gave only the 18/45 group. */
export function hpvGenotypeLabels(g: HpvGenotypeDetail | undefined): ('HPV_16' | 'HPV_18' | 'HPV_OTHER')[] {
  if (!g) return [];
  const out: ('HPV_16' | 'HPV_18' | 'HPV_OTHER')[] = [];
  if (g.hpv16) out.push('HPV_16');
  if (g.hpv18 === true) out.push('HPV_18');
  if (g.hpv45 === true || g.otherHighRisk) out.push('HPV_OTHER');
  return out;
}
