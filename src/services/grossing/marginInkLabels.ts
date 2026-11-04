// src/services/grossing/marginInkLabels.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 610 (#9). Which ink colour was recorded on each margin, so the organ-map
// legend and the synoptic margin labels can show it next to the margin's name.
//
// The source is the margins recorded at grossing (Specimen.margins and
// HistologyBlock.margins, each with an append-only ink history). The colour shown is the
// latest one applied; a margin inked twice also lists the earlier colour(s).
// A margin with no ink recorded is not listed: nothing is shown rather than a guess.
// Pure.
// ─────────────────────────────────────────────────────────────────────────────

import type { Specimen } from '@/types/case/Specimen';
import type { Margin } from '@/types/case/Margin';

export interface MarginInkEntry {
  marginId: string;
  name: string;
  /** The latest ink applied. */
  colorName: string;
  /** Hex such as #00AEEF, or the palette reference the caller stored. */
  colorCode: string;
  /** Earlier colours, oldest first (empty when the margin was inked once). */
  earlier: { colorName: string; colorCode: string }[];
}

const entryOf = (m: Margin): MarginInkEntry | null => {
  const apps = m.inkApplications ?? [];
  if (apps.length === 0 || !m.name?.trim()) return null;
  const last = apps[apps.length - 1];
  return {
    marginId: m.id, name: m.name.trim(), colorName: last.colorName, colorCode: last.colorCode,
    earlier: apps.slice(0, -1).map(a => ({ colorName: a.colorName, colorCode: a.colorCode })),
  };
};

/** Every margin on the case that has an ink recorded, specimen-level first, then per block. */
export function collectMarginInk(specimens: readonly Specimen[] | undefined): MarginInkEntry[] {
  const out: MarginInkEntry[] = [];
  for (const sp of specimens ?? []) {
    for (const m of sp.margins ?? []) { const e = entryOf(m); if (e) out.push(e); }
    for (const b of sp.blocks ?? []) {
      for (const m of b.margins ?? []) { const e = entryOf(m); if (e) out.push(e); }
    }
  }
  return out;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The ink for a synoptic field label such as "Superior margin" or "Margin status – Deep".
 * The label must name a recorded margin as a whole word, and either be the margin's name or
 * mention "margin"; the longest name wins ("Deep lateral" before "Deep"). Undefined otherwise.
 */
export function inkForMarginLabel(entries: readonly MarginInkEntry[], label: string): MarginInkEntry | undefined {
  const text = (label ?? '').trim().toLowerCase();
  if (!text || entries.length === 0) return undefined;
  const mentionsMargin = /\bmargins?\b/.test(text);
  return [...entries]
    .sort((a, b) => b.name.length - a.name.length)
    .find(e => {
      const name = e.name.toLowerCase();
      if (text === name) return true;
      return mentionsMargin && new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRe(name)}([^\\p{L}\\p{N}]|$)`, 'u').test(text);
    });
}

/** A swatch can only be drawn from a hex colour; anything else shows the name alone. */
export const swatchColor = (code: string): string | null => (/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(code) ? code : null);
