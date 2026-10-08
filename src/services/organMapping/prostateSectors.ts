// src/services/organMapping/prostateSectors.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 461: the prostate's anatomical units for the organ maps.
//
// PI-RADS v2.1 sector map (41 sectors), as Pete chose (the spec said "v2.1,
// 39 sectors"; v2.1 has 41 — v2.1 added the right and left posteromedial
// peripheral zone at the base, PI-RADS v2.1 lexicon / Radiology Assistant):
// • base: per side AS, TZa, TZp, PZa, PZpl, PZpm, CZ (14)
// • mid and apex: per side AS, TZa, TZp, PZa, PZpl, PZpm (12 + 12)
// • seminal vesicles right and left (2), urethral sphincter (1).
// PathScribe draws its own schematic; nothing here copies ACR artwork.
//
// Systematic 12-core biopsy sites: right/left × base/mid/apex × lateral/
// medial, plus targeted cores (MRI regions of interest 1–3).
//
// Ids are stable data (stored in answers and bindings); names are
// translated at display (organMap.prostate.*).
// ─────────────────────────────────────────────────────────────────────────────

export type ProstateSide = 'right' | 'left';
export type ProstateLevel = 'base' | 'mid' | 'apex';
export type ProstateZone = 'AS' | 'TZa' | 'TZp' | 'PZa' | 'PZpl' | 'PZpm' | 'CZ';

export interface ProstateSector {
  id: string;
  kind: 'gland' | 'seminalVesicle' | 'urethralSphincter';
  side?: ProstateSide;
  level?: ProstateLevel;
  zone?: ProstateZone;
}

const ZONES_BY_LEVEL: Record<ProstateLevel, ProstateZone[]> = {
  base: ['AS', 'TZa', 'TZp', 'PZa', 'PZpl', 'PZpm', 'CZ'],
  mid: ['AS', 'TZa', 'TZp', 'PZa', 'PZpl', 'PZpm'],
  apex: ['AS', 'TZa', 'TZp', 'PZa', 'PZpl', 'PZpm'],
};

export const prostateSectorId = (side: ProstateSide, level: ProstateLevel, zone: ProstateZone) =>
  `${side === 'right' ? 'r' : 'l'}_${level}_${zone.toLowerCase()}`;

export const PROSTATE_PIRADS_SECTORS: readonly ProstateSector[] = [
  ...(['base', 'mid', 'apex'] as ProstateLevel[]).flatMap(level =>
    (['right', 'left'] as ProstateSide[]).flatMap(side =>
      ZONES_BY_LEVEL[level].map(zone => ({ id: prostateSectorId(side, level, zone), kind: 'gland' as const, side, level, zone })))),
  { id: 'r_sv', kind: 'seminalVesicle', side: 'right' },
  { id: 'l_sv', kind: 'seminalVesicle', side: 'left' },
  { id: 'us', kind: 'urethralSphincter' },
];

export const PROSTATE_SECTOR_IDS: ReadonlySet<string> = new Set(PROSTATE_PIRADS_SECTORS.map(s => s.id));

export interface ProstateBiopsySite {
  id: string;
  kind: 'systematic' | 'targeted';
  side?: ProstateSide;
  level?: ProstateLevel;
  aspect?: 'lateral' | 'medial';
  roi?: number;
}

export const PROSTATE_BIOPSY_SITES: readonly ProstateBiopsySite[] = [
  ...(['base', 'mid', 'apex'] as ProstateLevel[]).flatMap(level =>
    (['right', 'left'] as ProstateSide[]).flatMap(side =>
      (['lateral', 'medial'] as const).map(aspect => ({
        id: `${side === 'right' ? 'r' : 'l'}_${level}_${aspect === 'lateral' ? 'lat' : 'med'}`, kind: 'systematic' as const, side, level, aspect,
      })))),
  ...[1, 2, 3].map(roi => ({ id: `target_${roi}`, kind: 'targeted' as const, roi })),
];
