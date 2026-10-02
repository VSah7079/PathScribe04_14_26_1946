// src/services/molecular/mockMolecularAssayControlRuleService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Batch 406: changing a rule needs config:molecular-control-rules:manage.
const { enforce } = vi.hoisted(() => ({ enforce: vi.fn(async (_key: string) => ({ allowed: true })) }));
vi.mock('../authorization/defaultAuthorizationService', () => ({ authorizationService: { enforce: (k: string) => enforce(k) } }));

beforeEach(() => {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };
});

describe('mockMolecularAssayControlRuleService — real, per §3.2 Dynamic Control Rules/Position Enforcements', () => {
  it('getAll returns the real, seeded rule matching the given specification\'s own §4.1 worked example', async () => {
    const { mockMolecularAssayControlRuleService } = await import('./mockMolecularAssayControlRuleService');
    const res = await mockMolecularAssayControlRuleService.getAll();
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data).toHaveLength(1);
      expect(res.data[0].assayCode).toBe('st-hpv-highrisk-screen');
      expect(res.data[0].requiredControls).toHaveLength(2);
    }
  });

  it('getByAssayCode correctly finds the real, matching rule', async () => {
    const { mockMolecularAssayControlRuleService } = await import('./mockMolecularAssayControlRuleService');
    const res = await mockMolecularAssayControlRuleService.getByAssayCode('st-hpv-highrisk-screen');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data?.assayCode).toBe('st-hpv-highrisk-screen');
  });

  it('getByAssayCode correctly returns an honest null for a real assay with no defined rule', async () => {
    const { mockMolecularAssayControlRuleService } = await import('./mockMolecularAssayControlRuleService');
    const res = await mockMolecularAssayControlRuleService.getByAssayCode('CT_NG_PCR');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toBeNull();
  });

  it('create correctly builds a new real rule', async () => {
    const { mockMolecularAssayControlRuleService } = await import('./mockMolecularAssayControlRuleService');
    const res = await mockMolecularAssayControlRuleService.create({
      assayCode: 'CT_NG_PCR',
      requiredControls: [{ sampleType: 'CONTROL_NTC', positionMode: 'random' }],
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.assayCode).toBe('CT_NG_PCR');
  });

  it('create correctly refuses a real, duplicate rule for an assay that already has one', async () => {
    const { mockMolecularAssayControlRuleService } = await import('./mockMolecularAssayControlRuleService');
    const res = await mockMolecularAssayControlRuleService.create({ assayCode: 'st-hpv-highrisk-screen', requiredControls: [] });
    expect(res.ok).toBe(false);
  });

  it('update correctly modifies a real, existing rule', async () => {
    const { mockMolecularAssayControlRuleService } = await import('./mockMolecularAssayControlRuleService');
    const res = await mockMolecularAssayControlRuleService.update('rule-001', { requiredControls: [{ sampleType: 'CONTROL_NTC', positionMode: 'random' }] });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.requiredControls).toHaveLength(1);
  });

  it('delete correctly removes a real rule', async () => {
    const { mockMolecularAssayControlRuleService } = await import('./mockMolecularAssayControlRuleService');
    await mockMolecularAssayControlRuleService.delete('rule-001');
    const res = await mockMolecularAssayControlRuleService.getByAssayCode('st-hpv-highrisk-screen');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toBeNull();
  });

  it('Batch 406: the seeded HPV rule says its sample rack goes in slot A1 or A2', async () => {
    const { mockMolecularAssayControlRuleService } = await import('./mockMolecularAssayControlRuleService');
    const res = await mockMolecularAssayControlRuleService.getByAssayCode('st-hpv-highrisk-screen');
    expect(res.ok && res.data?.allowedSampleRackSlotIds).toEqual(['SLOT_A1', 'SLOT_A2']);
  });

  it('Batch 406: create, update and delete each need config:molecular-control-rules:manage, and change nothing when refused', async () => {
    const { mockMolecularAssayControlRuleService } = await import('./mockMolecularAssayControlRuleService');
    const { MOLECULAR_CONTROL_RULE_NOT_PERMITTED } = await import('./IMolecularAssayControlRuleService');
    enforce.mockImplementation(async () => ({ allowed: false }));
    try {
      const created = await mockMolecularAssayControlRuleService.create({ assayCode: 'CT_NG_PCR', requiredControls: [] });
      const updated = await mockMolecularAssayControlRuleService.update('rule-001', { requiredControls: [] });
      const deleted = await mockMolecularAssayControlRuleService.delete('rule-001');
      for (const r of [created, updated, deleted]) expect(r).toMatchObject({ ok: false, error: MOLECULAR_CONTROL_RULE_NOT_PERMITTED });
      expect(enforce).toHaveBeenCalledWith('config:molecular-control-rules:manage');
    } finally {
      enforce.mockImplementation(async () => ({ allowed: true }));
    }
    const res = await mockMolecularAssayControlRuleService.getByAssayCode('st-hpv-highrisk-screen');
    expect(res.ok && res.data?.requiredControls).toHaveLength(2);
  });
});
