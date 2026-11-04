// src/components/Config/System/QaTrendPolicySection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// PS-147 (Batch 442): Configuration → System → Discordance Trend Policy.
// Pete (Oct 2): every threshold is the site's to set, not a constant in code.
// The organisation's policy, and optionally a performing lab's own. Saving
// is checked (config:qa-trend-policy:manage), validated and audited by
// services/quality/mockQaTrendPolicyService.ts; decisions are in
// qaTrendRules.ts.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  facilityService, peerReviewPerformingLabs as performingLabs, qaTrendPolicyService, QA_TREND_SEVERITIES,
  toggledMajorSeverity, withLabQaTrendPolicy,
} from '@/services';
import type { QaTrendPolicy, QaTrendPolicySettings } from '@/types/quality/QaTrend';
import '@/pathscribe.css';

const K = 'qaTrendPolicySection';

const PolicyForm: React.FC<{ policy: QaTrendPolicy; onChange: (p: QaTrendPolicy) => void; idPrefix: string }> = ({ policy, onChange, idPrefix }) => {
  const { t } = useTranslation();
  const num = (field: keyof Pick<QaTrendPolicy, 'rollingWindowMonths' | 'minSampleSize' | 'countThreshold' | 'rateThresholdPercent'>) => (
    <div className="ps-conf-form-field">
      <label className="ps-conf-label" htmlFor={`${idPrefix}-${field}`}>{t(`${K}.fields.${field}`)}</label>
      <input id={`${idPrefix}-${field}`} className="ps-conf-input" type="number" min={0} value={policy[field]}
        onChange={e => onChange({ ...policy, [field]: Number(e.target.value) })} />
      <span className="ps-conf-field-hint">{t(`${K}.hints.${field}`)}</span>
    </div>
  );
  return (
    <div>
      <label className="ps-conf-toggle-label-row">
        <input type="checkbox" className="ps-conf-radio-input" checked={policy.pathologistTrendEnabled}
          onChange={e => onChange({ ...policy, pathologistTrendEnabled: e.target.checked })} />
        <span className="ps-conf-option-text">{t(`${K}.fields.pathologistTrendEnabled`)}</span>
      </label>
      <label className="ps-conf-toggle-label-row">
        <input type="checkbox" className="ps-conf-radio-input" checked={policy.specimenTypeTrendEnabled}
          onChange={e => onChange({ ...policy, specimenTypeTrendEnabled: e.target.checked })} />
        <span className="ps-conf-option-text">{t(`${K}.fields.specimenTypeTrendEnabled`)}</span>
      </label>
      <div className="ps-conf-form-row">
        {num('rollingWindowMonths')}
        {num('minSampleSize')}
      </div>
      <div className="ps-conf-form-row">
        {num('countThreshold')}
        {num('rateThresholdPercent')}
      </div>
      <div className="ps-conf-form-field">
        <span className="ps-conf-label">{t(`${K}.fields.majorSeverities`)}</span>
        <div className="ps-conf-form-row--3">
          {QA_TREND_SEVERITIES.map(sev => (
            <label key={sev} className="ps-conf-label">
              <input type="checkbox" checked={policy.majorSeverities.includes(sev)} onChange={() => onChange(toggledMajorSeverity(policy, sev))} />
              {' '}{t(`qaConfigurationCenterSection.modal.severity.${sev}`)}
            </label>
          ))}
        </div>
        <span className="ps-conf-field-hint">{t(`${K}.hints.majorSeverities`)}</span>
      </div>
      <div className="ps-conf-form-field">
        <label className="ps-conf-label" htmlFor={`${idPrefix}-action`}>{t(`${K}.fields.action`)}</label>
        <select id={`${idPrefix}-action`} className="ps-conf-select" value={policy.action}
          onChange={e => onChange({ ...policy, action: e.target.value as QaTrendPolicy['action'] })}>
          <option value="review-task">{t(`${K}.actions.review-task`)}</option>
          <option value="notify-only">{t(`${K}.actions.notify-only`)}</option>
        </select>
        <span className="ps-conf-field-hint">{t(`${K}.hints.action`)}</span>
      </div>
    </div>
  );
};

const QaTrendPolicySection: React.FC = () => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<QaTrendPolicySettings | null>(null);
  const [labs, setLabs] = useState<{ id: string; name: string }[]>([]);
  const [message, setMessage] = useState<{ kind: 'saved' | 'error'; text: string } | null>(null);

  useEffect(() => {
    qaTrendPolicyService.get().then(r => { if (r.ok) setDraft(r.data); }).catch(() => {});
    facilityService.getAll().then(r => { if (r.ok) setLabs(performingLabs(r.data)); }).catch(() => {});
  }, []);

  if (!draft) return null;

  const save = async () => {
    const res = await qaTrendPolicyService.save(draft, id => labs.find(l => l.id === id)?.name ?? id);
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
        <div className="ps-conf-card-title">{t(`${K}.orgTitle`)}</div>
        <p className="ps-conf-card-description--tight">{t(`${K}.orgDescription`)}</p>
        <PolicyForm idPrefix="org" policy={draft.orgDefault} onChange={p => setDraft({ ...draft, orgDefault: p })} />
      </div>
      <div className="ps-conf-card ps-conf-card--spaced">
        <div className="ps-conf-card-title">{t(`${K}.labsTitle`)}</div>
        <p className="ps-conf-card-description--tight">{t(`${K}.labsDescription`)}</p>
        {labs.map(lab => {
          const own = draft.performingLabs[lab.id];
          return (
            <div key={lab.id} className="ps-conf-card ps-conf-card--spaced">
              <label className="ps-conf-toggle-label-row">
                <input type="checkbox" className="ps-conf-radio-input" checked={!!own}
                  onChange={e => setDraft(withLabQaTrendPolicy(draft, lab.id, e.target.checked ? { ...draft.orgDefault } : null))} />
                <span className="ps-conf-option-text">{t(`${K}.labOwn`, { name: lab.name })}</span>
              </label>
              {own && <PolicyForm idPrefix={`lab-${lab.id}`} policy={own} onChange={p => setDraft(withLabQaTrendPolicy(draft, lab.id, p))} />}
            </div>
          );
        })}
      </div>
      <button type="button" className="ps-conf-btn-primary" onClick={() => { void save(); }}>{t(`${K}.save`)}</button>
      {message && (
        <div className={message.kind === 'saved' ? 'ps-concordance__saved' : 'ps-field-still-required'} role={message.kind === 'error' ? 'alert' : undefined}>
          {message.kind === 'saved' ? '✓ ' : ''}{message.text}
        </div>
      )}
    </div>
  );
};

export default QaTrendPolicySection;
