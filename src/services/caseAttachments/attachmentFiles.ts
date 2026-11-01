// src/services/caseAttachments/attachmentFiles.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 742: which files Attach External File takes (Pete, Oct 30, 2026: PDF, JPG and PNG only; a Word file is saved
// as PDF first, with no conversion in the browser), the size warning, and the SHA-256 the adapter checks. Pure,
// except sha256Hex, which uses the browser's own crypto.
//
// The type is read from the file's first bytes as well as its name, so a Word file renamed .pdf is refused here
// rather than by the adapter, and a JPEG named .png is still taken as a JPEG.
// ─────────────────────────────────────────────────────────────────────────────

import type { AttachmentMimeType } from '@/types/caseAttachments/CaseAttachment';

/** What the file picker offers (the OS picker reaches local folders and mapped network shares alike). */
export const ATTACHMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';
export const DEFAULT_ATTACHMENT_WARN_BYTES = 25 * 1024 * 1024;

const BY_EXTENSION: Record<string, AttachmentMimeType> = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' };

export type FileProblem = 'wordDocument' | 'unsupportedType' | 'empty' | 'tooLarge';

/** The file's type from its first bytes: %PDF, the JPEG start-of-image marker, or the PNG signature. Pure. */
export function sniffAttachmentType(head: Uint8Array): AttachmentMimeType | null {
  if (head.length >= 4 && head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46) return 'application/pdf';
  if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'image/jpeg';
  if (head.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => head[i] === b)) return 'image/png';
  return null;
}

const extensionOf = (name: string) => (/\.([a-z0-9]+)$/i.exec(name.trim())?.[1] ?? '').toLowerCase();

/** A Word file, by name (so the screen can say to save it as PDF rather than only "not supported"). Pure. */
export const looksLikeWordFile = (name: string) => ['doc', 'docx', 'dot', 'dotx', 'rtf', 'odt'].includes(extensionOf(name));

/**
 * The file's type, or why it can't be attached. The bytes decide; the name is only used to explain a refusal.
 * `maxBytes` is the destination's own limit when the adapter has one. Pure.
 */
export function checkAttachmentFile(file: { name: string; size: number }, head: Uint8Array, maxBytes?: number): { ok: true; mimeType: AttachmentMimeType } | { ok: false; problem: FileProblem } {
  if (file.size <= 0) return { ok: false, problem: 'empty' };
  if (maxBytes && file.size > maxBytes) return { ok: false, problem: 'tooLarge' };
  const sniffed = sniffAttachmentType(head);
  if (sniffed) return { ok: true, mimeType: sniffed };
  if (looksLikeWordFile(file.name)) return { ok: false, problem: 'wordDocument' };
  return { ok: false, problem: 'unsupportedType' };
}

/** The type a file's name suggests (for a typed link, which has no bytes yet). Pure. */
export function mimeTypeFromName(name: string): AttachmentMimeType | null {
  const path = name.split('?')[0].split('#')[0];
  return BY_EXTENSION[extensionOf(path)] ?? null;
}

/** True when the file is over the size the screen warns at (the adapter's figure, or 25 MB). Pure. */
export const isOverWarningSize = (bytes: number, warnAtBytes?: number) => bytes > (warnAtBytes && warnAtBytes > 0 ? warnAtBytes : DEFAULT_ATTACHMENT_WARN_BYTES);

/** Megabytes to one decimal, for the warning text. Pure. */
export const megabytes = (bytes: number) => Math.round((bytes / (1024 * 1024)) * 10) / 10;

/** SHA-256 of the bytes, lower-case hex. */
export async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** The first bytes of a file, enough for sniffAttachmentType. */
export async function readHead(file: Blob, length = 16): Promise<Uint8Array> {
  return new Uint8Array(await file.slice(0, length).arrayBuffer());
}
