// src/services/siteSettings/siteSettingsStore.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 480 (Structured Inking, Module 1; PS-359 follow-up). The per-site
// analog of services/labSettings/labSettingsStore.ts — same two-function
// shape, same mock-phase-is-browser-storage / production-is-the-API-server
// posture, but keyed by a real Site.id (services/organisation/organisationService.ts)
// rather than flat/lab-wide, because Pete's own structured-inking spec needs
// a setting that genuinely varies per site (inking_validation_mode), not one
// shared by the whole lab.
//
// Built now, deliberately ahead of the Organisation/Site admin UI (still
// unbuilt — tracker Section B) — Pete's own choice, via AskUserQuestion,
// over hard-coding WARN_ONLY everywhere until that UI exists. When that UI
// ships, it reads/writes through these same two functions; nothing here
// needs to change, only a real settings screen gets built on top of it.
//
// Mock phase: browser storage, keyed `${key}:${siteId}` so settings for
// different sites never collide in the same browser. Production (PS-345):
// the API server, same as labSettingsStore — this file is the only one that
// changes then.
// ─────────────────────────────────────────────────────────────────────────────

/** A site-scoped setting, or the fallback when none is saved (or it can't be read). */
export function readSiteSetting<T>(siteId: string, key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`${key}:${siteId}`);
    return raw === null ? fallback : JSON.parse(raw) as T;
  } catch { return fallback; }
}

/** Saves a site-scoped setting. */
export function saveSiteSetting<T>(siteId: string, key: string, value: T): void {
  try { localStorage.setItem(`${key}:${siteId}`, JSON.stringify(value)); } catch { /* storage unavailable */ }
}
