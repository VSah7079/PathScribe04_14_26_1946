// src/components/Config/Cytology/CytologyRegistrySettingsSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Configuration → Cytology → Screening registry reporting. Batch 414 (PS-359;
// Pete: support every country, or a flexible engine): rebuilt on the
// screening registry engine (services/screeningRegistry/).
//   • The registry each facility reports GYN results to: the enterprise
//     default and per-facility overrides (a Canadian province, a German
//     state, a Belgian region can each have their own).
//   • For the registry chosen: its jurisdictions, the national identifier it
//     keys on, whether it was built from the programme's specification or is
//     configured by the lab, the lab's code mapping for each dictionary
//     category, and what to hold rather than send.
// Saves go through saveScreeningRegistrySettings (config:screening-registry:manage,
// audited). Before Batch 414 this screen saved to a store sign-out never read.
// Batch 423: the test / live selector is replaced by the go-live panel
// (components/Config/RegistryGoLive/): live needs pre-checks, test evidence and
// an approval with re-confirmed credentials.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../../pathscribe.css';
import {
  cytologyCategoryService, facilityRegistryOverrideService, facilityService, registrySettingsService,
  saveEnterpriseScreeningRegistry, saveFacilityScreeningRegistry, saveScreeningRegistryConfig,
  screeningRegistryConfigService, screeningRegistrySettingsDeps,
} from '@/services';
import { useAuth } from '@contexts/AuthContext';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import type { RegistryId } from '@/services/facilities/IRegistrySettingsService';
import type { FacilityRegistryOverride } from '@/services/facilities/IFacilityRegistryOverrideService';
import type { Facility } from '@/services/facilities/IFacilityService';
import type { CytologyCategoryEntry } from '@/services/cytology/ICytologyCategoryService';
import type { ScreeningRegistryConfig } from '@/services/screeningRegistry/IScreeningRegistryConfigService';
import { SCREENING_REGISTRY_DEFINITIONS, screeningRegistryDefinition, type ScreeningRegistryId } from '@/services/screeningRegistry/screeningRegistryDefinitions';
import { registryConfigReadiness, registryMappingRows, withRegistryMapping } from '@/services/screeningRegistry/screeningRegistryEngine';
import { IDENTIFIER_FORMAT_LIBRARY } from '@/types/systemConfig';
import { RegistryGoLivePanel } from '@/components/Config/RegistryGoLive/RegistryGoLivePanel';

const K = 'screeningRegistry';

const CytologyRegistrySettingsSection: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const actor = { id: user?.id ?? '', name: user?.name ?? '' };
  const [enterpriseDraft, setEnterpriseDraft] = useState<RegistryId>('none');
  const [savedEnterprise, setSavedEnterprise] = useState<RegistryId>('none');
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [facilityOverrides, setFacilityOverrides] = useState<FacilityRegistryOverride[]>([]);
  const [addingFacility, setAddingFacility] = useState<{ facilityId: string; registryId: RegistryId } | null>(null);
  const [categories, setCategories] = useState<CytologyCategoryEntry[]>([]);
  const [configuring, setConfiguring] = useState<ScreeningRegistryId | null>(null);
  const [config, setConfig] = useState<ScreeningRegistryConfig | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = () => {
    registrySettingsService.get().then(r => { if (r.ok) { setEnterpriseDraft(r.data.registryId); setSavedEnterprise(r.data.registryId); } });
    facilityService.getAll().then(r => {
      if (!r.ok) return;
      setFacilities(r.data);
      Promise.all(r.data.map(f => facilityRegistryOverrideService.getForFacility(f.id))).then(overrides => {
        setFacilityOverrides(overrides.filter((o): o is { ok: true; data: FacilityRegistryOverride } => o.ok && !!o.data).map(o => o.data));
      });
    });
  };
  useEffect(() => {
    refresh();
    cytologyCategoryService.getAll().then(r => { if (r.ok) setCategories(r.data); });
  }, []);
  useEffect(() => {
    if (!configuring && savedEnterprise !== 'none') setConfiguring(savedEnterprise);
  }, [savedEnterprise, configuring]);
  useEffect(() => {
    if (!configuring) { setConfig(null); return; }
    screeningRegistryConfigService.get(configuring).then(r => { if (r.ok) setConfig(r.data); });
  }, [configuring]);

  const report = (outcome: string) => setMessage(outcome === 'saved' ? t(`${K}.saved`) : t(`${K}.errors.${outcome}`));
  const registryLabel = (id: RegistryId) => (id === 'none' ? t('cancerRegistrySection.registries.none') : t(`${K}.registries.${screeningRegistryDefinition(id)?.labelId ?? id}`));
  const facilityName = (id: string) => facilities.find(f => f.id === id)?.name ?? id;
  const registryOptions = (
    <>
      <option value="none">{t('cancerRegistrySection.registries.none')}</option>
      {SCREENING_REGISTRY_DEFINITIONS.map(d => <option key={d.id} value={d.id}>{t(`${K}.registries.${d.labelId}`)}</option>)}
    </>
  );

  const definition = screeningRegistryDefinition(configuring ?? undefined);
  const rows = useMemo(() => (definition && config ? registryMappingRows(definition, config, categories) : []), [definition, config, categories]);
  const readiness = definition && config ? registryConfigReadiness(definition, config, categories) : null;
  const identifierLabel = definition?.patientIdentifierFormatId
    ? IDENTIFIER_FORMAT_LIBRARY.find(f => f.id === definition.patientIdentifierFormatId)?.label : undefined;

  return (
    <div className="ps-conf-page">
      <h2 className="ps-conf-section-title">{t(`${K}.title`)}</h2>
      <p className="ps-conf-section-subtitle ps-conf-section-subtitle--spaced">{t(`${K}.subtitle`)}</p>
      {message && <div className="ps-conf-saving-indicator">{message}</div>}

      <div className="ps-conf-card ps-conf-card--spaced">
        <div className="ps-conf-card-title">{t('cytologyQcSettingsSection.enterprise.title')}</div>
        <div className="ps-conf-row-actions">
          <select className="ps-conf-select" value={enterpriseDraft} onChange={e => setEnterpriseDraft(e.target.value as RegistryId)}>{registryOptions}</select>
          <CapabilityButton capability="config:screening-registry:manage" className="ps-conf-btn-primary" disabled={saving}
            onClick={async () => { setSaving(true); report(await saveEnterpriseScreeningRegistry(enterpriseDraft, actor, screeningRegistrySettingsDeps)); setSaving(false); refresh(); }}>
            {t('common.save')}
          </CapabilityButton>
        </div>
        {enterpriseDraft !== savedEnterprise && <div className="ps-conf-saving-indicator">{t('cytologyQcSettingsSection.enterprise.unsavedChange')}</div>}
      </div>

      <div className="ps-conf-card ps-conf-card--spaced">
        <div className="ps-conf-row">
          <div className="ps-conf-card-title">{t('cytologyQcSettingsSection.facility.title')}</div>
          {!addingFacility && (
            <button className="ps-conf-btn-secondary" onClick={() => setAddingFacility({ facilityId: facilities[0]?.id ?? '', registryId: enterpriseDraft })}>{t('cytologyQcSettingsSection.addOverrideBtn')}</button>
          )}
        </div>
        {facilityOverrides.map(o => (
          <div key={o.id} className="ps-conf-row">
            <span className="ps-conf-value">{facilityName(o.facilityId)}</span>
            <div className="ps-conf-row-actions">
              <span className="ps-conf-value">{o.overrides.registryId ? registryLabel(o.overrides.registryId) : '—'}</span>
              {o.overrides.registryId && o.overrides.registryId !== 'none' && (
                <button className="ps-conf-btn-secondary" onClick={() => setConfiguring(o.overrides.registryId as ScreeningRegistryId)}>{t(`${K}.configure`)}</button>
              )}
              <CapabilityButton capability="config:screening-registry:manage" context={{ facilityId: o.facilityId }} className="ps-conf-btn-secondary"
                onClick={async () => { report(await saveFacilityScreeningRegistry(o.facilityId, null, actor, screeningRegistrySettingsDeps)); refresh(); }}>
                {t('common.remove')}
              </CapabilityButton>
            </div>
          </div>
        ))}
        {facilityOverrides.length === 0 && !addingFacility && <div className="ps-conf-empty-row">{t('cytologyQcSettingsSection.facility.emptyState')}</div>}
        {addingFacility && (
          <div className="ps-conf-row">
            <select className="ps-conf-select" value={addingFacility.facilityId} onChange={e => setAddingFacility({ ...addingFacility, facilityId: e.target.value })}>
              {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <div className="ps-conf-row-actions">
              <select className="ps-conf-select" value={addingFacility.registryId} onChange={e => setAddingFacility({ ...addingFacility, registryId: e.target.value as RegistryId })}>{registryOptions}</select>
              <CapabilityButton capability="config:screening-registry:manage" context={{ facilityId: addingFacility.facilityId }} className="ps-conf-btn-primary"
                onClick={async () => { report(await saveFacilityScreeningRegistry(addingFacility.facilityId, addingFacility.registryId, actor, screeningRegistrySettingsDeps)); setAddingFacility(null); refresh(); }}>
                {t('common.save')}
              </CapabilityButton>
              <button className="ps-conf-btn-secondary" onClick={() => setAddingFacility(null)}>{t('common.cancel')}</button>
            </div>
          </div>
        )}
      </div>

      <div className="ps-conf-card ps-conf-card--spaced">
        <div className="ps-conf-row">
          <div className="ps-conf-card-title">{t(`${K}.detail.title`)}</div>
          <select className="ps-conf-select" value={configuring ?? ''} onChange={e => setConfiguring((e.target.value || null) as ScreeningRegistryId | null)}>
            <option value="">{t(`${K}.detail.choose`)}</option>
            {SCREENING_REGISTRY_DEFINITIONS.map(d => <option key={d.id} value={d.id}>{t(`${K}.registries.${d.labelId}`)}</option>)}
          </select>
        </div>
        {definition && config && readiness && (
          <>
            <div className="ps-registry-facts">
              <span className={`ps-registry-badge ps-registry-badge--${definition.specStatus}`}>{t(`${K}.specStatus.${definition.specStatus}`)}</span>
              <span>{t(`${K}.detail.jurisdictions`, { list: definition.jurisdictions.map(j => t(`jurisdictionNames.${j}`)).join(', ') })}</span>
              <span>{t(`${K}.detail.identifier`, { identifier: identifierLabel ?? t(`${K}.detail.mrn`) })}</span>
              <span>{t(`${K}.detail.coding`, { coding: t(`${K}.coding.${definition.resultCoding}`) })}</span>
              <span>{t(`${K}.detail.wireFormat`, { format: t(`${K}.wireFormats.${definition.wireFormat}`) })}</span>
            </div>
            {definition.specStatus === 'configurable' && <div className="ps-registry-note">{t(`${K}.detail.configurableNote`)}</div>}

            <label className="ps-registry-check">
              <input type="checkbox" checked={config.requireMappedCodes} disabled={definition.resultCoding === 'builtIn'}
                onChange={e => setConfig({ ...config, requireMappedCodes: e.target.checked })} />
              {t(`${K}.detail.requireMappedCodes`)}
            </label>
            {definition.patientIdentifierFormatId && (
              <label className="ps-registry-check">
                <input type="checkbox" checked={!!config.requirePatientIdentifier} onChange={e => setConfig({ ...config, requirePatientIdentifier: e.target.checked })} />
                {t(`${K}.detail.requirePatientIdentifier`, { identifier: identifierLabel ?? '' })}
              </label>
            )}

            {definition.resultCoding === 'builtIn' ? (
              <div className="ps-registry-note">{t(`${K}.detail.builtInNote`)}</div>
            ) : (
              <>
                <div className={`ps-registry-readiness ${readiness.ready ? 'ps-registry-readiness--ready' : 'ps-registry-readiness--held'}`}>
                  {t(readiness.ready ? `${K}.detail.mappedReady` : `${K}.detail.mappedWillHold`, { mapped: readiness.needed - readiness.missing.length, total: readiness.needed })}
                </div>
                <div className="ps-registry-table">
                  <div className="ps-registry-row ps-registry-row--head">
                    <span>{t(`${K}.table.category`)}</span><span>{t(`${K}.table.field`)}</span><span>{t(`${K}.table.code`)}</span><span>{t(`${K}.table.display`)}</span>
                  </div>
                  {rows.map(r => (
                    <div key={`${r.field}:${r.categoryId}`} className="ps-registry-row">
                      <span>{r.label}{r.nomenclatureLabelId ? <span className="ps-registry-system">{t(`cytologyCategoriesSection.nomenclatureSystems.${r.nomenclatureLabelId}`)}</span> : null}</span>
                      <span>{t(`${K}.fields.${r.field}`)}</span>
                      <input className="ps-conf-input" value={r.code} onChange={e => setConfig(withRegistryMapping(config, r, e.target.value, r.display))} />
                      <input className="ps-conf-input" value={r.display} onChange={e => setConfig(withRegistryMapping(config, r, r.code, e.target.value))} />
                    </div>
                  ))}
                </div>
              </>
            )}
            <div className="ps-conf-row-actions">
              <CapabilityButton capability="config:screening-registry:manage" className="ps-conf-btn-primary" disabled={saving}
                onClick={async () => { setSaving(true); report(await saveScreeningRegistryConfig(config, actor, screeningRegistrySettingsDeps)); setSaving(false); }}>
                {t(`${K}.detail.save`)}
              </CapabilityButton>
            </div>
            {/* Batch 423 (SRS v2.1 step 7): the test-to-live gate. The pre-checks read the saved configuration. */}
            <RegistryGoLivePanel domain="screening" registryId={definition.id} registryName={t(`${K}.registries.${definition.labelId}`)}
              onChanged={() => { screeningRegistryConfigService.get(definition.id).then(r => { if (r.ok) setConfig(r.data); }); }} />
          </>
        )}
      </div>
    </div>
  );
};

export default CytologyRegistrySettingsSection;
