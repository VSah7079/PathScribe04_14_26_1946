// src/services/organMapping/resolveHeadNeckMap.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 465: the head and neck maps, worked out from the synoptic answers.
//
// Oral cavity: the subsites with tumour; the peripheral (mucosal) and deep
// margins judged by the site's rules (Pete: RCPath — involved below 1 mm,
// close from 1 to 5 mm, clear beyond 5 mm; each a distance and an operator,
// set per site); carcinoma on ink is always involved; dysplasia at the
// mucosal margin is outlined on it; the depth of invasion is printed.
//
// Neck dissection (Pete: a grid row per level and side): each level shows
// metastasis when any of its nodes is positive, no tumour when nodes were
// examined (one or more) and none is positive, and "not dissected or not
// reported" otherwise (an empty row, 0 of 0, only "ENE not identified"); its
// worst extranodal extension is outlined (Pete: ENEmi ≤ 2 mm, ENEma > 2 mm
// beyond the capsule — AJCC 8th), heavier for ENEma. The totals are printed.
// ─────────────────────────────────────────────────────────────────────────────

import type { ChoiceBinding, FieldInputsBinding, NeckDissectionBinding, NumberBinding } from './organMapBindings';
import { NECK_LEVELS, NECK_SIDES, ORAL_SUBSITES } from './headNeckGeometry';
import { partGridKey } from '../templates/partGrid';
import { chosen, numberOr, sectorOf, type Answers } from './mapResolveShared';
import { BUILT_IN_ORGAN_MAP_THRESHOLDS, marginInvolved, type OrganMapThresholds } from './organMapScheme';
import type { MapCategory, MapOverlay, OrganMapScheme, OrganMapSector } from './organMapTypes';

export interface HeadNeckResolved { sectors: OrganMapSector[]; meta: Record<string, string>; hasData: boolean }

const choiceOf = (b: FieldInputsBinding, key: string) => b.inputs[key] as ChoiceBinding | undefined;
const numberIn = (b: FieldInputsBinding, key: string, answers: Answers) => {
  const nb = b.inputs[key] as NumberBinding | undefined;
  const n = nb?.fieldId ? numberOr(answers[nb.fieldId]) : undefined;
  return n !== undefined && n >= 0 ? n : undefined;
};

/** Batch 465b (Pete: a fallback guardrail): the oral rules a map judges by. The involved distance must be below
 *  the close distance; when the site's rules conflict (a higher layer raised its involved distance above a lower
 *  layer's close distance), the close rule falls back to PathScribe's (≤ 5 mm), or — when even that isn't above
 *  the involved distance — no margin is called close. The involved rule always stands (the more cautious call). */
export function effectiveOralThresholds(t: OrganMapThresholds): { thresholds: OrganMapThresholds; conflict?: 'fallback' | 'none' } {
  if (t.oralCloseMarginMm > t.oralInvolvedMarginMm) return { thresholds: t };
  const b = BUILT_IN_ORGAN_MAP_THRESHOLDS;
  if (b.oralCloseMarginMm > t.oralInvolvedMarginMm) {
    return { thresholds: { ...t, oralCloseMarginMm: b.oralCloseMarginMm, oralCloseMarginOperator: b.oralCloseMarginOperator }, conflict: 'fallback' };
  }
  return { thresholds: { ...t, oralCloseMarginMm: t.oralInvolvedMarginMm, oralCloseMarginOperator: t.oralInvolvedMarginOperator }, conflict: 'none' };
}

/** An oral cavity margin's status by the site's involved and close rules (no distance: not given). */
export function oralMarginCategory(mm: number | undefined, site: OrganMapThresholds): MapCategory {
  const t = effectiveOralThresholds(site).thresholds;
  const involved = marginInvolved(mm, t.oralInvolvedMarginMm, t.oralInvolvedMarginOperator);
  if (involved === undefined) return 'notSampled';
  if (involved) return 'marginPositive';
  return marginInvolved(mm, t.oralCloseMarginMm, t.oralCloseMarginOperator) ? 'marginClose' : 'marginClear';
}

export function resolveOralCavity(binding: FieldInputsBinding, answers: Answers, scheme: OrganMapScheme, siteThresholds: OrganMapThresholds): HeadNeckResolved {
  const { thresholds, conflict } = effectiveOralThresholds(siteThresholds);
  const subsites = new Set(chosen(choiceOf(binding, 'subsites'), answers));
  const peripheral = numberIn(binding, 'peripheralMarginMm', answers);
  const deep = numberIn(binding, 'deepMarginMm', answers);
  const dysplasia = chosen(choiceOf(binding, 'mucosalDysplasia'), answers)[0];
  const doi = numberIn(binding, 'doiMm', answers);
  const jump = (key: string) => binding.inputs[key]?.fieldId || undefined;
  const margin = (id: string, mm: number | undefined, key: string, overlays: MapOverlay[] = []) => {
    const category = oralMarginCategory(mm, thresholds);
    return sectorOf(id, category, overlays, scheme, jump(key), mm !== undefined ? { marginMm: mm, involved: category === 'marginPositive' } : undefined);
  };
  const sectors: OrganMapSector[] = [
    ...ORAL_SUBSITES.map(s => sectorOf(s, subsites.has(s) ? 'invasive' : 'benign', [], scheme, jump('subsites'))),
    margin('mPeripheral', peripheral, 'peripheralMarginMm', dysplasia === 'lowGrade' || dysplasia === 'highGrade' ? ['dysplasiaAtMargin'] : []),
    margin('mDeep', deep, 'deepMarginMm'),
  ];
  const meta: Record<string, string> = {
    rule: `${thresholds.oralInvolvedMarginOperator}:${thresholds.oralInvolvedMarginMm}|${thresholds.oralCloseMarginOperator}:${thresholds.oralCloseMarginMm}`,
    ...(doi !== undefined ? { doi: String(doi) } : {}),
    ...(dysplasia ? { dysplasia } : {}),
    // Batch 465b: the site's rules conflicted, and the map says how it judged instead.
    ...(conflict ? { ruleConflict: conflict } : {}),
  };
  return { sectors, meta, hasData: subsites.size > 0 || peripheral !== undefined || deep !== undefined || !!dysplasia || doi !== undefined };
}

const ENE_RANK = { absent: 0, minor: 1, major: 2 } as const;

export function resolveNeckDissection(binding: NeckDissectionBinding, answers: Answers, scheme: OrganMapScheme): HeadNeckResolved {
  const g = binding.grid;
  type Level = { positive?: number; examined?: number; largest?: number; ene: number };
  const levels = new Map<string, Level>();
  // Whether any row records ENE (absent included): without one, the caption says ENE wasn't recorded, not "absent".
  let eneRecorded = false;
  if (g?.fieldId) {
    const cell = (row: string, col: string | undefined) => (col ? answers[partGridKey(g.fieldId, row, col)] : undefined);
    // A count or size below 0 is not one.
    const count = (row: string, col: string | undefined) => { const n = numberOr(cell(row, col)); return n !== undefined && n >= 0 ? n : undefined; };
    for (const [rowId, levelId] of Object.entries(g.rows)) {
      const positive = count(rowId, g.columns.positive);
      const examined = count(rowId, g.columns.examined);
      const largest = count(rowId, g.columns.largest);
      const eneValue = g.eneValues[String(cell(rowId, g.columns.ene) ?? '')] as keyof typeof ENE_RANK | undefined;
      if (eneValue && eneValue in ENE_RANK) eneRecorded = true;
      if (positive === undefined && examined === undefined && largest === undefined && !eneValue) continue;
      // Several rows bound to one level add up; the largest deposit and the worst ENE win.
      const l = levels.get(levelId) ?? { ene: 0 };
      if (positive !== undefined) l.positive = (l.positive ?? 0) + positive;
      if (examined !== undefined) l.examined = (l.examined ?? 0) + examined;
      if (largest !== undefined) l.largest = Math.max(l.largest ?? 0, largest);
      l.ene = Math.max(l.ene, eneValue ? ENE_RANK[eneValue] ?? 0 : 0);
      levels.set(levelId, l);
    }
  }
  let totalPositive = 0; let totalExamined = 0; let worstEne = 0;
  const sectors: OrganMapSector[] = NECK_SIDES.flatMap(side => NECK_LEVELS.map(level => {
    const id = `${side}_${level}`;
    const l = levels.get(id);
    if (!l) return sectorOf(id, 'notSampled', [], scheme, g?.fieldId);
    totalPositive += l.positive ?? 0; totalExamined += l.examined ?? 0; worstEne = Math.max(worstEne, l.ene);
    // Metastasis shows where a node is positive (an ENE or a deposit size alone also means one is); no tumour
    // needs nodes examined; anything else (0 of 0, only "ENE not identified") is not reported.
    const metastasis = (l.positive ?? 0) > 0 || l.ene > 0 || (l.largest ?? 0) > 0;
    const category: MapCategory = metastasis ? 'invasive' : (l.examined ?? 0) > 0 ? 'benign' : 'notSampled';
    const overlays: MapOverlay[] = l.ene === 2 ? ['eneMajor'] : l.ene === 1 ? ['eneMinor'] : [];
    return sectorOf(id, category, overlays, scheme, g?.fieldId, {
      ...(l.positive !== undefined ? { nodesPositive: l.positive } : {}),
      ...(l.examined !== undefined ? { nodesExamined: l.examined } : {}),
      ...(l.largest !== undefined ? { largestMm: l.largest } : {}),
      ...(l.ene === 2 ? { ene: 'major' as const } : l.ene === 1 ? { ene: 'minor' as const } : {}),
    });
  }));
  const meta: Record<string, string> = {
    positive: String(totalPositive), examined: String(totalExamined),
    ene: worstEne === 2 ? 'major' : worstEne === 1 ? 'minor' : eneRecorded ? 'absent' : 'notGiven',
  };
  return { sectors, meta, hasData: levels.size > 0 };
}
