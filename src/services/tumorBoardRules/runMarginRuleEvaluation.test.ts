// @vitest-environment happy-dom
// src/services/tumorBoardRules/runMarginRuleEvaluation.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runMarginRuleEvaluation } from './runMarginRuleEvaluation';

// Batch 490's own gate — not this file's concern, but
// mockTumorBoardService.create() enforces it, so every test needs it to
// pass. Same pattern as mockTumorBoardService.test.ts.
vi.mock('../authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: vi.fn(async (capability: string) => ({ capability, allowed: true, grantedBy: [], missingRequirements: [], context: {} })) },
}));

const { mockTumorBoardService } = await import('../tumorBoard/mockTumorBoardService');
const { mockTumorBoardRuleService, mockFacilityTumorBoardRuleOverrideService } = await import('./mockTumorBoardRuleService');

const FIELDS = [{ id: 'distance_to_closest_margin_mm', label: 'Distance to closest margin', type: 'text' }];

async function clearCase(caseId: string) {
  const active = await mockTumorBoardService.getActiveForCase(caseId);
  if (active.ok && active.data) await mockTumorBoardService.update(active.data.id, { status: 'Cancelled' }, 'test', 'test');
}

describe('runMarginRuleEvaluation', () => {
  beforeEach(async () => {
    // Enterprise baseline back to its default 1mm/active for every rule.
    const rules = await mockTumorBoardRuleService.getAll();
    if (rules.ok) for (const r of rules.data) await mockTumorBoardRuleService.update(r.id, { marginThresholdMm: 1, active: true });
    const overrides = await mockFacilityTumorBoardRuleOverrideService.getAll();
    if (overrides.ok) for (const o of overrides.data) await mockFacilityTumorBoardRuleOverrideService.remove(o.facilityId, o.ruleId);
  });

  it('flags the case when a close margin is extracted, writing a Rule-sourced listing', async () => {
    await clearCase('case-mre-1');
    const res = await runMarginRuleEvaluation({
      caseId: 'case-mre-1', caseAccession: 'S26-9001',
      instances: [{ instanceId: 'i1', templateId: 'kidney_resection', answers: { distance_to_closest_margin_mm: '0.6 mm' } }],
      getTemplateFields: async () => FIELDS,
      byUserId: 'u1', byUserName: 'Dr A',
    });
    expect(res.flagged).toBe(true);
    expect(res.board).toBe('Breast MDT'); // first rule in enterprise order
    expect(res.triggerReason).toContain('0.6mm');

    const listing = await mockTumorBoardService.getActiveForCase('case-mre-1');
    expect(listing.ok).toBe(true);
    if (listing.ok) {
      expect(listing.data?.source).toBe('Rule');
      expect(listing.data?.triggerReason).toBe(res.triggerReason);
    }
  });

  it('does not flag when the margin is not close', async () => {
    await clearCase('case-mre-2');
    const res = await runMarginRuleEvaluation({
      caseId: 'case-mre-2', caseAccession: 'S26-9002',
      instances: [{ instanceId: 'i1', templateId: 'kidney_resection', answers: { distance_to_closest_margin_mm: '5 mm' } }],
      getTemplateFields: async () => FIELDS,
      byUserId: 'u1', byUserName: 'Dr A',
    });
    expect(res.flagged).toBe(false);
    const listing = await mockTumorBoardService.getActiveForCase('case-mre-2');
    expect(listing.ok && listing.data).toBeNull();
  });

  it('does not re-flag a case that already has an active listing', async () => {
    await clearCase('case-mre-3');
    await mockTumorBoardService.create({ caseId: 'case-mre-3', caseAccession: 'S26-9003', board: 'GI MDT', createdByUserId: 'u1', createdByUserName: 'Dr A' });
    const res = await runMarginRuleEvaluation({
      caseId: 'case-mre-3', caseAccession: 'S26-9003',
      instances: [{ instanceId: 'i1', templateId: 'kidney_resection', answers: { distance_to_closest_margin_mm: '0.2 mm' } }],
      getTemplateFields: async () => FIELDS,
      byUserId: 'u1', byUserName: 'Dr A',
    });
    expect(res.flagged).toBe(false);
    const listing = await mockTumorBoardService.getActiveForCase('case-mre-3');
    expect(listing.ok && listing.data?.board).toBe('GI MDT'); // the manual listing, untouched
  });

  it('respects a facility override lowering the threshold', async () => {
    await clearCase('case-mre-4');
    const rulesRes = await mockTumorBoardRuleService.getAll();
    const breastRuleId = rulesRes.ok ? rulesRes.data.find(r => r.board === 'Breast MDT')!.id : '';
    await mockFacilityTumorBoardRuleOverrideService.set('fac-1', breastRuleId, { marginThresholdMm: 0.3 });
    // evaluateMarginRules() checks a margin attribute against every active
    // board's rule, not just the board the case would end up on (see "a
    // disabled facility override..." below for that cross-board behavior
    // tested deliberately) — so the other three boards' rules, still at
    // the untouched 1mm enterprise baseline, would also trip on 0.5mm.
    // Turn them off for fac-1 so this test isolates the one thing it's
    // actually proving: the Breast MDT override's own threshold is used.
    if (rulesRes.ok) {
      for (const r of rulesRes.data) {
        if (r.id !== breastRuleId) await mockFacilityTumorBoardRuleOverrideService.set('fac-1', r.id, { active: false });
      }
    }
    // 0.5mm clears the facility's own tighter 0.3mm threshold, even though
    // it would have tripped the 1mm enterprise baseline — this proves the
    // override's own threshold is the one actually used; see the next
    // test for the inverse (the override turning a rule off entirely).
    const res = await runMarginRuleEvaluation({
      caseId: 'case-mre-4', caseAccession: 'S26-9004', facilityId: 'fac-1',
      instances: [{ instanceId: 'i1', templateId: 'kidney_resection', answers: { distance_to_closest_margin_mm: '0.5 mm' } }],
      getTemplateFields: async () => FIELDS,
      byUserId: 'u1', byUserName: 'Dr A',
    });
    expect(res.flagged).toBe(false); // 0.5mm is not under the facility's own 0.3mm override
  });

  it('a disabled facility override turns the rule off for that facility only', async () => {
    await clearCase('case-mre-5');
    const rulesRes = await mockTumorBoardRuleService.getAll();
    const breastRuleId = rulesRes.ok ? rulesRes.data.find(r => r.board === 'Breast MDT')!.id : '';
    await mockFacilityTumorBoardRuleOverrideService.set('fac-2', breastRuleId, { active: false });
    const res = await runMarginRuleEvaluation({
      caseId: 'case-mre-5', caseAccession: 'S26-9005', facilityId: 'fac-2',
      instances: [{ instanceId: 'i1', templateId: 'kidney_resection', answers: { distance_to_closest_margin_mm: '0.1 mm' } }],
      getTemplateFields: async () => FIELDS,
      byUserId: 'u1', byUserName: 'Dr A',
    });
    // Breast MDT's rule is off for fac-2, but the other three boards' own
    // baseline rules still fire — the next one in enterprise order wins.
    expect(res.flagged).toBe(true);
    expect(res.board).toBe('GI MDT');
  });

  it('no margin-distance fields on the template is a no-op, not an error', async () => {
    await clearCase('case-mre-6');
    const res = await runMarginRuleEvaluation({
      caseId: 'case-mre-6', caseAccession: 'S26-9006',
      instances: [{ instanceId: 'i1', templateId: 'oral_cavity_resection', answers: {} }],
      getTemplateFields: async () => [],
      byUserId: 'u1', byUserName: 'Dr A',
    });
    expect(res.flagged).toBe(false);
  });
});
