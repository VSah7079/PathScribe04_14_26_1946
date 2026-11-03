// src/hooks/useRequisitionExpectations.ts
// Batch 762: which cases are expected to have a scanned requisition, for the organisation and for each facility, being
// edited in Configuration → Requisition ingestion. The checks and the capability (config:requisition-ingestion:manage,
// per facility) are in services/requisitions.
import { useCallback, useEffect, useState } from 'react';
import { requisitionService, type RequisitionExpectation } from '@/services';
import { DEFAULT_REQUISITION_EXPECTATION, expectationFor, expectationValid } from '@/services/requisitions/requisitionRules';

const copyOf = (e: { facilityId: string | null; expected: RequisitionExpectation['expected']; graceHours: number; unmatchedAlertHours?: number }, facilityId: string | null): RequisitionExpectation =>
  ({ facilityId, expected: { ...e.expected }, graceHours: e.graceHours, unmatchedAlertHours: (e as { unmatchedAlertHours?: number }).unmatchedAlertHours ?? 24 });

export function useRequisitionExpectations(service = requisitionService) {
  const [all, setAll] = useState<RequisitionExpectation[] | null>(null);
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [draft, setDraft] = useState<RequisitionExpectation>(copyOf(DEFAULT_REQUISITION_EXPECTATION, null));
  const [problem, setProblem] = useState<string | null>(null);
  const [notice, setNotice] = useState(false);

  const load = useCallback(async () => {
    const r = await service.getExpectations();
    if (!r.ok) { setProblem(r.error); return; }
    setAll(r.data);
  }, [service]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (all) setDraft(copyOf(expectationFor(all, facilityId), facilityId)); }, [all, facilityId]);

  const own = all?.find(e => e.facilityId === facilityId) ?? null;
  const save = useCallback(async () => {
    const r = await service.saveExpectation(draft);
    if (!r.ok) { setProblem(r.error); return; }
    setProblem(null); setNotice(true);
    await load();
  }, [draft, service, load]);

  return {
    loaded: all !== null, facilityId, setFacilityId: (id: string | null) => { setNotice(false); setFacilityId(id); }, draft, own, problem, notice,
    usesDefault: facilityId !== null && !own, valid: expectationValid(draft),
    toggle: (origin: keyof RequisitionExpectation['expected']) => { setNotice(false); setDraft(d => ({ ...d, expected: { ...d.expected, [origin]: !d.expected[origin] } })); },
    setGraceHours: (h: number) => { setNotice(false); setDraft(d => ({ ...d, graceHours: h })); },
    setUnmatchedAlertHours: (h: number) => { setNotice(false); setDraft(d => ({ ...d, unmatchedAlertHours: h })); },
    save,
  };
}
