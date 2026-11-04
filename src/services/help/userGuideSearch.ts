// src/services/help/userGuideSearch.ts
// ─────────────────────────────────────────────────────────
// Batch 657: search over the guide's search index (built with the guide). Every word typed must be found somewhere
// in the article; title, keywords and screen name count most, then headings, then the text.
// ─────────────────────────────────────────────────────────
export interface UserGuideIndexEntry {
  slug: string; title: string; module: string; screen: string; keywords: string[]; roles: string[]; headings: string[]; text: string;
}

export function searchUserGuide(index: readonly UserGuideIndexEntry[], query: string, limit = 12): UserGuideIndexEntry[] {
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 1);
  if (!words.length) return [];
  const scored: { entry: UserGuideIndexEntry; score: number }[] = [];
  for (const entry of index) {
    let score = 0;
    let all = true;
    for (const w of words) {
      const hit =
        (entry.title.toLowerCase().includes(w) ? 10 : 0) +
        (entry.keywords.some(k => k.toLowerCase().includes(w)) ? 6 : 0) +
        ((entry.module + ' ' + entry.screen).toLowerCase().includes(w) ? 5 : 0) +
        (entry.headings.some(h => h.toLowerCase().includes(w)) ? 3 : 0) +
        (entry.text.toLowerCase().includes(w) ? 1 : 0);
      if (!hit) { all = false; break; }
      score += hit;
    }
    if (all) scored.push({ entry, score });
  }
  return scored.sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title)).slice(0, limit).map(s => s.entry);
}
