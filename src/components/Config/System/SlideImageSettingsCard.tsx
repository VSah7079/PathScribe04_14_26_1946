// src/components/Config/System/SlideImageSettingsCard.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 750 (Pete, Oct 31, 2026, S10): Configuration → System → Vendor Integrations → WSI Viewers → Slide images. The
// two addresses a slide's reference preview uses: the one that opens the slide in the laboratory's own digital
// pathology application, and the one its preview image comes from (the scanner or image system). Set for the
// laboratory, and for a facility with its own system. Templates with {{slideId}} and {{accession}}; never a patient
// name. Blank means "the deployment's" (VITE_SLIDE_VIEWER_URL_TEMPLATE, VITE_SLIDE_THUMBNAIL_URL_TEMPLATE). Saving needs
// config:vendor-integrations:manage (systemConfigChangeChecks.ts); the rules are in digitalPathology/slideImages.ts.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSystemConfig } from '@/contexts/SystemConfigContext';
import { facilityService } from '@/services';
import type { Facility } from '@/services/facilities/IFacilityService';
import {
  ACCESSION_PLACEHOLDER, DEFAULT_SLIDE_IMAGE_SETTINGS, SLIDE_ID_PLACEHOLDER, deploymentAddresses, validateSlideImageSettings,
  type SlideImageAddresses, type SlideImageSettings, type SlideImageSettingsError,
} from '@/services/digitalPathology/slideImages';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import '@/pathscribe.css';

const K = 'slideImageSettings';
const FIELDS = ['viewerUrlTemplate', 'thumbnailUrlTemplate'] as const;
const PLACEHOLDERS = { slidePlaceholder: SLIDE_ID_PLACEHOLDER, accessionPlaceholder: ACCESSION_PLACEHOLDER };

const SlideImageSettingsCard: React.FC = () => {
  const { t } = useTranslation();
  const { enterpriseConfig, updateEnterpriseConfig } = useSystemConfig();
  const [draft, setDraft] = useState<SlideImageSettings>(() => ({ ...DEFAULT_SLIDE_IMAGE_SETTINGS, ...enterpriseConfig.slideImages }));
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [errors, setErrors] = useState<SlideImageSettingsError[]>([]);
  const [refused, setRefused] = useState(false);
  const [saved, setSaved] = useState(false);
  const deployment = deploymentAddresses();

  useEffect(() => { void facilityService.getAll().then(r => { if (r.ok) setFacilities(r.data); }); }, []);

  const setLab = (field: keyof SlideImageAddresses, value: string) => { setDraft(d => ({ ...d, [field]: value })); setSaved(false); };
  const setFacility = (id: string, field: keyof SlideImageAddresses, value: string) => {
    setDraft(d => ({ ...d, facilityOverrides: { ...d.facilityOverrides, [id]: { ...d.facilityOverrides[id], [field]: value } } }));
    setSaved(false);
  };

  const addFacility = (id: string) => { setDraft(d => ({ ...d, facilityOverrides: { ...d.facilityOverrides, [id]: { viewerUrlTemplate: '', thumbnailUrlTemplate: '' } } })); setSaved(false); };
  const removeFacility = (id: string) => {
    setDraft(d => { const { [id]: _removed, ...rest } = d.facilityOverrides; return { ...d, facilityOverrides: rest }; });
    setSaved(false);
  };

  const save = async () => {
    const checked = validateSlideImageSettings(draft);
    if (!checked.ok) { setErrors(checked.errors); setRefused(false); return; }
    setErrors([]);
    const done = await updateEnterpriseConfig({ slideImages: checked.settings });
    setRefused(!done);
    setSaved(done);
    if (done) setTimeout(() => setSaved(false), 2000);
  };

  const problemsFor = (scope: string) => errors.filter(e => e.scope === scope).map(e => (
    <p key={`${e.scope}-${e.field}`} className="ps-mmrules-problem" role="alert">
      {t(`${K}.problemLine`, { field: t(`${K}.fields.${e.field}`), problem: t(`${K}.problems.${e.problem}`, PLACEHOLDERS) })}
    </p>
  ));

  return (
    <div className="ps-conf-card ps-conf-card--spaced">
      <div className="ps-conf-card-title">{t(`${K}.title`)}</div>
      <p className="ps-conf-card-description--tight">{t(`${K}.description`)}</p>
      <p className="ps-conf-field-hint">{t(`${K}.placeholdersHint`, PLACEHOLDERS)}</p>

      <div className="ps-aivendor-editor">
        <div className="ps-conf-card-title">{t(`${K}.labTitle`)}</div>
        {FIELDS.map(field => (
          <React.Fragment key={field}>
            <label className="ps-label" htmlFor={`slide-image-${field}`}>{t(`${K}.fields.${field}`)}</label>
            <input id={`slide-image-${field}`} type="text" className="ps-conf-input" value={draft[field]} onChange={e => setLab(field, e.target.value)} spellCheck={false} />
            <p className="ps-conf-field-hint">
              {deployment[field] ? t(`${K}.deploymentDefault`, { address: deployment[field] }) : t(`${K}.noDeploymentDefault`)}
            </p>
          </React.Fragment>
        ))}
        {problemsFor('lab')}
      </div>

      <div className="ps-conf-card-title">{t(`${K}.facilitiesTitle`)}</div>
      <p className="ps-conf-field-hint">{t(`${K}.facilitiesHint`)}</p>
      {/* Only the facilities that have their own addresses are listed; another is added from the list below. */}
      {facilities.filter(f => f.id in draft.facilityOverrides).map(f => (
        <div key={f.id} className="ps-aivendor-editor">
          <div className="ps-conf-row">
            <div className="ps-conf-card-title">{f.name}</div>
            <button type="button" className="ps-conf-btn-secondary" onClick={() => removeFacility(f.id)}>{t(`${K}.removeFacility`)}</button>
          </div>
          <div className="ps-aivendor-service">
            {FIELDS.map(field => (
              <input key={field} type="text" className="ps-conf-input" spellCheck={false}
                aria-label={t(`${K}.facilityFieldLabel`, { facility: f.name, field: t(`${K}.fields.${field}`) })}
                placeholder={t(`${K}.fields.${field}`)}
                value={draft.facilityOverrides[f.id]?.[field] ?? ''} onChange={e => setFacility(f.id, field, e.target.value)} />
            ))}
          </div>
          {problemsFor(f.id)}
        </div>
      ))}

      {facilities.some(f => !(f.id in draft.facilityOverrides)) && (
        <select className="ps-conf-input" aria-label={t(`${K}.addFacility`)} value="" onChange={e => { if (e.target.value) addFacility(e.target.value); }}>
          <option value="">{t(`${K}.addFacility`)}</option>
          {facilities.filter(f => !(f.id in draft.facilityOverrides)).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      )}

      <div className="ps-aiinstr-actions">
        <CapabilityButton capability="config:vendor-integrations:manage" className="ps-conf-btn-primary" onClick={() => { void save(); }}>{t(`${K}.save`)}</CapabilityButton>
      </div>
      {refused && <p className="ps-mmrules-problem" role="alert">{t(`${K}.problems.notPermitted`)}</p>}
      {saved && <div className="ps-concordance__saved">✓ {t(`${K}.saved`)}</div>}
    </div>
  );
};

export default SlideImageSettingsCard;
