// src/hooks/useRegistryGoLive.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 423, reworked in Batch 424: the state the go-live panel needs, around
// services/registryGoLive/registryGoLive.ts, which makes every decision. Used
// by both registry settings screens (screening and cancer).
//
// Validation instance: recordAgreement, runSuite, exportValidation (returns
// the file text to download). Production instance: importValidation(text),
// request, approve(confirmation) after <SignatureConfirmModal
// action="registry-go-live">, withdraw, stopLive. Either: the overlay (adapter
// rules, confirm local changes) and the approval settings.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import {
  addRegistryAdapterRule, approveRegistryGoLive, confirmRegistryLocalChanges, exportRegistryValidation, importRegistryValidation,
  loadRegistryGoLive, previewRegistryGoLivePrechecks, recordRegistryAgreement, registryGoLiveDeps, removeRegistryAdapterRule,
  requestRegistryGoLive, runRegistryTestSuite, saveRegistryGoLiveGovernance, stopRegistryLiveReporting, withdrawRegistryGoLive,
} from '@/services';
import type { ApproveGoLiveOutcome, RegistryGoLiveView, RequestGoLiveOutcome } from '@/services/registryGoLive/registryGoLive';
import type { RegistryGoLiveCapacity, RegistryGoLiveGovernance, RegistryGoLivePrecheck } from '@/services/registryGoLive/registryGoLiveRules';
import type { RegistryDomain, RegistryTemplateElement } from '@/services/registryGoLive/registryTemplateVersions';
import type { SignatureConfirmation } from '@/services/auth/signerConfirmation';

export function useRegistryGoLive(domain: RegistryDomain, registryId: string | null, user: { id: string; name: string } | null | undefined) {
  const actor = { id: user?.id ?? '', name: user?.name ?? '' };
  const id = registryId ?? '';
  const [view, setView] = useState<RegistryGoLiveView | null>(null);
  const [reference, setReference] = useState('');
  const [specConfirmed, setSpecConfirmed] = useState(false);
  const [agreementReference, setAgreementReference] = useState('');
  const [rule, setRule] = useState<{ element: RegistryTemplateElement; description: string }>({ element: 'segments', description: '' });
  const [prechecks, setPrechecks] = useState<RegistryGoLivePrecheck[]>([]);
  const [capacities, setCapacities] = useState<RegistryGoLiveCapacity[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    if (!registryId) { setView(null); return; }
    setView(await loadRegistryGoLive(domain, registryId, registryGoLiveDeps));
  }, [domain, registryId]);
  useEffect(() => { void reload(); }, [reload]);

  useEffect(() => {
    if (!registryId || view?.role !== 'production') { setPrechecks([]); return; }
    let live = true;
    void previewRegistryGoLivePrechecks(domain, registryId, { reference, specConfirmedByLab: specConfirmed }, registryGoLiveDeps)
      .then(p => { if (live) setPrechecks(p); });
    return () => { live = false; };
  }, [domain, registryId, reference, specConfirmed, view]);

  const toggleCapacity = useCallback((c: RegistryGoLiveCapacity) => {
    setCapacities(prev => (prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]));
  }, []);

  const run = async <T,>(work: () => Promise<T>): Promise<T> => {
    setBusy(true);
    try { const r = await work(); await reload(); return r; } finally { setBusy(false); }
  };

  const area = { domain, registryId: id };
  return {
    view, reload, busy,
    reference, setReference, specConfirmed, setSpecConfirmed, prechecks,
    agreementReference, setAgreementReference, rule, setRule,
    capacities, toggleCapacity,
    confirming, startApprove: () => setConfirming(true), cancelApprove: () => setConfirming(false),
    recordAgreement: () => run(async () => { const r = await recordRegistryAgreement({ ...area, reference: agreementReference }, actor, registryGoLiveDeps); if (r === 'recorded') setAgreementReference(''); return r; }),
    runSuite: () => run(() => runRegistryTestSuite(area, actor, registryGoLiveDeps)),
    exportValidation: () => run(() => exportRegistryValidation(area, actor, registryGoLiveDeps)),
    importValidation: (text: string) => run(() => importRegistryValidation({ ...area, text }, actor, registryGoLiveDeps)),
    request: (): Promise<RequestGoLiveOutcome> => run(() => requestRegistryGoLive({ ...area, evidence: { reference, specConfirmedByLab: specConfirmed } }, actor, registryGoLiveDeps)),
    approve: (confirmation: SignatureConfirmation): Promise<ApproveGoLiveOutcome> => {
      setConfirming(false);
      return run(async () => {
        const r = await approveRegistryGoLive({ recordId: view?.openRequest?.id ?? '', capacities, confirmation }, actor, registryGoLiveDeps);
        if (r.outcome === 'approved' || r.outcome === 'live') setCapacities([]);
        return r;
      });
    },
    withdraw: () => run(() => withdrawRegistryGoLive(view?.openRequest?.id ?? '', actor, registryGoLiveDeps)),
    stopLive: () => run(() => stopRegistryLiveReporting(area, actor, registryGoLiveDeps)),
    addRule: () => run(async () => { const r = await addRegistryAdapterRule({ ...area, ...rule }, actor, registryGoLiveDeps); if (r === 'added') setRule({ ...rule, description: '' }); return r; }),
    removeRule: (ruleId: string) => run(() => removeRegistryAdapterRule({ ...area, ruleId }, actor, registryGoLiveDeps)),
    confirmLocalChanges: () => run(() => confirmRegistryLocalChanges(area, actor, registryGoLiveDeps)),
    saveGovernance: (next: Partial<RegistryGoLiveGovernance>) => run(() => saveRegistryGoLiveGovernance(next, actor, registryGoLiveDeps)),
  };
}

export type RegistryGoLiveState = ReturnType<typeof useRegistryGoLive>;
