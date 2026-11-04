// src/components/Config/System/InkingValidationModeSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 484 (Structured Inking Sign-Out & Grossing Gate Logic Engine;
// PS-519 follow-up — "Organisation/Site admin UI, full build"). The one
// genuinely missing admin-UI piece confirmed by this batch's own research:
// services/grossing/inkingSiteSettings.ts's own getInkingValidationMode/
// setInkingValidationMode (Batch 480/481/482, re-scoped to facilityId —
// see that file's own header) has existed since Batch 480 with
// config:inking-validation-mode:manage already seeded, but has never had a
// real settings screen — until now, every site has silently stayed on the
// default WARN_ONLY with no way to opt into STRICT_ENFORCE.
//
// Deliberately NOT a new Organisation/Site entity or hierarchy — Facility
// already has the real, comprehensive admin UI (FacilityDictionary/),
// confirmed by this batch's own research as the actual, resolvable
// "Organisation/Site" link for a case (Case.order.facilityId). This
// section is facility-scoped only, same shape as every other per-facility
// override in this app's Config → System (see CancerRegistrySettingsSection.tsx's
// own facility-override list for the closest precedent).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../../pathscribe.css';
import { facilityService } from '@/services';
import { getInkingValidationMode, setInkingValidationMode } from '@/services/grossing/inkingSiteSettings';
import type { InkingValidationMode } from '@/services/grossing/resolveInkingValidationSeverity';
import type { Facility } from '@/services/facilities/IFacilityService';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { useAuth } from '@/contexts/AuthContext';
import { useReportConfigDirty } from '../configDirtyGuardContext';

const K = 'inkingValidationModeSection';
const MODES: InkingValidationMode[] = ['WARN_ONLY', 'STRICT_ENFORCE'];

const InkingValidationModeSection: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [facilityId, setFacilityId] = useState('');
  const [draft, setDraft] = useState<InkingValidationMode>('WARN_ONLY');
  const [saved, setSaved] = useState<InkingValidationMode>('WARN_ONLY');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => { void facilityService.getAll().then(r => { if (r.ok) { setFacilities(r.data); if (!facilityId && r.data[0]) setFacilityId(r.data[0].id); } }); }, [facilityId]);

  useEffect(() => {
    if (!facilityId) return;
    const mode = getInkingValidationMode(facilityId);
    setDraft(mode); setSaved(mode); setMessage(null);
  }, [facilityId]);

  const dirty = draft !== saved;
  useReportConfigDirty(dirty);

  const save = async () => {
    const result = await setInkingValidationMode(facilityId, draft, user?.name ?? user?.id);
    if (result.ok) { setSaved(draft); setMessage(t(`${K}.saved`)); }
    else setMessage(t(`${K}.notPermitted`));
  };

  return (
    <div className="ps-conf-section">
      <h2 className="ps-conf-section-title">{t(`${K}.title`)}</h2>
      <p className="ps-conf-section-subtitle">{t(`${K}.subtitle`)}</p>

      <div className="ps-conf-field">
        <label htmlFor="inking-mode-facility" className="ps-conf-label">{t(`${K}.facilityLabel`)}</label>
        <select id="inking-mode-facility" className="ps-conf-select" value={facilityId} onChange={e => setFacilityId(e.target.value)}>
          {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>

      {facilityId && (
        <>
          <div className="ps-conf-field">
            <label className="ps-conf-label">{t(`${K}.modeLabel`)}</label>
            {MODES.map(mode => (
              <label key={mode} className="ps-conf-toggle-label-row">
                <input type="radio" name="inking-validation-mode" className="ps-conf-radio-input" value={mode} checked={draft === mode} onChange={() => setDraft(mode)} />
                <span className="ps-conf-option-text">
                  {t(`${K}.modes.${mode}.label`)} — <span className="ps-conf-section-subtitle">{t(`${K}.modes.${mode}.hint`)}</span>
                </span>
              </label>
            ))}
          </div>
          <CapabilityButton capability="config:inking-validation-mode:manage" className="ps-conf-btn-primary" onClick={() => void save()} disabled={!dirty}>
            {t(`${K}.save`)}
          </CapabilityButton>
          {message && <p className="ps-conf-save-message">{message}</p>}
        </>
      )}
    </div>
  );
};

export default InkingValidationModeSection;
