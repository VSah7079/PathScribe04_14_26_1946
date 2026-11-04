// src/services/organMapping/organMapLabels.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 461: the words on a map — sector names, captions, legend, a sector's
// summary — built from the translation function the caller passes in, so the
// screen drawing and the report image say exactly the same thing in the
// user's language. A site's own legend wording (the scheme's `label`) wins
// over the translated default.
// ─────────────────────────────────────────────────────────────────────────────

import { PROSTATE_BIOPSY_SITES, PROSTATE_PIRADS_SECTORS } from './prostateSectors';
import { breastQuadrantOfHour, type BreastSide } from './breastGeometry';
import type { OrganMapDrawingLabels } from './organMapDrawing';
import { formatList } from '@/utils/formatList';
import type { MapStyleKey, OrganMapPayload, OrganMapScheme, OrganMapSector, OrganMapType } from './organMapTypes';

export type Translate = (key: string, options?: Record<string, unknown>) => string;

const P = 'organMap.prostate';
const B = 'organMap.breast';
const M = 'organMap.mohs';
const C = 'organMap.colorectal';
const isColorectal = (t: OrganMapType) => t === 'colorectalPolyp' || t === 'rectalResection';
const H = 'organMap.headNeck';
const R = 'organMap.renal';

/** Batch 465: a neck level's name ("Right neck, level IIa"). */
function neckName(t: Translate, id: string): string {
  const m = /^(R|L)_(\w+)$/.exec(id);
  return m ? t(`${H}.neck.levelName`, { side: t(`${H}.neck.side.${m[1]}`), level: m[2] }) : id;
}

/** Batch 463: a Mohs sector's name (stage, clock position or deep). */
function mohsName(t: Translate, id: string): string {
  const m = /^s(\d+)_(c(\d+)|deep)$/.exec(id);
  if (!m) return id;
  return m[2] === 'deep'
    ? t(`${M}.deepName`, { stage: Number(m[1]) })
    : t(`${M}.sectorName`, { stage: Number(m[1]), hour: t(`${B}.hourName`, { n: Number(m[3]) }) });
}

/** Batch 462: a breast sector's, margin half's or focus's name. */
function breastName(t: Translate, id: string, side: BreastSide | undefined): string {
  const hour = /^h(\d+)$/.exec(id);
  if (hour) {
    const q = breastQuadrantOfHour(Number(hour[1]), side);
    const name = t(`${B}.hourName`, { n: Number(hour[1]) });
    return q ? t(`${B}.inQuadrant`, { name, quadrant: t(`${B}.quadrantName.${q}`) }) : name;
  }
  if (id === 'central') return t(`${B}.central`);
  const margin = /^m_(\w+)_(inv|dcis)$/.exec(id);
  if (margin) return t(`${B}.marginName`, { face: t(`${B}.face.${margin[1]}`), kind: t(`${B}.kind.${margin[2]}`) });
  const focus = /^focus_(.+)$/.exec(id);
  if (focus) return t(`${B}.focusName`, { n: focus[1] });
  return id;
}

export function organMapSectorName(t: Translate, mapType: OrganMapType, id: string, breastSide?: BreastSide): string {
  if (mapType === 'breastClock') return breastName(t, id, breastSide);
  if (mapType === 'mohsStages') return mohsName(t, id);
  // Batch 464: colorectal sectors (polyp levels and margins; rectal wall, mesorectum, CRM, long view).
  if (isColorectal(mapType)) return t(`${C}.sector.${id}`);
  if (mapType === 'oralCavity') return t(`${H}.oral.sector.${id}`);
  if (mapType === 'neckDissection') return neckName(t, id);
  if (mapType === 'renalResection') return t(`${R}.sector.${id}`);
  const side = (s?: string) => (s ? t(`${P}.side.${s}`) : '');
  const level = (l?: string) => (l ? t(`${P}.level.${l}`) : '');
  if (mapType === 'prostateBiopsy') {
    const site = PROSTATE_BIOPSY_SITES.find(s => s.id === id);
    if (!site) return id;
    if (site.kind === 'targeted') return t(`${P}.targetName`, { n: site.roi });
    return t(`${P}.siteName`, { side: side(site.side), level: level(site.level), aspect: t(`${P}.aspect.${site.aspect}`) });
  }
  const sector = PROSTATE_PIRADS_SECTORS.find(s => s.id === id);
  if (!sector) return id;
  if (sector.kind === 'seminalVesicle') return t(`${P}.seminalVesicle`, { side: side(sector.side) });
  if (sector.kind === 'urethralSphincter') return t(`${P}.urethralSphincter`);
  return t(`${P}.sectorName`, { side: side(sector.side), level: level(sector.level), zone: t(`${P}.zone.${sector.zone}`) });
}

/** Batch 463: a sector's name within its stage, for the stage's checklist rows
 *  (12 o'clock, Deep); the full name stays the checkbox's accessible label. */
export function organMapSectorShortName(t: Translate, mapType: OrganMapType, sectorId: string): string {
  if (mapType !== 'mohsStages') return organMapSectorName(t, mapType, sectorId);
  const hour = /^c(\d+)$/.exec(sectorId);
  return hour ? t(`${B}.hourName`, { n: Number(hour[1]) }) : sectorId === 'deep' ? t(`${M}.deepShort`) : sectorId;
}

/** A legend entry's words: the site's own, else the map type's (a breast margin "not given", not "not sampled"), else the general one. */
export function organMapLegendLabel(t: Translate, scheme: OrganMapScheme, key: MapStyleKey, mapType?: OrganMapType): string {
  if (scheme[key]?.label) return scheme[key].label!;
  const general = t(`organMap.legend.${key}`);
  return mapType && LEGEND_BY_MAP[mapType]?.includes(key) ? t(`organMap.legendByMap.${mapType}.${key}`) : general;
}
const LEGEND_BY_MAP: Partial<Record<OrganMapType, readonly MapStyleKey[]>> = {
  breastClock: ['benign', 'notSampled'], mohsStages: ['marginClear'],
  colorectalPolyp: ['benign', 'notSampled', 'marginPositive'], rectalResection: ['benign', 'notSampled', 'marginPositive'],
  oralCavity: ['benign', 'notSampled', 'marginPositive', 'marginClose', 'invasive'], neckDissection: ['benign', 'notSampled', 'invasive'],
  renalResection: ['benign', 'notSampled', 'marginPositive', 'invasive'],
};

/** The short text inside a sector, one entry per line: the zone on the sector
 *  map; on the biopsy map the part(s) and, for carcinoma, Grade Group and %
 *  (a dash for a site not sampled). */
export function organMapInlineText(t: Translate, mapType: OrganMapType, sector: OrganMapSector | undefined, shapeId: string): string[] {
  if (mapType === 'mohsStages') {
    // A positive sector shows its block; the deep disc is named.
    const block = sector?.category === 'residualTumour' ? sector.details?.block : undefined;
    return [...(shapeId.endsWith('_deep') ? [t(`${M}.deepShort`)] : []), ...(block ? [block] : [])];
  }
  if (mapType === 'renalResection') {
    // Batch 466: a tumour zone shows its aspect (A, P, A+P); a compartment its short name; the soft tissue or
    // parenchymal margin its distance; the vein and ureter margins their status.
    if (/_(lateral|medial)$/.test(shapeId)) return sector?.details?.aspect ? [t(`${R}.aspectShort.${sector.details.aspect}`)] : [];
    if (shapeId === 'm_softTissue' || shapeId === 'm_parenchymal') {
      const mm = sector?.details?.marginMm;
      return mm === undefined ? [] : [t(`${R}.inline.mm`, { n: mm })];
    }
    if (shapeId === 'm_vein' || shapeId === 'm_ureter') {
      return sector?.category === 'marginPositive' ? [t(`${R}.inline.involved`)] : sector?.category === 'marginClear' ? [t(`${R}.inline.notInvolved`)] : [];
    }
    return [t(`${R}.short.${shapeId}`)];
  }
  if (mapType === 'oralCavity') {
    // A margin shows its distance; a subsite its short name (the side shows from where it is drawn).
    if (shapeId === 'mPeripheral' || shapeId === 'mDeep') {
      const mm = sector?.details?.marginMm;
      return mm === undefined ? [] : [t(`${H}.inline.mm`, { n: mm })];
    }
    return [t(`${H}.oral.short.${shapeId.replace(/[RL]$/, '')}`)];
  }
  if (mapType === 'neckDissection') {
    // The level, then its nodes positive / examined when given.
    const d = sector?.details;
    const level = shapeId.replace(/^[RL]_/, '');
    return d?.nodesExamined !== undefined || d?.nodesPositive !== undefined
      ? [level, t(`${H}.neck.inlineNodes`, { p: d?.nodesPositive ?? 0, e: d?.nodesExamined ?? '–' })]
      : [level];
  }
  if (isColorectal(mapType)) {
    // A margin shows its distance (when given); nothing else carries text.
    const mm = sector?.details?.marginMm;
    return mm === undefined ? [] : [t(`${C}.inline.mm`, { n: mm })];
  }
  if (mapType === 'breastClock') {
    // Margin halves show their distance; the clock's sectors leave their foci to the markers.
    if (!shapeId.startsWith('m_')) return [];
    const mm = sector?.details?.marginMm;
    return [mm === undefined ? t('organMap.inline.notSampled') : t('organMap.inline.mm', { n: mm })];
  }
  if (mapType === 'prostateSectors') {
    if (shapeId.endsWith('_sv')) return [t(`${P}.short.sv`)];
    if (shapeId === 'us') return [t(`${P}.short.us`)];
    const zone = PROSTATE_PIRADS_SECTORS.find(s => s.id === shapeId)?.zone;
    return zone ? [t(`${P}.short.zone.${zone}`)] : [];
  }
  if (!sector || sector.category === 'notSampled') return [t('organMap.inline.notSampled')];
  const d = sector.details ?? {};
  const result = [
    ...(d.gradeGroup !== undefined ? [t('organMap.inline.gradeGroup', { n: d.gradeGroup })] : []),
    ...(d.percent !== undefined ? [t('organMap.inline.percent', { n: d.percent })] : []),
  ];
  return [
    ...(d.parts?.length ? [organMapPartsText(t, d.parts)] : []),
    ...(result.length ? [result.reduce((a, b) => t('organMap.details.separator', { a, b }))] : []),
  ];
}

/** Part labels joined in the user's language (A, B). */
export const organMapPartsText = (t: Translate, parts: readonly string[]) => parts.reduce((a, b) => t('organMap.details.partsJoin', { a, b }));

const BREAST_CAPTION_KEYS = [
  'side.right', 'side.left', 'side.unknown', ...Array.from({ length: 12 }, (_, i) => `hour.h${i + 1}`),
  'quadrant.UOQ', 'quadrant.UIQ', 'quadrant.LOQ', 'quadrant.LIQ',
  'margins.title', 'margins.halves', 'orientation',
  'faceShort.superior', 'faceShort.inferior', 'faceShort.medial', 'faceShort.lateral', 'faceShort.anterior', 'faceShort.posterior',
] as const;

/** The drawing's words for a resolved map (its side, its Mohs stages; Batch 464: its colorectal meta). */
export const organMapLabelsFor = (t: Translate, payload: Pick<OrganMapPayload, 'mapType' | 'side' | 'mohsStages' | 'meta'>, scheme: OrganMapScheme) =>
  organMapDrawingLabels(t, payload.mapType, scheme, payload.side, payload.mohsStages, payload.meta);

/** Batch 464: "Margin involved: ≤ 1 mm" from a rule 'lte:1'. */
function ruleText(t: Translate, rule: string | undefined, key: string): string {
  const [op, n] = (rule ?? 'lte:1').split(':');
  return t(`${C}.${key}`, { op: t(`${C}.operator.${op}`), n: Number(n) });
}

const COLORECTAL_CAPTION_KEYS: Record<'colorectalPolyp' | 'rectalResection', readonly string[]> = {
  colorectalPolyp: ['level.h1', 'level.h2', 'level.h3', 'level.h4', 'level.sm1', 'level.sm2', 'level.sm3', 'layer.mucosa', 'margin.deep', 'margin.lateral', 'scale.haggitt', 'scale.kikuchi'],
  rectalResection: ['view.cross', 'view.crossNote', 'view.long', 'orient.anterior', 'orient.posterior', 'orient.right', 'orient.left', 'orient.proximal', 'reflection', 'margin.distal'],
};

/** Batch 465: the head and neck captions (the oral rules and depth of invasion; the neck's totals and ENE). */
function headNeckCaptions(t: Translate, mapType: 'oralCavity' | 'neckDissection', meta: Record<string, string> | undefined): Record<string, string> {
  if (mapType === 'oralCavity') {
    const [inv, close] = (meta?.rule ?? 'lt:1|lte:5').split('|').map(r => r.split(':'));
    return {
      ...Object.fromEntries(['view', 'orient.right', 'orient.left', 'margins.title', 'margin.peripheral', 'margin.deep'].map(k => [k, t(`${H}.oral.caption.${k}`)])),
      doi: meta?.doi !== undefined ? t(`${H}.oral.caption.doi`, { n: Number(meta.doi) }) : t(`${H}.oral.caption.doiNotGiven`),
      'rule.involved': t(`${H}.oral.ruleInvolved`, { op: t(`${C}.operator.${inv[0]}`), n: Number(inv[1]) }),
      // Batch 465b: when the site's rules conflict, the close line says what the map used instead.
      'rule.close': meta?.ruleConflict === 'none' ? t(`${H}.oral.ruleCloseNone`)
        : meta?.ruleConflict === 'fallback' ? t(`${H}.oral.ruleCloseFallback`, { op: t(`${C}.operator.${close[0]}`), n: Number(close[1]) })
          : t(`${H}.oral.ruleClose`, { op: t(`${C}.operator.${close[0]}`), n: Number(close[1]) }),
      dysplasia: meta?.dysplasia ? t(`${H}.oral.caption.dysplasia.${meta.dysplasia}`) : '',
    };
  }
  const totals = t(`${H}.neck.totals`, { p: Number(meta?.positive ?? 0), e: Number(meta?.examined ?? 0) });
  return {
    ...Object.fromEntries(['side.R', 'side.L', 'orient.anterior', 'mandible'].map(k => [k, t(`${H}.neck.caption.${k}`)])),
    totals: t('organMap.details.separator', { a: totals, b: t(`${H}.neck.ene.${meta?.ene ?? 'absent'}`) }),
  };
}

/** Batch 464: the colorectal captions, with the Paris type, the TME plane and the site's margin rule. */
function colorectalCaptions(t: Translate, mapType: 'colorectalPolyp' | 'rectalResection', meta: Record<string, string> | undefined): Record<string, string> {
  const captions: Record<string, string> = Object.fromEntries(COLORECTAL_CAPTION_KEYS[mapType].map(k => [k, t(`${C}.caption.${k}`)]));
  if (mapType === 'colorectalPolyp') {
    captions.title = meta?.paris ? t(`${C}.caption.titleParis`, { paris: t(`${C}.value.${meta.paris}`) }) : t(`${C}.caption.titleNoParis`);
    captions.rule = ruleText(t, meta?.rule, 'polypRule');
  } else {
    const plane = meta?.tme ? t(`${C}.caption.tmePlane`, { plane: t(`${C}.value.${meta.tme}`) }) : t(`${C}.caption.tmeNotGiven`);
    const rule = ruleText(t, meta?.rule, 'crmRule');
    const withRule = t('organMap.details.separator', { a: plane, b: rule });
    captions.tme = meta?.crmPosition === 'notGiven' ? t('organMap.details.separator', { a: withRule, b: t(`${C}.caption.crmPositionNotGiven`) }) : withRule;
  }
  return captions;
}

/** Batch 466: the renal captions — poles, orientation, margins, the site's rule for the third margin, the
 *  aspect and the pT the extent and size point to. */
function renalCaptions(t: Translate, meta: Record<string, string> | undefined): Record<string, string> {
  const rule = (r: string | undefined) => { const [op, n] = (r ?? 'eq:0').split(':'); return { op: t(`${C}.operator.${op}`), n: Number(n) }; };
  const keys = ['view', 'pole.upper', 'pole.middle', 'pole.lower', 'orient.lateral', 'orient.medial', 'diaphragm', 'margins.title', 'margin.vein', 'margin.ureter', 'margin.softTissue', 'margin.capsular', 'margin.parenchymal'];
  return {
    ...Object.fromEntries(keys.map(k => [k, t(`${R}.caption.${k}`)])),
    // Batch 466b: each margin judged by distance has its rule line (a partial nephrectomy has two).
    'rule.softTissue': t(`${R}.rule.softTissue`, rule(meta?.rule)),
    'rule.parenchymal': t(`${R}.rule.parenchymal`, rule(meta?.ruleParenchymal)),
    aspect: meta?.aspect ? t(`${R}.caption.aspect.${meta.aspect}`) : t(`${R}.caption.aspectNotGiven`),
    pT: meta?.pT ? t(`${R}.caption.pT`, { pT: meta.pT }) : meta?.pTNeedsSize ? t(`${R}.caption.pTNeedsSize`) : t(`${R}.caption.pTNotGiven`),
    pTNote: t(`${R}.caption.pTNote`),
  };
}

/** Everything the drawing needs, in the user's language. */
export function organMapDrawingLabels(t: Translate, mapType: OrganMapType, scheme: OrganMapScheme, side?: BreastSide, mohsStages?: OrganMapPayload['mohsStages'], meta?: OrganMapPayload['meta']): OrganMapDrawingLabels {
  if (mapType === 'renalResection') {
    return {
      title: t(`organMap.title.${mapType}`), captions: renalCaptions(t, meta),
      sectorName: id => organMapSectorName(t, mapType, id),
      legend: key => organMapLegendLabel(t, scheme, key, mapType),
      inline: (sector, shapeId) => organMapInlineText(t, mapType, sector, shapeId),
    };
  }
  if (mapType === 'oralCavity' || mapType === 'neckDissection') {
    return {
      title: t(`organMap.title.${mapType}`), captions: headNeckCaptions(t, mapType, meta),
      sectorName: id => organMapSectorName(t, mapType, id),
      legend: key => organMapLegendLabel(t, scheme, key, mapType),
      inline: (sector, shapeId) => organMapInlineText(t, mapType, sector, shapeId),
    };
  }
  if (mapType === 'colorectalPolyp' || mapType === 'rectalResection') {
    return {
      title: t(`organMap.title.${mapType}`), captions: colorectalCaptions(t, mapType, meta),
      sectorName: id => organMapSectorName(t, mapType, id),
      legend: key => organMapLegendLabel(t, scheme, key, mapType),
      inline: (sector, shapeId) => organMapInlineText(t, mapType, sector, shapeId),
    };
  }
  if (mapType === 'mohsStages') {
    const captions: Record<string, string> = Object.fromEntries([12, 3, 6, 9].map(h => [`hour.h${h}`, t(`${B}.hour.h${h}`)]));
    for (const st of mohsStages ?? []) {
      captions[`stage.${st.number}.title`] = st.time ? t(`${M}.stageTitleTime`, { n: st.number, time: st.time }) : t(`${M}.stageTitle`, { n: st.number });
      captions[`stage.${st.number}.status`] = st.clear
        ? t(`${M}.stageClear`)
        : st.blocks !== undefined ? t(`${M}.stageResidualBlocks`, { count: st.blocks }) : t(`${M}.stageResidual`);
    }
    return {
      title: t(`organMap.title.${mapType}`), captions,
      sectorName: id => organMapSectorName(t, mapType, id),
      legend: key => organMapLegendLabel(t, scheme, key, mapType),
      inline: (sector, shapeId) => organMapInlineText(t, mapType, sector, shapeId),
    };
  }
  const captionKeys = mapType === 'breastClock'
    ? [...BREAST_CAPTION_KEYS]
    : mapType === 'prostateBiopsy'
      ? ['level.base', 'level.mid', 'level.apex', 'side.right', 'side.left', 'targeted']
      : ['level.base', 'level.mid', 'level.apex', 'side.rightShort', 'side.leftShort', 'orientation'];
  const prefix = mapType === 'breastClock' ? B : P;
  return {
    title: t(`organMap.title.${mapType}`),
    captions: Object.fromEntries(captionKeys.map(k => [k, t(`${prefix}.${k}`)])),
    sectorName: id => organMapSectorName(t, mapType, id, side),
    legend: key => organMapLegendLabel(t, scheme, key, mapType),
    inline: (sector, shapeId) => organMapInlineText(t, mapType, sector, shapeId),
  };
}

/** One line for a sector's tooltip and accessible name: its name, what it
 *  shows, then the core details (part, Grade Group, Gleason, %, length). */
export function organMapSectorSummary(t: Translate, mapType: OrganMapType, sector: Pick<OrganMapSector, 'id' | 'category' | 'details'> & { overlays?: OrganMapSector['overlays'] }, scheme: OrganMapScheme, side?: BreastSide): string {
  const d = sector.details ?? {};
  const pieces = [
    organMapSectorName(t, mapType, sector.id, side),
    organMapLegendLabel(t, scheme, sector.category, mapType),
    ...(sector.overlays ?? []).map(o => organMapLegendLabel(t, scheme, o.key, mapType)),
    // Breast: the foci at a clock position, a focus's size and distance, a margin's distance.
    ...(d.foci?.length && !sector.id.startsWith('focus_') ? [t(d.foci.length > 1 ? `${B}.details.foci` : `${B}.details.focus`, { label: organMapPartsText(t, d.foci) })] : []),
    // A focus says where it is (clock position and quadrant), for screen readers too.
    ...(d.clock !== undefined ? [d.clock === 'central' ? t(`${B}.central`) : breastName(t, `h${d.clock}`, side)] : []),
    ...(d.sizeMm !== undefined ? [t(`${B}.details.size`, { n: d.sizeMm })] : []),
    ...(d.distanceCm !== undefined ? [t(`${B}.details.distance`, { n: d.distanceCm })] : []),
    ...(d.marginMm !== undefined ? [t(`${B}.details.margin`, { n: d.marginMm })] : []),
    // Batch 464: whether the site's rule calls this margin involved.
    ...(d.involved !== undefined ? [t(d.involved ? `${C}.details.involved` : `${C}.details.notInvolved`)] : []),
    // Batch 466: a renal tumour zone's aspect.
    ...(d.aspect ? [t(`${R}.details.aspect.${d.aspect}`)] : []),
    // Batch 465: a neck level's nodes, largest deposit and ENE.
    ...(d.nodesPositive !== undefined || d.nodesExamined !== undefined ? [t(`${H}.details.nodes`, { p: d.nodesPositive ?? 0, e: d.nodesExamined ?? '–' })] : []),
    ...(d.largestMm !== undefined ? [t(`${H}.details.largest`, { n: d.largestMm })] : []),
    // (The level's ENE is named by its outline's legend wording, above.)
    // Mohs: a positive sector's block and histology.
    ...(d.block ? [t(`${M}.details.block`, { block: d.block })] : []),
    ...(d.histology ? [d.histology] : []),
    ...(d.parts?.length ? [t(d.parts.length > 1 ? 'organMap.details.parts' : 'organMap.details.part', { label: organMapPartsText(t, d.parts) })] : []),
    // The exact Grade Group only where the category doesn't already say it ("3 or higher").
    ...(d.gradeGroup !== undefined && sector.category === 'ggHigh' ? [t('organMap.details.gradeGroup', { n: d.gradeGroup })] : []),
    ...(d.gleason ? [t('organMap.details.gleason', { score: d.gleason })] : []),
    ...(d.percent !== undefined ? [t('organMap.details.percent', { n: d.percent })] : []),
    ...(d.lengthMm !== undefined ? [t('organMap.details.length', { n: d.lengthMm })] : []),
  ];
  return pieces.reduce((a, b) => t('organMap.details.separator', { a, b }));
}

/** Batch 466d: the sign-out warning for invasive carcinoma whose margins aren't all reported — a line per
 *  synoptic naming the margins still blank (listed in the user's language), then the question. */
export function invasiveMarginGapsMessage(t: Translate, language: string, gaps: readonly { templateName: string; mapType: OrganMapType; margins: string[] }[]): string {
  return [
    ...gaps.map(g => t('organMap.derived.invasiveMarginsIncomplete', {
      synoptic: g.templateName,
      margins: formatList(g.margins.map(m => t(`organMapsSection.bindings.derived.margin.${g.mapType}.${m}`)), language),
    })),
    t('organMap.derived.invasiveMarginsPrompt'),
  ].join('\n');
}
