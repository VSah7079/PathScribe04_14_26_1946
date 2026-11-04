// src/services/patientIdentifiers/classifyHl7PatientIdentifier.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 417. Which national identifier system an HL7 PID-3 repetition is,
// from its identifier type code (CX.5) and assigning authority (CX.4). Pure.
//
//   CX.5 'NH' (national health identifier), 'NI' (national unique identifier)
//   or 'NNxxx' (national person identifier, ISO country) say it is national;
//   the assigning authority or the lab's jurisdiction says which one.
//   An 'MR' (medical record number) or anything unrecognised is the lab's own
//   crosswalk row, as before, never a national identifier.
// ─────────────────────────────────────────────────────────────────────────────

import type { Jurisdiction } from '@/types/systemConfig';
import { NATIONAL_IDENTIFIER_SYSTEMS_BY_JURISDICTION } from './checkDigits';

const AUTHORITY_HINTS: { pattern: RegExp; system: string }[] = [
  { pattern: /\bNHS\b/i, system: 'mrn_nhs' },
  { pattern: /\bCHI\b/i, system: 'mrn_chi' },
  { pattern: /\bH&?CN?\b|\bHSC\b/i, system: 'mrn_hc' },
  { pattern: /\bIHI\b/i, system: 'mrn_ihi' },
  { pattern: /\bNHI\b/i, system: 'mrn_nhi' },
  { pattern: /\bBSN\b/i, system: 'mrn_bsn' },
  { pattern: /\bINS\b|\bNIR\b/i, system: 'mrn_ins' },
  { pattern: /\bKVNR\b/i, system: 'mrn_kvnr' },
  { pattern: /\bPPSN?\b/i, system: 'id_ie_ppsn' },
  { pattern: /\bNISS\b|\bINSZ\b|\bRIJKSREGISTER/i, system: 'mrn_be' },
  { pattern: /\bOHIP\b|\bPHN\b/i, system: 'id_ca_phn' },
];

const NATIONAL_TYPE_CODES = /^(NH|NI|NN[A-Z]{3}|SS)$/i;

export function classifyHl7PatientIdentifier(
  identifier: { identifierValue: string; assigningAuthority?: string; identifierTypeCode?: string },
  jurisdiction: Jurisdiction | undefined,
): string | null {
  const authority = identifier.assigningAuthority ?? '';
  // 'RRN' is both Belgium's Rijksregisternummer and Korea's Resident Registration Number.
  if (/\bRRN\b/i.test(authority)) return jurisdiction === 'KR' ? 'mrn_krn' : jurisdiction === 'BE' ? 'mrn_be' : null;
  const hint = AUTHORITY_HINTS.find(h => h.pattern.test(authority));
  if (hint) {
    // An Irish IHI shares the 'IHI' authority word with Australia's; the jurisdiction decides.
    if (hint.system === 'mrn_ihi' && jurisdiction === 'IE') return 'id_ie_ihi';
    return hint.system;
  }
  if (identifier.identifierTypeCode && NATIONAL_TYPE_CODES.test(identifier.identifierTypeCode) && jurisdiction) {
    const first = NATIONAL_IDENTIFIER_SYSTEMS_BY_JURISDICTION[jurisdiction][0];
    return first ?? null;
  }
  return null;
}
