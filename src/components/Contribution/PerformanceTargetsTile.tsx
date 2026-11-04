// src/components/Contribution/PerformanceTargetsTile.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 610 (#87): the Productivity dashboard's performance targets. Each
// target the lab has set for cases or RVUs, with this period's total against it
// (Met / On track / Behind) and how the period before ended (Met / Missed).
// The targets are set in Configuration → System → Performance Targets; the
// judging is services/performanceTargets/performanceTargetRules.ts.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { TargetProgressRow } from '@/services/performanceTargets/performanceTargetRules';

const K = 'performanceTargetsTile';

const PerformanceTargetsTile: React.FC<{ rows: readonly TargetProgressRow[] }> = ({ rows }) => {
  const { t } = useTranslation();
  return (
    <div className="ps-perf-tile" data-testid="performance-targets-tile">
      <div className="ps-perf-tile__eyebrow">{t(`${K}.title`)}</div>
      {rows.length === 0 ? (
        <p className="ps-perf-tile__empty">{t(`${K}.empty`)}</p>
      ) : rows.map(({ target, current, previous }) => (
        <div key={target.id} className="ps-perf-tile__row" data-testid={`performance-target-${target.key}`}>
          <div className="ps-perf-tile__line">
            <span className="ps-perf-tile__label">{target.label}</span>
            <span className={`ps-perf-badge ps-perf-badge--${current.state}`}>{t(`${K}.state.${current.state}`)}</span>
          </div>
          <div className="ps-perf-tile__bar-track">
            <div className={`ps-perf-tile__bar-fill ps-perf-tile__bar-fill--${current.state}`}
              style={{ '--bar-width': `${Math.min(100, current.pct)}%` } as React.CSSProperties} />
          </div>
          <div className="ps-perf-tile__figures">
            <span>{t(`${K}.progress`, { actual: current.actual, target: current.target, unit: t(`${K}.units.${target.unit === 'RVUs' ? 'rvus' : 'cases'}`), period: t(`${K}.periods.${target.period}`) })}</span>
            <span className="ps-perf-tile__previous">{t(`${K}.previous`, { result: t(`${K}.state.${previous.state}`), actual: previous.actual })}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PerformanceTargetsTile;
