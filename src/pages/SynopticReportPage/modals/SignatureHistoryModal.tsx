// src/pages/SynopticReportPage/modals/SignatureHistoryModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 483 (PS-359 tracker follow-up — "signature-record viewing screen"):
// services/signatures/ has recorded one SignatureRecord per signature applied
// to a case since Batch 345 (signatureGate.commit(), services/auth/
// signatureEvidence.ts) — case sign-out, countersignature, synoptic/report
// finalisation, autopsy PAD/FAD, cytology sign-out, registry go-live — but
// no screen ever read them back. Read-only, same "real history, nothing to
// edit" framing and modal shell as DeficiencyHistoryModal/VersionHistoryModal.
//
// Signer/attending names are staff names, not patient PHI (CLAUDE.md), so
// nothing here is tagged data-phi. SSO evidence shows only the issuer and
// subject already carried on SignatureEvidence — never the ID token itself
// (signatureEvidence.ts never stores it either).
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useTranslation } from 'react-i18next';
import '../../../pathscribe.css';
import type { SignatureRecord } from '@/services/signatures/ISignatureRecordService';
import { formatDateTime } from '@/utils/formatDate';

interface Props {
  records: SignatureRecord[];
  onClose: () => void;
}

const ACTION_LABEL_KEY: Record<string, string> = {
  'case-sign-out': 'signatureHistoryModal.action.caseSignOut',
  'countersign': 'signatureHistoryModal.action.countersign',
  'synoptic-finalize': 'signatureHistoryModal.action.synopticFinalize',
  'report-finalize': 'signatureHistoryModal.action.reportFinalize',
  'autopsy-pad': 'signatureHistoryModal.action.autopsyPad',
  'autopsy-fad': 'signatureHistoryModal.action.autopsyFad',
  'cytology-sign-out': 'signatureHistoryModal.action.cytologySignOut',
  'registry-go-live': 'signatureHistoryModal.action.registryGoLive',
  'cytology-preliminary': 'signatureHistoryModal.action.cytologyPreliminary',
};

const LINK_LABEL_KEY: Record<string, string> = {
  'report-version': 'signatureHistoryModal.link.reportVersion',
  'autopsy-snapshot': 'signatureHistoryModal.link.autopsySnapshot',
  'cytology-sign-out': 'signatureHistoryModal.link.cytologySignOut',
  'cytology-preliminary': 'signatureHistoryModal.link.cytologyPreliminary',
};

export const SignatureHistoryModal: React.FC<Props> = ({ records, onClose }) => {
  const { t, i18n } = useTranslation();
  const sorted = [...records].sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt));

  return (
    <div className="ps-ms-overlay">
      <div className="ps-ms-modal ps-ms-modal--wide">
        <div className="ps-ms-header">🖊 {t('signatureHistoryModal.header')}</div>
        <div className="ps-ms-body">
          <p className="ps-fixgate-intro">{t('signatureHistoryModal.intro', { count: records.length })}</p>

          {sorted.length === 0 && (
            <div className="ps-cmnt-thread-empty">{t('signatureHistoryModal.emptyState')}</div>
          )}

          {sorted.map(r => (
            <div key={r.id} className="ps-verhist-item">
              <div className="ps-verhist-header">
                <strong className="ps-verhist-version-label">
                  {ACTION_LABEL_KEY[r.evidence.action] ? t(ACTION_LABEL_KEY[r.evidence.action]) : r.evidence.action}
                  {r.link?.tier ? ` (${r.link.tier})` : ''}
                </strong>
                <span className={`ps-verhist-trigger ps-sighist-outcome--${r.outcome}`}>
                  {t(`signatureHistoryModal.outcome.${r.outcome}`)}
                </span>
              </div>
              <div className="ps-verhist-row">
                <span className="ps-verhist-label">{t('signatureHistoryModal.signedByLabel')}</span> {r.evidence.signerName} · {formatDateTime(r.recordedAt, i18n.language)}
              </div>
              <div className="ps-verhist-row">
                <span className="ps-verhist-label">{t('signatureHistoryModal.confirmedByLabel')}</span> {t(`signatureHistoryModal.method.${r.evidence.method}`)}
              </div>
              {r.evidence.sso && (
                <div className="ps-verhist-row">
                  <span className="ps-verhist-label">{t('signatureHistoryModal.ssoProviderLabel')}</span> {r.evidence.sso.issuer}
                </div>
              )}
              <div className="ps-verhist-row">
                <span className="ps-verhist-label">{t('signatureHistoryModal.verifiedByLabel')}</span> {t(`signatureHistoryModal.verifiedBy.${r.evidence.verifiedBy}`)}
              </div>
              {r.link && LINK_LABEL_KEY[r.link.kind] && (
                <div className="ps-verhist-row">
                  <span className="ps-verhist-label">{t('signatureHistoryModal.recordedForLabel')}</span> {t(LINK_LABEL_KEY[r.link.kind])}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="ps-ms-footer">
          <button className="ps-ms-btn-cancel" onClick={onClose}>{t('common.close')}</button>
        </div>
      </div>
    </div>
  );
};
