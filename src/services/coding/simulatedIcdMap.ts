// src/services/coding/simulatedIcdMap.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 607 (#138): a small seeded ICD-10 to ICD-11 table so a case's codes can be shown side by side.
// SIMULATED: these pairs are illustrative and are not the WHO mapping tables. Every use is labelled Simulated.
// The real map arrives from the WHO mapping tables through the server (Planned).
// ─────────────────────────────────────────────────────────────────────────────
import type { CodedEntry } from './codedEntry';

export interface IcdMapRow { icd10: string; icd11: string; display: string }

export const SIMULATED_ICD_MAP: readonly IcdMapRow[] = [
  { icd10: 'C50.9', icd11: '2C60', display: 'Malignant neoplasm of breast' },
  { icd10: 'C18.9', icd11: '2B90', display: 'Malignant neoplasm of colon' },
  { icd10: 'C34.9', icd11: '2C25', display: 'Malignant neoplasm of bronchus or lung' },
  { icd10: 'C61',   icd11: '2C82', display: 'Malignant neoplasm of prostate' },
  { icd10: 'C43.9', icd11: '2C30', display: 'Melanoma of skin' },
  { icd10: 'D05.1', icd11: '2E60', display: 'Carcinoma in situ of breast' },
  { icd10: 'D12.6', icd11: '2F30', display: 'Benign neoplasm of colon' },
  { icd10: 'C53.9', icd11: '2C77', display: 'Malignant neoplasm of cervix uteri' },
  { icd10: 'C73',   icd11: '2D10', display: 'Malignant neoplasm of thyroid gland' },
  { icd10: 'C25.9', icd11: '2C10', display: 'Malignant neoplasm of pancreas' },
];

export interface SideBySideRow { icd10?: CodedEntry; icd11?: CodedEntry; mappedIcd11?: string; display?: string }

/** One row per ICD-10 code with the (simulated) ICD-11 pair, plus rows for ICD-11 codes the case already has. Cluster codes match on the stem before "&". */
export function sideBySide(entries: readonly CodedEntry[]): SideBySideRow[] {
  const ten = entries.filter(e => e.system === 'ICD10');
  const eleven = entries.filter(e => e.system === 'ICD11');
  const stem = (c: string) => c.split(/[&/.]/)[0].trim().toUpperCase();
  const used = new Set<CodedEntry>();
  const rows: SideBySideRow[] = ten.map(e => {
    const m = SIMULATED_ICD_MAP.find(r => r.icd10 === e.code.toUpperCase());
    const have = m ? eleven.find(x => stem(x.code) === m.icd11) : undefined;
    if (have) used.add(have);
    return { icd10: e, ...(have ? { icd11: have } : {}), ...(m ? { mappedIcd11: m.icd11, display: m.display } : {}) };
  });
  for (const x of eleven) if (!used.has(x)) rows.push({ icd11: x });
  return rows;
}
