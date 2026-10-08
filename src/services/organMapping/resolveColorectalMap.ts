// src/services/organMapping/resolveColorectalMap.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 464: the colorectal maps, worked out from the synoptic answers (as
// every map: no data of their own).
//
// Polyp (Pete, Oct 5): the drawing follows the Paris type. The lesion is
// adenoma; with invasive carcinoma, the levels it reaches (Haggitt 1–4 for a
// pedunculated polyp, Kikuchi sm1–sm3 beneath a sessile or flat one) show
// carcinoma. A margin with carcinoma is involved by the site's rule — the
// malignant-polyp threshold and operator (1.0 mm, ≤ by default; Pete: a
// site setting, never per user), else clear; no distance = not given. With
// no carcinoma, the margins are clear of it. Adenoma at the lateral margin
// is marked on that margin.
//
// Rectal resection: the tumour's quadrants in the wall; the circumferential
// margin (CRM) at its closest quadrant, involved by the site's CRM rule (1.0
// mm, ≤ by default), the other quadrants clear when a CRM distance is given;
// the tumour above, at or below the peritoneal reflection on the long view;
// the distal margin involved only at 0 mm (on ink). The TME plane is printed.
// ─────────────────────────────────────────────────────────────────────────────

import type { ChoiceBinding, FieldInputsBinding, NumberBinding } from './organMapBindings';
import { isPedunculated, PARIS_TYPES, RECTAL_QUADRANTS, type RectalQuadrant } from './colorectalGeometry';
import { chosen, numberOr, sectorOf, type Answers } from './mapResolveShared';
import { marginInvolved, type OrganMapThresholds } from './organMapScheme';
import type { MapCategory, MapOverlay, OrganMapScheme, OrganMapSector } from './organMapTypes';

const choiceOf = (b: FieldInputsBinding, key: string) => b.inputs[key] as ChoiceBinding | undefined;
const numberIn = (b: FieldInputsBinding, key: string, answers: Answers) => {
  const nb = b.inputs[key] as NumberBinding | undefined;
  return nb?.fieldId ? numberOr(answers[nb.fieldId]) : undefined;
};
const fieldOf = (b: FieldInputsBinding, key: string) => b.inputs[key]?.fieldId || undefined;
/** A distance as given: a negative one is not a distance. */
const distance = (n: number | undefined) => (n !== undefined && n >= 0 ? n : undefined);

export interface ColorectalResolved {
  sectors: OrganMapSector[];
  variant?: string;
  meta: Record<string, string>;
  hasData: boolean;
}

export function resolveColorectalPolyp(binding: FieldInputsBinding, answers: Answers, scheme: OrganMapScheme, thresholds: OrganMapThresholds): ColorectalResolved {
  const paris = chosen(choiceOf(binding, 'paris'), answers).find(v => (PARIS_TYPES as readonly string[]).includes(v));
  const invasiveAnswer = chosen(choiceOf(binding, 'invasive'), answers)[0];
  const depth = chosen(choiceOf(binding, 'depth'), answers)[0];
  const deepMm = distance(numberIn(binding, 'deepMarginMm', answers));
  const lateralMm = distance(numberIn(binding, 'lateralMarginMm', answers));
  // Carcinoma: answered yes; or, with that question unanswered (or not bound), a depth of invasion or a distance
  // of carcinoma from a margin given — those questions only have an answer when there is carcinoma.
  const invasive = invasiveAnswer === 'yes' || (invasiveAnswer === undefined && (!!depth || deepMm !== undefined || lateralMm !== undefined));
  const lateralAdenoma = chosen(choiceOf(binding, 'lateralAdenoma'), answers)[0];
  // No Paris type: drawn by the depth scale given (Haggitt → pedunculated), else sessile.
  const variant = paris ?? (depth?.startsWith('haggitt') ? '0-Ip' : '0-Is');
  const pedunculated = isPedunculated(variant);
  const jump = (key: string) => fieldOf(binding, key);

  const margin = (mm: number | undefined, key: string, overlays: MapOverlay[] = []): OrganMapSector => {
    const id = key === 'deepMarginMm' ? 'deep' : key;
    if (invasiveAnswer === 'no') return sectorOf(id, 'marginClear', overlays, scheme, jump(key), mm !== undefined ? { marginMm: mm } : undefined);
    const involved = invasive ? marginInvolved(mm, thresholds.polypInvolvedMarginMm, thresholds.polypInvolvedMarginOperator) : undefined;
    const category: MapCategory = involved === undefined ? 'notSampled' : involved ? 'marginPositive' : 'marginClear';
    return sectorOf(id, category, overlays, scheme, jump(key), mm !== undefined ? { marginMm: mm, ...(involved !== undefined ? { involved } : {}) } : undefined);
  };

  let sectors: OrganMapSector[];
  // The polyp's lesion is adenoma (where not carcinoma); 'notSampled' would print the margin wording.
  const lesionCategory: MapCategory = 'adenoma';
  if (pedunculated) {
    // Haggitt n: carcinoma from the head down to level n. Invasive with no Haggitt level: the head.
    const level = invasive ? (depth?.startsWith('haggitt') ? Number(depth.slice(7)) : 1) : 0;
    sectors = [
      sectorOf('h1', level >= 1 ? 'invasive' : lesionCategory, [], scheme, jump(level >= 1 ? 'depth' : 'paris')),
      ...[2, 3, 4].map(n => sectorOf(`h${n}`, level >= n ? 'invasive' : 'benign', [], scheme, jump('depth'))),
      // Batch 466d: a pedunculated polyp's adenoma at the margin is marked on its stalk margin (it has no lateral one).
      margin(deepMm, 'deepMarginMm', lateralAdenoma === 'present' ? ['adenomaAtMargin'] : []),
    ];
  } else {
    // Kikuchi smN: carcinoma in the submucosa down to that third (the lesion stays adenoma above it).
    // Invasive with no sm level: the lesion itself.
    const sm = invasive && depth?.startsWith('sm') ? Number(depth.slice(2)) : 0;
    const lesion = invasive && !sm ? 'invasive' : lesionCategory;
    const adenomaAtMargin: MapOverlay[] = lateralAdenoma === 'present' ? ['adenomaAtMargin'] : [];
    sectors = [
      ...['mucosaL', 'mucosaR', 'submucosaL', 'submucosaR'].map(id => sectorOf(id, 'benign', [], scheme, undefined)),
      ...[1, 2, 3].map(n => sectorOf(`sm${n}`, sm >= n ? 'invasive' : 'benign', [], scheme, jump('depth'))),
      sectorOf('lesion', lesion, [], scheme, jump('paris')),
      { ...margin(lateralMm, 'lateralMarginMm', adenomaAtMargin), id: 'lateralL' },
      { ...margin(lateralMm, 'lateralMarginMm', adenomaAtMargin), id: 'lateralR' },
      margin(deepMm, 'deepMarginMm'),
    ];
  }
  const hasData = !!paris || !!invasiveAnswer || !!depth || deepMm !== undefined || lateralMm !== undefined || !!lateralAdenoma;
  const meta: Record<string, string> = {
    ...(paris ? { paris } : {}),
    scale: pedunculated ? 'haggitt' : 'kikuchi',
    // The rule the margins were judged by (printed on the map: "involved ≤ 1 mm").
    rule: `${thresholds.polypInvolvedMarginOperator}:${thresholds.polypInvolvedMarginMm}`,
    // Batch 466d: the adenoma margin, reported apart from the carcinoma's (organMapDerived).
    ...(lateralAdenoma === 'present' || lateralAdenoma === 'absent' ? { adenomaAtMargin: lateralAdenoma } : {}),
    // Batch 466d: no invasive carcinoma — its margins have no status (not "not involved").
    ...(invasiveAnswer === 'no' ? { invasiveCarcinoma: 'absent' } : {}),
  };
  return { sectors, variant, meta, hasData };
}

export function resolveRectalResection(binding: FieldInputsBinding, answers: Answers, scheme: OrganMapScheme, thresholds: OrganMapThresholds): ColorectalResolved {
  const quadrantsAnswer = chosen(choiceOf(binding, 'quadrants'), answers);
  const quadrants = new Set<RectalQuadrant>(quadrantsAnswer.includes('circumferential') ? RECTAL_QUADRANTS : quadrantsAnswer.filter((q): q is RectalQuadrant => (RECTAL_QUADRANTS as readonly string[]).includes(q)));
  const crmMm = distance(numberIn(binding, 'crmMm', answers));
  const crmQuadrant = chosen(choiceOf(binding, 'crmQuadrant'), answers).find((q): q is RectalQuadrant => (RECTAL_QUADRANTS as readonly string[]).includes(q));
  const tme = chosen(choiceOf(binding, 'tmePlane'), answers)[0];
  const reflection = chosen(choiceOf(binding, 'reflection'), answers)[0];
  const distalMm = distance(numberIn(binding, 'distalMarginMm', answers));
  const jump = (key: string) => fieldOf(binding, key);
  const crmInvolved = marginInvolved(crmMm, thresholds.rectalCrmInvolvedMm, thresholds.rectalCrmInvolvedOperator);
  // The closest point: the quadrant given; without one, it lies in the tumour's quadrants (all four when those
  // aren't given either) — each is judged by the rule and the caption says where it is wasn't given, never clear by default.
  const closest = new Set<RectalQuadrant>(crmQuadrant ? [crmQuadrant] : quadrants.size ? [...quadrants] : RECTAL_QUADRANTS);

  const sectors: OrganMapSector[] = [
    ...RECTAL_QUADRANTS.map(q => sectorOf(`wall_${q}`, quadrants.has(q) ? 'invasive' : 'benign', [], scheme, jump('quadrants'))),
    ...RECTAL_QUADRANTS.map(q => sectorOf(`meso_${q}`, 'benign', [], scheme, jump('tmePlane'))),
    ...RECTAL_QUADRANTS.map(q => {
      if (crmMm === undefined) return sectorOf(`crm_${q}`, 'notSampled', [], scheme, jump('crmMm'));
      if (!closest.has(q)) return sectorOf(`crm_${q}`, 'marginClear', [], scheme, jump('crmMm'));
      return sectorOf(`crm_${q}`, crmInvolved ? 'marginPositive' : 'marginClear', [], scheme, jump('crmMm'), { marginMm: crmMm, involved: !!crmInvolved });
    }),
    sectorOf('long_rectum', 'benign', [], scheme, jump('reflection')),
    ...(reflection ? [sectorOf('long_tumour', 'invasive', [], scheme, jump('reflection'))] : []),
    sectorOf('long_distal', distalMm === undefined ? 'notSampled' : distalMm <= 0 ? 'marginPositive' : 'marginClear', [], scheme, jump('distalMarginMm'),
      distalMm !== undefined ? { marginMm: distalMm } : undefined),
  ];
  const hasData = quadrants.size > 0 || crmMm !== undefined || !!crmQuadrant || !!tme || !!reflection || distalMm !== undefined;
  const meta: Record<string, string> = {
    ...(tme ? { tme } : {}),
    ...(reflection ? { reflection } : {}),
    ...(crmMm !== undefined && !crmQuadrant ? { crmPosition: 'notGiven' } : {}),
    rule: `${thresholds.rectalCrmInvolvedOperator}:${thresholds.rectalCrmInvolvedMm}`,
  };
  return { sectors, ...(reflection ? { variant: reflection } : {}), meta, hasData };
}
