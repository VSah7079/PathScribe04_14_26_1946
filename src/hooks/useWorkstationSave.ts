// src/hooks/useWorkstationSave.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 669 (ws-8): the screen side of services/workstationSave/runCaseAction.ts, shared by the Embedding, Slide
// Distribution and Add-On Order stations. Runs the save through the real case services (retry on a conflict) and
// keeps the "Not saved" message (`saveError`, a translated line the page shows in a role="alert" banner) until the
// next successful save or the station is cleared. The deciding stays in the service.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { caseWriteDeps } from '@/services';
import { runCaseAction, saveSpecimenChange, saveCaseChange, saveFailedKey, type CaseActionOutcome, type SaveChangeOutcome, type SpecimenSaver } from '@/services/workstationSave/runCaseAction';
import type { Case } from '@/types/case/Case';
import type { Specimen } from '@/types/case/Specimen';

export function useWorkstationSave() {
  const { t } = useTranslation();
  const [saveError, setSaveError] = useState<string | null>(null);

  const note = useCallback((outcome: CaseActionOutcome<unknown>) => {
    if (outcome.status === 'failed') setSaveError(t(saveFailedKey(outcome.reason)));
    else if (outcome.status === 'saved') setSaveError(null);
  }, [t]);

  const runAction = useCallback(async <R,>(caseId: string, action: (current: Case, save: SpecimenSaver) => Promise<R>): Promise<CaseActionOutcome<R>> => {
    const outcome = await runCaseAction(caseId, action, caseWriteDeps);
    note(outcome);
    return outcome;
  }, [note]);

  const saveChange = useCallback(async (caseId: string, derive: (current: Case) => Specimen[] | null): Promise<SaveChangeOutcome> => {
    const outcome = await saveSpecimenChange(caseId, derive, caseWriteDeps);
    note(outcome);
    return outcome;
  }, [note]);

  /** Batch 729: a change to other case fields (a matrix block). */
  const saveCaseFields = useCallback(async (caseId: string, derive: (current: Case) => Partial<Case> | null): Promise<SaveChangeOutcome> => {
    const outcome = await saveCaseChange(caseId, derive, caseWriteDeps);
    note(outcome);
    return outcome;
  }, [note]);

  const clearSaveError = useCallback(() => setSaveError(null), []);

  return { saveError, clearSaveError, runAction, saveChange, saveCaseFields };
}
