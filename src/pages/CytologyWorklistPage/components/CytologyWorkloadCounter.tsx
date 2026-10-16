// src/pages/CytologyWorklistPage/components/CytologyWorkloadCounter.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 574 (Pete, Oct 15, 2026): "show the number of reviews and remaining
// reviews so the Cytotech can easily track their limit". Always visible on
// the Cytology worklist and the screening page: slides counted of the cap,
// reviews, left now (the limit grows with hours screened) and left in a full
// 8-hour day, with a bar marked at the limit so far. Amber from 85% of the
// limit so far; red, in words too, at the limit (the next review wouldn't
// fit) and over it. Nothing to click (click economy). Figures from
// services/cytology/cytologyWorkloadSummary.ts.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { CytologyWorkloadSummary } from '@/services/cytology/cytologyWorkloadSummary';

export const CytologyWorkloadCounter: React.FC<{ summary: CytologyWorkloadSummary; idSuffix?: string }> = ({ summary, idSuffix = 'worklist' }) => {
  const { t, i18n } = useTranslation();
  const n = (v: number) => new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 }).format(v);
  const titleId = `ps-cyto-workload-title-${idSuffix}`;
  return (
    <section className={`ps-cyto-workload ps-cyto-workload--${summary.status}`} aria-labelledby={titleId}>
      <div className="ps-cyto-workload-head">
        <h2 id={titleId} className="ps-cyto-workload-title">{t('cytologyWorklist.workload.title')}</h2>
        {summary.status !== 'ok' && (
          <span className="ps-cyto-workload-status">{t(`cytologyWorklist.workload.status.${summary.status}`)}</span>
        )}
      </div>
      <ul className="ps-cyto-workload-figures">
        <li><strong>{t('cytologyWorklist.workload.slides', { used: n(summary.slidesCounted), cap: n(summary.cap) })}</strong></li>
        <li>{t('cytologyWorklist.workload.reviews', { count: summary.reviews })}</li>
        {summary.leftNow !== null && summary.limitNow !== null && (
          <li>{t('cytologyWorklist.workload.leftNow', { left: n(summary.leftNow), limit: n(summary.limitNow), hours: n(summary.hours) })}</li>
        )}
        {/* After 8 hours "left now" is the full day's figure: said once. */}
        {!summary.fullPeriodReached && <li>{t('cytologyWorklist.workload.leftFullDay', { left: n(summary.leftFullDay) })}</li>}
      </ul>
      <div className="ps-cyto-workload-bar" aria-hidden="true">
        <span className="ps-cyto-workload-bar-fill" style={{ '--ps-workload-pct': `${summary.percentOfCap}%` } as React.CSSProperties} />
        {summary.limitNow !== null && !summary.fullPeriodReached && (
          <span className="ps-cyto-workload-bar-limit" style={{ '--ps-workload-limit-pct': `${summary.limitPercentOfCap}%` } as React.CSSProperties} />
        )}
      </div>
    </section>
  );
};
