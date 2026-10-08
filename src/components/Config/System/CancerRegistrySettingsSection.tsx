// src/components/Config/System/CancerRegistrySettingsSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Configuration → System → Cancer Registry Reporting. Which population cancer
// registry a facility's confirmed surgical diagnoses are reported to: an
// enterprise default and optional facility overrides.
//
// Batch 422 rebuilt it on the registry definitions
// (services/cancerRegistry/cancerRegistryDefinitions.ts: thirteen registries,
// five new) and the permission-checked saves (saveCancerRegistrySettings.ts,
// config:cancer-registry:manage, audited). Before, it imported the mock stores
// directly and saved with no permission check or audit; it is off the
// deployment baseline now. The enterprise card also sets the environment
// (test / production) and whether the jurisdiction honours a patient's
// opt-out, which the services have read since Batches 418–419 with no control.
// Batch 423: the test / live selector is replaced by the go-live panel
// (components/Config/RegistryGoLive/), for the enterprise registry and any
// registry a facility override reports to.
// Rendering only.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../../pathscribe.css';
import { toast } from 'react-toastify';
import {
  cancerRegistrySettingsDeps, cancerRegistrySettingsService, facilityCancerRegistryOverrideService, facilityService,
  saveEnterpriseCancerRegistry, saveFacilityCancerRegistry,
} from '@/services';
import { useAuth } from '@/contexts/AuthContext';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { CANCER_REGISTRY_DEFINITIONS, cancerRegistryDefinition } from '@/services/cancerRegistry/cancerRegistryDefinitions';
import type { CancerRegistryId, CancerRegistrySettingsConfig } from '@/services/cancerRegistry/ICancerRegistrySettingsService';
import type { FacilityCancerRegistryOverride } from '@/services/cancerRegistry/IFacilityCancerRegistryOverrideService';
import type { Facility } from '@/services/facilities/IFacilityService';
import { IDENTIFIER_FORMAT_LIBRARY } from '@/types/systemConfig';
import { RegistryGoLivePanel } from '@/components/Config/RegistryGoLive/RegistryGoLivePanel';
import { cancerRegistriesInUse } from '@/services/cancerRegistry/resolveEffectiveCancerRegistrySettings';
import { useReportConfigDirty } from '../configDirtyGuardContext';

const K = 'cancerRegistrySection';
const REGISTRY_IDS: CancerRegistryId[] = ['none', ...CANCER_REGISTRY_DEFINITIONS.map(d => d.id)];
const labelKey = (id: CancerRegistryId) => `${K}.registries.${id === 'none' ? 'none' : cancerRegistryDefinition(id)!.labelId}`;
const DEFAULT: CancerRegistrySettingsConfig = { registryId: 'none', environment: 'test', honoursPatientOptOut: false };

export const CancerRegistrySettingsSection: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const actor = { id: user?.id ?? '', name: user?.name ?? '' };
  const [draft, setDraft] = useState<CancerRegistrySettingsConfig>(DEFAULT);
  const [saved, setSaved] = useState<CancerRegistrySettingsConfig>(DEFAULT);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [overrides, setOverrides] = useState<FacilityCancerRegistryOverride[]>([]);
  const [adding, setAdding] = useState<{ facilityId: string; registryId: CancerRegistryId } | null>(null);
  const [saving, setSaving] = useState(false);
  const [goLiveRegistry, setGoLiveRegistry] = useState<CancerRegistryId | null>(null);

  const refresh = async () => {
    const r = await cancerRegistrySettingsService.get();
    if (r.ok) { const v = { ...DEFAULT, ...r.data }; setDraft(v); setSaved(v); }
    const f = await facilityService.getAll();
    if (!f.ok) return;
    setFacilities(f.data);
    const all = await Promise.all(f.data.map(x => facilityCancerRegistryOverrideService.getForFacility(x.id)));
    setOverrides(all.filter((o): o is { ok: true; data: FacilityCancerRegistryOverride } => o.ok && !!o.data).map(o => o.data));
  };
  useEffect(() => { refresh(); }, []);

  const report = (outcome: string) => {
    if (outcome === 'saved') toast.success(t(`${K}.saved`));
    else toast.error(t(outcome === 'notPermitted' ? `${K}.notPermitted` : `${K}.unknownRegistry`));
  };
  const saveEnterprise = async () => {
    setSaving(true);
    try { report(await saveEnterpriseCancerRegistry(draft, actor, cancerRegistrySettingsDeps)); await refresh(); } finally { setSaving(false); }
  };
  const saveFacility = async (facilityId: string, registryId: CancerRegistryId | null) => {
    report(await saveFacilityCancerRegistry(facilityId, registryId, actor, cancerRegistrySettingsDeps));
    setAdding(null);
    await refresh();
  };

  const facilityName = (id: string) => facilities.find(f => f.id === id)?.name ?? id;
  const definition = draft.registryId === 'none' ? undefined : cancerRegistryDefinition(draft.registryId);
  const identifierLabel = definition?.patientIdentifierFormatId ? IDENTIFIER_FORMAT_LIBRARY.find(f => f.id === definition.patientIdentifierFormatId)?.label : undefined;
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  // PS-128 (Batch 437): unsaved changes keep you from leaving without a warning.
  useReportConfigDirty(dirty);
  const options = REGISTRY_IDS.map(id => <option key={id} value={id}>{t(labelKey(id))}</option>);
  const inUse = cancerRegistriesInUse(saved.registryId, overrides.map(o => o.overrides.registryId));
  const goLiveId = inUse.find(id => id === goLiveRegistry) ?? inUse[0];

  return (
    <div className="ps-conf-page">
      <h2 className="ps-conf-section-title">{t(`${K}.title`)}</h2>
      <p className="ps-conf-section-subtitle ps-conf-section-subtitle--spaced">{t(`${K}.subtitle`)}</p>

      <div className="ps-conf-card ps-conf-card--spaced">
        <div className="ps-conf-card-title">{t(`${K}.enterpriseCard.title`)}</div>
        <div className="ps-conf-row-actions">
          <select className="ps-conf-select" value={draft.registryId} onChange={e => setDraft({ ...draft, registryId: e.target.value as CancerRegistryId })}>{options}</select>
        </div>
        {definition && (
          <div className="ps-registry-facts">
            <span className={`ps-registry-badge ps-registry-badge--${definition.specStatus}`}>{t(`${K}.specStatus.${definition.specStatus}`)}</span>
            <span>{t(`${K}.detail.jurisdictions`, { list: definition.jurisdictions.map(j => t(`jurisdictionNames.${j}`)).join(', ') })}</span>
            <span>{t(`${K}.detail.identifier`, { identifier: identifierLabel ?? t(`${K}.detail.demographics`) })}</span>
            <span>{t(`${K}.detail.wireFormat`, { format: t(`${K}.wireFormats.${definition.wireFormat}`) })}</span>
          </div>
        )}
        {definition?.specStatus === 'configurable' && <div className="ps-registry-note">{t(`${K}.detail.configurableNote`)}</div>}
        <label className="ps-registry-check">
          <input type="checkbox" checked={!!draft.honoursPatientOptOut} onChange={e => setDraft({ ...draft, honoursPatientOptOut: e.target.checked })} />
          {t(`${K}.honoursOptOut`)}
        </label>
        <div className="ps-registry-note">{t(`${K}.honoursOptOutNote`)}</div>
        <div className="ps-conf-row-actions">
          <CapabilityButton capability="config:cancer-registry:manage" className="ps-conf-btn-primary" onClick={saveEnterprise} disabled={saving || !dirty}>{t(`${K}.save`)}</CapabilityButton>
          {dirty && <span className="ps-conf-saving-indicator">{t(`${K}.unsavedChange`)}</span>}
        </div>
      </div>

      {goLiveId && (
        <div className="ps-conf-card ps-conf-card--spaced">
          {inUse.length > 1 && (
            <label className="ps-golive-field">
              <span>{t(`${K}.goLiveRegistry`)}</span>
              <select className="ps-conf-select" value={goLiveId} onChange={e => setGoLiveRegistry(e.target.value as CancerRegistryId)}>
                {inUse.map(id => <option key={id} value={id}>{t(labelKey(id))}</option>)}
              </select>
            </label>
          )}
          {/* Batch 423 (SRS v2.1 step 7): the test-to-live gate. One environment for the enterprise; each registry is approved on its own. */}
          <RegistryGoLivePanel key={goLiveId} domain="cancer" registryId={goLiveId} registryName={t(labelKey(goLiveId))} onChanged={refresh} />
        </div>
      )}

      <div className="ps-conf-card ps-conf-card--spaced">
        <div className="ps-conf-row">
          <div className="ps-conf-card-title">{t(`${K}.facilityCard.title`)}</div>
          {!adding && (
            <CapabilityButton capability="config:cancer-registry:manage" className="ps-conf-btn-secondary"
              onClick={() => setAdding({ facilityId: facilities[0]?.id ?? '', registryId: draft.registryId })}>{t(`${K}.addOverride`)}</CapabilityButton>
          )}
        </div>
        {overrides.map(o => (
          <div key={o.id} className="ps-conf-row">
            <span className="ps-conf-value">{facilityName(o.facilityId)}</span>
            <div className="ps-conf-row-actions">
              <span className="ps-conf-value">{o.overrides.registryId ? t(labelKey(o.overrides.registryId)) : '—'}</span>
              <CapabilityButton capability="config:cancer-registry:manage" className="ps-conf-btn-secondary" onClick={() => saveFacility(o.facilityId, null)}>{t(`${K}.remove`)}</CapabilityButton>
            </div>
          </div>
        ))}
        {overrides.length === 0 && !adding && <div className="ps-conf-empty-row">{t(`${K}.noOverrides`)}</div>}
        {adding && (
          <div className="ps-conf-row">
            <select className="ps-conf-select" value={adding.facilityId} onChange={e => setAdding({ ...adding, facilityId: e.target.value })}>
              {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <div className="ps-conf-row-actions">
              <select className="ps-conf-select" value={adding.registryId} onChange={e => setAdding({ ...adding, registryId: e.target.value as CancerRegistryId })}>{options}</select>
              <CapabilityButton capability="config:cancer-registry:manage" className="ps-conf-btn-primary" onClick={() => saveFacility(adding.facilityId, adding.registryId)}>{t(`${K}.save`)}</CapabilityButton>
              <button className="ps-conf-btn-secondary" onClick={() => setAdding(null)}>{t(`${K}.cancel`)}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CancerRegistrySettingsSection;
