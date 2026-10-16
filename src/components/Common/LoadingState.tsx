// src/components/Common/LoadingState.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 548 (PS-539 phase 2d, readiness review §8): what a screen shows while
// its data loads. Nothing for the first 300 ms, then a placeholder with the
// screen's own text, and from 3 s "Still working…" as well
// (services/connectivity/latencyStates.ts). Replaces the plain
// plain loading text (the old ps-conf-loading class) the screens showed at once.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLoadingPhase } from '@/hooks/useLoadingPhase';

/**
 * `variant`:
 *   - 'block' (default): a section or page waiting: placeholder bars, the text, "still working".
 *   - 'inline': inside a table row, a list or a dialog: just the text after 300 ms and
 *     "still working" after 3 s, in the place's own style (`className`, rendered as a block in
 *     that class so it keeps its layout; with no class, a span in the line). Batch 549.
 */
export const LoadingState: React.FC<{ label: React.ReactNode; className?: string; variant?: 'block' | 'inline' }> = ({ label, className, variant = 'block' }) => {
  const { t } = useTranslation();
  const phase = useLoadingPhase();
  if (variant === 'inline') {
    const text = phase !== 'hidden' && (
      <>
        {label}
        {phase === 'slow' && <span className="ps-loading-state__slow ps-loading-state__slow--inline">{t('loadingState.slow')}</span>}
      </>
    );
    // With the place's own class, a block in that class (it keeps its own layout: centring,
    // padding, a card); without one, a span inside the line or table cell it sits in.
    return className
      ? <div className={className} role="status" aria-live="polite">{text}</div>
      : <span className="ps-loading-state--inline" role="status" aria-live="polite">{text}</span>;
  }
  return (
    <div className={`ps-loading-state${className ? ` ${className}` : ''}`} role="status" aria-live="polite">
      {phase !== 'hidden' && (
        <>
          <div className="ps-loading-state__skeleton" aria-hidden="true">
            <span className="ps-loading-state__bar ps-loading-state__bar--wide" />
            <span className="ps-loading-state__bar" />
            <span className="ps-loading-state__bar ps-loading-state__bar--short" />
          </div>
          <div className="ps-loading-state__label">{label}</div>
          {phase === 'slow' && <div className="ps-loading-state__slow">{t('loadingState.slow')}</div>}
        </>
      )}
    </div>
  );
};
