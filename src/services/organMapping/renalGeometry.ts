// src/services/organMapping/renalGeometry.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 466: PathScribe's renal resection schematic (the CAP/ICCR kidney
// resection, not R.E.N.A.L./PADUA nephrometry). Pure layout data.
//
// A coronal kidney facing the patient: the upper, middle and lower poles, each
// split into its lateral and medial half (Pete: aspect = anterior / posterior,
// shown as a mark on the tumour's zones and a caption). Around it, the
// compartments that set the pT extent: renal sinus fat at the hilum, the
// pelvicalyceal system, the renal vein, the inferior vena cava below and above
// the diaphragm, perinephric fat, Gerota's fascia and the adrenal gland. Beside
// it, the margins (Pete): a radical nephrectomy's renal vein, ureter and soft
// tissue margins; a partial nephrectomy's parenchymal and perinephric /
// capsular soft tissue margins (Batch 466b: no vein or ureter — they aren't in
// the specimen — unless a non-standard margin was added).
//
// Batch 618 (PS-492, Pete): and Gerota's fascia and the adrenal gland, which a partial nephrectomy holds only
// when the extent says beyond Gerota's fascia / contiguous adrenal spread; the perinephric fat always stays.
//
// Batch 466c: a partial nephrectomy's drawing leaves out the anatomy its
// specimen doesn't hold — the renal vein, the vena cava (with the diaphragm
// line) and the ureter — unless the pathologist reports it: the vein when its
// margin was added or carcinoma is in it (or the vena cava), the vena cava when
// carcinoma is in it, the ureter when its margin was added.
//
// The right kidney has its hilum toward the middle of the patient, on the
// viewer's right; the left kidney is its mirror (the margin boxes stay put).
// ─────────────────────────────────────────────────────────────────────────────

import type { MapCaption, MapShape } from './prostateGeometry';

const round = (n: number) => Math.round(n * 10) / 10;
const poly = (pts: [number, number][]) => `M ${pts.map(p => p.map(round).join(' ')).join(' L ')} Z`;
const rect = (x: number, y: number, w: number, h: number) => poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);

export const RENAL_POLES = ['upper', 'middle', 'lower'] as const;
export type RenalPole = typeof RENAL_POLES[number];
export const RENAL_HALVES = ['lateral', 'medial'] as const;
export type RenalHalf = typeof RENAL_HALVES[number];
export const RENAL_ZONES = RENAL_POLES.flatMap(p => RENAL_HALVES.map(h => `${p}_${h}`));
/** The compartments drawn (each its own shape). */
export const RENAL_COMPARTMENTS = ['perinephricFat', 'gerota', 'sinusFat', 'pelvicalyceal', 'renalVein', 'ivcBelow', 'ivcAbove', 'adrenal', 'ureter'] as const;
export type RenalCompartment = typeof RENAL_COMPARTMENTS[number];
/** Batch 466b: the margin boxes, by letter in the variant (p parenchymal, s soft tissue, v renal vein, u ureter). */
export const RENAL_MARGIN_BOXES: Record<string, string> = { p: 'm_parenchymal', s: 'm_softTissue', v: 'm_vein', u: 'm_ureter' };
export const RENAL_MARGIN_IDS = Object.values(RENAL_MARGIN_BOXES);
/** Batch 466c: the anatomy a partial nephrectomy draws only when reported, by letter in the variant
 *  (v renal vein, i vena cava below and above the diaphragm, u ureter). Batch 618 (PS-492, Pete): g Gerota's
 *  fascia and a adrenal gland too — drawn only when the extent says beyond Gerota's fascia / contiguous adrenal
 *  (renalAnatomy.ts). The perinephric fat is always drawn. A radical nephrectomy draws it all. */
export const RENAL_OPTIONAL_ANATOMY: Record<string, readonly RenalCompartment[]> = { v: ['renalVein'], i: ['ivcBelow', 'ivcAbove'], u: ['ureter'], g: ['gerota'], a: ['adrenal'] };
/** The compartments a variant draws. */
export function renalCompartmentsDrawn(variant?: string): RenalCompartment[] {
  const { anatomy } = parseVariant(variant);
  const hidden = new Set(Object.entries(RENAL_OPTIONAL_ANATOMY).filter(([k]) => !anatomy.includes(k)).flatMap(([, ids]) => ids));
  return RENAL_COMPARTMENTS.filter(c => !hidden.has(c));
}

export const RENAL_VIEWBOX = { width: 700, height: 400 };
/** Batch 466b: the drawing grows when four margin boxes leave the captions below the kidney's height. */
export function renalViewBox(variant?: string): { width: number; height: number } {
  return { width: RENAL_VIEWBOX.width, height: Math.max(RENAL_VIEWBOX.height, 64 + parseVariant(variant).boxes.length * 64 + 12 + 90) };
}

const KX = 220; const KY = 215; const RX = 78; const RY = 130;
const POLE_Y: Record<RenalPole, [number, number]> = { upper: [85, 172], middle: [172, 258], lower: [258, 345] };
const NOTCH = { top: 185, bottom: 245, x: 266 };

/** The ellipse's x at height y, on the lateral (-1, viewer's left) or medial (+1) side. */
const arcX = (y: number, side: -1 | 1, rx = RX, ry = RY) => KX + side * rx * Math.sqrt(Math.max(0, 1 - ((y - KY) / ry) ** 2));
const arc = (y0: number, y1: number, side: -1 | 1, n = 10): [number, number][] =>
  Array.from({ length: n + 1 }, (_, i) => { const y = y0 + ((y1 - y0) * i) / n; return [arcX(y, side), y] as [number, number]; });
const ellipse = (rx: number, ry: number, n = 48): [number, number][] =>
  Array.from({ length: n }, (_, i) => { const a = (2 * Math.PI * i) / n; return [KX + rx * Math.cos(a), KY + ry * Math.sin(a)] as [number, number]; });

function zone(pole: RenalPole, half: RenalHalf): [number, number][] {
  const [y0, y1] = POLE_Y[pole];
  if (half === 'lateral') return [...arc(y0, y1, -1), [KX, y1], [KX, y0]];
  // The medial middle zone has the hilum's notch.
  if (pole === 'middle') {
    return [[KX, y0], ...arc(y0, NOTCH.top, 1, 4), [NOTCH.x, NOTCH.top + 20], [NOTCH.x, NOTCH.bottom - 20], ...arc(NOTCH.bottom, y1, 1, 4), [KX, y1]];
  }
  return [[KX, y0], ...arc(y0, y1, 1), [KX, y1]];
}

const centre = (pts: [number, number][]) => [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length];

/** Shapes for the right kidney (hilum on the viewer's right). */
function rightShapes(): MapShape[] {
  const zones = RENAL_POLES.flatMap(p => RENAL_HALVES.map(h => {
    const pts = zone(p, h);
    const [lx, ly] = centre(pts);
    // The middle medial zone's label sits clear of the hilum (the pelvis is drawn over its centre).
    const labelX = p === 'middle' && h === 'medial' ? KX + 22 : h === 'lateral' ? lx - 6 : lx + 2;
    return { id: `${p}_${h}`, d: poly(pts), labelX: round(labelX), labelY: round(ly) };
  }));
  return [
    // Behind the kidney: Gerota's fascia, then perinephric fat (each a band round the kidney).
    { id: 'gerota', d: poly(ellipse(116, 172)), labelX: KX, labelY: KY + 168 },
    { id: 'perinephricFat', d: poly(ellipse(104, 160)), labelX: KX, labelY: KY + 148 },
    ...zones,
    { id: 'sinusFat', d: poly([[NOTCH.x, NOTCH.top + 20], [296, NOTCH.top], [306, NOTCH.top + 10], [306, NOTCH.bottom - 10], [296, NOTCH.bottom], [NOTCH.x, NOTCH.bottom - 20]]), labelX: 286, labelY: 236 },
    { id: 'pelvicalyceal', d: poly([[272, 207], [312, 205], [318, 213], [312, 221], [272, 222]]), labelX: 292, labelY: 217 },
    { id: 'ureter', d: poly([[305, 219], [316, 219], [328, 392], [317, 392]]), labelX: 334, labelY: 300 },
    { id: 'renalVein', d: poly([[300, 189], [392, 181], [392, 195], [300, 201]]), labelX: 352, labelY: 180 },
    { id: 'ivcBelow', d: rect(398, 110, 26, 200), labelX: 411, labelY: 210 },
    { id: 'ivcAbove', d: rect(398, 40, 26, 70), labelX: 411, labelY: 78 },
    { id: 'adrenal', d: poly([[200, 86], [232, 50], [270, 68], [262, 90], [230, 94]]), labelX: 236, labelY: 76 },
  ];
}

const mirrorX = (x: number) => 2 * KX - x;
const mirrorPath = (d: string) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x, y) => `${round(mirrorX(Number(x)))} ${y}`);

/** The drawing's variant: `<procedure>|<side>|<margin boxes>[|<anatomy>]` ('radical|R|vus' by default; a partial
 *  nephrectomy 'partial|R|ps', with v and u added for a non-standard vein or ureter margin, and Batch 466c's
 *  anatomy letters — RENAL_OPTIONAL_ANATOMY — for what it draws beyond the kidney, e.g. 'partial|R|psv|v'). A
 *  radical nephrectomy draws all of it, so its anatomy is never written. */
export function renalVariant(procedure: string | undefined, side: string | undefined, boxes?: string, anatomy?: string): string {
  const partial = procedure === 'partial';
  const base = `${partial ? 'partial' : 'radical'}|${side === 'left' ? 'L' : 'R'}|${boxes ?? (partial ? 'ps' : 'vus')}`;
  return partial && anatomy ? `${base}|${anatomy}` : base;
}
function parseVariant(variant: string | undefined) {
  const [proc, side, boxes, anatomy] = (variant ?? '').split('|');
  const partial = proc === 'partial';
  return {
    partial, left: side === 'L', boxes: [...(boxes ?? (partial ? 'ps' : 'vus'))].filter(b => RENAL_MARGIN_BOXES[b]),
    anatomy: partial ? [...(anatomy ?? '')].filter(a => RENAL_OPTIONAL_ANATOMY[a]) : Object.keys(RENAL_OPTIONAL_ANATOMY),
  };
}
const BOX_Y = (i: number) => 64 + i * 64;

export function renalShapes(variant?: string): MapShape[] {
  const { left, boxes } = parseVariant(variant);
  const drawn = new Set<string>(renalCompartmentsDrawn(variant));
  const kidney = rightShapes().filter(s => drawn.has(s.id) || !(RENAL_COMPARTMENTS as readonly string[]).includes(s.id)).map(s => (left ? { ...s, d: mirrorPath(s.d), labelX: round(mirrorX(s.labelX)) } : s));
  const margins = boxes.map((b, i) => ({ id: RENAL_MARGIN_BOXES[b], d: rect(500, BOX_Y(i), 160, 34), labelX: 580, labelY: BOX_Y(i) + 21 }));
  return [...kidney, ...margins];
}

export function renalCaptions(variant?: string): MapCaption[] {
  const { partial, left, boxes, anatomy } = parseVariant(variant);
  const boxCaption = (b: string) => (b === 'p' ? 'margin.parenchymal' : b === 's' ? (partial ? 'margin.capsular' : 'margin.softTissue') : b === 'v' ? 'margin.vein' : 'margin.ureter');
  const after = BOX_Y(boxes.length) + 12;
  const side = (c: MapCaption): MapCaption => (left
    ? { ...c, x: round(mirrorX(c.x)), anchor: c.anchor === 'start' ? 'end' : c.anchor === 'end' ? 'start' : c.anchor }
    : c);
  return [
    ...[
      { key: 'pole.upper', x: 96, y: 130, anchor: 'end' as const },
      { key: 'pole.middle', x: 96, y: 216, anchor: 'end' as const },
      { key: 'pole.lower', x: 96, y: 302, anchor: 'end' as const },
      { key: 'orient.lateral', x: 96, y: 60, anchor: 'end' as const },
      { key: 'orient.medial', x: 300, y: 36, anchor: 'start' as const },
    ].map(side),
    // Beside the vena cava, on its outer side (either kidney); only when the vena cava is drawn.
    ...(anatomy.includes('i') ? [{ key: 'diaphragm', x: left ? 46 : 430, y: 124, anchor: 'start' as const }] : []),
    { key: 'view', x: KX, y: 16 },
    { key: 'margins.title', x: 580, y: 36 },
    ...boxes.map((b, i) => ({ key: boxCaption(b), x: 580, y: BOX_Y(i) - 6 })),
    // The site's rules for the margins judged by distance (a partial nephrectomy has two).
    ...(boxes.includes('p') ? [{ key: 'rule.parenchymal', x: 580, y: after }] : []),
    ...(boxes.includes('s') ? [{ key: 'rule.softTissue', x: 580, y: after + (boxes.includes('p') ? 16 : 0) }] : []),
    { key: 'aspect', x: 580, y: after + 40 },
    { key: 'pT', x: 580, y: after + 60 },
    { key: 'pTNote', x: 580, y: after + 76 },
  ];
}

/** The diaphragm line across the vena cava, mirrored with the kidney (none when the vena cava isn't drawn). */
export function renalGuides(variant?: string): string {
  const { left, anatomy } = parseVariant(variant);
  if (!anatomy.includes('i')) return '';
  const [a, b] = left ? [mirrorX(392), mirrorX(430)] : [392, 430];
  return `M ${round(a)} 110 L ${round(b)} 110`;
}
