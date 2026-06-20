/**
 * umlsCodeService.ts — src/services/codes/umlsCodeService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Live SNOMED CT search via the NLM UTS REST API.
 * ICD-10, ICD-11, and ICD-O fall back to the curated mock seed data since
 * those require separate NLM endpoints or licensed data files.
 *
 * All requests are routed through /api/terminology/umls (Vite proxy in dev,
 * Vercel serverless in production). The UMLS_API_KEY is injected server-side
 * and never appears in the browser bundle.
 *
 * UTS REST API docs: https://documentation.uts.nlm.nih.gov/rest/home.html
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { ServiceResult }                              from '../types';
import type { ClinicalCode, CodeSearchParams, CodeSystem,
              IcdOSubtype, ICodeService }                  from './ICodeService';
import { mockCodeService }                                 from './mockCodeService';

// ─── Base URL ──────────────────────────────────────────────────────────────────
// The proxy at /api/terminology/umls rewrites to uts-ws.nlm.nih.gov/rest
// and appends ?apiKey=<UMLS_API_KEY> server-side.
// No API key is needed or read on the client.
const UTS_BASE = '/api/terminology/umls';

// ─── Helpers ───────────────────────────────────────────────────────────────────
const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });

const SNOMED_SOURCE = 'SNOMEDCT_US';

// ─── UTS response types ────────────────────────────────────────────────────────

interface UtsResult {
  ui:         string;   // SNOMED concept ID
  name:       string;   // preferred term
  rootSource: string;   // e.g. 'SNOMEDCT_US'
  uri?:       string;
}

interface UtsSearchResponse {
  result: {
    results:    UtsResult[];
    pageNumber: number;
    pageSize:   number;
  };
}

// ─── Category inference ────────────────────────────────────────────────────────
// UTS doesn't return PathScribe categories — we infer from the concept name.

const CATEGORY_RULES: Array<{ pattern: RegExp; category: string }> = [
  { pattern: /carcinoma|adenocarcinoma|squamous|transitional|small.cell|non.small/i, category: 'Morphology|Malignant Epithelial' },
  { pattern: /melanoma/i,                                                             category: 'Morphology|Melanocytic' },
  { pattern: /lymphoma|leukaemia|leukemia|myeloma|lymphocytic/i,                     category: 'Morphology|Haematological' },
  { pattern: /glioma|glioblastoma|meningioma|astrocytoma|oligodendroglioma/i,        category: 'Morphology|CNS' },
  { pattern: /sarcoma|liposarcoma|leiomyosarcoma|fibrosarcoma|rhabdomyo/i,           category: 'Morphology|Mesenchymal' },
  { pattern: /in.situ|dysplasia|adenoma|intraepithelial|hyperplasia/i,               category: 'Morphology|Pre-Malignant' },
  { pattern: /breast/i,                                                               category: 'Body Structure|Breast' },
  { pattern: /colon|rectum|rectal|colorectal|sigmoid|caecum|cecum/i,                 category: 'Body Structure|Colorectal' },
  { pattern: /prostate|prostatic/i,                                                   category: 'Body Structure|Urological' },
  { pattern: /lung|bronch|pulmonary/i,                                                category: 'Body Structure|Thoracic' },
  { pattern: /lymph.node|axillary|inguinal|mediastinal/i,                            category: 'Body Structure|Lymph Node' },
  { pattern: /liver|hepatic|biliary|cholangiocarcinoma/i,                            category: 'Body Structure|Hepatobiliary' },
  { pattern: /kidney|renal|nephro/i,                                                  category: 'Body Structure|Urological' },
  { pattern: /biopsy|excision|resection|mastectomy|prostatectomy/i,                  category: 'Procedure|Surgical' },
  { pattern: /skin|dermal|cutaneous|melanocytic/i,                                   category: 'Body Structure|Skin' },
];

function inferCategory(name: string): string {
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(name)) return rule.category;
  }
  return 'Morphology|Other';
}

// ─── SNOMED search via UTS proxy ───────────────────────────────────────────────

async function searchSnomed(query: string, pageSize = 25): Promise<ClinicalCode[]> {
  const params = new URLSearchParams({
    string:       query,
    sabs:         SNOMED_SOURCE,
    returnIdType: 'code',
    pageSize:     String(pageSize),
  });

  try {
    const response = await fetch(`${UTS_BASE}/search/current?${params}`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      console.error(`[umlsCodeService] UTS proxy error ${response.status}`);
      const fallback = await mockCodeService.search({ system: 'SNOMED', query });
      return fallback.ok ? fallback.data : [];
    }

    const data: UtsSearchResponse = await response.json();
    const results = data?.result?.results ?? [];

    return results
      .filter(r => r.rootSource === SNOMED_SOURCE && r.ui && r.ui !== 'NONE')
      .map(r => ({
        code:         r.ui,
        display:      r.name,
        system:       'SNOMED' as CodeSystem,
        category:     inferCategory(r.name),
        jurisdiction: 'ALL',
        active:       true,
      }));

  } catch (e) {
    console.error('[umlsCodeService] Network error:', e);
    const fallback = await mockCodeService.search({ system: 'SNOMED', query });
    return fallback.ok ? fallback.data : [];
  }
}

// ─── Service ───────────────────────────────────────────────────────────────────

export const umlsCodeService: ICodeService = {

  async search(params: CodeSearchParams): Promise<ServiceResult<ClinicalCode[]>> {
    if (params.system === 'SNOMED') {
      const query = params.query?.trim() ?? '';

      // No query — return local seed data (browse mode)
      if (!query) {
        return mockCodeService.search(params);
      }

      const results = await searchSnomed(query);

      const filtered = params.category
        ? results.filter(c =>
            c.category?.startsWith(params.category + '|') ||
            c.category === params.category
          )
        : results;

      return ok(filtered);
    }

    // ICD-10, ICD-11, ICD-O — delegate to mock service
    return mockCodeService.search(params);
  },

  async getByCode(system: CodeSystem, code: string): Promise<ServiceResult<ClinicalCode>> {
    if (system === 'SNOMED') {
      try {
        const response = await fetch(
          `${UTS_BASE}/content/current/source/${SNOMED_SOURCE}/${code}`,
          { headers: { 'Accept': 'application/json' } }
        );

        if (response.ok) {
          const data = await response.json();
          const concept = data?.result;
          if (concept?.ui) {
            return ok({
              code:         concept.ui,
              display:      concept.name ?? concept.defaultPreferredName,
              system:       'SNOMED',
              category:     inferCategory(concept.name ?? ''),
              jurisdiction: 'ALL',
              active:       true,
            });
          }
        }
      } catch {
        // Fall through to mock
      }
    }

    return mockCodeService.getByCode(system, code);
  },

  async getCategories(system: CodeSystem, subtype?: IcdOSubtype): Promise<ServiceResult<string[]>> {
    // Categories are static — always use mock
    return mockCodeService.getCategories(system, subtype);
  },
};

export default umlsCodeService;
