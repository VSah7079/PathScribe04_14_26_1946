// src/services/labelDesigner/labelFieldGeometry.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 460 (PS-245's acceptance criteria): moving and resizing a field on the
// Label Designer canvas, kept inside the label's physical edge. Before, a
// field could be dropped, dragged or typed past the edge with no warning, and
// resizing was by number only. Pure; the page only turns pointer positions
// into millimetres and calls these.
//
// • Everything is in millimetres, rounded to 0.1 mm.
// • A field is at least MIN_FIELD_MM wide and high, and never larger than the label.
// • A resize keeps the opposite edge where it was.
// • fieldsOutOfBounds finds fields saved before this check (or left outside
//   when the label size changed), so the page can warn and fit them.
// ─────────────────────────────────────────────────────────────────────────────

import type { LabelLayoutField } from './ILabelLayoutService';

/** The save's refusal for a layout with a field past the label's edge (the page shows its own text). */
export const LABEL_LAYOUT_OUT_OF_BOUNDS = 'fieldsOutOfBounds';

/** Screen pixels per millimetre on the canvas. */
export const PX_PER_MM = 4;
export const MIN_FIELD_MM = 2;
export const MIN_FONT_MM = 1;

export type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
export const RESIZE_HANDLES: readonly ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

export interface LabelSize { widthMm: number; heightMm: number }
type Rect = Pick<LabelLayoutField, 'xMm' | 'yMm' | 'widthMm' | 'heightMm'>;

const round = (n: number) => Math.round(n * 10) / 10;
const num = (n: unknown, fallback: number) => (typeof n === 'number' && Number.isFinite(n) ? n : fallback);
const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), Math.max(lo, hi));

export const pxToMm = (px: number) => px / PX_PER_MM;
export const mmToPx = (mm: number) => mm * PX_PER_MM;

/** The field moved and sized to fit inside the label (font no taller than the field). */
export function clampFieldToLabel<F extends LabelLayoutField>(field: F, label: LabelSize): F {
  const minW = Math.min(MIN_FIELD_MM, label.widthMm);
  const minH = Math.min(MIN_FIELD_MM, label.heightMm);
  const widthMm = round(clamp(num(field.widthMm, minW), minW, label.widthMm));
  const heightMm = round(clamp(num(field.heightMm, minH), minH, label.heightMm));
  const xMm = round(clamp(num(field.xMm, 0), 0, label.widthMm - widthMm));
  const yMm = round(clamp(num(field.yMm, 0), 0, label.heightMm - heightMm));
  const fontSizeMm = round(clamp(num(field.fontSizeMm, MIN_FONT_MM), MIN_FONT_MM, Math.max(MIN_FONT_MM, heightMm)));
  return { ...field, xMm, yMm, widthMm, heightMm, fontSizeMm };
}

/** The field's top-left moved to (xMm, yMm), kept inside the label. */
export function moveFieldTo<F extends LabelLayoutField>(field: F, xMm: number, yMm: number, label: LabelSize): F {
  return clampFieldToLabel({ ...field, xMm, yMm }, label);
}

/** The field resized by dragging `handle` by (dxMm, dyMm) from where it
 *  started; the opposite edge stays put, and no edge leaves the label. */
export function resizeFieldFromHandle<F extends LabelLayoutField>(start: F, handle: ResizeHandle, dxMm: number, dyMm: number, label: LabelSize): F {
  const minW = Math.min(MIN_FIELD_MM, label.widthMm);
  const minH = Math.min(MIN_FIELD_MM, label.heightMm);
  let left = start.xMm; let right = start.xMm + start.widthMm;
  let top = start.yMm; let bottom = start.yMm + start.heightMm;
  if (handle.includes('e')) right = clamp(right + num(dxMm, 0), left + minW, label.widthMm);
  if (handle.includes('w')) left = clamp(left + num(dxMm, 0), 0, right - minW);
  if (handle.includes('s')) bottom = clamp(bottom + num(dyMm, 0), top + minH, label.heightMm);
  if (handle.includes('n')) top = clamp(top + num(dyMm, 0), 0, bottom - minH);
  return clampFieldToLabel({ ...start, xMm: left, yMm: top, widthMm: right - left, heightMm: bottom - top }, label);
}

/** A number typed in the inspector, applied and kept inside the label. A
 *  typed size grows from where the field is (it never moves the field);
 *  a typed position keeps the field's size. */
export function applyInspectorEdit<F extends LabelLayoutField>(field: F, patch: Partial<Pick<LabelLayoutField, 'xMm' | 'yMm' | 'widthMm' | 'heightMm' | 'fontSizeMm'>>, label: LabelSize): F {
  const next = { ...field, ...patch };
  if (patch.widthMm !== undefined) next.widthMm = Math.min(num(patch.widthMm, field.widthMm), label.widthMm - field.xMm);
  if (patch.heightMm !== undefined) next.heightMm = Math.min(num(patch.heightMm, field.heightMm), label.heightMm - field.yMm);
  return clampFieldToLabel(next, label);
}

/** Whether the field lies wholly inside the label. */
export function isFieldInsideLabel(field: Rect, label: LabelSize): boolean {
  const eps = 0.05;
  return field.xMm >= -eps && field.yMm >= -eps && field.widthMm > 0 && field.heightMm > 0
    && field.xMm + field.widthMm <= label.widthMm + eps && field.yMm + field.heightMm <= label.heightMm + eps;
}

/** The ids of fields that cross the label's edge. */
export function fieldsOutOfBounds(fields: readonly LabelLayoutField[], label: LabelSize): string[] {
  return fields.filter(f => !isFieldInsideLabel(f, label)).map(f => f.id);
}
