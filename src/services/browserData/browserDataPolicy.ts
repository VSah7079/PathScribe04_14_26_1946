// src/services/browserData/browserDataPolicy.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 525 (PS-485): whether data may be kept in this browser's storage.
//
//   - Demonstration (no PathScribe API server configured): the mock services
//     ARE the database, so they keep their data in localStorage as before.
//   - With the API server (VITE_API_BASE_URL set): data belongs on the
//     server. Nothing the services hold (cases, drafts, patient history,
//     masks, QA records, configuration …) is written to localStorage,
//     sessionStorage or IndexedDB; it lives in memory for the tab
//     (dataStorage.ts) until the HTTP services replace the mocks. The browser
//     keeps only display preferences, workstation settings, the language and
//     a minimal sign-in session (browserKeepList.ts).
//
// The decision is pure (browserMayKeepData); the instance reads the build's
// setting once. Phase 2 (PS-539) moves the API address to runtime
// configuration; this then reads it from there.
// ─────────────────────────────────────────────────────────────────────────────

import { appEnv } from '@/services/runtimeConfig/runtimeEnv';
/** Data may be kept in browser storage only when there is no API server (the demo). */
export function browserMayKeepData(apiServerConfigured: boolean): boolean {
  return !apiServerConfigured;
}

function apiServerConfigured(): boolean {
  const url: unknown = appEnv().VITE_API_BASE_URL;
  return typeof url === 'string' && url.trim() !== '';
}

let override: boolean | null = null;

/** True when this build keeps data in the browser (the demo). */
export function dataMayPersistInBrowser(): boolean {
  return override ?? browserMayKeepData(apiServerConfigured());
}

/** Tests only: act as the demo (true) or as a server deployment (false); null restores the build's setting. */
export function setDataMayPersistInBrowserForTests(value: boolean | null): void {
  override = value;
}
