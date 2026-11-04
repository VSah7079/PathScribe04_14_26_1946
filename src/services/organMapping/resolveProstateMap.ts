// src/services/organMapping/resolveProstateMap.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 461: the prostate maps, worked out from the synoptic answers (Pete:
// "the cancer data will be available from the synoptic report"). The map
// holds no data of its own; this is the only place that decides what it shows.
//
// Prostatectomy / resection (PI-RADS v2.1, 41 sectors):
// • a sector with tumour takes the case's Grade Group (1 → gg1, 2 → gg2,
//   3–5 → ggHigh; tumour with no Grade Group yet → 'tumour'); else benign;
// • a seminal vesicle is involved when seminal vesicle invasion is answered
//   for its side (or bilateral), or its sector is ticked as tumour;
// • extraprostatic extension and a positive margin are overlays on their sectors.
//
// Needle biopsy (12 systematic sites + targeted cores), from the Core results
// grid: a site with no core is "not sampled"; a core without carcinoma is
// benign; with carcinoma, its own Grade Group. Two cores at one site show the
// more severe core (then the higher Grade Group), with the greatest % and
// length of the positive cores, whatever the order of the parts.
// ─────────────────────────────────────────────────────────────────────────────

import { partGridKey, type PartGridRow } from '../templates/partGrid';
import { PROSTATE_BIOPSY_SITES, PROSTATE_PIRADS_SECTORS } from './prostateSectors';
import type { OrganMapBinding, ProstateBiopsyBinding, ProstateSectorsBinding } from './organMapBindings';
import type { MapCategory, MapOverlay, OrganMapPayload, OrganMapScheme, OrganMapSectorDetails } from './organMapTypes';
import { chosen, legendFor, numberOr, organMapFingerprint, sectorOf, SEVERITY, type Answers } from './mapResolveShared';
import { resolveBreastMap } from './resolveBreastMap';
import { resolveMohsMap } from './resolveMohsMap';
import { resolveColorectalPolyp, resolveRectalResection } from './resolveColorectalMap';
import { resolveRenalResection } from './resolveRenalMap';
import { isFieldInputsBinding, type FieldInputsBinding, type NeckDissectionBinding } from './organMapBindings';
import { resolveNeckDissection, resolveOralCavity } from './resolveHeadNeckMap';
import { BUILT_IN_ORGAN_MAP_THRESHOLDS, type OrganMapThresholds } from './organMapScheme';

export { organMapFingerprint };

export function categoryForGradeGroup(gg: number | undefined): MapCategory {
  if (gg === undefined || !Number.isFinite(gg)) return 'tumour';
  return gg <= 1 ? 'gg1' : gg === 2 ? 'gg2' : 'ggHigh';
}

/** Batch 466d: a map's meta without the keys only the derived margin answers read (they change nothing drawn). */
const drawnMeta = (meta: Record<string, string> | undefined) => {
  if (!meta) return meta;
  const { adenomaAtMargin: _a, invasiveCarcinoma: _i, ...rest } = meta;
  return rest;
};

function resolveSectorsMap(binding: ProstateSectorsBinding, answers: Answers, scheme: OrganMapScheme) {
  const tumour = new Set(chosen(binding.tumourSectors, answers));
  const epe = new Set(chosen(binding.epeSectors, answers));
  const margin = new Set(chosen(binding.marginSectors, answers));
  const ggRaw = chosen(binding.gradeGroup, answers)[0];
  const gg = ggRaw === undefined ? undefined : Number(ggRaw);
  const sv = chosen(binding.svInvasion, answers)[0];
  if (sv === 'right' || sv === 'bilateral') tumour.add('r_sv');
  if (sv === 'left' || sv === 'bilateral') tumour.add('l_sv');
  const tumourCategory = categoryForGradeGroup(gg);
  const sectors = PROSTATE_PIRADS_SECTORS.map(s => {
    const overlays: MapOverlay[] = [...(epe.has(s.id) ? ['epe' as const] : []), ...(margin.has(s.id) ? ['positiveMargin' as const] : [])];
    const jump = margin.has(s.id) ? binding.marginSectors?.fieldId : epe.has(s.id) ? binding.epeSectors?.fieldId : binding.tumourSectors?.fieldId;
    return tumour.has(s.id)
      ? sectorOf(s.id, tumourCategory, overlays, scheme, jump, gg !== undefined ? { gradeGroup: gg } : undefined)
      : sectorOf(s.id, 'benign', overlays, scheme, jump);
  });
  const hasData = tumour.size > 0 || epe.size > 0 || margin.size > 0 || gg !== undefined || sv !== undefined;
  return { sectors, hasData };
}

function resolveBiopsyMap(binding: ProstateBiopsyBinding, answers: Answers, rows: readonly PartGridRow[], scheme: OrganMapScheme) {
  const g = binding.coreGrid;
  const cell = (rowId: string, col: string | undefined) => (col ? answers[partGridKey(g.fieldId, rowId, col)] : undefined);
  type Core = { label: string; category: MapCategory; positive: boolean; gradeGroup?: number; gleason?: string; percent?: number; lengthMm?: number };
  const bySite = new Map<string, Core[]>();
  for (const row of rows) {
    const site = g.values.site[String(cell(row.id, g.columns.site) ?? '')];
    if (!site) continue;
    const cancer = g.values.cancer[String(cell(row.id, g.columns.cancer) ?? '')];
    const ggRaw = g.values.gradeGroup[String(cell(row.id, g.columns.gradeGroup) ?? '')];
    const gg = ggRaw === undefined ? undefined : Number(ggRaw);
    const gp = g.values.gleason[String(cell(row.id, g.columns.gleasonPrimary) ?? '')];
    const gs = g.values.gleason[String(cell(row.id, g.columns.gleasonSecondary) ?? '')];
    const percent = numberOr(cell(row.id, g.columns.percent));
    const lengthMm = numberOr(cell(row.id, g.columns.length));
    const positive = cancer === 'yes' || (cancer === undefined && (gg !== undefined || (percent ?? 0) > 0));
    const category: MapCategory = positive ? categoryForGradeGroup(gg) : cancer === 'no' ? 'benign' : 'notSampled';
    bySite.set(site, [...(bySite.get(site) ?? []), {
      label: row.label, category, positive,
      ...(positive && gg !== undefined ? { gradeGroup: gg } : {}),
      ...(positive && gp && gs ? { gleason: `${gp}+${gs}=${Number(gp) + Number(gs)}` } : {}),
      ...(positive && percent !== undefined ? { percent } : {}),
      ...(positive && lengthMm !== undefined ? { lengthMm } : {}),
    }]);
  }
  // Several cores at one site: the most severe core (category, then Grade Group) gives the
  // colour, Grade Group and Gleason; % and length are the greatest of the positive cores,
  // whatever the order of the parts.
  const rank = (c: Core) => SEVERITY[c.category] * 10 + (c.gradeGroup ?? 0);
  const maxOf = (values: (number | undefined)[]) => { const v = values.filter((n): n is number => n !== undefined); return v.length ? Math.max(...v) : undefined; };
  const sectors = PROSTATE_BIOPSY_SITES
    .filter(s => s.kind === 'systematic' || bySite.has(s.id))
    .map(s => {
      const cores = bySite.get(s.id);
      if (!cores) return sectorOf(s.id, 'notSampled', [], scheme, g.fieldId);
      const best = cores.reduce((a, b) => (rank(b) > rank(a) ? b : a));
      const positives = cores.filter(c => c.positive);
      const percent = maxOf(positives.map(c => c.percent));
      const lengthMm = maxOf(positives.map(c => c.lengthMm));
      const details: OrganMapSectorDetails = {
        parts: cores.map(c => c.label),
        ...(best.gradeGroup !== undefined ? { gradeGroup: best.gradeGroup } : {}),
        ...(best.gleason ? { gleason: best.gleason } : {}),
        ...(percent !== undefined ? { percent } : {}),
        ...(lengthMm !== undefined ? { lengthMm } : {}),
      };
      return sectorOf(s.id, best.category, [], scheme, g.fieldId, details);
    });
  return { sectors, hasData: bySite.size > 0 };
}

/** Any organ's map, from the synoptic answers (Batch 462: one entry point for every map type). */
export function resolveOrganMap(input: {
  binding: OrganMapBinding;
  answers: Answers;
  scheme: OrganMapScheme;
  templateId: string;
  instanceId: string;
  /** The case's parts (the biopsy grid's rows; a breast foci grid's when its rows are parts). */
  rows?: readonly PartGridRow[];
  /** The site's thresholds (breast close margin); PathScribe's when absent. */
  thresholds?: OrganMapThresholds;
}): OrganMapPayload {
  const { binding, answers, scheme } = input;
  if (binding.mapType === 'mohsStages') {
    const m = resolveMohsMap(binding, answers, scheme);
    return {
      mapType: 'mohsStages', templateId: input.templateId, instanceId: input.instanceId,
      sectors: m.sectors, mohsStages: m.mohsStages, legend: legendFor(m.sectors, scheme), hasData: m.hasData,
      fingerprint: organMapFingerprint(m.sectors, [], undefined, m.mohsStages),
    };
  }
  if (binding.mapType === 'neckDissection' || binding.mapType === 'oralCavity') {
    // Batch 465: head and neck.
    const h = binding.mapType === 'neckDissection'
      ? resolveNeckDissection(binding as NeckDissectionBinding, answers, scheme)
      : resolveOralCavity(binding as FieldInputsBinding, answers, scheme, input.thresholds ?? BUILT_IN_ORGAN_MAP_THRESHOLDS);
    return {
      mapType: binding.mapType, templateId: input.templateId, instanceId: input.instanceId,
      sectors: h.sectors, meta: h.meta, legend: legendFor(h.sectors, scheme), hasData: h.hasData,
      fingerprint: organMapFingerprint(h.sectors, [], undefined, { meta: h.meta }),
    };
  }
  if (isFieldInputsBinding(binding)) {
    const thresholds = input.thresholds ?? BUILT_IN_ORGAN_MAP_THRESHOLDS;
    // Batch 466: the renal resection reads its inputs the same way.
    const c = binding.mapType === 'colorectalPolyp' ? resolveColorectalPolyp(binding, answers, scheme, thresholds)
      : binding.mapType === 'renalResection' ? resolveRenalResection(binding, answers, scheme, thresholds)
        : resolveRectalResection(binding, answers, scheme, thresholds);
    return {
      mapType: binding.mapType, templateId: input.templateId, instanceId: input.instanceId,
      sectors: c.sectors, ...(c.variant ? { variant: c.variant } : {}), meta: c.meta,
      legend: legendFor(c.sectors, scheme), hasData: c.hasData,
      // Batch 466d: the margin-status keys read by the derived answers don't change the drawing (left out).
      fingerprint: organMapFingerprint(c.sectors, [], undefined, { variant: c.variant ?? null, meta: drawnMeta(c.meta) }),
    };
  }
  if (binding.mapType === 'breastClock') {
    const b = resolveBreastMap(binding, answers, scheme, input.thresholds ?? BUILT_IN_ORGAN_MAP_THRESHOLDS, input.rows ?? []);
    return {
      mapType: 'breastClock', templateId: input.templateId, instanceId: input.instanceId,
      sectors: b.sectors, markers: b.markers, ...(b.side ? { side: b.side } : {}),
      legend: legendFor(b.sectors, scheme, b.markers), hasData: b.hasData,
      fingerprint: organMapFingerprint(b.sectors, b.markers, b.side),
    };
  }
  const { sectors, hasData } = binding.mapType === 'prostateBiopsy'
    ? resolveBiopsyMap(binding, answers, input.rows ?? [], scheme)
    : resolveSectorsMap(binding, answers, scheme);
  return {
    mapType: binding.mapType,
    templateId: input.templateId,
    instanceId: input.instanceId,
    sectors,
    legend: legendFor(sectors, scheme),
    hasData,
    fingerprint: organMapFingerprint(sectors),
  };
}

/** The Batch 461 name, kept: every map type now goes through resolveOrganMap. */
export const resolveProstateMap = resolveOrganMap;
