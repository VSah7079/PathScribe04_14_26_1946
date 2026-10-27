// src/services/patients/patientNhsNumberStatus.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 662. What the patient banner shows for the NHS number: the number, a
// status the icon is drawn from, and the locale keys for the tooltip.
// The status is honest about what was checked:
//   'verified'  – status indicator 01: the number is present and was traced.
//   'checkOnly' – the check digit (modulus 11) is valid; not traced on PDS.
//   'invalid'   – the check digit fails.
//   'unchecked' – nothing could be checked.
// Pure: no React, no storage.
// ─────────────────────────────────────────────────────────────────────────────

import type { NationalPatientIdentifier } from '@/types/patient/NationalPatientIdentifier';
import { verifyNationalIdentifier } from '@/services/patientIdentifiers/checkDigits';

export const NHS_NUMBER_SYSTEM = 'mrn_nhs';

export type NhsNumberBannerStatus = 'verified' | 'checkOnly' | 'invalid' | 'unchecked';

export interface NhsNumberBanner {
  value: string;
  status: NhsNumberBannerStatus;
  /** Locale key for the tooltip. */
  tooltipKey: string;
  /** The record's own status code, shown in the tooltip when present. */
  statusCode?: string;
}

export function nhsNumberForBanner(identifiers: readonly NationalPatientIdentifier[] | undefined): NhsNumberBanner | null {
  const hit = identifiers?.find(i => i.system === NHS_NUMBER_SYSTEM && i.value?.trim());
  if (!hit) return null;
  const check = verifyNationalIdentifier(NHS_NUMBER_SYSTEM, hit.value);
  let status: NhsNumberBannerStatus;
  if (check.status === 'failedChecksum') status = 'invalid';
  else if (hit.statusCode === '01') status = 'verified'; // NHS Number Status Indicator 01: present and verified (traced)
  else if (check.status === 'verified') status = 'checkOnly';
  else status = 'unchecked';
  return { value: hit.value, status, tooltipKey: `nationalIdentifiers.banner.${status}`, ...(hit.statusCode ? { statusCode: hit.statusCode } : {}) };
}
