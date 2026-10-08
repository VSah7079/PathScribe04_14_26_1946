// src/components/Profile/BiometricSigningModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 433: enrolling for biometric e-signature (Touch ID, Windows Hello…).
//   • 'invite': shown after sign-in when the lab has turned biometric signing
//     on and you haven't enrolled (AuthContext.showBiometricWizard). "Later"
//     asks again next time, up to three times.
//   • 'manage': profile menu → Biometric signing: your enrolment, re-enrol or
//     remove it.
// Your password always works at sign-out; biometric is an alternative.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { biometricService } from '@/services';
import { useAuth } from '@/contexts/AuthContext';

interface Props { mode: 'invite' | 'manage'; onClose: () => void }

export const BiometricSigningModal: React.FC<Props> = ({ mode, onClose }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const [credential, setCredential] = useState(() => (userId ? biometricService.getCredentialForUser(userId) : null));
  const [available, setAvailable] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { void biometricService.isBiometricAvailable().then(setAvailable); }, []);

  const enrol = async () => {
    setBusy(true); setError(null);
    const res = await biometricService.enrollBiometric(userId);
    setBusy(false);
    if (!res.ok) { setError(t('profileMenu.biometric.enrolFailed')); return; }
    setCredential(biometricService.getCredentialForUser(userId));
    if (mode === 'invite') onClose();
  };
  const remove = async () => {
    const res = await biometricService.removeBiometricCredential(userId);
    if (res.ok) setCredential(null); else setError(t('profileMenu.biometric.removeFailed'));
  };
  const later = () => { biometricService.dismissBiometricWizard(userId); onClose(); };

  return (
    <div className="ps-overlay" onClick={mode === 'invite' ? undefined : onClose}>
      <div className="ps-modal-dark ps-modal-dark--profile-list" role="dialog" aria-label={t('profileMenu.biometric.title')} onClick={e => e.stopPropagation()}>
        <span className="ps-modal-dark-title">{t(mode === 'invite' ? 'profileMenu.biometric.inviteTitle' : 'profileMenu.biometric.title')}</span>
        <p className="ps-modal-dark-body">{t('profileMenu.biometric.intro', { device: biometricService.getDeviceName() })}</p>
        {credential ? (
          <p className="ps-modal-dark-body ps-biometric-status">
            {t('profileMenu.biometric.enrolledOn', { device: credential.deviceName, when: new Date(credential.enrolledAt).toLocaleDateString() })}
          </p>
        ) : available === false ? (
          <p className="ps-modal-dark-body ps-biometric-status">{t('profileMenu.biometric.notAvailable')}</p>
        ) : null}
        {error && <div className="ps-dictionary-words-error" role="alert">{error}</div>}
        <div className="ps-modal-dark-footer">
          {mode === 'invite'
            ? <button type="button" className="ps-btn-ghost-dark" onClick={later}>{t('profileMenu.biometric.later')}</button>
            : <button type="button" className="ps-btn-ghost-dark" onClick={onClose}>{t('common.close')}</button>}
          {credential && mode === 'manage' && (
            <button type="button" className="ps-btn-ghost-dark" onClick={() => void remove()}>{t('profileMenu.biometric.remove')}</button>
          )}
          {available !== false && (
            <button type="button" className="ps-btn-amber" disabled={busy} onClick={() => void enrol()}>
              {busy ? t('profileMenu.biometric.enrolling') : t(credential ? 'profileMenu.biometric.reEnrol' : 'profileMenu.biometric.enrol')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BiometricSigningModal;
