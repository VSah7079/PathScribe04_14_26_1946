// Batch 620 part S (PS-800): the demo's batch file feed against an in-memory queue: profiles, who may do what, the run, the held-back
// records, the answer to a file and the existing acknowledgement path.
import { describe, it, expect, beforeEach, vi } from 'vitest';

const auth = vi.hoisted(() => ({ allowed: true, asked: [] as string[] }));
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: {
    enforce: async (cap: string) => { auth.asked.push(cap); return { allowed: auth.allowed }; },
    evaluate: async () => ({ allowed: auth.allowed }),
    grantedCapabilities: async () => new Set<string>(),
  },
}));
import { createMockBatchRegistryFeedService, type BatchFeedDeps } from './mockBatchRegistryFeedService';
import { emptyRecord, exampleProfile, type BatchRecord } from './batchRegistryFeed';
import type { IBatchRecordSource, BatchItem } from './batchRecordSource';
import type { DeliveryScheduleEntry } from '../deliverySchedules/deliverySchedule';
import { IMMEDIATE_SCHEDULE } from '../deliverySchedules/deliverySchedule';
import type { CytologyRegistryOutboundQueueEntry } from '@/types/case/CytologyRegistryOutboundQueueEntry';

const NOW = new Date('2026-10-19T12:00:00.000Z');
const rec = (over: Partial<BatchRecord> = {}): BatchRecord => ({
  ...emptyRecord(), patientIdentifier: 'P1', dateOfBirth: '1980-02-03', accessionNumber: 'A1', screeningDate: '2026-10-01', specimenAdequacy: 'S', primaryInterpretation: 'NILM', submissionKind: 'NEW', ...over,
});
const entry = (id: string, over: Partial<CytologyRegistryOutboundQueueEntry> = {}): CytologyRegistryOutboundQueueEntry => ({
  id, caseId: `c-${id}`, signOutRecordId: `s-${id}`, registryId: 'germany_okfe', status: 'QUEUED', queuedAt: '2026-10-18T10:00:00.000Z', retryCount: 0, maxRetriesExceeded: false,
  submission: { submissionGuid: `guid-${id}`, submissionVersion: 1, masterTransactionId: 'm', messageType: 'NEW', environment: 'test', isDuplicateRetry: false, specimenId: 'sp' }, ...over,
});

function setup(opts: { entries?: CytologyRegistryOutboundQueueEntry[]; records?: Record<string, BatchRecord>; schedule?: DeliveryScheduleEntry[] } = {}) {
  const rows = opts.entries ?? [entry('e1'), entry('e2')];
  const records = opts.records ?? { e1: rec(), e2: rec({ patientIdentifier: 'P2' }) };
  const marked: string[] = []; const failed: { id: string; code: string; msg: string }[] = []; const acks: { body: Record<string, unknown> }[] = []; const audits: string[] = [];
  const source: IBatchRecordSource = {
    async itemsFor(es) {
      const items: BatchItem[] = es.filter(e => records[e.id]).map(e => ({ ref: e.id, facilityId: null, signedOutAt: '2026-10-19T05:00:00.000Z', record: records[e.id] }));
      return { items, unreadable: es.filter(e => !records[e.id]).map(e => e.id) };
    },
  };
  const deps: BatchFeedDeps = {
    queue: {
      getAll: async () => ({ ok: true, data: rows.map(r => (marked.includes(r.id) ? { ...r, status: 'SENT' as const } : r)) }),
      markSent: async id => { marked.push(id); return { ok: true, data: rows[0] }; },
      markFailed: async (id, f) => { failed.push({ id, code: String(f.errorCode), msg: f.errorMessage }); return { ok: true, data: rows[0] }; },
    },
    source,
    schedules: async () => opts.schedule ?? [{ id: 's', feed: 'registry', facilityId: null, registryKey: 'screening:germany_okfe', schedule: { ...IMMEDIATE_SCHEDULE, kind: 'batch', batchFrequency: 'daily', batchTimes: ['06:00'], timeZone: 'UTC' }, updatedAt: '' }],
    recordAck: async input => { acks.push({ body: JSON.parse(input.body) }); return { outcome: 'applied' }; },
    enforce: async cap => { auth.asked.push(cap); return auth.allowed; },
    audit: (_e, d) => { audits.push(d); },
    now: () => NOW,
  };
  return { svc: createMockBatchRegistryFeedService(deps), marked, failed, acks, audits };
}

beforeEach(() => {
  const store: Record<string, string> = {};
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; }, removeItem: (k: string) => { delete store[k]; },
  };
  auth.allowed = true; auth.asked = [];
});

const turnOnExample = async (svc: ReturnType<typeof setup>['svc']) => {
  const p = exampleProfile('');
  const r = await svc.saveProfile({ ...p, enabled: true });
  expect(r.ok).toBe(true);
  return p.id;
};

describe('profiles', () => {
  it('start with the example and NAACCR XML, both off', async () => {
    const r = await setup().svc.getProfiles();
    expect(r.ok && r.data.map(p => [p.id, p.enabled])).toEqual([['batch-profile-example', false], ['batch-profile-naaccr-xml', false]]);
  });
  it('saving needs config:batch-registry-feed:manage, and a refused save changes nothing', async () => {
    const { svc } = setup();
    auth.allowed = false;
    const refused = await svc.saveProfile({ ...exampleProfile(''), enabled: true });
    expect(refused.ok).toBe(false);
    expect(auth.asked).toContain('config:batch-registry-feed:manage');
    auth.allowed = true;
    const all = await svc.getProfiles();
    expect(all.ok && all.data[0].enabled).toBe(false);
  });
  it('an invalid profile is refused with the first problem as a fixed code', async () => {
    const r = await setup().svc.saveProfile({ ...exampleProfile(''), name: '' });
    expect(r).toEqual({ ok: false, error: 'PROFILE_REFUSED:nameRequired' });
  });
  it('NAACCR XML cannot be turned on', async () => {
    const { svc } = setup();
    const list = await svc.getProfiles();
    const naaccr = list.ok ? list.data[1] : undefined;
    expect(naaccr).toBeDefined();
    const r = await svc.saveProfile({ ...naaccr!, enabled: true });
    expect(r).toEqual({ ok: false, error: 'PROFILE_REFUSED:formatNotAvailable' });
  });
  it('a new profile is added, an unknown id is not found, the shipped two cannot be removed', async () => {
    const { svc } = setup();
    const { id, isExample, updatedAt, ...base } = exampleProfile('');
    void id; void isExample; void updatedAt;
    const added = await svc.saveProfile({ ...base, name: 'Second' });
    expect(added.ok && added.data.isExample).toBe(false);
    expect(await svc.saveProfile({ ...base, id: 'nope', name: 'x' })).toEqual({ ok: false, error: 'NOT_FOUND' });
    expect(await svc.removeProfile('batch-profile-example')).toEqual({ ok: false, error: 'PROFILE_PROTECTED' });
    expect(await svc.removeProfile('batch-profile-naaccr-xml')).toEqual({ ok: false, error: 'PROFILE_PROTECTED' });
    expect((await svc.removeProfile(added.ok ? added.data.id : '')).ok).toBe(true);
    expect(await svc.removeProfile('gone')).toEqual({ ok: false, error: 'NOT_FOUND' });
  });
  it('a screening registry is a batch program only while an enabled profile is keyed to it', async () => {
    const { svc } = setup();
    expect(await svc.isBatchProgram('germany_okfe')).toEqual({ ok: true, data: false });
    await turnOnExample(svc);
    expect(await svc.isBatchProgram('germany_okfe')).toEqual({ ok: true, data: true });
    expect(await svc.isBatchProgram('france_crcdc')).toEqual({ ok: true, data: false });
  });
});

describe('making a file', () => {
  it('needs registry:batch-file:generate and an enabled profile', async () => {
    const { svc, marked } = setup();
    auth.allowed = false;
    expect(await svc.buildRun('batch-profile-example')).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    auth.allowed = true;
    expect(auth.asked).toContain('registry:batch-file:generate');
    expect(await svc.buildRun('batch-profile-example')).toEqual({ ok: false, error: 'PROFILE_DISABLED' });
    expect(await svc.buildRun('nope')).toEqual({ ok: false, error: 'NOT_FOUND' });
    expect(marked).toEqual([]);
  });
  it('writes what is due, marks those entries sent, keeps only a manifest and audits without patient text', async () => {
    const { svc, marked, audits } = setup();
    const id = await turnOnExample(svc);
    const r = await svc.buildRun(id);
    expect(r.ok).toBe(true);
    if (r.ok !== true) return;
    expect(r.data.run).toMatchObject({ fileName: 'EXAMPLE_20261019_0001.csv', recordCount: 2, sequence: 1, status: 'awaitingAck', manual: false, refs: ['e1', 'e2'], heldBack: [] });
    expect(r.data.content.split('\r\n')).toHaveLength(4);
    expect(marked).toEqual(['e1', 'e2']);
    expect(JSON.stringify(r.data.run)).not.toContain('P1');
    expect(audits[0]).toContain('EXAMPLE_20261019_0001.csv');
    expect(audits[0]).not.toContain('P1');
    const runs = await svc.getRuns(id);
    expect(runs.ok && runs.data).toHaveLength(1);
    expect(JSON.stringify(runs)).not.toContain('P1');
  });
  it('numbers the files in order', async () => {
    const { svc } = setup();
    const id = await turnOnExample(svc);
    await svc.buildRun(id, { manual: true });
    const second = await svc.buildRun(id, { manual: true });
    expect(second.ok).toBe(false);
    expect(second).toEqual({ ok: false, error: 'NO_RECORDS' });
  });
  it('holds back a record that lacks a required field, naming the field, and sends the rest', async () => {
    const { svc, failed, marked } = setup({ records: { e1: rec(), e2: rec({ dateOfBirth: '' }) } });
    const id = await turnOnExample(svc);
    const r = await svc.buildRun(id);
    expect(r.ok && r.data.run.heldBack).toEqual([{ ref: 'e2', missing: ['dateOfBirth'] }]);
    expect(r.ok && r.data.run.refs).toEqual(['e1']);
    expect(marked).toEqual(['e1']);
    expect(failed).toEqual([{ id: 'e2', code: 'REGISTRY_NOT_READY', msg: 'Held out of the batch file: missing dateOfBirth.' }]);
  });
  it('leaves out entries that are held, failed or another registry\'s, and ones it cannot read', async () => {
    const { svc } = setup({ entries: [entry('e1'), entry('e2', { status: 'FAILED' }), entry('e3', { errorCode: 'REGISTRY_NOT_READY' }), entry('e4', { registryId: 'france_crcdc' }), entry('e5')], records: { e1: rec() } });
    const id = await turnOnExample(svc);
    const r = await svc.buildRun(id);
    expect(r.ok && r.data.run.refs).toEqual(['e1']);
  });
  it('follows the registry\'s schedule; a manual run takes what is not yet due', async () => {
    const waiting = [{ id: 's', feed: 'registry' as const, facilityId: null, registryKey: 'screening:germany_okfe', schedule: { ...IMMEDIATE_SCHEDULE, kind: 'batch' as const, batchFrequency: 'daily' as const, batchTimes: ['23:00'], timeZone: 'UTC' }, updatedAt: '' }];
    const { svc } = setup({ schedule: waiting });
    const id = await turnOnExample(svc);
    expect(await svc.buildRun(id)).toEqual({ ok: false, error: 'NO_RECORDS' });
    const manual = await svc.buildRun(id, { manual: true });
    expect(manual.ok && manual.data.run.manual).toBe(true);
    expect(manual.ok && manual.data.run.recordCount).toBe(2);
  });
  it('previews the counts without making a file', async () => {
    const { svc, marked } = setup({ records: { e1: rec(), e2: rec({ accessionNumber: '' }) } });
    const id = await turnOnExample(svc);
    const p = await svc.preview(id);
    expect(p).toEqual({ ok: true, data: { waiting: 2, dueNow: 2, wouldBeHeldBack: 1, overdue: 0, nextDueAt: null, scheduleIsBatch: true } });
    expect(marked).toEqual([]);
    expect(await svc.preview('nope')).toEqual({ ok: false, error: 'NOT_FOUND' });
  });
});

describe('the registry\'s answer to a file', () => {
  it('goes through the existing acknowledgement path, one answer per record, and refused records carry the registry\'s codes', async () => {
    const { svc, acks } = setup();
    const id = await turnOnExample(svc);
    const built = await svc.buildRun(id);
    if (built.ok !== true) throw new Error('no run');
    const r = await svc.recordFileAcknowledgement(built.data.run.id, { status: 'PARTIAL', fileSha256: built.data.run.sha256, rejections: [{ ref: 'e2', errorCodes: ['E12'] }] });
    expect(r.ok && r.data.status).toBe('partlyRejected');
    expect(acks.map(a => [a.body.submissionGuid, a.body.status])).toEqual([['guid-e1', 'ACCEPTED'], ['guid-e2', 'REJECTED_RECOVERABLE']]);
    expect(acks[1].body.findings).toEqual([{ severity: 'CRITICAL_REJECT', code: 'E12', message: 'E12' }]);
  });
  it('is refused when the registry\'s checksum is not the file\'s, when the run is unknown, and when it was already answered', async () => {
    const { svc, acks } = setup();
    const id = await turnOnExample(svc);
    const built = await svc.buildRun(id);
    if (built.ok !== true) throw new Error('no run');
    expect(await svc.recordFileAcknowledgement(built.data.run.id, { status: 'ACCEPTED', fileSha256: 'beef' })).toEqual({ ok: false, error: 'CHECKSUM_MISMATCH' });
    expect(acks).toEqual([]);
    expect(await svc.recordFileAcknowledgement('nope', { status: 'ACCEPTED' })).toEqual({ ok: false, error: 'NOT_FOUND' });
    expect((await svc.recordFileAcknowledgement(built.data.run.id, { status: 'ACCEPTED' })).ok).toBe(true);
    expect(await svc.recordFileAcknowledgement(built.data.run.id, { status: 'ACCEPTED' })).toEqual({ ok: false, error: 'ALREADY_ANSWERED' });
  });
  it('a refused file refuses every record in it', async () => {
    const { svc, acks } = setup();
    const id = await turnOnExample(svc);
    const built = await svc.buildRun(id);
    if (built.ok !== true) throw new Error('no run');
    const r = await svc.recordFileAcknowledgement(built.data.run.id, { status: 'REJECTED_FILE', fileErrorCodes: ['BAD_HEADER'] });
    expect(r.ok && r.data.status).toBe('rejected');
    expect(acks.map(a => a.body.status)).toEqual(['REJECTED_RECOVERABLE', 'REJECTED_RECOVERABLE']);
  });
});
