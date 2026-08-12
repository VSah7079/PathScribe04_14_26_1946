// src/services/diagnosisCodes/mockDiagnosisCodesService.ts

import type { ServiceResult } from '../types';
import type { Icd10Code, IDiagnosisCodesService } from './IDiagnosisCodesService';

// Real, current ICD-10-CM codes — verified against the standard's
// actual code structure, not invented. Scoped to what's relevant given
// the specimen types already seeded in this system (breast, colon,
// kidney, lung, skin, lymph node, bone marrow).
const ICD10_CODES: Icd10Code[] = [
  { code: 'N63.0', description: 'Unspecified lump in unspecified breast' },
  { code: 'N63.10', description: 'Unspecified lump in right breast' },
  { code: 'N63.20', description: 'Unspecified lump in left breast' },
  { code: 'R92.2', description: 'Inconclusive mammogram' },
  { code: 'C50.919', description: 'Malignant neoplasm of unspecified site of unspecified female breast' },
  { code: 'D24.9', description: 'Benign neoplasm of unspecified breast' },
  { code: 'K63.5', description: 'Polyp of colon' },
  { code: 'C18.9', description: 'Malignant neoplasm of colon, unspecified' },
  { code: 'K52.9', description: 'Noninfective gastroenteritis and colitis, unspecified' },
  { code: 'N28.89', description: 'Other specified disorders of kidney and ureter' },
  { code: 'N05.9', description: 'Unspecified nephritic syndrome with unspecified morphologic changes' },
  { code: 'N18.6', description: 'End stage renal disease' },
  { code: 'C64.9', description: 'Malignant neoplasm of unspecified kidney, except renal pelvis' },
  { code: 'R91.8', description: 'Other nonspecific abnormal finding of lung field' },
  { code: 'C34.90', description: 'Malignant neoplasm of unspecified part of unspecified bronchus or lung' },
  { code: 'D49.1', description: 'Neoplasm of unspecified behavior of respiratory system' },
  { code: 'D22.9', description: 'Melanocytic nevi, unspecified' },
  { code: 'C43.9', description: 'Malignant melanoma of skin, unspecified' },
  { code: 'L98.9', description: 'Disorder of the skin and subcutaneous tissue, unspecified' },
  { code: 'R59.9', description: 'Enlarged lymph nodes, unspecified' },
  { code: 'C85.90', description: 'Non-Hodgkin lymphoma, unspecified, unspecified site' },
  { code: 'D47.Z9', description: 'Other specified neoplasm of uncertain behavior of lymphoid, hematopoietic and related tissue' },
  { code: 'D61.9', description: 'Aplastic anemia, unspecified' },
  { code: 'C90.00', description: 'Multiple myeloma not having achieved remission' },
  { code: 'D46.9', description: 'Myelodysplastic syndrome, unspecified' },
  { code: 'K80.20', description: 'Calculus of gallbladder without cholecystitis without obstruction' },
  { code: 'K37', description: 'Unspecified appendicitis' },
];

const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });

export const mockDiagnosisCodesService: IDiagnosisCodesService = {
  async getAll() {
    return ok([...ICD10_CODES]);
  },
  async search(query) {
    const q = query.trim().toLowerCase();
    if (!q) return ok([]);
    return ok(ICD10_CODES.filter(c => c.code.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)).slice(0, 20));
  },
};
