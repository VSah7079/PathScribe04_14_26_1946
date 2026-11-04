// src/pages/SynopticReportPage/hooks/useAddendumCommand.ts
// Batch 663: "Add Addendum" by voice or key opens the amendment window set to Addendum (the handler comes from
// useAmendmentWorkflow). The decision is services/reports/addendumCommand.ts; this hook only listens, with a ref for the
// latest facts so the subscription is made once.
import { useEffect, useRef } from 'react';
import { actionRegistryService } from '@/services';
import { isModalOpen } from '@/utils/modalFocus';
import { addendumCommandAllowed, ADD_ADDENDUM_ACTION_ID } from '@/services/reports/addendumCommand';
import type { Case } from '@/types/case/Case';
import { useRevisionReleaseAvailability } from './useRevisionReleaseAvailability';

export function useAddendumCommand(caseData: Case | null, requestAddendum: () => void | Promise<void>): void {
  const { availability } = useRevisionReleaseAvailability(caseData);
  const latest = useRef({ status: caseData?.status, revisionAny: availability.any, run: requestAddendum });
  latest.current = { status: caseData?.status, revisionAny: availability.any, run: requestAddendum };
  useEffect(() => actionRegistryService.onAction((actionId: string) => {
    if (actionId !== ADD_ADDENDUM_ACTION_ID) return;
    const f = latest.current;
    if (addendumCommandAllowed({ caseStatus: f.status, modalOpen: isModalOpen(), revisionAny: f.revisionAny })) void f.run();
  }), []);
}
