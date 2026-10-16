// src/components/Exports/ExportNotices.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 550 (PS-539 phase 2d, D7; ASYNC_EXPORT_API.md §5): what happened to
// the exports asked for in this window, when the API server builds them. An
// export still being prepared, one that is ready (Download), or one that
// couldn't be made and why. Inline, never a window to dismiss first (CLAUDE.md
// rule 8); a quick export downloads straight away and shows nothing here.
// In the demo exports are built in the browser, so nothing shows.
//
// Renders and dispatches; the notices and their wording are in
// services/exports/exportTracker.ts (`exportService` in @/services).
// ─────────────────────────────────────────────────────────────────────────────
import React, { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { exportService } from '@/services';
import { exportNoticeMessage, type ExportTracker } from '@/services/exports/exportTracker';

export const MY_EXPORTS_PATH = '/my-exports';

export const ExportNotices: React.FC<{ tracker?: ExportTracker }> = ({ tracker = exportService }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const notices = useSyncExternalStore(tracker.subscribe, tracker.getSnapshot, tracker.getSnapshot);
  if (notices.length === 0) return null;

  return (
    <div className="ps-export-notices" role="region" aria-live="polite" aria-label={t('exports.notice.regionLabel')}>
      {notices.map(n => {
        const message = exportNoticeMessage(n);
        return (
          <div key={n.exportId} className={`ps-export-notice ps-export-notice--${n.state}`} role={n.state === 'failed' ? 'alert' : undefined}>
            <span className="ps-export-notice-dot" aria-hidden="true" />
            <span className="ps-export-notice-body">
              <span className="ps-export-notice-title" data-phi="accession">{n.title}</span>
              <span className="ps-export-notice-text">{t(message.key, message.values)}</span>
            </span>
            <span className="ps-export-notice-actions">
              {n.state === 'ready' && (
                <button type="button" className="ps-export-notice-btn ps-export-notice-btn--primary" onClick={() => { void tracker.download(n.exportId); }}>
                  {t('exports.notice.download')}
                </button>
              )}
              {n.state !== 'failed' && (
                <button type="button" className="ps-export-notice-btn" onClick={() => navigate(MY_EXPORTS_PATH)}>
                  {t('exports.notice.myExports')}
                </button>
              )}
              <button type="button" className="ps-export-notice-btn" onClick={() => tracker.dismiss(n.exportId)} aria-label={t('exports.notice.dismissAria')}>
                {t('exports.notice.dismiss')}
              </button>
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default ExportNotices;
