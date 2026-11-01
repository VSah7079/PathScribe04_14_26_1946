// Batch 742: which files Attach External File takes (Pete: PDF, JPG, PNG; no .docx), and the size warning.
import { describe, expect, it } from 'vitest';
import {
  checkAttachmentFile, DEFAULT_ATTACHMENT_WARN_BYTES, isOverWarningSize, looksLikeWordFile, megabytes, mimeTypeFromName, sha256Hex, sniffAttachmentType,
} from './attachmentFiles';

const head = (...b: number[]) => new Uint8Array(b);

describe('attachment file rules', () => {
  it('reads the type from the first bytes', () => {
    expect(sniffAttachmentType(head(0x25, 0x50, 0x44, 0x46))).toBe('application/pdf');
    expect(sniffAttachmentType(head(0xff, 0xd8, 0xff, 0xdb))).toBe('image/jpeg');
    expect(sniffAttachmentType(head(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe('image/png');
    expect(sniffAttachmentType(head(0x50, 0x4b, 0x03, 0x04))).toBeNull(); // a .docx is a zip
    expect(sniffAttachmentType(head(0x47, 0x49, 0x46))).toBeNull();        // GIF is not taken
  });

  it('explains a Word file, refuses anything else, and honours the destination limit', () => {
    expect(checkAttachmentFile({ name: 'letter.DOCX', size: 10 }, head(0x50, 0x4b))).toEqual({ ok: false, problem: 'wordDocument' });
    expect(checkAttachmentFile({ name: 'scan.tiff', size: 10 }, head(0x49, 0x49))).toEqual({ ok: false, problem: 'unsupportedType' });
    expect(checkAttachmentFile({ name: 'a.pdf', size: 0 }, head())).toEqual({ ok: false, problem: 'empty' });
    expect(checkAttachmentFile({ name: 'a.pdf', size: 50 }, head(0x25, 0x50, 0x44, 0x46), 40)).toEqual({ ok: false, problem: 'tooLarge' });
    expect(checkAttachmentFile({ name: 'a.pdf', size: 50 }, head(0x25, 0x50, 0x44, 0x46))).toEqual({ ok: true, mimeType: 'application/pdf' });
    expect(looksLikeWordFile('notes.rtf')).toBe(true);
    expect(looksLikeWordFile('notes.pdf')).toBe(false);
  });

  it('warns over 25 MB, or over the figure the adapter gives', () => {
    expect(DEFAULT_ATTACHMENT_WARN_BYTES).toBe(25 * 1024 * 1024);
    expect(isOverWarningSize(25 * 1024 * 1024)).toBe(false);
    expect(isOverWarningSize(25 * 1024 * 1024 + 1)).toBe(true);
    expect(isOverWarningSize(11, 10)).toBe(true);
    expect(megabytes(26_214_400)).toBe(25);
  });

  it('takes a link type from its name, ignoring a query', () => {
    expect(mimeTypeFromName('https://dms.org/x/report.PDF?v=1')).toBe('application/pdf');
    expect(mimeTypeFromName('https://ims.org/view/12345')).toBeNull();
  });

  it('hashes the bytes with SHA-256 in lower-case hex', async () => {
    expect(await sha256Hex(new TextEncoder().encode('abc').buffer as ArrayBuffer)).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});
