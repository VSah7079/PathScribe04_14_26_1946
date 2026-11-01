// src/services/molecular/mockMolecularAssayControlRuleService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Batch 406: changing a rule needs config:molecular-control-rules:manage.
const { enforce, evaluate } = vi.hoisted(() => ({ enforce: vi.fn(async (_key: string) => ({ allowed: true })), evaluate: vi.fn(async (_key: string) => ({ allowed: false })) }));
vi.mock('../authorization/defaultAuthorizationService', () => ({ authorizationService: { enforce: (k: string) => enforce(k), evaluate: (k: string) => evaluate(k) } }));
// Batch 669: the audit entry a change leaves.
const { logEvent } = vi.hoisted(() => ({ logEvent: vi.fn(async (_e: unknown) => undefined) }));
vi.mock('../auditlog/mockAuditService', () => ({ mockAuditService: { logEvent: (e: unknown) => logEvent(e) } }));

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
      // Batch 467 adds the EGFR PCR rule (NTC A01, positive control A02); Batch 746 the KRAS PCR rule, laid out the same.
      expect(res.data.map(r => r.assayCode)).toEqual(['st-hpv-highrisk-screen', 'st-egfr-pcr', 'st-kras-pcr']);
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
    }, 'New assay');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.assayCode).toBe('CT_NG_PCR');
  });

  it('create correctly refuses a real, duplicate rule for an assay that already has one', async () => {
    const { mockMolecularAssayControlRuleService } = await import('./mockMolecularAssayControlRuleService');
    const res = await mockMolecularAssayControlRuleService.create({ assayCode: 'st-hpv-highrisk-screen', requiredControls: [{ sampleType: 'CONTROL_NTC', positionMode: 'random' }] }, 'Dup');
    expect(res.ok).toBe(false);
  });

  it('update correctly modifies a real, existing rule', async () => {
    const { mockMolecularAssayControlRuleService } = await import('./mockMolecularAssayControlRuleService');
    const res = await mockMolecularAssayControlRuleService.update('rule-001', { requiredControls: [{ sampleType: 'CONTROL_NTC', positionMode: 'random' }] }, 'Vendor change');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.requiredControls).toHaveLength(1);
  });

  it('a deleted seeded rule stays deleted (Batch 467: the later seed arrives only once)', async () => {
    const { mockMolecularAssayControlRuleService } = await import('./mockMolecularAssayControlRuleService');
    await mockMolecularAssayControlRuleService.delete('rule-467-egfr', 'Assay retired');
    const res = await mockMolecularAssayControlRuleService.getByAssayCode('st-egfr-pcr');
    expect(res.ok && res.data).toBeNull();
  });

  it('delete correctly removes a real rule', async () => {
    const { mockMolecularAssayControlRuleService } = await import('./mockMolecularAssayControlRuleService');
    await mockMolecularAssayControlRuleService.delete('rule-001', 'Assay retired');
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
      const created = await mockMolecularAssayControlRuleService.create({ assayCode: 'CT_NG_PCR', requiredControls: [] }, 'r');
      const updated = await mockMolecularAssayControlRuleService.update('rule-001', { requiredControls: [] }, 'r');
      const deleted = await mockMolecularAssayControlRuleService.delete('rule-001', 'r');
      for (const r of [created, updated, deleted]) expect(r).toMatchObject({ ok: false, error: MOLECULAR_CONTROL_RULE_NOT_PERMITTED });
      expect(enforce).toHaveBeenCalledWith('config:molecular-control-rules:manage');
    } finally {
      enforce.mockImplementation(async () => ({ allowed: true }));
    }
    const res = await mockMolecularAssayControlRuleService.getByAssayCode('st-hpv-highrisk-screen');
    expect(res.ok && res.data?.requiredControls).toHaveLength(2);
  });
});

describe('Batch 669 (mol-14): reason, no empty rule, duplicate assay on Edit', () => {
  const ntc = [{ sampleType: 'CONTROL_NTC' as const, positionMode: 'random' as const }];
  beforeEach(() => { logEvent.mockClear(); });

  it('a change needs a reason: none is refused and nothing changes', async () => {
    const { mockMolecularAssayControlRuleService: svc } = await import('./mockMolecularAssayControlRuleService');
    expect(await svc.create({ assayCode: 'CT_NG_PCR', requiredControls: ntc }, '  ')).toEqual({ ok: false, error: 'reasonRequired' });
    expect(await svc.update('rule-001', { requiredControls: ntc }, '')).toEqual({ ok: false, error: 'reasonRequired' });
    expect(await svc.delete('rule-001', ' ')).toEqual({ ok: false, error: 'reasonRequired' });
    const all = await svc.getAll();
    expect(all.ok && all.data).toHaveLength(3);
    expect(logEvent).not.toHaveBeenCalled();
  });

  it('a rule with no controls is refused on create and on update', async () => {
    const { mockMolecularAssayControlRuleService: svc } = await import('./mockMolecularAssayControlRuleService');
    expect(await svc.create({ assayCode: 'CT_NG_PCR', requiredControls: [] }, 'r')).toEqual({ ok: false, error: 'controlsRequired' });
    expect(await svc.update('rule-001', { requiredControls: [] }, 'r')).toEqual({ ok: false, error: 'controlsRequired' });
    const rule = await svc.getByAssayCode('st-hpv-highrisk-screen');
    expect(rule.ok && rule.data?.requiredControls).toHaveLength(2);
  });

  it('Edit refuses moving a rule onto an assay that already has one (Create always did), and allows keeping its own assay', async () => {
    const { mockMolecularAssayControlRuleService: svc } = await import('./mockMolecularAssayControlRuleService');
    expect(await svc.update('rule-001', { assayCode: 'st-egfr-pcr' }, 'r')).toEqual({ ok: false, error: 'duplicateAssay' });
    const same = await svc.update('rule-001', { assayCode: 'st-hpv-highrisk-screen', requiredControls: ntc }, 'r');
    expect(same.ok).toBe(true);
  });

  it('create, update and delete each leave an audit entry with the reason', async () => {
    const { mockMolecularAssayControlRuleService: svc } = await import('./mockMolecularAssayControlRuleService');
    await svc.create({ assayCode: 'CT_NG_PCR', requiredControls: ntc }, 'New assay on the menu');
    await svc.update('rule-001', { requiredControls: ntc }, 'Vendor changed the kit');
    await svc.delete('rule-467-egfr', 'Assay retired');
    const entries = logEvent.mock.calls.map(c => c[0] as { event: string; detail: string });
    expect(entries.map(e => e.event)).toEqual(['Molecular Control Rule Created', 'Molecular Control Rule Updated', 'Molecular Control Rule Deleted']);
    expect(entries[0].detail).toContain('Reason: New assay on the menu');
    expect(entries[1].detail).toContain('Reason: Vendor changed the kit');
    expect(entries[2].detail).toContain('st-egfr-pcr');
    expect(entries[2].detail).toContain('Reason: Assay retired');
  });

  it('a refused change (no permission) leaves no audit entry', async () => {
    const { mockMolecularAssayControlRuleService: svc } = await import('./mockMolecularAssayControlRuleService');
    enforce.mockImplementationOnce(async () => ({ allowed: false }));
    expect(await svc.delete('rule-001', 'r')).toEqual({ ok: false, error: 'notPermitted' });
    expect(logEvent).not.toHaveBeenCalled();
  });
});

describe('listForReview: reading the rules on the Control Rules page needs the view capability (Batch 669, ctl)', () => {
  it('lists the rules for someone holding view, checking the view capability', async () => {
    const { mockMolecularAssayControlRuleService } = await import('./mockMolecularAssayControlRuleService');
    enforce.mockClear();
    const res = await mockMolecularAssayControlRuleService.listForReview();
    expect(res.ok).toBe(true);
    expect(enforce).toHaveBeenCalledWith('config:molecular-control-rules:view');
  });
  it('refuses someone with neither view nor manage', async () => {
    const { mockMolecularAssayControlRuleService } = await import('./mockMolecularAssayControlRuleService');
    enforce.mockImplementationOnce(async () => ({ allowed: false }));
    const res = await mockMolecularAssayControlRuleService.listForReview();
    expect(res).toEqual({ ok: false, error: 'notPermitted' });
  });
  it('lets someone holding only manage read (a role saved without view)', async () => {
    const { mockMolecularAssayControlRuleService } = await import('./mockMolecularAssayControlRuleService');
    enforce.mockImplementationOnce(async () => ({ allowed: false }));
    evaluate.mockImplementationOnce(async (k: string) => ({ allowed: k === 'config:molecular-control-rules:manage' }));
    expect((await mockMolecularAssayControlRuleService.listForReview()).ok).toBe(true);
  });
  it('getAll stays open: the plate builder, rack screen and order engine apply the rules to everyone who works a plate', async () => {
    const { mockMolecularAssayControlRuleService } = await import('./mockMolecularAssayControlRuleService');
    enforce.mockImplementation(async () => ({ allowed: false }));
    try { expect((await mockMolecularAssayControlRuleService.getAll()).ok).toBe(true); } finally { enforce.mockImplementation(async () => ({ allowed: true })); }
  });
});
