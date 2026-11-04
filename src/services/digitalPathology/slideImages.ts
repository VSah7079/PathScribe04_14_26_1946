// src/services/digitalPathology/slideImages.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 750 (Pete, Oct 31, 2026): PathScribe has no slide viewer and no digital pathology function. For a slide that
// has one, it shows a small reference preview (a thumbnail) that comes from the laboratory's scanner or image system,
// unchanged, labelled "Reference preview. Not for diagnosis."; selecting it opens the laboratory's own digital pathology
// application in a separate, remembered window. The decisions, all pure:
//   • The two addresses are templates, never written in code: the laboratory's (EnterpriseConfig.slideImages), a
//     facility's own over it, else the deployment's (VITE_SLIDE_VIEWER_URL_TEMPLATE, VITE_SLIDE_THUMBNAIL_URL_TEMPLATE).
//     https only; the only placeholders are {{slideId}} and {{accession}}; no user name or password. Patient names never
//     go in an address: there is no placeholder for one.
//   • The image state, in plain words, from the slide's own scanner status (Slide Distribution and Slide Scanning).
//   • The thumbnail: an image the interface delivered for the slide, else the thumbnail template, once the slide has an
//     image (scanned, or scanned and failed image quality). PathScribe never creates, crops, enhances or analyses it.
// ─────────────────────────────────────────────────────────────────────────────

import { appEnv } from '@/services/runtimeConfig/runtimeEnv';

export interface SlideImageAddresses {
  /** Opens the laboratory's application on the slide, e.g. https://dp.example.org/open?slide={{slideId}}. */
  viewerUrlTemplate: string;
  /** The scanner's or image system's preview of the slide, e.g. https://images.example.org/thumb/{{slideId}}.jpg. */
  thumbnailUrlTemplate: string;
}

export interface SlideImageSettings extends SlideImageAddresses {
  /** A facility's own addresses (its own scanner or image system), over the laboratory's. Keyed by Facility.id. */
  facilityOverrides: Record<string, Partial<SlideImageAddresses>>;
}

export const DEFAULT_SLIDE_IMAGE_SETTINGS: SlideImageSettings = { viewerUrlTemplate: '', thumbnailUrlTemplate: '', facilityOverrides: {} };

export const SLIDE_ID_PLACEHOLDER = '{{slideId}}';
export const ACCESSION_PLACEHOLDER = '{{accession}}';
const KNOWN = new Set([SLIDE_ID_PLACEHOLDER, ACCESSION_PLACEHOLDER]);

export type TemplateProblem = 'notHttps' | 'unknownPlaceholder' | 'noSlidePlaceholder' | 'credentials';

/** Why an address template can't be used ('' is allowed: it means "not set here"). */
export function templateProblem(template: string): TemplateProblem | null {
  const t = template.trim();
  if (!t) return null;
  const placeholders = t.match(/\{\{[^}]*\}\}/g) ?? [];
  if (placeholders.some(p => !KNOWN.has(p))) return 'unknownPlaceholder';
  if (!t.includes(SLIDE_ID_PLACEHOLDER)) return 'noSlidePlaceholder';
  let u: URL;
  try { u = new URL(t.split(SLIDE_ID_PLACEHOLDER).join('x').split(ACCESSION_PLACEHOLDER).join('x')); } catch { return 'notHttps'; }
  if (u.protocol !== 'https:' || !u.hostname.includes('.')) return 'notHttps';
  if (u.username || u.password) return 'credentials';
  return null;
}

/** The deployment's addresses (VITE_SLIDE_VIEWER_URL_TEMPLATE, VITE_SLIDE_THUMBNAIL_URL_TEMPLATE). */
export function deploymentAddresses(): SlideImageAddresses {
  return { viewerUrlTemplate: appEnv().VITE_SLIDE_VIEWER_URL_TEMPLATE ?? '', thumbnailUrlTemplate: appEnv().VITE_SLIDE_THUMBNAIL_URL_TEMPLATE ?? '' };
}

/** A WSI Viewers list entry's launch address ({{wsiUniqueId}}, before Batch 750) in this template's terms. */
export function viewerTemplateFromVendor(launchUrlTemplate: string | undefined): string {
  return (launchUrlTemplate ?? '').split('{{wsiUniqueId}}').join(SLIDE_ID_PLACEHOLDER);
}

/** The first active WSI Viewers entry with a usable launch address, in this template's terms ('' for none). */
export function listedViewerTemplate(activeEntries: readonly { launchUrlTemplate: string }[]): string {
  return activeEntries.map(e => viewerTemplateFromVendor(e.launchUrlTemplate).trim()).find(t => t && !templateProblem(t)) ?? '';
}

/** The addresses for a slide at this facility: the facility's, else the laboratory's, else (for opening only) the first
 *  active entry of the WSI Viewers list, so a laboratory that set its viewer there before Batch 750 keeps working, else
 *  the deployment's. A template with a problem is passed over. */
export function effectiveAddresses(
  settings: SlideImageSettings | undefined,
  facilityId: string | undefined,
  deployment: SlideImageAddresses = deploymentAddresses(),
  listedViewerTemplate = '',
): SlideImageAddresses {
  const s = settings ?? DEFAULT_SLIDE_IMAGE_SETTINGS;
  const facility = facilityId ? s.facilityOverrides?.[facilityId] : undefined;
  const pick = (k: keyof SlideImageAddresses) =>
    [facility?.[k], s[k], k === 'viewerUrlTemplate' ? listedViewerTemplate : '', deployment[k]]
      .map(v => (v ?? '').trim()).find(v => v && !templateProblem(v)) ?? '';
  return { viewerUrlTemplate: pick('viewerUrlTemplate'), thumbnailUrlTemplate: pick('thumbnailUrlTemplate') };
}

/** One address field that can't be saved, for the settings card. */
export interface SlideImageSettingsError { scope: string; field: keyof SlideImageAddresses; problem: TemplateProblem }

/** Checks the settings before they are saved ('' is fine anywhere). Facilities with nothing set are dropped. */
export function validateSlideImageSettings(draft: SlideImageSettings):
  { ok: true; settings: SlideImageSettings } | { ok: false; errors: SlideImageSettingsError[] } {
  const errors: SlideImageSettingsError[] = [];
  const check = (scope: string, a: Partial<SlideImageAddresses>) => {
    for (const field of ['viewerUrlTemplate', 'thumbnailUrlTemplate'] as const) {
      const problem = templateProblem(a[field] ?? '');
      if (problem) errors.push({ scope, field, problem });
    }
  };
  check('lab', draft);
  const facilityOverrides: Record<string, Partial<SlideImageAddresses>> = {};
  for (const [id, a] of Object.entries(draft.facilityOverrides ?? {})) {
    check(id, a);
    const kept = { viewerUrlTemplate: (a.viewerUrlTemplate ?? '').trim(), thumbnailUrlTemplate: (a.thumbnailUrlTemplate ?? '').trim() };
    if (kept.viewerUrlTemplate || kept.thumbnailUrlTemplate) facilityOverrides[id] = kept;
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, settings: { viewerUrlTemplate: draft.viewerUrlTemplate.trim(), thumbnailUrlTemplate: draft.thumbnailUrlTemplate.trim(), facilityOverrides } };
}

/** The address for one slide (each value encoded), or '' when there is no usable template. */
export function fillTemplate(template: string, values: { slideId: string; accession: string }): string {
  if (!template || templateProblem(template) || !values.slideId.trim()) return '';
  return template.split(SLIDE_ID_PLACEHOLDER).join(encodeURIComponent(values.slideId.trim()))
    .split(ACCESSION_PLACEHOLDER).join(encodeURIComponent(values.accession.trim()));
}

/** What the slide's last unload from a scanner found (set by wsiScanQueue.stainUnloaded). */
export type SlideScanOutcome = 'scanned' | 'scanFailed' | 'imageQcFailed' | 'notScanned' | 'imageQcPending'; // Batch 763: scanned, waiting for image QC

export interface SlideScanFields {
  distributionStatus?: 'Assigned' | 'Checked Out' | 'In Scanning Queue' | 'Loaded on Scanner' | 'Scanned';
  lastScanOutcome?: SlideScanOutcome;
}

/** The slide's image state, in the words the screen shows. */
export type SlideImageState = 'noImageYet' | 'queued' | 'scanning' | 'scanFailed' | 'failedImageQuality' | 'awaitingImageQc' | 'available';

export function slideImageState(slide: SlideScanFields): SlideImageState {
  switch (slide.distributionStatus) {
    case 'Scanned': return slide.lastScanOutcome === 'imageQcPending' ? 'awaitingImageQc' : 'available'; // Batch 763: not shown until its image QC passes
    case 'Loaded on Scanner': return 'scanning';
    case 'In Scanning Queue':
      return slide.lastScanOutcome === 'imageQcFailed' ? 'failedImageQuality' : slide.lastScanOutcome === 'scanFailed' ? 'scanFailed' : 'queued';
    default: return 'noImageYet';
  }
}

/** Cytology screening on whole slide images has no per-slide scanner status: the instrument's WSI modality means the
 *  slide was imaged. */
export const CYTOLOGY_WSI_SCAN: SlideScanFields = { distributionStatus: 'Scanned' };

/** Whether the scanner made an image the preview can show (a failed-quality image is shown, marked as such). */
export const stateHasImage = (state: SlideImageState): boolean => state === 'available' || state === 'failedImageQuality';

/** An image the interface delivered for a slide (a scanner or image system's own preview). */
export interface SlidePreview {
  id: string;
  slideDisplayId: string;
  /** https, or a data:image/jpeg|png URL as the interface delivered it. Shown unchanged. */
  imageUrl: string;
  /** Where it came from, for the record. */
  sourceSystemId: string;
  receivedAt: string;
}

/** A delivered preview's address is usable: https, or an inline JPEG or PNG. */
export function previewUrlUsable(url: string): boolean {
  if (/^data:image\/(jpeg|png);base64,/i.test(url)) return true;
  try { const u = new URL(url); return u.protocol === 'https:' && !u.username && !u.password; } catch { return false; }
}

/** The thumbnail to show, or '' when there is none. */
export function thumbnailUrlFor(
  state: SlideImageState, delivered: SlidePreview | null | undefined, addresses: SlideImageAddresses, values: { slideId: string; accession: string },
): string {
  if (!stateHasImage(state)) return '';
  if (delivered && previewUrlUsable(delivered.imageUrl)) return delivered.imageUrl;
  return fillTemplate(addresses.thumbnailUrlTemplate, values);
}

/** The case a slide identifier belongs to: everything before the block and level parts (S26-4680-A1-L1 → S26-4680). */
export function accessionOfSlideId(slideDisplayId: string): string {
  const parts = slideDisplayId.trim().split('-');
  return parts.length > 2 ? parts.slice(0, -2).join('-') : '';
}

/** What the slide's preview shows: its image state, the thumbnail address ('' for none) and whether it can be opened. */
export interface SlideImageView { state: SlideImageState; thumbnailUrl: string; failedQuality: boolean }

export function slideImageView(
  slide: SlideScanFields, delivered: SlidePreview | null | undefined, addresses: SlideImageAddresses, values: { slideId: string; accession: string },
): SlideImageView {
  const state = slideImageState(slide);
  return { state, thumbnailUrl: thumbnailUrlFor(state, delivered, addresses, values), failedQuality: state === 'failedImageQuality' };
}

/** The remembered window the laboratory's application opens in (its own saved size and position per workstation). */
export const SLIDE_IMAGE_WINDOW_NAME = 'PathScribeSlideImage';
