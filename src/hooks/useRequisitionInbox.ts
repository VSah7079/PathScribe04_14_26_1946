// src/hooks/useRequisitionInbox.ts
// Batch 762: the Requisition Inbox's state: the Unmatched Requisitions queue, recent links and runs, the sources and
// their facilities, the facility filter, and the actions (run now, link to a case, discard). The decisions and the
// capability checks (per facility) are in services/requisitions/requisitionService.ts; this only calls the service
// and holds what it answered.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ingestionRunsInBrowser, requisitionService, runIngestionNow, type DiscardReason, type IngestionRun, type MissingRequisition, type RequisitionInbox, type RequisitionSource, type WaiverReason } from '@/services';
import { inFacility, latestRunPerSource, sourceFacilityIds } from '@/services/requisitions/requisitionRules';
import { getActivePerformingLabs } from '@/utils/performingLabs';

export function useRequisitionInbox(service = requisitionService) {
  const [inbox, setInbox] = useState<RequisitionInbox | null>(null);
  const [sources, setSources] = useState<RequisitionSource[]>([]);
  const [facilityNames, setFacilityNames] = useState<Record<string, string>>({});
  const [facilityId, setFacilityId] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [refusedSourceIds, setRefusedSourceIds] = useState<string[]>([]);
  const [missing, setMissing] = useState<MissingRequisition[]>([]);

  const reload = useCallback(async () => {
    const [i, s, m] = await Promise.all([service.getInbox(), service.getSources(), service.getMissing()]);
    if (!i.ok) { setLoadError(i.error); return; }
    setLoadError(null);
    setInbox(i.data);
    if (s.ok) setSources(s.data);
    if (m.ok) setMissing(m.data);
  }, [service]);

  // The demonstration has no server to run the missing-requisition check on its schedule, so opening the inbox runs it.
  useEffect(() => { void (ingestionRunsInBrowser() ? service.sweepMissing().catch(() => undefined) : Promise.resolve()).then(reload); }, [reload, service]);
  useEffect(() => {
    void getActivePerformingLabs().then(list => setFacilityNames(Object.fromEntries(list.map(f => [f.id, f.name])))).catch(() => undefined);
  }, []);

  const runNow = useCallback(async () => {
    setRunning(true);
    try {
      const r = await runIngestionNow(inFacility(sources, facilityId), service);
      setRefusedSourceIds(r.ok ? r.data.refusedSourceIds : []);
      await reload();
      return r;
    } finally { setRunning(false); }
  }, [sources, facilityId, service, reload]);

  const reassociate = useCallback(async (unmatchedId: string, accession: string, how?: 'search' | 'newCase') => {
    const r = await service.reassociate(unmatchedId, accession, how);
    if (r.ok) await reload();
    return r;
  }, [service, reload]);

  const discard = useCallback(async (unmatchedId: string, reason: DiscardReason) => {
    const r = await service.discard(unmatchedId, reason);
    if (r.ok) await reload();
    return r;
  }, [service, reload]);

  const findCases = useCallback(async (query: string) => {
    const r = await service.findCasesToLink(query);
    return r.ok ? r.data : [];
  }, [service]);

  const waive = useCallback(async (caseId: string, reason: WaiverReason) => {
    const r = await service.waiveMissing(caseId, reason);
    if (r.ok) await reload();
    return r;
  }, [service, reload]);

  const shown = useMemo(() => ({
    missing: inFacility(missing, facilityId),
    sources: inFacility(sources, facilityId),
    unmatched: inFacility(inbox?.unmatched ?? [], facilityId),
    recentLinks: inFacility(inbox?.recentLinks ?? [], facilityId),
    lastRuns: latestRunPerSource(inFacility<IngestionRun>(inbox?.runs ?? [], facilityId)),
  }), [sources, inbox, missing, facilityId]);

  return {
    loaded: inbox !== null, loadError, running, refusedSourceIds, canRunHere: ingestionRunsInBrowser(),
    facilityId, setFacilityId, facilityOptions: sourceFacilityIds(sources), facilityNames,
    sourceName: (id: string) => sources.find(s => s.id === id)?.name ?? id,
    ...shown, runNow, reassociate, findCases, discard, waive, reload,
  };
}
