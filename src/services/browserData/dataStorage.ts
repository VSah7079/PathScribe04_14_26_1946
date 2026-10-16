// src/services/browserData/dataStorage.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 525 (PS-485): where the services keep their data in the browser.
//
//   dataStorage     — in place of localStorage;
//   tabDataStorage  — in place of sessionStorage.
//
// Both have the Storage interface. In the demo (browserDataPolicy.ts) they
// are the browser's own localStorage / sessionStorage, read at call time, so
// existing data and tests are unchanged. With the API server configured they
// are in-memory stores for this tab: nothing reaches the disk, and it is gone
// when the tab closes.
//
// Every service that holds data uses these, never localStorage directly; the
// guard (browserData.guard.test.ts) allows raw browser storage only in the
// few modules that keep preferences, workstation settings and the sign-in
// session (browserKeepList.ts).
// ─────────────────────────────────────────────────────────────────────────────
import { dataMayPersistInBrowser } from './browserDataPolicy';

/** A Storage held in memory. */
export class MemoryStorage implements Storage {
  private readonly items = new Map<string, string>();
  get length(): number { return this.items.size; }
  key(index: number): string | null { return [...this.items.keys()][index] ?? null; }
  getItem(key: string): string | null { return this.items.has(key) ? this.items.get(key)! : null; }
  setItem(key: string, value: string): void { this.items.set(String(key), String(value)); }
  removeItem(key: string): void { this.items.delete(key); }
  clear(): void { this.items.clear(); }
}

function browserArea(kind: 'local' | 'session'): Storage | null {
  try {
    const area = kind === 'local' ? globalThis.localStorage : globalThis.sessionStorage;
    return area ?? null;
  } catch {
    return null; // storage blocked
  }
}

/** A Storage that is the browser's own area in the demo, and memory otherwise (or when storage is blocked). */
function policyStorage(kind: 'local' | 'session'): Storage {
  const memory = new MemoryStorage();
  const area = (): Storage => (dataMayPersistInBrowser() ? browserArea(kind) ?? memory : memory);
  return {
    get length() { return area().length; },
    key: (index: number) => area().key(index),
    getItem: (key: string) => area().getItem(key),
    setItem: (key: string, value: string) => area().setItem(key, value),
    removeItem: (key: string) => area().removeItem(key),
    clear: () => area().clear(),
  };
}

export const dataStorage: Storage = policyStorage('local');
export const tabDataStorage: Storage = policyStorage('session');

/** Every key in a Storage (Object.keys() doesn't list them for dataStorage). */
export function storageKeys(area: Storage): string[] {
  const out: string[] = [];
  for (let i = 0; i < area.length; i++) { const k = area.key(i); if (k !== null) out.push(k); }
  return out;
}
