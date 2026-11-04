// src/hooks/useAgentPrinters.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 553 (SITE_AGENT_API.md §3): a site's report printers, for the routing
// rule window, the facility's Printing tab and the Print Queue's Redirect.
// The service checks the capability of the screen asking (`purpose`). An
// answer for a site no longer chosen is dropped.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react';
import { siteAgentAdminService } from '@/services';
import { agentPrinterChoices } from '@/services/printRouting/printDestinationRules';
import type { AgentPrinterPurpose } from '@/services/siteAgent/siteAgentAdminService';
import type { SiteAgentAdminError } from '@/services/siteAgent/siteAgentAdmin';

export interface AgentPrinterChoice { destinationId: string; label: string }

export interface AgentPrintersState {
  printers: AgentPrinterChoice[];
  loading: boolean;
  error: SiteAgentAdminError | null;
}

export function useAgentPrinters(siteId: string | null | undefined, purpose: AgentPrinterPurpose, service = siteAgentAdminService): AgentPrintersState {
  const site = siteId?.trim() || null;
  /** The answer and the site (and purpose) it is for: until the answer for the current site arrives, it is loading. */
  const [state, setState] = useState<AgentPrintersState & { key: string | null }>({ printers: [], loading: false, error: null, key: null });
  const key = site ? `${purpose}|${site}` : null;
  const current = useRef<string | null>(null);

  useEffect(() => {
    current.current = key;
    if (!site || !key) return;
    service.reportPrinters(site, purpose)
      .then(res => {
        if (current.current !== key) return;
        setState(res.ok === true ? { printers: agentPrinterChoices(res.data), loading: false, error: null, key } : { printers: [], loading: false, error: res.error, key });
      })
      .catch(() => { if (current.current === key) setState({ printers: [], loading: false, error: 'UNAVAILABLE', key }); });
  }, [site, key, purpose, service]);

  if (!key) return { printers: [], loading: false, error: null };
  if (state.key !== key) return { printers: [], loading: true, error: null };
  return { printers: state.printers, loading: state.loading, error: state.error };
}
