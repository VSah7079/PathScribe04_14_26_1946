// src/components/Auth/PasswordResetRequest.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 711: the sign-in page's "Ask my administrator to reset my password".
// Password sign-in only (the demo build); LoginPage shows it only when password
// sign-in is on. Renders and dispatches: passwordResetRequestService decides
// (the rate limit, who is told, the audit entry), and answers the same way
// whether or not the email matches an account, so the confirmation here never
// says which. Nobody is signed in yet, so no capability is checked
// (services/staffPasswords/passwordResetRequestService.ts explains why).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './PasswordResetRequest.css';
import { passwordResetRequestService } from '@/services/signIn';
import { RESET_REQUEST_WINDOW_MS } from '@/services/staffPasswords/passwordResetRequestRules';

interface Props {
  /** The email already typed on the sign-in form. */
  initialEmail: string;
  onBack: () => void;
}

const PasswordResetRequest: React.FC<Props> = ({ initialEmail, onBack }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<'accepted' | 'invalidEmail' | 'unavailable' | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const r = await passwordResetRequestService.request(email);
    setResult(r.ok ? r.data : 'unavailable');
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="ps-login-reset" data-testid="password-reset-request">
      <p className="ps-login-change-intro">{t('login.resetRequest.intro')}</p>
      <div className="ps-login-field">
        <label className="ps-login-field-label" htmlFor="login-reset-email">{t('login.resetRequest.emailLabel')}</label>
        <input id="login-reset-email" type="email" value={email} onChange={e => { setEmail(e.target.value); setResult(null); }}
          autoComplete="email" autoFocus className="ps-login-input" />
      </div>
      {result === 'accepted' && (
        <div className="ps-login-reset-confirm" role="status">{t('login.resetRequest.confirmation', { minutes: RESET_REQUEST_WINDOW_MS / 60000 })}</div>
      )}
      {result === 'invalidEmail' && <div className="ps-login-error" role="alert">{t('login.resetRequest.invalidEmail')}</div>}
      {result === 'unavailable' && <div className="ps-login-error" role="alert">{t('login.resetRequest.unavailable')}</div>}
      <button type="submit" disabled={busy} className="ps-login-submit">
        {busy ? t('login.resetRequest.sending') : t('login.resetRequest.action')}
      </button>
      <button type="button" className="ps-login-reset-back" onClick={onBack}>{t('login.resetRequest.back')}</button>
    </form>
  );
};

export default PasswordResetRequest;
