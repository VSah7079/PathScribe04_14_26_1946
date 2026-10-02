// src/pages/RegistryExceptionsPage/RegistryExceptionsPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 421 (Registry Engine SRS v2.1, FR-008.6, FR-008.7). Every registry
// submission, screening or cancer, that needs a person: held, undelivered,
// rejected, unanswered for 72 hours, or answered twice differently. Each row
// shows what went wrong (the registry's findings, with the raw acknowledgement
// one click away), opens the case, and can re-validate and resend
// (registry:submission:resend). Rendering only: the rules are in
// services/registrySubmission/.
// Batch 423: "Capture as CAPA" raises the row into Quality Assurance's CAPA
// lifecycle (captureRegistryExceptionAsCapa.ts), as the interface dead-letter
// screens do; a row with an open one says so.
// Batch 424: "Held: attestation required" (a live register without a current
// go-live approval) is its own filter, with "Resend all" for the catch-up.
// Batch 425: "Revised after acceptance" (a registry changed data it had
// accepted; a CAPA deficiency is raised automatically) with "Mark reviewed"
// (registry:revision:review); "Patient details" edits the patient's national
// identifiers and opt-outs after accessioning (an A08 goes to the engine);
// "Download transmission audit" (qa:registry-transmission-audit:export). Only
// the signed-in user's own organisation's cases are listed.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { toast } from 'react-toastify';
import '../../pathscribe.css';
import { useAuth } from '@/contexts/AuthContext';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { useSystemConfig } from '@/contexts/SystemConfigContext';
import { PatientRegistryDetailsModal } from '@/components/Common/PatientRegistryDetailsModal';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { formatDateTime } from '@/utils/formatDate';
import { screeningRegistryDefinition } from '@/services/screeningRegistry/screeningRegistryDefinitions';
import { registryExceptionCaseRoute, registryLabelKey, type RegistryExceptionKind, type RegistryExceptionRow, type RegistryQueueName } from '@/services/registrySubmission/registryExceptions';
import { useRegistryExceptions, type RegistryExceptionFilter } from './hooks/useRegistryExceptions';

const K = 'registryExceptions';
const FILTERS: RegistryExceptionFilter[] = ['all', 'rejectedFatal', 'rejectedRecoverable', 'conflict', 'revisedPostAcceptance', 'deliveryFailed', 'ackOverdue', 'attestationRequired', 'held'];
const screeningLabelId = (id: string) => screeningRegistryDefinition(id)?.labelId;

export default function RegistryExceptionsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { pushCrumb } = useBreadcrumb();
  const { config } = useSystemConfig();
  const { rows, total, counts, loading, filter, setFilter, reload, resend, resendAll, captureCapa, markReviewed, exportAudit, hasCapa, busyEntry } = useRegistryExceptions(user);
  const [open, setOpen] = useState<string | null>(null);
  const [detailsCase, setDetailsCase] = useState<string | null>(null);
  const [auditQueue, setAuditQueue] = useState<'all' | RegistryQueueName>('all');

  useEffect(() => { pushCrumb(t(`${K}.title`), '/registry-exceptions'); }, [pushCrumb, t]);

  const registryName = (row: RegistryExceptionRow) => {
    const key = registryLabelKey(row.queue, row.registryId, screeningLabelId);
    return key ? t(key) : row.registryId;
  };

  const onResend = async (row: RegistryExceptionRow) => {
    const r = await resend(row);
    const text = t(`${K}.outcomes.${r.outcome}`, { version: r.submission?.submissionVersion ?? '', type: r.submission?.messageType ?? '' });
    if (r.outcome === 'resent' || r.outcome === 'newVersion') toast.success(text);
    else toast.warning(r.message ? t(`${K}.outcomeWithDetail`, { outcome: text, detail: r.message }) : text);
  };

  const onCaptureCapa = async (row: RegistryExceptionRow) => {
    const r = await captureCapa(row);
    (r.outcome === 'captured' ? toast.success : toast.warning)(t(`${K}.capa.${r.outcome}`));
  };

  const onMarkReviewed = async (row: RegistryExceptionRow) => {
    const r = await markReviewed(row);
    (r === 'reviewed' ? toast.success : toast.warning)(t(`${K}.revision.${r}`));
  };

  const onExportAudit = async () => {
    const r = await exportAudit(auditQueue === 'all' ? undefined : auditQueue);
    if (!r.ok) toast.warning(t(`${K}.audit.notPermitted`));
    else toast.success(t(`${K}.audit.done`, { count: r.rowCount ?? 0 }));
  };

  const onResendAll = async () => {
    const r = await resendAll();
    if (r.notPermitted) toast.warning(t(`${K}.outcomes.notPermitted`));
    else (r.notResent ? toast.warning : toast.success)(t(`${K}.resendAllDone`, { resent: r.resent, notResent: r.notResent }));
  };

  return (
    <div className="ps-regx-page">
      <header className="ps-page-header-row">
        <div>
          <h1 className="ps-page-title">{t(`${K}.title`)}</h1>
          <p className="ps-page-subtitle">{t(`${K}.subtitle`)}</p>
        </div>
        <div className="ps-regx-header-actions">
          <select className="ps-input-dark ps-regx-audit-select" aria-label={t(`${K}.audit.queue`)} value={auditQueue}
            onChange={e => setAuditQueue(e.target.value as 'all' | RegistryQueueName)}>
            {(['all', 'cytology', 'cancer'] as const).map(q => <option key={q} value={q}>{t(`${K}.audit.queues.${q}`)}</option>)}
          </select>
          <CapabilityButton capability="qa:registry-transmission-audit:export" className="ps-btn-ghost-dark" onClick={onExportAudit}>
            {t(`${K}.audit.download`)}
          </CapabilityButton>
          <button className="ps-btn-ghost-dark" onClick={() => reload()} disabled={loading}>{t(`${K}.refresh`)}</button>
        </div>
      </header>

      <div className="ps-regx-filters" role="tablist">
        {FILTERS.map(f => (
          <button key={f} role="tab" aria-selected={filter === f}
            className={`ps-regx-filter ps-regx-filter--${f}${filter === f ? ' ps-regx-filter--active' : ''}`}
            onClick={() => setFilter(f)}>
            {t(`${K}.filters.${f}`)}<span className="ps-regx-filter-count">{f === 'all' ? total : counts[f as RegistryExceptionKind]}</span>
          </button>
        ))}
      </div>

      {/* Batch 424: the bulk catch-up, for results held until go-live is approved. */}
      {filter === 'attestationRequired' && rows.some(r => r.canResend) && (
        <div className="ps-regx-bulk">
          <span className="ps-regx-muted">{t(`${K}.attestationNote`)}</span>
          <CapabilityButton capability="registry:submission:resend" className="ps-conf-btn-primary" disabled={busyEntry !== null} onClick={onResendAll}>
            {t(busyEntry === '*' ? `${K}.resending` : `${K}.resendAll`, { count: rows.filter(r => r.canResend).length })}
          </CapabilityButton>
        </div>
      )}

      {loading ? <div className="ps-regx-empty">{t(`${K}.loading`)}</div>
        : rows.length === 0 ? <div className="ps-regx-empty">{t(filter === 'all' ? `${K}.emptyAll` : `${K}.emptyFilter`)}</div>
          : (
            <div className="ps-table-wrap">
              <table className="ps-table ps-regx-table">
                <thead>
                  <tr>
                    <th>{t(`${K}.columns.case`)}</th>
                    <th>{t(`${K}.columns.registry`)}</th>
                    <th>{t(`${K}.columns.status`)}</th>
                    <th>{t(`${K}.columns.problem`)}</th>
                    <th>{t(`${K}.columns.when`)}</th>
                    <th>{t(`${K}.columns.actions`)}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => {
                    const id = `${row.queue}:${row.entryId}`;
                    const first = row.findings[0];
                    return (
                      <React.Fragment key={id}>
                        <tr>
                          <td><span data-phi="accession" className="ps-regx-case">{row.caseId}</span></td>
                          <td>
                            <div>{registryName(row)}</div>
                            {row.submissionVersion !== undefined && (
                              <div className="ps-regx-muted">{t(`${K}.version`, { version: row.submissionVersion, type: t(`${K}.messageTypes.${row.messageType}`) })}
                                {row.environment === 'test' && <span className="ps-regx-test">{t(`${K}.test`)}</span>}
                              </div>
                            )}
                          </td>
                          <td><span className={`ps-regx-status ps-regx-status--${row.kind}`}>{t(`${K}.kinds.${row.kind}`)}</span></td>
                          <td className="ps-regx-problem">
                            {first ? <>{first.code && <code className="ps-regx-code">{first.code}</code>} {first.message}</> : <span className="ps-regx-muted">{t(`${K}.noFindings.${row.kind === 'ackOverdue' ? 'overdue' : 'none'}`)}</span>}
                            {row.findings.length > 1 && <span className="ps-regx-muted"> {t(`${K}.moreFindings`, { count: row.findings.length - 1 })}</span>}
                          </td>
                          <td className="ps-regx-when">{formatDateTime(row.at, i18n.language)}</td>
                          <td className="ps-regx-actions">
                            <button className="ps-btn-ghost-dark" onClick={() => setOpen(open === id ? null : id)} aria-expanded={open === id}>{t(open === id ? `${K}.hideDetails` : `${K}.details`)}</button>
                            <button className="ps-btn-ghost-dark" onClick={() => navigate(registryExceptionCaseRoute(row))}>{t(`${K}.openCase`)}</button>
                            <button className="ps-btn-ghost-dark" onClick={() => setDetailsCase(row.caseId)}>{t(`${K}.patientDetails`)}</button>
                            {row.kind === 'revisedPostAcceptance' && (
                              <CapabilityButton capability="registry:revision:review" className="ps-conf-btn-primary" disabled={busyEntry === row.entryId} onClick={() => onMarkReviewed(row)}>
                                {t(`${K}.revision.markReviewed`)}
                              </CapabilityButton>
                            )}
                            {hasCapa(row)
                              ? <span className="ps-regx-capa">{t(`${K}.capa.raised`)}</span>
                              : <button className="ps-btn-ghost-dark" disabled={busyEntry === row.entryId} onClick={() => onCaptureCapa(row)}>{t(`${K}.capa.capture`)}</button>}
                            {row.canResend && (
                              <CapabilityButton capability="registry:submission:resend" className="ps-conf-btn-primary" disabled={busyEntry === row.entryId} onClick={() => onResend(row)}>
                                {t(busyEntry === row.entryId ? `${K}.resending` : `${K}.resend`)}
                              </CapabilityButton>
                            )}
                          </td>
                        </tr>
                        {open === id && (
                          <tr className="ps-regx-detail-row">
                            <td colSpan={6}>
                              {row.findings.length > 0 && (
                                <ul className="ps-regx-findings">
                                  {row.findings.map((f, i) => (
                                    <li key={i}>
                                      <span className={`ps-regx-sev ps-regx-sev--${f.severity}`}>{t(`${K}.severities.${f.severity}`)}</span>
                                      {f.tier !== undefined && <span className="ps-regx-muted">{t(`${K}.tier`, { tier: f.tier })}</span>}
                                      {f.code && <code className="ps-regx-code">{f.code}</code>}
                                      <span>{f.message}</span>
                                      {f.location && <span className="ps-regx-muted">{t(`${K}.location`, { location: f.location })}</span>}
                                    </li>
                                  ))}
                                </ul>
                              )}
                              {row.rawAcknowledgement
                                ? <><div className="ps-regx-raw-label">{t(`${K}.rawAcknowledgement`)}</div><pre data-phi="true" className="ps-regx-raw">{row.rawAcknowledgement}</pre></>
                                : <div className="ps-regx-muted">{t(`${K}.noAcknowledgement`)}</div>}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

      <PatientRegistryDetailsModal caseId={detailsCase} jurisdiction={config.jurisdiction} user={user}
        onClose={() => setDetailsCase(null)} onSaved={() => { void reload(); }} />
    </div>
  );
}
