// src/services/organMapping/breastGeometry.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 462: PathScribe's own breast schematic. Pure layout data.
//
// Clock face (left): the breast as viewed facing the patient, 12 o'clock at
// the top, 3 o'clock on the viewer's right. Twelve hour sectors around a
// central (subareolar) zone; the quadrant lines run along 12–6 and 3–9.
// Which side is outer depends on the breast: right breast, 9 o'clock is
// outer (lateral); left breast, 3 o'clock is outer.
//
// Specimen margins (right): the six oriented faces unfolded as a cross —
// superior on top, inferior below, anterior in the middle, medial and lateral
// either side (as they lie when facing the patient), posterior (deep) at the
// end. Each face is split: left half invasive carcinoma, right half DCIS.
// ─────────────────────────────────────────────────────────────────────────────

import type { MapCaption, MapShape } from './prostateGeometry';

export const BREAST_VIEWBOX = { width: 660, height: 345 };
const CX = 170; const CY = 180; const R = 120; const CENTRAL = 28;
const round = (n: number) => Math.round(n * 10) / 10;

export type BreastSide = 'right' | 'left';
export const BREAST_HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
export const BREAST_FACES = ['superior', 'inferior', 'medial', 'lateral', 'anterior', 'posterior'] as const;
export type BreastFace = typeof BREAST_FACES[number];
export type BreastQuadrant = 'UOQ' | 'UIQ' | 'LOQ' | 'LIQ';

/** Clock hour → angle in degrees, clockwise from 12. */
const hourAngle = (h: number) => (h % 12) * 30;
function polar(angleDeg: number, r: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [round(CX + Math.sin(rad) * r), round(CY - Math.cos(rad) * r)];
}

function hourSector(h: number): MapShape {
  const a0 = hourAngle(h) - 15; const a1 = hourAngle(h) + 15;
  const pts: [number, number][] = [];
  for (let i = 0; i <= 6; i++) pts.push(polar(a0 + (a1 - a0) * i / 6, R));
  for (let i = 6; i >= 0; i--) pts.push(polar(a0 + (a1 - a0) * i / 6, CENTRAL));
  const [lx, ly] = polar(hourAngle(h), (R + CENTRAL) / 2 + 18);
  return { id: `h${h}`, d: `M ${pts.map(p => p.join(' ')).join(' L ')} Z`, labelX: lx, labelY: ly };
}

const circlePath = (cx: number, cy: number, r: number) => `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;

/** Which quadrant a clock hour lies in (undefined on the 12, 3, 6 and 9 axes, or with no side). */
export function breastQuadrantOfHour(hour: number, side: BreastSide | undefined): BreastQuadrant | undefined {
  if (!side || hour % 3 === 0) return undefined;
  const viewerRight = hour < 6; const upper = hour < 3 || hour > 9;
  // Facing the patient, the right breast's outer half is on the viewer's left; the left breast's on the right.
  const outer = side === 'right' ? !viewerRight : viewerRight;
  return `${upper ? 'U' : 'L'}${outer ? 'O' : 'I'}Q` as BreastQuadrant;
}

/** The faces in the two side slots of the net: lateral on the viewer's left for a right breast. */
const sideFaces = (side: BreastSide | undefined): [BreastFace, BreastFace] => (side === 'left' ? ['medial', 'lateral'] : ['lateral', 'medial']);

const FACE_W = 68; const FACE_H = 54; const NET_X = 360; const NET_Y = 72;
function faceSlots(side: BreastSide | undefined): Record<BreastFace, { x: number; y: number }> {
  const [vl, vr] = sideFaces(side);
  const col = (i: number) => NET_X + i * (FACE_W + 4);
  const row = (j: number) => NET_Y + j * (FACE_H + 4);
  return {
    superior: { x: col(1), y: row(0) }, inferior: { x: col(1), y: row(2) }, anterior: { x: col(1), y: row(1) },
    [vl]: { x: col(0), y: row(1) }, [vr]: { x: col(2), y: row(1) }, posterior: { x: col(3), y: row(1) },
  } as Record<BreastFace, { x: number; y: number }>;
}

const rect = (x: number, y: number, w: number, h: number) => `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;

export function breastShapes(side: BreastSide | undefined): MapShape[] {
  const slots = faceSlots(side);
  const half = FACE_W / 2;
  return [
    ...BREAST_HOURS.map(hourSector),
    { id: 'central', d: circlePath(CX, CY, CENTRAL), labelX: CX, labelY: CY + 3 },
    ...BREAST_FACES.flatMap(face => {
      const { x, y } = slots[face];
      return [
        { id: `m_${face}_inv`, d: rect(x, y + 16, half, FACE_H - 16), labelX: x + half / 2, labelY: y + 38 },
        { id: `m_${face}_dcis`, d: rect(x + half, y + 16, half, FACE_H - 16), labelX: x + half + half / 2, labelY: y + 38 },
      ];
    }),
  ];
}

/** Hour numbers, side and quadrant names, the face names, the orientation. */
export function breastCaptions(side: BreastSide | undefined): MapCaption[] {
  const slots = faceSlots(side);
  const [vlq, vrq] = side === 'left' ? ['UIQ', 'UOQ'] : ['UOQ', 'UIQ'];
  const [vlqL, vrqL] = side === 'left' ? ['LIQ', 'LOQ'] : ['LOQ', 'LIQ'];
  return [
    { key: side ? `side.${side}` : 'side.unknown', x: CX, y: 22 },
    ...BREAST_HOURS.map(h => { const [x, y] = polar(hourAngle(h), R + 12); return { key: `hour.h${h}`, x, y: y + 4 }; }),
    ...(side ? [
      { key: `quadrant.${vlq}`, x: CX - R - 10, y: CY - R + 2, anchor: 'start' as const }, { key: `quadrant.${vrq}`, x: CX + R + 10, y: CY - R + 2, anchor: 'end' as const },
      { key: `quadrant.${vlqL}`, x: CX - R - 10, y: CY + R + 2, anchor: 'start' as const }, { key: `quadrant.${vrqL}`, x: CX + R + 10, y: CY + R + 2, anchor: 'end' as const },
    ] : []),
    { key: 'margins.title', x: NET_X + 2 * FACE_W + 6, y: 40 },
    ...BREAST_FACES.map(face => ({ key: `faceShort.${face}`, x: slots[face].x + FACE_W / 2, y: slots[face].y + 12 })),
    { key: 'margins.halves', x: NET_X + 2 * FACE_W + 6, y: NET_Y + 3 * (FACE_H + 4) + 12 },
    { key: 'orientation', x: CX, y: 340 },
  ];
}

/** The quadrant lines, drawn behind the sectors' text. */
export const BREAST_GUIDES = `M ${CX} ${CY - R - 4} L ${CX} ${CY + R + 4} M ${CX - R - 4} ${CY} L ${CX + R + 4} ${CY}`;

/** Where a focus is drawn: its clock hour (or the centre) and distance from the
 *  nipple (cm, 0–8 across the ring; no distance → mid-ring). Foci at the same
 *  spot are fanned out so each stays visible. */
export function breastMarkerPosition(clock: number | 'central', distanceCm: number | undefined, nth: number): { x: number; y: number } {
  if (clock === 'central') {
    // The centre, then a ring of six around it (20 px apart), then a wider ring.
    if (!nth) return { x: CX, y: CY };
    const [x, y] = nth <= 6 ? polar((nth - 1) * 60, 20) : polar((nth - 7) * 30 + 15, 40);
    return { x, y };
  }
  const span = R - CENTRAL - 12;
  const r = CENTRAL + 6 + (distanceCm === undefined ? span / 2 : (Math.min(Math.max(distanceCm, 0), 8) / 8) * span);
  const [x, y] = polar(hourAngle(clock) + (nth ? (nth % 2 ? 1 : -1) * Math.ceil(nth / 2) * 7 : 0), r);
  return { x, y };
}
export const BREAST_MARKER_RADIUS = 9;

/** Where a focus may be drawn, best first: its own spot, then nearer and further
 *  along its clock line, then fanned to either side. The resolver takes the first
 *  that overlaps no focus already drawn. */
export function breastMarkerCandidates(clock: number | 'central', distanceCm: number | undefined): { x: number; y: number }[] {
  if (clock === 'central') return Array.from({ length: 13 }, (_, nth) => breastMarkerPosition('central', undefined, nth));
  const base = breastMarkerPosition(clock, distanceCm, 0);
  const r = Math.hypot(base.x - CX, base.y - CY);
  const min = CENTRAL + BREAST_MARKER_RADIUS + 2; const max = R - BREAST_MARKER_RADIUS - 2;
  const along = [20, -20, 40, -40].map(d => r + d).filter(rr => rr >= min && rr <= max).map(rr => { const [x, y] = polar(hourAngle(clock), rr); return { x, y }; });
  const fanned = Array.from({ length: 12 }, (_, i) => breastMarkerPosition(clock, distanceCm, i + 1));
  return [base, ...along, ...fanned];
}
