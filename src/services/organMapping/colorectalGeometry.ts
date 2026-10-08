// src/services/organMapping/colorectalGeometry.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 464: PathScribe's own colorectal schematics. Pure layout data.
//
// Polyp (the excised specimen, drawn in profile by its Paris type):
// • pedunculated (0-Ip, 0-Isp): the head, neck, stalk and stalk base — the
//   Haggitt levels 1–4 — and the stalk (deep) margin, the cut end;
// • sessile, flat, depressed or excavated (0-Is, 0-IIa, 0-IIb, 0-IIc, 0-III):
//   the lesion in the mucosa, the submucosa beneath it in thirds — Kikuchi
//   sm1, sm2, sm3 — normal mucosa and submucosa either side, the lateral
//   (mucosal) margins at both ends and the deep (submucosal) margin below.
//
// Rectal resection, two views side by side:
// • a cross-section, viewed from below (anterior at the top, the patient's
//   right on the viewer's left): the rectal wall and the mesorectum in four
//   quadrants, and the circumferential (radial) margin as the outer arc;
// • a long view of the rectum with the peritoneal reflection, the tumour
//   above, at or below it, and the distal margin at the anal end.
// ─────────────────────────────────────────────────────────────────────────────

import type { MapCaption, MapShape } from './prostateGeometry';

const round = (n: number) => Math.round(n * 10) / 10;
const rect = (x: number, y: number, w: number, h: number) => `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
const poly = (pts: [number, number][]) => `M ${pts.map(p => p.map(round).join(' ')).join(' L ')} Z`;

// ── Polyp ───────────────────────────────────────────────────────────────────

export const PARIS_TYPES = ['0-Ip', '0-Isp', '0-Is', '0-IIa', '0-IIb', '0-IIc', '0-III'] as const;
export type ParisType = typeof PARIS_TYPES[number];
export const isPedunculated = (p: string | undefined) => p === '0-Ip' || p === '0-Isp';
export const POLYP_VIEWBOX = { width: 660, height: 312 };

/** The sector ids of a polyp drawing (depends on whether it is pedunculated). */
export const POLYP_PEDUNCULATED_IDS = ['h1', 'h2', 'h3', 'h4', 'deep'] as const;
export const POLYP_SESSILE_IDS = ['mucosaL', 'mucosaR', 'submucosaL', 'submucosaR', 'sm1', 'sm2', 'sm3', 'lesion', 'lateralL', 'lateralR', 'deep'] as const;

/** Points along the upper half of an ellipse, from left to right, cut by a chord at y. */
function capPoints(cx: number, cy: number, rx: number, ry: number, chordY: number): [number, number][] {
  const t0 = Math.asin(Math.min(1, (chordY - cy) / ry));
  const pts: [number, number][] = [];
  const from = Math.PI - t0; const to = 2 * Math.PI + t0; // left chord end, over the top, to the right chord end
  for (let i = 0; i <= 24; i++) {
    const a = from + ((to - from) * i) / 24;
    pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return pts;
}

function pedunculatedShapes(paris: string): MapShape[] {
  const sub = paris === '0-Isp';
  const cx = 210;
  const g = sub
    ? { cy: 112, rx: 92, ry: 52, chordY: 150, neckY: 166, stalkHalf: 32, stalkY: 205, baseY: 226, baseHalf: 48 }
    : { cy: 88, rx: 78, ry: 50, chordY: 122, neckY: 145, stalkHalf: 15, stalkY: 210, baseY: 236, baseHalf: 28 };
  const cap = capPoints(cx, g.cy, g.rx, g.ry, g.chordY);
  const [lx] = cap[0]; const [rx] = cap[cap.length - 1];
  return [
    { id: 'h1', d: poly(cap), labelX: cx, labelY: g.cy - 4 },
    { id: 'h2', d: poly([[lx, g.chordY], [rx, g.chordY], [cx + g.stalkHalf, g.neckY], [cx - g.stalkHalf, g.neckY]]), labelX: cx, labelY: (g.chordY + g.neckY) / 2 + 1 },
    { id: 'h3', d: rect(cx - g.stalkHalf, g.neckY, g.stalkHalf * 2, g.stalkY - g.neckY), labelX: cx, labelY: (g.neckY + g.stalkY) / 2 },
    { id: 'h4', d: poly([[cx - g.stalkHalf, g.stalkY], [cx + g.stalkHalf, g.stalkY], [cx + g.baseHalf, g.baseY], [cx - g.baseHalf, g.baseY]]), labelX: cx, labelY: (g.stalkY + g.baseY) / 2 + 2 },
    { id: 'deep', d: rect(cx - g.baseHalf, g.baseY, g.baseHalf * 2, 12), labelX: cx, labelY: g.baseY + 4 },
  ];
}

/** The pedunculated drawing's level captions (Haggitt 1–4), beside each level. */
function pedunculatedCaptions(paris: string): MapCaption[] {
  const sub = paris === '0-Isp';
  const ys = sub ? [112, 158, 186, 216, 250] : [88, 134, 178, 224, 260];
  return [
    { key: 'title', x: 210, y: 20 },
    ...['level.h1', 'level.h2', 'level.h3', 'level.h4'].map((key, i) => ({ key, x: 330, y: ys[i] + 4, anchor: 'start' as const })),
    { key: 'margin.deep', x: 330, y: ys[4] + 4, anchor: 'start' as const },
    { key: 'scale.haggitt', x: 330, y: 50, anchor: 'start' as const },
    { key: 'rule', x: 210, y: 306 },
  ];
}

const SX0 = 60; const SX1 = 360; const LX0 = 120; const LX1 = 300;
const MUC_TOP = 150; const MUC_BOT = 175; const SM_BOT = 250; const THIRD = (SM_BOT - MUC_BOT) / 3;

function lesionPath(paris: string): string {
  if (paris === '0-Is') return poly([[LX0, MUC_BOT], ...capPoints((LX0 + LX1) / 2, MUC_BOT, (LX1 - LX0) / 2, 85, MUC_BOT).slice(1, -1), [LX1, MUC_BOT]]);
  if (paris === '0-IIa') return poly([[LX0, MUC_BOT], [LX0 + 12, MUC_TOP - 22], [LX1 - 12, MUC_TOP - 22], [LX1, MUC_BOT]]);
  if (paris === '0-IIc') return poly([[LX0, MUC_TOP], [LX0 + 22, MUC_TOP + 12], [LX1 - 22, MUC_TOP + 12], [LX1, MUC_TOP], [LX1, MUC_BOT], [LX0, MUC_BOT]]);
  if (paris === '0-III') return poly([[LX0, MUC_TOP], [LX0 + 34, MUC_BOT + 18], [LX1 - 34, MUC_BOT + 18], [LX1, MUC_TOP], [LX1, MUC_BOT], [LX1 - 12, MUC_BOT], [LX1 - 40, MUC_BOT + 26], [LX0 + 40, MUC_BOT + 26], [LX0 + 12, MUC_BOT], [LX0, MUC_BOT]]);
  return rect(LX0, MUC_TOP, LX1 - LX0, MUC_BOT - MUC_TOP); // 0-IIb: flat, in the mucosa
}

function sessileShapes(paris: string): MapShape[] {
  const lesionTop = paris === '0-Is' ? MUC_BOT - 85 : paris === '0-IIa' ? MUC_TOP - 22 : MUC_TOP;
  return [
    { id: 'mucosaL', d: rect(SX0, MUC_TOP, LX0 - SX0, MUC_BOT - MUC_TOP), labelX: (SX0 + LX0) / 2, labelY: (MUC_TOP + MUC_BOT) / 2 },
    { id: 'mucosaR', d: rect(LX1, MUC_TOP, SX1 - LX1, MUC_BOT - MUC_TOP), labelX: (LX1 + SX1) / 2, labelY: (MUC_TOP + MUC_BOT) / 2 },
    { id: 'submucosaL', d: rect(SX0, MUC_BOT, LX0 - SX0, SM_BOT - MUC_BOT), labelX: (SX0 + LX0) / 2, labelY: (MUC_BOT + SM_BOT) / 2 },
    { id: 'submucosaR', d: rect(LX1, MUC_BOT, SX1 - LX1, SM_BOT - MUC_BOT), labelX: (LX1 + SX1) / 2, labelY: (MUC_BOT + SM_BOT) / 2 },
    ...(['sm1', 'sm2', 'sm3'] as const).map((id, i) => ({ id, d: rect(LX0, MUC_BOT + i * THIRD, LX1 - LX0, THIRD), labelX: (LX0 + LX1) / 2, labelY: MUC_BOT + (i + 0.5) * THIRD + (paris === '0-III' && i === 0 ? 4 : 0) })),
    { id: 'lesion', d: lesionPath(paris), labelX: (LX0 + LX1) / 2, labelY: (lesionTop + MUC_BOT) / 2 + (paris === '0-III' ? -6 : 0) },
    { id: 'lateralL', d: rect(SX0 - 12, MUC_TOP, 12, SM_BOT - MUC_TOP), labelX: SX0 - 28, labelY: (MUC_TOP + SM_BOT) / 2 },
    { id: 'lateralR', d: rect(SX1, MUC_TOP, 12, SM_BOT - MUC_TOP), labelX: SX1 + 28, labelY: (MUC_TOP + SM_BOT) / 2 },
    { id: 'deep', d: rect(SX0, SM_BOT, SX1 - SX0, 12), labelX: (SX0 + SX1) / 2, labelY: SM_BOT + 4 },
  ];
}

function sessileCaptions(): MapCaption[] {
  return [
    { key: 'title', x: 210, y: 20 },
    { key: 'scale.kikuchi', x: 415, y: 50, anchor: 'start' },
    { key: 'layer.mucosa', x: 415, y: (MUC_TOP + MUC_BOT) / 2 + 4, anchor: 'start' },
    ...(['sm1', 'sm2', 'sm3'] as const).map((id, i) => ({ key: `level.${id}`, x: 415, y: MUC_BOT + (i + 0.5) * THIRD + 4, anchor: 'start' as const })),
    { key: 'margin.deep', x: 415, y: SM_BOT + 10, anchor: 'start' },
    { key: 'margin.lateral', x: 210, y: SM_BOT + 36 },
    { key: 'rule', x: 210, y: 306 },
  ];
}

/** The polyp drawing for a Paris type (sessile 0-Is when none is given). */
export function polypLayout(paris: string | undefined): { shapes: MapShape[]; captions: MapCaption[] } {
  const p = paris && (PARIS_TYPES as readonly string[]).includes(paris) ? paris : '0-Is';
  return isPedunculated(p) ? { shapes: pedunculatedShapes(p), captions: pedunculatedCaptions(p) } : { shapes: sessileShapes(p), captions: sessileCaptions() };
}

// ── Rectal resection ───────────────────────────────────────────────────────

export const RECTAL_VIEWBOX = { width: 660, height: 360 };
export const RECTAL_QUADRANTS = ['anterior', 'left', 'posterior', 'right'] as const;
export type RectalQuadrant = typeof RECTAL_QUADRANTS[number];
export const RECTAL_LEVELS = ['above', 'at', 'below'] as const;
export type RectalLevel = typeof RECTAL_LEVELS[number];

const CX = 170; const CY = 172; const R_LUMEN = 24; const R_WALL = 54; const R_MESO = 96; const R_CRM = 106;
/** Viewed from below: anterior at the top, the patient's left on the viewer's right. */
const QUADRANT_ANGLE: Record<RectalQuadrant, number> = { anterior: 0, left: 90, posterior: 180, right: 270 };

function polar(angleDeg: number, r: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [round(CX + Math.sin(rad) * r), round(CY - Math.cos(rad) * r)];
}
function ringQuadrant(q: RectalQuadrant, r0: number, r1: number): string {
  const a = QUADRANT_ANGLE[q];
  const outer = Array.from({ length: 13 }, (_, i) => polar(a - 45 + (90 * i) / 12, r1));
  const inner = Array.from({ length: 13 }, (_, i) => polar(a + 45 - (90 * i) / 12, r0));
  return poly([...outer, ...inner]);
}

const TUBE_X = 440; const TUBE_W = 80; const TUBE_TOP = 50; const TUBE_BOT = 285; const REFLECTION_Y = 150;
const LEVEL_SPAN: Record<RectalLevel, [number, number]> = { above: [78, 136], at: [124, 178], below: [168, 245] };

/** The rectal drawing; the tumour on the long view sits by its relation to the peritoneal reflection (none drawn when not given). */
export function rectalLayout(level: string | undefined): { shapes: MapShape[]; captions: MapCaption[]; guides: string } {
  const lv = (RECTAL_LEVELS as readonly string[]).includes(level ?? '') ? (level as RectalLevel) : undefined;
  const shapes: MapShape[] = [
    ...RECTAL_QUADRANTS.map(q => { const [x, y] = polar(QUADRANT_ANGLE[q], (R_LUMEN + R_WALL) / 2); return { id: `wall_${q}`, d: ringQuadrant(q, R_LUMEN, R_WALL), labelX: x, labelY: y }; }),
    ...RECTAL_QUADRANTS.map(q => { const [x, y] = polar(QUADRANT_ANGLE[q], (R_WALL + R_MESO) / 2); return { id: `meso_${q}`, d: ringQuadrant(q, R_WALL, R_MESO), labelX: x, labelY: y }; }),
    ...RECTAL_QUADRANTS.map(q => { const [x, y] = polar(QUADRANT_ANGLE[q], R_CRM + 14); return { id: `crm_${q}`, d: ringQuadrant(q, R_MESO, R_CRM), labelX: x, labelY: y + 3 }; }),
    { id: 'long_rectum', d: rect(TUBE_X, TUBE_TOP, TUBE_W, TUBE_BOT - TUBE_TOP), labelX: TUBE_X + TUBE_W / 2, labelY: TUBE_TOP + 14 },
    ...(lv ? [{ id: 'long_tumour', d: rect(TUBE_X + 8, LEVEL_SPAN[lv][0], TUBE_W - 16, LEVEL_SPAN[lv][1] - LEVEL_SPAN[lv][0]), labelX: TUBE_X + TUBE_W / 2, labelY: (LEVEL_SPAN[lv][0] + LEVEL_SPAN[lv][1]) / 2 }] : []),
    { id: 'long_distal', d: rect(TUBE_X, TUBE_BOT, TUBE_W, 10), labelX: TUBE_X + TUBE_W + 34, labelY: TUBE_BOT + 8 },
  ];
  const captions: MapCaption[] = [
    { key: 'view.cross', x: CX, y: 18 },
    { key: 'orient.anterior', x: CX, y: CY - R_CRM - 30 },
    { key: 'orient.posterior', x: CX, y: CY + R_CRM + 36 },
    { key: 'orient.right', x: CX - R_CRM - 4, y: CY - 16, anchor: 'end' },
    { key: 'orient.left', x: CX + R_CRM + 4, y: CY - 16, anchor: 'start' },
    { key: 'view.crossNote', x: CX, y: CY + R_CRM + 52 },
    { key: 'view.long', x: TUBE_X + TUBE_W / 2, y: 18 },
    { key: 'orient.proximal', x: TUBE_X + TUBE_W / 2, y: TUBE_TOP - 8 },
    { key: 'reflection', x: TUBE_X + TUBE_W + 6, y: REFLECTION_Y - 6, anchor: 'start' },
    { key: 'margin.distal', x: TUBE_X - 10, y: TUBE_BOT + 9, anchor: 'end' },
    { key: 'tme', x: 330, y: RECTAL_VIEWBOX.height - 4 },
  ];
  const guides = `M ${TUBE_X - 30} ${REFLECTION_Y} L ${TUBE_X + TUBE_W + 30} ${REFLECTION_Y}`;
  return { shapes, captions, guides };
}
