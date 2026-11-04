// Batch 609 (PS-44): the images linked to a case's report, and putting them into its PDF.
// PathScribe stores no images (Pete, Oct 13, 2026): only the link is kept.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import {
  attachCaseReportImage, removeCaseReportImage, listCaseReportImages, applyCaseReportImagesToPdf, applyCaseReportImagesToBlob,
  resetCaseReportImagesForTests, subscribeCaseReportImages, MAX_REPORT_IMAGES, CASE_REPORT_IMAGES_KEY, CASE_IMAGES_FAILED,
  type CaseReportImageDeps,
} from './caseReportImages';
import { storageGet } from '../mockStorage';

const RED_PNG = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'));
const LINK = 'https://imaging.hospital.org/gross/12345.png';

const audits: Array<{ event: string; detail: string; user: string; caseId: string }> = [];
const makeDeps = (over: Partial<CaseReportImageDeps> = {}): CaseReportImageDeps => ({
  enforce: async () => ({ allowed: true }),
  audit: entry => { audits.push(entry); },
  now: (() => { let n = 0; return () => `2026-10-18T08:00:${String(n++).padStart(2, '0')}Z`; })(),
  ...over,
});
const served = (bytes: Uint8Array = RED_PNG) => async () => ({ result: { outcome: 'success' as const }, bytes });

async function basePdf(pages = 1): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pages; i++) doc.addPage([595, 842]).drawText(`Report page ${i + 1}`, { x: 50, y: 700, size: 14, font });
  return doc.save();
}
const pageCount = async (bytes: Uint8Array) => (await PDFDocument.load(bytes)).getPageCount();
const input = (over: Record<string, unknown> = {}) => ({ caseId: 'C1', accession: 'S26-0001', url: LINK, imageType: 'Gross Specimen', user: 'Dr A', ...over });

beforeEach(() => { resetCaseReportImagesForTests(); audits.length = 0; });

describe('attachCaseReportImage', () => {
  it('keeps a record of the link, its type and caption, and nothing else about the image', async () => {
    const result = await attachCaseReportImage(input({ url: `  ${LINK}  `, caption: '  Left   breast  ' }), makeDeps());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.image).toMatchObject({
      caseId: 'C1', accession: 'S26-0001', imageType: 'Gross Specimen', caption: 'Left breast',
      imageUrl: LINK, sourceSystemId: 'imaging.hospital.org', attachedBy: 'Dr A',
    });
    expect(Object.keys(result.image).sort()).toEqual(['accession', 'attachedAt', 'attachedBy', 'caption', 'caseId', 'id', 'imageType', 'imageUrl', 'sourceSystemId']);
    expect(listCaseReportImages({ caseId: 'C1' })).toHaveLength(1);
  });

  it('accepts only an https link to a named server: no file, data URL, http, sign-in in the link, or single-word host', async () => {
    for (const url of ['', 'photo.png', 'http://imaging.hospital.org/a.png', 'data:image/png;base64,AAAA', 'file:///C:/a.png', 'https://user:pw@imaging.hospital.org/a.png', 'https://intranet/a.png']) {
      expect(await attachCaseReportImage(input({ url }), makeDeps()), url).toEqual({ ok: false, reason: 'invalidLink' });
    }
    expect(listCaseReportImages({ caseId: 'C1' })).toHaveLength(0);
  });

  it('refuses the same link twice for a report, and a thirteenth image', async () => {
    expect((await attachCaseReportImage(input(), makeDeps())).ok).toBe(true);
    expect(await attachCaseReportImage(input(), makeDeps())).toEqual({ ok: false, reason: 'duplicate' });
    for (let i = 1; i < MAX_REPORT_IMAGES; i++) expect((await attachCaseReportImage(input({ url: `https://imaging.hospital.org/${i}.png` }), makeDeps())).ok).toBe(true);
    expect(await attachCaseReportImage(input({ url: 'https://imaging.hospital.org/extra.png' }), makeDeps())).toEqual({ ok: false, reason: 'tooMany' });
    expect(listCaseReportImages({ caseId: 'C1' })).toHaveLength(MAX_REPORT_IMAGES);
    // Another report may link the same image.
    expect((await attachCaseReportImage(input({ caseId: 'C2', accession: 'S26-0002' }), makeDeps())).ok).toBe(true);
  });

  it('checks report:case-images:attach for the case and its facility, and links nothing without it', async () => {
    const enforce = vi.fn(async () => ({ allowed: false }));
    expect(await attachCaseReportImage(input({ facilityId: 'F1' }), makeDeps({ enforce }))).toEqual({ ok: false, reason: 'notPermitted' });
    expect(enforce).toHaveBeenCalledWith({ caseId: 'C1', facilityId: 'F1' });
    expect(listCaseReportImages({ caseId: 'C1' })).toHaveLength(0);
    expect(audits).toHaveLength(0);
  });

  it('writes an audit entry naming the host only: not the link path (it can hold an accession) and not the caption', async () => {
    await attachCaseReportImage(input({ url: 'https://imaging.hospital.org/S26-0001/jane-doe.png', caption: 'Jane Doe left breast' }), makeDeps());
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({ event: 'Report Image Linked', user: 'Dr A', caseId: 'C1' });
    expect(audits[0].detail).toContain('imaging.hospital.org');
    expect(audits[0].detail).not.toMatch(/Jane|Doe|breast|S26|jane-doe/);
  });

  it('an unknown image type is kept as Other', async () => {
    const result = await attachCaseReportImage(input({ imageType: 'Selfie' }), makeDeps());
    expect(result.ok && result.image.imageType).toBe('Other');
  });

  it('keeps the records across a reload, and tells subscribers', async () => {
    const seen = vi.fn();
    const stop = subscribeCaseReportImages(seen);
    await attachCaseReportImage(input(), makeDeps());
    expect(seen).toHaveBeenCalled();
    expect(storageGet<unknown[]>(CASE_REPORT_IMAGES_KEY, [])).toHaveLength(1);
    stop();
  });
});

describe('removeCaseReportImage', () => {
  it('takes the link off and audits it', async () => {
    const attached = await attachCaseReportImage(input(), makeDeps());
    if (!attached.ok) throw new Error('not attached');
    expect(await removeCaseReportImage(attached.image.id, 'Dr A', null, makeDeps())).toEqual({ ok: true });
    expect(listCaseReportImages({ caseId: 'C1' })).toHaveLength(0);
    expect(audits.map(a => a.event)).toEqual(['Report Image Linked', 'Report Image Unlinked']);
  });
  it('is refused without the capability and says when the image is not there', async () => {
    const attached = await attachCaseReportImage(input(), makeDeps());
    if (!attached.ok) throw new Error('not attached');
    expect(await removeCaseReportImage(attached.image.id, 'Dr A', null, makeDeps({ enforce: async () => ({ allowed: false }) }))).toEqual({ ok: false, reason: 'notPermitted' });
    expect(listCaseReportImages({ caseId: 'C1' })).toHaveLength(1);
    expect(await removeCaseReportImage('nope', 'Dr A', null, makeDeps())).toEqual({ ok: false, reason: 'notFound' });
  });
});

describe('listCaseReportImages', () => {
  it('finds a report\'s images by case or by accession, oldest first, and no one else\'s', async () => {
    await attachCaseReportImage(input({ caption: 'one', url: 'https://imaging.hospital.org/1.png' }), makeDeps());
    await attachCaseReportImage(input({ caseId: 'C2', accession: 'S26-0002', caption: 'other' }), makeDeps());
    await attachCaseReportImage(input({ caption: 'two', url: 'https://imaging.hospital.org/2.png' }), makeDeps());
    expect(listCaseReportImages({ caseId: 'C1' }).map(i => i.caption)).toEqual(['one', 'two']);
    expect(listCaseReportImages({ accession: 'S26-0001' }).map(i => i.caption)).toEqual(['one', 'two']);
    expect(listCaseReportImages({ caseId: 'C9', accession: 'S26-0002' }).map(i => i.caption)).toEqual(['other']);
    expect(listCaseReportImages({})).toEqual([]);
  });
});

describe('applyCaseReportImagesToPdf', () => {
  it('returns a report with no linked images exactly as it is, without loading the PDF library', async () => {
    const pdf = await basePdf();
    const embed = vi.fn();
    const out = await applyCaseReportImagesToPdf({ caseId: 'C1' }, pdf, { embed });
    expect(out).toEqual({ bytes: pdf, embedded: 0, warnings: [], failed: false });
    expect(out.bytes).toBe(pdf);
    expect(embed).not.toHaveBeenCalled();
  });

  it('fetches each link and adds its image on its own page after the report\'s pages, flagging one under 300 DPI', async () => {
    await attachCaseReportImage(input({ caption: 'Gross view of the specimen' }), makeDeps());
    await attachCaseReportImage(input({ url: 'https://imaging.hospital.org/2.png', imageType: 'Microphotograph' }), makeDeps());
    const fetchBytes = vi.fn((_url: string) => served()());
    const out = await applyCaseReportImagesToPdf({ caseId: 'C1' }, await basePdf(2), { fetchBytes });
    expect(fetchBytes.mock.calls.map(c => c[0])).toEqual([LINK, 'https://imaging.hospital.org/2.png']);
    expect(out.failed).toBe(false);
    expect(out.embedded).toBe(2);
    expect(await pageCount(out.bytes)).toBe(4);
    expect(out.warnings[0]).toContain('below the 300 DPI minimum'); // a 1 pixel image
  });

  it('prints the "Image Unavailable" page for a link that cannot be fetched, never dropping it', async () => {
    await attachCaseReportImage(input(), makeDeps());
    const out = await applyCaseReportImagesToPdf({ caseId: 'C1' }, await basePdf(1), { fetchBytes: async () => ({ result: { outcome: 'error', statusCode: 404 } }) });
    expect(out.failed).toBe(false);
    expect(await pageCount(out.bytes)).toBe(2);
  });

  it('never throws: a failure returns the report as the renderer made it, marked failed', async () => {
    await attachCaseReportImage(input(), makeDeps());
    const pdf = await basePdf();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const out = await applyCaseReportImagesToPdf({ caseId: 'C1' }, pdf, { embed: async () => { throw new Error('boom'); } });
    expect(out).toEqual({ bytes: pdf, embedded: 0, warnings: [], failed: true });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
    expect(CASE_IMAGES_FAILED).toMatch(/could not be added/);
  });

  it('keeps the report\'s own metadata (producer, the template mark) as the renderer wrote it', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([595, 842]);
    doc.setKeywords(['pathscribe-template:cytology']);
    doc.setProducer('PathScribe report renderer');
    const pdf = await doc.save({ useObjectStreams: false });
    await attachCaseReportImage(input(), makeDeps());
    const out = await applyCaseReportImagesToPdf({ caseId: 'C1' }, pdf, { fetchBytes: served() });
    const reloaded = await PDFDocument.load(out.bytes, { updateMetadata: false });
    expect(reloaded.getKeywords()).toBe('pathscribe-template:cytology');
    expect(reloaded.getProducer()).toBe('PathScribe report renderer');
  });
});

describe('applyCaseReportImagesToBlob', () => {
  it('returns the same Blob when nothing is linked, and a longer PDF when something is', async () => {
    const blob = new Blob([await basePdf()] as BlobPart[], { type: 'application/pdf' });
    expect(await applyCaseReportImagesToBlob({ caseId: 'C1' }, blob)).toEqual({ blob, failed: false });
    await attachCaseReportImage(input(), makeDeps());
    const out = await applyCaseReportImagesToBlob({ caseId: 'C1' }, blob, { fetchBytes: served() });
    expect(out.failed).toBe(false);
    expect(out.blob).not.toBe(blob);
    expect(out.blob.type).toBe('application/pdf');
    expect(await pageCount(new Uint8Array(await out.blob.arrayBuffer()))).toBe(2);
  });
  it('reports a failure and hands back the original', async () => {
    const blob = new Blob([await basePdf()] as BlobPart[], { type: 'application/pdf' });
    await attachCaseReportImage(input(), makeDeps());
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const out = await applyCaseReportImagesToBlob({ caseId: 'C1' }, blob, { embed: async () => { throw new Error('x'); } });
    expect(out).toEqual({ blob, failed: true });
    warn.mockRestore();
  });
});
