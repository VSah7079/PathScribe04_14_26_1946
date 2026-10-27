// src/services/imageAssociation/caseReportImages.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 609 (PS-44, "Image embedding in report PDFs"): the images linked to a
// case's report, and putting them into the report's PDF.
//
// Pete's rule (Oct 13, 2026; docs/architecture/BLOB_STORAGE_API.md §6): PathScribe
// stores no images and no file attachments, only links to them. So:
//
//   • The Attach images screen (components/ReportImages/AttachReportImagesModal)
//     calls attachCaseReportImage() with an https link to an image in the
//     hospital's own system (its imaging system, document system or intranet),
//     an image type and a caption. Only that record is kept. No bytes are read,
//     uploaded or stored here.
//   • Both report PDF paths call applyCaseReportImagesToPdf() on the bytes the
//     report renderer returns: the surgical report (SynopticReportPage, print
//     and release) and the cytology report (renderCytologyPdf.ts). At that
//     moment each link is fetched and the image is drawn into the PDF, which
//     is the stored record (so a later change at the source doesn't change a
//     released report; the same rule the letterhead logo follows). Each image
//     prints on its own page after the report's pages, with its caption. One
//     below 300 DPI at its printed size is flagged (PS-276 §1.1.3), never
//     dropped. A link that can't be fetched prints the "Image Unavailable"
//     page (spec §4.3) instead of silently missing. A report with no linked
//     images is returned untouched.
//
// DEMO: the browser fetches the link itself, so it works for a host that allows
// it (CORS) and otherwise prints the "Image Unavailable" page. With the API
// server the server fetches the link (it applies the private-address block and
// the sign-in the hospital's system needs), which is server work.
//
// The audit detail is PHI-free: the link's host only, never the full link (a
// path can hold an accession) and never the caption. Attaching and removing
// need `report:case-images:attach`.
// ─────────────────────────────────────────────────────────────────────────────

import { storageGet, storageSet } from '../mockStorage';
import { auditService } from '../auditlog/auditServiceInstance';
import { isHttpsLink } from '../links/externalLink';
import type { ImageAssociation } from '@/types/imageAssociation/ImageAssociation';
import type { FetchAssetBytes } from './embedImageAssociationsIntoPdf';

export const CASE_REPORT_IMAGES_KEY = 'caseReportImages';
export const REPORT_IMAGE_TYPES = ['Gross Specimen', 'Microphotograph', 'Block Face', 'Other'] as const;
export type ReportImageType = (typeof REPORT_IMAGE_TYPES)[number];
export const MAX_REPORT_IMAGES = 12;
export const MAX_CAPTION_LENGTH = 120;

export interface CaseReportImage {
  id: string;
  caseId: string;
  /** The accession, so a report made from the accession alone (a single cytology report) finds its images. */
  accession: string;
  imageType: string;
  caption: string;
  /** An https link into the hospital's own system. */
  imageUrl: string;
  /** The link's host: the source system, and the only part of the link the audit log names. */
  sourceSystemId: string;
  attachedAt: string;
  attachedBy: string;
}

export type ReportImageRef = { caseId?: string | null; accession?: string | null };

export type AttachFailure = 'notPermitted' | 'invalidLink' | 'duplicate' | 'tooMany';
export type AttachResult =
  | { ok: true; image: CaseReportImage }
  | { ok: false; reason: AttachFailure };

export interface CaseReportImageDeps {
  enforce: (context: { caseId: string | null; facilityId: string | null }) => Promise<{ allowed: boolean }>;
  audit: (entry: { event: string; detail: string; user: string; caseId: string }) => void;
  now: () => string;
}

const defaultDeps: CaseReportImageDeps = {
  enforce: async context => {
    const { authorizationService } = await import('../authorization/defaultAuthorizationService');
    return authorizationService.enforce('report:case-images:attach', context);
  },
  audit: entry => {
    auditService.logEvent({ type: 'system', event: entry.event, detail: entry.detail, user: entry.user, caseId: entry.caseId, confidence: null }).catch(() => {});
  },
  now: () => new Date().toISOString(),
};

// ── Store ────────────────────────────────────────────────────────────────────

let records: CaseReportImage[] = storageGet<CaseReportImage[]>(CASE_REPORT_IMAGES_KEY, []);
const listeners = new Set<() => void>();
let seq = 0;

const notify = () => listeners.forEach(fn => fn());
export function subscribeCaseReportImages(fn: () => void): () => void { listeners.add(fn); return () => { listeners.delete(fn); }; }
const persist = () => storageSet(CASE_REPORT_IMAGES_KEY, records);

const matches = (r: CaseReportImage, ref: ReportImageRef) =>
  (!!ref.caseId && r.caseId === ref.caseId) || (!!ref.accession && r.accession === ref.accession);

/** The images linked to this report, oldest first. */
export function listCaseReportImages(ref: ReportImageRef): readonly CaseReportImage[] {
  return records.filter(r => matches(r, ref)).sort((a, b) => a.attachedAt.localeCompare(b.attachedAt));
}

// ── Attach and remove ────────────────────────────────────────────────────────

export interface AttachInput {
  caseId: string;
  accession: string;
  facilityId?: string | null;
  /** An https link to the image in the hospital's own system. */
  url: string;
  imageType: string;
  caption?: string;
  user: string;
}

export async function attachCaseReportImage(input: AttachInput, deps: CaseReportImageDeps = defaultDeps): Promise<AttachResult> {
  if (!(await deps.enforce({ caseId: input.caseId, facilityId: input.facilityId ?? null })).allowed) return { ok: false, reason: 'notPermitted' };
  const url = input.url.trim();
  if (!isHttpsLink(url)) return { ok: false, reason: 'invalidLink' };
  const existing = listCaseReportImages({ caseId: input.caseId });
  if (existing.some(i => i.imageUrl === url)) return { ok: false, reason: 'duplicate' };
  if (existing.length >= MAX_REPORT_IMAGES) return { ok: false, reason: 'tooMany' };

  const imageType = (REPORT_IMAGE_TYPES as readonly string[]).includes(input.imageType) ? input.imageType : 'Other';
  const image: CaseReportImage = {
    id: `rpt-img-${Date.now().toString(36)}-${(seq++).toString(36)}`,
    caseId: input.caseId, accession: input.accession, imageType,
    caption: (input.caption ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_CAPTION_LENGTH),
    imageUrl: url, sourceSystemId: new URL(url).hostname.toLowerCase(),
    attachedAt: deps.now(), attachedBy: input.user,
  };
  records = [...records, image];
  persist();
  notify();
  deps.audit({
    event: 'Report Image Linked', user: input.user, caseId: input.caseId,
    // The host only: a link's path or a caption can name a patient.
    detail: `${imageType} image linked to the report from ${image.sourceSystemId}.`,
  });
  return { ok: true, image };
}

export async function removeCaseReportImage(
  imageId: string, user: string, facilityId: string | null = null, deps: CaseReportImageDeps = defaultDeps,
): Promise<{ ok: boolean; reason?: 'notPermitted' | 'notFound' }> {
  const image = records.find(r => r.id === imageId);
  if (!image) return { ok: false, reason: 'notFound' };
  if (!(await deps.enforce({ caseId: image.caseId, facilityId })).allowed) return { ok: false, reason: 'notPermitted' };
  records = records.filter(r => r.id !== imageId);
  persist();
  notify();
  deps.audit({ event: 'Report Image Unlinked', user, caseId: image.caseId, detail: `${image.imageType} image from ${image.sourceSystemId} removed from the report.` });
  return { ok: true };
}

// ── Into the PDF ─────────────────────────────────────────────────────────────

export interface ApplyImagesResult {
  bytes: Uint8Array;
  /** How many attached images were added to the report (a missing one still adds its "Image Unavailable" page). */
  embedded: number;
  warnings: string[];
  /** The images could not be added; `bytes` is the report as the renderer made it. */
  failed: boolean;
}

export interface ApplyImagesDeps {
  embed?: (base: Uint8Array, associations: ImageAssociation[], fetchBytes?: FetchAssetBytes) => Promise<{ bytes: Uint8Array; warnings: string[] }>;
  fetchBytes?: FetchAssetBytes;
}

export const CASE_IMAGES_FAILED = 'The images attached to this report could not be added to it. Remove or replace them on the Attach images screen.';

/**
 * The report's PDF with its attached images added after its own pages. A report with
 * no attached images is returned as it is (pdf-lib is not even loaded). Never throws.
 */
export async function applyCaseReportImagesToPdf(ref: ReportImageRef, pdf: Uint8Array, deps: ApplyImagesDeps = {}): Promise<ApplyImagesResult> {
  const attached = listCaseReportImages(ref);
  if (!attached.length) return { bytes: pdf, embedded: 0, warnings: [], failed: false };
  const associations: ImageAssociation[] = attached.map(i => ({
    id: i.id, assetId: i.caseId, imageUrl: i.imageUrl, imageType: i.imageType, sourceSystemId: i.sourceSystemId,
    ...(i.caption ? { caption: i.caption } : {}), createdAt: i.attachedAt, createdBy: i.attachedBy,
  }));
  try {
    const embed = deps.embed ?? (async (base, list, fetchBytes) => (await import('./embedImageAssociationsIntoPdf')).embedImageAssociationsIntoPdf(base, list, fetchBytes));
    const out = await embed(pdf, associations, deps.fetchBytes);
    return { bytes: out.bytes, embedded: associations.length, warnings: out.warnings, failed: false };
  } catch (e) {
    console.warn(`[PathScribe] Attached images could not be added to the report: ${e instanceof Error ? e.message : String(e)}`);
    return { bytes: pdf, embedded: 0, warnings: [], failed: true };
  }
}

/** The same for a Blob (the surgical report page works with the renderer's response). */
export async function applyCaseReportImagesToBlob(ref: ReportImageRef, blob: Blob, deps: ApplyImagesDeps = {}): Promise<{ blob: Blob; failed: boolean }> {
  if (!listCaseReportImages(ref).length) return { blob, failed: false };
  const out = await applyCaseReportImagesToPdf(ref, new Uint8Array(await blob.arrayBuffer()), deps);
  return out.failed ? { blob, failed: true } : { blob: new Blob([out.bytes as BlobPart], { type: 'application/pdf' }), failed: false };
}

/** Test seam: forgets every attached image without writing an audit entry. */
export function resetCaseReportImagesForTests(): void {
  records = [];
  storageSet(CASE_REPORT_IMAGES_KEY, []);
  notify();
}
