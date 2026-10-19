// src/hooks/useWorkstationRegistry.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 612: the Workstations section's data and actions. The rules (what a
// workstation needs, token checks, states) are in services/workstationRegistry;
// the capability checks are in the service. This only holds state and calls them.
// A token returned by register or rotate is held here until the person closes
// the panel, and is never stored.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useMemo, useState } from 'react';
import { workstationRegistryService, siteAgentAdminService } from '@/services';
import { getActivePerformingLabs } from '@/utils/performingLabs';
import { getWorkstationSetting, setWorkstationSetting } from '@/utils/workstationSettings';
import {
  BOUND_WORKSTATION_SETTING, checkWorkstationDraft, type WorkstationDraft, type WorkstationDraftError, type WorkstationSummary,
} from '@/services/workstationRegistry/workstationRegistryRules';
import type { WorkstationCheckIn } from '@/services/workstationRegistry/workstationRegistryService';
import type { AgentRevokeReason } from '@/services/siteAgent/siteAgentAdmin';

export interface FacilityOption { id: string; name: string }
export type WorkstationNotice = 'registered' | 'changed' | 'rotated' | 'revoked';
export interface RevealedToken { workstationId: string; name: string; token: string; grace: boolean }

const BLANK: WorkstationDraft = { name: '', facilityId: '' };

export function useWorkstationRegistry(service = workstationRegistryService) {
  const [workstations, setWorkstations] = useState<WorkstationSummary[] | null>(null);
  const [facilities, setFacilities] = useState<FacilityOption[]>([]);
  const [printerIds, setPrinterIds] = useState<string[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const [notice, setNotice] = useState<WorkstationNotice | null>(null);
  const [revealed, setRevealed] = useState<RevealedToken | null>(null);
  const [checkIn, setCheckIn] = useState<WorkstationCheckIn | null>(null);
  const [busy, setBusy] = useState(false);
  const [boundId, setBoundId] = useState<string | null>(() => getWorkstationSetting(BOUND_WORKSTATION_SETTING));
  /** The form: null when closed; editingId null means a new registration. */
  const [form, setForm] = useState<{ editingId: string | null; draft: WorkstationDraft } | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await service.list();
      setWorkstations(r.ok === true ? r.data : []);
      if (r.ok === false) setProblem('UNAVAILABLE');
    } catch {
      setWorkstations([]);
      setProblem('UNAVAILABLE');
    }
  }, [service]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    void getActivePerformingLabs().then(list => setFacilities(list.map(f => ({ id: f.id, name: f.name })))).catch(() => undefined);
  }, []);

  /** Suggestions for the printer fields: the site agent's report printers for the chosen facility, when the person may see them. */
  const facilityIdInForm = form?.draft.facilityId ?? '';
  useEffect(() => {
    setPrinterIds([]);
    if (!facilityIdInForm) return;
    let current = true;
    void siteAgentAdminService.reportPrinters(facilityIdInForm, 'routing')
      .then(r => { if (current && r.ok === true) setPrinterIds(r.data.map(p => p.destinationId)); })
      .catch(() => undefined);
    return () => { current = false; };
  }, [facilityIdInForm]);

  const problems: WorkstationDraftError[] = useMemo(
    () => (form ? checkWorkstationDraft(form.draft, workstations ?? [], form.editingId ?? undefined) : []),
    [form, workstations],
  );

  const run = useCallback(async <T,>(op: () => Promise<{ ok: true; data: T } | { ok: false; error: string }>, then: (data: T) => void): Promise<boolean> => {
    setBusy(true); setProblem(null); setNotice(null);
    try {
      const r = await op();
      if (r.ok === true) { then(r.data); await load(); return true; }
      setProblem(r.error);
      return false;
    } catch {
      setProblem('UNAVAILABLE');
      return false;
    } finally { setBusy(false); }
  }, [load]);

  const openRegister = () => setForm({ editingId: null, draft: { ...BLANK, facilityId: facilities.length === 1 ? facilities[0].id : '' } });
  const openEdit = (w: WorkstationSummary) => setForm({
    editingId: w.id,
    draft: {
      name: w.name, facilityId: w.facilityId, roomLabel: w.roomLabel, discipline: w.discipline, functionalArea: w.functionalArea,
      pointOfCare: w.pointOfCare, reportPrinterId: w.reportPrinterId, labelPrinterId: w.labelPrinterId,
    },
  });
  const setDraft = (draft: WorkstationDraft) => setForm(f => (f ? { ...f, draft } : f));
  const closeForm = () => setForm(null);

  const submit = async () => {
    if (!form || problems.length) return false;
    if (form.editingId) {
      return run(() => service.update(form.editingId as string, form.draft), () => { setForm(null); setNotice('changed'); });
    }
    return run(() => service.register(form.draft), d => {
      setForm(null); setNotice('registered');
      setRevealed({ workstationId: d.workstation.id, name: d.workstation.name, token: d.token, grace: false });
    });
  };
  const rotate = (w: WorkstationSummary) => run(() => service.rotateToken(w.id), d => {
    setNotice('rotated'); setRevealed({ workstationId: w.id, name: w.name, token: d.token, grace: true });
  });
  const revoke = (w: WorkstationSummary, reason: AgentRevokeReason) => run(() => service.revoke(w.id, reason), () => {
    setNotice('revoked');
    if (boundId === w.id) { setWorkstationSetting(BOUND_WORKSTATION_SETTING, null); setBoundId(null); }
  });
  const test = async (token: string) => {
    setProblem(null);
    const r = await service.checkIn(token).catch(() => null);
    if (r && r.ok === true) { setCheckIn(r.data); await load(); } else setProblem(r && r.ok === false ? r.error : 'UNAVAILABLE');
  };
  const useThisComputer = (id: string | null) => { setWorkstationSetting(BOUND_WORKSTATION_SETTING, id); setBoundId(id); };

  return {
    workstations, facilities, printerIds, problem, notice, revealed, checkIn, busy, boundId, form, problems,
    openRegister, openEdit, setDraft, closeForm, submit, rotate, revoke, test, useThisComputer,
    clearRevealed: () => setRevealed(null), clearCheckIn: () => setCheckIn(null),
  };
}
