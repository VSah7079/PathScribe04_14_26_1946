// src/components/Config/System/FeedbackSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 447: Configuration → System → Feedback. Whether the top bar shows the
// QA feedback button, and where QA feedback is emailed. It replaces the
// build settings VITE_QA_ENABLED / VITE_QA_EMAIL / VITE_QA_ADMIN_CC.
// "Default" follows the instance: shown on a validation instance, hidden in
// production. Saving is checked (config:feedback:manage), validated and
// audited by the service; the rules are in services/feedback/.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { feedbackSettingsService, parseEmailList, QA_BUTTON_MODES, deploymentInstance, type FeedbackSettings } from '@/services';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import '@/pathscribe.css';

const K = 'feedbackSection';

const FeedbackSection: React.FC = () => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<FeedbackSettings | null>(null);
  const [recipients, setRecipients] = useState('');
  const [cc, setCc] = useState('');
  const [message, setMessage] = useState<{ kind: 'saved' | 'error'; text: string } | null>(null);

  useEffect(() => {
    feedbackSettingsService.get().then(r => {
      if (!r.ok) return;
      setDraft(r.data);
      setRecipients(r.data.qaRecipients.join(', '));
      setCc(r.data.qaAdminCc.join(', '));
    }).catch(() => {});
  }, []);

  if (!draft) return null;

  const save = async () => {
    const res = await feedbackSettingsService.save({ ...draft, qaRecipients: parseEmailList(recipients), qaAdminCc: parseEmailList(cc) });
    if (res.ok === false) { setMessage({ kind: 'error', text: t(`${K}.problems.${res.error}`, { defaultValue: t(`${K}.problems.generic`) }) }); return; }
    setDraft(res.data);
    setMessage({ kind: 'saved', text: t(`${K}.saved`) });
    setTimeout(() => setMessage(null), 2000);
  };

  return (
    <div>
      <div className="ps-rbuf-header">
        <h2 className="ps-rbuf-title">{t(`${K}.title`)}</h2>
        <p className="ps-rbuf-subtitle">{t(`${K}.subtitle`)}</p>
      </div>
      <div className="ps-conf-card ps-conf-card--spaced">
        <div className="ps-conf-card-title">{t(`${K}.buttonTitle`)}</div>
        <p className="ps-conf-card-description--tight">{t(`${K}.instance.${deploymentInstance.role}`)}</p>
        {QA_BUTTON_MODES.map(mode => (
          <label key={mode} className="ps-conf-toggle-label-row">
            <input type="radio" name="qa-button-mode" className="ps-conf-radio-input" checked={draft.qaButton === mode}
              onChange={() => setDraft({ ...draft, qaButton: mode })} />
            <span className="ps-conf-option-text">{t(`${K}.modes.${mode}`)}</span>
          </label>
        ))}
      </div>
      <div className="ps-conf-card ps-conf-card--spaced">
        <div className="ps-conf-card-title">{t(`${K}.recipientsTitle`)}</div>
        <p className="ps-conf-card-description--tight">{t(`${K}.recipientsHint`)}</p>
        <div className="ps-conf-form-field">
          <label className="ps-conf-label" htmlFor="qa-recipients">{t(`${K}.recipients`)}</label>
          <input id="qa-recipients" className="ps-conf-input" value={recipients} onChange={e => setRecipients(e.target.value)} />
        </div>
        <div className="ps-conf-form-field">
          <label className="ps-conf-label" htmlFor="qa-admin-cc">{t(`${K}.adminCc`)}</label>
          <input id="qa-admin-cc" className="ps-conf-input" value={cc} onChange={e => setCc(e.target.value)} />
        </div>
      </div>
      <CapabilityButton capability="config:feedback:manage" className="ps-conf-btn-primary" onClick={() => { void save(); }}>{t(`${K}.save`)}</CapabilityButton>
      {message && (
        <div className={message.kind === 'saved' ? 'ps-concordance__saved' : 'ps-field-still-required'} role={message.kind === 'error' ? 'alert' : undefined}>
          {message.kind === 'saved' ? '✓ ' : ''}{message.text}
        </div>
      )}
    </div>
  );
};

export default FeedbackSection;
