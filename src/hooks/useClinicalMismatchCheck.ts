// src/hooks/useClinicalMismatchCheck.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 531 (PS-554, Gate A for every specialty): the mismatch check in the
// background, for whatever the screen is reviewing. It runs a moment after the
// compared text stops changing, and again whenever it changes (Pete, Oct 12:
// "If the diagnosis changes, the check should be rerun"). The assessment,
// against the risk rules and the earlier decision, is
// clinicalMismatchService.assess. Used by the report page
// (useClinicalMismatchAlert) and the Cytology Workspace.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { clinicalMismatchService, type ClinicalMismatchAssessment } from '@/services';
import { mismatchCheckDeferred } from '@/services/clinical/clinicalMismatchInputs';
import type { ClinicalMismatchInput } from '@/services/clinical/detectClinicalPathologicMismatch';

/** How long the text must stay unchanged before the check runs. */
export const MISMATCH_CHECK_DELAY_MS = 2000;

export function useClinicalMismatchCheck(
  input: ClinicalMismatchInput | null,
  scope: { caseId: string; specimenId?: string } | null,
  specimenTypeIds: readonly string[],
) {
  const [assessment, setAssessment] = useState<ClinicalMismatchAssessment | null>(null);
  const [decided, setDecided] = useState(0);
  const key = input ? JSON.stringify(input) : '';
  const scopeKey = scope ? `${scope.caseId}|${scope.specimenId ?? ''}` : '';
  const typesKey = specimenTypeIds.join('|');
  // Batch 530 (Pete: flag rather than block): nothing clinical to compare.
  const deferred = !!input && mismatchCheckDeferred(input);

  useEffect(() => {
    if (!input || !scope || deferred) { setAssessment(null); return; }
    let live = true;
    const timer = setTimeout(() => {
      void clinicalMismatchService.assess(input, scope, specimenTypeIds)
        .then(a => { if (live) setAssessment(a && a.outcome.display ? a : null); })
        .catch(() => { if (live) setAssessment(null); });
    }, MISMATCH_CHECK_DELAY_MS);
    return () => { live = false; clearTimeout(timer); };
    // The keys stand for the inputs' content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, scopeKey, typesKey, decided, deferred]);

  return {
    assessment,
    /** The check can't run: no clinical indication or history. */
    deferred,
    /** After a decision is recorded: hide the alert (the check now finds the decision for this text). */
    recorded: () => { setAssessment(null); setDecided(n => n + 1); },
  };
}
