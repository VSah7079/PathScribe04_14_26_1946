// src/pages/SynopticReportPage/components/MergeReviewDialog.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 458 (PS-71; Pete: "the User gets alerted with a notification of the
// changes, and then an option to abort or accept the changes"). Someone else
// saved this case since the page loaded it, in other parts than this save's.
// Nothing is saved yet. "Save mine with theirs" saves both; "Not yet" shows
// their changes with this person's applied on top, unsaved, to look over and
// save again. Their change can't be undone from here. The decisions live in
// services/cases/caseWrite.ts (MergeReview, commitMergeReview, takeUpSavedCase).
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatList } from '@/utils/formatList';

const K = 'synopticReportPage.mergeReview';
const P = 'synopticReportPage.concurrency.parts';

export const MergeReviewDialog: React.FC<{
  theirsChanged: string[];
  mineChanged: string[];
  busy: boolean;
  onSave: () => void;
  onNotYet: () => void;
}> = ({ theirsChanged, mineChanged, busy, onSave, onNotYet }) => {
  const { t, i18n } = useTranslation();
  const list = (fields: string[]) => formatList(fields.map(f => t(`${P}.${f}`)), i18n.language);
  return (
    <div data-capture-hide="true" className="ps-overlay">
      <div className="ps-modal-dark ps-modal-dark--sm ps-modal-dark--centered" role="dialog" aria-label={t(`${K}.title`)}>
        <div className="ps-modal-dark-emoji">🔄</div>
        <div className="ps-modal-dark-header ps-modal-dark-header--center">
          <span className="ps-modal-dark-title">{t(`${K}.title`)}</span>
        </div>
        <div className="ps-conflict-changes">
          <table className="ps-conflict-changes-table">
            <tbody>
              <tr>
                <th>{t(`${K}.theirs`)}</th>
                <td>{theirsChanged.length ? list(theirsChanged) : t(`${K}.nothingVisible`)}</td>
              </tr>
              <tr>
                <th>{t(`${K}.mine`)}</th>
                <td>{mineChanged.length ? list(mineChanged) : t(`${K}.nothingVisible`)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="ps-modal-dark-hint ps-modal-dark-hint--center">{t(`${K}.hint`)}</p>
        <div className="ps-modal-dark-footer ps-modal-dark-footer--stretch ps-modal-dark-footer--stretch-stacked">
          <button type="button" className="ps-btn-ghost-dark" disabled={busy} onClick={onNotYet}>{t(`${K}.notYet`)}</button>
          <button type="button" className="ps-btn-amber" disabled={busy} onClick={onSave}>{t(`${K}.save`)}</button>
        </div>
      </div>
    </div>
  );
};

export default MergeReviewDialog;
