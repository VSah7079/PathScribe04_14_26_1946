// src/pages/SynopticReportPage/modals/InkingGateModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 484 (Structured Inking Sign-Out & Grossing Gate Logic Engine;
// PS-519 follow-up). Gate B's blocking/override modal — shown only for
// BLOCK, OVERRIDE_REQUIRED or PALETTE_UNAVAILABLE (checkInkingSignOutGate.ts
// returns null for anything else, so this never renders for a clean or
// Severity-2-only case). Mirrors StainQcGateModal.tsx's own real,
// established shape (a hard block with real resolution paths).
//
// The jurisdiction-specific regulatory blocking message (Pete's own spec)
// is rendered from signOutInkingGate.blockingMessage.<profile>, with the
// real regulatory citation interpolated — see
// jurisdictionInkingGateMessages.ts's own header for why the citation
// itself is data, not translated prose.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../../pathscribe.css';
import { recordInkingGateOverride } from '@/services/grossing/recordInkingGateOverride';
import { INKING_GATE_OVERRIDE_REASON_CODES, type InkingGateResult, type InkingGateOverrideReasonCode } from '@/services/grossing/evaluateInkingGate';
import { INKING_GATE_REGULATORY_CITATION, inkingGateBlockingMessageKey } from '@/services/grossing/jurisdictionInkingGateMessages';
import { authorizationService, auditService } from '@/services';

interface Props {
  result: InkingGateResult;
  signingUserId: string;
  signingUserName: string;
  signingUserRole: string;
  onCancel: () => void;
  onOverrideRecorded: () => void;
}

export const InkingGateModal: React.FC<Props> = ({ result, signingUserId, signingUserName, signingUserRole, onCancel, onOverrideRecorded }) => {
  const { t } = useTranslation();
  const [reasonCode, setReasonCode] = useState<InkingGateOverrideReasonCode>('FOREIGN_OBJECT_PRE_INKED');
  const [reasonText, setReasonText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notPermitted, setNotPermitted] = useState(false);

  const handleOverride = async () => {
    setSubmitting(true);
    setNotPermitted(false);
    const specimenId = result.issues.find(i => i.severity === 3)?.specimenId ?? '';
    const res = await recordInkingGateOverride(
      {
        caseId: result.caseId, specimenId, facilityId: result.facilityId,
        jurisdictionCode: result.jurisdictionCode, inkingValidationMode: result.inkingValidationMode,
        unresolvedIssues: result.issues, overrideReasonCode: reasonCode,
        overrideReasonText: reasonCode === 'OTHER' ? reasonText.trim() || undefined : undefined,
        overrideByUserId: signingUserId, overrideByUserName: signingUserName, overrideRole: signingUserRole,
      },
      { authorization: authorizationService, audit: auditService },
    );
    setSubmitting(false);
    if (!res.ok) { setNotPermitted(true); return; }
    onOverrideRecorded();
  };

  const citation = INKING_GATE_REGULATORY_CITATION[result.jurisdictionCode];

  return (
    <div className="ps-overlay" onClick={onCancel}>
      <div className="ps-modal-dark" role="alertdialog" aria-labelledby="inking-gate-signout-title" onClick={e => e.stopPropagation()}>
        <div className="ps-batch-modal-header">
          <div id="inking-gate-signout-title" className="ps-batch-modal-title">
            {t(result.mode === 'PALETTE_UNAVAILABLE' ? 'inkingGate.paletteUnavailable.body' : 'inkingGate.signOutBlock.title')}
          </div>
        </div>
        <div className="ps-batch-modal-body">
          {result.mode === 'PALETTE_UNAVAILABLE' ? (
            <p>{t('inkingGate.paletteUnavailable.body')}</p>
          ) : (
            <>
              <p>{t(inkingGateBlockingMessageKey(result.jurisdictionCode), { citation })}</p>
              <ul className="ps-inking-gate-issue-list">
                {result.issues.filter(i => i.severity === 3).map((issue, idx) => (
                  <li key={idx}>{t('inkingGate.issueLine', { specimen: issue.specimenDisplayName ?? issue.specimenId, code: t(`inkingGate.issueCode.${issue.code}`) })}</li>
                ))}
              </ul>
            </>
          )}

          {result.mode === 'OVERRIDE_REQUIRED' && (
            <div className="ps-inking-gate-override-form">
              <div className="ps-batch-modal-header">{t('inkingGate.overrideModal.title')}</div>
              <label htmlFor="inking-override-reason">{t('inkingGate.overrideModal.reasonLabel')}</label>
              <select id="inking-override-reason" value={reasonCode} onChange={e => setReasonCode(e.target.value as InkingGateOverrideReasonCode)}>
                {INKING_GATE_OVERRIDE_REASON_CODES.map(code => (
                  <option key={code} value={code}>{t(`inkingGate.overrideModal.reasons.${code}`)}</option>
                ))}
              </select>
              {reasonCode === 'OTHER' && (
                <>
                  <label htmlFor="inking-override-reason-text">{t('inkingGate.overrideModal.reasonTextLabel')}</label>
                  <textarea
                    id="inking-override-reason-text"
                    value={reasonText}
                    onChange={e => setReasonText(e.target.value)}
                    placeholder={t('inkingGate.overrideModal.reasonTextPlaceholder')}
                  />
                </>
              )}
              {notPermitted && <p role="alert">{t('inkingGate.overrideModal.notPermitted')}</p>}
            </div>
          )}
        </div>
        <div className="ps-batch-modal-footer">
          <button className="ps-btn-secondary" onClick={onCancel}>{t('common.cancel')}</button>
          {result.mode === 'OVERRIDE_REQUIRED' && (
            <button className="ps-btn-primary" disabled={submitting} onClick={() => { void handleOverride(); }}>
              {t('inkingGate.overrideModal.confirm')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
