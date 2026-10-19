// @vitest-environment happy-dom
// src/services/tumorBoardRules/runCriteriaRuleEvaluation.test.ts
// Batch 610 (#71): diagnosis and biomarker rules at sign-out, through the same runner as the margin rules.
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: vi.fn(async (capability: string) => ({ capability, allowed: true, grantedBy: [], missingRequirements: [], context: {} })) },
}));

const { runMarginRuleEvaluation } = await import('./runMarginRuleEvaluation');
const { mockTumorBoardService } = await import('../tumorBoard/mockTumorBoardService');
const { mockTumorBoardCriteriaRuleService: criteria, mockFacilityTumorBoardRuleOverrideService: overrides, mockTumorBoardRuleService: margin } = await import('./mockTumorBoardRuleService');

const FIELDS = [
  { id: 'dx', label: 'Final Diagnosis', type: 'text' },
  { id: 'er', label: 'ER Status', type: 'select' },
  { id: 'distance_to_closest_margin_mm', label: 'Distance to closest margin', type: 'text' },
];

const run = (caseId: string, answers: Record<string, string>, facilityId?: string) =>
  runMarginRuleEvaluation({
    caseId, caseAccession: `S26-${caseId}`, facilityId,
    instances: [{ instanceId: 'i1', templateId: 'breast', answers }],
    getTemplateFields: async () => FIELDS,
    byUserId: 'u1', byUserName: 'Dr A',
  });

const TRIPLE = {
  label: 'IDC, ER negative', board: 'GI MDT' as const,
  criteria: [{ kind: 'diagnosis' as const, text: 'ductal carcinoma' }, { kind: 'biomarker' as const, marker: 'ER', result: 'Negative' }],
};

describe('runMarginRuleEvaluation with diagnosis and biomarker rules', () => {
  beforeEach(async () => {
    localStorage.clear();
    const rules = await margin.getAll();
    if (rules.ok) for (const r of rules.data) await margin.update(r.id, { marginThresholdMm: 1, active: true });
  });

  it('lists the case for the rule\'s board with the reason, source Rule', async () => {
    await criteria.create(TRIPLE);
    const res = await run('cr-1', { dx: 'Invasive ductal carcinoma', er: 'Negative', distance_to_closest_margin_mm: '8 mm' });
    expect(res).toMatchObject({ flagged: true, board: 'GI MDT', ruleKind: 'criteria' });
    expect(res.triggerReason).toBe('Rule "IDC, ER negative": Diagnosis contains "ductal carcinoma", ER Negative');
    const listing = await mockTumorBoardService.getActiveForCase('cr-1');
    expect(listing.ok && listing.data).toMatchObject({ source: 'Rule', board: 'GI MDT', triggerReason: res.triggerReason });
  });

  it('does nothing when one criterion fails', async () => {
    await criteria.create(TRIPLE);
    const res = await run('cr-2', { dx: 'Invasive ductal carcinoma', er: 'Positive', distance_to_closest_margin_mm: '8 mm' });
    expect(res.flagged).toBe(false);
  });

  it('a margin criterion inside the rule uses the extracted distance', async () => {
    await criteria.create({ ...TRIPLE, criteria: [...TRIPLE.criteria, { kind: 'margin', belowMm: 2 }] });
    expect((await run('cr-3', { dx: 'Invasive ductal carcinoma', er: 'Negative', distance_to_closest_margin_mm: '5 mm' })).flagged).toBe(false);
    expect((await run('cr-4', { dx: 'Invasive ductal carcinoma', er: 'Negative', distance_to_closest_margin_mm: '1.5 mm' })).flagged).toBe(true);
  });

  it('the margin rules still win when both a margin rule and a criteria rule match', async () => {
    await criteria.create(TRIPLE);
    const res = await run('cr-5', { dx: 'Invasive ductal carcinoma', er: 'Negative', distance_to_closest_margin_mm: '0.4 mm' });
    expect(res).toMatchObject({ flagged: true, board: 'Breast MDT', ruleKind: 'margin' });
  });

  it('a facility routes the rule to another board, or switches it off', async () => {
    const created = await criteria.create(TRIPLE);
    if (!created.ok) throw new Error('create failed');
    await overrides.set('fac-routed', created.data.id, { board: 'Thoracic MDM' });
    await overrides.set('fac-off', created.data.id, { active: false });
    const answers = { dx: 'Invasive ductal carcinoma', er: 'Negative', distance_to_closest_margin_mm: '8 mm' };
    expect(await run('cr-6', answers, 'fac-routed')).toMatchObject({ flagged: true, board: 'Thoracic MDM' });
    expect((await run('cr-7', answers, 'fac-off')).flagged).toBe(false);
    expect(await run('cr-8', answers, 'fac-other')).toMatchObject({ flagged: true, board: 'GI MDT' });
  });

  it('leaves a case that is already on an agenda alone', async () => {
    await criteria.create(TRIPLE);
    await mockTumorBoardService.create({ caseId: 'cr-9', caseAccession: 'S26-cr-9', board: 'Gyn-Onc', createdByUserId: 'u', createdByUserName: 'U' });
    const res = await run('cr-9', { dx: 'Invasive ductal carcinoma', er: 'Negative', distance_to_closest_margin_mm: '8 mm' });
    expect(res.flagged).toBe(false);
    const listing = await mockTumorBoardService.getActiveForCase('cr-9');
    expect(listing.ok && listing.data?.board).toBe('Gyn-Onc');
  });
});
