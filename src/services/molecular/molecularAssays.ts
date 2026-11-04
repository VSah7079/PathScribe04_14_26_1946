// src/services/molecular/molecularAssays.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 406. The assays offered on the molecular screens: the Stain / Process
// Catalog's active Molecular entries, by name. (The plate builder filtered
// these inline; Rack Loading now shares this.)
//
// Pure.
// ─────────────────────────────────────────────────────────────────────────────

import type { StainType } from '../stains/IStainService';

export function molecularAssayTypes(stainTypes: readonly StainType[]): StainType[] {
  return stainTypes.filter(s => s.category === 'Molecular' && s.active).sort((a, b) => a.name.localeCompare(b.name));
}
