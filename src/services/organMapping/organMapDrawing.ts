// src/services/organMapping/organMapDrawing.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 461: what both drawings of a map share — the shapes for a map type,
// the fill pattern definitions — and the standalone SVG for the report.
//
// The screen draws with CSS classes and the site's colours as custom
// properties (components/OrganMap). The report image must stand alone (PDF,
// HL7/FHIR attachments), so renderOrganMapSvg writes the colours into the SVG
// itself, always on a white background (print colours, whatever the screen
// theme — the spec's print override).
// ─────────────────────────────────────────────────────────────────────────────

import {
  prostateBiopsyCaptions, prostateBiopsyShapes, prostateSectorCaptions, prostateSectorShapes,
  PROSTATE_BIOPSY_OUTLINE, PROSTATE_BIOPSY_VIEWBOX, PROSTATE_SECTORS_VIEWBOX, type MapCaption, type MapShape,
} from './prostateGeometry';
import { BREAST_GUIDES, BREAST_VIEWBOX, breastCaptions, breastShapes, type BreastSide } from './breastGeometry';
import { mohsCaptions, mohsShapes, mohsViewBox } from './mohsGeometry';
import { POLYP_VIEWBOX, polypLayout, RECTAL_VIEWBOX, rectalLayout } from './colorectalGeometry';
import { renalViewBox, renalCaptions, renalGuides, renalShapes } from './renalGeometry';
import { NECK_GUIDES, NECK_VIEWBOX, neckCaptions, neckShapes, ORAL_VIEWBOX, oralCavityCaptions, oralCavityShapes } from './headNeckGeometry';
import type { MapPattern, MapStyleKey, OrganMapPayload, OrganMapScheme, OrganMapSector, OrganMapType } from './organMapTypes';
import { MAP_OVERLAYS } from './organMapTypes';

export interface OrganMapLayout {
  width: number; height: number; shapes: MapShape[]; captions: MapCaption[];
  /** Drawn behind the shapes (the biopsy gland outline). */
  outline?: string;
  /** Thin dashed lines over the shapes (the breast quadrant lines). */
  guides?: string;
  /** The size of the text inside shapes. */
  textSize: number;
}

/** The fixed drawing for a map type (the breast's depends on its side: which margin lies where; Batch 464: a
 *  polyp's on its Paris type, a rectal tumour's place on its relation to the peritoneal reflection — the variant). */
export function organMapLayout(mapType: OrganMapType, side?: BreastSide, stageCount = 0, variant?: string): OrganMapLayout {
  if (mapType === 'colorectalPolyp') return { ...POLYP_VIEWBOX, ...polypLayout(variant), textSize: 9 };
  if (mapType === 'rectalResection') return { ...RECTAL_VIEWBOX, ...rectalLayout(variant), textSize: 9 };
  if (mapType === 'renalResection') return { ...renalViewBox(variant), shapes: renalShapes(variant), captions: renalCaptions(variant), guides: renalGuides(variant), textSize: 8 };
  if (mapType === 'oralCavity') return { ...ORAL_VIEWBOX, shapes: oralCavityShapes(), captions: oralCavityCaptions(), textSize: 9 };
  if (mapType === 'neckDissection') return { ...NECK_VIEWBOX, shapes: neckShapes(), captions: neckCaptions(), guides: NECK_GUIDES, textSize: 9 };
  if (mapType === 'mohsStages') return { ...mohsViewBox(stageCount), shapes: mohsShapes(stageCount), captions: mohsCaptions(stageCount), textSize: 10 };
  if (mapType === 'breastClock') return { ...BREAST_VIEWBOX, shapes: breastShapes(side), captions: breastCaptions(side), guides: BREAST_GUIDES, textSize: 9 };
  return mapType === 'prostateBiopsy'
    ? { ...PROSTATE_BIOPSY_VIEWBOX, shapes: prostateBiopsyShapes(), captions: prostateBiopsyCaptions(), outline: PROSTATE_BIOPSY_OUTLINE, textSize: 10 }
    : { ...PROSTATE_SECTORS_VIEWBOX, shapes: prostateSectorShapes(), captions: prostateSectorCaptions(), textSize: 7 };
}

/** Pattern tile content for an 8×8 tile (lines and dots only; the background is the caller's). */
export function patternMarks(pattern: MapPattern): { lines: string[]; dots: [number, number][] } {
  if (pattern === 'hatch') return { lines: ['M 0 8 L 8 0', 'M -2 2 L 2 -2', 'M 6 10 L 10 6'], dots: [] };
  if (pattern === 'crosshatch') return { lines: ['M 0 8 L 8 0', 'M 0 0 L 8 8'], dots: [] };
  if (pattern === 'dots') return { lines: [], dots: [[2, 2], [6, 6]] };
  return { lines: [], dots: [] };
}

export const usesPatternFill = (pattern: MapPattern) => pattern === 'hatch' || pattern === 'crosshatch' || pattern === 'dots';
export const patternId = (prefix: string, key: MapStyleKey) => `${prefix}-pat-${key}`;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const PATTERN_INK = '#1f2937';

export interface OrganMapDrawingLabels {
  title: string;
  captions: Record<string, string>;
  sectorName: (sectorId: string) => string;
  legend: (key: MapStyleKey) => string;
  /** The short text inside a sector, one entry per line (organMapLabels.organMapInlineText). */
  inline: (sector: OrganMapSector | undefined, shapeId: string) => string[];
}

/** The report image: a standalone SVG in print colours. */
export function renderOrganMapSvg(payload: OrganMapPayload, scheme: OrganMapScheme, labels: OrganMapDrawingLabels): string {
  const layout = organMapLayout(payload.mapType, payload.side, payload.mohsStages?.length ?? 0, payload.variant);
  const prefix = 'om';
  const legendRowH = 18;
  const legendH = payload.legend.length ? 12 + Math.ceil(payload.legend.length / 3) * legendRowH : 0;
  const titleH = 26;
  const width = layout.width; const height = titleH + layout.height + legendH;
  const byId = new Map(payload.sectors.map(s => [s.id, s]));
  const markers = payload.markers ?? [];
  const defs = [...new Set(payload.sectors.flatMap(s => [
    ...(usesPatternFill(s.pattern) ? [`c:${s.category}`] : []),
    ...s.overlays.map(o => `o:${o.key}`),
  ]).concat(markers.filter(m => usesPatternFill(m.pattern)).map(m => `c:${m.category}`)).concat(payload.legend.filter(l => usesPatternFill(l.pattern)).map(l => `${MAP_OVERLAYS.includes(l.key as never) ? 'o' : 'c'}:${l.key}`)))]
    .map(tag => {
      const [kind, key] = tag.split(':') as ['c' | 'o', MapStyleKey];
      const style = scheme[key];
      const marks = patternMarks(style.pattern);
      const ink = kind === 'o' ? style.colour : PATTERN_INK;
      const bg = kind === 'o' ? '' : `<rect width="8" height="8" fill="${style.colour}"/>`;
      return `<pattern id="${patternId(prefix, key)}" width="8" height="8" patternUnits="userSpaceOnUse">${bg}`
        + marks.lines.map(d => `<path d="${d}" stroke="${ink}" stroke-width="${kind === 'o' ? 1.6 : 1}" opacity="${kind === 'o' ? 1 : 0.6}"/>`).join('')
        + marks.dots.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.3" fill="${ink}" opacity="${kind === 'o' ? 1 : 0.7}"/>`).join('')
        + `</pattern>`;
    }).join('');
  const fillOf = (key: MapStyleKey, kind: 'c' | 'o') => (usesPatternFill(scheme[key].pattern) ? `url(#${patternId(prefix, key)})` : kind === 'o' ? 'none' : scheme[key].colour);
  const shapes = layout.shapes.map(shape => {
    const s = byId.get(shape.id);
    if (!s) return '';
    const base = `<path d="${shape.d}" fill="${fillOf(s.category, 'c')}" stroke="#334155" stroke-width="1"><title>${esc(labels.sectorName(shape.id))}</title></path>`;
    // Two overlays on one sector (extension and a positive margin): the first is drawn wider so both edges show.
    // Batch 465: ENEma is outlined heavier than ENEmi (as on screen), over a white halo that keeps every outline
    // visible on any fill.
    const width = (i: number, key: string) => (i < s.overlays.length - 1 ? 6 : 3) + (key === 'eneMajor' ? 2 : 0);
    // Batch 465b (Pete): two layers — a thin dark edge (0.5 each side) outside the white halo — so the outline
    // reads on a light page and a dark one alike.
    const haloW = s.overlays.length ? Math.max(...s.overlays.map((o, i) => width(i, o.key))) + 3 : 0;
    const halo = s.overlays.length
      ? `<path d="${shape.d}" fill="none" stroke="#111827" stroke-opacity="0.6" stroke-width="${haloW + 1}" stroke-linejoin="round"/>`
        + `<path d="${shape.d}" fill="none" stroke="#ffffff" stroke-width="${haloW}" stroke-linejoin="round"/>`
      : '';
    const overlays = halo + s.overlays.map((o, i) => `<path d="${shape.d}" fill="${fillOf(o.key, 'o')}" stroke="${scheme[o.key].colour}" stroke-width="${width(i, o.key)}"/>`).join('');
    const lines = labels.inline(s, shape.id);
    const size = layout.textSize;
    const top = shape.labelY + 3 - ((lines.length - 1) * (size + 2)) / 2;
    // A white halo keeps the text readable on any fill or pattern.
    return base + overlays + lines.map((line, i) => `<text x="${shape.labelX}" y="${top + i * (size + 2)}" font-size="${size}" text-anchor="middle" fill="#111827" stroke="#ffffff" stroke-width="2.5" paint-order="stroke">${esc(line)}</text>`).join('');
  }).join('');
  const captions = layout.captions.map(c => `<text x="${c.x}" y="${c.y}" font-size="11" text-anchor="${c.anchor ?? 'middle'}" fill="#334155">${esc(labels.captions[c.key] ?? '')}</text>`).join('');
  const guides = layout.guides ? `<path d="${layout.guides}" fill="none" stroke="#64748b" stroke-width="1" stroke-dasharray="4 3"/>` : '';
  // Breast foci: a numbered marker each, over the sectors.
  const markerSvg = markers.map(m => `<circle cx="${m.x}" cy="${m.y}" r="${m.r}" fill="${fillOf(m.category, 'c')}" stroke="#111827" stroke-width="1.5"><title>${esc(labels.sectorName(m.id))}</title></circle>`
    + `<text x="${m.x}" y="${m.y + 3.5}" font-size="10" font-weight="bold" text-anchor="middle" fill="#111827" stroke="#ffffff" stroke-width="2.5" paint-order="stroke">${esc(m.label)}</text>`).join('');
  const legend = payload.legend.map((l, i) => {
    const x = 10 + (i % 3) * (width / 3); const y = titleH + layout.height + 8 + Math.floor(i / 3) * legendRowH;
    const kind = MAP_OVERLAYS.includes(l.key as never) ? 'o' : 'c';
    return `<rect x="${x}" y="${y}" width="14" height="12" fill="${fillOf(l.key, kind)}" stroke="${kind === 'o' ? scheme[l.key].colour : '#334155'}" stroke-width="${kind === 'o' ? 2 : 1}"/>`
      + `<text x="${x + 20}" y="${y + 10}" font-size="10" fill="#111827">${esc(l.label ?? labels.legend(l.key))}</text>`;
  }).join('');
  const outline = layout.outline ? `<path d="${layout.outline}" fill="#f1f5f9" stroke="#64748b" stroke-width="1"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="Helvetica, Arial, sans-serif">`
    + `<rect width="${width}" height="${height}" fill="#ffffff"/><defs>${defs}</defs>`
    + `<text x="10" y="18" font-size="13" font-weight="bold" fill="#111827">${esc(labels.title)}</text>`
    + `<g transform="translate(0 ${titleH})">${outline}${shapes}${guides}${markerSvg}${captions}</g>${legend}</svg>`;
}
