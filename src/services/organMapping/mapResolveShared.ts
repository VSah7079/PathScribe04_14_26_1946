// src/services/organMapping/mapResolveShared.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 462: what every organ's resolver shares (moved out of
// resolveProstateMap.ts): reading a bound choice question, numbers, a
// sector's shape, the legend and the fingerprint.
// ─────────────────────────────────────────────────────────────────────────────

import { sha256Hex } from '../registrySubmission/sha256';
import type { ChoiceBinding } from './organMapBindings';
import type {
  MapCategory, MapOverlay, MapStyleKey, OrganMapLegendEntry, OrganMapMarker, OrganMapScheme, OrganMapSector, OrganMapSectorDetails,
} from './organMapTypes';
import { MAP_CATEGORIES, MAP_OVERLAYS } from './organMapTypes';

export type Answers = Record<string, string | string[] | number | undefined>;

/** How severe a category is: the most severe wins where several meet. */
export const SEVERITY: Record<MapCategory, number> = {
  notSampled: 0, benign: 1, tumour: 2, gg1: 3, gg2: 4, ggHigh: 5,
  calcifications: 2, dcis: 3, invasive: 4,
  marginClear: 1, marginClose: 2, marginPositive: 3,
  residualTumour: 3,
  adenoma: 2,
};

/** The meanings of the answers given to a bound choice question. */
export function chosen(binding: ChoiceBinding | undefined, answers: Answers): string[] {
  if (!binding) return [];
  const raw = answers[binding.fieldId];
  const ids = Array.isArray(raw) ? raw : raw === undefined || raw === '' ? [] : [String(raw)];
  return ids.map(id => binding.values[id]).filter((v): v is string => !!v);
}

export const numberOr = (v: unknown): number | undefined => {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').trim());
  return String(v ?? '').trim() === '' || !Number.isFinite(n) ? undefined : n;
};

/** Only what the map shows: its sectors' and markers' categories, then its overlays. */
export function legendFor(sectors: OrganMapSector[], scheme: OrganMapScheme, markers: readonly OrganMapMarker[] = []): OrganMapLegendEntry[] {
  const cats = new Set<MapCategory>([...sectors.map(s => s.category), ...markers.map(m => m.category)]);
  const ovs = new Set(sectors.flatMap(s => s.overlays.map(o => o.key)));
  const entry = (key: MapStyleKey, kind: OrganMapLegendEntry['kind']): OrganMapLegendEntry =>
    ({ key, kind, pattern: scheme[key].pattern, ...(scheme[key].label ? { label: scheme[key].label } : {}) });
  return [
    ...MAP_CATEGORIES.filter(c => cats.has(c)).map(c => entry(c, 'category')),
    ...MAP_OVERLAYS.filter(o => ovs.has(o)).map(o => entry(o, 'overlay')),
  ];
}

/** Changes whenever what the map shows changes (not when only the colours do). */
export function organMapFingerprint(sectors: readonly OrganMapSector[], markers: readonly OrganMapMarker[] = [], side?: string, extra?: unknown): string {
  const shown: unknown[] = sectors.map(s => [s.id, s.category, s.overlays.map(o => o.key), s.details ?? null]);
  // Prostate maps (no markers, no side) keep the fingerprints they had in Batch 461.
  if (markers.length || side) shown.push(['markers', markers.map(m => [m.id, m.category, m.x, m.y, m.label, m.details ?? null]), side ?? null]);
  // Batch 463: Mohs stage summaries (time, blocks cut).
  if (extra !== undefined) shown.push(['extra', extra]);
  return sha256Hex(JSON.stringify(shown));
}

export function sectorOf(id: string, category: MapCategory, overlays: MapOverlay[], scheme: OrganMapScheme, jumpFieldId: string | undefined, details?: OrganMapSectorDetails): OrganMapSector {
  return {
    id, category, pattern: scheme[category].pattern,
    overlays: overlays.map(key => ({ key, pattern: scheme[key].pattern })),
    ...(jumpFieldId ? { jumpFieldId } : {}),
    ...(details && Object.keys(details).length ? { details } : {}),
  };
}
