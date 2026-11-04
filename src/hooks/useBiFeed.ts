// src/hooks/useBiFeed.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 613 (PS-787): the reporting feed section's data and actions. The rules
// (what a token needs, who may be identified, the Simulated pull) are in
// services/biFeed; the capability checks are in the service. This only holds
// state and calls them. A token returned by create or rotate is held here until
// the person closes the panel, and is never stored.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { biFeedService } from '@/services';
import { getActivePerformingLabs } from '@/utils/performingLabs';
import {
  EMPTY_BI_SETTINGS, checkBiApproval, checkBiSettings, checkBiTokenDraft,
  type BiApprovalError, type BiFeedSettings, type BiSettingsError, type BiTokenDraft, type BiTokenDraftError, type BiTokenSummary,
} from '@/services/biFeed/biFeedRules';
import type { BiPullAnswer } from '@/services/biFeed/biFeedService';
import type { AgentRevokeReason } from '@/services/siteAgent/siteAgentAdmin';

export interface FacilityOption { id: string; name: string }
export type BiFeedNotice = 'settingsSaved' | 'approved' | 'withdrawn' | 'created' | 'rotated' | 'revoked';
export interface RevealedBiToken { name: string; token: string; grace: boolean }

const BLANK_TOKEN: BiTokenDraft = { name: '', datasetIds: [], facilityIds: [], identified: false };

export function useBiFeed(service = biFeedService) {
  const [saved, setSaved] = useState<BiFeedSettings | null>(null);
  const [draft, setDraft] = useState<BiFeedSettings>(EMPTY_BI_SETTINGS);
  const [tokens, setTokens] = useState<BiTokenSummary[] | null>(null);
  const [facilities, setFacilities] = useState<FacilityOption[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const [notice, setNotice] = useState<BiFeedNotice | null>(null);
  const [revealed, setRevealed] = useState<RevealedBiToken | null>(null);
  const [pull, setPull] = useState<BiPullAnswer | null>(null);
  const [busy, setBusy] = useState(false);
  const [tokenForm, setTokenForm] = useState<BiTokenDraft | null>(null);
  const [approval, setApproval] = useState({ approverName: '', reason: '' });
  /** The form starts from the saved settings once; later reloads must not overwrite edits being made. */
  const draftStarted = useRef(false);

  const load = useCallback(async () => {
    try {
      const [s, t] = await Promise.all([service.getSettings(), service.listTokens()]);
      if (s.ok === true) {
        setSaved(s.data);
        if (!draftStarted.current) { draftStarted.current = true; setDraft(s.data); }
      } else { setSaved(EMPTY_BI_SETTINGS); setProblem('UNAVAILABLE'); }
      setTokens(t.ok === true ? t.data : []);
    } catch {
      setSaved(EMPTY_BI_SETTINGS); setTokens([]); setProblem('UNAVAILABLE');
    }
  }, [service]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    void getActivePerformingLabs().then(list => setFacilities(list.map(f => ({ id: f.id, name: f.name })))).catch(() => undefined);
  }, []);

  const settingsProblems: BiSettingsError[] = useMemo(() => checkBiSettings(draft), [draft]);
  const settingsDirty = !!saved && (saved.enabled !== draft.enabled
    || [...saved.datasetIds].sort().join() !== [...draft.datasetIds].sort().join()
    || [...saved.facilityIds].sort().join() !== [...draft.facilityIds].sort().join());
  const approvalProblems: BiApprovalError[] = useMemo(() => checkBiApproval(approval), [approval]);
  const tokenProblems: BiTokenDraftError[] = useMemo(
    () => (tokenForm && saved ? checkBiTokenDraft(tokenForm, saved, tokens ?? []) : []),
    [tokenForm, saved, tokens],
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

  const toggle = <T extends string>(list: readonly T[], id: T): T[] => (list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
  const setEnabled = (enabled: boolean) => setDraft(d => ({ ...d, enabled }));
  const toggleDataset = (id: BiFeedSettings['datasetIds'][number]) => setDraft(d => ({ ...d, datasetIds: toggle(d.datasetIds, id) }));
  const toggleFacility = (id: string) => setDraft(d => ({ ...d, facilityIds: toggle(d.facilityIds, id) }));
  const discardSettings = () => { if (saved) setDraft(saved); };

  const saveSettings = () => run(() => service.saveSettings(draft), s => { setDraft(s); setNotice('settingsSaved'); });
  const approve = () => run(() => service.approveIdentified(approval), s => { setDraft(d => ({ ...d, identifiedApproval: s.identifiedApproval })); setApproval({ approverName: '', reason: '' }); setNotice('approved'); });
  const withdraw = () => run(() => service.withdrawIdentified(), () => { setDraft(d => ({ ...d, identifiedApproval: undefined })); setNotice('withdrawn'); });

  const openTokenForm = () => setTokenForm({ ...BLANK_TOKEN });
  const closeTokenForm = () => setTokenForm(null);
  const submitToken = async () => {
    if (!tokenForm || tokenProblems.length) return false;
    return run(() => service.createToken(tokenForm), d => { setTokenForm(null); setNotice('created'); setRevealed({ name: d.summary.name, token: d.token, grace: false }); });
  };
  const rotate = (t: BiTokenSummary) => run(() => service.rotateToken(t.id), d => { setNotice('rotated'); setRevealed({ name: t.name, token: d.token, grace: true }); });
  const revoke = (t: BiTokenSummary, reason: AgentRevokeReason) => run(() => service.revokeToken(t.id, reason), () => setNotice('revoked'));
  const testPull = async (token: string, datasetId: string) => {
    setProblem(null);
    const r = await service.pull(token, datasetId).catch(() => null);
    if (r && r.ok === true) { setPull(r.data); await load(); } else setProblem(r && r.ok === false ? r.error : 'UNAVAILABLE');
  };

  return {
    saved, draft, tokens, facilities, problem, notice, revealed, pull, busy, tokenForm, approval,
    settingsProblems, settingsDirty, approvalProblems, tokenProblems,
    setEnabled, toggleDataset, toggleFacility, discardSettings, saveSettings, setApproval, approve, withdraw,
    openTokenForm, closeTokenForm, setTokenForm, submitToken, rotate, revoke, testPull,
    clearRevealed: () => setRevealed(null), clearPull: () => setPull(null),
  };
}
