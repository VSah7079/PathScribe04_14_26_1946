// src/services/errorReporting/crashTest.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 502 (PS-472): QA "injects synthetic render failures on each route and
// panel". Adding `?ps-crash-test=<boundary>` to the address makes that
// boundary's content throw on render, e.g. `?ps-crash-test=route`,
// `?ps-crash-test=panel:organ-map`, `?ps-crash-test=panel:synoptic`,
// `?ps-crash-test=app`. Only on a development build or a validation instance;
// a production instance ignores it. Pure.
// ─────────────────────────────────────────────────────────────────────────────

export const CRASH_TEST_PARAM = 'ps-crash-test';

export function crashTestRequested(search: string, boundary: string, enabled: boolean): boolean {
  if (!enabled) return false;
  return new URLSearchParams(search).get(CRASH_TEST_PARAM) === boundary;
}

export class CrashTestError extends Error {
  constructor(boundary: string) {
    super(`Crash test requested for ${boundary}`);
    this.name = 'CrashTestError';
  }
}
