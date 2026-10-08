// src/services/organMapping/prostateGeometry.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 461: PathScribe's own schematic geometry for the prostate maps (not
// ACR artwork). Pure layout data; the components only draw it.
//
// Sector map: three axial slices left to right (base, mid-gland, apex),
// anterior at the top, the patient's right on the viewer's left (radiology
// convention, as MRI reports show it). Each half-slice: anterior stroma
// across the front, transition zone inside, peripheral zone around the back;
// the central zone at the base. Seminal vesicles above the base, urethral
// sphincter below the apex.
//
// Biopsy map: the gland seen from the front, base at the top, a cell per
// systematic site (right lateral, right medial, left medial, left lateral),
// targeted cores as circles beside it.
// ─────────────────────────────────────────────────────────────────────────────

import { PROSTATE_PIRADS_SECTORS, PROSTATE_BIOPSY_SITES, type ProstateLevel, type ProstateZone } from './prostateSectors';

export interface MapShape { id: string; d: string; labelX: number; labelY: number }
export interface MapCaption { key: string; x: number; y: number; anchor?: 'start' | 'middle' | 'end' }

const round = (n: number) => Math.round(n * 10) / 10;

export const PROSTATE_SECTORS_VIEWBOX = { width: 660, height: 320 };
const SLICE_CENTRES: Record<ProstateLevel, number> = { base: 115, mid: 330, apex: 545 };
const CY = 175; const RX = 95; const RY = 72; const INNER = 0.55;

/** Angle 0 = anterior (top), 180 = posterior (bottom); the right side is drawn on the viewer's left. */
function pt(cx: number, a: number, r: number, dir: -1 | 1): [number, number] {
  const rad = (a * Math.PI) / 180;
  return [round(cx + dir * Math.sin(rad) * RX * r), round(CY - Math.cos(rad) * RY * r)];
}

function wedge(cx: number, dir: -1 | 1, a0: number, a1: number, r0: number, r1: number): { d: string; lx: number; ly: number } {
  const steps = Math.max(2, Math.ceil((a1 - a0) / 5));
  const outer: [number, number][] = []; const inner: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps;
    outer.push(pt(cx, a, r1, dir));
    inner.push(pt(cx, a, r0, dir));
  }
  const pts = r0 === 0 ? [[cx, CY] as [number, number], ...outer] : [...outer, ...inner.reverse()];
  const [lx, ly] = pt(cx, (a0 + a1) / 2, r0 === 0 ? r1 * 0.6 : (r0 + r1) / 2, dir);
  return { d: `M ${pts.map(p => p.join(' ')).join(' L ')} Z`, lx, ly };
}

const ZONE_SHAPES: Record<ProstateLevel, Partial<Record<ProstateZone, [number, number, number, number]>>> = {
  // [fromAngle, toAngle, innerRadius, outerRadius]
  base: { AS: [0, 32, 0, 1], TZa: [32, 95, 0, INNER], TZp: [95, 140, 0, INNER], CZ: [140, 180, 0, INNER], PZa: [32, 80, INNER, 1], PZpl: [80, 140, INNER, 1], PZpm: [140, 180, INNER, 1] },
  mid:  { AS: [0, 32, 0, 1], TZa: [32, 95, 0, INNER], TZp: [95, 180, 0, INNER], PZa: [32, 80, INNER, 1], PZpl: [80, 140, INNER, 1], PZpm: [140, 180, INNER, 1] },
  apex: { AS: [0, 32, 0, 1], TZa: [32, 95, 0, INNER], TZp: [95, 180, 0, INNER], PZa: [32, 80, INNER, 1], PZpl: [80, 140, INNER, 1], PZpm: [140, 180, INNER, 1] },
};

function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
}

export function prostateSectorShapes(): MapShape[] {
  return PROSTATE_PIRADS_SECTORS.map(s => {
    if (s.kind === 'seminalVesicle') {
      const cx = SLICE_CENTRES.base + (s.side === 'right' ? -42 : 42);
      return { id: s.id, d: ellipsePath(cx, 58, 36, 14), labelX: cx, labelY: 62 };
    }
    if (s.kind === 'urethralSphincter') {
      const cx = SLICE_CENTRES.apex; const cy = 282;
      return { id: s.id, d: ellipsePath(cx, cy, 13, 13), labelX: cx, labelY: cy + 4 };
    }
    const [a0, a1, r0, r1] = ZONE_SHAPES[s.level!][s.zone!]!;
    const w = wedge(SLICE_CENTRES[s.level!], s.side === 'right' ? -1 : 1, a0, a1, r0, r1);
    return { id: s.id, d: w.d, labelX: w.lx, labelY: w.ly };
  });
}

/** Level titles, the side markers and the anterior/posterior hint. */
export function prostateSectorCaptions(): MapCaption[] {
  return [
    ...(['base', 'mid', 'apex'] as ProstateLevel[]).map(level => ({ key: `level.${level}`, x: SLICE_CENTRES[level], y: 92 })),
    // R / L just above each slice's outer edge (the patient's right on the viewer's left).
    ...(['base', 'mid', 'apex'] as ProstateLevel[]).flatMap(level => [
      { key: 'side.rightShort', x: SLICE_CENTRES[level] - RX + 10, y: 112 },
      { key: 'side.leftShort', x: SLICE_CENTRES[level] + RX - 10, y: 112 },
    ]),
    { key: 'orientation', x: SLICE_CENTRES.mid, y: 312 },
  ];
}

export const PROSTATE_BIOPSY_VIEWBOX = { width: 460, height: 300 };
const COL_X = [110, 180, 250, 320]; // right lateral, right medial, left medial, left lateral
const ROW_Y: Record<ProstateLevel, number> = { base: 40, mid: 120, apex: 200 };
const CELL_W = 64; const CELL_H = 70;

/** The gland outline (front view) behind the cells. */
export const PROSTATE_BIOPSY_OUTLINE = 'M 76 40 Q 76 20 106 18 L 322 18 Q 354 20 354 40 L 342 230 Q 322 288 216 290 Q 110 288 90 230 Z';

export function prostateBiopsyShapes(): MapShape[] {
  return PROSTATE_BIOPSY_SITES.map(s => {
    if (s.kind === 'targeted') {
      const cx = 412; const cy = 70 + (s.roi! - 1) * 80;
      return { id: s.id, d: ellipsePath(cx, cy, 26, 26), labelX: cx, labelY: cy + 4 };
    }
    const col = s.side === 'right' ? (s.aspect === 'lateral' ? 0 : 1) : (s.aspect === 'medial' ? 2 : 3);
    const x = COL_X[col] - CELL_W / 2 + 4; const y = ROW_Y[s.level!] + 2;
    const r = 8;
    const d = `M ${x + r} ${y} L ${x + CELL_W - r} ${y} Q ${x + CELL_W} ${y} ${x + CELL_W} ${y + r} L ${x + CELL_W} ${y + CELL_H - r} Q ${x + CELL_W} ${y + CELL_H} ${x + CELL_W - r} ${y + CELL_H} L ${x + r} ${y + CELL_H} Q ${x} ${y + CELL_H} ${x} ${y + CELL_H - r} L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} Z`;
    return { id: s.id, d, labelX: x + CELL_W / 2, labelY: y + CELL_H / 2 };
  });
}

export function prostateBiopsyCaptions(): MapCaption[] {
  return [
    ...(['base', 'mid', 'apex'] as ProstateLevel[]).map(level => ({ key: `level.${level}`, x: 36, y: ROW_Y[level] + CELL_H / 2 + 4 })),
    { key: 'side.right', x: (COL_X[0] + COL_X[1]) / 2 + 4, y: 12 },
    { key: 'side.left', x: (COL_X[2] + COL_X[3]) / 2 + 4, y: 12 },
    { key: 'targeted', x: 412, y: 28 },
  ];
}
