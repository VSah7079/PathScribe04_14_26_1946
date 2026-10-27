// src/services/actionRegistry/findExactTriggerMatch.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 628. Step 1 of voice matching (an exact phrase). Until now the first command in screen-first order whose
// phrase appeared anywhere in what was said won. On the worklist that made "open messages" run Open Selected
// (its phrase "open" is inside it), in every language, because the worklist's own commands are tried first.
//
// Now the best match wins, not the first:
//   1. A phrase that IS everything that was said beats a phrase that is only part of it.
//   2. Among phrases that are only part of it, the longer (more specific) phrase wins.
//   3. A tie goes to the earlier command, so a screen command still beats an always-on command that has the
//      same phrase (Batch 602), and hotkey-style precedence is unchanged.
// Pure; the caller passes the screen-first list, each command's phrases, and its text normaliser.
// ─────────────────────────────────────────────────────────────────────────────

export function findExactTriggerMatch<T>(
  transcript: string | undefined | null,
  actions: readonly T[],
  triggersFor: (action: T) => readonly string[],
  norm: (text: string | undefined | null) => string,
): T | undefined {
  const said = norm(transcript);
  if (!said) return undefined;
  let best: { action: T; score: number } | undefined;
  for (const action of actions) {
    for (const trigger of triggersFor(action)) {
      const phrase = norm(trigger);
      if (!phrase) continue;
      const whole = said === phrase;
      const inside = !whole && new RegExp(`(?:^|\\s)${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|$)`).test(said);
      if (!whole && !inside) continue;
      const score = whole ? Number.MAX_SAFE_INTEGER : phrase.length;
      if (!best || score > best.score) best = { action, score };
    }
  }
  return best?.action;
}
