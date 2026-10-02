// @vitest-environment happy-dom
// Batch 428: a sample of Configuration sections refuse a change without their capability,
// change nothing, and ask for the right capability (one per section, Pete's choice).
import { describe, expect, it, vi, beforeEach } from 'vitest';

const asked: string[] = [];
let allow = false;
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: {
    enforce: async (c: string) => { asked.push(c); return { allowed: allow }; },
    evaluate: async () => ({ allowed: allow }),
    grantedCapabilities: async () => new Set<string>(),
  },
}));

import { CONFIG_NOT_PERMITTED } from './guardConfigWrites';
import { mockFlagService } from '../flags/mockFlagService';
import { mockFacilityService } from '../facilities/mockFacilityService';
import { mockTatTargetService } from '../tatConfig/mockTatTargetService';
import { mockSessionTimeoutService } from '../session/mockSessionTimeoutService';
import { mockBillingRuleService } from '../billing/mockBillingRuleService';
import { mockPrinterProfileService } from '../printerProfiles/mockPrinterProfileService';
import { mockCytologyQcSettingsService } from '../cytology/mockCytologyQcSettingsService';
import { mockReportTemplateService } from '../reportTemplates/mockReportTemplateService';

beforeEach(() => { asked.length = 0; allow = false; });

describe('Configuration sections check their own capability (Batch 428)', () => {
  const cases: [string, () => Promise<unknown>, string][] = [
    ['case flags', () => mockFlagService.add({ name: 'X' } as never), 'config:case-flags:manage'],
    ['facilities', () => mockFacilityService.update('f-x', {} as never), 'config:facilities:manage'],
    ['TAT targets', () => mockTatTargetService.remove('t-x' as never), 'config:tat-targets:manage'],
    ['session timeout', () => mockSessionTimeoutService.setOrgDefault(30), 'config:session-security:manage'],
    ['billing approval', () => mockBillingRuleService.approveVersion('B', 1, undefined, 'u'), 'config:billing-tables:approve'],
    ['printers', () => mockPrinterProfileService.remove('p-x'), 'config:printers:manage'],
    ['cytology QC rates', () => mockCytologyQcSettingsService.update({} as never), 'config:cytology-qc-rates:manage'],
    ['report template publish', () => mockReportTemplateService.publish('t-x'), 'config:report-template:publish'],
  ];
  for (const [name, call, capability] of cases) {
    it(`${name}: refused without ${capability}`, async () => {
      expect(await call()).toEqual({ ok: false, error: CONFIG_NOT_PERMITTED });
      expect(asked).toEqual([capability]);
    });
  }
  it('reads need no capability', async () => {
    await mockFlagService.getAll();
    await mockTatTargetService.getAll();
    expect(asked).toEqual([]);
  });
});
