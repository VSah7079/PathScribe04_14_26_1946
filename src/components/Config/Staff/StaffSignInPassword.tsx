// src/components/Config/Staff/StaffSignInPassword.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 448: Staff → edit → Sign-in password. Set or remove the person's
// password, with "must change at next sign-in" (Pete: "In most cases I've
// simply defined the password in the Staff configurations"). Like Unlink
// beside it, it takes effect at once (not part of the form's Save).
// Renders and dispatches: the service checks config:staff-password:manage,
// the policy, hashes the password and audits it (services/staffPasswords/).
// On a single-sign-on-only build there is no PathScribe password, and the
// panel says so.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  staffPasswordService, staffPasswordState, passwordConfirmProblem, PASSWORD_MIN_LENGTH, type StaffPasswordStatus,
} from '@/services';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import ConfirmModal from '@/components/Common/ConfirmModal';
import { formatDateTime } from '@/utils/formatDate';

const K = 'staffTab.signInPassword';

export const StaffSignInPassword: React.FC<{ staffId: string }> = ({ staffId }) => {
  const { t, i18n } = useTranslation();
  const [status, setStatus] = useState<StaffPasswordStatus | null>(null);
  const [setting, setSetting] = useState(false);
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [mustChange, setMustChange] = useState(true);
  const [removing, setRemoving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const load = useCallback(() => { void staffPasswordService.status(staffId).then(r => { if (r.ok) setStatus(r.data); }); }, [staffId]);
  useEffect(() => { load(); }, [load]);

  if (!status) return null;
  if (!status.passwordSignIn) {
    return (
      <div className="ps-conf-form-field ps-st-linked">
        <label className="ps-conf-label">{t(`${K}.title`)}</label>
        <p className="ps-st-cred-desc">{t(`${K}.ssoOnly`)}</p>
      </div>
    );
  }

  const state = staffPasswordState(status);

  const save = async () => {
    if (passwordConfirmProblem(next, confirm)) { setMessage({ kind: 'error', text: t(`${K}.errors.mismatch`) }); return; }
    const r = await staffPasswordService.set(staffId, next, { mustChange });
    if (r.ok === false) { setMessage({ kind: 'error', text: t(`${K}.errors.${r.error}`, { defaultValue: t(`${K}.errors.generic`), min: PASSWORD_MIN_LENGTH }) }); return; }
    setStatus(r.data); setSetting(false); setNext(''); setConfirm('');
    setMessage({ kind: 'ok', text: t(`${K}.saved`) });
  };

  const remove = async () => {
    setRemoving(false);
    const r = await staffPasswordService.clear(staffId);
    if (r.ok === false) { setMessage({ kind: 'error', text: t(`${K}.errors.${r.error}`, { defaultValue: t(`${K}.errors.generic`) }) }); return; }
    setStatus(r.data);
    setMessage({ kind: 'ok', text: t(`${K}.removed`) });
  };

  return (
    <div className="ps-conf-form-field ps-st-linked">
      <label className="ps-conf-label">{t(`${K}.title`)}</label>
      <p className="ps-st-cred-desc">{t(`${K}.state.${state}`, { date: status.setAt ? formatDateTime(status.setAt, i18n.language) : '' })}</p>

      {!setting && (
        <div className="ps-st-password-actions">
          <CapabilityButton capability="config:staff-password:manage" className="ps-conf-btn-secondary" onClick={() => { setSetting(true); setMessage(null); }}>
            {status.hasOwn ? t(`${K}.reset`) : t(`${K}.set`)}
          </CapabilityButton>
          {status.hasOwn && (
            <CapabilityButton capability="config:staff-password:manage" className="ps-conf-btn-secondary" onClick={() => setRemoving(true)}>
              {t(`${K}.remove`)}
            </CapabilityButton>
          )}
        </div>
      )}

      {setting && (
        <div className="ps-st-password-form">
          <label className="ps-conf-label" htmlFor={`pw-new-${staffId}`}>{t(`${K}.newPassword`)}</label>
          <input id={`pw-new-${staffId}`} type="password" className="ps-conf-input" autoComplete="new-password" value={next} onChange={e => setNext(e.target.value)} />
          <label className="ps-conf-label" htmlFor={`pw-confirm-${staffId}`}>{t(`${K}.confirmPassword`)}</label>
          <input id={`pw-confirm-${staffId}`} type="password" className="ps-conf-input" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} />
          <p className="ps-st-cred-desc">{t(`${K}.policy`, { min: PASSWORD_MIN_LENGTH })}</p>
          <label className="ps-conf-toggle-label-row">
            <input type="checkbox" className="ps-conf-radio-input" checked={mustChange} onChange={e => setMustChange(e.target.checked)} />
            <span className="ps-conf-option-text">{t(`${K}.mustChange`)}</span>
          </label>
          <div className="ps-st-password-actions">
            <button type="button" className="ps-conf-btn-primary" onClick={() => { void save(); }}>{t(`${K}.save`)}</button>
            <button type="button" className="ps-conf-btn-secondary" onClick={() => { setSetting(false); setNext(''); setConfirm(''); }}>{t('common.cancel')}</button>
          </div>
        </div>
      )}

      {message && <p className={message.kind === 'ok' ? 'ps-st-linked-ok' : 'ps-st-error'} role="status">{message.text}</p>}
      <ConfirmModal
        show={removing}
        title={t(`${K}.removeTitle`)}
        message={t(status.builtInDefault ? `${K}.removeMessageDefault` : `${K}.removeMessage`)}
        confirmLabel={t(`${K}.remove`)}
        cancelLabel={t('common.cancel')}
        onConfirm={() => { void remove(); }}
        onCancel={() => setRemoving(false)}
      />
    </div>
  );
};

export default StaffSignInPassword;
