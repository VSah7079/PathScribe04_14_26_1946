// Batch 762: the requisition service: matching, quarantine, a later match, re-association, discard, viewing, the audit
// trail, and refusals without the capability.
import { describe, it, expect, vi } from 'vitest';
import { createRequisitionService, type RequisitionServiceDeps, type RequisitionStore } from './requisitionService';
import type { CaseRequisitionFacts, IngestionReport } from './requisitionTypes';

const source = (id: string, facilityId: string | null) => ({ id, name: `Scanner ${id}`, facilityId, kind: 'fileShare' as const, location: '\\\\s\\in', scheduleMinutes: 15, separatorBarcode: 'SEP', enabled: true, updatedAt: 'x', updatedBy: 'x' });

function memoryStore(): RequisitionStore {
  const d: Record<string, unknown[]> = { sources: [source('src1', 'fac-a'), source('src2', 'fac-b')], links: [], unmatched: [], runs: [], expectations: [], missing: [] };
  return {
    sources: async () => d.sources as never, saveSources: async s => { d.sources = s; },
    links: async () => d.links as never, saveLinks: async l => { d.links = l; },
    unmatched: async () => d.unmatched as never, saveUnmatched: async u => { d.unmatched = u; },
    runs: async () => d.runs as never, saveRuns: async r => { d.runs = r; },
    expectations: async () => d.expectations as never, saveExpectations: async e => { d.expectations = e; },
    missing: async () => d.missing as never, saveMissing: async m => { d.missing = m; },
  };
}

function setup(opts: { deny?: string[]; cases?: string[]; facilities?: string[]; store?: RequisitionStore; facts?: CaseRequisitionFacts[]; now?: string } = {}) {
  const cases = new Set(opts.cases ?? ['S26-0001', 'S26-4403']);
  const audit = vi.fn(async () => undefined);
  const deficiencies = { raise: vi.fn(async () => 'sdef-1'), close: vi.fn(async () => undefined) };
  let n = 0;
  const deps: RequisitionServiceDeps = {
    authorization: (() => {
      // A user assigned to some facilities (none: every facility), as evaluateCapability judges it.
      const decide = async (k: string, ctx: { facilityId?: string | null; allFacilities?: boolean } = {}) => {
        if ((opts.deny ?? []).includes(k)) return { allowed: false };
        const scope = opts.facilities ?? [];
        if (scope.length === 0) return { allowed: true };
        return { allowed: !ctx.allFacilities && (!ctx.facilityId || scope.includes(ctx.facilityId)) };
      };
      return { enforce: vi.fn(decide), evaluate: vi.fn(decide) } as never;
    })(),
    store: opts.store ?? memoryStore(),
    findCase: async key => (cases.has(key) ? { caseId: `id-${key}`, accession: key } : null),
    readLink: async p => (p.kind === 'url' ? p.url : null),
    now: () => new Date(opts.now ?? '2026-11-02T10:00:00Z'),
    actor: () => ({ userId: 'u1', userName: 'Tech A' }),
    newId: prefix => `${prefix}-${++n}`,
    audit,
    searchCases: async q => [...cases].filter(c => c.includes(q.toUpperCase())).map(c => ({ caseId: `id-${c}`, accession: c, patientName: 'DEMO, PATIENT', accessionedAt: null })),
    cases: async () => opts.facts ?? [],
    deficiencies: { raise: deficiencies.raise, close: deficiencies.close },
  };
  return { svc: createRequisitionService(deps), audit, cases, deps, deficiencies };
}

const url = (f: string) => ({ kind: 'url' as const, url: `/demo-requisitions/${f}` });
const report: IngestionReport = {
  sourceId: 'src1',
  files: [
    { fileName: 'REQ-BATCH-0001.pdf', pointer: url('REQ-BATCH-0001.pdf'), outcome: 'read', groups: [{ barcode: 'S26-0001', pages: { from: 1, to: 2 } }, { barcode: 'S26-4403-A', pages: { from: 4, to: 4 } }] },
    { fileName: 'REQ-BATCH-0002.pdf', pointer: url('REQ-BATCH-0002.pdf'), outcome: 'read', groups: [{ barcode: 'S26-9999', pages: { from: 1, to: 1 } }, { pages: { from: 3, to: 3 } }] },
    { fileName: 'REQ-SCAN-0003.tif', outcome: 'rejected', reason: 'notPdf' },
  ],
};

describe('requisitionService (Batch 762)', () => {
  it('links what matches, quarantines what does not, and refuses non-PDFs; running again adds nothing', async () => {
    const { svc, audit } = setup();
    const run = await svc.recordIngestion(report);
    expect(run).toMatchObject({ ok: true, data: { files: 3, matched: 2, unmatched: 2, rejected: [{ fileName: 'REQ-SCAN-0003.tif', reason: 'notPdf' }] } });
    const inbox = await svc.getInbox();
    if (!inbox.ok) throw new Error('inbox');
    expect(inbox.data.recentLinks.map(l => [l.accession, l.pages])).toEqual(expect.arrayContaining([['S26-0001', { from: 1, to: 2 }], ['S26-4403', { from: 4, to: 4 }]]));
    expect(inbox.data.unmatched.map(u => u.reason).sort()).toEqual(['noBarcode', 'noMatch']);
    expect(audit.mock.calls.map(c => (c as unknown as [{ event: string }])[0].event).sort()).toEqual(['Requisition Matched', 'Requisition Matched', 'Requisition Quarantined', 'Requisition Quarantined']);
    // The audit trail never names the file (a scanned file's name can name the patient).
    expect(JSON.stringify(audit.mock.calls)).not.toContain('REQ-BATCH');

    const again = await svc.recordIngestion(report);
    expect(again).toMatchObject({ ok: true, data: { matched: 0, unmatched: 0 } });
  });

  it('a quarantined scan is linked on a later run once its case exists', async () => {
    const { svc, cases } = setup();
    await svc.recordIngestion(report);
    cases.add('S26-9999');
    const run = await svc.recordIngestion({ sourceId: 'src1', files: [] });
    expect(run).toMatchObject({ ok: true, data: { matched: 1, facilityId: 'fac-a' } });
    const links = await svc.linksForCase({ accession: 's26-9999' });
    expect(links).toMatchObject({ ok: true, data: [{ accession: 'S26-9999', matchedBy: 'automatic' }] });
  });

  it('re-associates an unmatched scan to a case by its accession, and discards another with a reason', async () => {
    const { svc, audit } = setup();
    await svc.recordIngestion(report);
    const inbox = await svc.getInbox();
    if (!inbox.ok) throw new Error('inbox');
    const noBarcode = inbox.data.unmatched.find(u => u.reason === 'noBarcode')!;
    const noMatch = inbox.data.unmatched.find(u => u.reason === 'noMatch')!;

    expect(await svc.reassociate(noBarcode.id, 'S26-7777')).toEqual({ ok: false, error: 'NOT_FOUND' });
    const linked = await svc.reassociate(noBarcode.id, 'S26-4403');
    expect(linked).toMatchObject({ ok: true, data: { accession: 'S26-4403', matchedBy: 'manual', linkedBy: 'Tech A', pages: { from: 3, to: 3 } } });
    expect(await svc.reassociate(noBarcode.id, 'S26-4403')).toEqual({ ok: false, error: 'ALREADY_CLOSED' });

    expect(await svc.discard(noMatch.id, 'duplicateScan')).toMatchObject({ ok: true, data: { status: 'discarded', discardReason: 'duplicateScan', closedBy: 'Tech A' } });
    const after = await svc.getInbox();
    expect(after.ok && after.data.unmatched).toEqual([]);
    const events = audit.mock.calls.map(c => (c as unknown as [{ event: string }])[0].event);
    expect(events).toContain('Requisition Re-associated');
    expect(events).toContain('Requisition Discarded');
  });

  it('opens a linked requisition at its first page, and audits the view', async () => {
    const { svc, audit } = setup();
    await svc.recordIngestion(report);
    const links = await svc.linksForCase({ accession: 'S26-4403' });
    if (!links.ok) throw new Error('links');
    expect(await svc.openDocument({ linkId: links.data[0].id })).toEqual({ ok: true, data: { url: '/demo-requisitions/REQ-BATCH-0001.pdf#page=4' } });
    expect(audit).toHaveBeenLastCalledWith(expect.objectContaining({ event: 'Requisition Viewed', caseId: 'S26-4403' }));
  });

  it('refuses each action without its capability', async () => {
    const { svc } = setup({ deny: ['requisition:ingestion:run', 'requisition:inbox:review', 'requisition:inbox:resolve', 'case:requisition:view', 'config:requisition-ingestion:manage'] });
    const refused = { ok: false, error: 'NOT_PERMITTED' };
    expect(await svc.recordIngestion(report)).toEqual(refused);
    expect(await svc.getInbox()).toEqual(refused);
    expect(await svc.getSources()).toEqual(refused);
    expect(await svc.linksForCase({ accession: 'S26-4403' })).toEqual(refused);
    expect(await svc.reassociate('x', 'S26-4403')).toEqual(refused);
    expect(await svc.discard('x', 'other')).toEqual(refused);
    expect(await svc.openDocument({ linkId: 'x' })).toEqual(refused);
    expect(await svc.saveSource({ id: '', name: 'n', facilityId: null, kind: 'fileShare', location: 'l', scheduleMinutes: 15, separatorBarcode: 's', enabled: true })).toEqual(refused);
  });

  it('several performing facilities: a user assigned to one sees and resolves only its queue', async () => {
    const store = memoryStore();
    const all = setup({ store });
    await all.svc.recordIngestion(report);
    await all.svc.recordIngestion({ sourceId: 'src2', files: [{ fileName: 'B.pdf', pointer: url('B.pdf'), outcome: 'read', groups: [{ barcode: 'S26-8888', pages: { from: 1, to: 1 } }] }] });
    const everyone = await all.svc.getInbox();
    expect(everyone.ok && everyone.data.unmatched.map(u => u.facilityId).sort()).toEqual(['fac-a', 'fac-a', 'fac-b']);
    expect(everyone.ok && everyone.data.recentLinks.every(l => l.facilityId === 'fac-a')).toBe(true);

    const labB = setup({ store, facilities: ['fac-b'] });
    const inboxB = await labB.svc.getInbox();
    if (!inboxB.ok) throw new Error('inbox');
    expect(inboxB.data.unmatched.map(u => u.barcode)).toEqual(['S26-8888']);
    expect(inboxB.data.recentLinks).toEqual([]);
    expect((await labB.svc.getSources()).ok && ((await labB.svc.getSources()) as { data: { id: string }[] }).data.map(x => x.id)).toEqual(['src2']);
    const fromA = everyone.ok ? everyone.data.unmatched.find(u => u.facilityId === 'fac-a')! : null;
    expect(await labB.svc.discard(fromA!.id, 'other')).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    expect(await labB.svc.recordIngestion(report)).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    // An all-facility source needs a user who works for every facility.
    expect(await labB.svc.saveSource({ id: '', name: 'Enterprise scanner', facilityId: null, kind: 'fileShare', location: 'l', scheduleMinutes: 15, separatorBarcode: 'SEP', enabled: true })).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    expect(await labB.svc.saveSource({ id: 'src2', name: 'Moved', facilityId: 'fac-a', kind: 'fileShare', location: 'l', scheduleMinutes: 15, separatorBarcode: 'SEP', enabled: true })).toEqual({ ok: false, error: 'NOT_PERMITTED' });
  });

  it('refuses a run for a source it does not know', async () => {
    expect(await setup().svc.recordIngestion({ sourceId: 'nope', files: [] })).toEqual({ ok: false, error: 'NOT_FOUND' });
  });

  it('checks a source before saving it', async () => {
    const { svc } = setup();
    expect(await svc.saveSource({ id: '', name: ' ', facilityId: 'fac-a', kind: 'fileShare', location: '\\\\x\\y', scheduleMinutes: 15, separatorBarcode: 'SEP', enabled: true })).toEqual({ ok: false, error: 'INVALID' });
    expect(await svc.saveSource({ id: '', name: 'Scanner', facilityId: 'fac-a', kind: 'fileShare', location: '\\\\x\\y', scheduleMinutes: 0, separatorBarcode: 'SEP', enabled: true })).toEqual({ ok: false, error: 'INVALID' });
    const saved = await svc.saveSource({ id: '', name: 'Scanner', facilityId: 'fac-a', kind: 'fileShare', location: '\\\\x\\y', scheduleMinutes: 30, separatorBarcode: 'SEP', enabled: true });
    expect(saved).toMatchObject({ ok: true, data: { name: 'Scanner', updatedBy: 'Tech A' } });
    expect(await svc.getSources()).toMatchObject({ ok: true, data: [{ id: 'src1' }, { id: 'src2' }, { name: 'Scanner', facilityId: 'fac-a' }] });
  });

  describe('expected requisitions (Pete: flag and track a case with none; HIS orders may have no paper)', () => {
    const fact = (accession: string, origin: CaseRequisitionFacts['origin'], hoursAgo: number, facilityId: string | null = 'fac-a'): CaseRequisitionFacts =>
      ({ caseId: `id-${accession}`, accession, facilityId, origin, accessionedAt: new Date(Date.parse('2026-11-02T10:00:00Z') - hoursAgo * 3_600_000).toISOString() });

    it('flags a typed-in case with none after 24 h and raises the deficiency; an electronic order or a recent case is not flagged', async () => {
      const t = setup({ facts: [fact('S26-0101', 'manual', 30), fact('S26-0102', 'electronic', 30), fact('S26-0103', 'manual', 2), fact('S26-0001', 'manual', 30)] });
      await t.svc.recordIngestion(report); // links S26-0001 and S26-4403
      expect(await t.svc.sweepMissing()).toEqual({ ok: true, data: { flagged: 1, received: 0, overdue: 0 } });
      const missing = await t.svc.getMissing();
      expect(missing.ok && missing.data.map(m => [m.accession, m.deficiencyId])).toEqual([['S26-0101', 'sdef-1']]);
      expect(t.deficiencies.raise).toHaveBeenCalledWith(expect.objectContaining({ caseId: 'id-S26-0101' }));
      expect(await t.svc.missingForCase({ accession: 'S26-0101' })).toMatchObject({ ok: true, data: { accession: 'S26-0101', status: 'open' } });
      // Running again flags nothing new.
      expect(await t.svc.sweepMissing()).toMatchObject({ ok: true, data: { flagged: 0 } });
    });

    it('a facility can expect requisitions for electronic orders too, and sooner', async () => {
      const t = setup({ facts: [fact('S26-0102', 'electronic', 3)] });
      expect(await t.svc.saveExpectation({ facilityId: 'fac-a', expected: { electronic: true, manual: true, outside: true, downtime: true, lockbox: true }, graceHours: 2, unmatchedAlertHours: 24 })).toMatchObject({ ok: true });
      expect(await t.svc.saveExpectation({ facilityId: null, expected: { electronic: false, manual: true, outside: true, downtime: true, lockbox: true }, graceHours: 999, unmatchedAlertHours: 24 })).toEqual({ ok: false, error: 'INVALID' });
      expect(await t.svc.sweepMissing()).toMatchObject({ ok: true, data: { flagged: 1 } });
    });

    it('closes the flag and its deficiency when the scan arrives', async () => {
      const t = setup({ facts: [fact('S26-0001', 'manual', 30)], cases: ['S26-4403'] });
      await t.svc.sweepMissing();
      t.cases.add('S26-0001');
      await t.svc.recordIngestion(report);
      expect(t.deficiencies.close).toHaveBeenCalledWith('sdef-1', expect.stringContaining('received'));
      expect(await t.svc.getMissing()).toEqual({ ok: true, data: [] });
      expect(t.audit.mock.calls.map(c => (c as unknown as [{ event: string }])[0].event)).toContain('Requisition Received');
    });

    it('records that no paper requisition is coming, with a reason', async () => {
      const t = setup({ facts: [fact('S26-0101', 'manual', 30)] });
      await t.svc.sweepMissing();
      expect(await t.svc.waiveMissing('id-S26-0101', 'verbalOrderDocumented')).toMatchObject({ ok: true, data: { status: 'waived', waiverReason: 'verbalOrderDocumented', closedBy: 'Tech A' } });
      expect(t.deficiencies.close).toHaveBeenCalledWith('sdef-1', expect.stringContaining('verbalOrderDocumented'));
      expect(await t.svc.waiveMissing('id-S26-0101', 'other')).toEqual({ ok: false, error: 'NOT_FOUND' });
    });

    it('flags a requisition with no case once it has waited past the limit, and puts it first', async () => {
      const store = memoryStore();
      await setup({ store }).svc.recordIngestion(report);
      const later = setup({ store, now: '2026-11-03T11:00:00Z' });
      expect(await later.svc.sweepMissing()).toMatchObject({ ok: true, data: { overdue: 2 } });
      const inbox = await later.svc.getInbox();
      expect(inbox.ok && inbox.data.unmatched.every(u => !!u.overdueAt)).toBe(true);
      expect(later.audit.mock.calls.filter(c => (c as unknown as [{ event: string }])[0].event === 'Requisition Without Case')).toHaveLength(2);
      expect(await later.svc.sweepMissing()).toMatchObject({ ok: true, data: { overdue: 0 } });
    });
  });

  it('finds the case to link by search, and says how it was linked', async () => {
    const t = setup();
    await t.svc.recordIngestion(report);
    expect(await t.svc.findCasesToLink('4403')).toMatchObject({ ok: true, data: [{ accession: 'S26-4403' }] });
    expect(await t.svc.findCasesToLink('4')).toEqual({ ok: true, data: [] });
    const inbox = await t.svc.getInbox();
    const item = inbox.ok ? inbox.data.unmatched[0] : null;
    expect(await t.svc.reassociate(item!.id, 'S26-4403', 'newCase')).toMatchObject({ ok: true });
    expect(JSON.stringify(t.audit.mock.calls)).toContain('to the case created from it');
  });
});
