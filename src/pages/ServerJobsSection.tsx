// src/pages/ServerJobsSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 551 (PS-539 phase 2d; readiness review §9 item 10; MESSAGE_BUS_API.md
// §4 and §4a): System Logs → Server jobs. With the API server, the work the
// browser does today runs as background jobs. This shows, per job kind, what
// is waiting, running and dead-lettered today, the recurring jobs and when
// each last ran, and the jobs that failed for good, with Requeue (one click,
// audited by the server). Interface and print jobs are resent from Interfaces
// with their own capabilities, so their rows link there. In the demo the
// browser does this work itself, and the section says so.
//
// Renders and dispatches: hooks/useServerJobs.ts, services/serverJobs.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useServerJobs } from '@/hooks/useServerJobs';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { LoadingState } from '@/components/Common/LoadingState';
import { formatDateTime } from '@/utils/formatDate';
import type { IServerJobsService } from '@/services/serverJobs/serverJobsService';
import { isKnownJobKind, isKnownRecurringJob, kindNeedsAttention, recurringJobOverdue, requeueRouteFor, deadLetterContext, SERVER_JOB_KINDS, type ServerJobKind } from '@/services/serverJobs/serverJobsContract';

const K = 'serverJobs';

/** Where an interface or print job is resent from (System Logs → Interfaces, on that sub-tab). */
export type ServerJobsOpenTarget = 'outbound_dlq' | 'print_queue';

export const ServerJobsSection: React.FC<{ service?: IServerJobsService; onOpenInterfaces?: (target: ServerJobsOpenTarget) => void }> = ({ service, onOpenInterfaces }) => {
  const { t, i18n } = useTranslation();
  const { viaServer, health, jobs, kind, setKind, problem, busyJob, lastRequeue, reload, requeue } = useServerJobs(service);
  const kindLabel = (k: string) => (isKnownJobKind(k) ? t(`${K}.kinds.${k}`) : k);
  const recurringLabel = (n: string) => (isKnownRecurringJob(n) ? t(`${K}.recurring.${n}`) : n);

  if (!viaServer) {
    return (
      <div className="ps-serverjobs">
        <h3 className="ps-serverjobs-heading">{t(`${K}.title`)}</h3>
        <p className="ps-serverjobs-note">{t(`${K}.demoNote`)}</p>
      </div>
    );
  }

  // Overdue is judged against the server's clock (when it built this health), not this workstation's.
  const now = health ? new Date(health.generatedAt) : new Date();
  const minutes = (seconds: number) => Math.max(1, Math.round(seconds / 60));

  return (
    <div className="ps-serverjobs">
      <div className="ps-serverjobs-header">
        <div>
          <h3 className="ps-serverjobs-heading">{t(`${K}.title`)}</h3>
          <p className="ps-serverjobs-note">{t(`${K}.subtitle`)}</p>
        </div>
        <button type="button" className="ps-btn-ghost-dark" onClick={() => { void reload(); }}>{t(`${K}.refresh`)}</button>
      </div>

      {problem && <p className="ps-serverjobs-note" role="alert">{t(`${K}.problem.${problem}`)}</p>}

      {health === null && !problem && <LoadingState variant="inline" className="ps-serverjobs-note" label={t(`${K}.loading`)} />}

      {health && (
        <>
          <h4 className="ps-serverjobs-subheading">{t(`${K}.kindsHeading`)}</h4>
          <div className="ps-table-wrap">
            <table className="ps-table">
              <thead>
                <tr>
                  <th>{t(`${K}.columns.kind`)}</th>
                  <th>{t(`${K}.columns.ready`)}</th>
                  <th>{t(`${K}.columns.overdue`)}</th>
                  <th>{t(`${K}.columns.running`)}</th>
                  <th>{t(`${K}.columns.deadLetters24h`)}</th>
                </tr>
              </thead>
              <tbody>
                {health.kinds.map(h => (
                  <tr key={h.kind} className={kindNeedsAttention(h) ? 'ps-serverjobs-row--attention' : undefined}>
                    <td>{kindLabel(h.kind)}</td>
                    <td>{h.ready}</td>
                    <td>{h.oldestReadyOverdueSeconds > 0 ? t(`${K}.minutes`, { count: minutes(h.oldestReadyOverdueSeconds) }) : t(`${K}.none`)}</td>
                    <td>{h.running}</td>
                    <td>{h.deadLetters24h}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h4 className="ps-serverjobs-subheading">{t(`${K}.recurringHeading`)}</h4>
          <div className="ps-table-wrap">
            <table className="ps-table">
              <thead>
                <tr>
                  <th>{t(`${K}.columns.recurring`)}</th>
                  <th>{t(`${K}.columns.lastRun`)}</th>
                  <th>{t(`${K}.columns.state`)}</th>
                </tr>
              </thead>
              <tbody>
                {health.recurring.map(r => {
                  const overdue = recurringJobOverdue(r, now);
                  return (
                    <tr key={r.name} className={overdue || r.lastOutcome === 'failed' ? 'ps-serverjobs-row--attention' : undefined}>
                      <td>{recurringLabel(r.name)}</td>
                      <td>{r.lastRunAt ? formatDateTime(r.lastRunAt, i18n.language) : t(`${K}.never`)}</td>
                      <td>{overdue ? t(`${K}.state.overdue`) : r.lastOutcome === 'failed' ? t(`${K}.state.failed`) : t(`${K}.state.ok`)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="ps-serverjobs-header">
        <h4 className="ps-serverjobs-subheading">{t(`${K}.deadLettersHeading`)}</h4>
        <select className="ps-conf-select" aria-label={t(`${K}.filterKind`)} value={kind} onChange={e => setKind(e.target.value as ServerJobKind | '')}>
          <option value="">{t(`${K}.allKinds`)}</option>
          {SERVER_JOB_KINDS.map(k => <option key={k} value={k}>{kindLabel(k)}</option>)}
        </select>
      </div>

      {lastRequeue && (
        <p className="ps-serverjobs-note" role="status">{lastRequeue.ok ? t(`${K}.requeued`) : t(`${K}.problem.${lastRequeue.error ?? 'UNAVAILABLE'}`)}</p>
      )}
      {jobs !== null && jobs.length === 0 && <p className="ps-serverjobs-note">{t(`${K}.noDeadLetters`)}</p>}
      {jobs !== null && jobs.length > 0 && (
        <div className="ps-table-wrap">
          <table className="ps-table">
            <thead>
              <tr>
                <th>{t(`${K}.columns.kind`)}</th>
                <th>{t(`${K}.columns.case`)}</th>
                <th>{t(`${K}.columns.error`)}</th>
                <th>{t(`${K}.columns.attempts`)}</th>
                <th>{t(`${K}.columns.failedAt`)}</th>
                <th><span className="ps-sr-only">{t(`${K}.columns.actions`)}</span></th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => {
                const route = requeueRouteFor(job.kind);
                return (
                  <tr key={job.jobId}>
                    <td>{kindLabel(job.kind)}{job.consumer ? <span className="ps-serverjobs-meta">{job.consumer}</span> : null}</td>
                    <td>{job.caseId ? <span data-phi="accession">{job.caseId}</span> : ''}</td>
                    <td>
                      <span className="ps-serverjobs-code">{job.lastError.code}</span>
                      {/* The server's own short English description: a code and plain text, never patient data (§7).
                          Tagged for redaction anyway, as a safeguard in a support screenshot. */}
                      <span className="ps-serverjobs-meta" data-phi="true">{job.lastError.message}</span>
                    </td>
                    <td>{t(`${K}.attemptsOf`, { attempts: job.attempts, max: job.maxAttempts })}</td>
                    <td>{formatDateTime(job.deadLetteredAt, i18n.language)}</td>
                    <td>
                      {!route ? null : route.screen === 'serverJobs' ? (
                        <CapabilityButton capability={route.capability} context={deadLetterContext(job)} className="ps-conf-btn-secondary"
                          disabled={busyJob === job.jobId} onClick={() => { void requeue(job); }}>
                          {t(`${K}.requeue`)}
                        </CapabilityButton>
                      ) : (
                        <button type="button" className="ps-conf-btn-secondary" onClick={() => onOpenInterfaces?.(route.screen === 'printQueue' ? 'print_queue' : 'outbound_dlq')}>{t(`${K}.openIn.${route.screen}`)}</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ServerJobsSection;
