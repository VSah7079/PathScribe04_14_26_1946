import { describe, it, expect, vi } from 'vitest';
import { resolveOruReportPdf, pickReportVersionPdf, generateOnce, savedReportPdf } from './resolveOruReportPdf';
import type { IReleasedReportPdfStore } from './releasedReportPdfStore';

const v = (o: any) => ({ id: 'v', caseId: 'C', versionNumber: 1, createdAt: '', mode: 'orchestration', trigger: 'initial_signout', createdBy: { userId: 'u', userName: 'U' }, ...o });
function memStore(): IReleasedReportPdfStore & { data: Record<string, string> } {
  const data: Record<string, string> = {};
  return { data, async get(c, i, s) { return data[`${c}|${i}|${s}`]; }, async put(c, i, s, p) { data[`${c}|${i}|${s}`] = p; } };
}
const versions = (list: any[]) => ({ getByCaseId: vi.fn().mockResolvedValue({ ok: true, data: list }) });

describe('pickReportVersionPdf (Batch 392)', () => {
  const list = [
    v({ versionNumber: 1, pdfBase64: 'CASE-V1' }),
    v({ versionNumber: 2, instanceId: 'I1', pdfBase64: 'I1-V2' }),
    v({ versionNumber: 3, instanceId: 'I1', trigger: 'amendment' }), // no PDF (render failed)
    v({ versionNumber: 4, pdfBase64: 'CASE-V4' }),
  ];
  it('the newest version of the same instance that has a PDF', () => {
    expect(pickReportVersionPdf(list, 'I1', 'CORRECTED')?.pdfBase64).toBe('I1-V2');
  });
  it('a final falls back to the newest whole-case PDF; a correction does not', () => {
    expect(pickReportVersionPdf(list, 'I9', 'FINAL')?.pdfBase64).toBe('CASE-V4');
    expect(pickReportVersionPdf(list, 'I9', 'ADDENDUM')).toBeUndefined();
  });
  it('never for a preliminary (a signed version is not the preliminary)', () => {
    expect(pickReportVersionPdf(list, 'I1', 'PRELIMINARY')).toBeUndefined();
  });
});

describe('resolveOruReportPdf (Batch 392)', () => {
  const input = { caseId: 'C', instanceId: 'I1', resultState: 'PRELIMINARY' as const };
  it('uses the PDF made at release and keeps it for a retry', async () => {
    const store = memStore();
    const r = await resolveOruReportPdf({ ...input, generatePdf: async () => ({ pdfBase64: 'NEW' }) }, { versions: versions([]), store });
    expect(r).toEqual({ ok: true, pdfBase64: 'NEW', source: 'release' });
    expect(store.data['C|I1|PRELIMINARY']).toBe('NEW');
    expect(await resolveOruReportPdf(input, { versions: versions([]), store })).toEqual({ ok: true, pdfBase64: 'NEW', source: 'kept' });
  });
  it('a render failure falls back to what was kept, then to the saved versions', async () => {
    const store = memStore();
    const failing = async () => ({ generationError: 'render service down' });
    const r = await resolveOruReportPdf({ caseId: 'C', instanceId: 'I1', resultState: 'FINAL', generatePdf: failing }, { versions: versions([v({ instanceId: 'I1', pdfBase64: 'SIGNED' })]), store });
    expect(r).toEqual({ ok: true, pdfBase64: 'SIGNED', source: 'report-version' });
  });
  it('nothing anywhere: not available, with the render error as the reason', async () => {
    const r = await resolveOruReportPdf({ ...input, generatePdf: async () => ({ generationError: 'render service down' }) }, { versions: versions([]), store: memStore() });
    expect(r).toEqual({ ok: false, error: 'The report PDF could not be made: render service down' });
    expect(await resolveOruReportPdf(input, { versions: versions([]), store: memStore() })).toEqual({ ok: false, error: 'No report PDF has been made for this result.' });
  });
});

describe('generateOnce / savedReportPdf (Batch 392)', () => {
  it('renders once however often it is asked, and turns a throw into an error', async () => {
    const gen = vi.fn().mockResolvedValue({ pdfBase64: 'P' });
    const once = generateOnce(gen)!;
    await Promise.all([once(), once(), once()]);
    expect(gen).toHaveBeenCalledTimes(1);
    expect(await generateOnce(async () => { throw new Error('boom'); })!()).toEqual({ generationError: 'boom' });
    expect(generateOnce(undefined)).toBeUndefined();
  });
  it('savedReportPdf gives the newest signed PDF, none for a preliminary', async () => {
    const vs = versions([v({ versionNumber: 1, pdfBase64: 'OLD' }), v({ versionNumber: 5, instanceId: 'I', pdfBase64: 'NEWEST' }), v({ versionNumber: 6 })]);
    expect(await savedReportPdf('C', 'FINAL', vs)!()).toEqual({ pdfBase64: 'NEWEST' });
    expect(savedReportPdf('C', 'PRELIMINARY', vs)).toBeUndefined();
    expect(await savedReportPdf('C', 'FINAL', versions([]))!()).toEqual({ generationError: 'no signed report PDF has been saved for this case' });
  });
});
