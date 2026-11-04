// src/components/FacilityDictionary/DirectPrintingSetting.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 734 (Pete, Oct 30, 2026; Lab Workflow spec Decision 6). On the Facility
// editor's Printing tab: whether this facility lets labels and reports go from
// the browser straight to a printer (QZ Tray, the PathScribe Agent, Zebra
// Browser Print, BarTender). Off by default in a server deployment; the
// interface engine and the browser print dialog always work. Changing it needs
// config:direct-device-printing:manage (checked again in the facility service)
// and is audited; each direct print is audited too
// (services/printing/directDevicePrinting.ts).
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { facilityService } from '@/services';
import type { Facility } from '@/services/facilities/IFacilityService';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { CONFIG_NOT_PERMITTED } from '@/services/authorization/guardConfigWrites';

interface Props {
  facility: Facility;
  onSaved?: (facility: Facility) => void;
}

export const DirectPrintingSetting: React.FC<Props> = ({ facility, onSaved }) => {
  const { t } = useTranslation();
  const [allowed, setAllowed] = useState(!!facility.allowDirectDevicePrinting);
  const [status, setStatus] = useState<{ ok: boolean; key: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const changed = allowed !== !!facility.allowDirectDevicePrinting;

  const save = async () => {
    setSaving(true);
    const r = await facilityService.setDirectDevicePrinting(facility.id, allowed);
    setSaving(false);
    if (r.ok) { setStatus({ ok: true, key: 'directPrinting.saved' }); onSaved?.(r.data); return; }
    setStatus({ ok: false, key: r.error === CONFIG_NOT_PERMITTED ? 'directPrinting.notPermitted' : 'directPrinting.saveFailed' });
  };

  return (
    <>
      <div className="cem-section cem-section--spaced">{t('directPrinting.title')}</div>
      <p className="cem-hint-sm">{t('directPrinting.intro')}</p>
      <label className="cem-toggle-row">
        <input type="checkbox" className="cem-checkbox-toggle" checked={allowed} onChange={e => { setAllowed(e.target.checked); setStatus(null); }} />
        <span className="cem-toggle-label--bold">{t('directPrinting.allow')}</span>
      </label>
      {status && <p className={status.ok ? 'cem-hint ps-facility-print-saved' : 'cem-note ps-facility-print-problem'} role="status">{t(status.key)}</p>}
      <div className="ps-facility-print-actions">
        <CapabilityButton capability="config:direct-device-printing:manage" className="ps-conf-btn-primary" disabled={!changed || saving} onClick={() => { void save(); }}>
          {t('directPrinting.save')}
        </CapabilityButton>
      </div>
    </>
  );
};
