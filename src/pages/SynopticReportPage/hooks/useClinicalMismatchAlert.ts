// src/pages/SynopticReportPage/hooks/useClinicalMismatchAlert.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 530 (PS-554, Gate A): the mismatch check in the background on the
// report page, for what reportPageMismatchInput says to check (a surgical
// report with a diagnosis, or an autopsy between the PAD and the FAD).
// Batch 531: the timing and the re-check on change are the shared
// hooks/useClinicalMismatchCheck.ts, which the Cytology Workspace uses too.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import { clinicalMismatchService, type ClinicalMismatchAssessment } from '@/services';
import { caseHasPendingAmendment } from '@/services/clinical/amendmentMismatch';
import { caseSpecimenTypeIds, reportPageMismatchInput } from '@/services/clinical/clinicalMismatchInputs';
import { useClinicalMismatchCheck } from '@/hooks/useClinicalMismatchCheck';
import type { Case } from '@/types/case/Case';

export { MISMATCH_CHECK_DELAY_MS } from '@/hooks/useClinicalMismatchCheck';

export function useClinicalMismatchAlert(caseData: Case | null | undefined, sections?: readonly { label?: string; text?: string }[]) {
  const input = useMemo(() => (caseData ? reportPageMismatchInput(caseData, sections) : null), [caseData, sections]);
  const specimenTypes = useMemo(() => (caseData ? caseSpecimenTypeIds(caseData) : []), [caseData]);
  const scope = useMemo(() => (caseData?.id ? { caseId: caseData.id } : null), [caseData?.id]);
  const check = useClinicalMismatchCheck(input, scope, specimenTypes);
  // Batch 609 (#31): on a report unlocked for an amendment or correction the alert
  // says whether the lab setting holds the release for a high-risk mismatch.
  const revising = !!caseData && caseHasPendingAmendment(caseData);
  const [revisionAssessment, setRevisionAssessment] = useState<ClinicalMismatchAssessment | null>(null);
  useEffect(() => {
    let live = true;
    if (!revising || !check.assessment) { setRevisionAssessment(null); return; }
    void clinicalMismatchService.forRevisionAlert(check.assessment).then(a => { if (live) setRevisionAssessment(a); }).catch(() => { if (live) setRevisionAssessment(check.assessment); });
    return () => { live = false; };
  }, [revising, check.assessment]);
  return { ...check, assessment: revising ? revisionAssessment : check.assessment };
}
