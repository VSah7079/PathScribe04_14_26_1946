// @vitest-environment happy-dom
// Batch 455 (Pete: "enough baseline demo data that the entire application can
// be exercised ... Some workflow require a second staff person with the
// appropriate RBPs"): the demo baseline holds together.
import { beforeEach, describe, expect, it } from 'vitest';
import { DEMO_ACCOUNTS } from '../auth/demo/demoAccounts';
import { mockUserService } from '../users/mockUserService';
import { subspecialtyServiceUnchecked, DEMO_POOL_MEMBERS } from '../subspecialties/mockSubspecialtyService';
import { DEMO_BASELINE_CASES, DEMO_BASELINE_CASE_IDS } from '../cases/demoBaselineCases';
import { FOLLOW_UP_DEMO_EXPECTATIONS, FOLLOW_UP_DEMO_FACILITY_OVERRIDES } from '../followUp/followUpDemoSeed';
import { resolveFollowUpItems, toFollowUpCaseInfo } from '../followUp/followUpTracking';
import { restoreSeedRecords } from './demoReset';
import { BILLING_RULE_SEED_VERSIONS } from '../billing/mockBillingRuleService';
import { MODIFIER_DICTIONARY_SEED_VERSIONS } from '../billing/mockModifierDictionaryService';
import { loadDelegations } from '../delegations/delegationStore';
import { CAPABILITY_SEEDS } from '../authorization/capabilitySeeds';
import { mockCaseService } from '../cases/mockCaseService';

beforeEach(() => localStorage.clear());

describe('demo sign-ins: a person for every built-in role', () => {
  it('every demo account has a staff record, and every built-in role someone can demo has a sign-in', async () => {
    const staff = await mockUserService.getAll();
    const byId = new Map((staff.ok ? staff.data : []).map(u => [u.id, u]));
    const accountIds = new Set(DEMO_ACCOUNTS.map(a => a.id));
    // System Admin (u3) is platform support with no staff record.
    for (const a of DEMO_ACCOUNTS.filter(a => a.id !== 'u3')) expect(byId.has(a.id), a.email).toBe(true);
    const rolesWithSignIn = new Set([...accountIds].flatMap(id => byId.get(id)?.roles ?? []));
    for (const role of ['Pathologist', 'Resident', 'Fellow', 'Admin', 'Lab Director', 'Accessioner', 'Histotechnologist',
      'Cytotechnologist', 'Molecular Technologist', "Pathologists' Assistant (PA)", 'Template Author', 'Template Approver', 'QA Reviewer']) {
      expect(rolesWithSignIn.has(role), role).toBe(true);
    }
    // Two cytotechnologists, so each can QC-rescreen the other's primary screens.
    expect([...accountIds].filter(id => byId.get(id)?.roles?.includes('Cytotechnologist'))).toEqual(expect.arrayContaining(['CT-001', 'CT-002']));
  });

  it('the people who open orchestrator-mode Paps can (Priya Desai, Nadia Rahman, Sarah Johnson, Michelle, Rossana)', async () => {
    const staff = await mockUserService.getAll();
    const byId = new Map((staff.ok ? staff.data : []).map(u => [u.id, u as any]));
    for (const id of ['CT-001', 'CT-002', 'PATH-SJ-001', 'PATH-MN-001', 'PATH-RB-001']) expect(byId.get(id)?.canViewOrchestration, id).toBe(true);
  });

  it('the template author, approver and QA reviewer roles carry the capabilities those workflows need', () => {
    expect(CAPABILITY_SEEDS['template-author']).toContain('config:protocol:draft');
    expect(CAPABILITY_SEEDS['template-approver']).toContain('config:protocol:approve');
    expect(CAPABILITY_SEEDS['qa-reviewer']).toContain('screen:quality-assurance:open');
  });
});

describe('subspecialty pools accept the demo pathologists', () => {
  it('every surgical pool lists them, so pool cases can be claimed', async () => {
    const res = await subspecialtyServiceUnchecked.getAll();
    const pools = (res.ok ? res.data : []).filter(s => ['gi', 'breast', 'derm', 'neuro', 'heme', 'gyn', 'uro', 'oncology-pool'].includes(s.id));
    expect(pools).toHaveLength(8);
    for (const p of pools) expect(p.userIds, p.id).toEqual(expect.arrayContaining([...DEMO_POOL_MEMBERS]));
  });
});

describe('baseline cases', () => {
  const cases = DEMO_BASELINE_CASES as any[];
  it('have unique ids and cover the statuses nobody could see', () => {
    expect(new Set(DEMO_BASELINE_CASE_IDS).size).toBe(DEMO_BASELINE_CASE_IDS.length);
    const statuses = new Set(cases.map(c => c.status));
    for (const s of ['finalizing', 'pending-release', 'closed', 'finalized', 'in-progress', 'draft']) expect(statuses.has(s), s).toBe(true);
    expect(cases.some(c => (c.caseHolds ?? []).some((h: any) => h.active))).toBe(true);
  });
  it('give Sarah Johnson work, and a resident draft ready to release', () => {
    expect(cases.filter(c => c.order.assignedTo === 'PATH-SJ-001').length).toBeGreaterThanOrEqual(3);
    const resident = cases.find(c => c.id === 'S26-4610');
    expect(resident.requiresCountersign).toBe(true);
    expect(resident.participants.map((p: any) => [p.staffId, p.participationTypeIds[0]])).toEqual([['PATH-001', 'attending'], ['2', 'resident']]);
  });
  it('once the resident releases S26-4610, it reaches the attending\'s worklist (Countersign tile)', async () => {
    expect((await mockCaseService.listCasesForUser('PATH-001')).some(c => c.id === 'S26-4610')).toBe(false);
    await mockCaseService.updateCase('S26-4610', { status: 'pending-countersign' } as any);
    expect((await mockCaseService.listCasesForUser('PATH-001')).some(c => c.id === 'S26-4610')).toBe(true);
    expect((await mockCaseService.listCasesForUser('PATH-SJ-001')).some(c => c.id === 'S26-4610')).toBe(false);
  });
  it('pending second opinions run both ways between two people who can sign in', () => {
    const pending = loadDelegations().filter(d => d.status === 'pending');
    expect(pending.some(d => d.fromUserId === 'PATH-SJ-001' && d.toUserId === 'PATH-001')).toBe(true);
    expect(pending.some(d => d.fromUserId === 'PATH-001' && d.toUserId === 'PATH-SJ-001')).toBe(true);
  });
  it('Paps waiting for QC were screened by one cytotech for the other', () => {
    const qc = cases.filter(c => c.specimens[0].cytologyScreening?.qcFlag);
    expect(qc.map(c => c.order.assignedTo).sort()).toEqual(['CT-001', 'CT-001', 'CT-002']);
  });
});

describe('follow-up demo', () => {
  it('shows received, overdue and due-soon follow-ups of both kinds', () => {
    const info = (DEMO_BASELINE_CASES as any[]).map(c => toFollowUpCaseInfo(c, (s: any) => s.specimenDictionaryEntryId !== 'sp-cyto-pap'));
    const items = resolveFollowUpItems({ cases: info, expectations: FOLLOW_UP_DEMO_EXPECTATIONS, records: [], now: new Date(), warningDaysFor: () => 30 });
    const status = Object.fromEntries(items.map(i => [i.caseId, i.status]));
    expect(status).toEqual({
      'S26-4630': 'received', 'S26-4632': 'overdue', 'S26-4633': 'dueSoon',
      'S26-4640-CYT-001': 'overdue', 'S26-4641-CYT-001': 'received',
    });
    expect(FOLLOW_UP_DEMO_FACILITY_OVERRIDES).toEqual([expect.objectContaining({ facilityId: 'c1', overrides: { clinicianEmailEnabled: true } })]);
  });
});

describe('Full Reset puts the seeded billing approvals back', () => {
  it('seeded records return to their seeded state; versions someone created stay', () => {
    const pending = BILLING_RULE_SEED_VERSIONS.find(v => v.status === 'PENDING_APPROVAL')!;
    const approved = { ...pending, status: 'ACTIVE' as const };
    const own = { ...pending, version: 99, createdBy: 'PATH-001' };
    const keyOf = (r: typeof pending) => `${r.billingCode}@${r.version}`;
    const restored = restoreSeedRecords([approved, own], BILLING_RULE_SEED_VERSIONS, keyOf);
    expect(restored.find(r => keyOf(r) === keyOf(pending))?.status).toBe('PENDING_APPROVAL');
    expect(restored).toContainEqual(own);
    expect(restored).toHaveLength(BILLING_RULE_SEED_VERSIONS.length + 1);
    const mod = MODIFIER_DICTIONARY_SEED_VERSIONS.find(v => v.approvalStatus === 'PENDING_APPROVAL')!;
    expect(restoreSeedRecords([{ ...mod, approvalStatus: 'APPROVED' } as any], MODIFIER_DICTIONARY_SEED_VERSIONS, r => r.id).find(r => r.id === mod.id)?.approvalStatus).toBe('PENDING_APPROVAL');
  });
});

describe('Batch 456: seeded records name the person their id belongs to', () => {
  const nameOf = (u: any) => [u.firstName, u.lastName].filter(Boolean).join(' ');
  const sameName = (recorded: string, u: any) => recorded.replace(/^Dr\.\s+/, '').startsWith(nameOf(u));

  it('every seeded cytology review by a staff id carries that person\'s name', async () => {
    const { mockCytologyReviewRecordService } = await import('../cytology/mockCytologyReviewRecordService');
    const staff = await mockUserService.getAll();
    const byId = new Map((staff.ok ? staff.data : []).map(u => [u.id, u]));
    const reviews = await mockCytologyReviewRecordService.getAll();
    for (const r of (reviews as any).ok ? (reviews as any).data : reviews as any) {
      const u = byId.get(r.recordedBy.userId);
      if (u) expect(sameName(r.recordedBy.userName, u), `${r.id}: ${r.recordedBy.userName} vs ${nameOf(u)}`).toBe(true);
    }
  });

  it('FPPE seeds: Pete is nobody\'s supervisee, and each name matches its id', async () => {
    const { mockQaSupervisionAssignmentService, FPPE_ACTIVITY_TYPE_ID } = await import('../quality/mockQaSupervisionAssignmentService');
    const res = await mockQaSupervisionAssignmentService.getAll();
    const fppe = (res.ok ? res.data : []).filter(a => a.activityTypeId === FPPE_ACTIVITY_TYPE_ID);
    expect(fppe.some(a => a.superviseeUserId === 'PATH-001')).toBe(false);
    const staff = await mockUserService.getAll();
    const byId = new Map((staff.ok ? staff.data : []).map(u => [u.id, u]));
    for (const a of fppe) {
      const names = [a.superviseeUserId, a.supervisorUserId].map(id => byId.get(id)).filter(Boolean);
      expect(names, a.id).toHaveLength(2);
      expect(sameName(a.superviseeUserName, byId.get(a.superviseeUserId)), a.id).toBe(true);
      expect(sameName(a.supervisorUserName, byId.get(a.supervisorUserId)), a.id).toBe(true);
    }
  });
});
