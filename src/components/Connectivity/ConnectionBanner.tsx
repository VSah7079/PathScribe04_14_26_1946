// src/components/Connectivity/ConnectionBanner.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 548 (PS-539 phase 2d, readiness review §9 item 2): a slim banner at the
// top of every signed-in screen when the connection is lost, and briefly when
// it's back. Inline, never a window to dismiss (CLAUDE.md rule 8); announced
// politely to screen readers. Decisions: hooks/useConnectionBanner.ts and
// services/connectivity/latencyStates.ts.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useConnectionBanner } from '@/hooks/useConnectionBanner';

export const ConnectionBanner: React.FC = () => {
  const { t } = useTranslation();
  const banner = useConnectionBanner();
  return (
    <div className="ps-connection-banner-region" role="status" aria-live="polite">
      {banner !== 'none' && (
        <div className={`ps-connection-banner ps-connection-banner--${banner}`}>
          <span className="ps-connection-banner__dot" aria-hidden="true" />
          <span className="ps-connection-banner__title">{t(`connectionBanner.${banner}.title`)}</span>
          <span className="ps-connection-banner__detail">{t(`connectionBanner.${banner}.detail`)}</span>
        </div>
      )}
    </div>
  );
};
