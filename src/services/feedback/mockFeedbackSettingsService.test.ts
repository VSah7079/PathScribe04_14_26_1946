// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';

// These tests are about the service, not who may use it, so Configuration
// changes are allowed here (the check itself: authorization/guardConfigWrites.test.ts).
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async () => ({ allowed: true }), evaluate: async () => ({ allowed: true }), grantedCapabilities: async () => new Set<string>() },
}));

import { mockFeedbackSettingsService as svc } from './mockFeedbackSettingsService';
import { mockAuditService } from '../auditlog/mockAuditService';

describe('feedback settings service (Batch 447)', () => {
  beforeEach(() => { localStorage.clear(); });
  it('starts from the default: the button follows the instance (validation here)', async () => {
    const r = await svc.get();
    expect(r.ok && r.data.qaButton).toBe('default');
    expect(await svc.qaButtonShown()).toBe(true);
  });
  it('saves, then the button follows the saved choice, and the change is audited', async () => {
    const log = vi.spyOn(mockAuditService, 'logEvent');
    const r = await svc.save({ qaButton: 'off', qaRecipients: [], qaAdminCc: [] });
    expect(r.ok).toBe(true);
    expect(await svc.qaButtonShown()).toBe(false);
    expect(log).toHaveBeenCalledWith(expect.objectContaining({ event: 'FEEDBACK_SETTINGS_CHANGED' }));
  });
  it('refuses settings that would leave feedback nowhere to go', async () => {
    const r = await svc.save({ qaButton: 'on', qaRecipients: [], qaAdminCc: [] });
    expect(r.ok === false && r.error).toBe('noRecipients');
  });
});
