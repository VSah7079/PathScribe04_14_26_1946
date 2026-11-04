// src/components/Config/System/SiteAgentsSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 552 (PS-539 phase 2d; SITE_AGENT_API.md §2, §3, §9 and §11a):
// Configuration → System → Site agents. For one site (a performing lab):
//   - its agents: status (online, needs attention, offline, revoked), version,
//     last check-in, certificate expiry, and its printers reachable;
//   - a one-time enrolment code for installing an agent (shown once);
//   - Revoke (cuts the agent off at once; a reason is asked for, as it can't be undone);
//   - the site's agent printers and file shares, saved in one step.
// Credentials for shares are never entered here: only the name of the entry
// the hospital's IT made on the agent's machine.
//
// Batch 553: Revoke's reason is picked from a short list (a note is needed
// only for "Other"); the agent's update window is set here; a pickup share
// hands over to an API import picked from a list, or to an engine channel
// (the channels already used on this site are offered).
//
// Renders and dispatches: hooks/useSiteAgents.ts, services/siteAgent.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSiteAgents } from '@/hooks/useSiteAgents';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { LoadingState } from '@/components/Common/LoadingState';
import { formatDateTime } from '@/utils/formatDate';
import { copyText } from '@/utils/copyText';
import { useReportConfigDirty } from '../configDirtyGuardContext';
import { REVOKE_NOTE_MAX, REVOKE_REASON_CODES, revokeReasonValid, siteAgentState, withKind, withProtocol, type AgentRevokeReasonCode } from '@/services/siteAgent/siteAgentAdmin';
import type { ISiteAgentAdminService } from '@/services/siteAgent/siteAgentAdminService';
import { PICKUP_IMPORT_KINDS, type AgentPrintProtocol, type AgentShare } from '@/services/siteAgent/siteAgentContract';

const K = 'siteAgents';
const PROTOCOLS: AgentPrintProtocol[] = ['IPPS', 'IPP', 'LPR_LPD', 'RAW_9100'];

/**
 * The site is the facility chosen in the group's facility picker above
 * (Workstation & Hardware), so there is one picker, not two. With "All
 * facilities" the section asks for one.
 */
const SiteAgentsSection: React.FC<{ selectedFacilityId?: string; service?: ISiteAgentAdminService }> = ({ selectedFacilityId, service }) => {
  const { t, i18n } = useTranslation();
  const siteId = selectedFacilityId ?? '';
  const s = useSiteAgents(siteId, service);
  // Leaving the section, or changing the facility, with unsaved printers or shares asks first (the PS-128 guard).
  useReportConfigDirty(s.dirty);
  const [revoking, setRevoking] = useState<{ agentId: string; code?: AgentRevokeReasonCode; note: string } | null>(null);
  const [copied, setCopied] = useState<boolean | null>(null);
  const now = new Date();

  if (!siteId) {
    return (
      <div className="ps-siteagents">
        <h2 className="ps-conf-section-title">{t(`${K}.title`)}</h2>
        <p className="ps-conf-section-subtitle">{t(`${K}.subtitle`)}</p>
        <p className="ps-siteagents-note">{t(`${K}.chooseSite`)}</p>
      </div>
    );
  }

  return (
    <div className="ps-siteagents">
      <div className="ps-conf-section-header">
        <div>
          <h2 className="ps-conf-section-title">{t(`${K}.title`)}</h2>
          <p className="ps-conf-section-subtitle">{t(`${K}.subtitle`)}</p>
        </div>
      </div>

      {!s.viaServer && <p className="ps-siteagents-note">{t(`${K}.demoNote`)}</p>}
      {s.problem && <p className="ps-siteagents-note ps-siteagents-note--problem" role="alert">{t(`${K}.problem.${s.problem}`)}</p>}
      {s.notice && <p className="ps-siteagents-note" role="status">{t(`${K}.notice.${s.notice}`)}</p>}

      {/* ── Agents ── */}
      <section className="ps-siteagents-card" aria-labelledby="ps-siteagents-agents">
        <div className="ps-siteagents-card-header">
          <h3 id="ps-siteagents-agents" className="ps-siteagents-heading">{t(`${K}.agentsHeading`)}</h3>
          <CapabilityButton capability="config:site-agents:enroll" context={{ facilityId: siteId }} className="ps-conf-btn-secondary" disabled={!siteId || s.busy} onClick={() => { setCopied(null); void s.makeCode(); }}>
            {t(`${K}.newCode`)}
          </CapabilityButton>
        </div>
        {s.code && (
          <div className="ps-siteagents-code" role="status">
            <span className="ps-siteagents-code-label">{t(`${K}.codeLabel`)}</span>
            <code className="ps-siteagents-code-value">{s.code.code}</code>
            <button type="button" className="ps-conf-btn-secondary" onClick={() => { void copyText(s.code!.code).then(setCopied); }}>{copied ? t(`${K}.copied`) : t(`${K}.copy`)}</button>
            {copied === false && <span className="ps-siteagents-meta" role="alert">{t(`${K}.copyFailed`)}</span>}
            <span className="ps-siteagents-meta">{t(`${K}.codeExpires`, { when: formatDateTime(s.code.expiresAt, i18n.language) })}</span>
            <button type="button" className="ps-conf-btn-secondary" onClick={s.clearCode}>{t(`${K}.done`)}</button>
          </div>
        )}
        {s.agents === null ? <LoadingState variant="inline" className="ps-siteagents-note" label={t(`${K}.loading`)} />
          : s.agents.length === 0 ? <p className="ps-siteagents-note">{t(s.viaServer ? `${K}.noAgents` : `${K}.noAgentsDemo`)}</p>
          : (
            <div className="ps-conf-table-wrap"><div className="ps-conf-table-scroll">
              <table className="ps-conf-table">
                <thead><tr>
                  <th className="ps-conf-th">{t(`${K}.columns.machine`)}</th>
                  <th className="ps-conf-th">{t(`${K}.columns.status`)}</th>
                  <th className="ps-conf-th">{t(`${K}.columns.version`)}</th>
                  <th className="ps-conf-th">{t(`${K}.columns.lastSeen`)}</th>
                  <th className="ps-conf-th">{t(`${K}.columns.certificate`)}</th>
                  <th className="ps-conf-th">{t(`${K}.columns.printers`)}</th>
                  <th className="ps-conf-th"><span className="ps-sr-only">{t(`${K}.columns.actions`)}</span></th>
                </tr></thead>
                <tbody>
                  {s.agents.map(a => {
                    const state = siteAgentState(a, now);
                    const printers = a.lastHeartbeat?.heartbeat.printers ?? [];
                    return (
                      <tr key={a.agentId} className="ps-conf-tr">
                        <td className="ps-conf-td">{a.machineName}</td>
                        <td className="ps-conf-td"><span className={`ps-siteagents-status ps-siteagents-status--${state}`}>{t(`${K}.status.${state}`)}</span></td>
                        <td className="ps-conf-td">{a.agentVersion}</td>
                        <td className="ps-conf-td">{a.lastHeartbeat ? formatDateTime(a.lastHeartbeat.receivedAt, i18n.language) : t(`${K}.never`)}</td>
                        <td className="ps-conf-td">{formatDateTime(a.certExpiresAt, i18n.language)}</td>
                        <td className="ps-conf-td">{t(`${K}.reachable`, { reachable: printers.filter(p => p.reachable).length, total: printers.length })}</td>
                        <td className="ps-conf-td">
                          {state !== 'revoked' && (revoking?.agentId === a.agentId ? (
                            <span className="ps-siteagents-revoke">
                              <span className="ps-siteagents-reasons" role="group" aria-label={t(`${K}.revokeReason`)}>
                                {REVOKE_REASON_CODES.map(code => (
                                  <button key={code} type="button" className="ps-siteagents-reason" aria-pressed={revoking.code === code}
                                    onClick={() => setRevoking({ ...revoking, code })}>{t(`${K}.revokeReasons.${code}`)}</button>
                                ))}
                              </span>
                              <input className="ps-conf-input" aria-label={t(`${K}.revokeNote`)} maxLength={REVOKE_NOTE_MAX}
                                placeholder={revoking.code === 'other' ? t(`${K}.placeholders.revokeNoteRequired`) : t(`${K}.placeholders.revokeNoteOptional`)}
                                value={revoking.note} onChange={e => setRevoking({ ...revoking, note: e.target.value })} />
                              <CapabilityButton capability="config:site-agents:enroll" context={{ facilityId: siteId }} className="ps-conf-btn-primary ps-siteagents-btn-danger"
                                disabled={!revoking.code || !revokeReasonValid({ code: revoking.code, note: revoking.note }) || s.busy}
                                onClick={() => { if (revoking.code) void s.revoke(a.agentId, { code: revoking.code, note: revoking.note }).then(ok => { if (ok) setRevoking(null); }); }}>
                                {t(`${K}.confirmRevoke`)}
                              </CapabilityButton>
                              <button type="button" className="ps-conf-btn-secondary" onClick={() => setRevoking(null)}>{t('common.cancel')}</button>
                            </span>
                          ) : (
                            <CapabilityButton capability="config:site-agents:enroll" context={{ facilityId: siteId }} className="ps-conf-btn-secondary" onClick={() => setRevoking({ agentId: a.agentId, note: '' })}>
                              {t(`${K}.revoke`)}
                            </CapabilityButton>
                          ))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div></div>
          )}
      </section>

      {/* ── Printers ── */}
      {s.draft && (
        <section className="ps-siteagents-card" aria-labelledby="ps-siteagents-printers">
          <div className="ps-siteagents-card-header">
            <h3 id="ps-siteagents-printers" className="ps-siteagents-heading">{t(`${K}.printersHeading`)}</h3>
            <CapabilityButton capability="config:site-agent-config:manage" context={{ facilityId: siteId }} className="ps-conf-btn-secondary" onClick={s.addPrinter}>{t(`${K}.addPrinter`)}</CapabilityButton>
          </div>
          {s.draft.printers.length === 0 ? <p className="ps-siteagents-note">{t(`${K}.noPrinters`)}</p> : (
            <div className="ps-conf-table-wrap"><div className="ps-conf-table-scroll">
              <table className="ps-conf-table">
                <thead><tr>
                  <th className="ps-conf-th">{t(`${K}.printer.id`)}</th>
                  <th className="ps-conf-th">{t(`${K}.printer.name`)}</th>
                  <th className="ps-conf-th">{t(`${K}.printer.kind`)}</th>
                  <th className="ps-conf-th">{t(`${K}.printer.protocol`)}</th>
                  <th className="ps-conf-th">{t(`${K}.printer.host`)}</th>
                  <th className="ps-conf-th">{t(`${K}.printer.port`)}</th>
                  <th className="ps-conf-th">{t(`${K}.printer.queueOrPath`)}</th>
                  <th className="ps-conf-th"><span className="ps-sr-only">{t(`${K}.columns.actions`)}</span></th>
                </tr></thead>
                <tbody>
                  {s.draft.printers.map((p, i) => {
                    const problem = s.printerProblems[i];
                    return (
                      <tr key={i} className="ps-conf-tr">
                        <td className="ps-conf-td"><input className="ps-conf-input" aria-label={t(`${K}.printer.id`)} value={p.destinationId} onChange={e => s.setPrinter(i, { ...p, destinationId: e.target.value })} /></td>
                        <td className="ps-conf-td"><input className="ps-conf-input" aria-label={t(`${K}.printer.name`)} value={p.displayName ?? ''} onChange={e => s.setPrinter(i, { ...p, displayName: e.target.value || undefined })} /></td>
                        <td className="ps-conf-td">
                          <select className="ps-conf-select" aria-label={t(`${K}.printer.kind`)} value={p.kind} onChange={e => s.setPrinter(i, withKind(p, e.target.value as 'report' | 'label'))}>
                            <option value="report">{t(`${K}.printer.kinds.report`)}</option>
                            <option value="label">{t(`${K}.printer.kinds.label`)}</option>
                          </select>
                        </td>
                        <td className="ps-conf-td">
                          <select className="ps-conf-select" aria-label={t(`${K}.printer.protocol`)} value={p.protocol} disabled={p.kind === 'label'} onChange={e => s.setPrinter(i, withProtocol(p, e.target.value as AgentPrintProtocol))}>
                            {PROTOCOLS.map(pr => <option key={pr} value={pr}>{t(`${K}.printer.protocols.${pr}`)}</option>)}
                          </select>
                        </td>
                        <td className="ps-conf-td"><input className="ps-conf-input" aria-label={t(`${K}.printer.host`)} value={p.host} onChange={e => s.setPrinter(i, { ...p, host: e.target.value })} /></td>
                        <td className="ps-conf-td"><input className="ps-conf-input ps-siteagents-port" type="number" aria-label={t(`${K}.printer.port`)} value={p.port} onChange={e => s.setPrinter(i, { ...p, port: Number(e.target.value) })} /></td>
                        <td className="ps-conf-td">
                          {p.protocol === 'LPR_LPD' && <input className="ps-conf-input" aria-label={t(`${K}.printer.queue`)} placeholder={t(`${K}.placeholders.lprQueue`)} value={p.queueName ?? ''} onChange={e => s.setPrinter(i, { ...p, queueName: e.target.value || undefined })} />}
                          {(p.protocol === 'IPP' || p.protocol === 'IPPS') && <input className="ps-conf-input" aria-label={t(`${K}.printer.path`)} placeholder={t(`${K}.placeholders.ippPath`)} value={p.resourcePath ?? ''} onChange={e => s.setPrinter(i, { ...p, resourcePath: e.target.value || undefined })} />}
                          {problem && <span className="ps-conf-error-text">{t(`${K}.printer.problem.${problem}`)}</span>}
                        </td>
                        <td className="ps-conf-td"><button type="button" className="ps-conf-btn-secondary" onClick={() => s.removePrinter(i)}>{t(`${K}.remove`)}</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div></div>
          )}
          <p className="ps-siteagents-meta">{t(`${K}.printerNote`)}</p>
        </section>
      )}

      {/* ── Shares ── */}
      {s.draft && (
        <section className="ps-siteagents-card" aria-labelledby="ps-siteagents-shares">
          <div className="ps-siteagents-card-header">
            <h3 id="ps-siteagents-shares" className="ps-siteagents-heading">{t(`${K}.sharesHeading`)}</h3>
            <span className="ps-siteagents-actions">
              <CapabilityButton capability="config:site-agent-config:manage" context={{ facilityId: siteId }} className="ps-conf-btn-secondary" onClick={() => s.addShare('write')}>{t(`${K}.addWriteShare`)}</CapabilityButton>
              <CapabilityButton capability="config:site-agent-config:manage" context={{ facilityId: siteId }} className="ps-conf-btn-secondary" onClick={() => s.addShare('pickup')}>{t(`${K}.addPickupShare`)}</CapabilityButton>
            </span>
          </div>
          {s.draft.shares.length === 0 ? <p className="ps-siteagents-note">{t(`${K}.noShares`)}</p> : s.draft.shares.map((sh, i) => (
            <ShareRow key={i} share={sh} problem={s.shareProblems[i]} onChange={next => s.setShare(i, next)} onRemove={() => s.removeShare(i)} />
          ))}
          <datalist id="ps-siteagents-channels">
            {s.channelSuggestions.map(c => <option key={c} value={c} />)}
          </datalist>
          <p className="ps-siteagents-meta">{t(`${K}.shareNote`)}</p>
        </section>
      )}

      {/* ── Updates (Batch 553) ── */}
      {s.draft && (
        <section className="ps-siteagents-card" aria-labelledby="ps-siteagents-updates">
          <h3 id="ps-siteagents-updates" className="ps-siteagents-heading">{t(`${K}.updatesHeading`)}</h3>
          <div className="ps-siteagents-window">
            <label className="ps-siteagents-field">{t(`${K}.updateWindow.start`)}
              <input className="ps-conf-input" type="time" value={s.draft.updateWindow?.start ?? ''}
                onChange={e => s.setUpdateWindow({ start: e.target.value, end: s.draft?.updateWindow?.end ?? '' })} />
            </label>
            <label className="ps-siteagents-field">{t(`${K}.updateWindow.end`)}
              <input className="ps-conf-input" type="time" value={s.draft.updateWindow?.end ?? ''}
                onChange={e => s.setUpdateWindow({ start: s.draft?.updateWindow?.start ?? '', end: e.target.value })} />
            </label>
            {(s.draft.updateWindow?.start || s.draft.updateWindow?.end) && (
              <button type="button" className="ps-conf-btn-secondary" onClick={() => s.setUpdateWindow({ start: '', end: '' })}>{t(`${K}.updateWindow.clear`)}</button>
            )}
          </div>
          {s.updateWindowProblem && <span className="ps-conf-error-text">{t(`${K}.updateWindow.problem.${s.updateWindowProblem}`)}</span>}
          <p className="ps-siteagents-meta">{t(`${K}.updateWindow.note`)}</p>
        </section>
      )}

      {s.draft && (
        <div className="ps-siteagents-savebar">
          {s.dirty && <span className="ps-siteagents-meta">{t(`${K}.unsaved`)}</span>}
          <button type="button" className="ps-conf-btn-secondary" disabled={!s.dirty || s.busy} onClick={s.discard}>{t(`${K}.discard`)}</button>
          <CapabilityButton capability="config:site-agent-config:manage" context={{ facilityId: siteId }} className="ps-conf-btn-primary" disabled={!s.canSave} onClick={() => { void s.save(); }}>
            {t(`${K}.save`)}
          </CapabilityButton>
        </div>
      )}
    </div>
  );
};

/** One share: its path and direction, and for a pickup share, its rule. */
const ShareRow: React.FC<{ share: AgentShare; problem?: string; onChange: (s: AgentShare) => void; onRemove: () => void }> = ({ share, problem, onChange, onRemove }) => {
  const { t } = useTranslation();
  const rule = share.pickup;
  return (
    <div className="ps-siteagents-share">
      <div className="ps-siteagents-share-row">
        <span className="ps-siteagents-share-kind">{t(`${K}.share.directions.${share.direction}`)}</span>
        <input className="ps-conf-input" aria-label={t(`${K}.share.id`)} value={share.shareId} onChange={e => onChange({ ...share, shareId: e.target.value })} />
        <input className="ps-conf-input ps-siteagents-unc" aria-label={t(`${K}.share.unc`)} placeholder={t(`${K}.placeholders.unc`)} value={share.uncPath} onChange={e => onChange({ ...share, uncPath: e.target.value })} />
        <input className="ps-conf-input" aria-label={t(`${K}.share.credentialRef`)} placeholder={t(`${K}.share.credentialRef`)} value={share.credentialRef ?? ''} onChange={e => onChange({ ...share, credentialRef: e.target.value || undefined })} />
        <button type="button" className="ps-conf-btn-secondary" onClick={onRemove}>{t(`${K}.remove`)}</button>
      </div>
      {rule && (
        <div className="ps-siteagents-share-row">
          <input className="ps-conf-input" aria-label={t(`${K}.share.pattern`)} placeholder={t(`${K}.placeholders.pattern`)} value={rule.pattern} onChange={e => onChange({ ...share, pickup: { ...rule, pattern: e.target.value } })} />
          <label className="ps-siteagents-field">{t(`${K}.share.minStable`)}
            <input className="ps-conf-input ps-siteagents-port" type="number" value={rule.minStableSeconds} onChange={e => onChange({ ...share, pickup: { ...rule, minStableSeconds: Number(e.target.value) } })} />
          </label>
          <label className="ps-siteagents-field">{t(`${K}.share.maxMb`)}
            <input className="ps-conf-input ps-siteagents-port" type="number" value={rule.maxFileMegabytes} onChange={e => onChange({ ...share, pickup: { ...rule, maxFileMegabytes: Number(e.target.value) } })} />
          </label>
          <select className="ps-conf-select" aria-label={t(`${K}.share.afterHandover`)} value={rule.afterHandover} onChange={e => onChange({ ...share, pickup: { ...rule, afterHandover: e.target.value as 'moveToProcessed' | 'delete' } })}>
            <option value="moveToProcessed">{t(`${K}.share.after.moveToProcessed`)}</option>
            <option value="delete">{t(`${K}.share.after.delete`)}</option>
          </select>
          <label className="ps-siteagents-field">{t(`${K}.share.rejectedFolder`)}
            <input className="ps-conf-input ps-siteagents-port" value={rule.rejectedFolder} onChange={e => onChange({ ...share, pickup: { ...rule, rejectedFolder: e.target.value } })} />
          </label>
          <select className="ps-conf-select" aria-label={t(`${K}.share.handTo`)} value={rule.handTo.kind}
            onChange={e => onChange({ ...share, pickup: { ...rule, handTo: e.target.value === 'engineChannel' ? { kind: 'engineChannel', channelId: '' } : { kind: 'apiImport', importKind: PICKUP_IMPORT_KINDS[0] } } })}>
            <option value="engineChannel">{t(`${K}.share.handToKinds.engineChannel`)}</option>
            <option value="apiImport">{t(`${K}.share.handToKinds.apiImport`)}</option>
          </select>
          {rule.handTo.kind === 'engineChannel' ? (
            <input className="ps-conf-input" aria-label={t(`${K}.share.channel`)} list="ps-siteagents-channels" placeholder={t(`${K}.placeholders.channel`)}
              value={rule.handTo.channelId}
              onChange={e => onChange({ ...share, pickup: { ...rule, handTo: { kind: 'engineChannel', channelId: e.target.value } } })} />
          ) : (
            <select className="ps-conf-select" aria-label={t(`${K}.share.importKind`)} value={rule.handTo.importKind}
              onChange={e => onChange({ ...share, pickup: { ...rule, handTo: { kind: 'apiImport', importKind: e.target.value } } })}>
              {!(PICKUP_IMPORT_KINDS as readonly string[]).includes(rule.handTo.importKind) && <option value={rule.handTo.importKind}>{t(`${K}.share.chooseImport`)}</option>}
              {PICKUP_IMPORT_KINDS.map(k => <option key={k} value={k}>{t(`${K}.share.importKinds.${k}`)}</option>)}
            </select>
          )}
        </div>
      )}
      {rule?.afterHandover === 'delete' && <span className="ps-siteagents-meta">{t(`${K}.share.deleteWarning`)}</span>}
      {problem && <span className="ps-conf-error-text">{t(`${K}.share.problem.${problem}`)}</span>}
    </div>
  );
};

export default SiteAgentsSection;
