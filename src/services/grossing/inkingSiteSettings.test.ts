import { describe, it, expect, vi, beforeEach } from 'vitest';

const { enforce } = vi.hoisted(() => ({ enforce: vi.fn() }));
vi.mock('../authorization/defaultAuthorizationService', () => ({ authorizationService: { enforce } }));

// This project's vitest environment is plain Node, not jsdom, so there's no
// global `localStorage` — polyfill it here the same way
// src/services/abnormalDetection/abnormalTriggerRuleService.test.ts does.
const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
  clear: () => { store.clear(); },
};

import { getInkingValidationMode, setInkingValidationMode } from './inkingSiteSettings';
import { mockAuditService } from '../auditlog/mockAuditService';

beforeEach(() => {
  localStorage.clear();
  enforce.mockReset();
  enforce.mockResolvedValue({ allowed: true });
});

// Structured Inking, Module 3 (PS-359 follow-up): re-scoped from siteId to
// facilityId (Case.order.facilityId) — see inkingSiteSettings.ts's own
// header for why. The underlying generic store (siteSettingsStore.ts) is
// unchanged; only the id this file passes it changed meaning.
describe('inkingSiteSettings (facility-scoped as of Structured Inking Module 3)', () => {
  it('defaults to WARN_ONLY for a facility with nothing saved', () => {
    expect(getInkingValidationMode('facility-1')).toBe('WARN_ONLY');
  });

  it('a person without config:inking-validation-mode:manage cannot change it, and nothing is saved', async () => {
    enforce.mockResolvedValue({ allowed: false });
    const result = await setInkingValidationMode('facility-1', 'STRICT_ENFORCE');
    expect(result).toEqual({ ok: false, notPermitted: true });
    expect(getInkingValidationMode('facility-1')).toBe('WARN_ONLY');
  });

  it('sets and reads back the mode for the given facility only', async () => {
    const result = await setInkingValidationMode('facility-1', 'STRICT_ENFORCE');
    expect(result).toEqual({ ok: true });
    expect(getInkingValidationMode('facility-1')).toBe('STRICT_ENFORCE');
    expect(getInkingValidationMode('facility-2')).toBe('WARN_ONLY'); // a different facility is untouched
  });

  // Batch 484: the first real UI caller surfaced that this capability's
  // own catalog description already promises "Audited." — now it is.
  it('records an audit entry only when the mode actually changes, naming the facility, the before/after mode and the actor', async () => {
    const logEvent = vi.spyOn(mockAuditService, 'logEvent');
    await setInkingValidationMode('facility-9', 'STRICT_ENFORCE', 'Dr. Admin');
    expect(logEvent).toHaveBeenCalledTimes(1);
    const entry = logEvent.mock.calls[0][0];
    expect(entry.event).toBe('Inking validation mode changed');
    expect(entry.user).toBe('Dr. Admin');
    expect(entry.facilityId).toBe('facility-9');
    expect(entry.detail).toContain('WARN_ONLY to STRICT_ENFORCE');
    logEvent.mockRestore();
  });

  it('does not record an audit entry when the mode is set to what it already was', async () => {
    await setInkingValidationMode('facility-10', 'WARN_ONLY', 'Dr. Admin');
    const logEvent = vi.spyOn(mockAuditService, 'logEvent');
    await setInkingValidationMode('facility-10', 'WARN_ONLY', 'Dr. Admin');
    expect(logEvent).not.toHaveBeenCalled();
    logEvent.mockRestore();
  });
});
