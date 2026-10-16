// src/services/cytology/renderCytologyPdf.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 539 (PS-539 decision D2): every cytology report PDF, preview or
// release, is made by the report renderer (functions/cytology_report.py) from
// the lines cytologyRenderPayload.ts composes. The browser no longer draws
// one (the jsPDF renderer is removed).
//
// A renderer deployed before Batch 539 doesn't know the cytology template and
// would answer with an empty surgical page. The template marks its PDFs
// (Keywords: pathscribe-template:cytology); a PDF without the mark is refused
// here, so a release is held for retry instead of sending a blank report.
// ─────────────────────────────────────────────────────────────────────────────

import type { CytologyReportContent } from '@/types/cytology/CytologyReportContent';
import type { CytologyCaseReport } from '@/types/cytology/CytologyCaseReport';
import { bytesToBase64, postReportRender, type PostReportRender } from '../reports/reportRenderer';
import { cytologyPdfLabelsFor } from './cytologyPdfLabelsFor';
import {
  buildCytologyCaseRenderPayload, buildCytologyReportRenderPayload, cytologyLogoUrls,
  type CytologyRenderOptions, type CytologyRenderPayload,
} from './cytologyRenderPayload';

export const CYTOLOGY_TEMPLATE_MARKER = 'pathscribe-template:cytology';

export const CYTOLOGY_TEMPLATE_MISSING =
  'The report renderer does not have the cytology template yet (its functions/ deployment needs updating), so the report was not made.';

export interface RenderCytologyDeps {
  post?: PostReportRender;
  /** A letterhead logo's bytes, base64; undefined when it can't be fetched. */
  fetchLogo?: (url: string) => Promise<string | undefined>;
}

/** True when the bytes were made by the cytology template. */
export function hasCytologyTemplateMarker(bytes: Uint8Array): boolean {
  const marker = new TextEncoder().encode(CYTOLOGY_TEMPLATE_MARKER);
  outer: for (let i = 0; i + marker.length <= bytes.length; i++) {
    for (let j = 0; j < marker.length; j++) if (bytes[i + j] !== marker[j]) continue outer;
    return true;
  }
  return false;
}

const defaultFetchLogo = async (url: string): Promise<string | undefined> => {
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return bytesToBase64(new Uint8Array(await resp.arrayBuffer()));
  } catch (e) {
    // A logo that can't be fetched never stops the report (as before Batch 539).
    console.warn(`[PathScribe] The letterhead logo could not be fetched (${url}): ${e instanceof Error ? e.message : String(e)}`);
    return undefined;
  }
};

async function logosFor(contents: readonly CytologyReportContent[], deps: RenderCytologyDeps): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const url of cytologyLogoUrls(contents)) {
    const data = await (deps.fetchLogo ?? defaultFetchLogo)(url);
    if (data) out[url] = data;
  }
  return out;
}

/** Posts a payload and checks the cytology template made the PDF. Throws on any failure. */
export async function renderCytologyPayload(payload: CytologyRenderPayload, deps: RenderCytologyDeps = {}): Promise<Uint8Array> {
  const bytes = await (deps.post ?? postReportRender)(payload);
  if (!hasCytologyTemplateMarker(bytes)) throw new Error(CYTOLOGY_TEMPLATE_MISSING);
  return bytes;
}

/** One report: a specimen's signed report, a preliminary, or (with a watermark) a preview. */
export async function renderCytologyReportPdf(
  content: CytologyReportContent,
  options: Pick<CytologyRenderOptions, 'watermarkText'> = {},
  deps: RenderCytologyDeps = {},
): Promise<Uint8Array> {
  const logos = await logosFor([content], deps);
  return renderCytologyPayload(buildCytologyReportRenderPayload(content, cytologyPdfLabelsFor(content.language), { ...options, logos }), deps);
}

/** The consolidated case report (Batch 532). */
export async function renderCytologyCaseReportPdf(report: CytologyCaseReport, deps: RenderCytologyDeps = {}): Promise<Uint8Array> {
  const logos = await logosFor(report.specimens.flatMap(s => (s.record ? [s.record.reportContent] : [])), deps);
  return renderCytologyPayload(buildCytologyCaseRenderPayload(report, cytologyPdfLabelsFor, { logos }), deps);
}

/** The message key for a failed print or preview: an outdated renderer says so; anything else is the general failure. */
export function cytologyPrintFailureKey(error: unknown): 'cytologyScreening.printRendererOutdated' | 'cytologyScreening.printFailed' {
  return error instanceof Error && error.message === CYTOLOGY_TEMPLATE_MISSING ? 'cytologyScreening.printRendererOutdated' : 'cytologyScreening.printFailed';
}

/** As { pdfBase64 } or { generationError }, the shape print, delivery and the result messages take. Never throws. */
export async function asPdfSnapshot(render: () => Promise<Uint8Array>): Promise<{ pdfBase64?: string; generationError?: string }> {
  try {
    return { pdfBase64: bytesToBase64(await render()) };
  } catch (e) {
    return { generationError: e instanceof Error ? e.message : String(e) };
  }
}
