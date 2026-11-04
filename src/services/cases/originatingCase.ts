// src/services/cases/originatingCase.ts
// Batch 759 (Patient Verification, Outside Case Tracking and Audit Logging spec §2.1): the originating case typed at
// Accession, as saved on the case (types/case/OriginatingCase.ts), or nothing when no case number was given. Pure.
import type { OriginatingCase } from '@/types/case/OriginatingCase';

export function originatingCaseOf(draft: { caseNumber?: string; institution?: string } | null | undefined): OriginatingCase | undefined {
  const caseNumber = draft?.caseNumber?.trim();
  if (!caseNumber) return undefined;
  const institution = draft?.institution?.trim();
  return institution ? { caseNumber, institution } : { caseNumber };
}
