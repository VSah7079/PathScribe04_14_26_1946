import { beforeEach, describe, expect, it } from 'vitest';
import { createBiFeedService, type BiFeedDeps } from './biFeedService';
import { hashBiToken } from './biFeedRules';
import type { NewAuditLog } from '../auditlog/IAuditService';

let store: Record<string, unknown>;
let audits: NewAuditLog[];
let clock: string;
let counter: number;
const deps = (): BiFeedDeps => ({
  load: (k, fb) => (k in store ? (store[k] as never) : fb),
  save: (k, v) => { store[k] = JSON.parse(JSON.stringify(v)); },
  audit: async e => { audits.push(e); },
  actor: () => ({ name: 'Admin' }),
  now: () => clock,
  random: n => Uint8Array.from({ length: n }, (_, i) => (i * 7 + counter) % 256),
  hash: hashBiToken,
});
const svc = () => createBiFeedService(deps());
const draft = { name: 'Quality dashboard', datasetIds: ['cases' as const], facilityIds: [], identified: false };
async function ready() {
  const s = svc();
  await s.saveSettings({ enabled: true, datasetIds: ['cases', 'workload'], facilityIds: ['f1'] });
  return s;
}
const must = <T,>(r: { ok: boolean; data?: T }): T => { if (!r.ok) throw new Error('expected ok'); return r.data as T; };

beforeEach(() => { store = {}; audits = []; clock = '2026-06-01T00:00:00.000Z'; counter = 1; });

describe('settings', () => {
  it('starts off and saves choices with an audit', async () => {
    const s = svc();
    expect(must(await s.getSettings()).enabled).toBe(false);
    expect(await s.saveSettings({ enabled: true, datasetIds: [], facilityIds: [] })).toEqual({ ok: false, error: 'DATASETS_REQUIRED' });
    await ready();
    expect(audits.map(a => a.event)).toEqual(['BI Feed Settings Changed']);
  });
  it('records and withdraws an approval, keeping the settings', async () => {
    const s = await ready();
    expect(await s.withdrawIdentified()).toEqual({ ok: false, error: 'NO_APPROVAL_ON_RECORD' });
    expect(await s.approveIdentified({ approverName: '', reason: 'x' })).toEqual({ ok: false, error: 'APPROVER_REQUIRED' });
    const a = must(await s.approveIdentified({ approverName: ' Dr  Lee ', reason: 'Quality review' }));
    expect(a.identifiedApproval?.approverName).toBe('Dr Lee');
    const w = must(await s.withdrawIdentified());
    expect(w.identifiedApproval).toBeUndefined();
    expect(w.datasetIds).toEqual(['cases', 'workload']);
  });
});

describe('tokens', () => {
  it('returns the token once and keeps only its hash', async () => {
    const s = await ready();
    const r = must(await s.createToken(draft));
    expect(r.token).toMatch(/^psbi_[0-9a-f]{48}$/);
    const raw = JSON.stringify(store);
    expect(raw).not.toContain(r.token);
    expect(raw).toContain(await hashBiToken(r.token));
    expect(JSON.stringify(r.summary)).not.toContain('tokenHash');
    expect(audits[audits.length - 1]?.detail).not.toContain(r.token);
  });
  it('refuses a token while the feed is off, a duplicate name, and unapproved identified', async () => {
    const off = svc();
    expect(await off.createToken(draft)).toEqual({ ok: false, error: 'FEED_OFF' });
    const s = await ready();
    await s.createToken(draft);
    expect(await s.createToken(draft)).toEqual({ ok: false, error: 'NAME_TAKEN' });
    expect(await s.createToken({ ...draft, name: 'Other', identified: true })).toEqual({ ok: false, error: 'IDENTIFIED_NOT_APPROVED' });
  });
  it('rotates with a grace period for the old token', async () => {
    const s = await ready();
    const first = must(await s.createToken(draft));
    counter = 5;
    clock = '2026-06-02T00:00:00.000Z';
    const second = must(await s.rotateToken(first.summary.id));
    expect(second.token).not.toBe(first.token);
    expect(must(await s.pull(first.token, 'cases')).result).toBe('ok');
    clock = '2026-06-04T00:00:00.000Z';
    expect(must(await s.pull(first.token, 'cases')).result).toBe('unknown');
    expect(must(await s.pull(second.token, 'cases')).result).toBe('ok');
  });
  it('revokes with a reason and then refuses the token', async () => {
    const s = await ready();
    const t = must(await s.createToken(draft));
    expect(await s.revokeToken(t.summary.id, { code: 'other' })).toEqual({ ok: false, error: 'REVOKE_REASON_INVALID' });
    must(await s.revokeToken(t.summary.id, { code: 'retired' }));
    expect(await s.revokeToken(t.summary.id, { code: 'retired' })).toEqual({ ok: false, error: 'ALREADY_REVOKED' });
    expect(must(await s.pull(t.token, 'cases')).result).toBe('revoked');
    expect(await s.rotateToken(t.summary.id)).toEqual({ ok: false, error: 'ALREADY_REVOKED' });
    expect(await s.rotateToken('nope')).toEqual({ ok: false, error: 'NOT_FOUND' });
  });
});

describe('pull', () => {
  it('is Simulated, returns counts only, and records the pull', async () => {
    const s = await ready();
    const t = must(await s.createToken(draft));
    const a = must(await s.pull(t.token, 'cases'));
    expect(a).toMatchObject({ result: 'ok', simulated: true, datasetId: 'cases', identified: false });
    expect(a.rows).toBeGreaterThan(0);
    expect(JSON.stringify(a)).not.toContain('patient_name');
    const listed = must(await s.listTokens());
    expect(listed[0].lastPull?.datasetId).toBe('cases');
    expect(audits[audits.length - 1]?.event).toBe('BI Feed Pull');
  });
  it('sends fewer fields when de-identified than when identified', async () => {
    const s = await ready();
    await s.approveIdentified({ approverName: 'Dr Lee', reason: 'Quality review' });
    const de = must(await s.createToken(draft));
    counter = 9;
    const id = must(await s.createToken({ ...draft, name: 'Identified', identified: true }));
    const a = must(await s.pull(de.token, 'cases'));
    const b = must(await s.pull(id.token, 'cases'));
    expect(b.fieldCount as number).toBeGreaterThan(a.fieldCount as number);
    expect(b.identified).toBe(true);
  });
  it('drops identified detail when the approval is withdrawn', async () => {
    const s = await ready();
    await s.approveIdentified({ approverName: 'Dr Lee', reason: 'Quality review' });
    const id = must(await s.createToken({ ...draft, identified: true }));
    await s.withdrawIdentified();
    expect(must(await s.pull(id.token, 'cases')).result).toBe('identifiedNotApproved');
  });
  it('refuses and audits a bad token, other datasets and a switched-off feed', async () => {
    const s = await ready();
    const t = must(await s.createToken(draft));
    expect(must(await s.pull('nonsense', 'cases')).result).toBe('malformed');
    expect(must(await s.pull('psbi_' + '0'.repeat(48), 'cases')).result).toBe('unknown');
    expect(must(await s.pull(t.token, 'workload')).result).toBe('datasetNotAllowed');
    await s.saveSettings({ enabled: false, datasetIds: ['cases'], facilityIds: ['f1'] });
    expect(must(await s.pull(t.token, 'cases')).result).toBe('feedOff');
    expect(audits.some(a => a.event === 'BI Feed Pull Refused')).toBe(true);
  });
  it('rate limits after the per-minute allowance', async () => {
    const s = await ready();
    const t = must(await s.createToken(draft));
    let last = '';
    for (let i = 0; i < 61; i += 1) last = must(await s.pull(t.token, 'cases')).result;
    expect(last).toBe('rateLimited');
  });
  it('keeps audit details free of rows and tokens', async () => {
    const s = await ready();
    const t = must(await s.createToken(draft));
    await s.pull(t.token, 'cases');
    for (const a of audits) expect(a.detail).not.toContain(t.token);
  });
});
