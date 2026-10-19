// src/components/Auth/MfaSignInStep.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 611 (#157): the second step of a password sign-in when the
// organisation's policy asks for a second factor. Renders and dispatches; the
// rules (codes, replay, lockout, recovery codes) are in
// services/auth/mfa/mfaService.ts.
//
//   Not yet enrolled  the Simulated authenticator's secret to add to an
//                     authenticator app, then the first code; then the
//                     recovery codes, shown once.
//   Enrolled          the code from the authenticator, or a recovery code.
//
// Everything here is labelled Simulated: it is the demonstration of the
// flow. With a hospital identity provider the provider asks for the second
// factor and this step is never shown.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../pathscribe.css';
import type { MfaSignInApi } from '@/contexts/AuthContext';
import { formatDateTime } from '@/utils/formatDate';

interface Props {
  mfa: MfaSignInApi;
  /** The session started. */
  onSignedIn: () => void;
  /** Another tab is signed in as this person: ask before taking over. */
  onSessionConflict: () => void;
}

type Failure = { reason: string; lockedUntil?: string; attemptsLeft?: number };

export const MfaSignInStep: React.FC<Props> = ({ mfa, onSignedIn, onSessionConflict }) => {
  const { t, i18n } = useTranslation();
  const pending = mfa.pending;
  const [secret, setSecret] = useState<{ secret: string; account: string } | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [demoCode, setDemoCode] = useState('');

  function failureText(f: Failure): string {
    const message = f.reason === 'locked' && f.lockedUntil
      ? t('login.mfa.error.locked', { time: formatDateTime(f.lockedUntil, i18n.language) })
      : t(`login.mfa.error.${f.reason}`, { defaultValue: t('login.mfa.error.invalid') });
    return f.attemptsLeft !== undefined && f.attemptsLeft > 0
      ? t('login.mfa.errorWithAttempts', { message, attempts: t('login.mfa.attemptsLeft', { count: f.attemptsLeft }) })
      : message;
  }

  const enrolStatus = pending?.status === 'enrol';
  // Fetch the secret once, when the enrolment screen first shows.
  useEffect(() => {
    if (!enrolStatus) return;
    let cancelled = false;
    void mfa.enrolStart().then(r => {
      if (cancelled) return;
      if (r.ok) setSecret({ secret: r.secret, account: r.account });
      else setError(failureText({ reason: r.reason, lockedUntil: r.lockedUntil }));
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrolStatus]);

  const finishWith = (outcome: 'success' | 'session_conflict') => (outcome === 'success' ? onSignedIn() : onSessionConflict());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true); setError('');
    if (pending?.status === 'enrol') {
      const r = await mfa.enrolConfirm(code);
      setBusy(false);
      if (r.ok) { setRecoveryCodes(r.recoveryCodes); setCode(''); } else { setError(failureText(r)); setCode(''); }
      return;
    }
    const r = await mfa.verify(code);
    setBusy(false);
    if (r.ok) finishWith(r.outcome); else { setError(failureText(r)); setCode(''); }
  };


  if (recoveryCodes) {
    return (
      <div className="ps-mfa-step">
        <h2 className="ps-mfa-title">{t('login.mfa.recoveryTitle')}</h2>
        <span className="ps-mfa-badge">{t('login.mfa.simulated')}</span>
        <p className="ps-mfa-note">{t('login.mfa.recoveryIntro')}</p>
        <ul className="ps-mfa-codes">
          {recoveryCodes.map(c => <li key={c} className="ps-mfa-code">{c}</li>)}
        </ul>
        <button type="button" className="ps-login-submit" onClick={() => finishWith(mfa.finish())}>{t('login.mfa.recoverySaved')}</button>
      </div>
    );
  }

  if (!pending) return null;
  const enrolling = pending.status === 'enrol';
  return (
    <form className="ps-mfa-step" onSubmit={e => { void submit(e); }}>
      <h2 className="ps-mfa-title">{enrolling ? t('login.mfa.enrolTitle') : t('login.mfa.challengeTitle')}</h2>
      <span className="ps-mfa-badge">{t('login.mfa.simulated')}</span>
      <p className="ps-mfa-note">{t('login.mfa.simulatedNote')}</p>
      <p className="ps-mfa-note">{enrolling ? t('login.mfa.enrolIntro', { name: pending.name }) : t('login.mfa.challengeIntro', { name: pending.name })}</p>

      {enrolling && secret && (
        <dl className="ps-mfa-secret">
          <dt>{t('login.mfa.accountLabel')}</dt>
          <dd>{secret.account}</dd>
          <dt>{t('login.mfa.secretLabel')}</dt>
          <dd className="ps-mfa-code">{secret.secret}</dd>
        </dl>
      )}

      <div className="ps-login-field">
        <label className="ps-login-field-label" htmlFor="mfa-code">{t('login.mfa.codeLabel')}</label>
        <input
          id="mfa-code"
          type="text"
          inputMode="text"
          autoComplete="one-time-code"
          autoFocus
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder={t('login.mfa.codePlaceholder')}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'mfa-error' : undefined}
          className="ps-login-input"
        />
      </div>

      {mfa.simulated && (
        <div className="ps-mfa-demo">
          <button type="button" className="ps-mfa-link" onClick={() => { void mfa.demoCode().then(c => setDemoCode(c ?? '')); }}>
            {t('login.mfa.showDemoCode')}
          </button>
          {demoCode && <span className="ps-mfa-code" role="status">{t('login.mfa.demoCodeIs', { code: demoCode })}</span>}
        </div>
      )}

      {error && <div id="mfa-error" className="ps-login-error" role="alert">{error}</div>}

      <button type="submit" disabled={busy || !code.trim()} className="ps-login-submit">
        {busy ? t('login.mfa.checking') : enrolling ? t('login.mfa.turnOn') : t('login.mfa.verify')}
      </button>
      <button type="button" className="ps-mfa-link ps-mfa-cancel" onClick={() => mfa.cancel()}>{t('login.mfa.backToSignIn')}</button>
    </form>
  );
};

export default MfaSignInStep;
