// src/components/Config/Cytology/CytologyHistologyCorrelationSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 452 (PS-156): Configuration → Cytology → Correlation window. How
// many days after an abnormal Pap a later biopsy is looked for, and which
// date the window starts from (collection by default, Pete Oct 4 2026), set
// for the enterprise, per jurisdiction and per facility. Decisions are in
// services/cytology/correlationSettingsEditing.ts and
// cytologyHistologyCorrelationWindow.ts; saves are checked in the service
// (config:cytology-histology-correlation:manage).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../../pathscribe.css';
import { cytologyHistologyCorrelationSettingsService, facilityCytologyHistologyCorrelationOverrideService, facilityService } from '@/services';
import { CORRELATION_WINDOW_ANCHORS, DEFAULT_CYTOLOGY_HISTOLOGY_CORRELATION_SETTINGS, type CorrelationWindowAnchor, type CytologyHistologyCorrelationSettingsConfig, type FacilityCytologyHistologyCorrelationOverride, type ICytologyHistologyCorrelationSettingsService, type IFacilityCytologyHistologyCorrelationOverrideService } from '@/services/cytology/ICytologyHistologyCorrelationSettingsService';
import { draftOf, jurisdictionsWithoutRule, ruleFromDraft, withJurisdictionRule, withoutJurisdictionRule, type RuleDraft } from '@/services/cytology/correlationSettingsEditing';
import { JURISDICTION_LABELS } from '@/types/systemConfig';
import type { Facility } from '@/services/facilities/IFacilityService';
import { useReportConfigDirty } from '../configDirtyGuardContext';

const JURISDICTION_CODES = Object.keys(JURISDICTION_LABELS);

const RuleEditor: React.FC<{ draft: RuleDraft; onChange: (d: RuleDraft) => void; idPrefix: string }> = ({ draft, onChange, idPrefix }) => {
  const { t } = useTranslation();
  const { problems } = ruleFromDraft(draft);
  return (
    <div className="ps-conf-row-actions">
      <label className="ps-conf-label" htmlFor={`${idPrefix}-days`}>{t('cytologyHistologyCorrelationSection.windowDaysLabel')}</label>
      <input id={`${idPrefix}-days`} className="ps-conf-input ps-corr-days" inputMode="numeric" value={draft.days} onChange={e => onChange({ ...draft, days: e.target.value })} />
      <label className="ps-conf-label" htmlFor={`${idPrefix}-anchor`}>{t('cytologyHistologyCorrelationSection.anchorLabel')}</label>
      <select id={`${idPrefix}-anchor`} className="ps-conf-select" value={draft.anchor} onChange={e => onChange({ ...draft, anchor: e.target.value as CorrelationWindowAnchor })}>
        {CORRELATION_WINDOW_ANCHORS.map(a => <option key={a} value={a}>{t(`cytologyHistologyCorrelationSection.anchors.${a}`)}</option>)}
      </select>
      {problems.map(p => <span key={p} className="ps-field-still-required" role="alert">{t(`cytologyHistologyCorrelationSection.errors.${p}`)}</span>)}
    </div>
  );
};

export interface CorrelationWindowSettingsProps {
  /** Batch 453: the same screen serves the surgical biopsy-to-resection window. */
  settingsService: ICytologyHistologyCorrelationSettingsService;
  overrideService: IFacilityCytologyHistologyCorrelationOverrideService;
  titleKey: string;
  subtitleKey: string;
}

export const CorrelationWindowSettings: React.FC<CorrelationWindowSettingsProps> = ({ settingsService, overrideService, titleKey, subtitleKey }) => {
  const { t } = useTranslation();
  const [saved, setSaved] = useState<CytologyHistologyCorrelationSettingsConfig>(DEFAULT_CYTOLOGY_HISTOLOGY_CORRELATION_SETTINGS);
  const [enterpriseDraft, setEnterpriseDraft] = useState<RuleDraft>(draftOf(DEFAULT_CYTOLOGY_HISTOLOGY_CORRELATION_SETTINGS));
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [overrides, setOverrides] = useState<FacilityCytologyHistologyCorrelationOverride[]>([]);
  const [addingRegion, setAddingRegion] = useState<{ code: string; draft: RuleDraft } | null>(null);
  const [addingFacility, setAddingFacility] = useState<{ facilityId: string; draft: RuleDraft } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const enterpriseDirty = enterpriseDraft.days !== String(saved.windowDays) || enterpriseDraft.anchor !== saved.anchor;
  useReportConfigDirty(enterpriseDirty || addingRegion !== null || addingFacility !== null);

  const refresh = async () => {
    const [s, f, o] = await Promise.all([settingsService.get(), facilityService.getAll(), overrideService.getAll()]);
    if (s.ok) { setSaved(s.data); setEnterpriseDraft(draftOf(s.data)); }
    if (f.ok) setFacilities(f.data);
    if (o.ok) setOverrides(o.data);
  };
  useEffect(() => { void refresh(); }, [settingsService, overrideService]); // eslint-disable-line react-hooks/exhaustive-deps

  const showResult = async (res: { ok: boolean; error?: string }) => {
    setError(res.ok ? null : t(`cytologyHistologyCorrelationSection.errors.${res.error}`, { defaultValue: t('cytologyHistologyCorrelationSection.errors.saveFailed') }));
    if (res.ok) await refresh();
    return res.ok;
  };

  const saveEnterprise = async () => {
    const { rule, problems } = ruleFromDraft(enterpriseDraft);
    if (problems.length) return;
    await showResult(await settingsService.update(rule));
  };
  const saveRegion = async () => {
    if (!addingRegion) return;
    const { rule, problems } = ruleFromDraft(addingRegion.draft);
    if (problems.length || !addingRegion.code) return;
    if (await showResult(await settingsService.update({ jurisdictionRules: withJurisdictionRule(saved.jurisdictionRules, addingRegion.code, rule) }))) setAddingRegion(null);
  };
  const saveFacility = async () => {
    if (!addingFacility) return;
    const { rule, problems } = ruleFromDraft(addingFacility.draft);
    if (problems.length || !addingFacility.facilityId) return;
    if (await showResult(await overrideService.set(addingFacility.facilityId, rule))) setAddingFacility(null);
  };

  const describe = (r: { windowDays?: number; anchor?: CorrelationWindowAnchor }) =>
    t('cytologyHistologyCorrelationSection.ruleSummary', { days: r.windowDays ?? saved.windowDays, anchor: t(`cytologyHistologyCorrelationSection.anchors.${r.anchor ?? saved.anchor}`) });
  const freeRegions = jurisdictionsWithoutRule(JURISDICTION_CODES, saved);

  return (
    <div className="ps-conf-page">
      <h2 className="ps-conf-section-title">{t(titleKey)}</h2>
      <p className="ps-conf-section-subtitle ps-conf-section-subtitle--spaced">{t(subtitleKey)}</p>
      {error && <p className="ps-field-still-required" role="alert">{error}</p>}

      <div className="ps-conf-card ps-conf-card--spaced">
        <div className="ps-conf-card-title">{t('cytologyHistologyCorrelationSection.enterpriseTitle')}</div>
        <RuleEditor draft={enterpriseDraft} onChange={setEnterpriseDraft} idPrefix="corr-enterprise" />
        <div className="ps-conf-row-actions">
          <button className="ps-conf-btn-primary" onClick={saveEnterprise} disabled={!enterpriseDirty || ruleFromDraft(enterpriseDraft).problems.length > 0}>{t('common.save')}</button>
        </div>
      </div>

      <div className="ps-conf-card ps-conf-card--spaced">
        <div className="ps-conf-row">
          <div className="ps-conf-card-title">{t('cytologyHistologyCorrelationSection.jurisdictionTitle')}</div>
          {!addingRegion && freeRegions.length > 0 && (
            <button className="ps-conf-btn-secondary" onClick={() => setAddingRegion({ code: freeRegions[0], draft: draftOf(saved) })}>{t('cytologyHistologyCorrelationSection.addRule')}</button>
          )}
        </div>
        {Object.entries(saved.jurisdictionRules).map(([code, rule]) => (
          <div key={code} className="ps-conf-row">
            <span className="ps-conf-value">{t(`jurisdictionNames.${code}`)}</span>
            <div className="ps-conf-row-actions">
              <span className="ps-conf-value">{describe(rule)}</span>
              <button className="ps-conf-btn-secondary" onClick={async () => { await showResult(await settingsService.update({ jurisdictionRules: withoutJurisdictionRule(saved.jurisdictionRules, code) })); }}>{t('common.remove')}</button>
            </div>
          </div>
        ))}
        {Object.keys(saved.jurisdictionRules).length === 0 && !addingRegion && <div className="ps-conf-empty-row">{t('cytologyHistologyCorrelationSection.jurisdictionEmpty')}</div>}
        {addingRegion && (
          <div className="ps-conf-row">
            <select className="ps-conf-select" aria-label={t('cytologyHistologyCorrelationSection.jurisdictionTitle')} value={addingRegion.code} onChange={e => setAddingRegion({ ...addingRegion, code: e.target.value })}>
              {freeRegions.map(code => <option key={code} value={code}>{t(`jurisdictionNames.${code}`)}</option>)}
            </select>
            <RuleEditor draft={addingRegion.draft} onChange={draft => setAddingRegion({ ...addingRegion, draft })} idPrefix="corr-region" />
            <div className="ps-conf-row-actions">
              <button className="ps-conf-btn-primary" onClick={saveRegion}>{t('common.save')}</button>
              <button className="ps-conf-btn-secondary" onClick={() => setAddingRegion(null)}>{t('common.cancel')}</button>
            </div>
          </div>
        )}
      </div>

      <div className="ps-conf-card ps-conf-card--spaced">
        <div className="ps-conf-row">
          <div className="ps-conf-card-title">{t('cytologyHistologyCorrelationSection.facilityTitle')}</div>
          {!addingFacility && (
            <button className="ps-conf-btn-secondary" onClick={() => setAddingFacility({ facilityId: facilities[0]?.id ?? '', draft: draftOf(saved) })}>{t('cytologyHistologyCorrelationSection.addOverride')}</button>
          )}
        </div>
        {overrides.map(o => (
          <div key={o.id} className="ps-conf-row">
            <span className="ps-conf-value">{facilities.find(f => f.id === o.facilityId)?.name ?? o.facilityId}</span>
            <div className="ps-conf-row-actions">
              <span className="ps-conf-value">{describe(o.overrides)}</span>
              <button className="ps-conf-btn-secondary" onClick={async () => { await showResult(await overrideService.remove(o.facilityId)); }}>{t('common.remove')}</button>
            </div>
          </div>
        ))}
        {overrides.length === 0 && !addingFacility && <div className="ps-conf-empty-row">{t('cytologyHistologyCorrelationSection.facilityEmpty')}</div>}
        {addingFacility && (
          <div className="ps-conf-row">
            <select className="ps-conf-select" aria-label={t('cytologyHistologyCorrelationSection.facilityTitle')} value={addingFacility.facilityId} onChange={e => setAddingFacility({ ...addingFacility, facilityId: e.target.value })}>
              {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <RuleEditor draft={addingFacility.draft} onChange={draft => setAddingFacility({ ...addingFacility, draft })} idPrefix="corr-facility" />
            <div className="ps-conf-row-actions">
              <button className="ps-conf-btn-primary" onClick={saveFacility}>{t('common.save')}</button>
              <button className="ps-conf-btn-secondary" onClick={() => setAddingFacility(null)}>{t('common.cancel')}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const CytologyHistologyCorrelationSection: React.FC = () => (
  <CorrelationWindowSettings
    settingsService={cytologyHistologyCorrelationSettingsService}
    overrideService={facilityCytologyHistologyCorrelationOverrideService}
    titleKey="cytologyHistologyCorrelationSection.title"
    subtitleKey="cytologyHistologyCorrelationSection.subtitle"
  />
);

export default CytologyHistologyCorrelationSection;
