// src/services/caseAttachments/mockAttachmentStorageService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 742: the demo's stand-in for the storage adapter (IAttachmentStorageService.ts). It plays a "direct" site
// (a pre-signed upload to the hospital's bucket) and keeps the bytes in this browser tab's memory only, under an
// object key that names no patient. Nothing is written to browser storage (CLAUDE.md rule 4), so after a reload the
// pointer is still on the case but the file is gone: the screen says the file can't be reached, and a report made
// then prints the Image Unavailable notice. That is the demo's limit, not the product's.
// ─────────────────────────────────────────────────────────────────────────────

import type { ServiceResult } from '../types';
import type { IAttachmentStorageService, ReadLink, StoredAttachment, UploadDestination } from './IAttachmentStorageService';

export const DEMO_ATTACHMENT_STORAGE_ID = 'demo-attachment-storage';
const SCHEME = 'demo-storage:';
const TICKET_MINUTES = 15;
const READ_LINK_MINUTES = 15;
export const DEFAULT_WARN_AT_BYTES = 25 * 1024 * 1024;

const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const err = (error: string): ServiceResult<never> => ({ ok: false, error });

interface Ticket { objectKey: string; contentType: string; byteLength: number; expiresAt: number; received?: Blob }

const tickets = new Map<string, Ticket>();
const objects = new Map<string, Blob>();
const readUrls = new Map<string, string>();
let seq = 0;

const objectKeyFor = (now: Date) => {
  const id = `${now.getTime().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return `demo-tenant/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${id}`;
};

export const mockAttachmentStorageService: IAttachmentStorageService = {
  async requestDestination(req) {
    const now = new Date();
    const ticketId = `tkt-${now.getTime().toString(36)}-${(seq++).toString(36)}`;
    const expiresAt = now.getTime() + TICKET_MINUTES * 60_000;
    tickets.set(ticketId, { objectKey: objectKeyFor(now), contentType: req.contentType, byteLength: req.byteLength, expiresAt });
    const destination: UploadDestination = {
      ticketId, mode: 'direct', method: 'PUT', uploadUrl: `${SCHEME}${ticketId}`,
      headers: { 'Content-Type': req.contentType }, expiresAt: new Date(expiresAt).toISOString(), warnAtBytes: DEFAULT_WARN_AT_BYTES,
    };
    return ok(destination);
  },

  async transfer(destination, file) {
    const ticket = tickets.get(destination.uploadUrl.slice(SCHEME.length));
    if (!ticket) return err('expired');
    if (Date.now() > ticket.expiresAt) return err('expired');
    if (file.size !== ticket.byteLength) return err('refused');
    ticket.received = file;
    return { ok: true, data: undefined };
  },

  async completeUpload(ticketId): Promise<ServiceResult<StoredAttachment>> {
    const ticket = tickets.get(ticketId);
    if (!ticket?.received) return err('expired');
    tickets.delete(ticketId);
    objects.set(ticket.objectKey, ticket.received);
    return ok({ pointer: { kind: 'objectKey', storageId: DEMO_ATTACHMENT_STORAGE_ID, objectKey: ticket.objectKey }, sourceSystemId: DEMO_ATTACHMENT_STORAGE_ID });
  },

  async getReadLink(pointer): Promise<ServiceResult<ReadLink>> {
    const blob = pointer.storageId === DEMO_ATTACHMENT_STORAGE_ID ? objects.get(pointer.objectKey) : undefined;
    if (!blob) return err('unavailable');
    let url = readUrls.get(pointer.objectKey);
    if (!url) { url = URL.createObjectURL(blob); readUrls.set(pointer.objectKey, url); }
    return ok({ url, expiresAt: new Date(Date.now() + READ_LINK_MINUTES * 60_000).toISOString() });
  },
};

/** Test seam: forgets every ticket and stored object. */
export function resetMockAttachmentStorageForTests(): void {
  tickets.clear();
  objects.clear();
  readUrls.forEach(u => { try { URL.revokeObjectURL(u); } catch { /* not in this environment */ } });
  readUrls.clear();
}
