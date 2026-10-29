// src/utils/specimenLabeling.ts
// ─────────────────────────────────────────────────────────────
// Single source of truth for specimen / block / slide label generation.
//
// Batch 715: the three levels are independent choices, each Letters or
// Numbers (services/labeling/labelStyle.ts). Before, one preset
// (Facility.specimenLabelStyle) tied the block to the OPPOSITE symbol type of
// the specimen so "Specimen 1, Block 1" could not happen. That is now the
// customer's call: choosing the same kind for specimen and block is allowed
// (the facility editor warns that a label like "11" or "AA" can be read two
// ways). The old preset values still work everywhere a style is accepted.
//
// Every creator of a label calls into this file (accession, grossing, report
// page, biopsy arrays), so the rule lives in one place.
// ─────────────────────────────────────────────────────────────

import {
  DEFAULT_LABEL_STYLE, LABEL_PRESETS, isLabelDesignation,
  type LabelDesignation, type LabelStyle, type SpecimenLabelStyle,
} from '@/services/labeling/labelStyle';

export type { SpecimenLabelStyle } from '@/services/labeling/labelStyle';

/** What the generators accept: a resolved style, part of one, or the old preset. */
export type LabelStyleInput = SpecimenLabelStyle | Partial<LabelStyle> | null | undefined;

/** The full style an input stands for; missing parts take today's defaults (pure). */
export function toLabelStyle(input: LabelStyleInput): LabelStyle {
  if (typeof input === 'string') return { ...DEFAULT_LABEL_STYLE, ...(LABEL_PRESETS[input] ?? {}) };
  const out: LabelStyle = { ...DEFAULT_LABEL_STYLE };
  if (input) for (const k of ['specimen', 'block', 'slide'] as const) if (isLabelDesignation(input[k])) out[k] = input[k] as LabelDesignation;
  return out;
}

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/** Position (0-indexed) as A..Z, then AA, AB... (more than 26 is rare but real). */
function letterSequence(index: number, lower = false): string {
  const pick = (i: number) => (lower ? ALPHA[i].toLowerCase() : ALPHA[i]);
  if (index < ALPHA.length) return pick(index);
  const first = Math.floor(index / ALPHA.length) - 1;
  const second = index % ALPHA.length;
  return `${pick(Math.min(first, ALPHA.length - 1))}${pick(second)}`;
}

/** A label at a position (0-indexed): "A", "B"... or "1", "2"... (pure). */
export function designationLabel(index: number, designation: LabelDesignation): string {
  return designation === 'numbers' ? `${index + 1}` : letterSequence(index);
}

/** The position (0-indexed) of a label in a designation's sequence, or -1 if it isn't one (pure). */
export function designationIndex(label: string, designation: LabelDesignation): number {
  if (designation === 'numbers') return /^[1-9]\d*$/.test(label) ? Number(label) - 1 : -1;
  if (/^[A-Z]$/.test(label)) return ALPHA.indexOf(label);
  if (/^[A-Z]{2}$/.test(label)) return (ALPHA.indexOf(label[0]) + 1) * ALPHA.length + ALPHA.indexOf(label[1]);
  return -1;
}

/** Specimen label at a given position (0-indexed). */
export function getSpecimenLabel(index: number, style?: LabelStyleInput): string {
  return designationLabel(index, toLabelStyle(style).specimen);
}

/** Block label at a given position (0-indexed). */
export function getBlockLabel(index: number, style?: LabelStyleInput): string {
  return designationLabel(index, toLabelStyle(style).block);
}

/**
 * The label for the next block of a specimen: one past the highest position
 * already used in the block style, and never one already in use. A removed
 * block's label is not handed out again while a later one exists. Labels made
 * under another style are ignored when counting (pure).
 */
export function nextBlockLabel(existingLabels: readonly string[], style?: LabelStyleInput): string {
  const designation = toLabelStyle(style).block;
  const taken = new Set(existingLabels);
  const highest = existingLabels.reduce((m, l) => Math.max(m, designationIndex(l, designation)), -1);
  let i = highest + 1;
  while (taken.has(designationLabel(i, designation))) i += 1;
  return designationLabel(i, designation);
}

/**
 * The slide's printed level text. Numbers: "L1", "L2" (as always). Letters:
 * "La", "Lb". `level` is the stored level code ("L3"); the code itself never
 * changes, so ids and barcodes of existing slides are untouched (pure).
 */
export function slideLevelText(level: string, designation: LabelDesignation = 'numbers'): string {
  const n = Number(String(level).replace(/^L/i, ''));
  if (designation === 'numbers' || !Number.isInteger(n) || n < 1) return level;
  return `L${letterSequence(n - 1, true)}`;
}

/** A worked example for the configuration screen: "Specimen A · Block 1 · Slide L1" (pure; the words come from the caller). */
export function exampleLabels(style: LabelStyleInput): { specimen: string; block: string; slide: string; cassette: string } {
  const s = toLabelStyle(style);
  const specimen = designationLabel(0, s.specimen);
  const block = designationLabel(0, s.block);
  return { specimen, block, slide: slideLevelText('L1', s.slide), cassette: `${specimen}${block}` };
}
