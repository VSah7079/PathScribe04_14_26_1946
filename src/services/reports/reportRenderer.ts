// src/services/reports/reportRenderer.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 539 (PS-539 D2): the report renderer's address and one way to post to
// it, shared by the report page, the Assist workup PDF and the cytology report
// (each had, or would have had, its own copy of this setting).
//
// The renderer is functions/main.py `render_report` today and the API server's
// report service later (docs/architecture/REPORT_RENDERING_SERVICE.md). Its URL
// comes from VITE_REPORT_PDF_ENDPOINT, under the rules in utils/serviceEndpoint.ts:
// HTTPS in production, a loopback default in development.
// ─────────────────────────────────────────────────────────────────────────────

import { resolveServiceEndpoint, type ServiceEndpoint } from '@/utils/serviceEndpoint';
import { appEnv } from '@/services/runtimeConfig/runtimeEnv';

export const REPORT_RENDERER: ServiceEndpoint = resolveServiceEndpoint({
  name: 'report renderer',
  envVar: 'VITE_REPORT_PDF_ENDPOINT',
  configured: appEnv().VITE_REPORT_PDF_ENDPOINT,
  devDefault: 'http://localhost:8080/',
  isProduction: !!import.meta.env.PROD,
});

/** The renderer's URL, or throws its configuration problem. */
export function reportRendererUrl(endpoint: ServiceEndpoint = REPORT_RENDERER): string {
  if (endpoint.ok === false) throw new Error(endpoint.message);
  return endpoint.url;
}

export type PostReportRender = (body: object) => Promise<Uint8Array>;

/** POSTs a render request and returns the PDF bytes; a refusal throws with the status. */
export const postReportRender: PostReportRender = async body => {
  const resp = await fetch(reportRendererUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`The report renderer refused the request (${resp.status})`);
  return new Uint8Array(await resp.arrayBuffer());
};

/** Base64 of PDF bytes, in chunks (a large PDF exceeds the argument limit of one fromCharCode call). */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}
