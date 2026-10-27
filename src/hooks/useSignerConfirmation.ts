// src/hooks/useSignerConfirmation.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 344 (PS-60 follow-up): the state a signing screen needs to confirm
// who is signing, around services/auth/signerConfirmation.ts (exported from
// `@/services` as `signerConfirmation`), which makes every decision.
//
//   const signer = useSignerConfirmation('case-sign-out', accession);
//   <SignerConfirmationFields signer={signer} onSubmit={go} />
//   const go = () => signer.confirm().then(c => { if (c) onConfirm(c); });
//
// confirm() must be called straight from the click (no await before it):
// for an SSO session it opens the identity provider's popup, and browsers
// only allow that during the click.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { signerConfirmation, facilityService } from '@/services';
import { resolveCasePerformingLabScope } from '@/services/facilities/resolveCasePerformingLabScope';
import { signOutButtonState } from '@/services/auth/signOutPolicy/signOutPolicy';
import type { SignatureConfirmation, SignerResult, SigningAction } from '@/services/auth/signerConfirmation';
import { useAuth } from '@/contexts/AuthContext';
import { formatDateTime } from '@/utils/formatDate';

/**
 * Batch 642: `orderingFacilityId` is the case's ordering facility; the sign-out
 * policy of its performing facility decides whether a password is asked
 * (services/auth/signOutPolicy/).
 */
export function useSignerConfirmation(action: SigningAction, caseRef?: string | null, orderingFacilityId?: string | null) {
  const { t, i18n } = useTranslation();
  const { user, updateUserProfile } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  // Batch 611 (#157): the fresh second-factor code a signature asks for when the policy says so.
  const [mfaCode, setMfaCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // Batch 642: the performing facility (its policy applies) and where the person stands for a sign-out.
  const [facility, setFacility] = useState<{ id: string | null; name: string | null }>({ id: null, name: null });
  const [stateTick, setStateTick] = useState(0);
  useEffect(() => {
    let cancelled = false;
    void resolveCasePerformingLabScope(orderingFacilityId).then(async scope => {
      const id = scope.performingLabFacilityId ?? orderingFacilityId ?? null;
      const found = id ? await facilityService.getById(id).catch(() => null) : null;
      if (!cancelled) setFacility({ id, name: found && found.ok ? found.data.name : null });
    });
    return () => { cancelled = true; };
  }, [orderingFacilityId]);
  const signOutState = signerConfirmation.signOutState(action, facility.id);
  const signOutButton = signOutState ? signOutButtonState(signOutState) : null;
  void stateTick;

  const method = signerConfirmation.method();
  const needsUsername = method === 'password' && signerConfirmation.needsUsername();
  const mfaCodeNeeded = signerConfirmation.mfaCodeNeeded(action, facility.id);
  const sessionValid = signOutState?.kind === 'valid';

  const reset = useCallback(() => {
    setUsername(''); setPassword(''); setMfaCode(''); setError(''); setBusy(false); setStateTick(n => n + 1);
  }, []);

  const handle = useCallback((r: SignerResult): SignatureConfirmation | null => {
    setBusy(false);
    setStateTick(n => n + 1);
    if (r.ok === true) {
      setPassword(''); setMfaCode(''); setError('');
      if (r.mfa) updateUserProfile({ mfa: r.mfa });
      return r.confirmation;
    }
    const message = r.reason === 'locked' && r.lockedUntil
      ? t('signerConfirmation.error.locked', { time: formatDateTime(r.lockedUntil, i18n.language) })
      : t(`signerConfirmation.error.${r.reason}`);
    setError(r.attemptsLeft !== undefined && r.attemptsLeft > 0
      ? t('signerConfirmation.messageWithAttempts', { message, attempts: t('signerConfirmation.attemptsLeft', { count: r.attemptsLeft }) })
      : message);
    if (r.reason === 'wrong_credentials') setPassword('');
    if (r.reason === 'mfa_invalid') setMfaCode('');
    return null;
  }, [t, i18n.language, updateUserProfile]);

  /** Resolves with the confirmation, or null (the reason is in `error`). */
  const confirm = useCallback((): Promise<SignatureConfirmation | null> => {
    setError('');
    // Batch 642: inside a valid sign-out session nothing is asked.
    const within = signerConfirmation.confirmWithinSession({ action, caseRef, facilityId: facility.id, facilityName: facility.name });
    if (within) { setStateTick(n => n + 1); return Promise.resolve(within); }
    const pending = method === 'sso'
      ? signerConfirmation.withSso({ action, caseRef, facilityId: facility.id, facilityName: facility.name })
      : method === 'password'
        ? signerConfirmation.withPassword({ username, password, action, caseRef, mfaCode, facilityId: facility.id, facilityName: facility.name })
        : Promise.resolve<SignerResult>({ ok: false, reason: 'unavailable' });
    setBusy(true);
    return pending.then(handle);
  }, [method, action, caseRef, username, password, mfaCode, handle, facility]);

  /** The simulated biometric (demo builds only). */
  const confirmBiometric = useCallback((): Promise<SignatureConfirmation | null> => {
    setError('');
    setBusy(true);
    return signerConfirmation.withBiometric({ action, caseRef, mfaCode, facilityId: facility.id, facilityName: facility.name }).then(handle);
  }, [action, caseRef, mfaCode, handle, facility]);

  return {
    method,
    needsUsername,
    biometricAllowed: signerConfirmation.biometricAllowed(),
    signerName: user?.name ?? '',
    signerCredentials: user?.credentials ?? '',
    username, setUsername,
    password, setPassword,
    mfaCodeNeeded, mfaCode, setMfaCode,
    /** Batch 642: a sign-out session is valid, so nothing is asked. */
    sessionValid,
    /** Batch 642: "Sign Out" or "Sign Out (Password Required)", and the tooltip that explains it. */
    buttonLabel: (base: string) => (signOutButton?.passwordRequired ? t('signOutPolicy.button.passwordRequired', { label: base }) : base),
    buttonTitle: signOutButton ? t(`signOutPolicy.tooltip.${signOutButton.tooltip}`) : undefined,
    /** Batch 642: the Sign Out button's state (null for actions the sign-out policy does not govern). */
    signOutButton,
    error, busy,
    confirm, confirmBiometric, reset,
  };
}

export type SignerConfirmationState = ReturnType<typeof useSignerConfirmation>;
