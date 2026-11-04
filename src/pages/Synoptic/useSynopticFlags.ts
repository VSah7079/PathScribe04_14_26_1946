// src/pages/Synoptic/useSynopticFlags.ts

import { useState, useCallback } from 'react';
import type { FlagDefinition } from '../../types/FlagDefinition';
import type { CaseWithFlags, FlagInstance } from '../../types/flagsRuntime';
import { flagService, caseService, authorizationService } from '@/services';
import { applyStatFlagToCase, type StatFlagOutcome } from '@/services/flags/applyStatFlag';
import { useAuditLog } from '@/components/Audit/useAuditLog';
import { toCaseWithFlags } from '@/services/flags/caseFlagView';
import { applyFlags, deleteFlags, ApplyFlagPayload, DeleteFlagPayload } from '../../api/caseFlagsApi';
import { adaptFlag } from '../../utils/flagAdapter';
import { useAuth } from '@/contexts/AuthContext';

export function useSynopticFlags(caseId: string) {
  // Batch 491 (disclosed Batch-452 gap): the hook's own signature stays
  // unchanged for its 3 call sites (SynopticReportPage, CytologyWorklistPage,
  // CytologyScreeningPage) — it reads the signed-in user itself rather than
  // taking it as a new parameter.
  const { user } = useAuth();
  const { log } = useAuditLog();
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
    const updated = await applyFlags({ ...payload, byUserName: user?.name ?? payload.byUserName });
    setFlagCaseData(updated);
  }, [user]);

  const onRemoveFlag = useCallback(async (payload: DeleteFlagPayload) => {
    const updated = await deleteFlags({ ...payload, byUserName: user?.name ?? payload.byUserName });
    setFlagCaseData(updated);
  }, [user]);

  // Batch 669 (everyday-22): "Apply STAT Flag" (Alt+S / voice) applies STAT to the open case without opening the manager.
  // The decisions (capability, the STAT flag, already-STAT, audit) are in services/flags/applyStatFlag.ts.
  const applyStatFlag = useCallback(async (): Promise<{ outcome: StatFlagOutcome; caseFlags?: FlagInstance[] }> => {
    let caseFlags: FlagInstance[] | undefined;
    const defs = await flagService.getAll();
    const definitions = defs.ok ? defs.data : [];
    const outcome = await applyStatFlagToCase({ caseId, definitions }, {
      enforce: (cap, ctx) => authorizationService.enforce(cap, ctx),
      getCase: (id) => caseService.getCase(id),
      applyFlag: async (p) => { caseFlags = (await applyFlags({ ...p, byUserName: user?.name })).flags; },
      audit: (e) => log('flag_applied', { caseId: e.caseId, flagName: e.flagName }),
    });
    return { outcome, caseFlags };
  }, [caseId, user, log]);

  return {
    applyStatFlag,
    flagCaseData,    setFlagCaseData,
    flagDefinitions,
    showFlagManager, setShowFlagManager,
    openFlagManager,
    onApplyFlags,
    onRemoveFlag,
  };
}
