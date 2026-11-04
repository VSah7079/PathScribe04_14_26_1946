// src/components/FacilityDictionary/OrganMapDeliverySetting.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 751 (Pete, Oct 31, 2026, Lab Workflow spec sections 12.3 and 12.4): Facility editor → LIS Integration →
// Organ map delivery, for a performing lab. On an Assist case the laboratory system writes the report, so PathScribe
// places no map in it; this setting says whether the map goes to that system anyway: Off (the default), Text only, or
// Text and image file (PNG or PDF, delivered through the interface engine to the destination named here). For the
// administrator only: the pathologist is never offered a choice. Saved with config:organ-map-delivery:manage (checked
// again in the facility service) and audited. The rules are in services/organMapping/organMapDelivery.ts.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { facilityService } from '@/services';
import type { Facility } from '@/services/facilities/IFacilityService';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { CONFIG_NOT_PERMITTED } from '@/services/authorization/guardConfigWrites';
import {
  ORGAN_MAP_DELIVERY_MODES, ORGAN_MAP_FILE_FORMATS, organMapDeliveryOf, validateOrganMapDelivery,
  type OrganMapDeliverySettings,
} from '@/services/organMapping/organMapDeliveryRules';

const K = 'organMapDelivery';

export const OrganMapDeliverySetting: React.FC<{ facility: Facility }> = ({ facility }) => {
  const { t } = useTranslation();
  const [saved, setSaved] = useState(() => organMapDeliveryOf(facility));
  const [draft, setDraft] = useState<OrganMapDeliverySettings>(saved);
  const [status, setStatus] = useState<{ ok: boolean; key: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const change = (patch: Partial<OrganMapDeliverySettings>) => { setDraft(d => ({ ...d, ...patch })); setStatus(null); };
  const changed = JSON.stringify(draft) !== JSON.stringify(saved);

  const save = async () => {
    const checked = validateOrganMapDelivery(draft);
    if (!checked.ok) { setStatus({ ok: false, key: `${K}.problems.${checked.problem}` }); return; }
    setBusy(true);
    const r = await facilityService.setOrganMapDelivery(facility.id, checked.settings);
    setBusy(false);
    if (r.ok) { setSaved(checked.settings); setDraft(checked.settings); setStatus({ ok: true, key: `${K}.saved` }); return; }
    setStatus({ ok: false, key: r.error === CONFIG_NOT_PERMITTED ? `${K}.problems.notPermitted` : `${K}.problems.saveFailed` });
  };

  return (
    <>
      <div className="cem-section cem-section--spaced">{t(`${K}.title`)}</div>
      <p className="cem-hint-sm">{t(`${K}.intro`)}</p>
      <label className="cem-label" htmlFor="omd-mode">{t(`${K}.modeLabel`)}</label>
      <select id="omd-mode" className="cem-input" value={draft.mode} onChange={e => change({ mode: e.target.value as OrganMapDeliverySettings['mode'] })}>
        {ORGAN_MAP_DELIVERY_MODES.map(m => <option key={m} value={m}>{t(`${K}.modes.${m}`)}</option>)}
      </select>
      {draft.mode === 'textAndFile' && (
        <>
          <label className="cem-label" htmlFor="omd-format">{t(`${K}.formatLabel`)}</label>
          <select id="omd-format" className="cem-input" value={draft.fileFormat} onChange={e => change({ fileFormat: e.target.value as OrganMapDeliverySettings['fileFormat'] })}>
            {ORGAN_MAP_FILE_FORMATS.map(f => <option key={f} value={f}>{t(`${K}.formats.${f}`)}</option>)}
          </select>
          <label className="cem-label" htmlFor="omd-destination">{t(`${K}.destinationLabel`)}</label>
          <input id="omd-destination" className="cem-input" value={draft.destination} spellCheck={false} onChange={e => change({ destination: e.target.value })} />
          <p className="cem-note">{t(`${K}.destinationHint`)}</p>
        </>
      )}
      <p className="cem-note">{t(`${K}.failureNote`)}</p>
      {status && <p className={status.ok ? 'cem-hint ps-facility-print-saved' : 'cem-note ps-facility-print-problem'} role="status">{t(status.key)}</p>}
      <div className="ps-facility-print-actions">
        <CapabilityButton capability="config:organ-map-delivery:manage" className="ps-conf-btn-primary" disabled={!changed || busy} onClick={() => { void save(); }}>
          {t(`${K}.save`)}
        </CapabilityButton>
      </div>
    </>
  );
};
