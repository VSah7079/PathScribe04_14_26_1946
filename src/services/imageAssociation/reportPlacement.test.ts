// Batch 742 (Pete: images print inside their report section): placing in a section, the signed-report rule, the
// renderer payload, and what still follows the report's pages.
import { beforeEach, describe, expect, it } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import {
  applyCaseReportImagesToPdf, insertIntoReport, isAttachmentInReport, isDrawnInSection, listCaseReportImages, MAX_REPORT_IMAGES,
  reportEditProblem, resetCaseReportImagesForTests, takeOutOfReport, type CaseReportImageDeps, type PlacementItem,
} from './caseReportImages';
import { bytesToBase64, reportSectionImagesFor } from './reportSectionImages';

const RED_PNG = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'));
const audits: { event: string; detail: string }[] = [];
const deps = (over: Partial<CaseReportImageDeps> = {}): CaseReportImageDeps => ({ enforce: async () => ({ allowed: true }), audit: e => { audits.push(e); }, now: () => '2026-10-30T21:00:00Z', ...over });
const OPEN = { signed: false, amendmentOpen: false };
const gross = (id = 'g1'): PlacementItem => ({ origin: { kind: 'caseAsset', assetId: id }, imageUrl: `https://imaging.hospital.org/${id}.png`, imageType: 'Gross Specimen', mimeType: 'image/png', sourceSystemId: 'imaging.hospital.org', caption: 'Opened colon' });
const doc: PlacementItem = { origin: { kind: 'attachment', attachmentId: 'att1' }, imageUrl: '', imageType: 'Other', mimeType: 'application/pdf', sourceSystemId: 'demo', caption: 'Outside consult' };
const insert = (items: PlacementItem[], section: { id: string; label: string } | null, reportState = OPEN, d = deps()) =>
  insertIntoReport({ caseId: 'C1', accession: 'S26-4680', facilityId: null, items, section, user: 'Dr J', reportState }, d);

async function basePdf(): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf.addPage([595, 842]).drawText('Report', { x: 50, y: 700, size: 14, font });
  return pdf.save();
}

beforeEach(() => { resetCaseReportImagesForTests(); audits.length = 0; });

describe('insertIntoReport', () => {
  it('places ticked items in a section, and moves one placed again (never twice)', async () => {
    expect(await insert([gross(), doc], { id: 'gross', label: 'Gross Description' })).toEqual({ ok: true, placed: 2 });
    expect(listCaseReportImages({ caseId: 'C1' }).map(i => [i.sectionId, i.mimeType, i.origin?.kind])).toEqual([['gross', 'image/png', 'caseAsset'], ['gross', 'application/pdf', 'attachment']]);
    expect(audits[0].detail).toBe('2 item(s) placed in the report under "Gross Description".');
    expect(audits[0].detail).not.toContain('Opened colon');
    await insert([{ ...gross(), caption: 'New caption' }], { id: 'micro', label: 'Microscopic Description' });
    const all = listCaseReportImages({ caseId: 'C1' });
    expect(all).toHaveLength(2);
    expect(all[0]).toMatchObject({ sectionId: 'micro', sectionLabel: 'Microscopic Description', caption: 'New caption' });
    expect(isAttachmentInReport('att1')).toBe(true);
  });

  it('with no section (the cytology report), prints on its own page after the report as before', async () => {
    await insert([gross()], null);
    const [p] = listCaseReportImages({ caseId: 'C1' });
    expect(p.sectionId).toBeUndefined();
    expect(isDrawnInSection(p)).toBe(false);
    expect(audits[0].detail).toContain('after the report');
  });

  it('a signed report takes and loses nothing without an amendment or addendum in progress', async () => {
    expect(reportEditProblem({ signed: true, amendmentOpen: false })).toBe('signedNeedsAmendment');
    expect(await insert([gross()], { id: 'gross', label: 'G' }, { signed: true, amendmentOpen: false })).toEqual({ ok: false, reason: 'signedNeedsAmendment' });
    expect(await insert([gross()], { id: 'gross', label: 'G' }, { signed: true, amendmentOpen: true })).toEqual({ ok: true, placed: 1 });
    const [p] = listCaseReportImages({ caseId: 'C1' });
    expect(await takeOutOfReport(p.id, 'Dr J', null, { signed: true, amendmentOpen: false }, deps())).toEqual({ ok: false, reason: 'signedNeedsAmendment' });
    expect(await takeOutOfReport(p.id, 'Dr J', null, OPEN, deps())).toEqual({ ok: true });
    expect(listCaseReportImages({ caseId: 'C1' })).toHaveLength(0);
  });

  it('on an Assist case (the LIS writes the report) places nothing, but can clear an older placement', async () => {
    const ASSIST = { signed: false, amendmentOpen: false, lisOwnsReport: true };
    expect(reportEditProblem(ASSIST)).toBe('assistCase');
    expect(await insert([gross()], { id: 'report-end', label: 'End' }, ASSIST)).toEqual({ ok: false, reason: 'assistCase' });
    await insert([gross()], null);
    const [p] = listCaseReportImages({ caseId: 'C1' });
    expect(await takeOutOfReport(p.id, 'Dr J', null, ASSIST, deps())).toEqual({ ok: true });
  });

  it('checks the permission, the limit and that something was ticked', async () => {
    expect(await insert([gross()], null, OPEN, deps({ enforce: async () => ({ allowed: false }) }))).toEqual({ ok: false, reason: 'notPermitted' });
    expect(await insert([], null)).toEqual({ ok: false, reason: 'nothingChosen' });
    const many = Array.from({ length: MAX_REPORT_IMAGES + 1 }, (_, i) => gross(`g${i}`));
    expect(await insert(many, null)).toEqual({ ok: false, reason: 'tooMany' });
  });
});

describe('the report PDF', () => {
  it('sends section images to the renderer as bytes and size; unreachable ones as unavailable; documents by name', async () => {
    await insert([gross('ok'), gross('missing'), doc], { id: 'gross', label: 'Gross Description' });
    await insert([gross('after')], null);
    const payload = await reportSectionImagesFor({ caseId: 'C1' }, {
      fetchUrl: async i => i.imageUrl || null,
      fetchBytes: async url => (url.includes('/ok.') ? RED_PNG : null),
    });
    expect(payload.map(p => [p.kind, p.sectionId, p.caption])).toEqual([['image', 'gross', 'Opened colon'], ['unavailable', 'gross', 'Opened colon'], ['document', 'gross', 'Outside consult']]);
    expect(payload[0]).toMatchObject({ format: 'png', widthPx: 1, heightPx: 1, imageBase64: bytesToBase64(RED_PNG) });
  });

  it('leaves section images to the renderer; documents and unplaced images still follow the report', async () => {
    await insert([gross('in')], { id: 'gross', label: 'G' });
    const before = await basePdf();
    const onlyInline = await applyCaseReportImagesToPdf({ caseId: 'C1' }, before, { fetchUrl: async i => i.imageUrl });
    expect(onlyInline.bytes).toBe(before);
    await insert([gross('after')], null);
    const out = await applyCaseReportImagesToPdf({ caseId: 'C1' }, before, {
      fetchUrl: async i => i.imageUrl, fetchBytes: async () => ({ result: { outcome: 'success' }, bytes: RED_PNG }),
    });
    expect(out.embedded).toBe(1);
    expect((await PDFDocument.load(out.bytes)).getPageCount()).toBe(2);
  });

  it("an attached PDF placed in a section is named there and its pages follow the report (read through its read link)", async () => {
    await insert([doc], { id: 'gross', label: 'G' });
    const two = await PDFDocument.create(); two.addPage(); two.addPage();
    const bytes = await two.save();
    const out = await applyCaseReportImagesToPdf({ caseId: 'C1' }, await basePdf(), {
      fetchUrl: async () => 'blob:http://127.0.0.1:5173/no-extension', fetchBytes: async () => ({ result: { outcome: 'success' }, bytes }),
    });
    expect((await PDFDocument.load(out.bytes)).getPageCount()).toBe(3);
  });

  it('a placement that cannot be reached prints Image Unavailable, never the page itself', async () => {
    await insert([{ ...gross('x'), imageUrl: '' }], null);
    let fetched = '';
    const out = await applyCaseReportImagesToPdf({ caseId: 'C1' }, await basePdf(), {
      fetchUrl: async () => null, fetchBytes: async url => { fetched = url; return { result: { outcome: 'error' } }; },
    });
    expect(fetched).toBe('unavailable:');
    expect(out.failed).toBe(false);
    expect((await PDFDocument.load(out.bytes)).getPageCount()).toBe(2);
  });
});
