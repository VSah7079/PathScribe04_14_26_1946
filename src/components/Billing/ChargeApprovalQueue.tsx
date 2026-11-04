// src/components/Billing/ChargeApprovalQueue.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 433: Quality Assurance → Financials → Charges awaiting approval.
// Charges wait here when their performing lab requires billing approval
// (Configuration → Facilities, "Charges need billing approval"). Approve,
// reject (with a reason), hold and release each need billing:charge:approve
// for that lab; nobody approves or rejects a charge they drafted. The rules
// are services/billing/chargeApproval.ts; this table shows and dispatches.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import ReasonPromptModal from '@/components/Common/ReasonPromptModal';
import { CHARGE_APPROVE, decideCharge, decisionsFor, isOwnDraft, type ChargeAwaitingApproval, type Decision } from '@/services/billing/chargeApproval';
import { formatDateTime } from '@/utils/formatDate';

interface Props {
  rows: ChargeAwaitingApproval[];
  currentUserId: string | null;
  onChanged: () => void;
  onOpenCase: (caseId: string) => void;
}

const DECISION_KEY: Record<Decision, string> = {
  approve: 'chargeApproval.approve',
  reject: 'chargeApproval.reject',
  hold: 'chargeApproval.hold',
  release: 'chargeApproval.release',
};

const ERROR_KEY: Record<string, string> = {
  NOT_PERMITTED: 'chargeApproval.error.notPermitted',
  OWN_DRAFT: 'chargeApproval.error.ownDraft',
  NOT_FOUND: 'chargeApproval.error.notFound',
  REASON_REQUIRED: 'chargeApproval.error.reasonRequired',
  LAB_UNKNOWN: 'chargeApproval.error.labUnknown',
};

export const ChargeApprovalQueue: React.FC<Props> = ({ rows, currentUserId, onChanged, onOpenCase }) => {
  const { t, i18n } = useTranslation();
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const decide = async (chargeId: string, decision: Decision, reason?: string) => {
    setError(null);
    const res = await decideCharge(chargeId, decision, reason);
    if (res.ok === false) setError(ERROR_KEY[res.error] ?? 'chargeApproval.error.failed');
    onChanged();
  };

  return (
    <>
      {error && <p className="ps-conf-error-text" role="alert">{t(error)}</p>}
      <div className="ps-conf-table-wrap">
        <div className="ps-conf-table-scroll">
          <table className="ps-conf-table">
            <thead className="ps-conf-thead-sticky">
              <tr>
                <th className="ps-conf-th">{t('qualityAssurance.common.case')}</th>
                <th className="ps-conf-th">{t('chargeApproval.colCharge')}</th>
                <th className="ps-conf-th">{t('chargeApproval.colType')}</th>
                <th className="ps-conf-th">{t('chargeApproval.colLab')}</th>
                <th className="ps-conf-th">{t('chargeApproval.colStatus')}</th>
                <th className="ps-conf-th">{t('chargeApproval.colDrafted')}</th>
                <th className="ps-conf-th">{t('qualityAssurance.common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ charge, facilityId, facilityName }) => {
                const ownDraft = isOwnDraft(charge, currentUserId);
                const context = { caseId: charge.caseId, facilityId: facilityId ?? undefined };
                return (
                  <tr key={charge.id} className="ps-conf-tr">
                    <td className="ps-conf-td">
                      <button className="ps-conf-btn-row" data-phi="accession" onClick={() => onOpenCase(charge.caseId)}>{charge.caseId}</button>
                    </td>
                    <td className="ps-conf-td">
                      {t('chargeApproval.chargeText', { source: charge.sourceLabel, cpt: charge.cptCode, modifier: charge.modifier ?? '—' })}
                      {charge.postSignoutChangeComment && <div className="ps-specreq-meta">{charge.postSignoutChangeComment}</div>}
                    </td>
                    <td className="ps-conf-td">{t(charge.transactionType === 'credit' ? 'chargeApproval.typeCredit' : 'chargeApproval.typeCharge')}</td>
                    <td className="ps-conf-td">{facilityName ?? t('chargeApproval.labUnknown')}</td>
                    <td className="ps-conf-td">{t(charge.approvalStatus === 'HOLD' ? 'chargeApproval.statusHold' : 'chargeApproval.statusPending')}</td>
                    <td className="ps-conf-td">
                      {charge.draftedAt ? formatDateTime(charge.draftedAt, i18n.language) : '—'}
                      {ownDraft && <div className="ps-specreq-meta">{t('chargeApproval.ownDraftHint')}</div>}
                    </td>
                    <td className="ps-conf-td">
                      <div className="ps-qa-inline-actions">
                        {decisionsFor(charge).map(d => (
                          <CapabilityButton
                            key={d}
                            capability={CHARGE_APPROVE}
                            context={context}
                            className={d === 'approve' ? 'ps-conf-btn-primary' : 'ps-conf-btn-secondary'}
                            disabled={ownDraft && (d === 'approve' || d === 'reject')}
                            disabledTitle={t('chargeApproval.ownDraftHint')}
                            onClick={() => (d === 'reject' ? setRejecting(charge.id) : void decide(charge.id, d))}
                          >
                            {t(DECISION_KEY[d])}
                          </CapabilityButton>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td className="ps-conf-empty-row" colSpan={7}>{t('chargeApproval.empty')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <ReasonPromptModal
        show={!!rejecting}
        title={t('chargeApproval.rejectTitle')}
        message={t('chargeApproval.rejectMessage')}
        reasonLabel={t('chargeApproval.rejectReason')}
        confirmLabel={t('chargeApproval.reject')}
        onCancel={() => setRejecting(null)}
        onConfirm={reason => { const id = rejecting!; setRejecting(null); void decide(id, 'reject', reason); }}
      />
    </>
  );
};

export default ChargeApprovalQueue;
