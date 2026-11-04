// src/components/Config/System/FollowUpTrackingSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 454 (Pete, Oct 4): Configuration → System → Follow-up tracking. For
// the enterprise, and per facility:
//   • how many days before the due date the lab is warned (0 = only once
//     overdue);
//   • whether "Email ordering clinician" is offered (off until the lab turns
//     it on: Pete, "that is up to the Laboratory");
//   • the lab's own wording for that email, or the built-in wording when
//     left empty.
// Decisions are in services/followUp/followUpSettings.ts; saves are checked
// there (config:follow-up-tracking:manage).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../../pathscribe.css';
import {
  followUpSettingsService, facilityFollowUpOverrideService, facilityService,
  followUpDraftOf, followUpRuleFromDraft, followUpDraftDirty,
  DEFAULT_FOLLOW_UP_SETTINGS, FOLLOW_UP_EMAIL_PLACEHOLDERS, FOLLOW_UP_PLACEHOLDERS_AS_WRITTEN,
  MAX_FOLLOW_UP_WARNING_DAYS, MAX_FOLLOW_UP_EMAIL_SUBJECT, MAX_FOLLOW_UP_EMAIL_BODY,
  type FollowUpSettingsRule, type FollowUpSettingsDraft, type FacilityFollowUpOverride,
} from '@/services';
import type { Facility } from '@/services/facilities/IFacilityService';
import { useReportConfigDirty } from '../configDirtyGuardContext';

const K = 'followUpTrackingSection';

const SettingsEditor: React.FC<{ draft: FollowUpSettingsDraft; onChange: (d: FollowUpSettingsDraft) => void; idPrefix: string }> = ({ draft, onChange, idPrefix }) => {
  const { t } = useTranslation();
  const { problems } = followUpRuleFromDraft(draft);
  const placeholders = FOLLOW_UP_EMAIL_PLACEHOLDERS.map(p => `{{${p}}}`).join(', ');
  return (
    <div className="ps-followup-settings">
      <div className="ps-conf-row-actions">
        <label className="ps-conf-label" htmlFor={`${idPrefix}-warning`}>{t(`${K}.warningDaysLabel`)}</label>
        <input id={`${idPrefix}-warning`} className="ps-conf-input ps-corr-days" inputMode="numeric" value={draft.warningDays} onChange={e => onChange({ ...draft, warningDays: e.target.value })} />
        <span className="ps-conf-field-hint">{t(`${K}.warningDaysHint`, { max: MAX_FOLLOW_UP_WARNING_DAYS })}</span>
      </div>
      <label className="ps-conf-toggle-label-row">
        <input type="checkbox" className="ps-conf-radio-input" checked={draft.clinicianEmailEnabled} onChange={e => onChange({ ...draft, clinicianEmailEnabled: e.target.checked })} />
        <span className="ps-conf-option-text">{t(`${K}.clinicianEmailLabel`)}</span>
      </label>
      <span className="ps-conf-field-hint">{t(`${K}.clinicianEmailHint`)}</span>
      {draft.clinicianEmailEnabled && (
        <>
          <div className="ps-conf-form-field">
            <label className="ps-conf-label" htmlFor={`${idPrefix}-subject`}>{t(`${K}.subjectLabel`)}</label>
            <input id={`${idPrefix}-subject`} className="ps-conf-input" maxLength={MAX_FOLLOW_UP_EMAIL_SUBJECT} value={draft.emailSubject}
              placeholder={t('followUp.email.defaultSubject', FOLLOW_UP_PLACEHOLDERS_AS_WRITTEN)} onChange={e => onChange({ ...draft, emailSubject: e.target.value })} />
          </div>
          <div className="ps-conf-form-field">
            <label className="ps-conf-label" htmlFor={`${idPrefix}-body`}>{t(`${K}.bodyLabel`)}</label>
            <textarea id={`${idPrefix}-body`} className="ps-conf-input ps-followup__email-body" maxLength={MAX_FOLLOW_UP_EMAIL_BODY} value={draft.emailBody}
              placeholder={t('followUp.email.defaultBody', FOLLOW_UP_PLACEHOLDERS_AS_WRITTEN)} onChange={e => onChange({ ...draft, emailBody: e.target.value })} />
            <span className="ps-conf-field-hint">{t(`${K}.templateHint`, { placeholders })}</span>
          </div>
        </>
      )}
      {problems.map(p => <span key={p} className="ps-field-still-required" role="alert">{t(`${K}.errors.${p}`)}</span>)}
    </div>
  );
};

const FollowUpTrackingSection: React.FC = () => {
  const { t } = useTranslation();
  const [saved, setSaved] = useState<FollowUpSettingsRule>(DEFAULT_FOLLOW_UP_SETTINGS);
  const [draft, setDraft] = useState<FollowUpSettingsDraft>(followUpDraftOf(DEFAULT_FOLLOW_UP_SETTINGS));
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [overrides, setOverrides] = useState<FacilityFollowUpOverride[]>([]);
  const [adding, setAdding] = useState<{ facilityId: string; draft: FollowUpSettingsDraft } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dirty = followUpDraftDirty(draft, saved);
  useReportConfigDirty(dirty || adding !== null);

  const refresh = async () => {
    const [s, f, o] = await Promise.all([followUpSettingsService.get(), facilityService.getAll(), facilityFollowUpOverrideService.getAll()]);
    if (s.ok) { setSaved(s.data); setDraft(followUpDraftOf(s.data)); }
    if (f.ok) setFacilities(f.data);
    if (o.ok) setOverrides(o.data);
  };
  useEffect(() => { void refresh(); }, []);

  const showResult = async (res: { ok: boolean; error?: string }) => {
    setError(res.ok ? null : t(`${K}.errors.${res.error}`, { defaultValue: t(`${K}.errors.saveFailed`) }));
    if (res.ok) await refresh();
    return res.ok;
  };
  const saveEnterprise = async () => {
    const { rule, problems } = followUpRuleFromDraft(draft);
    if (problems.length) return;
    await showResult(await followUpSettingsService.update(rule));
  };
  const saveFacility = async () => {
    if (!adding?.facilityId) return;
    const { rule, problems } = followUpRuleFromDraft(adding.draft);
    if (problems.length) return;
    if (await showResult(await facilityFollowUpOverrideService.set(adding.facilityId, rule))) setAdding(null);
  };

  const describe = (r: Partial<FollowUpSettingsRule>) => t(`${K}.summary`, {
    count: r.warningDays ?? saved.warningDays,
    email: t(`${K}.${(r.clinicianEmailEnabled ?? saved.clinicianEmailEnabled) ? 'emailOn' : 'emailOff'}`),
  });

  return (
    <div className="ps-conf-page">
      <h2 className="ps-conf-section-title">{t(`${K}.title`)}</h2>
      <p className="ps-conf-section-subtitle ps-conf-section-subtitle--spaced">{t(`${K}.subtitle`)}</p>
      {error && <p className="ps-field-still-required" role="alert">{error}</p>}

      <div className="ps-conf-card ps-conf-card--spaced">
        <div className="ps-conf-card-title">{t(`${K}.enterpriseTitle`)}</div>
        <SettingsEditor draft={draft} onChange={setDraft} idPrefix="followup-enterprise" />
        <div className="ps-conf-row-actions">
          <button className="ps-conf-btn-primary" onClick={saveEnterprise} disabled={!dirty || followUpRuleFromDraft(draft).problems.length > 0}>{t('common.save')}</button>
        </div>
      </div>

      <div className="ps-conf-card ps-conf-card--spaced">
        <div className="ps-conf-row">
          <div className="ps-conf-card-title">{t(`${K}.facilityTitle`)}</div>
          {!adding && (
            <button className="ps-conf-btn-secondary" onClick={() => setAdding({ facilityId: facilities[0]?.id ?? '', draft: followUpDraftOf(saved) })}>{t(`${K}.addOverride`)}</button>
          )}
        </div>
        {overrides.map(o => (
          <div key={o.id} className="ps-conf-row">
            <span className="ps-conf-value">{facilities.find(f => f.id === o.facilityId)?.name ?? o.facilityId}</span>
            <div className="ps-conf-row-actions">
              <span className="ps-conf-value">{describe(o.overrides)}</span>
              <button className="ps-conf-btn-secondary" onClick={async () => { await showResult(await facilityFollowUpOverrideService.remove(o.facilityId)); }}>{t('common.remove')}</button>
            </div>
          </div>
        ))}
        {overrides.length === 0 && !adding && <div className="ps-conf-empty-row">{t(`${K}.facilityEmpty`)}</div>}
        {adding && (
          <div className="ps-conf-row ps-followup-settings__facility">
            <select className="ps-conf-select" aria-label={t(`${K}.facilityTitle`)} value={adding.facilityId} onChange={e => setAdding({ ...adding, facilityId: e.target.value })}>
              {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <SettingsEditor draft={adding.draft} onChange={d => setAdding({ ...adding, draft: d })} idPrefix="followup-facility" />
            <div className="ps-conf-row-actions">
              <button className="ps-conf-btn-primary" onClick={saveFacility}>{t('common.save')}</button>
              <button className="ps-conf-btn-secondary" onClick={() => setAdding(null)}>{t('common.cancel')}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FollowUpTrackingSection;
