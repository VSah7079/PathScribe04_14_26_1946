import { beforeEach, describe, expect, it } from 'vitest';
import { createWorkstationRegistryService, type WorkstationRegistryDeps } from './workstationRegistryService';
import { hashWorkstationToken, type WorkstationRecord } from './workstationRegistryRules';
import type { NewAuditLog } from '../auditlog/IAuditService';

let store: Record<string, unknown>;
let audits: NewAuditLog[];
let clock: string;
let counter: number;
const deps = (): WorkstationRegistryDeps => ({
  load: (k, fb) => (k in store ? (store[k] as never) : fb),
  save: (k, v) => { store[k] = JSON.parse(JSON.stringify(v)); },
  audit: async e => { audits.push(e); },
  actor: () => ({ name: 'Admin' }),
  now: () => clock,
  random: n => Uint8Array.from({ length: n }, (_, i) => (i * 7 + counter) % 256),
  hash: hashWorkstationToken,
});
const svc = () => createWorkstationRegistryService(deps());
const draft = { name: 'Grossing Station A', facilityId: 'f1', roomLabel: 'Gross 2', discipline: 'HISTOLOGY' as const, functionalArea: 'Grossing' };

beforeEach(() => { store = {}; audits = []; clock = '2026-06-01T00:00:00.000Z'; counter = 1; });

describe('register', () => {
  it('returns the token once and keeps only its hash', async () => {
    const s = svc();
    const r = await s.register(draft);
    if (r.ok !== true) throw new Error('expected ok');
    expect(r.data.token).toMatch(/^pswt_[0-9a-f]{48}$/);
    const raw = JSON.stringify(store);
    expect(raw).not.toContain(r.data.token);
    expect(raw).toContain(await hashWorkstationToken(r.data.token));
    expect(JSON.stringify(r.data.workstation)).not.toContain('tokenHash');
    const listed = await s.list();
    expect(listed.ok === true && JSON.stringify(listed.data)).not.toContain(await hashWorkstationToken(r.data.token));
  });
  it('refuses a duplicate name at the same facility and a bad draft', async () => {
    const s = svc();
    await s.register(draft);
    expect(await s.register(draft)).toEqual({ ok: false, error: 'NAME_TAKEN' });
    expect(await s.register({ ...draft, name: '' })).toEqual({ ok: false, error: 'NAME_REQUIRED' });
  });
  it('audits without the token', async () => {
    const r = await svc().register(draft);
    if (r.ok !== true) throw new Error('expected ok');
    expect(audits).toHaveLength(1);
    expect(audits[0].event).toBe('Workstation Registered');
    expect(audits[0].detail).not.toContain(r.data.token);
  });
});

describe('rotateToken', () => {
  it('issues a new token and keeps the old one for the grace period only', async () => {
    const s = svc();
    const first = await s.register(draft);
    if (first.ok !== true) throw new Error('expected ok');
    counter = 5;
    clock = '2026-06-02T00:00:00.000Z';
    const second = await s.rotateToken(first.data.workstation.id);
    if (second.ok !== true) throw new Error('expected ok');
    expect(second.data.token).not.toBe(first.data.token);
    expect(await s.checkIn(first.data.token)).toMatchObject({ ok: true, data: { result: 'ok' } });
    expect(await s.checkIn(second.data.token)).toMatchObject({ ok: true, data: { result: 'ok' } });
    clock = '2026-06-04T00:00:00.000Z';
    expect(await s.checkIn(first.data.token)).toMatchObject({ ok: true, data: { result: 'unknown' } });
    expect(await s.checkIn(second.data.token)).toMatchObject({ ok: true, data: { result: 'ok' } });
  });
});

describe('revoke', () => {
  it('stops both tokens at once, keeps the record and cannot be repeated', async () => {
    const s = svc();
    const r = await s.register(draft);
    if (r.ok !== true) throw new Error('expected ok');
    const id = r.data.workstation.id;
    expect(await s.revoke(id, { code: 'other' })).toEqual({ ok: false, error: 'REVOKE_REASON_INVALID' });
    const done = await s.revoke(id, { code: 'compromised' });
    expect(done.ok === true && done.data.status).toBe('revoked');
    expect(await s.checkIn(r.data.token)).toMatchObject({ ok: true, data: { result: 'revoked' } });
    expect(await s.revoke(id, { code: 'retired' })).toEqual({ ok: false, error: 'ALREADY_REVOKED' });
    expect(await s.rotateToken(id)).toEqual({ ok: false, error: 'ALREADY_REVOKED' });
    expect(await s.update(id, draft)).toEqual({ ok: false, error: 'ALREADY_REVOKED' });
    expect((await s.list()).ok).toBe(true);
  });
  it('lets a revoked name be used again', async () => {
    const s = svc();
    const r = await s.register(draft);
    if (r.ok !== true) throw new Error('expected ok');
    await s.revoke(r.data.workstation.id, { code: 'replaced' });
    expect((await s.register(draft)).ok).toBe(true);
  });
});

describe('checkIn (Simulated)', () => {
  it('records when the workstation was last seen, and says it is simulated', async () => {
    const s = svc();
    const r = await s.register(draft);
    if (r.ok !== true) throw new Error('expected ok');
    clock = '2026-06-10T08:00:00.000Z';
    const c = await s.checkIn(r.data.token);
    expect(c).toMatchObject({ ok: true, data: { result: 'ok', simulated: true } });
    const w = await s.get(r.data.workstation.id);
    expect(w.ok === true && w.data.lastSeenAt).toBe('2026-06-10T08:00:00.000Z');
  });
  it('refuses a malformed or unknown token and audits the unknown one', async () => {
    const s = svc();
    await s.register(draft);
    audits = [];
    expect(await s.checkIn('nonsense')).toMatchObject({ ok: true, data: { result: 'malformed' } });
    expect(audits).toHaveLength(0);
    expect(await s.checkIn('pswt_' + '0'.repeat(48))).toMatchObject({ ok: true, data: { result: 'unknown' } });
    expect(audits[0].event).toBe('Workstation Check-In Refused');
  });
  it('refuses an expired token', async () => {
    const s = svc();
    const r = await s.register(draft);
    if (r.ok !== true) throw new Error('expected ok');
    clock = '2027-07-01T00:00:00.000Z';
    expect(await s.checkIn(r.data.token)).toMatchObject({ ok: true, data: { result: 'expired' } });
  });
});

describe('print routing input', () => {
  it('comes from the registered workstation and is empty once it is revoked', async () => {
    const s = svc();
    const r = await s.register({ ...draft, pointOfCare: 'GROSS-1' });
    if (r.ok !== true) throw new Error('expected ok');
    const id = r.data.workstation.id;
    expect(await s.printRoutingInput(id)).toEqual({ workstationId: id, facilityId: 'f1', pointOfCare: 'GROSS-1' });
    await s.revoke(id, { code: 'retired' });
    expect(await s.printRoutingInput(id)).toEqual({});
    expect(await s.printRoutingInput(null)).toEqual({});
  });
});

describe('update', () => {
  it('changes the binding and leaves the token alone', async () => {
    const s = svc();
    const r = await s.register(draft);
    if (r.ok !== true) throw new Error('expected ok');
    const u = await s.update(r.data.workstation.id, { ...draft, roomLabel: 'Gross 3', reportPrinterId: 'p1' });
    expect(u.ok === true && u.data.roomLabel).toBe('Gross 3');
    expect(await s.checkIn(r.data.token)).toMatchObject({ ok: true, data: { result: 'ok' } });
  });
  it('reports a missing id', async () => {
    expect(await svc().update('nope', draft)).toEqual({ ok: false, error: 'NOT_FOUND' });
  });
});

describe('stored data shape', () => {
  it('holds hashes only', async () => {
    const s = svc();
    await s.register(draft);
    const list = store['workstationRegistry'] as WorkstationRecord[];
    expect(list[0].tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });
});
