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
//
// Batch 742 (Pete, Case Image & File Attachments, Release 1): these records are
// now the placements of the Attachments window (components/CaseAttachments).
// insertIntoReport() places ticked photos, files and links in a report section
// (`sectionId`, `sectionLabel`); the renderer draws a placed image inside that
// section (reportSectionImages.ts builds the payload), so only a record with no
// section (the cytology report, and records made before this batch) still
// prints on its own page after the report. A placed PDF is named in its section
// and its pages follow the report. A placement remembers where it came from
// (`origin`: an attachment, or a photo already on the case), so a file in the
// hospital's storage is read through a fresh read link each time. A signed
// report takes no new placement, and loses none, without an amendment or
// addendum in progress.
// ─────────────────────────────────────────────────────────────────────────────

import { storageGet, storageSet } from '../mockStorage';
import { auditService } from '../auditlog/auditServiceInstance';
import { isHttpsLink } from '../links/externalLink';
import type { ImageAssociation } from '@/types/imageAssociation/ImageAssociation';
import type { FetchAssetBytes } from './embedImageAssociationsIntoPdf';
import { placementFetchUrl } from './placementLinks';

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
  /** Batch 742: the report section it prints in (absent: on its own page after the report). */
  sectionId?: string;
  /** The section's heading when it was placed, for the window and in case the layout no longer has the section. */
  sectionLabel?: string;
  /** Batch 742: what was placed. Absent on a link typed into the Batch 609 screen. */
  origin?: ReportImageOrigin;
  /** Batch 742: application/pdf, image/jpeg or image/png, when known. */
  mimeType?: string;
}

/** Batch 742: an attachment (an uploaded file or a link), or a photo already on the case (gross, block face, intraop). */
export type ReportImageOrigin = { kind: 'attachment'; attachmentId: string } | { kind: 'caseAsset'; assetId: string };

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

// ── Batch 742: placing in a section ─────────────────────────────────────────

/** Where the report is: a signed report changes only through an amendment or addendum. On an Assist case the LIS
 *  writes the report (`lisOwnsReport`), so PathScribe places nothing in one (Pete, Oct 30, 2026). */
export interface ReportEditState { signed: boolean; amendmentOpen: boolean; lisOwnsReport?: boolean }
export type PlacementProblem = 'notPermitted' | 'signedNeedsAmendment' | 'assistCase' | 'tooMany' | 'nothingChosen';

/** Why the report can't take or lose a placement now, or null. Pure. */
export const reportEditProblem = (state: ReportEditState): 'assistCase' | 'signedNeedsAmendment' | null =>
  state.lisOwnsReport ? 'assistCase' : state.signed && !state.amendmentOpen ? 'signedNeedsAmendment' : null;

/** One thing ticked in the Attachments window, ready to place. */
export interface PlacementItem {
  origin: ReportImageOrigin;
  /** A link to fetch it from; empty for a file in the hospital's storage (read through a fresh read link). */
  imageUrl: string;
  imageType: string;
  caption?: string;
  mimeType?: string;
  sourceSystemId: string;
}

const sameOrigin = (a?: ReportImageOrigin, b?: ReportImageOrigin) =>
  !!a && !!b && a.kind === b.kind && (a.kind === 'attachment' ? a.attachmentId === (b as typeof a).attachmentId : a.assetId === (b as { assetId: string }).assetId);

/** True while an attachment is placed in a report. */
export const isAttachmentInReport = (attachmentId: string) => records.some(r => r.origin?.kind === 'attachment' && r.origin.attachmentId === attachmentId);

/**
 * Places the ticked items in a report section (or, with no section, after the report). An item already placed moves
 * to the new section with its new caption. Permission, the signed-report rule, the limit, one audit entry.
 */
export async function insertIntoReport(
  input: { caseId: string; accession: string; facilityId: string | null; items: PlacementItem[]; section: { id: string; label: string } | null; user: string; reportState: ReportEditState },
  deps: CaseReportImageDeps = defaultDeps,
): Promise<{ ok: true; placed: number } | { ok: false; reason: PlacementProblem }> {
  if (input.items.length === 0) return { ok: false, reason: 'nothingChosen' };
  if (!(await deps.enforce({ caseId: input.caseId, facilityId: input.facilityId })).allowed) return { ok: false, reason: 'notPermitted' };
  const signed = reportEditProblem(input.reportState);
  if (signed) return { ok: false, reason: signed };
  const existing = listCaseReportImages({ caseId: input.caseId });
  const fresh = input.items.filter(i => !existing.some(e => sameOrigin(e.origin, i.origin)));
  if (existing.length + fresh.length > MAX_REPORT_IMAGES) return { ok: false, reason: 'tooMany' };

  const now = deps.now();
  const where = input.section ? { sectionId: input.section.id, sectionLabel: input.section.label } : {};
  const caption = (c?: string) => (c ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_CAPTION_LENGTH);
  records = records.map(r => {
    const item = r.caseId === input.caseId ? input.items.find(i => sameOrigin(r.origin, i.origin)) : undefined;
    if (!item) return r;
    const { sectionId: _s, sectionLabel: _l, ...rest } = r;
    return { ...rest, ...where, caption: caption(item.caption) };
  });
  records = [...records, ...fresh.map(i => ({
    id: `rpt-img-${Date.now().toString(36)}-${(seq++).toString(36)}`,
    caseId: input.caseId, accession: input.accession,
    imageType: (REPORT_IMAGE_TYPES as readonly string[]).includes(i.imageType) ? i.imageType : 'Other',
    caption: caption(i.caption), imageUrl: i.imageUrl, sourceSystemId: i.sourceSystemId,
    attachedAt: now, attachedBy: input.user, origin: i.origin, ...(i.mimeType ? { mimeType: i.mimeType } : {}), ...where,
  }))];
  persist();
  notify();
  deps.audit({
    event: 'Report Image Linked', user: input.user, caseId: input.caseId,
    // The section heading is template text; captions and links are left out.
    detail: `${input.items.length} item(s) placed in the report ${input.section ? `under "${input.section.label}"` : 'after the report'}.`,
  });
  return { ok: true, placed: input.items.length };
}

/** Takes one placement out of the report (the attachment stays on the case). The signed-report rule applies. */
export async function takeOutOfReport(
  imageId: string, user: string, facilityId: string | null, reportState: ReportEditState, deps: CaseReportImageDeps = defaultDeps,
): Promise<{ ok: true } | { ok: false; reason: 'notPermitted' | 'notFound' | 'signedNeedsAmendment' | 'assistCase' }> {
  const image = records.find(r => r.id === imageId);
  if (!image) return { ok: false, reason: 'notFound' };
  // An Assist case may still clear a placement made before Batch 742's rule; only the signed-report rule applies.
  const signed = reportEditProblem({ ...reportState, lisOwnsReport: false });
  if (signed) return { ok: false, reason: signed };
  const out = await removeCaseReportImage(imageId, user, facilityId, deps);
  return out.ok ? { ok: true } : { ok: false, reason: out.reason ?? 'notFound' };
}

/** True when the renderer draws this placement inside its section (an image with a section). Pure. */
export const isDrawnInSection = (i: Pick<CaseReportImage, 'sectionId' | 'mimeType'>) => !!i.sectionId && i.mimeType !== 'application/pdf';

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
  /** Batch 742: the link to fetch a placement from (a fresh read link for a file in the hospital's storage). */
  fetchUrl?: (image: CaseReportImage) => Promise<string | null>;
}

/** Batch 742: a placement that can't be reached is fetched from this, which always fails, so its page says Image Unavailable. */
const UNREACHABLE_LINK = 'unavailable:';

export const CASE_IMAGES_FAILED = 'The images attached to this report could not be added to it. Remove or replace them on the Attach images screen.';

/**
 * The report's PDF with its attached images added after its own pages. A report with
 * no attached images is returned as it is (pdf-lib is not even loaded). Never throws.
 */
export async function applyCaseReportImagesToPdf(ref: ReportImageRef, pdf: Uint8Array, deps: ApplyImagesDeps = {}): Promise<ApplyImagesResult> {
  // Batch 742: an image placed in a section is drawn there by the renderer; only the rest follow the report.
  const attached = listCaseReportImages(ref).filter(i => !isDrawnInSection(i));
  if (!attached.length) return { bytes: pdf, embedded: 0, warnings: [], failed: false };
  const associations: ImageAssociation[] = await Promise.all(attached.map(async i => ({
    id: i.id, assetId: i.caseId, imageUrl: (await (deps.fetchUrl ?? placementFetchUrl)(i)) ?? UNREACHABLE_LINK, imageType: i.imageType, sourceSystemId: i.sourceSystemId,
    ...(i.caption ? { caption: i.caption } : {}), ...(i.mimeType ? { mimeType: i.mimeType } : {}), createdAt: i.attachedAt, createdBy: i.attachedBy,
  })));
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
  if (!listCaseReportImages(ref).some(i => !isDrawnInSection(i))) return { blob, failed: false };
  const out = await applyCaseReportImagesToPdf(ref, new Uint8Array(await blob.arrayBuffer()), deps);
  return out.failed ? { blob, failed: true } : { blob: new Blob([out.bytes as BlobPart], { type: 'application/pdf' }), failed: false };
}

/** Test seam: forgets every attached image without writing an audit entry. */
export function resetCaseReportImagesForTests(): void {
  records = [];
  storageSet(CASE_REPORT_IMAGES_KEY, []);
  notify();
}
