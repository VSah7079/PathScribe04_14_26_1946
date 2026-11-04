// src/services/caseSearch/searchHitFlags.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 436 (PS-101): the flag chips on a header-search result. The search
// bar read `case.flags`, which no case has, so no chip ever showed. Case
// flags live in `caseFlags`: on most cases a reference to a flag definition
// (flagDefinitionId), on Orchestration cases the flag itself (name, colour,
// tagClass). Administrative and computational flags only, at most four,
// deleted ones left out. Pure.
// ─────────────────────────────────────────────────────────────────────────────

import type { Flag } from '../flags/IFlagService';

export interface SearchHitFlag { name: string; color: string; tagClass: string }

/** The hue used when a flag has no colour of its own (the flag catalog has none). */
export const DEFAULT_FLAG_HUE = '#64748b';

export function searchHitFlags(caseRecord: { caseFlags?: unknown[] } | null | undefined, flagDefById: ReadonlyMap<string, Pick<Flag, 'name' | 'tagClass'>>): SearchHitFlag[] {
  const out: SearchHitFlag[] = [];
  for (const raw of caseRecord?.caseFlags ?? []) {
    const r = (raw ?? {}) as { flagDefinitionId?: string; deletedAt?: string | null; name?: string; color?: string; tagClass?: string };
    if (r.deletedAt) continue;
    const def = r.flagDefinitionId ? flagDefById.get(r.flagDefinitionId) : undefined;
    const name = def?.name ?? r.name;
    const tagClass = def?.tagClass ?? r.tagClass;
    if (!name || (tagClass !== 'ADMINISTRATIVE' && tagClass !== 'COMPUTATIONAL')) continue;
    out.push({ name, color: r.color || DEFAULT_FLAG_HUE, tagClass });
    if (out.length === 4) break;
  }
  return out;
}
