// src/pages/SynopticReportPage/modals/ReportPrintPromptModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// PS-282 (Batch 437): asked before a report prints when there is something to
// say first. The plan comes from services/printing (planReportPrint):
//   • a reprint, when the lab requires a reason (Configuration → Print
//     Settings): the reason is required and goes in the audit entry;
//   • a Pending Release report with hard copies restricted: the copy carries
//     the "PENDING FINAL RELEASE" watermark (replaces an English
//     window.confirm).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { printPromptComplete, type PrintPlan } from '@/services';
import '@/pathscribe.css';

interface Props {
  plan: PrintPlan;
  onPrint: (reason: string) => void;
  onCancel: () => void;
}

const ReportPrintPromptModal: React.FC<Props> = ({ plan, onPrint, onCancel }) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const complete = printPromptComplete(plan, reason);
  return (
    <div className="ps-overlay ps-overlay--confirm ps-overlay--above-dialogs" role="dialog" aria-modal="true">
      <div className="ps-modal-dark ps-modal-sm">
        <span className="ps-modal-dark-title ps-modal-dark-title--confirm">
          {plan.action === 'reprint' ? t('reportPrintPrompt.reprintTitle') : t('reportPrintPrompt.printTitle')}
        </span>
        {plan.warnPendingRelease && (
          <p className="ps-modal-dark-body ps-modal-dark-body--confirm">
            {plan.askOverrideReason ? t('reportPrintPrompt.supervisorOverrideWarning') : t('reportPrintPrompt.pendingReleaseWarning')}
          </p>
        )}
        {(plan.askReason || plan.askOverrideReason) && (
          <div className="ps-report-print-prompt__reason">
            <label className="ps-conf-label" htmlFor="report-reprint-reason">
              {plan.askOverrideReason ? t('reportPrintPrompt.overrideReasonLabel') : t('reportPrintPrompt.reasonLabel')} <span className="ps-conf-required">*</span>
            </label>
            <textarea
              id="report-reprint-reason"
              className="ps-conf-input ps-report-print-prompt__textarea"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={t('reportPrintPrompt.reasonPlaceholder')}
              autoFocus
            />
            <span className="ps-conf-field-hint">{plan.askOverrideReason ? t('reportPrintPrompt.overrideReasonHint') : t('reportPrintPrompt.reasonHint')}</span>
          </div>
        )}
        <div className="ps-modal-dark-footer">
          <button type="button" className="ps-btn-ghost-dark" onClick={onCancel}>{t('common.cancel')}</button>
          <button type="button" className="ps-btn-amber" disabled={!complete} onClick={() => onPrint(reason.trim())}>
            {plan.action === 'reprint' ? t('reportPrintPrompt.reprintButton') : t('reportPrintPrompt.printButton')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportPrintPromptModal;
