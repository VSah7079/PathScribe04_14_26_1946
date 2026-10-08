// src/services/reports/workupPdf.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 426 (Pete: "Separate PDFs per Synoptic Workup"). One synoptic
// workup's own PDF, so the LIS can file, show and replace each part's result
// on its own: a correction to Part B sends Part B's PDF only.
//
// The report renderer (functions/main.py render_report, the same one every
// report PDF comes from) draws it from `workup`: the parts, the protocol and
// its version, Final / Corrected / Addendum, the version, the signer, the
// document id (the synoptic result's pdf_document_id) and, for a correction,
// what changed. Then the workup's answers. No report layout is needed; an
// Assist case has none. Wording around it in the report's language
// (surgicalReportPdf.*).
//
// Batch 427 (Pete: per-site PDF consolidation): buildCombinedRenderPayload puts
// every workup of a case in one render request (`workups`), so a site whose
// LIS takes one PDF per accession gets one document, its pages running on.
//
// buildWorkupRenderPayload, buildCombinedRenderPayload and workupChanges are pure; renderWorkupPdf posts to
// the renderer (deps.post, a fake in tests).
// ─────────────────────────────────────────────────────────────────────────────

import { resolveServiceEndpoint } from '@/utils/serviceEndpoint';
import type { SynopticResultPayloadV1 } from './synopticResultPayload';

/** The report renderer's endpoint (the same setting the report page uses). */
const REPORT_PDF = resolveServiceEndpoint({
  name: 'report renderer',
  envVar: 'VITE_REPORT_PDF_ENDPOINT',
  configured: import.meta.env.VITE_REPORT_PDF_ENDPOINT,
  devDefault: 'http://localhost:8080/',
  isProduction: !!import.meta.env.PROD,
});

export interface WorkupChange { label: string; from: string; to: string }

const show = (v: string | string[] | undefined | null) => (Array.isArray(v) ? v.join(', ') : v ?? '');

/** What changed between the version sent before and this one, by field label (observations as sent). */
export function workupChanges(
  previous: SynopticResultPayloadV1['synoptic_observations'] | undefined,
  current: SynopticResultPayloadV1['synoptic_observations'],
): WorkupChange[] {
  if (!previous) return [];
  const before = new Map(previous.map(o => [o.field_id, o]));
  const after = new Map(current.map(o => [o.field_id, o]));
  const ids = [...new Set([...before.keys(), ...after.keys()])];
  return ids
    .map(id => ({ b: before.get(id), a: after.get(id) }))
    .filter(({ b, a }) => show(b?.value) + (b?.unit ?? '') !== show(a?.value) + (a?.unit ?? ''))
    .map(({ b, a }) => ({
      label: a?.label ?? b?.label ?? '',
      from: b ? [show(b.value), b.unit].filter(Boolean).join(' ') : '',
      to: a ? [show(a.value), a.unit].filter(Boolean).join(' ') : '',
    }));
}

export interface WorkupRenderInput {
  result: SynopticResultPayloadV1;
  caseHeader: { accession: string; patient: string; mrn: string; dob: string; referring?: string; clinician?: string };
  institution?: { name?: string; dept?: string; address?: string; phone?: string };
  signerName: string;
  signedAtDisplay: string;
  changes: WorkupChange[];
  language?: string;
  labels?: Record<string, string>;
}

/** The render request for one workup's PDF. */
export function buildWorkupRenderPayload(input: WorkupRenderInput) {
  const r = input.result;
  return {
    templateName: r.header.template.name ?? r.header.template.id,
    institution: input.institution ?? {},
    caseHeader: input.caseHeader,
    synopticAnswers: r.synoptic_observations.map(o => ({
      fieldId: o.field_id, fieldLabel: o.label, displayValue: [show(o.value), o.unit].filter(Boolean).join(' '),
    })),
    workup: {
      parts: r.header.specimen_ids,
      protocol: r.header.template.name ?? r.header.template.id,
      protocolVersion: r.header.template.version ?? '',
      status: r.header.workup_status,
      version: r.header.workup_version,
      signedBy: input.signerName,
      signedAt: input.signedAtDisplay,
      documentId: r.header.pdf_document_id,
      changes: input.changes,
    },
    outputFormat: 'pdf' as const,
    ...(input.language ? { language: input.language } : {}),
    ...(input.labels ? { labels: input.labels } : {}),
  };
}

/** Batch 427: every workup of the case in one render request (one PDF, one document id). */
export function buildCombinedRenderPayload(input: {
  workups: { result: SynopticResultPayloadV1; signerName: string; signedAtDisplay: string; changes: WorkupChange[] }[];
  caseHeader: WorkupRenderInput['caseHeader'];
  institution?: WorkupRenderInput['institution'];
  documentId: string;
  language?: string;
  labels?: Record<string, string>;
}) {
  const parts = input.workups.map(w => buildWorkupRenderPayload({ ...w, caseHeader: input.caseHeader, institution: input.institution }));
  return {
    institution: input.institution ?? {},
    caseHeader: input.caseHeader,
    documentId: input.documentId,
    workups: parts.map(p => ({ ...p.workup, documentId: input.documentId, synopticAnswers: p.synopticAnswers })),
    outputFormat: 'pdf' as const,
    ...(input.language ? { language: input.language } : {}),
    ...(input.labels ? { labels: input.labels } : {}),
  };
}

export interface RenderWorkupPdfDeps {
  /** POSTs the render request; resolves to the PDF bytes base64-encoded. */
  post?: (url: string, body: object) => Promise<{ ok: boolean; status?: number; pdfBase64?: string }>;
}

async function defaultPost(url: string, body: object): Promise<{ ok: boolean; status?: number; pdfBase64?: string }> {
  const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!resp.ok) return { ok: false, status: resp.status };
  const bytes = new Uint8Array(await resp.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return { ok: true, pdfBase64: btoa(binary) };
}

/** Renders one workup's PDF. Never throws: a failure comes back as generationError. */
export async function renderWorkupPdf(payload: object, deps: RenderWorkupPdfDeps = {}): Promise<{ pdfBase64?: string; generationError?: string }> {
  if (REPORT_PDF.ok === false) return { generationError: REPORT_PDF.message };
  try {
    const r = await (deps.post ?? defaultPost)(REPORT_PDF.url, payload);
    return r.ok && r.pdfBase64 ? { pdfBase64: r.pdfBase64 } : { generationError: `Workup PDF generation failed (${r.status ?? 'no response'})` };
  } catch (e) {
    return { generationError: e instanceof Error ? e.message : String(e) };
  }
}
