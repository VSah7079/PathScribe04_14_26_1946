// src/components/PatientHistory/RestrictedCasesNotice.tsx
// ───────────────────────────────────────────────────────────────────────────
// Batch 613 (Pete, Oct 18, 2026): "the patient has other cases you can't open".
//
// An inline notice (never a window to dismiss) for a pathologist working up or signing
// out a case: it says how many of the patient's other cases are out of reach, and offers
// Request access with the reason already chosen (the last one used). It shows nothing when
// there is nothing to say, and never says which cases or what they hold.
//
// For the assigned pathologist or an administrator it also lists the requests waiting
// for a decision (Approve; Decline with a reason) and the access that can be revoked
// (Revoke with a reason), so access is normally settled while the case is being worked up.
// Sign-out shows the same notice as a backstop: cancel sign-out, ask, and resume.
//
// Rules and saving live in services/patientCaseAccess.
// ───────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AccessRequest } from '@/types/access/AccessRequest';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { getPatientCaseAccess, type AccessActionError } from '@/services/patientCaseAccess/patientCaseAccessService';
import {
  DEFAULT_OTHER_CASES_REASON, OTHER_CASES_REASONS, isOtherCasesReason,
} from '@/services/patientCaseAccess/patientCaseAccessRules';
import { getUiPreference, setUiPreference } from '@/utils/uiPreferences';
import { formatDateTime } from '@/utils/formatDate';
import { usePatientCaseAccess } from './usePatientCaseAccess';

const LAST_REASON_KEY = 'otherCasesRequestReason';

interface Props { patientId: string; caseId: string }
type Deciding = { id: string; kind: 'deny' | 'revoke' } | null;

function savedReason(): string {
  const v = getUiPreference<string>(LAST_REASON_KEY, DEFAULT_OTHER_CASES_REASON);
  return isOtherCasesReason(v) ? v : DEFAULT_OTHER_CASES_REASON;
}

export const RestrictedCasesNotice: React.FC<Props> = ({ patientId, caseId }) => {
  const { t, i18n } = useTranslation();
  const { state, user, refresh } = usePatientCaseAccess(patientId, caseId);
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState<string>(savedReason);
  const [note, setNote] = useState('');
  const [deciding, setDeciding] = useState<Deciding>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [error, setError] = useState<AccessActionError | null>(null);
  const [busy, setBusy] = useState(false);

  if (!state || !user) return null;
  const nothing = state.restrictedCount === 0 && !state.pending && !state.denied && state.toDecide.length === 0 && state.grants.length === 0;
  if (nothing) return null;

  const access = getPatientCaseAccess();
  const reasonLabel = (code?: string) => (isOtherCasesReason(code) ? t(`patientCaseAccess.reason.${code}`) : t('patientCaseAccess.reason.notStated'));
  const run = async (action: () => Promise<{ ok: true } | { ok: false; code: AccessActionError }>) => {
    setBusy(true);
    const res = await action();
    setBusy(false);
    setError(res.ok ? null : res.code);
    if (res.ok) { setAsking(false); setNote(''); setDeciding(null); setDecisionReason(''); }
    refresh();
  };

  const sendRequest = () => {
    setUiPreference(LAST_REASON_KEY, reason);
    void run(() => access.requestAccess({ patientId, caseId, reasonCode: reason, note }, user));
  };
  const decide = () => {
    if (!deciding) return;
    const { id, kind } = deciding;
    void run(() => (kind === 'deny' ? access.denyAccess(id, user, decisionReason) : access.revokeAccess(id, user, decisionReason)));
  };

  const decisionRow = (r: AccessRequest, kind: 'request' | 'grant') => {
    const open = deciding?.id === r.id;
    return (
      <li key={r.id} className="ps-pca-row">
        <span className="ps-pca-row-text">
          {kind === 'request'
            ? t('patientCaseAccess.decide.line', { name: r.requestingUserName, reason: reasonLabel(r.reasonCode) })
            : t('patientCaseAccess.grants.line', { name: r.requestingUserName, date: formatDateTime(r.resolvedAt, i18n.language) })}
          {kind === 'request' && r.reasonNote && <span className="ps-pca-note" data-phi="true"> {r.reasonNote}</span>}
        </span>
        {!open && (
          <span className="ps-pca-actions">
            {kind === 'request' && (
              <CapabilityButton capability="patient:other-cases:decide-access" className="ps-conf-btn-primary" disabled={busy}
                onClick={() => void run(() => access.grantAccess(r.id, user))}>{t('patientCaseAccess.decide.approve')}</CapabilityButton>
            )}
            <CapabilityButton capability="patient:other-cases:decide-access" className="ps-conf-btn-secondary" disabled={busy}
              onClick={() => { setDeciding({ id: r.id, kind: kind === 'request' ? 'deny' : 'revoke' }); setDecisionReason(''); setError(null); }}>
              {kind === 'request' ? t('patientCaseAccess.decide.decline') : t('patientCaseAccess.grants.revoke')}
            </CapabilityButton>
          </span>
        )}
        {open && (
          <span className="ps-pca-actions">
            <input className="ps-pca-input" value={decisionReason} onChange={e => setDecisionReason(e.target.value)} autoFocus
              aria-label={t('patientCaseAccess.decision.reasonLabel')} placeholder={t('patientCaseAccess.decision.reasonPlaceholder')} />
            <button type="button" className="ps-conf-btn-primary" disabled={busy || !decisionReason.trim()} onClick={decide}>
              {kind === 'request' ? t('patientCaseAccess.decide.confirmDecline') : t('patientCaseAccess.grants.confirmRevoke')}
            </button>
            <button type="button" className="ps-conf-btn-secondary" onClick={() => setDeciding(null)}>{t('common.cancel')}</button>
          </span>
        )}
      </li>
    );
  };

  return (
    <section className="ps-pca" aria-label={t('patientCaseAccess.notice.region')}>
      {state.restrictedCount > 0 && (
        <div className="ps-pca-block">
          <span className="ps-pca-text">{t('patientCaseAccess.notice.restricted', { count: state.restrictedCount })}</span>
          {state.pending && <span className="ps-pca-status">{t('patientCaseAccess.notice.pending', { date: formatDateTime(state.pending.requestedAt, i18n.language) })}</span>}
          {!state.pending && state.denied && (
            <span className="ps-pca-status">{t('patientCaseAccess.notice.declined', { reason: state.denied.denialReason ?? '' })}</span>
          )}
          {!state.pending && !asking && (
            <CapabilityButton capability="patient:other-cases:request-access" className="ps-conf-btn-secondary" onClick={() => { setAsking(true); setError(null); }}>
              {state.denied ? t('patientCaseAccess.notice.requestAgain') : t('patientCaseAccess.notice.request')}
            </CapabilityButton>
          )}
          {!state.pending && asking && (
            <span className="ps-pca-form">
              <select className="ps-pca-select" value={reason} onChange={e => setReason(e.target.value)} aria-label={t('patientCaseAccess.notice.reasonLabel')}>
                {OTHER_CASES_REASONS.map(code => <option key={code} value={code}>{t(`patientCaseAccess.reason.${code}`)}</option>)}
              </select>
              {reason === 'other' && (
                <input className="ps-pca-input" value={note} onChange={e => setNote(e.target.value)} autoFocus
                  aria-label={t('patientCaseAccess.notice.noteLabel')} placeholder={t('patientCaseAccess.notice.notePlaceholder')} />
              )}
              <button type="button" className="ps-conf-btn-primary" disabled={busy} onClick={sendRequest}>{t('patientCaseAccess.notice.send')}</button>
              <button type="button" className="ps-conf-btn-secondary" onClick={() => setAsking(false)}>{t('common.cancel')}</button>
            </span>
          )}
        </div>
      )}
      {state.toDecide.length > 0 && (
        <div className="ps-pca-block ps-pca-block--list">
          <strong className="ps-pca-heading">{t('patientCaseAccess.decide.heading')}</strong>
          <ul className="ps-pca-list">{state.toDecide.map(r => decisionRow(r, 'request'))}</ul>
        </div>
      )}
      {state.grants.length > 0 && (
        <div className="ps-pca-block ps-pca-block--list">
          <strong className="ps-pca-heading">{t('patientCaseAccess.grants.heading')}</strong>
          <ul className="ps-pca-list">{state.grants.map(r => decisionRow(r, 'grant'))}</ul>
        </div>
      )}
      {error && <div className="ps-qa-inline-error" role="alert">{t(`patientCaseAccess.error.${error}`)}</div>}
    </section>
  );
};

export default RestrictedCasesNotice;
