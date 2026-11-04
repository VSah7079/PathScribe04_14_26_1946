// src/components/Config/System/MfaPolicyCard.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 611 (#157): the organisation's second-factor policy, in Session
// Security, and the people enrolled in the Simulated authenticator.
//   • Who is asked: no one, the roles that sign reports, or everyone.
//   • How often a signature asks for a fresh code, and how long a sign-in's
//     second factor lasts before the session ends.
//   • A lost device: an administrator resets someone's enrolment (this
//     organisation only); they enrol again at next sign-in.
// Saving needs config:session-security:manage; resetting needs
// auth:mfa-enrolment:reset. The service checks both and audits.
// With single sign-on the provider asks for the second factor and PathScribe
// checks the provider reported it; the policy applies the same way.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { mfaService, userService } from '@/services';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { useAuth } from '@/contexts/AuthContext';
import { formatDateTime } from '@/utils/formatDate';
import type { MfaMode, MfaPolicy } from '@/services/auth/mfa/mfaPolicy';
import type { MfaEnrolmentSummary } from '@/services/auth/mfa/mfaService';

const MODES: MfaMode[] = ['off', 'signing_roles', 'all'];

export const MfaPolicyCard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [policy, setPolicy] = useState<MfaPolicy | null>(() => (user ? mfaService.policyOf(user) : null));
  const [saved, setSaved] = useState(false);
  const [refused, setRefused] = useState(false);
  const [rows, setRows] = useState<Array<MfaEnrolmentSummary & { name: string }>>([]);

  const loadRows = useCallback(async () => {
    if (!user) return;
    const list = await mfaService.listEnrolments(user);
    if (!list) { setRows([]); return; }
    const staff = await userService.getAll();
    const names = new Map((staff.ok ? staff.data : []).map(s => [s.id, [s.firstName, s.lastName].filter(Boolean).join(' ')]));
    setRows(list.map(r => ({ ...r, name: names.get(r.userId) || r.userId })));
  }, [user]);

  useEffect(() => { void loadRows(); }, [loadRows]);

  // Batch 675 (access-14): with an API server the policy is the server's; read it when the card opens.
  useEffect(() => {
    if (!user) return;
    let live = true;
    void mfaService.loadPolicy(user).then(ok => { if (live && ok) setPolicy(mfaService.policyOf(user)); });
    return () => { live = false; };
  }, [user]);

  if (!user || !policy) return null;

  const save = async (next: Partial<MfaPolicy>) => {
    const r = await mfaService.savePolicy(user, next);
    if (r.ok === false) { setRefused(true); return; }
    setRefused(false);
    setPolicy(r.policy);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const reset = async (userId: string) => {
    await mfaService.resetEnrolment(user, userId);
    await loadRows();
  };

  return (
    <div className="ps-session-security__card ps-session-security__card--spaced">
      <div className="ps-session-security__card-label">{t('sessionSecurity.mfa.label')}</div>
      <p className="ps-session-security__hint">{t('sessionSecurity.mfa.hint')}</p>

      <div className="ps-session-security__field-label">{t('sessionSecurity.mfa.modeLabel')}</div>
      <select aria-label={t('sessionSecurity.mfa.modeLabel')} className="ps-conf-select ps-session-security__select" value={policy.mode}
        onChange={e => void save({ mode: e.target.value as MfaMode })}>
        {MODES.map(m => <option key={m} value={m}>{t(`sessionSecurity.mfa.mode.${m}`)}</option>)}
      </select>

      {policy.mode !== 'off' && (
        <>
          <div className="ps-session-security__field-label">{t('sessionSecurity.mfa.stepUpLabel')}</div>
          <input aria-label={t('sessionSecurity.mfa.stepUpLabel')} className="ps-conf-input ps-session-security__days" type="number" min={1} max={720} value={policy.stepUpMinutes}
            onChange={e => void save({ stepUpMinutes: Number(e.target.value) })} />
          <div className="ps-session-security__field-label">{t('sessionSecurity.mfa.sessionLabel')}</div>
          <input aria-label={t('sessionSecurity.mfa.sessionLabel')} className="ps-conf-input ps-session-security__days" type="number" min={1} max={72} value={policy.sessionMaxHours}
            onChange={e => void save({ sessionMaxHours: Number(e.target.value) })} />
          <p className="ps-mfa-policy-hint">{t('sessionSecurity.mfa.ssoNote')}</p>
        </>
      )}

      {rows.length > 0 && (
        <table className="ps-mfa-enrolments">
          <caption className="ps-session-security__field-label">{t('sessionSecurity.mfa.enrolmentsLabel')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('sessionSecurity.mfa.column.person')}</th>
              <th scope="col">{t('sessionSecurity.mfa.column.enrolled')}</th>
              <th scope="col">{t('sessionSecurity.mfa.column.recoveryLeft')}</th>
              <th scope="col"><span className="ps-sr-only">{t('sessionSecurity.mfa.column.action')}</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.userId}>
                <td>{r.name}</td>
                <td>{formatDateTime(r.enrolledAt, i18n.language)}</td>
                <td>{r.recoveryCodesLeft}</td>
                <td>
                  <CapabilityButton capability="auth:mfa-enrolment:reset" className="ps-conf-btn-secondary" onClick={() => { void reset(r.userId); }}>
                    {t('sessionSecurity.mfa.reset')}
                  </CapabilityButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {refused && <div className="ps-session-security__hint" role="alert">{t('sessionSecurity.mfa.notPermitted')}</div>}
      {saved && <div className="ps-session-security__saved">✓ {t('sessionSecurity.saved')}</div>}
    </div>
  );
};

export default MfaPolicyCard;
