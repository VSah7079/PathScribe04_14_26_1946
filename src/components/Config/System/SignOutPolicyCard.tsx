// src/components/Config/System/SignOutPolicyCard.tsx
// ─────────────────────────────────────────────────────────────────
// Batch 642: the sign-out authentication policy, in Session Security.
//   • The enterprise default: a password every sign-out, or once per session
//     (with its length); an optional second factor; lock the facility overrides.
//   • Each performing facility: the enterprise default, or its own override,
//     clearly labelled, with the policy that is active for its cases.
//   • Export the whole table as CSV for an audit.
// Saving needs config:session-security:manage; the service checks it and
// audits who changed what. The rules are in services/auth/signOutPolicy/.
// ─────────────────────────────────────────────────────────────────

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { facilityService, signOutPolicyService } from '@/services';
import { resolvePerformingLabFacilityId } from '@/services/facilities/IFacilityService';
import './SignOutPolicyCard.css';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { useAuth } from '@/contexts/AuthContext';
import { downloadText } from '@/utils/downloadText';
import {
  SIGN_OUT_MODES, SIGN_OUT_TIMEOUT_MINUTES, resolveSignOutPolicy, signOutPolicyCsv, signOutPolicyExportRows,
  type SignOutAuthPolicy, type SignOutMode, type SignOutPolicyConfig, type SignOutTimeoutMinutes,
} from '@/services/auth/signOutPolicy/signOutPolicy';

interface PolicyFieldsProps {
  label: string;
  policy: SignOutAuthPolicy;
  onChange: (next: SignOutAuthPolicy) => void;
}

const PolicyFields: React.FC<PolicyFieldsProps> = ({ label, policy, onChange }) => {
  const { t } = useTranslation();
  return (
    <div className="ps-signout-policy__fields">
      <select aria-label={t('signOutPolicy.card.modeLabel', { name: label })} className="ps-conf-select" value={policy.mode}
        onChange={e => onChange({ ...policy, mode: e.target.value as SignOutMode })}>
        {SIGN_OUT_MODES.map(m => <option key={m} value={m}>{t(`signOutPolicy.card.mode.${m}`)}</option>)}
      </select>
      {policy.mode === 'session' && (
        <select aria-label={t('signOutPolicy.card.timeoutLabel', { name: label })} className="ps-conf-select" value={policy.timeoutMinutes}
          onChange={e => onChange({ ...policy, timeoutMinutes: Number(e.target.value) as SignOutTimeoutMinutes })}>
          {SIGN_OUT_TIMEOUT_MINUTES.map(m => <option key={m} value={m}>{t(`signOutPolicy.card.timeout.m${m}`)}</option>)}
        </select>
      )}
      <label className="ps-signout-policy__check">
        <input type="checkbox" checked={policy.mfa} onChange={e => onChange({ ...policy, mfa: e.target.checked })} />
        {t('signOutPolicy.card.mfaLabel')}
      </label>
    </div>
  );
};

export const SignOutPolicyCard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [saved, setSaved] = useState<SignOutPolicyConfig>(() => signOutPolicyService.getConfig());
  const [draft, setDraft] = useState<SignOutPolicyConfig>(saved);
  const [facilities, setFacilities] = useState<Array<{ id: string; name: string }>>([]);
  const [message, setMessage] = useState<'saved' | 'refused' | null>(null);

  useEffect(() => {
    void facilityService.getAll().then(r => {
      if (r.ok === false) return;
      setFacilities(r.data.filter(f => resolvePerformingLabFacilityId(f) === f.id).map(f => ({ id: f.id, name: f.name })));
    });
  }, []);

  const dirty = useMemo(() => JSON.stringify(saved) !== JSON.stringify(draft), [saved, draft]);
  if (!user) return null;

  const describe = (p: SignOutAuthPolicy): string => {
    const base = p.mode === 'strict'
      ? t('signOutPolicy.card.summary.strict')
      : t('signOutPolicy.card.summary.session', { timeout: t(`signOutPolicy.card.timeout.m${p.timeoutMinutes}`) });
    return p.mfa ? t('signOutPolicy.card.summary.withMfa', { base }) : base;
  };

  const setOverride = (id: string, policy: SignOutAuthPolicy | null) => {
    const overrides = { ...draft.overrides };
    if (policy) overrides[id] = policy; else delete overrides[id];
    setDraft({ ...draft, overrides });
  };

  const save = async () => {
    const r = await signOutPolicyService.saveConfig(user, draft);
    if (r.ok === false) { setMessage('refused'); return; }
    setSaved(r.config); setDraft(r.config); setMessage('saved');
  };

  const exportCsv = () => downloadText('sign-out-authentication-policy.csv', signOutPolicyCsv(signOutPolicyExportRows(saved, facilities)), 'text/csv');

  return (
    <div className="ps-session-security__card ps-session-security__card--spaced">
      <div className="ps-session-security__card-label">{t('signOutPolicy.card.title')}</div>
      <p className="ps-session-security__hint">{t('signOutPolicy.card.hint')}</p>

      <div className="ps-session-security__field-label">{t('signOutPolicy.card.enterpriseHeading')}</div>
      <PolicyFields label={t('signOutPolicy.card.enterpriseHeading')} policy={draft.enterprise} onChange={enterprise => setDraft({ ...draft, enterprise })} />
      {draft.enterprise.mode === 'session' && <p className="ps-session-security__hint">{t('signOutPolicy.card.sessionWarning')}</p>}
      {draft.enterprise.mfa && <p className="ps-session-security__hint">{t('signOutPolicy.card.mfaHint')}</p>}

      <label className="ps-signout-policy__check">
        <input type="checkbox" checked={draft.overridesLocked} onChange={e => setDraft({ ...draft, overridesLocked: e.target.checked })} />
        {t('signOutPolicy.card.lockLabel')}
      </label>
      <p className="ps-session-security__hint">{t('signOutPolicy.card.lockHint')}</p>

      <table className="ps-signout-policy__table">
        <caption className="ps-session-security__field-label">{t('signOutPolicy.card.facilitiesHeading')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('signOutPolicy.card.column.facility')}</th>
            <th scope="col">{t('signOutPolicy.card.column.source')}</th>
            <th scope="col">{t('signOutPolicy.card.column.policy')}</th>
          </tr>
        </thead>
        <tbody>
          {facilities.length === 0 && <tr><td colSpan={3}>{t('signOutPolicy.card.noFacilities')}</td></tr>}
          {facilities.map(f => {
            const active = resolveSignOutPolicy(draft, f.id);
            const override = draft.overrides[f.id];
            return (
              <tr key={f.id}>
                <td>{f.name}</td>
                <td>
                  <label className="ps-signout-policy__check">
                    <input type="checkbox" checked={!!override} onChange={e => setOverride(f.id, e.target.checked ? { ...draft.enterprise } : null)} />
                    {t('signOutPolicy.card.overrideToggle')}
                  </label>
                  <div className="ps-signout-policy__source">
                    {active.source === 'facility' ? t('signOutPolicy.card.source.override')
                      : active.overrideIgnored ? t('signOutPolicy.card.source.overrideLocked') : t('signOutPolicy.card.source.enterprise')}
                  </div>
                </td>
                <td>
                  {override && <PolicyFields label={f.name} policy={override} onChange={p => setOverride(f.id, p)} />}
                  <div>{t('signOutPolicy.card.active', { policy: describe(active.policy) })}</div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="ps-session-security__hint">{t('signOutPolicy.card.deferredNote')}</p>

      <div className="ps-signout-policy__actions">
        <CapabilityButton capability="config:session-security:manage" className="ps-conf-btn-primary" disabled={!dirty} onClick={() => { void save(); }}>
          {t('signOutPolicy.card.save')}
        </CapabilityButton>
        <button type="button" className="ps-conf-btn-secondary" disabled={!dirty} onClick={() => { setDraft(saved); setMessage(null); }}>{t('signOutPolicy.card.discard')}</button>
        <button type="button" className="ps-conf-btn-secondary" onClick={exportCsv}>{t('signOutPolicy.card.export')}</button>
      </div>
      {message === 'refused' && <div className="ps-session-security__hint" role="alert">{t('signOutPolicy.card.notPermitted')}</div>}
      {message === 'saved' && <div className="ps-session-security__saved">✓ {t('sessionSecurity.saved')}</div>}
    </div>
  );
};

export default SignOutPolicyCard;
