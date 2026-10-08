// src/services/organMapping/resolveBreastMap.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 462: the breast map, worked out from the synoptic answers (as every
// map: no data of its own).
//
// Clock face (from the Foci grid, a row per focus: type, clock position,
// distance from the nipple, size):
// • each focus is a marker at its clock position and distance;
// • an hour sector (or the central zone) takes the most severe tumour there:
//   invasive carcinoma over DCIS; calcifications alone leave it benign (they
//   show as their marker);
// • quadrants follow from the clock position and the specimen's side
//   (breastGeometry.breastQuadrantOfHour).
//
// Margins (from the Margins grid, a row per oriented margin, distance in mm
// for invasive carcinoma and for DCIS): 0 mm (on ink) = positive; under the
// site's close-margin threshold (2 mm unless the site sets another) = close;
// otherwise clear; no distance (or a negative one) = not given. Several rows
// bound to one face show the closest. Foci that would overlap are fanned out.
// ─────────────────────────────────────────────────────────────────────────────

import { partGridKey, partGridRowsFromAnswers, type PartGridRow } from '../templates/partGrid';
import type { BreastClockBinding } from './organMapBindings';
import {
  BREAST_FACES, BREAST_HOURS, BREAST_MARKER_RADIUS, breastMarkerCandidates, type BreastSide,
} from './breastGeometry';
import { chosen, numberOr, sectorOf, SEVERITY, type Answers } from './mapResolveShared';
import type { OrganMapThresholds } from './organMapScheme';
import type { MapCategory, OrganMapMarker, OrganMapScheme, OrganMapSector } from './organMapTypes';

/** A margin's status from its distance (mm) and the site's close threshold.
 *  A negative distance is not a distance: treated as not given. */
export function breastMarginCategory(distanceMm: number | undefined, closeBelowMm: number): MapCategory {
  if (distanceMm === undefined || distanceMm < 0) return 'notSampled';
  if (distanceMm <= 0) return 'marginPositive';
  return distanceMm < closeBelowMm ? 'marginClose' : 'marginClear';
}

/** A focus row's label: its number for PathScribe's numbered rows (r1 → 1), the
 *  part's label when the grid's rows are the case's parts (A, B — never the
 *  specimen id, which carries the accession), else its row id. */
function focusLabel(rowId: string, parts: readonly PartGridRow[]): string {
  if (/^r\d+$/.test(rowId)) return rowId.slice(1);
  return parts.find(p => p.id === rowId)?.label ?? rowId;
}

/** Marker centres closer than this overlap (two radii and a gap). */
const MIN_MARKER_GAP = BREAST_MARKER_RADIUS * 2 + 2;

export function resolveBreastMap(binding: BreastClockBinding, answers: Answers, scheme: OrganMapScheme, thresholds: OrganMapThresholds, parts: readonly PartGridRow[] = []) {
  const sideValue = chosen(binding.side, answers)[0];
  const side: BreastSide | undefined = sideValue === 'right' || sideValue === 'left' ? sideValue : undefined;

  // ── Foci ─────────────────────────────────────────────────────────────────
  type Focus = { label: string; rowId: string; type: 'invasive' | 'dcis' | 'calcifications'; clock: number | 'central'; distanceCm?: number; sizeMm?: number };
  const foci: Focus[] = [];
  const f = binding.foci;
  if (f) {
    const cell = (rowId: string, col: string | undefined) => (col ? answers[partGridKey(f.fieldId, rowId, col)] : undefined);
    for (const row of partGridRowsFromAnswers(f.fieldId, answers)) {
      const type = f.values.type[String(cell(row.id, f.columns.type) ?? '')];
      const clockRaw = f.values.clock[String(cell(row.id, f.columns.clock) ?? '')];
      if (type !== 'invasive' && type !== 'dcis' && type !== 'calcifications') continue;
      if (!clockRaw) continue;
      const clock = clockRaw === 'central' ? 'central' : Number(clockRaw);
      if (clock !== 'central' && !(clock >= 1 && clock <= 12)) continue;
      const distanceCm = numberOr(cell(row.id, f.columns.distance));
      const sizeMm = numberOr(cell(row.id, f.columns.size));
      foci.push({
        label: focusLabel(row.id, parts), rowId: row.id, type, clock,
        ...(distanceCm !== undefined ? { distanceCm } : {}), ...(sizeMm !== undefined ? { sizeMm } : {}),
      });
    }
    foci.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  }

  const zoneId = (clock: number | 'central') => (clock === 'central' ? 'central' : `h${clock}`);
  const sectors: OrganMapSector[] = [...BREAST_HOURS.map(h => `h${h}`), 'central'].map(id => {
    const here = foci.filter(x => zoneId(x.clock) === id);
    const tumours = here.filter(x => x.type !== 'calcifications');
    const category: MapCategory = tumours.reduce<MapCategory>((best, x) => (SEVERITY[x.type] > SEVERITY[best] ? x.type : best), 'benign');
    return sectorOf(id, category, [], scheme, f?.fieldId, here.length ? { foci: here.map(x => x.label) } : undefined);
  });

  // Every focus stays visible: a marker that would overlap one already placed
  // moves along its clock line, then to either side (breastMarkerCandidates).
  const placed: { x: number; y: number }[] = [];
  const markers: OrganMapMarker[] = foci.map(x => {
    const candidates = breastMarkerCandidates(x.clock, x.distanceCm);
    const pos = candidates.find(c => !placed.some(p => Math.hypot(p.x - c.x, p.y - c.y) < MIN_MARKER_GAP)) ?? candidates[0];
    placed.push(pos);
    return {
      id: `focus_${x.label}`, category: x.type, pattern: scheme[x.type].pattern, x: pos.x, y: pos.y, r: BREAST_MARKER_RADIUS, label: x.label,
      ...(f ? { jumpFieldId: f.fieldId } : {}),
      details: {
        foci: [x.label], clock: x.clock,
        ...(x.sizeMm !== undefined ? { sizeMm: x.sizeMm } : {}), ...(x.distanceCm !== undefined ? { distanceCm: x.distanceCm } : {}),
      },
    };
  });

  // ── Margins ──────────────────────────────────────────────────────────────
  const m = binding.margins;
  // Several rows may describe one face (a lab's superior-anterior and superior-posterior):
  // the face shows the closest distance.
  const rowsOfFace: Record<string, string[]> = {};
  if (m) for (const [rowId, face] of Object.entries(m.rows)) (rowsOfFace[face] ??= []).push(rowId);
  let marginAnswered = false;
  for (const face of BREAST_FACES) {
    for (const kind of ['inv', 'dcis'] as const) {
      const col = kind === 'inv' ? m?.columns.invasive : m?.columns.dcis;
      const distances = m && col
        ? (rowsOfFace[face] ?? []).map(rowId => numberOr(answers[partGridKey(m.fieldId, rowId, col)])).filter((n): n is number => n !== undefined && n >= 0)
        : [];
      const distance = distances.length ? Math.min(...distances) : undefined;
      if (distance !== undefined) marginAnswered = true;
      sectors.push(sectorOf(`m_${face}_${kind}`, breastMarginCategory(distance, thresholds.breastCloseMarginMm), [], scheme, m?.fieldId,
        distance !== undefined ? { marginMm: distance } : undefined));
    }
  }

  return { sectors, markers, side, hasData: foci.length > 0 || marginAnswered || side !== undefined };
}
