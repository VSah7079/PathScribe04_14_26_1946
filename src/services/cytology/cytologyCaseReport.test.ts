// src/services/cytology/cytologyCaseReport.test.ts
// Batch 532 (Pete, Oct 12, 2026): the consolidated cytology case report: what
// it lists, the PDF it makes, the one message per accession, and when it is
// released.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveCytologyCaseReport, latestRecordPerSpecimen, cytologyCaseReleased } from './resolveCytologyCaseReport';
import { caseReportNeedsCover, generateCytologyCaseReportPdf, generateCytologyCaseReportPdfSnapshot } from './generateCytologyCaseReportPdf';
import { buildCytologyCaseOruR01Payload } from './buildCytologyCaseOruR01Payload';
import { cytologyCaseIsReleased, buildCytologyCaseReportMessage } from './cytologyCaseReportMessage';

const content = (over: Record<string, unknown> = {}) => ({
  accessionNumber: 'S26-0100', patientName: 'Roe, Jane', patientMrn: 'MRN-1', patientDateOfBirth: '1980-01-01',
  specimenAdequacy: ['Satisfactory for evaluation.'], generalCategorization: 'NILM', primaryInterpretation: 'Negative for intraepithelial lesion or malignancy.',
  additionalInterpretations: [], recommendations: ['Routine screening.'], language: 'en',
  specimenTypeDescription: 'Cervical Pap', signedBy: { name: 'Dr P', isPathologist: true }, signedAt: '2026-10-12T09:00:00Z', ...over,
});
const rec = (id: string, specimenId: string, signedAt: string, over: Record<string, unknown> = {}) => ({
  id, caseId: 'C1', specimenId, reviewRecordId: `rv-${id}`, signedAt,
  signedBy: { userId: 'P1', userName: 'Dr P', isPathologist: true }, reportContent: content(), ...over,
}) as any;
const caseData = (over: Record<string, unknown> = {}) => ({
  id: 'C1', status: 'finalized', accession: { fullAccession: 'S26-0100' },
  specimens: [{ id: 'SP1', label: 'A', description: 'Cervical' }, { id: 'SP2', label: 'B', description: 'Vaginal vault' }, { id: 'SP3', label: 'C' }],
  ...over,
}) as any;

describe('resolveCytologyCaseReport', () => {
  it('lists every cytology specimen in case order, each with its newest record', () => {
    const records = [rec('r2', 'SP2', '2026-10-12T10:00:00Z'), rec('r1', 'SP1', '2026-10-12T09:00:00Z'), rec('r1b', 'SP1', '2026-10-12T11:00:00Z', { amendsRecordId: 'r1' })];
    const report = resolveCytologyCaseReport(caseData(), records, ['SP2', 'SP1']);
    expect(report.specimens.map(s => [s.specimenId, s.label, s.record?.id])).toEqual([['SP1', 'A', 'r1b'], ['SP2', 'B', 'r2']]);
    expect(report.specimens[0].description).toBe('Cervical');
    expect(report.accessionNumber).toBe('S26-0100');
    expect(report.language).toBe('en');
    expect(report.complete).toBe(true);
  });

  it('a specimen without a record on an open case is listed, unsigned, and the report is not complete', () => {
    const report = resolveCytologyCaseReport(caseData({ status: 'in-progress' }), [rec('r1', 'SP1', '2026-10-12T09:00:00Z')], ['SP1', 'SP2']);
    expect(report.specimens[1]).toEqual({ specimenId: 'SP2', label: 'B', description: 'Vaginal vault' });
    expect(report.complete).toBe(false);
  });

  it('Pete: an early-finalized case lists each unsigned specimen as not reported, with the reason', () => {
    const report = resolveCytologyCaseReport(
      caseData({ cytologyEarlyFinalization: { reason: 'Clinical urgency', unsignedSpecimenIds: ['SP3'] } }),
      [rec('r1', 'SP1', '2026-10-12T09:00:00Z')],
    );
    expect(report.specimens.map(s => [s.specimenId, s.notReportedReason])).toEqual([['SP1', undefined], ['SP3', 'Clinical urgency']]);
  });

  it('ignores records from another case, and falls back to the case id with no accession', () => {
    const report = resolveCytologyCaseReport(caseData({ accession: undefined }), [{ ...rec('rx', 'SP1', '2026-10-12T09:00:00Z'), caseId: 'OTHER' }]);
    expect(report.specimens).toEqual([]);
    expect(report.accessionNumber).toBe('C1');
    expect(report.complete).toBe(false);
  });

  it('latestRecordPerSpecimen keeps the newest by signing time', () => {
    const m = latestRecordPerSpecimen([rec('b', 'SP1', '2026-10-12T11:00:00Z'), rec('a', 'SP1', '2026-10-12T09:00:00Z')]);
    expect(m.get('SP1')!.id).toBe('b');
  });

  it('released: every specimen signed, or finalized early', () => {
    expect(cytologyCaseReleased({ status: 'in-progress' } as any, false)).toBe(false);
    expect(cytologyCaseReleased({ status: 'in-progress' } as any, true)).toBe(true);
    expect(cytologyCaseReleased({ status: 'in-progress', cytologyEarlyFinalization: { reason: 'x' } } as any, false)).toBe(true);
    expect(cytologyCaseIsReleased({ status: 'in-progress' } as any)).toBe(false);
    expect(cytologyCaseIsReleased({ status: 'finalized' } as any)).toBe(true);
    expect(cytologyCaseIsReleased({ status: 'closed' } as any)).toBe(true);
    expect(cytologyCaseIsReleased({ status: 'in-progress', cytologyEarlyFinalization: { reason: 'x' } } as any)).toBe(true);
  });
});

// Batch 539: the report renderer makes the PDF; a fake renderer returns marked bytes and keeps the request.
const MARKED = new TextEncoder().encode('%PDF-1.4 /Keywords (pathscribe-template:cytology)');
const fakeRenderer = () => {
  const sent: any[] = [];
  return { sent, deps: { post: vi.fn(async (body: object) => { sent.push(body); return MARKED; }) } };
};

describe('the case report PDF (Batch 539: one request to the report renderer)', () => {
  const report = (specimens: any[]) => ({ caseId: 'C1', accessionNumber: 'S26-0100', specimens, complete: true });

  it('needs a first page with more than one specimen, or any not reported; never for one reported specimen', () => {
    expect(caseReportNeedsCover({ specimens: [{ specimenId: 'SP1', label: 'A', record: rec('r1', 'SP1', 't') }] })).toBe(false);
    expect(caseReportNeedsCover({ specimens: [{ specimenId: 'SP1', label: 'A', notReportedReason: 'x' }] })).toBe(true);
    expect(caseReportNeedsCover({ specimens: [{ specimenId: 'SP1', label: 'A', record: rec('r1', 'SP1', 't') }, { specimenId: 'SP2', label: 'B', record: rec('r2', 'SP2', 't') }] })).toBe(true);
  });

  it('one reported specimen: that specimen\'s own report, no first page', async () => {
    const { sent, deps } = fakeRenderer();
    const out = await generateCytologyCaseReportPdf(report([{ specimenId: 'SP1', label: 'A', record: rec('r1', 'SP1', '2026-10-12T09:00:00Z') }]), deps);
    expect(out).toBe(MARKED);
    expect(sent[0]).toMatchObject({ template: 'cytology', outputFormat: 'pdf' });
    expect(sent[0].documents).toHaveLength(1);
    expect(sent[0].documents[0]).toMatchObject({ barcode: 'S26-0100', title: 'Cytology Report — GYN Cervical Screening' });
  });

  it('several specimens: the first page, then each reported specimen in order, with stable metadata', async () => {
    const { sent, deps } = fakeRenderer();
    const r = report([
      { specimenId: 'SP1', label: 'A', description: 'Cervical', record: rec('r1', 'SP1', '2026-10-12T09:00:00Z', { reportContent: content({ primaryInterpretation: 'one' }) }) },
      { specimenId: 'SP2', label: 'B', notReportedReason: 'Clinical urgency' },
      { specimenId: 'SP3', label: 'C', record: rec('r3', 'SP3', '2026-10-12T11:00:00Z', { reportContent: content({ primaryInterpretation: 'three' }) }) },
    ]);
    await generateCytologyCaseReportPdf(r, deps);
    const body = sent[0];
    expect(body.documents.map((d: any) => d.title)).toEqual(['Cytology Case Report — S26-0100', 'Cytology Report — GYN Cervical Screening', 'Cytology Report — GYN Cervical Screening']);
    expect(body.documents[0].sections[0]).toEqual({ heading: 'Specimens in this report', lines: [
      { text: 'A: Cervical', bold: true }, { text: 'Reported' },
      { text: 'B', bold: true }, { text: 'Not reported. Reason: Clinical urgency' },
      { text: 'C', bold: true }, { text: 'Reported' },
    ] });
    const interpretation = (d: any) => d.sections.find((x: any) => x.heading === 'Interpretation / Diagnostic Result').lines[0].text;
    expect([interpretation(body.documents[1]), interpretation(body.documents[2])]).toEqual(['one', 'three']);
    expect(body.metadata).toEqual({ title: 'S26-0100', author: 'Dr P', subject: 'Cytology Report', timestamp: '2026-10-12T11:00:00Z' });
  });

  it('the snapshot gives base64, or the reason it failed; a renderer without the cytology template is refused', async () => {
    const one = report([{ specimenId: 'SP1', label: 'A', record: rec('r1', 'SP1', 't') }]);
    expect((await generateCytologyCaseReportPdfSnapshot(one, fakeRenderer().deps)).pdfBase64).toBe(Buffer.from(MARKED).toString('base64'));
    expect(await generateCytologyCaseReportPdfSnapshot(one, { post: async () => { throw new Error('The report renderer refused the request (500)'); } }))
      .toEqual({ generationError: 'The report renderer refused the request (500)' });
    const old = await generateCytologyCaseReportPdfSnapshot(one, { post: async () => new TextEncoder().encode('%PDF-1.4 surgical') });
    expect(old.generationError).toContain('does not have the cytology template');
  });
});

describe('buildCytologyCaseOruR01Payload: one message per accession', () => {
  const r = resolveCytologyCaseReport(
    caseData({ cytologyEarlyFinalization: { reason: 'Clinical urgency', unsignedSpecimenIds: ['SP3'] } }),
    [rec('r1', 'SP1', '2026-10-12T09:00:00Z'), rec('r2', 'SP2', '2026-10-12T10:00:00Z', { reportContent: content({ primaryInterpretation: 'HSIL', cisoeAScore: { total: 3 } }) })],
  );

  it('FINAL: every specimen, reported or not, with the case PDF', () => {
    const p = buildCytologyCaseOruR01Payload(r, 'FINAL', 'PDF64', { messageId: 'm1' });
    expect(p).toMatchObject({ messageId: 'm1', eventType: 'ORU_R01', scope: 'case', resultState: 'FINAL', caseId: 'C1', accessionNumber: 'S26-0100',
      eventTimestamp: '2026-10-12T10:00:00Z', patient: { mrn: 'MRN-1', name: 'Roe, Jane', dateOfBirth: '1980-01-01' }, reportPdfBase64: 'PDF64' });
    expect(p.specimens.map(s => [s.specimenId, s.status, s.signOutRecordId])).toEqual([['SP1', 'reported', 'r1'], ['SP2', 'reported', 'r2'], ['SP3', 'not-reported', undefined]]);
    expect(p.specimens[0].narrative).toMatchObject({ specimenAdequacy: 'Satisfactory for evaluation.', recommendations: 'Routine screening.' });
    expect(p.specimens[0].narrative!.additionalInterpretations).toBeUndefined();
    expect(p.specimens[1].geographyExtension).toEqual({ type: 'cisoe_a', score: { total: 3 } });
    expect(p.specimens[2].notReportedReason).toBe('Clinical urgency');
    expect(p.changed).toBeUndefined();
  });

  it('CORRECTED: the whole case again, naming the changed specimen and what it read before', () => {
    const p = buildCytologyCaseOruR01Payload(r, 'CORRECTED', 'PDF64', { messageId: 'm2', changedRecordId: 'r1', previouslyReportedAs: 'ASC-US' });
    expect(p.specimens).toHaveLength(3);
    expect(p.changed).toEqual({ specimenId: 'SP1', signOutRecordId: 'r1', previouslyReportedAs: 'ASC-US' });
    expect(p.eventTimestamp).toBe('2026-10-12T09:00:00Z');
  });

  it('ADDENDUM: names the specimen, never a "previously reported as"', () => {
    const p = buildCytologyCaseOruR01Payload(r, 'ADDENDUM', 'PDF64', { messageId: 'm3', changedRecordId: 'r2', previouslyReportedAs: 'ignored' });
    expect(p.changed).toEqual({ specimenId: 'SP2', signOutRecordId: 'r2' });
  });
});

vi.mock('./generateCytologyCaseReportPdf', async importOriginal => {
  const real = await importOriginal<typeof import('./generateCytologyCaseReportPdf')>();
  return { ...real, generateCytologyCaseReportPdfSnapshot: vi.fn((report: any, deps?: any) => real.generateCytologyCaseReportPdfSnapshot(report, deps)) };
});

describe('buildCytologyCaseReportMessage', () => {
  beforeEach(async () => {
    const mod = await import('./generateCytologyCaseReportPdf');
    vi.mocked(mod.generateCytologyCaseReportPdfSnapshot).mockReset();
    vi.mocked(mod.generateCytologyCaseReportPdfSnapshot).mockResolvedValue({ pdfBase64: 'CASE' });
  });

  it('builds the payload with the case PDF', async () => {
    const built = await buildCytologyCaseReportMessage(caseData(), [rec('r1', 'SP1', '2026-10-12T09:00:00Z')], 'FINAL', { messageId: 'm1' });
    expect('payload' in built && built.payload).toMatchObject({ messageId: 'm1', scope: 'case', reportPdfBase64: 'CASE' });
  });

  it('is held with no signed specimen, or when the PDF was not built', async () => {
    expect(await buildCytologyCaseReportMessage(caseData(), [], 'FINAL')).toEqual({ held: 'The case has no signed cytology specimen to report.' });
    const mod = await import('./generateCytologyCaseReportPdf');
    vi.mocked(mod.generateCytologyCaseReportPdfSnapshot).mockResolvedValue({ generationError: 'font offline' });
    expect(await buildCytologyCaseReportMessage(caseData(), [rec('r1', 'SP1', 't')], 'FINAL')).toEqual({ held: 'The case report PDF was not built: font offline.' });
  });
});

describe('Batch 539: "Print case report" on a released case opens the case report as released', () => {
  it('the newest stored cytology case document, byte for byte (not a preliminary, not re-rendered)', async () => {
    const { cytologyCaseReportForPrint } = await import('./cytologyCaseReportForPrint');
    const docs = [
      { id: 'd2', caseId: 'C1', source: 'CYTOLOGY', reportType: 'CORRECTED', createdAt: '2026-10-12T12:00:00Z' },
      { id: 'd1', caseId: 'C1', source: 'CYTOLOGY', reportType: 'FINAL', createdAt: '2026-10-12T10:00:00Z' },
      { id: 'd3', caseId: 'C1', source: 'CYTOLOGY', reportType: 'PRELIMINARY', createdAt: '2026-10-12T13:00:00Z' },
    ];
    const documents = {
      listByCase: vi.fn(async () => ({ ok: true as const, data: docs as any })),
      read: vi.fn(async (id: string) => ({ ok: true as const, data: { document: { id } as any, pdfBase64: Buffer.from(`PDF-${id}`).toString('base64') } })),
    };
    const bytes = await cytologyCaseReportForPrint(caseData(), ['SP1'], documents);
    expect(Buffer.from(bytes!).toString()).toBe('PDF-d2');
    expect(await cytologyCaseReportForPrint(caseData({ status: 'in-progress' }), ['SP1'], documents)).toBeNull();
  });

  it('a stored document that fails its check is an error, never a fresh render in its place', async () => {
    const { cytologyCaseReportForPrint } = await import('./cytologyCaseReportForPrint');
    const documents = {
      listByCase: async () => ({ ok: true as const, data: [{ id: 'd1', source: 'CYTOLOGY', reportType: 'FINAL', createdAt: 'T' }] as any }),
      read: async () => ({ ok: false as const, error: 'integrity' as const }),
    };
    await expect(cytologyCaseReportForPrint(caseData(), ['SP1'], documents)).rejects.toThrow('integrity');
  });
});
