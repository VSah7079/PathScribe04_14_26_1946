// src/services/terminologySearch/nlmLookupRoute.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-488, Pete's decision Oct 18, 2026): where the public NLM
// look-ups (ICD-10-CM, ICD-11, LOINC) are sent.
//   - With the API server configured: a same-origin route on the PathScribe
//     server (/api/terminology/nlm/<method>), which holds any credentials,
//     caches repeated look-ups and calls NLM itself. The browser never names an
//     NLM host, and the security headers for a server deployment don't allow one.
//   - With no API server (the demonstration): the browser calls NLM directly,
//     as before.
// Route names follow HTTP_SERVICES_PATTERN.md section 7 (kebab-case method
// names under /api/<area>/<service>/). Contract: docs/architecture/TERMINOLOGY_PROXY_API.md.
// ─────────────────────────────────────────────────────────────────────────────
import { TERMINOLOGY_CONFIG } from '../../components/Config/Terminology/terminologyConfig';
import { apiServerUrl } from '../apiServer/apiServerUrl';

export type NlmLookupKind = 'icd10' | 'icd11' | 'loinc';

export const NLM_PROXY_BASE = '/api/terminology/nlm';

const PROXY_METHOD: Record<NlmLookupKind, string> = {
  icd10: 'search-icd10',
  icd11: 'search-icd11',
  loinc: 'search-loinc',
};

/** True when look-ups go through the API server (an API address is configured). */
export function nlmViaServer(): boolean {
  return apiServerUrl('terminologySearch') !== null;
}

/** The URL (without the query string) a look-up of this kind is sent to. */
export function nlmLookupUrl(kind: NlmLookupKind): string {
  if (nlmViaServer()) return `${NLM_PROXY_BASE}/${PROXY_METHOD[kind]}`;
  return `${TERMINOLOGY_CONFIG.nlm.baseUrl}${TERMINOLOGY_CONFIG.nlm.endpoints[kind]}`;
}
