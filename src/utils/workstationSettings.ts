// src/utils/workstationSettings.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 506 (PS-477): the one place UI code keeps settings that belong to the
// WORKSTATION, not to a person or the lab: which scan station, OR terminal or
// wall-display profile this computer is, how its foot pedal is bound, where a
// companion window last sat. They stay with the computer whoever signs in, and
// never go to the backend.
//
// Per-person display preferences go through utils/uiPreferences.ts; data goes
// through a service. The deployment-readiness guard stops UI code from using
// browser storage directly.
//
// Keys are used exactly as given (no prefix), so settings saved before this
// file existed are still found.
//
// Every access is wrapped: private browsing, blocked storage or a full quota
// fall back (nothing remembered) rather than throwing.
// ─────────────────────────────────────────────────────────────────────────────

/** The stored value, or null when unset or storage is unavailable. */
export function getWorkstationSetting(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Saves the value; null removes it. */
export function setWorkstationSetting(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage unavailable: the setting just isn't remembered on this computer */
  }
}

/** A JSON value, or the fallback when unset, unreadable or storage is unavailable. */
export function getWorkstationJson<T>(key: string, fallback: T): T {
  const raw = getWorkstationSetting(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Saves a value as JSON. */
export function setWorkstationJson(key: string, value: unknown): void {
  setWorkstationSetting(key, JSON.stringify(value));
}
