// src/types/caseAttachments/CaseAttachment.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 742 (Pete, "PathScribe Case Image & File Attachments (Release 1)", Oct 30, 2026).
//
// A case attachment is a pointer, never a file (Pete's rule, Oct 13, 2026; BLOB_STORAGE_API.md §6): a PDF, JPG or
// PNG the user attached from their computer or a network share, or an https link they typed. The bytes of an
// attached file go to the hospital's own storage through the storage adapter (Pete, Oct 30: the adapter decides
// how, a bucket, a network share or the interface engine) and come back as a stable pointer, which is all
// PathScribe keeps.
//
// Gross and intraoperative photos are not attachments: they are already on the case as DigitalAsset links
// (specimen, block, intraoperative finding), and the Attachments window lists them from there, never copied.
// ─────────────────────────────────────────────────────────────────────────────

/** Pete's `source_type` enum. Gross and intraop rows are the case's own photos; uploads and links are `external_link`. */
export const ATTACHMENT_SOURCE_TYPES = ['gross', 'intraop', 'slide_region', 'external_link'] as const;
export type AttachmentSourceType = (typeof ATTACHMENT_SOURCE_TYPES)[number];

/** The file types Release 1 accepts (Pete: no .docx; save a Word file as PDF first). */
export const ATTACHMENT_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;
export type AttachmentMimeType = (typeof ATTACHMENT_MIME_TYPES)[number];

/**
 * Where the attached thing lives. The storage adapter hands back either a stable object key in the hospital's storage
 * (read through a fresh, short-lived read link each time it is opened or printed) or a permanent https URL.
 */
export type AttachmentPointer =
  | { kind: 'objectKey'; storageId: string; objectKey: string }
  | { kind: 'url'; url: string };

export interface CaseAttachment {
  /** Pete's `asset_id`. */
  id: string;
  /** Pete's `case_id`: PathScribe's case id (the case's own key, not a UUID). */
  caseId: string;
  /** The accession, so a report made from the accession alone finds them. */
  accession: string;
  /** Pete's `source_type`: 'external_link' for uploads and typed links in Release 1. */
  sourceType: AttachmentSourceType;
  /** How it came in: a file sent to the hospital's storage, or a link typed in. */
  origin: 'upload' | 'link';
  /** Pete's `source_url`, kept as a pointer (an object key is never a link that expires). */
  pointer: AttachmentPointer;
  /** Pete's `file_name`. Often names the patient: shown inside data-phi, never written to the audit log. */
  fileName?: string;
  mimeType: AttachmentMimeType;
  /** Pete's `file_size_bytes`. */
  fileSizeBytes?: number;
  /** SHA-256 of the bytes sent, lower-case hex: the adapter checks it, and the record can be checked against the object. */
  sha256?: string;
  /** The storage or source system: the adapter's storage id, or a link's host. The only location the audit log names. */
  sourceSystemId: string;
  /** Optional material the attachment belongs to (a block's gross photo, say). */
  material?: { specimenId?: string; blockId?: string };
  /** Pete's `created_at`. */
  createdAt: string;
  createdBy: string;
  /** Remove from case unlinks only: the object stays in the hospital's storage (Pete, Oct 30). */
  status: 'linked' | 'unlinked';
  unlinkedAt?: string;
  unlinkedBy?: string;
}
