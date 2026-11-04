// Batch 742 (Pete, Case Image & File Attachments, Release 1): Attach External File through the storage adapter,
// links, Remove from case. Only pointers are kept; the audit log never names the file.
import { beforeEach, describe, expect, it } from 'vitest';
import {
  addAttachmentLink, attachExternalFile, CASE_ATTACHMENTS_KEY, listCaseAttachments, resetCaseAttachmentsForTests,
  subscribeCaseAttachments, unlinkAttachment, type CaseAttachmentDeps,
} from './caseAttachments';
import { mockAttachmentStorageService, resetMockAttachmentStorageForTests, DEMO_ATTACHMENT_STORAGE_ID } from './mockAttachmentStorageService';
import type { IAttachmentStorageService } from './IAttachmentStorageService';
import { storageGet } from '../mockStorage';

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a, 0x25, 0x25, 0x45, 0x4f, 0x46]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const DOCX = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]);
const file = (bytes: Uint8Array, name: string, type = '') => new File([bytes as BlobPart], name, { type });

const audits: { event: string; detail: string }[] = [];
const keys: string[] = [];
const makeDeps = (over: Partial<CaseAttachmentDeps> = {}): CaseAttachmentDeps => ({
  enforce: async key => { keys.push(key); return { allowed: true }; },
  storage: async () => mockAttachmentStorageService,
  audit: e => { audits.push(e); },
  now: () => '2026-10-30T21:00:00.000Z',
  isInReport: async () => false,
  ...over,
});
const upload = (f: File, deps = makeDeps()) => attachExternalFile({ caseId: 'C1', accession: 'S26-4680', facilityId: 'F1', file: f, user: 'Dr Sarah Johnson' }, deps);

beforeEach(() => { resetCaseAttachmentsForTests(); resetMockAttachmentStorageForTests(); audits.length = 0; keys.length = 0; });

describe('attachExternalFile', () => {
  it('sends the bytes through the adapter and keeps only the pointer it hands back', async () => {
    const out = await upload(file(PDF, 'Brennick Walter outside report.pdf', 'application/pdf'));
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.attachment).toMatchObject({
      caseId: 'C1', accession: 'S26-4680', sourceType: 'external_link', origin: 'upload', mimeType: 'application/pdf',
      fileName: 'Brennick Walter outside report.pdf', fileSizeBytes: PDF.length, sourceSystemId: DEMO_ATTACHMENT_STORAGE_ID, status: 'linked',
    });
    expect(out.attachment.pointer.kind).toBe('objectKey');
    expect(out.attachment.sha256).toMatch(/^[0-9a-f]{64}$/);
    // The object key names no patient, and no bytes are stored on the record.
    const stored = storageGet<unknown[]>(CASE_ATTACHMENTS_KEY, []);
    expect(JSON.stringify(stored)).not.toMatch(/data:|base64/);
    if (out.attachment.pointer.kind === 'objectKey') expect(out.attachment.pointer.objectKey).not.toContain('Brennick');
    expect(keys).toEqual(['case:attachment:upload']);
  });

  it('can be read back through a fresh read link (the demo keeps the bytes in this tab only)', async () => {
    const out = await upload(file(PNG, 'gross.png'));
    if (!out.ok || out.attachment.pointer.kind !== 'objectKey') throw new Error('upload failed');
    const link = await mockAttachmentStorageService.getReadLink(out.attachment.pointer, 'view');
    expect(link.ok).toBe(true);
    resetMockAttachmentStorageForTests();
    expect((await mockAttachmentStorageService.getReadLink(out.attachment.pointer, 'view')).ok).toBe(false);
  });

  it('writes an audit entry with the type, size and storage, never the file name', async () => {
    await upload(file(PDF, 'Brennick Walter.pdf'));
    expect(audits).toHaveLength(1);
    expect(audits[0].event).toBe('Case Attachment Uploaded');
    expect(audits[0].detail).toContain('application/pdf');
    expect(audits[0].detail).toContain(DEMO_ATTACHMENT_STORAGE_ID);
    expect(audits[0].detail).not.toContain('Brennick');
  });

  it('takes the type from the bytes: a JPEG named .png is a JPEG, a Word file renamed .pdf is refused', async () => {
    const jpeg = await upload(file(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]), 'photo.png'));
    expect(jpeg.ok && jpeg.attachment.mimeType).toBe('image/jpeg');
    expect(await upload(file(DOCX, 'renamed.pdf'))).toEqual({ ok: false, problem: 'unsupportedType' });
  });

  it('asks for a Word document to be saved as PDF (no conversion), and refuses an empty file', async () => {
    expect(await upload(file(DOCX, 'Consult letter.docx'))).toEqual({ ok: false, problem: 'wordDocument' });
    expect(await upload(file(new Uint8Array(), 'empty.pdf'))).toEqual({ ok: false, problem: 'empty' });
    expect(listCaseAttachments({ caseId: 'C1' })).toHaveLength(0);
    expect(audits).toHaveLength(0);
  });

  it('stops without the permission, before any byte is read or sent', async () => {
    let asked = false;
    const deps = makeDeps({ enforce: async () => ({ allowed: false }), storage: async () => { asked = true; return mockAttachmentStorageService; } });
    expect(await upload(file(PDF, 'a.pdf'), deps)).toEqual({ ok: false, problem: 'notPermitted' });
    expect(asked).toBe(false);
  });

  it('passes on what the adapter says: not set up, over its limit, refused at completion', async () => {
    const adapter = (over: Partial<IAttachmentStorageService>): IAttachmentStorageService => ({ ...mockAttachmentStorageService, ...over });
    expect(await upload(file(PDF, 'a.pdf'), makeDeps({ storage: async () => adapter({ requestDestination: async () => ({ ok: false, error: 'notConfigured' }) }) })))
      .toEqual({ ok: false, problem: 'notConfigured' });
    const small = adapter({ requestDestination: async r => { const d = await mockAttachmentStorageService.requestDestination(r); return d.ok ? { ok: true, data: { ...d.data, maxBytes: 4 } } : d; } });
    expect(await upload(file(PDF, 'a.pdf'), makeDeps({ storage: async () => small }))).toEqual({ ok: false, problem: 'tooLarge' });
    expect(await upload(file(PDF, 'a.pdf'), makeDeps({ storage: async () => adapter({ completeUpload: async () => ({ ok: false, error: 'refused' }) }) })))
      .toEqual({ ok: false, problem: 'refused' });
    expect(await upload(file(PDF, 'a.pdf'), makeDeps({ storage: async () => adapter({ transfer: async () => ({ ok: false, error: 'SOMETHING_ELSE' }) }) })))
      .toEqual({ ok: false, problem: 'unavailable' });
    expect(listCaseAttachments({ caseId: 'C1' })).toHaveLength(0);
  });

  it('keeps a permanent URL when the adapter hands one back instead of an object key', async () => {
    const adapter: IAttachmentStorageService = { ...mockAttachmentStorageService, completeUpload: async () => ({ ok: true, data: { pointer: { kind: 'url', url: 'https://vna.hospital.org/obj/9' }, sourceSystemId: 'vna.hospital.org' } }) };
    const out = await upload(file(PDF, 'a.pdf'), makeDeps({ storage: async () => adapter }));
    expect(out.ok && out.attachment.pointer).toEqual({ kind: 'url', url: 'https://vna.hospital.org/obj/9' });
  });
});

describe('addAttachmentLink', () => {
  it('keeps an https link with its host, and refuses anything else or a repeat', async () => {
    const out = await addAttachmentLink({ caseId: 'C1', accession: 'S26-4680', facilityId: null, url: ' https://imaging.hospital.org/s26-4680/gross.jpg ', user: 'Dr A' }, makeDeps());
    expect(out.ok && out.attachment).toMatchObject({ origin: 'link', mimeType: 'image/jpeg', sourceSystemId: 'imaging.hospital.org', pointer: { kind: 'url', url: 'https://imaging.hospital.org/s26-4680/gross.jpg' } });
    expect(audits[0].detail).toBe('Link to imaging.hospital.org attached to the case.');
    for (const url of ['http://imaging.hospital.org/a.jpg', 'file:///Z:/pathology/a.jpg', '\\\\hospital-nas\\pathology\\a.jpg']) {
      expect(await addAttachmentLink({ caseId: 'C1', accession: 'S', facilityId: null, url, user: 'A' }, makeDeps())).toEqual({ ok: false, problem: 'invalidLink' });
    }
    expect(await addAttachmentLink({ caseId: 'C1', accession: 'S', facilityId: null, url: 'https://imaging.hospital.org/s26-4680/gross.jpg', user: 'A' }, makeDeps()))
      .toEqual({ ok: false, problem: 'duplicate' });
    const pdf = await addAttachmentLink({ caseId: 'C1', accession: 'S', facilityId: null, url: 'https://dms.hospital.org/doc/1.pdf?v=2', user: 'A' }, makeDeps());
    expect(pdf.ok && pdf.attachment.mimeType).toBe('application/pdf');
    expect(keys).toEqual(['case:attachment:link', 'case:attachment:link', 'case:attachment:link', 'case:attachment:link', 'case:attachment:link', 'case:attachment:link']);
  });
});

describe('unlinkAttachment', () => {
  it('unlinks only: the record stays (unlinked) and the stored file is not deleted', async () => {
    const out = await upload(file(PDF, 'a.pdf'));
    if (!out.ok || out.attachment.pointer.kind !== 'objectKey') throw new Error('upload failed');
    let changes = 0;
    const off = subscribeCaseAttachments(() => { changes++; });
    expect(await unlinkAttachment(out.attachment.id, 'Dr A', null, makeDeps())).toEqual({ ok: true });
    off();
    expect(changes).toBe(1);
    expect(listCaseAttachments({ caseId: 'C1' })).toHaveLength(0);
    const kept = storageGet<{ id: string; status: string; unlinkedBy?: string }[]>(CASE_ATTACHMENTS_KEY, []);
    expect(kept.find(r => r.id === out.attachment.id)).toMatchObject({ status: 'unlinked', unlinkedBy: 'Dr A' });
    expect((await mockAttachmentStorageService.getReadLink(out.attachment.pointer, 'view')).ok).toBe(true);
    expect(audits[audits.length - 1]?.detail).toContain('the stored file was not deleted');
  });

  it('is refused while the attachment is placed in the report, and without the permission', async () => {
    const out = await upload(file(PDF, 'a.pdf'));
    if (!out.ok) throw new Error('upload failed');
    expect(await unlinkAttachment(out.attachment.id, 'A', null, makeDeps({ isInReport: async () => true }))).toEqual({ ok: false, problem: 'inReport' });
    expect(await unlinkAttachment(out.attachment.id, 'A', null, makeDeps({ enforce: async () => ({ allowed: false }) }))).toEqual({ ok: false, problem: 'notPermitted' });
    expect(await unlinkAttachment('nope', 'A', null, makeDeps())).toEqual({ ok: false, problem: 'notFound' });
    expect(listCaseAttachments({ caseId: 'C1' })).toHaveLength(1);
  });
});
