// src/services/diagnosisCodes/IDiagnosisCodesService.ts
// ─────────────────────────────────────────────────────────────
// Order-level diagnosis codes. Named "diagnosisCodes" rather than the
// original "icd10" — narrower than warranted once a second, genuinely
// separate coding system was found elsewhere in the app (case-level,
// AI-assisted, multi-standard: SNOMED/ICD-10/ICD-11/CPT/ICD-O, used by
// the pathologist near sign-out for final, confirmed coding — see
// pages/Synoptic/Codes/AddCodeModal.tsx). This service is specifically
// the referring physician's diagnosis code as it arrives on the order/
// requisition — broader than "icd10" (room for ICD-11 without another
// rename) without being as broad as "codes," which is already that
// other system's real domain.
//
// Deliberately a small, pathology-relevant seed set — real ICD-10-CM
// runs to tens of thousands of codes across every specialty;
// reproducing the full standard here would be its own large, separate
// undertaking with real currency/maintenance obligations (codes get
// added/retired annually). This is scoped to what a pathology order
// actually needs: a searchable picker over the codes that show up
// routinely on referring-physician paperwork for the specimen types
// already in this system, not a comprehensive coding reference.
// ─────────────────────────────────────────────────────────────

import type { ServiceResult } from '../types';

export interface Icd10Code {
  code: string;
  description: string;
}

export interface IDiagnosisCodesService {
  getAll(): Promise<ServiceResult<Icd10Code[]>>;
  search(query: string): Promise<ServiceResult<Icd10Code[]>>;
}
