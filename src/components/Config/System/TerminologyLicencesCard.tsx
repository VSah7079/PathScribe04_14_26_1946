// src/components/Config/System/TerminologyLicencesCard.tsx
// ─────────────────────────────────────────────────────────────────────
// Batch 623 (PS-130): Configuration → System → Code Systems → Licensed terminologies. The
// customer records the SNOMED CT and ICD-O-3 licences it holds (holder, edition, reference,
// expiry). Real codes entered on abnormal-result rules are used only while the matching licence
// is on and unexpired; PathScribe ships no code sets. The rules are in
// services/terminologyLicence/; saving needs config:code-systems:manage (checked when the
// enterprise settings change, systemConfigChangeChecks.ts).
// ─────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSystemConfig } from '@/contexts/SystemConfigContext';
import {
  LICENSED_SYSTEMS, licenceDraftsOf, licenceStatus, todayIso, validateLicences,
  type LicenceError,
} from '@/services/terminologyLicence/terminologyLicence';
import type { LicensedTerminologySystem, TerminologyLicence } from '@app-types/config/EnterpriseConfig';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { formatDate } from '@/utils/formatDate';
import '@/pathscribe.css';

const K = 'terminologyLicences';

const TerminologyLicencesCard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { enterpriseConfig, updateEnterpriseConfig } = useSystemConfig();
  const [drafts, setDrafts] = useState(() => licenceDraftsOf(enterpriseConfig.terminologyLicences));
  const [errors, setErrors] = useState<Partial<Record<LicensedTerminologySystem, LicenceError[]>>>({});
  const [refused, setRefused] = useState(false);
  const [saved, setSaved] = useState(false);
  const today = todayIso();

  const set = (system: LicensedTerminologySystem, patch: Partial<TerminologyLicence>) => {
    setDrafts(d => ({ ...d, [system]: { ...d[system], ...patch } }));
    setSaved(false);
  };

  const save = async () => {
    const checked = validateLicences(drafts);
    if (!checked.ok) { setErrors(checked.errors); setRefused(false); return; }
    setErrors({});
    const done = await updateEnterpriseConfig({ terminologyLicences: checked.licences });
    setRefused(!done);
    setSaved(done);
    if (done) setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="ps-conf-card ps-conf-card--spaced">
      <div className="ps-conf-card-title">{t(`${K}.title`)}</div>
      <p className="ps-conf-card-description--tight">{t(`${K}.description`)}</p>
      <p className="ps-conf-field-hint">{t(`${K}.notShipped`)}</p>

      {LICENSED_SYSTEMS.map(system => {
        const d = drafts[system];
        const status = licenceStatus(enterpriseConfig.terminologyLicences?.[system], today);
        const saidExpired = status === 'expired' ? enterpriseConfig.terminologyLicences?.[system]?.expiresOn : undefined;
        return (
          <div key={system} className="ps-aivendor-editor">
            <div className="ps-conf-card-title">{t(`${K}.system.${system}`)}</div>
            <p className="ps-conf-field-hint">
              {t(`${K}.status.${status}`, { date: saidExpired ? formatDate(saidExpired, i18n.language) : '' })}
            </p>
            <label className="ps-conf-toggle-label-row">
              <input type="checkbox" checked={d.enabled} onChange={e => set(system, { enabled: e.target.checked })} />
              <span className="ps-conf-option-text">{t(`${K}.enabledLabel`)}</span>
            </label>
            <div className="ps-aivendor-service">
              <input type="text" className="ps-conf-input" aria-label={t(`${K}.holderLabel`)} value={d.holder} onChange={e => set(system, { holder: e.target.value })} />
              <input type="text" className="ps-conf-input" aria-label={t(`${K}.editionLabel`)} value={d.edition} onChange={e => set(system, { edition: e.target.value })} />
              <input type="text" className="ps-conf-input" aria-label={t(`${K}.referenceLabel`)} value={d.reference} onChange={e => set(system, { reference: e.target.value })} />
              <input type="date" className="ps-conf-input" aria-label={t(`${K}.expiresLabel`)} value={d.expiresOn} onChange={e => set(system, { expiresOn: e.target.value })} />
            </div>
            <p className="ps-conf-field-hint">{t(`${K}.fieldsHint`)}</p>
            {(errors[system] ?? []).map(err => (
              <p key={err} className="ps-mmrules-problem" role="alert">{t(`${K}.problems.${err}`)}</p>
            ))}
          </div>
        );
      })}

      <div className="ps-aiinstr-actions">
        <CapabilityButton capability="config:code-systems:manage" className="ps-conf-btn-primary" onClick={() => { void save(); }}>{t(`${K}.save`)}</CapabilityButton>
      </div>
      {refused && <p className="ps-mmrules-problem" role="alert">{t(`${K}.problems.notPermitted`)}</p>}
      {saved && <div className="ps-concordance__saved">✓ {t(`${K}.saved`)}</div>}
    </div>
  );
};

export default TerminologyLicencesCard;
