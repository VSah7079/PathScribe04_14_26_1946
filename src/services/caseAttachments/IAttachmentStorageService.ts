// src/services/caseAttachments/IAttachmentStorageService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 742 (Pete, Oct 30, 2026): the storage adapter contract. PathScribe asks where a file should go, sends the
// bytes there, and gets back a stable pointer. How the bytes are stored is decided outside PathScribe, per site, by
// the storage adapter behind the API server (docs/architecture/CASE_ATTACHMENTS_API.md):
//
//   • Site A, a cloud bucket or VNA: the destination is a pre-signed PUT to the hospital's bucket;
//   • Site B, a network share: the destination is the adapter's own one-time staging link, and a background worker
//     (or SFTP) moves the file to the share (\\hospital-nas\pathology_uploads\...);
//   • Site C, the interface engine: the same staging link, and the adapter passes the file to the engine to deposit
//     in the hospital's repository.
//
// Whatever the site, the browser does the same three steps: requestDestination, transfer, completeUpload. The
// adapter's only job at the end is to hand back a stable object key or a permanent https URL; PathScribe saves that
// pointer. Opening or printing an object key asks for a fresh read link (getReadLink); nothing stores one.
//
// No patient text goes to the adapter: the file name travels in the body for the adapter's own record, and the
// object key it chooses must not contain it (as for BLOB_STORAGE_API.md §4).
// ─────────────────────────────────────────────────────────────────────────────

import type { ServiceResult } from '../types';
import type { AttachmentMimeType, AttachmentPointer } from '@/types/caseAttachments/CaseAttachment';

export interface DestinationRequest {
  caseId: string;
  facilityId: string | null;
  fileName: string;
  contentType: AttachmentMimeType;
  byteLength: number;
  /** SHA-256 of the bytes, lower-case hex; the adapter refuses bytes that don't match. */
  sha256: string;
}

export interface UploadDestination {
  /** Opaque; names the upload in completeUpload. */
  ticketId: string;
  /** 'direct': a pre-signed link to the hospital's storage. 'staged': the adapter's one-time staging link. */
  mode: 'direct' | 'staged';
  /** How to send the bytes: the method and headers the destination needs. */
  method: 'PUT' | 'POST';
  uploadUrl: string;
  headers: Record<string, string>;
  expiresAt: string;
  /** The largest file this destination takes, in bytes, when the adapter has a limit. */
  maxBytes?: number;
  /** The size above which the screen warns before sending (default 25 MB). */
  warnAtBytes?: number;
}

export interface StoredAttachment {
  pointer: AttachmentPointer;
  /** The storage the file went to, for the record and the audit log (never a path). */
  sourceSystemId: string;
}

export interface ReadLink { url: string; expiresAt: string }

export type AttachmentStorageError =
  | 'notConfigured'   // this site has no attachment storage set up
  | 'tooLarge'        // over the destination's limit
  | 'refused'         // the adapter refused the file (type, scan, checksum)
  | 'expired'         // the destination or ticket ran out before the upload finished
  | 'unavailable';    // the stored file can't be reached now

export interface IAttachmentStorageService {
  /** Step 1: where the bytes go. */
  requestDestination(req: DestinationRequest): Promise<ServiceResult<UploadDestination>>;
  /** Step 2: sends the bytes to the destination. */
  transfer(destination: UploadDestination, file: Blob): Promise<ServiceResult<void>>;
  /** Step 3: the adapter confirms the file arrived (and was checked) and hands back the stable pointer. */
  completeUpload(ticketId: string): Promise<ServiceResult<StoredAttachment>>;
  /** A fresh, short-lived link to read an object-key attachment (to show it or draw it into a report). */
  getReadLink(pointer: Extract<AttachmentPointer, { kind: 'objectKey' }>, purpose: 'view' | 'render'): Promise<ServiceResult<ReadLink>>;
}
