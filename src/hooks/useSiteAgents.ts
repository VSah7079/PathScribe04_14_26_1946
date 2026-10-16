// src/hooks/useSiteAgents.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 552 (PS-539 phase 2d): the Site agents section's data and actions for
// one site: its agents, a one-time enrolment code, revoking, and a draft of
// its agent printers and shares that is saved in one step. The rules (what a
// printer or share needs, the defaults, the capabilities) are in
// services/siteAgent; this only holds state and calls them.
// Batch 553: a revoke takes a reason picked from a short list (a note only for
// "other"); the update window is part of the draft; the engine channels already
// used are offered for another pickup share.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { siteAgentAdminService } from '@/services';
import type { ISiteAgentAdminService } from '@/services/siteAgent/siteAgentAdminService';
import {
  agentSiteIds, blankAgentPrinter, blankAgentShare, checkAgentPrinters, checkAgentShares, checkUpdateWindow, engineChannelSuggestions, siteAgentConfigValid, siteAgentCounts,
  type AgentRevokeReason, type EnrollmentCode, type SiteAgentAdminError, type SiteAgentConfig, type SiteAgentSummary,
} from '@/services/siteAgent/siteAgentAdmin';
import type { AgentPrinter, AgentShare } from '@/services/siteAgent/siteAgentContract';
import { useLiveData } from './useLiveData';

export function useSiteAgents(siteId: string, service: ISiteAgentAdminService = siteAgentAdminService) {
  const [agents, setAgents] = useState<SiteAgentSummary[] | null>(null);
  const [saved, setSaved] = useState<SiteAgentConfig | null>(null);
  const [draft, setDraft] = useState<SiteAgentConfig | null>(null);
  const [code, setCode] = useState<EnrollmentCode | null>(null);
  const [problem, setProblem] = useState<SiteAgentAdminError | null>(null);
  const [notice, setNotice] = useState<'saved' | 'revoked' | null>(null);
  const [busy, setBusy] = useState(false);
  /** The site everything on screen belongs to: an answer for another site (the user switched meanwhile) is dropped. */
  const currentSite = useRef(siteId);
  currentSite.current = siteId;
  const latestAgents = useRef(0);

  const loadAgents = useCallback(async () => {
    if (!siteId) return;
    const mine = ++latestAgents.current;
    try {
      const a = await service.listAgents(siteId);
      if (mine !== latestAgents.current || currentSite.current !== siteId) return;
      setAgents(a.ok ? a.data : []);
      if (a.ok === false) setProblem(a.error);
    } catch {
      if (mine === latestAgents.current) { setAgents([]); setProblem('UNAVAILABLE'); }
    }
  }, [service, siteId]);

  const loadConfig = useCallback(async () => {
    if (!siteId) return;
    try {
      const c = await service.getConfig(siteId);
      if (currentSite.current !== siteId) return;
      if (c.ok) { setSaved(c.data); setDraft(c.data); } else setProblem(c.error);
    } catch {
      if (currentSite.current === siteId) setProblem('UNAVAILABLE');
    }
  }, [service, siteId]);

  useEffect(() => {
    setAgents(null); setSaved(null); setDraft(null); setCode(null); setNotice(null); setProblem(null);
    void loadAgents(); void loadConfig();
  }, [loadAgents, loadConfig, service, siteId]);
  // Agents' status: every minute, as often as they check in (§9). Batch 560: and at once when the
  // live-update hub says this site's agents changed (topic `siteAgents`).
  useLiveData(loadAgents, { topic: 'siteAgents', dataKey: siteId, pollMs: 60_000, enabled: service.viaServer && !!siteId });

  /** Runs an action for `site`; its answer is used only if the user is still on that site. */
  const run = useCallback(async <T,>(site: string, fn: () => Promise<{ ok: true; data: T } | { ok: false; error: SiteAgentAdminError }>): Promise<T | null> => {
    setBusy(true); setProblem(null); setNotice(null);
    try {
      const r = await fn();
      if (currentSite.current !== site) return null;
      if (r.ok === false) { setProblem(r.error); return null; }
      return r.data;
    } catch {
      if (currentSite.current === site) setProblem('UNAVAILABLE');
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const makeCode = useCallback(async () => {
    const site = siteId;
    const c = await run(site, () => service.createEnrollmentCode(site));
    if (c && c.siteId === site) setCode(c);
  }, [run, service, siteId]);
  /** True when revoked (the row closes); false keeps the reason typed. Unsaved printer and share edits are kept. */
  const revoke = useCallback(async (agentId: string, reason: AgentRevokeReason): Promise<boolean> => {
    const site = siteId;
    const r = await run(site, () => service.revoke(agentId, reason, site));
    if (!r) return false;
    setNotice('revoked');
    await loadAgents();
    return true;
  }, [run, service, siteId, loadAgents]);
  const save = useCallback(async () => {
    if (!draft || draft.siteId !== siteId) return;
    const site = siteId;
    const r = await run(site, () => service.saveConfig(draft));
    if (r && r.siteId === site) { setSaved(r); setDraft(r); setNotice('saved'); }
  }, [run, service, draft, siteId]);

  const setPrinter = useCallback((i: number, p: AgentPrinter) => setDraft(d => (d ? { ...d, printers: d.printers.map((x, j) => (j === i ? p : x)) } : d)), []);
  const addPrinter = useCallback(() => setDraft(d => (d ? { ...d, printers: [...d.printers, blankAgentPrinter(d.printers)] } : d)), []);
  const removePrinter = useCallback((i: number) => setDraft(d => (d ? { ...d, printers: d.printers.filter((_, j) => j !== i) } : d)), []);
  const setShare = useCallback((i: number, s: AgentShare) => setDraft(d => (d ? { ...d, shares: d.shares.map((x, j) => (j === i ? s : x)) } : d)), []);
  const addShare = useCallback((direction: AgentShare['direction']) => setDraft(d => (d ? { ...d, shares: [...d.shares, blankAgentShare(d.shares, direction)] } : d)), []);
  const removeShare = useCallback((i: number) => setDraft(d => (d ? { ...d, shares: d.shares.filter((_, j) => j !== i) } : d)), []);
  /** Batch 553: the window the agent may update itself in (both times blank: none). */
  const setUpdateWindow = useCallback((w: { start: string; end: string }) => setDraft(d => {
    if (!d) return d;
    // Both blank is no window, stored as none, so clearing it isn't an unsaved change.
    if (!w.start && !w.end) { const { updateWindow: _none, ...rest } = d; void _none; return rest; }
    return { ...d, updateWindow: w };
  }), []);

  const printerProblems = useMemo(() => (draft ? checkAgentPrinters(draft.printers) : {}), [draft]);
  const shareProblems = useMemo(() => (draft ? checkAgentShares(draft.shares) : {}), [draft]);
  const updateWindowProblem = useMemo(() => (draft ? checkUpdateWindow(draft.updateWindow) : null), [draft]);
  const channelSuggestions = useMemo(() => (draft ? engineChannelSuggestions(draft.shares) : []), [draft]);
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved]);
  const canSave = !!draft && dirty && siteAgentConfigValid(draft) && !busy;

  return {
    viaServer: service.viaServer, agents, draft, code, problem, notice, busy, dirty, canSave, printerProblems, shareProblems, updateWindowProblem, channelSuggestions,
    reload: loadAgents, makeCode, clearCode: () => setCode(null), revoke, save, discard: () => setDraft(saved),
    setPrinter, addPrinter, removePrinter, setShare, addShare, removeShare, setUpdateWindow,
  };
}

/**
 * Batch 552: every site agent the user may see, counted by status (the Print Queue's line). Null in the demo or
 * while loading. Batch 562: every minute, and at once when the live-update hub says an agent changed at one of
 * the sites it counts (topic `siteAgents`, keyed by those sites).
 */
export function useSiteAgentCounts(service: ISiteAgentAdminService = siteAgentAdminService) {
  const [counts, setCounts] = useState<ReturnType<typeof siteAgentCounts> | null>(null);
  const [sites, setSites] = useState<string[]>([]);
  const generation = useRef(0);
  const read = useCallback(async () => {
    if (!service.viaServer) return;
    const mine = generation.current;
    try {
      const r = await service.listAgents();
      if (mine !== generation.current || r.ok === false) return;
      const c = siteAgentCounts(r.data, new Date());
      setCounts(c.online + c.degraded + c.offline > 0 ? c : null); // only agents not revoked
      setSites(agentSiteIds(r.data));
    } catch { /* the line keeps what it showed */ }
  }, [service]);
  useEffect(() => {
    void read();
    return () => { generation.current += 1; };
  }, [read]);
  useLiveData(read, { topic: 'siteAgents', dataKeys: sites, pollMs: 60_000, enabled: service.viaServer });
  return counts;
}
