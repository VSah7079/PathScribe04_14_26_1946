// src/services/organMapping/headNeckGeometry.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 465: PathScribe's own head and neck schematics. Pure layout data.
//
// Oral cavity, facing the patient with the mouth open (the patient's right
// on the viewer's left): the AJCC oral cavity subsites — upper and lower lip
// mucosa, upper and lower alveolar ridge, hard palate, buccal mucosa,
// retromolar trigone, oral tongue and floor of mouth, each side apart where
// the side matters — and, beside it, the peripheral (mucosal) and deep
// margins.
//
// Neck dissection: the right and the left neck side by side, each a lateral
// view with the front of the neck toward the middle of the drawing (so the
// patient's right is on the viewer's left, as facing the patient): levels Ia,
// Ib, IIa, IIb, III, IV, Va, Vb, VI and VII.
// ─────────────────────────────────────────────────────────────────────────────

import type { MapCaption, MapShape } from './prostateGeometry';

const round = (n: number) => Math.round(n * 10) / 10;
const poly = (pts: [number, number][]) => `M ${pts.map(p => p.map(round).join(' ')).join(' L ')} Z`;
const rect = (x: number, y: number, w: number, h: number) => poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);

// ── Oral cavity ─────────────────────────────────────────────────────────────

export const ORAL_SUBSITES = [
  'lipUpper', 'lipLower', 'upperAlveolusR', 'upperAlveolusL', 'hardPalate', 'buccalR', 'buccalL',
  'retromolarR', 'retromolarL', 'tongueR', 'tongueL', 'floorR', 'floorL', 'lowerAlveolusR', 'lowerAlveolusL',
] as const;
export type OralSubsite = typeof ORAL_SUBSITES[number];
export const ORAL_VIEWBOX = { width: 690, height: 350 };

const CX = 220;
/** Points of a half ellipse (the tongue's halves), from the top of the midline round to its bottom. */
function halfEllipse(cx: number, cy: number, rx: number, ry: number, side: -1 | 1): [number, number][] {
  return Array.from({ length: 19 }, (_, i) => {
    const a = -Math.PI / 2 + (Math.PI * i) / 18;
    return [cx + side * rx * Math.cos(a), cy + ry * Math.sin(a)] as [number, number];
  });
}

export function oralCavityShapes(): MapShape[] {
  const tongue = { cy: 182, rx: 84, ry: 52 };
  return [
    { id: 'lipUpper', d: poly([[80, 38], [360, 38], [340, 58], [100, 58]]), labelX: CX, labelY: 51 },
    { id: 'upperAlveolusR', d: poly([[100, 58], [CX, 58], [CX, 78], [124, 78], [96, 116], [70, 110]]), labelX: 140, labelY: 71 },
    { id: 'upperAlveolusL', d: poly([[CX, 58], [340, 58], [370, 110], [344, 116], [316, 78], [CX, 78]]), labelX: 300, labelY: 71 },
    { id: 'hardPalate', d: poly([[124, 78], [316, 78], [300, 124], [140, 124]]), labelX: CX, labelY: 104 },
    { id: 'buccalR', d: poly([[40, 70], [70, 110], [80, 250], [46, 280], [30, 180]]), labelX: 54, labelY: 182 },
    { id: 'buccalL', d: poly([[400, 70], [370, 110], [360, 250], [394, 280], [410, 180]]), labelX: 386, labelY: 182 },
    { id: 'retromolarR', d: poly([[70, 110], [96, 116], [118, 142], [104, 170], [76, 168]]), labelX: 93, labelY: 145 },
    { id: 'retromolarL', d: poly([[370, 110], [344, 116], [322, 142], [336, 170], [364, 168]]), labelX: 347, labelY: 145 },
    // The floor of mouth lies below the tongue (its top edge clears the tongue's outline).
    { id: 'floorR', d: poly([[CX, 238], [CX, 262], [118, 262], [104, 222], [140, 230]]), labelX: 160, labelY: 250 },
    { id: 'floorL', d: poly([[CX, 238], [300, 230], [336, 222], [322, 262], [CX, 262]]), labelX: 280, labelY: 250 },
    { id: 'tongueR', d: poly(halfEllipse(CX, tongue.cy, tongue.rx, tongue.ry, -1)), labelX: CX - 42, labelY: tongue.cy + 3 },
    { id: 'tongueL', d: poly(halfEllipse(CX, tongue.cy, tongue.rx, tongue.ry, 1)), labelX: CX + 42, labelY: tongue.cy + 3 },
    { id: 'lowerAlveolusR', d: poly([[76, 168], [104, 170], [104, 222], [118, 262], [CX, 262], [CX, 282], [100, 282], [80, 250]]), labelX: 140, labelY: 274 },
    { id: 'lowerAlveolusL', d: poly([[364, 168], [336, 170], [336, 222], [322, 262], [CX, 262], [CX, 282], [340, 282], [360, 250]]), labelX: 300, labelY: 274 },
    { id: 'lipLower', d: poly([[100, 282], [340, 282], [360, 302], [80, 302]]), labelX: CX, labelY: 295 },
    // The margins, beside the drawing.
    { id: 'mPeripheral', d: rect(480, 92, 160, 46), labelX: 560, labelY: 118 },
    { id: 'mDeep', d: rect(480, 186, 160, 46), labelX: 560, labelY: 212 },
  ];
}

export function oralCavityCaptions(): MapCaption[] {
  return [
    { key: 'view', x: CX, y: 18 },
    { key: 'orient.right', x: 24, y: 34, anchor: 'start' },
    { key: 'orient.left', x: 416, y: 34, anchor: 'end' },
    { key: 'margins.title', x: 560, y: 60 },
    { key: 'margin.peripheral', x: 560, y: 84 },
    { key: 'margin.deep', x: 560, y: 178 },
    { key: 'doi', x: 560, y: 262 },
    // The site's rules, one line each (Batch 465: two lines fit every language).
    { key: 'rule.involved', x: 560, y: 284 },
    { key: 'rule.close', x: 560, y: 300 },
    { key: 'dysplasia', x: 560, y: 156 },
  ];
}

// ── Neck dissection ─────────────────────────────────────────────────────────

export const NECK_LEVELS = ['Ia', 'Ib', 'IIa', 'IIb', 'III', 'IV', 'Va', 'Vb', 'VI', 'VII'] as const;
export type NeckLevel = typeof NECK_LEVELS[number];
export const NECK_SIDES = ['R', 'L'] as const;
export type NeckSide = typeof NECK_SIDES[number];
export const NECK_VIEWBOX = { width: 660, height: 350 };

/** One side's levels, drawn for the right neck (front of the neck at x = 320); the left is its mirror about x = 330. */
const RIGHT_LEVELS: Record<NeckLevel, [number, number][]> = {
  Ia:  [[262, 46], [318, 46], [318, 92], [262, 92]],
  Ib:  [[176, 46], [262, 46], [262, 92], [190, 100]],
  IIa: [[190, 100], [262, 92], [262, 150], [196, 150]],
  IIb: [[130, 100], [190, 100], [196, 150], [138, 150]],
  III: [[138, 150], [262, 150], [262, 210], [146, 210]],
  IV:  [[146, 210], [262, 210], [262, 270], [154, 270]],
  Va:  [[60, 100], [130, 100], [142, 190], [66, 190]],
  Vb:  [[66, 190], [142, 190], [154, 270], [74, 270]],
  VI:  [[262, 150], [318, 150], [318, 270], [262, 270]],
  VII: [[262, 270], [318, 270], [318, 318], [262, 318]],
};
const mirror = (x: number) => 660 - x;
const centroid = (pts: [number, number][]) => [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length];

export function neckShapes(): MapShape[] {
  return NECK_SIDES.flatMap(side => NECK_LEVELS.map(level => {
    const pts = RIGHT_LEVELS[level].map(([x, y]) => [side === 'R' ? x : mirror(x), y] as [number, number]);
    const [lx, ly] = centroid(pts);
    return { id: `${side}_${level}`, d: poly(pts), labelX: round(lx), labelY: round(ly) };
  }));
}

export function neckCaptions(): MapCaption[] {
  return [
    { key: 'side.R', x: 190, y: 22 },
    { key: 'side.L', x: 470, y: 22 },
    { key: 'orient.anterior', x: 330, y: 36 },
    { key: 'mandible', x: 240, y: 40, anchor: 'end' },
    { key: 'totals', x: 330, y: 340 },
  ];
}

/** The lower border of the mandible over each side (a guide line). */
export const NECK_GUIDES = `M 170 46 L 318 46 M ${mirror(170)} 46 L ${mirror(318)} 46`;
