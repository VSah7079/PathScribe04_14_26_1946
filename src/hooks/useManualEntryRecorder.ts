// src/hooks/useManualEntryRecorder.ts
// Batch 759 (spec §2.2): records the Manual Entry flag for an id typed at this screen (services/scanEntry/
// manualEntryLog.ts decides what is written). Used by the shared station scan field and the header search, so it covers
// every Pathology Workspace module with no per-screen wiring. Never blocks: the entry goes through at once.
import { useCallback } from 'react';
import { useLocation } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveScanStation } from '@/hooks/useEffectiveScanStation';
import { auditService, stationScanEventService } from '@/services';
import { caseRouter } from '@/services/cases/CaseRouter';
import { resolveMaterialFromScan } from '@/utils/resolveMaterialFromScan';
import { recordManualEntry, workspaceModuleOf, type ManualEntry } from '@/services/scanEntry/manualEntryLog';

export function useManualEntryRecorder() {
  const { user } = useAuth();
  const { effectiveStationId } = useEffectiveScanStation();
  const { pathname } = useLocation();

  return useCallback(async (value: string, opts: { via: ManualEntry['via']; caseAccession?: string } = { via: 'scanField' }) => {
    const typed = value.trim();
    if (!typed) return;
    const resolved = opts.caseAccession ? null : await resolveMaterialFromScan(typed).catch(() => null);
    // A bare accession number does not resolve to material; the case lookup finds it by its number.
    const caseAccession = opts.caseAccession ?? resolved?.fullAccession
      ?? (await caseRouter.getCase(typed).catch(() => null))?.accession?.fullAccession;
    await recordManualEntry({
      value: typed, module: workspaceModuleOf(pathname), via: opts.via, caseAccession,
      itemId: resolved?.displayId ?? (caseAccession ? typed : undefined), materialType: resolved?.target.level,
      stationId: effectiveStationId ?? null, userId: user?.id ?? 'unknown', userName: user?.name ?? user?.id ?? 'unknown',
    }, {
      audit: entry => auditService.logEvent(entry),
      station: events => stationScanEventService.recordMany(events),
    });
  }, [user?.id, user?.name, effectiveStationId, pathname]);
}
