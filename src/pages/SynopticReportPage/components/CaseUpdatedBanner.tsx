// src/pages/SynopticReportPage/components/CaseUpdatedBanner.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 572 (Pete, Oct 14, 2026): "Someone else saved this case", shown when
// the open case report hears of another user's save (hooks/useCaseUpdateNotice.ts),
// so the user can catch up before their own save is refused. Not a window:
// nothing to dismiss before working on (click economy). Shown above the
// tabs, so it is seen on every tab. Only the message is a polite live
// region: it is read out once, and takes no focus; the buttons are not
// re-announced.
//
// Batch 575: "Show their changes" takes the newer case up in place
// (services/cases/caseWrite.ts takeUpNewerCase): their changes shown, this
// person's unsaved ones kept on top, no reload. When the two overlap, a
// lasting note (not a toast) says the next save will ask which to keep,
// until the person has read it ("Got it").
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  version: number | null;
  /** Batch 575: their changes overlapped this person's unsaved ones when taken up. */
  overlap?: boolean;
  busy?: boolean;
  onShow: () => void;
  onLater: () => void;
  onOverlapSeen?: () => void;
}

export const CaseUpdatedBanner: React.FC<Props> = ({ version, overlap = false, busy = false, onShow, onLater, onOverlapSeen }) => {
  const { t } = useTranslation();
  const mode = version !== null ? 'update' : overlap ? 'overlap' : null;
  const message = mode === 'update' ? t('synopticReportPage.caseUpdated.message') : mode === 'overlap' ? t('synopticReportPage.caseUpdated.overlap') : '';
  return (
    <div className={mode === null ? 'ps-case-updated-region' : mode === 'overlap' ? 'ps-case-updated-banner ps-case-updated-banner--overlap' : 'ps-case-updated-banner'}>
      <span className="ps-case-updated-text" role="status" aria-live="polite">{message}</span>
      {mode === 'update' && (
        <>
          <button type="button" className="ps-conf-btn-primary ps-case-updated-show" onClick={onShow} disabled={busy}>{t('synopticReportPage.caseUpdated.show')}</button>
          <button type="button" className="ps-btn-ghost-dark ps-case-updated-later" onClick={onLater}>{t('synopticReportPage.caseUpdated.later')}</button>
        </>
      )}
      {mode === 'overlap' && (
        <button type="button" className="ps-btn-ghost-dark ps-case-updated-later" onClick={onOverlapSeen}>{t('synopticReportPage.caseUpdated.gotIt')}</button>
      )}
    </div>
  );
};
