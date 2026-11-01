// src/services/retentionPolicy/resolveCaseDisposalDate.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 728 (Lab Workflow & Batch spec, Decision 4): the one date from which a
// block or slide may be disposed of, shared by the Disposal queue, the
// disposal scan and the Disposal report, so the three always agree.
//   • A research case: its own retention days from accessioning (Configuration
//     → System → Research cases). It never gets a signed clinical report, so
//     the clinical clock below would never start.
//   • Any other case: from sign-out (finalizedAt), by the most conservative of
//     the jurisdiction's rule and any department override; none before sign-out.
// ─────────────────────────────────────────────────────────────────────────────
import type { Case } from '@/types/case/Case';
import type { RetainableMaterialType } from './RetentionPolicy';
import { resolveMostConservativeEligibleDate } from './resolveRetentionEligibility';
import { getResearchCaseSettings } from '../researchCases/researchCaseSettings';
import { isResearchCase, researchDisposalEligibleDate } from '../researchCases/researchCaseRules';

export type CaseDisposalClock = 'research' | 'clinical' | 'notStarted';

/** Which clock a case's material runs on: research, clinical (signed out), or none yet. */
export function caseDisposalClock(c: Pick<Case, 'finalizedAt' | 'accession' | 'patient'>): CaseDisposalClock {
  if (isResearchCase(c, getResearchCaseSettings())) return 'research';
  return c.finalizedAt ? 'clinical' : 'notStarted';
}

/** The date the item may be disposed of from, or null when no clock has started or no rule applies. */
export async function resolveCaseDisposalDate(
  c: Pick<Case, 'finalizedAt' | 'accession' | 'patient'>,
  materialType: RetainableMaterialType,
  jurisdiction: Parameters<typeof resolveMostConservativeEligibleDate>[1],
  specimenDictionaryEntryIds: (string | undefined)[],
): Promise<Date | null> {
  const clock = caseDisposalClock(c);
  if (clock === 'research') return researchDisposalEligibleDate(c, getResearchCaseSettings()) ?? null;
  if (clock === 'notStarted') return null;
  return resolveMostConservativeEligibleDate(materialType, jurisdiction, c.finalizedAt, specimenDictionaryEntryIds);
}
