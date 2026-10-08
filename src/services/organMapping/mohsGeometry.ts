// src/services/organMapping/mohsGeometry.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 463: PathScribe's own Mohs stage schematic. Pure layout data.
// One disc per stage, four to a row: 12 peripheral clock sectors (12 at the
// top, 3 on the right, as the surgeon's map is drawn) around the deep margin.
// ─────────────────────────────────────────────────────────────────────────────

import type { MapCaption, MapShape } from './prostateGeometry';
import { MOHS_CLOCK_SECTORS } from '../templates/mohsStages';

const CELL_W = 165; const CELL_H = 196; const PER_ROW = 4;
const R = 58; const DEEP = 24;
const round = (n: number) => Math.round(n * 10) / 10;

export function mohsViewBox(stageCount: number) {
  const rows = Math.max(1, Math.ceil(Math.max(stageCount, 1) / PER_ROW));
  return { width: 660, height: rows * CELL_H };
}

function centre(stage: number, dy = 0) {
  const i = stage - 1;
  return { cx: (i % PER_ROW) * CELL_W + CELL_W / 2, cy: Math.floor(i / PER_ROW) * CELL_H + 100 + dy };
}

function polar(cx: number, cy: number, angleDeg: number, r: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [round(cx + Math.sin(rad) * r), round(cy - Math.cos(rad) * r)];
}

export function mohsShapes(stageCount: number, dy = 0): MapShape[] {
  const shapes: MapShape[] = [];
  for (let n = 1; n <= stageCount; n++) {
    const { cx, cy } = centre(n, dy);
    for (const sector of MOHS_CLOCK_SECTORS) {
      const h = Number(sector.slice(1)); const a = (h % 12) * 30;
      const pts: [number, number][] = [];
      for (let i = 0; i <= 6; i++) pts.push(polar(cx, cy, a - 15 + i * 5, R));
      for (let i = 6; i >= 0; i--) pts.push(polar(cx, cy, a - 15 + i * 5, DEEP));
      const [lx, ly] = polar(cx, cy, a, (R + DEEP) / 2);
      shapes.push({ id: `s${n}_${sector}`, d: `M ${pts.map(p => p.join(' ')).join(' L ')} Z`, labelX: lx, labelY: ly });
    }
    shapes.push({ id: `s${n}_deep`, d: `M ${cx - DEEP} ${cy} A ${DEEP} ${DEEP} 0 1 0 ${cx + DEEP} ${cy} A ${DEEP} ${DEEP} 0 1 0 ${cx - DEEP} ${cy} Z`, labelX: cx, labelY: cy });
  }
  return shapes;
}

/** Each stage's title and status, and the 12, 3, 6 and 9 o'clock marks. */
export function mohsCaptions(stageCount: number, dy = 0): MapCaption[] {
  const out: MapCaption[] = [];
  for (let n = 1; n <= stageCount; n++) {
    const { cx, cy } = centre(n, dy);
    out.push({ key: `stage.${n}.title`, x: cx, y: cy - R - 22 });
    out.push({ key: `stage.${n}.status`, x: cx, y: cy + R + 26 });
    for (const h of [12, 3, 6, 9]) { const [x, y] = polar(cx, cy, (h % 12) * 30, R + 9); out.push({ key: `hour.h${h}`, x, y: y + 4 }); }
  }
  return out;
}

/** One stage on its own (the synoptic's input canvas): the stage's sectors
 *  with their real ids, and the 12, 3, 6, 9 marks. */
export function mohsSingleStage(stage: number): { width: number; height: number; shapes: MapShape[]; captions: MapCaption[] } {
  return {
    // The disc centred with room for the 12 and 6 o'clock marks above and below.
    width: CELL_W, height: CELL_H - 40,
    shapes: mohsShapes(1, -22).map(sh => ({ ...sh, id: sh.id.replace(/^s1_/, `s${stage}_`) })),
    captions: mohsCaptions(1, -22).filter(c => c.key.startsWith('hour.')),
  };
}
