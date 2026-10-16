// src/components/ReportRelease/HeldReportsBanner.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 534 (Pete, Oct 12, 2026: every report output follows the release
// delay). One line per report on this case still waiting out the delay: what
// it is, when it goes, and Recall for the person who released it (it reopens
// what was released; nothing is sent). Inline, not a window (click economy).
// The surgical sign-out keeps its own banner (ReleaseBufferBanner).
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import '@/pathscribe.css';
import { formatDateTime } from '@/utils/formatDate';
import { useHeldReports } from '@/hooks/useHeldReports';

interface Props {
  caseId: string | null | undefined;
  user: { id: string; name: string } | null | undefined;
  /** Reload the screen after a recall (what was released is reopened). */
  onRecalled?: () => void | Promise<void>;
}

export const HeldReportsBanner: React.FC<Props> = ({ caseId, user, onRecalled }) => {
  const { t, i18n } = useTranslation();
  const { held, recall, canRecall } = useHeldReports(caseId, user, onRecalled);
  if (held.length === 0) return null;
  return (
    <div className="ps-held-reports" role="status">
      {held.map(h => (
        <div key={h.id} className="ps-held-reports-row">
          <span className="ps-held-reports-text">
            {t('heldReports.line', {
              what: t(`heldReports.kinds.${h.kind}`), type: t(`heldReports.types.${h.event.reportType}`),
              time: formatDateTime(h.expiresAt, i18n.language), name: h.releasedBy.userName,
            })}
          </span>
          {canRecall(h) && (
            <button type="button" className="ps-held-reports-recall"
              onClick={async () => {
                const r = await recall(h.id);
                if (r.ok) toast.success(t('heldReports.recalled'));
                else toast.error(t(`heldReports.refused.${r.refusal}`));
              }}>
              {t('heldReports.recall')}
            </button>
          )}
        </div>
      ))}
    </div>
  );
};
