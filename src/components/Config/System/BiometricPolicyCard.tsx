// src/components/Config/System/BiometricPolicyCard.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 433: the lab's biometric e-signature policy, in Session Security.
// Until now nothing could turn it on, so biometric signing was never offered.
//   • On: each person is invited to enrol at sign-in (and can enrol, re-enrol
//     or remove theirs from the profile menu); at sign-out they may confirm
//     with their device instead of their password. Password always works.
//   • How often to re-verify: every sign-out, once per session, every N days,
//     or once at enrolment.
// Saved as you change it; the service checks config:session-security:manage.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { biometricService, type BiometricCadence, type BiometricPolicy } from '@/services';

const CADENCES: BiometricCadence[] = ['per_sign_off', 'per_session', 'per_days', 'never'];

export const BiometricPolicyCard: React.FC = () => {
  const { t } = useTranslation();
  const [policy, setPolicy] = useState<BiometricPolicy>(() => biometricService.getBiometricPolicy());
  const [saved, setSaved] = useState(false);

  const save = async (next: BiometricPolicy) => {
    if (!(await biometricService.saveBiometricPolicy(next))) return;
    setPolicy(biometricService.getBiometricPolicy());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="ps-session-security__card ps-session-security__card--spaced">
      <div className="ps-session-security__card-label">{t('sessionSecurity.biometric.label')}</div>
      <label className="ps-session-security__toggle">
        <input type="checkbox" checked={policy.enabled} onChange={e => void save({ ...policy, enabled: e.target.checked })} />
        {' '}{t('sessionSecurity.biometric.enabled')}
      </label>
      <p className="ps-session-security__hint">{t('sessionSecurity.biometric.hint')}</p>
      {policy.enabled && (
        <>
          <div className="ps-session-security__field-label">{t('sessionSecurity.biometric.cadenceLabel')}</div>
          <select aria-label={t('sessionSecurity.biometric.cadenceLabel')} className="ps-conf-select ps-session-security__select" value={policy.cadence}
            onChange={e => void save({ ...policy, cadence: e.target.value as BiometricCadence })}>
            {CADENCES.map(c => <option key={c} value={c}>{t(`sessionSecurity.biometric.cadence.${c}`)}</option>)}
          </select>
          {policy.cadence === 'per_days' && (
            <>
              <div className="ps-session-security__field-label">{t('sessionSecurity.biometric.daysLabel')}</div>
              <input aria-label={t('sessionSecurity.biometric.daysLabel')} className="ps-conf-input ps-session-security__days" type="number" min={1} max={365} value={policy.cadenceDays}
                onChange={e => void save({ ...policy, cadenceDays: Number(e.target.value) })} />
            </>
          )}
        </>
      )}
      {saved && <div className="ps-session-security__saved">✓ {t('sessionSecurity.saved')}</div>}
    </div>
  );
};

export default BiometricPolicyCard;
