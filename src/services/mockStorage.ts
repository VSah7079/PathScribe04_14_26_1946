// src/services/mockStorage.ts
// ─────────────────────────────────────────────────────────────────────────────
// Thin localStorage wrapper used by all mock services.
// Provides typed get/set with JSON serialization and a fallback to seed data.
// When the HTTP services replace the mocks, this file is simply unused.
//
// Batch 525 (PS-485): it writes through browserData/dataStorage.ts, so the
// data stays in this browser only in the demo; with the API server configured
// it is held in memory for the tab and never written to browser storage.
// ─────────────────────────────────────────────────────────────────────────────
import { dataStorage } from './browserData/dataStorage';

const PREFIX = 'pathscribe_mock_';

export function storageGet<T>(key: string, fallback: T): T {
  try {
    const raw = dataStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function storageSet<T>(key: string, value: T): void {
  try {
    dataStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // storage unavailable (SSR, private mode quota) — fail silently
  }
}

export function storageClear(key: string): void {
  try {
    dataStorage.removeItem(PREFIX + key);
  } catch {}
}
