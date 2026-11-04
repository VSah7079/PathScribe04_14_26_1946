// Simulated ICD-O-3 / ICD-11 lookup and manual ICD-O-3 entry checks, used when the live terminology service
// cannot be reached (no key or no network). Results are a small built-in sample and are labelled Simulated.
import type { CodeResult } from './codeSearchService';

export const SIMULATED_HIERARCHY = 'Simulated';

const ICDO: [string, string][] = [
  ['8140/3', 'Adenocarcinoma, NOS'], ['8500/3', 'Infiltrating duct carcinoma, NOS'], ['8500/2', 'Intraductal carcinoma, non-infiltrating, NOS'],
  ['8070/3', 'Squamous cell carcinoma, NOS'], ['8720/3', 'Malignant melanoma, NOS'], ['8140/0', 'Adenoma, NOS'], ['8010/3', 'Carcinoma, NOS'],
  ['8000/1', 'Neoplasm, uncertain whether benign or malignant'], ['9680/3', 'Malignant lymphoma, large B-cell, diffuse, NOS'],
  ['C50.9', 'Breast, NOS'], ['C18.9', 'Colon, NOS'], ['C34.9', 'Lung, NOS'], ['C61.9', 'Prostate gland'], ['C44.9', 'Skin, NOS'], ['C53.9', 'Cervix uteri'],
];
const ICD11: [string, string][] = [
  ['2C60', 'Malignant neoplasms of breast'], ['2B90', 'Malignant neoplasms of colon'], ['2C25', 'Malignant neoplasms of bronchus or lung'],
  ['2C82', 'Malignant neoplasms of prostate'], ['2C30', 'Melanoma of skin'], ['2E60', 'Carcinoma in situ of breast'], ['2F30', 'Benign neoplasm of colon'],
];

function pick(table: [string, string][], system: string, q: string, max: number): CodeResult[] {
  const n = q.trim().toLowerCase();
  if (!n) return [];
  return table
    .filter(([c, d]) => c.toLowerCase().startsWith(n) || d.toLowerCase().includes(n))
    .slice(0, max)
    .map(([code, display]) => ({ code, display, system, hierarchy: SIMULATED_HIERARCHY }));
}

export function simulatedIcdoSearch(q: string, max = 20): CodeResult[] { return pick(ICDO, 'ICDO', q, max); }
export function simulatedIcd11Search(q: string, max = 20): CodeResult[] { return pick(ICD11, 'ICD11', q, max); }
export function isSimulatedResult(r: CodeResult): boolean { return r.hierarchy === SIMULATED_HIERARCHY; }

export const ICDO_BEHAVIOUR_DIGITS: Record<string, string> = {
  '0': 'Benign', '1': 'Uncertain whether benign or malignant', '2': 'Carcinoma in situ', '3': 'Malignant, primary site', '6': 'Malignant, metastatic site', '9': 'Malignant, uncertain whether primary or metastatic',
};

export type IcdoCheck =
  | { ok: true; kind: 'morphology' | 'topography'; code: string; behaviour?: string }
  | { ok: false; reason: 'format' | 'behaviour' | 'empty' };

/** Morphology is four digits, a slash, then the behaviour digit (0, 1, 2, 3, 6 or 9). Topography is C00 to C80, optionally .0 to .9. */
export function checkIcdO3Entry(raw: string): IcdoCheck {
  const v = raw.trim().toUpperCase();
  if (!v) return { ok: false, reason: 'empty' };
  const m = /^(\d{4})\/(\d)$/.exec(v);
  if (m) {
    if (!(m[2] in ICDO_BEHAVIOUR_DIGITS)) return { ok: false, reason: 'behaviour' };
    return { ok: true, kind: 'morphology', code: v, behaviour: ICDO_BEHAVIOUR_DIGITS[m[2]] };
  }
  const t = /^C(\d{2})(?:\.(\d))?$/.exec(v);
  if (t && Number(t[1]) <= 80) return { ok: true, kind: 'topography', code: v };
  return { ok: false, reason: 'format' };
}
