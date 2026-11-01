// src/services/caseAttachments/caseAttachments.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 742 (Pete, "Case Image & File Attachments (Release 1)", Oct 30, 2026): a case's attached files and links.
//
//   • Attach External File (attachExternalFile): a PDF, JPG or PNG picked with the computer's own file picker (local
//     folders and mapped network shares alike). The bytes are checked (type from the bytes, SHA-256), sent to the
//     hospital's storage through the storage adapter (IAttachmentStorageService: destination, transfer, completion),
//     and only the pointer the adapter hands back is kept. Needs `case:attachment:upload`.
//   • Add link (addAttachmentLink): an https link into a hospital system. Needs `case:attachment:link`.
//   • Remove from case (unlinkAttachment): unlinks only; the file stays in the hospital's storage (Pete, Oct 30).
//     An attachment still placed in the report is refused until it is taken out of the report (which follows the
//     report's own rules: a signed report needs an amendment). Needs `case:attachment:unlink`.
//
// Audit detail is PHI-free: the file type, its size and the storage or host, never the file name (which often
// names the patient) and never a link's path. The records are pointers, held like every mock's data
// (mockStorage: in memory with the API server, CLAUDE.md rule 4).
// ─────────────────────────────────────────────────────────────────────────────

import { storageGet, storageSet } from '../mockStorage';
import { auditService } from '../auditlog/auditServiceInstance';
import { isHttpsLink } from '../links/externalLink';
import type { ServiceResult } from '../types';
import type { AttachmentMimeType, CaseAttachment } from '@/types/caseAttachments/CaseAttachment';
import type { IAttachmentStorageService, UploadDestination } from './IAttachmentStorageService';
import { checkAttachmentFile, mimeTypeFromName, readHead, sha256Hex, type FileProblem } from './attachmentFiles';

export const CASE_ATTACHMENTS_KEY = 'caseAttachments';
export const MAX_ATTACHMENT_FILE_NAME = 200;

export type AttachmentCapability = 'case:attachment:upload' | 'case:attachment:link' | 'case:attachment:unlink';

export interface CaseAttachmentDeps {
  enforce: (key: AttachmentCapability, context: { caseId: string | null; facilityId: string | null }) => Promise<{ allowed: boolean }>;
  storage: () => Promise<IAttachmentStorageService>;
  audit: (entry: { event: string; detail: string; user: string; caseId: string }) => void;
  now: () => string;
  /** True while the attachment is placed in the report. */
  isInReport: (attachmentId: string) => Promise<boolean>;
}

const defaultDeps: CaseAttachmentDeps = {
  enforce: async (key, context) => {
    const { authorizationService } = await import('../authorization/defaultAuthorizationService');
    return authorizationService.enforce(key, context);
  },
  storage: async () => (await import('./attachmentStorageServiceInstance')).attachmentStorageService,
  audit: entry => {
    auditService.logEvent({ type: 'system', event: entry.event, detail: entry.detail, user: entry.user, caseId: entry.caseId, confidence: null }).catch(() => {});
  },
  now: () => new Date().toISOString(),
  isInReport: async attachmentId => (await import('../imageAssociation/caseReportImages')).isAttachmentInReport(attachmentId),
};

// ── Store ────────────────────────────────────────────────────────────────────

let records: CaseAttachment[] = storageGet<CaseAttachment[]>(CASE_ATTACHMENTS_KEY, []);
const listeners = new Set<() => void>();
let seq = 0;
const notify = () => listeners.forEach(fn => fn());
const persist = () => storageSet(CASE_ATTACHMENTS_KEY, records);
export function subscribeCaseAttachments(fn: () => void): () => void { listeners.add(fn); return () => { listeners.delete(fn); }; }

export type CaseRef = { caseId?: string | null; accession?: string | null };
const matches = (r: CaseAttachment, ref: CaseRef) => (!!ref.caseId && r.caseId === ref.caseId) || (!!ref.accession && r.accession === ref.accession);

/** The case's linked attachments, oldest first (unlinked ones stay on record but are not listed). */
export function listCaseAttachments(ref: CaseRef): readonly CaseAttachment[] {
  return records.filter(r => r.status === 'linked' && matches(r, ref)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function getCaseAttachment(id: string): CaseAttachment | undefined {
  return records.find(r => r.id === id);
}

const newId = () => `att-${Date.now().toString(36)}-${(seq++).toString(36)}`;
const add = (record: CaseAttachment) => { records = [...records, record]; persist(); notify(); };

// ── Attach External File ─────────────────────────────────────────────────────

export type UploadProblem = FileProblem | 'notPermitted' | 'notConfigured' | 'refused' | 'expired' | 'unavailable';
export type UploadResult = { ok: true; attachment: CaseAttachment } | { ok: false; problem: UploadProblem };

export interface UploadInput {
  caseId: string;
  accession: string;
  facilityId: string | null;
  file: File;
  user: string;
}

const STORAGE_PROBLEMS: readonly UploadProblem[] = ['notConfigured', 'tooLarge', 'refused', 'expired', 'unavailable'];
const storageProblem = (r: ServiceResult<unknown>): UploadProblem =>
  r.ok === false && (STORAGE_PROBLEMS as readonly string[]).includes(r.error) ? (r.error as UploadProblem) : 'unavailable';

/** Checks the file, sends it to the hospital's storage through the adapter, and keeps the pointer it hands back. */
export async function attachExternalFile(input: UploadInput, deps: CaseAttachmentDeps = defaultDeps, onDestination?: (d: UploadDestination) => void): Promise<UploadResult> {
  if (!(await deps.enforce('case:attachment:upload', { caseId: input.caseId, facilityId: input.facilityId })).allowed) return { ok: false, problem: 'notPermitted' };
  const checked = checkAttachmentFile(input.file, await readHead(input.file));
  if (checked.ok === false) return { ok: false, problem: checked.problem };
  const bytes = await input.file.arrayBuffer();
  const sha256 = await sha256Hex(bytes);
  const fileName = input.file.name.trim().slice(0, MAX_ATTACHMENT_FILE_NAME);
  const storage = await deps.storage();

  const destination = await storage.requestDestination({
    caseId: input.caseId, facilityId: input.facilityId, fileName, contentType: checked.mimeType, byteLength: input.file.size, sha256,
  });
  if (destination.ok === false) return { ok: false, problem: storageProblem(destination) };
  if (destination.data.maxBytes && input.file.size > destination.data.maxBytes) return { ok: false, problem: 'tooLarge' };
  onDestination?.(destination.data);
  const sent = await storage.transfer(destination.data, new Blob([bytes], { type: checked.mimeType }));
  if (sent.ok === false) return { ok: false, problem: storageProblem(sent) };
  const stored = await storage.completeUpload(destination.data.ticketId);
  if (stored.ok === false) return { ok: false, problem: storageProblem(stored) };

  const attachment: CaseAttachment = {
    id: newId(), caseId: input.caseId, accession: input.accession, sourceType: 'external_link', origin: 'upload',
    pointer: stored.data.pointer, fileName, mimeType: checked.mimeType, fileSizeBytes: input.file.size, sha256,
    sourceSystemId: stored.data.sourceSystemId, createdAt: deps.now(), createdBy: input.user, status: 'linked',
  };
  add(attachment);
  deps.audit({
    event: 'Case Attachment Uploaded', user: input.user, caseId: input.caseId,
    // No file name: it often names the patient.
    detail: `${checked.mimeType} file of ${input.file.size} bytes attached to the case; stored by ${stored.data.sourceSystemId} (${destination.data.mode} upload).`,
  });
  return { ok: true, attachment };
}

// ── Add link ─────────────────────────────────────────────────────────────────

export type LinkProblem = 'notPermitted' | 'invalidLink' | 'duplicate';

/** Links an https URL into a hospital system to the case. */
export async function addAttachmentLink(
  input: { caseId: string; accession: string; facilityId: string | null; url: string; user: string },
  deps: CaseAttachmentDeps = defaultDeps,
): Promise<{ ok: true; attachment: CaseAttachment } | { ok: false; problem: LinkProblem }> {
  if (!(await deps.enforce('case:attachment:link', { caseId: input.caseId, facilityId: input.facilityId })).allowed) return { ok: false, problem: 'notPermitted' };
  const url = input.url.trim();
  if (!isHttpsLink(url)) return { ok: false, problem: 'invalidLink' };
  if (listCaseAttachments({ caseId: input.caseId }).some(a => a.pointer.kind === 'url' && a.pointer.url === url)) return { ok: false, problem: 'duplicate' };
  const host = new URL(url).hostname.toLowerCase();
  const mimeType: AttachmentMimeType = mimeTypeFromName(url) ?? 'image/jpeg';
  const attachment: CaseAttachment = {
    id: newId(), caseId: input.caseId, accession: input.accession, sourceType: 'external_link', origin: 'link',
    pointer: { kind: 'url', url }, mimeType, sourceSystemId: host, createdAt: deps.now(), createdBy: input.user, status: 'linked',
  };
  add(attachment);
  deps.audit({ event: 'Case Attachment Linked', user: input.user, caseId: input.caseId, detail: `Link to ${host} attached to the case.` });
  return { ok: true, attachment };
}

// ── Remove from case ─────────────────────────────────────────────────────────

export type UnlinkProblem = 'notPermitted' | 'notFound' | 'inReport';

/** Unlinks the attachment from the case (the file stays where it is). Refused while it is placed in the report. */
export async function unlinkAttachment(attachmentId: string, user: string, facilityId: string | null, deps: CaseAttachmentDeps = defaultDeps): Promise<{ ok: true } | { ok: false; problem: UnlinkProblem }> {
  const found = records.find(r => r.id === attachmentId && r.status === 'linked');
  if (!found) return { ok: false, problem: 'notFound' };
  if (!(await deps.enforce('case:attachment:unlink', { caseId: found.caseId, facilityId })).allowed) return { ok: false, problem: 'notPermitted' };
  if (await deps.isInReport(attachmentId)) return { ok: false, problem: 'inReport' };
  const now = deps.now();
  records = records.map(r => (r.id === attachmentId ? { ...r, status: 'unlinked', unlinkedAt: now, unlinkedBy: user } : r));
  persist();
  notify();
  deps.audit({ event: 'Case Attachment Unlinked', user, caseId: found.caseId, detail: `${found.mimeType} attachment from ${found.sourceSystemId} unlinked from the case; the stored file was not deleted.` });
  return { ok: true };
}

/** Test seam: forgets every attachment without an audit entry. */
export function resetCaseAttachmentsForTests(): void {
  records = [];
  storageSet(CASE_ATTACHMENTS_KEY, []);
  notify();
}
