// src/components/Printing/PrintDestinationFields.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 553 (SITE_AGENT_API.md §3): where a report prints, edited the same way
// in the routing rule window and the Print Queue's Redirect. A site agent's
// printer (chosen from the site's list) or a printer address sent to directly.
// The rules are in services/printRouting/printDestinationRules.ts; this only
// renders the draft and passes changes up.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useAgentPrinters } from '@/hooks/useAgentPrinters';
import { agentChoiceMissing, onlyAgentChoice, withAgentPrinter, withSite, type PrintDestinationDraft, type PrintDestinationKind, type RedirectSiteReason } from '@/services/printRouting/printDestinationRules';
import { LoadingState } from '@/components/Common/LoadingState';
import type { AgentPrinterPurpose } from '@/services/siteAgent/siteAgentAdminService';
import type { PrintProtocol } from '@/types/printRouting/PrintDestination';

const K = 'printDestination';
const PROTOCOLS: PrintProtocol[] = ['RAW_9100', 'LPR_LPD', 'IPP'];
const KINDS: PrintDestinationKind[] = ['agent', 'network'];

export interface PrintDestinationFieldsProps {
  draft: PrintDestinationDraft;
  onChange: (next: PrintDestinationDraft) => void;
  purpose: AgentPrinterPurpose;
  /** The sites (performing labs) to choose from. Omitted or `siteLocked`: the draft's site is used as it is. */
  sites?: { id: string; name: string }[];
  siteLocked?: boolean;
  /** False when no single site applies (Redirect of jobs from several labs): only a printer address can be given. */
  agentAllowed?: boolean;
  /** Why agent printers aren't offered, when `agentAllowed` is false. */
  agentUnavailableReason?: Exclude<RedirectSiteReason, 'oneSite'>;
}

export const PrintDestinationFields: React.FC<PrintDestinationFieldsProps> = ({ draft, onChange, purpose, sites, siteLocked, agentAllowed = true, agentUnavailableReason = 'severalSites' }) => {
  const { t } = useTranslation();
  const kind: PrintDestinationKind = agentAllowed ? draft.kind : 'network';
  const agents = useAgentPrinters(kind === 'agent' ? draft.siteId : null, purpose);
  const stale = kind === 'agent' && agentChoiceMissing(draft.agentPrinterId, agents);
  // With one report printer on the site and none chosen, it is picked (rule 8); the person can still change it.
  const only = kind === 'agent' ? onlyAgentChoice(draft.agentPrinterId, agents) : null;
  useEffect(() => { if (only) onChange(withAgentPrinter(draft, only)); }, [only, draft, onChange]);

  return (
    <div className="ps-print-dest">
      {agentAllowed ? (
        <div>
          <div className="ps-conf-label">{t(`${K}.kind`)}</div>
          <select className="ps-conf-select" aria-label={t(`${K}.kind`)} value={kind} onChange={e => onChange({ ...draft, kind: e.target.value as PrintDestinationKind })}>
            {KINDS.map(k => <option key={k} value={k}>{t(`${K}.kinds.${k}`)}</option>)}
          </select>
        </div>
      ) : (
        <p className="ps-conf-hint">{t(agentUnavailableReason === 'noSite' ? `${K}.agentNoSite` : `${K}.agentNeedsOneSite`)}</p>
      )}

      {kind === 'agent' && (
        <>
          {sites && !siteLocked && (
            <div>
              <div className="ps-conf-label">{t(`${K}.site`)}</div>
              <select className="ps-conf-select" aria-label={t(`${K}.site`)} value={draft.siteId} onChange={e => onChange(withSite(draft, e.target.value))}>
                <option value="">{t(`${K}.chooseSite`)}</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <div className="ps-conf-label">{t(`${K}.printer`)}</div>
            <select className="ps-conf-select" aria-label={t(`${K}.printer`)} value={draft.agentPrinterId} disabled={!draft.siteId || agents.loading}
              onChange={e => onChange(withAgentPrinter(draft, agents.printers.find(p => p.destinationId === e.target.value)))}>
              <option value="">{t(`${K}.choosePrinter`)}</option>
              {stale && <option value={draft.agentPrinterId}>{draft.agentPrinterName || draft.agentPrinterId}</option>}
              {agents.printers.map(p => <option key={p.destinationId} value={p.destinationId}>{p.label}</option>)}
            </select>
          </div>
          {agents.loading && <LoadingState variant="inline" className="ps-conf-hint" label={t(`${K}.loadingPrinters`)} />}
          {!draft.siteId && <p className="ps-conf-hint">{t(siteLocked ? `${K}.scopeFirst` : `${K}.siteFirst`)}</p>}
          {agents.error === 'NOT_PERMITTED' && <p className="ps-conf-hint">{t(`${K}.printersNotPermitted`)}</p>}
          {agents.error && agents.error !== 'NOT_PERMITTED' && <p className="ps-conf-hint">{t(`${K}.printersUnavailable`)}</p>}
          {draft.siteId && !agents.loading && !agents.error && agents.printers.length === 0 && (
            <p className="ps-conf-hint ps-print-dest-note">
              <span>{t(`${K}.noPrinters`)}</span>
              <Link to="/configuration?tab=system&section=site_agents">{t(`${K}.openSiteAgents`)}</Link>
            </p>
          )}
          {stale && <p className="ps-rr-modal-warn">{t(`${K}.printerNotListed`)}</p>}
        </>
      )}

      {kind === 'network' && (
        <>
          <p className="ps-conf-hint">{t(`${K}.networkHint`)}</p>
          <div>
            <div className="ps-conf-label">{t(`${K}.protocol`)}</div>
            <select className="ps-conf-select" aria-label={t(`${K}.protocol`)} value={draft.protocol} onChange={e => onChange({ ...draft, protocol: e.target.value as PrintProtocol })}>
              {PROTOCOLS.map(p => <option key={p} value={p}>{t(`${K}.protocols.${p}`)}</option>)}
            </select>
          </div>
          <div>
            <div className="ps-conf-label">{t(`${K}.address`)}</div>
            <input className="ps-conf-input" aria-label={t(`${K}.address`)} placeholder={t(`${K}.placeholders.address`)} value={draft.ipAddress} onChange={e => onChange({ ...draft, ipAddress: e.target.value })} />
          </div>
          <div>
            <div className="ps-conf-label">{t(`${K}.port`)}</div>
            <input className="ps-conf-input" inputMode="numeric" aria-label={t(`${K}.port`)} placeholder={t(`${K}.placeholders.port`)} value={draft.port} onChange={e => onChange({ ...draft, port: e.target.value })} />
          </div>
          {draft.protocol === 'LPR_LPD' && (
            <div>
              <div className="ps-conf-label">{t(`${K}.queue`)}</div>
              <input className="ps-conf-input" aria-label={t(`${K}.queue`)} placeholder={t(`${K}.placeholders.queue`)} value={draft.queueName} onChange={e => onChange({ ...draft, queueName: e.target.value })} />
            </div>
          )}
          {draft.protocol === 'IPP' && (
            <div>
              <div className="ps-conf-label">{t(`${K}.path`)}</div>
              <input className="ps-conf-input" aria-label={t(`${K}.path`)} placeholder={t(`${K}.placeholders.path`)} value={draft.resourcePath} onChange={e => onChange({ ...draft, resourcePath: e.target.value })} />
            </div>
          )}
          <div>
            <div className="ps-conf-label">{t(`${K}.name`)}</div>
            <input className="ps-conf-input" aria-label={t(`${K}.name`)} placeholder={t(`${K}.placeholders.name`)} value={draft.displayName} onChange={e => onChange({ ...draft, displayName: e.target.value })} />
          </div>
        </>
      )}
    </div>
  );
};
