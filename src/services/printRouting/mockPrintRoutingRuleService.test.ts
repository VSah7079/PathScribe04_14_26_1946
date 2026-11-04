// @vitest-environment happy-dom
// src/services/printRouting/mockPrintRoutingRuleService.test.ts (Batch 553)
import { describe, it, expect, vi, beforeEach } from 'vitest';

const auth = vi.hoisted(() => ({ allowedSites: ['F1'] as string[] }));
vi.mock('../authorization/defaultAuthorizationService', () => ({
  authorizationService: {
    enforce: vi.fn(async () => ({ allowed: true })),
    evaluate: vi.fn(async (_c: string, ctx: { facilityId?: string } = {}) => ({ allowed: !ctx.facilityId || auth.allowedSites.includes(ctx.facilityId) })),
  },
}));

import { mockPrintRoutingRuleService } from './mockPrintRoutingRuleService';
import { CONFIG_NOT_PERMITTED } from '../authorization/guardConfigWrites';

const rule = (printDestination: unknown, scopeType = 'location', scopeId = 'ICU') =>
  ({ scopeType, scopeId, printDestination, active: true }) as never;

beforeEach(() => { localStorage.clear(); auth.allowedSites = ['F1']; });

describe('print routing rules name a site agent printer (Batch 553)', () => {
  it('saves an agent printer on a site the person may configure', async () => {
    const res = await mockPrintRoutingRuleService.create(rule({ agentPrinter: { siteId: 'F1', destinationId: 'rep-1' } }));
    expect(res.ok).toBe(true);
  });
  it("refuses another site's printer on a facility-tier rule, a site the person may not configure, and an unusable destination", async () => {
    expect(await mockPrintRoutingRuleService.create(rule({ agentPrinter: { siteId: 'F2', destinationId: 'rep-1' } }, 'facility', 'F1'))).toEqual({ ok: false, error: 'agentPrinterOtherSite' });
    expect(await mockPrintRoutingRuleService.create(rule({ agentPrinter: { siteId: 'F2', destinationId: 'rep-1' } }))).toEqual({ ok: false, error: CONFIG_NOT_PERMITTED });
    expect(await mockPrintRoutingRuleService.create(rule({ protocol: 'RAW_9100', ipAddress: 'http://x' }))).toEqual({ ok: false, error: 'addressInvalid' });
  });
  it('an update is checked the same way', async () => {
    const made = await mockPrintRoutingRuleService.create(rule({ protocol: 'IPP', ipAddress: '10.0.0.1' }));
    if (!made.ok) throw new Error('setup');
    expect(await mockPrintRoutingRuleService.update(made.data.id, { printDestination: { agentPrinter: { siteId: 'F2', destinationId: 'x' } } })).toEqual({ ok: false, error: CONFIG_NOT_PERMITTED });
    expect((await mockPrintRoutingRuleService.update(made.data.id, { active: false })).ok).toBe(true);
  });
});
