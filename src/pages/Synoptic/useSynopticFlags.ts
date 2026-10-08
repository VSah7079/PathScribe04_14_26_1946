// src/pages/Synoptic/useSynopticFlags.ts

import { useState, useCallback } from 'react';
import type { FlagDefinition } from '../../types/FlagDefinition';
import type { CaseWithFlags } from '../../types/flagsRuntime';
import { flagService, caseService } from '@/services';
import { toCaseWithFlags } from '@/services/flags/caseFlagView';
import { applyFlags, deleteFlags, ApplyFlagPayload, DeleteFlagPayload } from '../../api/caseFlagsApi';
import { adaptFlag } from '../../utils/flagAdapter';

export function useSynopticFlags(caseId: string) {
  const [flagCaseData,    setFlagCaseData]    = useState<CaseWithFlags | null>(null);
  const [flagDefinitions, setFlagDefinitions] = useState<FlagDefinition[]>([]);
  const [showFlagManager, setShowFlagManager] = useState(false);

  const openFlagManager = useCallback(async (caseData: any) => {
    // Load flag definitions
    const result = await flagService.getAll();
    if (result.ok) setFlagDefinitions(result.data.map(adaptFlag));

    // Reload the case to pick up any persisted flags. Batch 452 (PS-57): the
    // view is built by services/flags/caseFlagView.ts from the typed
    // FlagInstance fields (no more `as any`), through @/services rather than
    // the mock files directly (deployment-neutral UI).
    const freshCase = (await caseService.getCase(caseData.id)) ?? caseData;
    const caseWithFlags: CaseWithFlags = toCaseWithFlags(freshCase, { activeOnly: true, accessionFallback: caseId });

    setFlagCaseData(caseWithFlags);
    setShowFlagManager(true);
  }, [caseId]);

  // Real, immediate persist -- called only from FlagManagerModal's own
  // Save button (see that file), never per-click. Kept here since this
  // hook owns the real API call and keeps flagCaseData in sync with
  // whatever was actually committed.
  const onApplyFlags = useCallback(async (payload: ApplyFlagPayload) => {
    const updated = await applyFlags(payload);
    setFlagCaseData(updated);
  }, []);

  const onRemoveFlag = useCallback(async (payload: DeleteFlagPayload) => {
    const updated = await deleteFlags(payload);
    setFlagCaseData(updated);
  }, []);

  return {
    flagCaseData,    setFlagCaseData,
    flagDefinitions,
    showFlagManager, setShowFlagManager,
    openFlagManager,
    onApplyFlags,
    onRemoveFlag,
  };
}
