// src/components/Config/Cytology/CytologyComplianceFeaturesSection.tsx
// Batch 415 (PS-359; Pete: the US rules "should be an enabled feature").
// Configuration → Cytology → Country-specific rules: the CLIA workload cap and
// the CAP 5-year lookback, each Automatic (on for a US lab, off elsewhere), On
// or Off, for the enterprise and per facility. Rules are in
// services/cytology/cytologyComplianceFeatures.ts; saves need
// config:cytology-compliance:manage and are audited.

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../../pathscribe.css';
import { cytologyComplianceFeaturesService, cytologyComplianceSaveDeps, facilityService, saveCytologyComplianceFeatures } from '@/services';
import { useAuth } from '@contexts/AuthContext';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import type { Facility } from '@/services/facilities/IFacilityService';
import { CYTOLOGY_COMPLIANCE_FEATURES, type CytologyComplianceSettings, type CytologyFeatureSetting } from '@/services/cytology/cytologyComplianceFeatures';
import { useReportConfigDirty } from '../configDirtyGuardContext';

const K = 'cytologyCompliance';
const SETTINGS: CytologyFeatureSetting[] = ['auto', 'on', 'off'];

const CytologyComplianceFeaturesSection: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const actor = { id: user?.id ?? '', name: user?.name ?? '' };
  const [enterprise, setEnterprise] = useState<CytologyComplianceSettings>({});
  const [facilitySettings, setFacilitySettings] = useState<Record<string, CytologyComplianceSettings>>({});
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [adding, setAdding] = useState<{ facilityId: string; settings: CytologyComplianceSettings } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // PS-128 (Batch 437): unsaved changes keep you from leaving without a warning.
  useReportConfigDirty(adding !== null);

  const refresh = () => {
    cytologyComplianceFeaturesService.get().then(r => { setEnterprise(r.data.enterprise); setFacilitySettings(r.data.facilities); });
    facilityService.getAll().then(r => { if (r.ok) setFacilities(r.data); });
  };
  useEffect(() => { refresh(); }, []);
  const report = (outcome: string) => setMessage(t(outcome === 'saved' ? `${K}.saved` : `${K}.notPermitted`));
  const facilityName = (id: string) => facilities.find(f => f.id === id)?.name ?? id;

  const selects = (value: CytologyComplianceSettings, onChange: (v: CytologyComplianceSettings) => void) => (
    <div className="ps-compliance-selects">
      {CYTOLOGY_COMPLIANCE_FEATURES.map(f => (
        <label key={f} className="ps-compliance-select">
          <span>{t(`${K}.features.${f}.label`)}</span>
          <select className="ps-conf-select" value={value[f] ?? 'auto'} onChange={e => onChange({ ...value, [f]: e.target.value as CytologyFeatureSetting })}>
            {SETTINGS.map(s => <option key={s} value={s}>{t(`${K}.settings.${s}`)}</option>)}
          </select>
        </label>
      ))}
    </div>
  );

  return (
    <div className="ps-conf-page">
      <h2 className="ps-conf-section-title">{t(`${K}.title`)}</h2>
      <p className="ps-conf-section-subtitle ps-conf-section-subtitle--spaced">{t(`${K}.subtitle`)}</p>
      <ul className="ps-compliance-help">
        {CYTOLOGY_COMPLIANCE_FEATURES.map(f => <li key={f}><strong>{t(`${K}.features.${f}.label`)}</strong>{' '}{t(`${K}.features.${f}.help`)}</li>)}
      </ul>
      {message && <div className="ps-conf-saving-indicator">{message}</div>}

      <div className="ps-conf-card ps-conf-card--spaced">
        <div className="ps-conf-card-title">{t('cytologyQcSettingsSection.enterprise.title')}</div>
        {selects(enterprise, setEnterprise)}
        <div className="ps-conf-row-actions">
          <CapabilityButton capability="config:cytology-compliance:manage" className="ps-conf-btn-primary"
            onClick={async () => { report(await saveCytologyComplianceFeatures(null, enterprise, actor, cytologyComplianceSaveDeps)); refresh(); }}>
            {t('common.save')}
          </CapabilityButton>
        </div>
      </div>

      <div className="ps-conf-card ps-conf-card--spaced">
        <div className="ps-conf-row">
          <div className="ps-conf-card-title">{t('cytologyQcSettingsSection.facility.title')}</div>
          {!adding && <button className="ps-conf-btn-secondary" onClick={() => setAdding({ facilityId: facilities[0]?.id ?? '', settings: {} })}>{t('cytologyQcSettingsSection.addOverrideBtn')}</button>}
        </div>
        {Object.entries(facilitySettings).map(([facilityId, s]) => (
          <div key={facilityId} className="ps-conf-row">
            <span className="ps-conf-value">{facilityName(facilityId)}</span>
            <div className="ps-conf-row-actions">
              <span className="ps-conf-value">
                {CYTOLOGY_COMPLIANCE_FEATURES.map(f => t(`${K}.summary`, { feature: t(`${K}.features.${f}.label`), setting: t(`${K}.settings.${s[f] ?? 'auto'}`) })).join(t(`${K}.summarySeparator`))}
              </span>
              <CapabilityButton capability="config:cytology-compliance:manage" context={{ facilityId }} className="ps-conf-btn-secondary"
                onClick={async () => { report(await saveCytologyComplianceFeatures(facilityId, null, actor, cytologyComplianceSaveDeps)); refresh(); }}>
                {t('common.remove')}
              </CapabilityButton>
            </div>
          </div>
        ))}
        {Object.keys(facilitySettings).length === 0 && !adding && <div className="ps-conf-empty-row">{t('cytologyQcSettingsSection.facility.emptyState')}</div>}
        {adding && (
          <div className="ps-compliance-adding">
            <select className="ps-conf-select" value={adding.facilityId} onChange={e => setAdding({ ...adding, facilityId: e.target.value })}>
              {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            {selects(adding.settings, settings => setAdding({ ...adding, settings }))}
            <div className="ps-conf-row-actions">
              <CapabilityButton capability="config:cytology-compliance:manage" context={{ facilityId: adding.facilityId }} className="ps-conf-btn-primary"
                onClick={async () => { report(await saveCytologyComplianceFeatures(adding.facilityId, adding.settings, actor, cytologyComplianceSaveDeps)); setAdding(null); refresh(); }}>
                {t('common.save')}
              </CapabilityButton>
              <button className="ps-conf-btn-secondary" onClick={() => setAdding(null)}>{t('common.cancel')}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CytologyComplianceFeaturesSection;
