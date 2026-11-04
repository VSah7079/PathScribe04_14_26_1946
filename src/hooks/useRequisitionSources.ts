// src/hooks/useRequisitionSources.ts
// Batch 762: Configuration → System → Requisition ingestion. Every source the user may manage, the one being edited,
// a new one, and the performing-lab facilities a source can belong to. The checks and the capability
// (config:requisition-ingestion:manage, per facility) are in services/requisitions.
import { useCallback, useEffect, useState } from 'react';
import { requisitionService, type RequisitionSource, type RequisitionSourceInput } from '@/services';
import { DEFAULT_SEPARATOR_BARCODE, requisitionSourceProblems } from '@/services/requisitions/requisitionRules';
import { getActivePerformingLabs } from '@/utils/performingLabs';

const inputOf = (s: RequisitionSource): RequisitionSourceInput => ({
  id: s.id, name: s.name, facilityId: s.facilityId, kind: s.kind, location: s.location, scheduleMinutes: s.scheduleMinutes, separatorBarcode: s.separatorBarcode, enabled: s.enabled,
});
const blank = (facilityId: string | null): RequisitionSourceInput => ({ id: '', name: '', facilityId, kind: 'fileShare', location: '', scheduleMinutes: 15, separatorBarcode: DEFAULT_SEPARATOR_BARCODE, enabled: true });

export function useRequisitionSources(service = requisitionService) {
  const [sources, setSources] = useState<RequisitionSource[] | null>(null);
  const [draft, setDraft] = useState<RequisitionSourceInput | null>(null);
  const [facilities, setFacilities] = useState<{ id: string; name: string }[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async (selectId?: string) => {
    const r = await service.getSources();
    if (!r.ok) { setProblem(r.error); return; }
    setSources(r.data);
    const pick = r.data.find(s => s.id === selectId) ?? r.data[0];
    setDraft(pick ? inputOf(pick) : blank(null));
  }, [service]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    void getActivePerformingLabs().then(list => setFacilities(list.map(f => ({ id: f.id, name: f.name })))).catch(() => undefined);
  }, []);

  const set = useCallback(<K extends keyof RequisitionSourceInput>(key: K, value: RequisitionSourceInput[K]) => {
    setNotice(null);
    setDraft(d => (d ? { ...d, [key]: value } : d));
  }, []);

  const select = useCallback((id: string) => {
    const s = sources?.find(x => x.id === id);
    if (s) { setNotice(null); setProblem(null); setDraft(inputOf(s)); }
  }, [sources]);

  const addNew = useCallback(() => { setNotice(null); setProblem(null); setDraft(blank(facilities[0]?.id ?? null)); }, [facilities]);

  const save = useCallback(async () => {
    if (!draft) return;
    const r = await service.saveSource(draft);
    if (!r.ok) { setProblem(r.error); return; }
    setProblem(null);
    setNotice('saved');
    await load(r.data.id);
  }, [draft, service, load]);

  const saved = draft?.id ? sources?.find(s => s.id === draft.id) ?? null : null;
  const dirty = !!draft && (saved ? JSON.stringify(inputOf(saved)) !== JSON.stringify(draft) : !!(draft.name.trim() || draft.location.trim()));
  return { sources, draft, saved, facilities, problems: draft ? requisitionSourceProblems(draft) : [], problem, notice, dirty, set, select, addNew, save };
}
