// src/services/labSettings/labSettingsStore.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 431: where lab-wide settings are kept: report document style, page
// size and margins, the AI orchestrator default, protocol lifecycle state.
//
// Mock phase: browser storage under the same keys as before, so nothing set so
// far is lost. Production (PS-345): the API server, so every workstation in a
// lab sees the same settings. This file is the only place that changes then.
// Each setting's own service checks who may change it before saving here.
// ─────────────────────────────────────────────────────────────────────────────

/** A lab-wide setting, or the fallback when none is saved (or it can't be read). */
export function readLabSetting<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw) as T;
  } catch { return fallback; }
}

/** Saves a lab-wide setting. */
export function saveLabSetting<T>(key: string, value: T): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
}
