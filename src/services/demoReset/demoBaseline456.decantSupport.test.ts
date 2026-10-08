// @vitest-environment happy-dom
// Batch 456 (demo baseline): decants and a matrix block on demo cases, a
// support access request waiting for Desert Valley, and an active outside
// consult link, each coming back after a Full Reset.
import { beforeEach, describe, expect, it } from 'vitest';
import { DEMO_BASELINE_CASES } from '../cases/demoBaselineCases';
import { mockCaseService } from '../cases/mockCaseService';
import { withMaterialDemo, DEMO_DECANT_CASE_IDS, DEMO_MATRIX_BLOCK_CASE_ID, DEMO_MATRIX_BLOCK_ID } from '../material/materialDemoSeed';
import { applyDecantChange, nextDecantLabel } from '../material/materialTree';
import { resolveCytologyDecantPendingMembership } from '../cytology/resolveCytologyDecantPendingMembership';
import { grossingBlocks } from '../grossing/grossingCompletion';
import { createSupportAccessService, SUPPORT_REQUESTS_KEY } from '../supportAccess/supportAccessService';
import { demoSupportAccessRequests, DEMO_PENDING_SUPPORT_REQUEST_ID } from '../supportAccess/demoSupportAccessSeed';
import { supportRequestQueues } from '../supportAccess/supportAccessRules';
import { supportAccessService } from '../supportAccess/defaultSupportAccessService';
import { resolveTenantFacility } from '../auth/resolveTenantFacility';
import { evaluateCapability } from '../authorization/evaluateCapability';
import { mockFacilityService } from '../facilities/mockFacilityService';
import { mockUserService } from '../users/mockUserService';
import { mockRoleService } from '../roles/mockRoleService';
import { DEMO_ACCOUNTS } from '../auth/demo/demoAccounts';
import { mockConsultTokenService } from '../consultAccess/mockConsultTokenService';
import { resolveConsultTokenStatus } from '../consultAccess/IConsultTokenService';
import { DEMO_CONSULT_CASE_ID, DEMO_CONSULT_TOKEN_ID } from '../consultAccess/consultDemoSeed';

/* eslint-disable @typescript-eslint/no-explicit-any */
beforeEach(() => localStorage.clear());

const seededCases = async () => {
  const legacy = await Promise.all([DEMO_MATRIX_BLOCK_CASE_ID, 'S26-5005-CYT-001'].map(id => mockCaseService.getCase(id)));
  return withMaterialDemo([...(legacy as any[]), ...(DEMO_BASELINE_CASES as any[])]) as any[];
};
const byId = (cases: any[], id: string) => cases.find(c => c.id === id);

describe('decants on demo cytology cases', () => {
  it('each named case gets realistic decants with identifiers and its creator', async () => {
    const cases = await seededCases();
    for (const id of DEMO_DECANT_CASE_IDS) {
      const decants = byId(cases, id).specimens[0].decants;
      expect(decants.length, id).toBeGreaterThan(0);
      for (const d of decants) {
        expect(d.displayId, id).toBe(`${byId(cases, id).accession.fullAccession}-A${d.label}`);
        expect(d.createdBy, id).toBeTruthy();
      }
    }
    expect(byId(cases, 'S26-4651-CYT-001').specimens[0].decants[0].stains[0]).toMatchObject({ stainName: 'p16/Ki-67 Dual Stain', status: 'Staining' });
    expect(byId(cases, 'S26-4652-CYT-001').specimens[0].decants[0]).toMatchObject({ appearance: 'Bloody', stains: [{ status: 'Coverslipped' }] });
  });

  it('the FNA has a cell block split from its needle rinse, in a green mesh cassette, with H&E to cut', async () => {
    const [rinse, cellBlock] = byId(await seededCases(), 'S26-5005-CYT-001').specimens[0].decants;
    expect(rinse.decantType).toBe('residual_fluid');
    expect(cellBlock).toMatchObject({ decantType: 'cell_block', parentDecantId: rinse.id, cassetteColorId: 'color-green-mesh' });
    expect(cellBlock.stains[0]).toMatchObject({ stainName: 'H&E', status: 'Pending Cut', displayId: 'S26-5005-CYT-001-AD2-L1' });
  });

  it('the Cell Block / Ancillary Pending tile picks up the cases with slides still in progress', async () => {
    const cases = await seededCases();
    const pending = DEMO_DECANT_CASE_IDS.filter(id => resolveCytologyDecantPendingMembership(byId(cases, id).specimens[0].decants));
    expect(pending).toEqual(['S26-4651-CYT-001', 'S26-5005-CYT-001']);
  });

  it('the seeded trees work with the decant changes the screens make', async () => {
    const sp = byId(await seededCases(), 'S26-5005-CYT-001').specimens;
    expect(applyDecantChange(sp, { kind: 'delete', decantId: sp[0].decants[0].id }, new Date().toISOString())).toEqual({ ok: false, refusal: 'hasChildren' });
    expect(nextDecantLabel(sp[0].decants)).toBe('D3');
  });

  it('leaves every other case untouched', async () => {
    const before = DEMO_BASELINE_CASES as any[];
    const after = withMaterialDemo(before as any) as any[];
    for (const c of after.filter(c => !(DEMO_DECANT_CASE_IDS as readonly string[]).includes(c.id))) expect(c).toBe(byId(before, c.id));
  });
});

describe('a matrix block on a demo surgical case', () => {
  it('S26-4404 holds the left-sided cores D, E and F in one embedded cassette, referenced from each specimen', async () => {
    const c = byId(await seededCases(), DEMO_MATRIX_BLOCK_CASE_ID);
    const [mb] = c.matrixBlocks;
    expect(mb).toMatchObject({ id: DEMO_MATRIX_BLOCK_ID, label: 'M1', status: 'Embedded', pieceCount: 6 });
    const labels = mb.participants.map((p: any) => c.specimens.find((s: any) => s.id === p.specimenId).label);
    expect(labels).toEqual(['D', 'E', 'F']);
    expect(mb.participants.map((p: any) => p.positionInBlock)).toEqual([1, 2, 3]);
    for (const s of c.specimens) expect((s.matrixBlockIds ?? []).includes(DEMO_MATRIX_BLOCK_ID)).toBe(['D', 'E', 'F'].includes(s.label));
    expect(mb.slides[0]).toMatchObject({ stainName: 'H&E', displayId: 'S26-4404-M1-L1' });
    expect(grossingBlocks(c).map(b => b.label)).toContain('M1');
  });
});

describe('a support access request waiting for Desert Valley', () => {
  it('is pending after a reset, from ForMedrixAI support in another organisation', async () => {
    const list = await supportAccessService.listRequests({ tenantId: 'c-ent-dvmc' });
    const r = list.find(x => x.id === DEMO_PENDING_SUPPORT_REQUEST_ID)!;
    expect(r).toMatchObject({ status: 'pending', agentId: 'PATH-US-001', agentName: 'Amber Fehrs-Battey', ticketId: 'FMX-20417' });
    expect(r.reason.length).toBeGreaterThanOrEqual(10);
    expect(supportRequestQueues(list, new Date()).pending.map(x => x.id)).toContain(r.id);
    // Amber signs in as Superadmin, and her staff organisation isn't Desert Valley.
    expect(DEMO_ACCOUNTS.find(a => a.id === 'PATH-US-001')?.role).toBe('superadmin');
    const facilities = ((await mockFacilityService.getAll()) as any).data.filter((f: any) => f.isEnterprise);
    const staff = ((await mockUserService.getAll()) as any).data;
    const amber = staff.find((u: any) => u.id === 'PATH-US-001');
    expect(resolveTenantFacility(amber.organisationId, facilities)?.id).not.toBe('c-ent-dvmc');
  });

  it('Michelle Nimmo (Admin) may approve it; Dr. Rachel Okafor (Lab Director) is a member but not granted approval by default', async () => {
    const facilities = ((await mockFacilityService.getAll()) as any).data.filter((f: any) => f.isEnterprise);
    const staff = ((await mockUserService.getAll()) as any).data;
    const roles = ((await mockRoleService.getAll()) as any).data;
    for (const [id, mayApprove] of [['PATH-MN-001', true], ['LD-001', false]] as const) {
      const u = staff.find((s: any) => s.id === id);
      expect(resolveTenantFacility(u.organisationId, facilities)?.id, id).toBe('c-ent-dvmc');
      expect(evaluateCapability({ userId: u.id, userName: u.email, sessionRole: null, staffRoles: u.roles }, 'config:support-access:approve', roles).allowed, id).toBe(mayApprove);
    }
  });

  it('can be approved by Michelle, and comes back pending after a Full Reset', async () => {
    const store = new Map<string, unknown>();
    const svc = createSupportAccessService({
      authorization: { enforce: async () => ({ allowed: true }) as any, evaluate: async () => ({ allowed: true }) as any },
      session: () => ({ id: 'PATH-MN-001', name: 'Michelle Nimmo', role: 'pathologist-admin', organisationId: 'ORG-DVMC' }),
      enterpriseFacilities: async () => ((await mockFacilityService.getAll()) as any).data.filter((f: any) => f.isEnterprise),
      staff: async () => [], roles: async () => [], notify: async () => {},
      store: { get: <T,>(k: string, f: T) => (store.has(k) ? (store.get(k) as T) : f), set: (k, v) => { store.set(k, v); } },
      sha256: async t => `h${t.length}`,
      seedRequests: () => demoSupportAccessRequests(),
    });
    const r = await svc.decide(DEMO_PENDING_SUPPORT_REQUEST_ID, 'approve');
    expect(r.ok && r.request.status).toBe('approved');
    expect(await svc.activeFor('c-ent-dvmc', 'PATH-US-001')).toMatchObject({ id: DEMO_PENDING_SUPPORT_REQUEST_ID });
    store.delete(SUPPORT_REQUESTS_KEY); // what a Full Reset does to this key
    expect((await svc.listRequests()).find(x => x.id === DEMO_PENDING_SUPPORT_REQUEST_ID)?.status).toBe('pending');
  });
});

describe('an active outside consult link', () => {
  it('is listed for S26-4602, active, issued by Dr. Sarah Johnson', async () => {
    expect(byId(DEMO_BASELINE_CASES as any[], DEMO_CONSULT_CASE_ID)).toBeTruthy();
    const res = await mockConsultTokenService.getByCaseId(DEMO_CONSULT_CASE_ID);
    const tok = res.ok ? res.data.find(t => t.id === DEMO_CONSULT_TOKEN_ID) : undefined;
    expect(tok).toMatchObject({ issuedByUserId: 'PATH-SJ-001', consultantOrganization: 'Sonoran Dermatopathology Associates', accessCount: 1 });
    expect(resolveConsultTokenStatus(tok!)).toBe('Active');
  });

  it('gets its bearer string at seed time (never from source), stored so it stays the same until a reset', async () => {
    const first = await mockConsultTokenService.getByCaseId(DEMO_CONSULT_CASE_ID);
    const again = await mockConsultTokenService.getByCaseId(DEMO_CONSULT_CASE_ID);
    const token = first.ok ? first.data[0].token : '';
    expect(token).toMatch(/^ct_/);
    expect(again.ok && again.data[0].token).toBe(token);
    localStorage.clear(); // a Full Reset
    const after = await mockConsultTokenService.getByCaseId(DEMO_CONSULT_CASE_ID);
    expect(after.ok && after.data[0].token).not.toBe(token);
  });

  it('can still be revoked like any issued link', async () => {
    const r = await mockConsultTokenService.revoke(DEMO_CONSULT_TOKEN_ID, 'PATH-SJ-001');
    expect(r.ok && resolveConsultTokenStatus(r.data)).toBe('Revoked');
  });
});
