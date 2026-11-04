// src/utils/configSectionParam.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 449: the inner tab a Configuration tab opens on, from ?section= in the
// address (what Configuration search sets). Anything not in the list falls
// back to the first, so a stale or hand-typed address still opens cleanly.
// Pure.
// ─────────────────────────────────────────────────────────────────────────────

export function pickConfigSection<T extends string>(search: string, allowed: readonly T[], fallback: T = allowed[0]): T {
  const wanted = new URLSearchParams(search).get('section');
  return (allowed as readonly string[]).includes(wanted ?? '') ? (wanted as T) : fallback;
}
