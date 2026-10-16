// src/pages/SynopticReportPage/hooks/useClinicalMismatchAlert.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 530 (PS-554, Gate A): the mismatch check in the background on the
// report page, for what reportPageMismatchInput says to check (a surgical
// report with a diagnosis, or an autopsy between the PAD and the FAD).
// Batch 531: the timing and the re-check on change are the shared
// hooks/useClinicalMismatchCheck.ts, which the Cytology Workspace uses too.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { caseSpecimenTypeIds, reportPageMismatchInput } from '@/services/clinical/clinicalMismatchInputs';
import { useClinicalMismatchCheck } from '@/hooks/useClinicalMismatchCheck';
import type { Case } from '@/types/case/Case';

export { MISMATCH_CHECK_DELAY_MS } from '@/hooks/useClinicalMismatchCheck';

export function useClinicalMismatchAlert(caseData: Case | null | undefined, sections?: readonly { label?: string; text?: string }[]) {
  const input = useMemo(() => (caseData ? reportPageMismatchInput(caseData, sections) : null), [caseData, sections]);
  const specimenTypes = useMemo(() => (caseData ? caseSpecimenTypeIds(caseData) : []), [caseData]);
  const scope = useMemo(() => (caseData?.id ? { caseId: caseData.id } : null), [caseData?.id]);
  return useClinicalMismatchCheck(input, scope, specimenTypes);
}
