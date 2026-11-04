// src/components/Contribution/ClientSlaPanel.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 610 (#87, #164): how each client's cases did against its SLA. One row
// per client with a service-level target: the cases within and past the
// first-touch and total hours, the average, and Met / Missed. "Running" counts
// open cases that are already past the target. SLAs are set in Configuration →
// System → Client SLA; the rows are built by services/clientSLA/clientSlaRules.ts.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ClientSlaRow } from '@/services/clientSLA/clientSlaRules';

const K = 'clientSlaPanel';

const Cell: React.FC<{ part: ClientSlaRow['total'] }> = ({ part }) => {
  const { t } = useTranslation();
  if (part.state === 'noCases' && part.running === 0) return <>{t(`${K}.noCases`)}</>;
  return (
    <>
      <span className={`ps-perf-badge ps-perf-badge--${part.state}`}>{t(`${K}.state.${part.state}`)}</span>{' '}
      {t(`${K}.counts`, { within: part.within, breached: part.breached })}
      {part.avgHrs !== null && <span className="ps-perf-tile__previous">{t(`${K}.average`, { hours: part.avgHrs })}</span>}
      {part.running > 0 && <span className="ps-perf-badge ps-perf-badge--missed">{t(`${K}.running`, { count: part.running })}</span>}
    </>
  );
};

const ClientSlaPanel: React.FC<{ rows: readonly ClientSlaRow[] }> = ({ rows }) => {
  const { t } = useTranslation();
  return (
    <div className="ps-perf-tile ps-perf-tile--wide" data-testid="client-sla-panel">
      <div className="ps-perf-tile__eyebrow">{t(`${K}.title`)}</div>
      {rows.length === 0 ? (
        <p className="ps-perf-tile__empty">{t(`${K}.empty`)}</p>
      ) : (
        <table className="ps-perf-sla-table">
          <thead>
            <tr>
              <th>{t(`${K}.columns.client`)}</th>
              <th>{t(`${K}.columns.cases`)}</th>
              <th>{t(`${K}.columns.firstTouch`)}</th>
              <th>{t(`${K}.columns.total`)}</th>
              <th>{t(`${K}.columns.sla`)}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.slaId} data-testid={`client-sla-row-${r.assigningAuthority}`}>
                <td><span className="ps-client-authority-badge">{r.assigningAuthority}</span> {r.clientName}</td>
                <td>{r.caseCount}</td>
                <td><Cell part={r.firstTouch} /></td>
                <td><Cell part={r.total} /></td>
                <td><span className={`ps-perf-badge ps-perf-badge--${r.state}`}>{t(`${K}.state.${r.state}`)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ClientSlaPanel;
