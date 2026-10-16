// src/pages/InterfaceEnginesSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 554 (PS-539 phase 2d; readiness review §9 item 4; INTERFACE_ENGINE_EDGE.md
// §9a): Audit Log → Interfaces → Engines. Each hospital's interface engine
// (hosted or on site): its status, last check-in, whether it reaches the API,
// free disk, certificate expiry, and its listeners and channels with what is
// waiting and the dead letters. Problems first. Read only: a channel is
// restarted on the engine; dead letters are resent from Outbound.
// Renders only: hooks/useInterfaceEngines.ts, services/interfaceMonitoring.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useInterfaceEngines } from '@/hooks/useInterfaceEngines';
import { LoadingState } from '@/components/Common/LoadingState';
import { formatDateTime } from '@/utils/formatDate';
import { formatList } from '@/utils/formatList';
import { ENGINE_HEALTH_LIMITS } from '@/services/interfaceEngine/engineEdgeContract';
import type { IInterfaceMonitoringService } from '@/services/interfaceMonitoring/interfaceMonitoringService';

const K = 'interfaceEngines';

const InterfaceEnginesSection: React.FC<{ service?: IInterfaceMonitoringService; onOpenOutbound?: () => void }> = ({ service, onOpenOutbound }) => {
  const { t, i18n } = useTranslation();
  const e = useInterfaceEngines(service);

  if (!e.viaServer) {
    return (
      <div className="ps-ifengines">
        <h3 className="ps-serverjobs-heading">{t(`${K}.title`)}</h3>
        <p className="ps-serverjobs-note">{t(`${K}.demoNote`)}</p>
      </div>
    );
  }

  return (
    <div className="ps-ifengines">
      <div className="ps-serverjobs-header">
        <div>
          <h3 className="ps-serverjobs-heading">{t(`${K}.title`)}</h3>
          <p className="ps-serverjobs-note">{t(`${K}.subtitle`)}</p>
        </div>
        <button type="button" className="ps-conf-btn-secondary" onClick={() => { void e.reload(); }}>{t(`${K}.refresh`)}</button>
      </div>
      {e.problem && <p className="ps-serverjobs-note ps-ifengines-line--problem" role="alert">{t(`${K}.problem.${e.problem}`)}</p>}
      {e.views === null && !e.problem && <LoadingState variant="inline" className="ps-serverjobs-note" label={t(`${K}.loading`)} />}
      {e.views !== null && e.views.length === 0 && <p className="ps-serverjobs-note">{t(`${K}.none`)}</p>}
      {e.views?.map(v => {
        const hb = v.engine.lastHeartbeat?.heartbeat;
        return (
          <section key={v.engine.engineInstanceId} className="ps-ifengines-card" aria-label={v.engine.displayName ?? v.engine.engineInstanceId}>
            <div className="ps-ifengines-card-header">
              <h4 className="ps-ifengines-name">{v.engine.displayName ?? v.engine.engineInstanceId}</h4>
              <span className={`ps-ifengines-status ps-ifengines-status--${v.status}`}>{t(`${K}.status.${v.status}`)}</span>
              <span className="ps-serverjobs-meta">{t(`${K}.hosting.${v.engine.hosting}`)}</span>
            </div>
            <p className="ps-ifengines-facts">
              <span>{v.engine.lastHeartbeat ? t(`${K}.lastCheckIn`, { when: formatDateTime(v.engine.lastHeartbeat.receivedAt, i18n.language) }) : t(`${K}.neverCheckedIn`)}</span>
              {hb && <span>{t(hb.apiReachable ? `${K}.apiReachable` : `${K}.apiNotReachable`)}</span>}
              {hb && <span>{t(`${K}.diskFree`, { percent: hb.diskFreePercent })}</span>}
              {hb?.certExpiresAt && <span>{t(`${K}.certExpires`, { when: formatDateTime(hb.certExpiresAt, i18n.language) })}</span>}
              {hb && <span>{t(`${K}.version`, { version: hb.imageVersion })}</span>}
              <span>{formatList([
                t(`${K}.totals.queued`, { count: v.queued }),
                t(`${K}.totals.deadLetters`, { count: v.deadLetters }),
                t(`${K}.totals.listenersDown`, { count: v.listenersDown }),
              ], i18n.language)}</span>
            </p>
            {v.channels.length > 0 && (
              <div className="ps-conf-table-wrap"><div className="ps-conf-table-scroll">
                <table className="ps-conf-table">
                  <thead><tr>
                    <th className="ps-conf-th">{t(`${K}.columns.channel`)}</th>
                    <th className="ps-conf-th">{t(`${K}.columns.direction`)}</th>
                    <th className="ps-conf-th">{t(`${K}.columns.state`)}</th>
                    <th className="ps-conf-th">{t(`${K}.columns.queued`)}</th>
                    <th className="ps-conf-th">{t(`${K}.columns.oldest`)}</th>
                    <th className="ps-conf-th">{t(`${K}.columns.deadLetters`)}</th>
                  </tr></thead>
                  <tbody>
                    {v.channels.map(c => (
                      <tr key={`${c.direction}:${c.channelId}`} className={`ps-conf-tr${c.problem ? ' ps-ifengines-row--problem' : ''}`}>
                        <td className="ps-conf-td"><span className="ps-serverjobs-code">{c.channelId}</span>{c.problem && <span className="ps-serverjobs-meta">{t(`${K}.channelProblem.${c.problem}`, { minutes: ENGINE_HEALTH_LIMITS.maxQueuedAgeMinutes })}</span>}</td>
                        <td className="ps-conf-td">{t(`${K}.direction.${c.direction}`)}</td>
                        <td className="ps-conf-td">{t(`${K}.state.${c.state}`)}</td>
                        <td className="ps-conf-td">{t(`${K}.number`, { value: c.queued })}</td>
                        <td className="ps-conf-td">{c.oldestQueuedAgeSeconds ? t(`${K}.minutes`, { count: Math.ceil(c.oldestQueuedAgeSeconds / 60) }) : '—'}</td>
                        <td className="ps-conf-td">
                          {t(`${K}.number`, { value: c.deadLetters })}
                          {c.deadLetters > 0 && c.direction === 'outbound' && onOpenOutbound && (
                            <button type="button" className="ps-conf-btn-secondary ps-ifengines-open" onClick={onOpenOutbound}>{t(`${K}.openOutbound`)}</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div></div>
            )}
          </section>
        );
      })}
      <p className="ps-serverjobs-note">{t(`${K}.readOnlyNote`)}</p>
    </div>
  );
};

export default InterfaceEnginesSection;
