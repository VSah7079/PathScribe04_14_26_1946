// Batch 727 (Lab Workflow & Batch spec, Decisions 2-3, §6.4, §9): add-on rows carry an ADD-ON tag beside the STAT tag
// with the order type beneath it (not colour alone); a pinned row says so. Every label, alert kind and detail is shown
// in the display's language from the locale keys the summaries now carry (labelKey, kindKey, detailKey); the English
// text is kept only as the fallback for a summary without a key. A `node` value is shown through
// batchManagement.nodes.*, and an `at` value as a date in the display's language.
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { DashboardSummary } from '@/services/facilityOpsDashboard/IFacilityOpsDashboardTypes';
import { formatSlaDuration } from '@/services/facilityOpsDashboard/computeSlaCountdown';
import { formatDateTime } from '@/utils/formatDate';
import './DashboardSummaryView.css';

type Values = Record<string, string | number> | undefined;

const DashboardSummaryView: React.FC<{ summary: DashboardSummary }> = ({ summary }) => {
  const { t, i18n } = useTranslation();
  const values = (v: Values) => {
    if (!v) return v;
    const out: Record<string, string | number> = { ...v };
    if (typeof v.node === 'string') out.node = t(`batchManagement.nodes.${v.node}`);
    if (typeof v.at === 'string') out.at = formatDateTime(v.at, i18n.language);
    for (const [k, prefix] of [['status', 'facilityOpsDashboard.wsiStatus'], ['transit', 'facilityOpsDashboard.transit'], ['material', 'facilityOpsDashboard.material'], ['instrument', 'facilityOpsDashboard.instrumentStatus']] as const) {
      if (typeof v[k] === 'string') out[k] = t(`${prefix}.${v[k]}`);
    }
    return out;
  };
  const text = (key: string | undefined, vals: Values, fallback: string | undefined) => (key ? t(key, values(vals)) : fallback);

  return (
    <div>
      <div className="ps-opsdash-stat-grid">
        {summary.stats.map(s => (
          <div key={s.id} className={`ps-opsdash-stat-tile${s.state && s.state !== 'normal' ? ` ps-opsdash-stat-tile--${s.state}` : ''}`}>
            <div className="ps-opsdash-stat-value">{s.value}</div>
            <div className="ps-opsdash-stat-label">{text(s.labelKey, undefined, s.label)}</div>
          </div>
        ))}
      </div>

      {summary.alerts.length > 0 && (
        <div className="ps-opsdash-alerts">
          {summary.alerts.map(a => (
            <div key={a.id} className={`ps-opsdash-alert-row${a.severity === 'warning' ? ' ps-opsdash-alert-row--warning' : ''}`}>
              <span className="ps-opsdash-alert-kind">{text(a.kindKey, undefined, a.kind)}</span>
              <div>
                <div className="ps-opsdash-alert-title" data-phi="accession">{a.title}</div>
                {(a.detail || a.detailKey) && <div className="ps-opsdash-alert-detail">{text(a.detailKey, a.detailValues, a.detail)}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {summary.queue.length === 0 ? (
        <div className="ps-opsdash-queue-empty">{t('facilityOpsDashboard.queueEmpty')}</div>
      ) : (
        <div className="ps-opsdash-queue-list">
          {summary.queue.map(item => (
            <div key={item.id} className={`ps-opsdash-queue-row${item.slaState ? ` ps-opsdash-queue-row--${item.slaState}` : item.isStat ? ' ps-opsdash-queue-row--stat' : ''}`}>
              <div>
                <span className="ps-opsdash-queue-label" data-phi="accession">
                  {text(item.labelKey, undefined, item.label)}
                  {item.isStat && <span className="ps-opsdash-stat-pill">{t('facilityOpsDashboard.statPill')}</span>}
                  {item.tags?.includes('addOn') && <span className="ps-opsdash-stat-pill ps-opsdash-addon-pill">{t('facilityOpsDashboard.addOnPill')}</span>}
                  {item.pinned && <span className="ps-opsdash-pinned">{t('facilityOpsDashboard.pinned')}</span>}
                </span>
                {item.subLabelKey && <div className="ps-opsdash-queue-sublabel">{t(item.subLabelKey)}</div>}
                {(item.detail || item.detailKey) && <div className="ps-opsdash-queue-detail">{text(item.detailKey, item.detailValues, item.detail)}</div>}
              </div>
              {item.slaState && item.remainingMinutes !== undefined ? (
                <div className={`ps-opsdash-queue-timer ps-opsdash-queue-timer--${item.slaState}`}>
                  {item.slaState === 'overdue'
                    ? t('facilityOpsDashboard.overdueBy', { duration: formatSlaDuration(item.remainingMinutes) })
                    : formatSlaDuration(item.remainingMinutes)}
                </div>
              ) : item.ageMinutes !== undefined ? (
                <div className="ps-opsdash-queue-age">{t('facilityOpsDashboard.ageLabel', { duration: formatSlaDuration(item.ageMinutes) })}</div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardSummaryView;
