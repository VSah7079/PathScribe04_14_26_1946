// Batch 613: access to a patient's other cases — rules and service, with in-memory fakes.
import { describe, it, expect, vi } from 'vitest';
import type { AccessRequest } from '@/types/access/AccessRequest';
import { createPatientCaseAccess, type PatientCaseAccessDeps } from './patientCaseAccessService';
import {
  validateRequestInput, partitionPatientCases, canDecideRequest, activeGrantsFor, latestDenialFor,
  requestedAuditEntry, decidedAuditEntry, type AccessUser, type PatientCaseLite,
} from './patientCaseAccessRules';

const cases: PatientCaseLite[] = [
  { id: 'C1', patient: { id: 'P1' }, order: { assignedTo: 'me' } },
  { id: 'C2', patient: { id: 'P1' }, order: { assignedTo: 'dr-b' } },
  { id: 'C3', patient: { id: 'P1' }, order: { assignedTo: 'dr-c' } },
  { id: 'C9', patient: { id: 'P2' }, order: { assignedTo: 'dr-c' } },
];
const me: AccessUser = { id: 'me', name: 'Me Path', role: 'pathologist' };
const drB: AccessUser = { id: 'dr-b', name: 'Dr B', role: 'pathologist' };
const admin: AccessUser = { id: 'adm', name: 'Admin', role: 'admin' };

function build(opts: { accessible?: string[]; allowed?: boolean } = {}) {
  const store: AccessRequest[] = [];
  let n = 0;
  const messages: Array<{ recipientId: string; subject: string; body: string }> = [];
  const audit: Array<{ event: string; detail: string }> = [];
  const ok = (r: AccessRequest) => ({ ok: true as const, data: r });
  const deps = {
    accessRequests: {
      getAll: async () => ({ ok: true as const, data: [...store] }),
      create: async (i: Partial<AccessRequest>) => { const r = { ...i, id: `R${++n}`, status: 'pending', requestedAt: new Date(2026, 9, 18, 8, n).toISOString() } as AccessRequest; store.push(r); return ok(r); },
      grant: async (id: string, by: string, name: string) => { const r = store.find(x => x.id === id)!; Object.assign(r, { status: 'granted', resolvedByUserId: by, resolvedByUserName: name, resolvedAt: 'now' }); return ok(r); },
      deny: async (id: string, by: string, name: string, reason: string) => { const r = store.find(x => x.id === id)!; Object.assign(r, { status: 'denied', resolvedByUserId: by, resolvedByUserName: name, denialReason: reason }); return ok(r); },
      revoke: async (id: string, by: string, name: string, reason: string) => { const r = store.find(x => x.id === id)!; Object.assign(r, { revokedAt: 'now', revokedByUserId: by, revokedByUserName: name, revokeReason: reason }); return ok(r); },
    },
    linkedPatientIds: async (p: string) => [p],
    cases: { loadAll: async () => cases, loadAccessibleIds: async () => new Set(opts.accessible ?? ['C1']) },
    users: { getAll: async () => [
      { id: 'dr-b', firstName: 'Dr', lastName: 'B', roles: ['Pathologist'] },
      { id: 'adm', firstName: 'Ad', lastName: 'Min', roles: ['Admin'] },
      { id: 'me', firstName: 'Me', lastName: 'Path', roles: ['Pathologist'] },
    ] },
    messages: { send: vi.fn(async (m: { recipientId: string; subject: string; body: string }) => { messages.push(m); }) },
    audit: { logEvent: vi.fn(async (e: { event: string; detail: string }) => { audit.push(e); return { ok: true }; }) },
    authorization: { enforce: async () => ({ allowed: opts.allowed ?? true }) },
  };
  return { svc: createPatientCaseAccess(deps as unknown as PatientCaseAccessDeps), store, messages, audit };
}

describe('rules', () => {
  it('needs a listed reason, and a note for "other"', () => {
    expect(validateRequestInput(undefined, '')).toBe('REASON_REQUIRED');
    expect(validateRequestInput('bogus', 'x')).toBe('REASON_REQUIRED');
    expect(validateRequestInput('other', '  ')).toBe('NOTE_REQUIRED');
    expect(validateRequestInput('other', 'why')).toBeNull();
    expect(validateRequestInput('tumorBoard', undefined)).toBeNull();
  });
  it('an active grant opens every restricted case', () => {
    const p = partitionPatientCases(cases.slice(0, 3), new Set(['C1']), true);
    expect(p.restricted).toHaveLength(0);
    expect(p.viaGrant.map(c => c.id)).toEqual(['C2', 'C3']);
    expect(partitionPatientCases(cases.slice(0, 3), new Set(['C1']), false).restricted.map(c => c.id)).toEqual(['C2', 'C3']);
  });
  it('who decides: admin or assigned pathologist, never self, never support', () => {
    const byId = new Map(cases.map(c => [c.id, c] as const));
    const req = { type: 'patient_cases', requestingUserId: 'me', caseIds: ['C2'] } as AccessRequest;
    expect(canDecideRequest(drB, req, byId)).toBe(true);
    expect(canDecideRequest(admin, req, byId)).toBe(true);
    expect(canDecideRequest({ id: 'dr-c', role: 'pathologist' }, req, byId)).toBe(false);
    expect(canDecideRequest({ ...me, role: 'admin' }, req, byId)).toBe(false);
    expect(canDecideRequest({ id: 'sup', role: 'superadmin' }, req, byId)).toBe(false);
  });
  it('grants stay active until revoked; latest denial shown only if newest', () => {
    const g = { type: 'patient_cases', status: 'granted', patientId: 'P1', requestingUserId: 'me' } as AccessRequest;
    expect(activeGrantsFor([g], ['P1'], 'me')).toHaveLength(1);
    expect(activeGrantsFor([{ ...g, revokedAt: 'x' }], ['P1'], 'me')).toHaveLength(0);
    const d = { ...g, status: 'denied', requestedAt: '2026-01-01' } as AccessRequest;
    expect(latestDenialFor([d], ['P1'], 'me')).toBe(d);
    expect(latestDenialFor([d, { ...g, status: 'pending', requestedAt: '2026-02-01' } as AccessRequest], ['P1'], 'me')).toBeUndefined();
  });
  it('audit entries carry no free text or patient identifiers', () => {
    const r = { id: 'R1', caseIds: ['C2'], reasonCode: 'other', reasonNote: 'SECRET CLINICAL NOTE', requestingUserName: 'Me' } as AccessRequest;
    expect(requestedAuditEntry('Me', r, 'C1').detail).not.toContain('SECRET');
    expect(decidedAuditEntry('granted', 'Dr B', r).detail).toContain('Granted');
  });
});

describe('service', () => {
  it('counts what is out of reach without naming it', async () => {
    const { svc } = build();
    expect(await svc.getRestrictedCaseCount('P1', me, 'C1')).toBe(2);
    expect(await svc.getRestrictedCaseCount('P2', me)).toBe(1);
  });
  it('request → notify assigned pathologists and admin → approve → history opens → revoke closes it', async () => {
    const { svc, messages, audit, store } = build();
    const req = await svc.requestAccess({ patientId: 'P1', caseId: 'C1', reasonCode: 'signOutCorrelation' }, me);
    expect(req.ok).toBe(true);
    expect(messages.map(m => m.recipientId).sort()).toEqual(['adm', 'dr-b']);
    expect((await svc.requestAccess({ patientId: 'P1', caseId: 'C1', reasonCode: 'followUp' }, me))).toEqual({ ok: false, code: 'ALREADY_REQUESTED' });
    expect((await svc.getState('P1', 'C1', me)).pending?.id).toBe('R1');
    expect((await svc.getState('P1', 'C1', drB)).toDecide).toHaveLength(1);

    expect(await svc.grantAccess('R1', me)).toEqual({ ok: false, code: 'NOT_PERMITTED' });
    expect((await svc.grantAccess('R1', drB)).ok).toBe(true);
    expect(messages[messages.length - 1]?.recipientId).toBe('me');
    const split = await svc.splitPatientHistory('P1', me, 'C1');
    expect([...split.visibleIds].sort()).toEqual(['C2', 'C3']);
    expect(split.restrictedCount).toBe(0);
    expect(split.viaGrantCount).toBe(2);
    await svc.recordGrantedView('P1', me, 'C1');
    expect(audit.map(a => a.event)).toContain('PATIENT_CASES_ACCESS_VIEWED');
    expect((await svc.listRevocableGrants(admin))).toHaveLength(1);

    expect(await svc.revokeAccess('R1', admin, ' ')).toEqual({ ok: false, code: 'REASON_REQUIRED' });
    expect((await svc.revokeAccess('R1', admin, 'Case closed')).ok).toBe(true);
    expect(store[0].revokeReason).toBe('Case closed');
    expect(await svc.getRestrictedCaseCount('P1', me, 'C1')).toBe(2);
    expect(messages[messages.length - 1]?.body).toContain('Case closed');
  });
  it('decline needs a reason and the requester sees the refusal', async () => {
    const { svc } = build();
    await svc.requestAccess({ patientId: 'P1', caseId: 'C1', reasonCode: 'tumorBoard' }, me);
    expect(await svc.denyAccess('R1', admin, '')).toEqual({ ok: false, code: 'REASON_REQUIRED' });
    expect((await svc.denyAccess('R1', admin, 'Not involved')).ok).toBe(true);
    expect((await svc.getState('P1', 'C1', me)).denied?.denialReason).toBe('Not involved');
  });
  it('refuses without the capability and when nothing is restricted', async () => {
    expect(await build({ allowed: false }).svc.requestAccess({ patientId: 'P1', caseId: 'C1', reasonCode: 'followUp' }, me)).toEqual({ ok: false, code: 'NOT_PERMITTED' });
    expect(await build({ accessible: ['C1', 'C2', 'C3'] }).svc.requestAccess({ patientId: 'P1', caseId: 'C1', reasonCode: 'followUp' }, me)).toEqual({ ok: false, code: 'NOTHING_TO_REQUEST' });
  });
});
