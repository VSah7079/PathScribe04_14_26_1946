// src/services/cases/reportingModeRouting.test.ts
import { describe, it, expect } from 'vitest';
import { ORCH_ID_PREFIX, isOrchCaseId, formatOrchCaseId } from './reportingModeRouting';

describe('reportingModeRouting — the real single source of truth for O26- routing', () => {
  it('isOrchCaseId correctly identifies a real Orchestration case id', () => {
    expect(isOrchCaseId('O26-0001')).toBe(true);
  });

  it('isOrchCaseId correctly rejects a real LIS/Assist case id', () => {
    expect(isOrchCaseId('S26-4401-BX-001')).toBe(false);
  });

  it('isOrchCaseId fails safe on null/undefined rather than throwing', () => {
    expect(isOrchCaseId(null)).toBe(false);
    expect(isOrchCaseId(undefined)).toBe(false);
  });

  it('isOrchCaseId does not false-positive on an org-prefixed id that merely contains similar characters', () => {
    // The real scenario AccessionPage.tsx's own comment warns about —
    // an org-prefixed scheme like "MFT26-0029" must never be
    // misidentified as an Orchestration case.
    expect(isOrchCaseId('MFT26-0029')).toBe(false);
  });

  it('formatOrchCaseId produces an id that isOrchCaseId recognizes — generation and checking genuinely agree, not just by coincidence', () => {
    const generated = formatOrchCaseId(42);
    expect(isOrchCaseId(generated)).toBe(true);
    expect(generated).toBe('O26-0042');
  });

  it('formatOrchCaseId pads correctly for real sequence ranges', () => {
    expect(formatOrchCaseId(1)).toBe('O26-0001');
    expect(formatOrchCaseId(9999)).toBe('O26-9999');
  });

  it('ORCH_ID_PREFIX is exported and real code can derive from it directly, not just the two helper functions', () => {
    expect(ORCH_ID_PREFIX).toBe('O26-');
    expect('O26-0001'.startsWith(ORCH_ID_PREFIX)).toBe(true);
  });
});
