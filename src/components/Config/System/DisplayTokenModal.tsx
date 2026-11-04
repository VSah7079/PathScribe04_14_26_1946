// src/components/Config/System/DisplayTokenModal.tsx
// ─────────────────────────────────────────────────
// Batch 603: where an administrator issues and revokes the Display Token for
// one wall display (a Facility Ops display profile or an OR Suite terminal).
// The token is shown once, when issued; only its hash is kept. Issuing again
// replaces the old token (the old one stops working at once). Revoking blanks
// the display within a minute. Both need the display's own Configuration
// capability (checked in the service).
// ─────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { displayAccessService } from '@/services';
import { DEFAULT_DISPLAY_TOKEN_DAYS, DISPLAY_TOKEN_VALIDITY_DAYS, type DisplayKind } from '@/services/displayAccess/displayToken';
import type { DisplayBindingSummary } from '@/services/displayAccess/IDisplayAccessService';

const DisplayTokenModal: React.FC<{ kind: DisplayKind; subjectId: string; displayName: string; onClose: () => void }> = ({ kind, subjectId, displayName, onClose }) => {
  const { t, i18n } = useTranslation();
  const [summary, setSummary] = useState<DisplayBindingSummary | null>(null);
  const [days, setDays] = useState<number>(DEFAULT_DISPLAY_TOKEN_DAYS);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => { displayAccessService.getSummary(kind, subjectId).then(setSummary); };
  useEffect(load, [kind, subjectId]);

  const issue = async () => {
    setError(null);
    const res = kind === 'facility-ops'
      ? await displayAccessService.issueFacilityOpsToken(subjectId, days)
      : await displayAccessService.issueOrSuiteToken(subjectId, days);
    if (res.ok) { setNewToken(res.data.token); setSummary(res.data.binding); } else setError(res.error);
  };

  const revoke = async () => {
    setError(null);
    const res = kind === 'facility-ops'
      ? await displayAccessService.revokeFacilityOpsToken(subjectId)
      : await displayAccessService.revokeOrSuiteToken(subjectId);
    if (res.ok) { setNewToken(null); setSummary(res.data); } else setError(res.error);
  };

  const date = (iso: string) => new Date(iso).toLocaleDateString(i18n.language);
  const stateText = !summary ? t('displayAccess.admin.none')
    : summary.state === 'valid' ? t('displayAccess.admin.validUntil', { date: date(summary.expiresAt), hint: summary.tokenHint })
    : summary.state === 'expired' ? t('displayAccess.admin.expiredOn', { date: date(summary.expiresAt) })
    : t('displayAccess.admin.revokedOn', { date: date(summary.revokedAt ?? summary.issuedAt) });

  return (
    <div data-capture-hide="true" className="ps-conf-backdrop" onClick={onClose}>
      <div className="ps-conf-modal ps-conf-modal--narrow" role="dialog" aria-label={t('displayAccess.admin.title')} onClick={e => e.stopPropagation()}>
        <div className="ps-conf-modal-header">{t('displayAccess.admin.title')} — {displayName}</div>
        <div className="ps-conf-modal-body">
          <p className="ps-conf-section-subtitle">{t('displayAccess.admin.explain')}</p>
          <p className="ps-conf-value" data-testid="display-token-state">{stateText}</p>

          <label className="ps-label" htmlFor="disptok-days">{t('displayAccess.admin.validFor')}</label>
          <select id="disptok-days" className="ps-conf-select" value={days} onChange={e => setDays(Number(e.target.value))}>
            {DISPLAY_TOKEN_VALIDITY_DAYS.map(d => <option key={d} value={d}>{t('displayAccess.admin.days', { count: d })}</option>)}
          </select>

          {newToken && (
            <>
              <label className="ps-label" htmlFor="disptok-new">{t('displayAccess.admin.newToken')}</label>
              <input id="disptok-new" className="ps-conf-input" readOnly value={newToken} onFocus={e => e.currentTarget.select()} data-testid="display-token-new" />
              <p className="ps-conf-section-subtitle">{t('displayAccess.admin.shownOnce')}</p>
            </>
          )}
          {error && <p role="alert" className="ps-conf-section-subtitle">{error === 'CONFIG_NOT_PERMITTED' ? t('displayAccess.admin.notPermitted') : error}</p>}
        </div>
        <div className="ps-conf-modal-footer">
          <button className="ps-conf-btn-secondary" onClick={onClose}>{t('common.close')}</button>
          <button className="ps-conf-btn-secondary" onClick={revoke} disabled={!summary || summary.state === 'revoked'}>{t('displayAccess.admin.revoke')}</button>
          <button className="ps-conf-btn-primary" onClick={issue}>{summary ? t('displayAccess.admin.reissue') : t('displayAccess.admin.issue')}</button>
        </div>
      </div>
    </div>
  );
};

export default DisplayTokenModal;
