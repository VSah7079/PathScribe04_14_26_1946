// src/components/Common/NhsNumberBadge.tsx
// Batch 662. The patient's NHS number with a status icon and tooltip. Presentation only:
// what the status means is decided by services/patients/patientNhsNumberStatus.ts.
// The icon takes keyboard focus and shows the same explanation as a visible tooltip on
// focus or hover (Escape closes it), so it does not depend on a mouse.
import React, { useEffect, useRef, useState } from 'react';
import { actionRegistryService } from '@/services';
import { useTranslation } from 'react-i18next';
import type { NationalPatientIdentifier } from '@/types/patient/NationalPatientIdentifier';
import { nhsNumberForBanner } from '@/services/patients/patientNhsNumberStatus';
import './nhsNumberBadge.css';

const ICON: Record<string, string> = { verified: '✓✓', checkOnly: '◈', invalid: '!', unchecked: '?' };

export const NhsNumberBadge: React.FC<{ identifiers: readonly NationalPatientIdentifier[] | undefined }> = ({ identifiers }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const iconRef = useRef<HTMLSpanElement>(null);
  // Voice or hotkey: 'SHOW_NHS_STATUS' (Show NHS Number Status) moves focus to the icon, which opens the explanation.
  useEffect(() => actionRegistryService.onAction((actionId: string) => { if (actionId === 'SHOW_NHS_STATUS') iconRef.current?.focus(); }), []);
  const nhs = nhsNumberForBanner(identifiers);
  if (!nhs) return null;
  const tip = t(nhs.tooltipKey) + (nhs.statusCode ? ` ${t('nationalIdentifiers.banner.statusCode', { code: nhs.statusCode })}` : '');
  return (
    <span className="ps-nhs-badge">
      <span data-phi="nhs">{nhs.value}</span>
      <span
        ref={iconRef}
        className={`ps-nhs-badge__icon ps-nhs-badge__icon--${nhs.status}`}
        role="img" tabIndex={0} aria-label={tip} aria-describedby={open ? 'ps-nhs-tip' : undefined} title={tip}
        onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
        onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }}
      >{ICON[nhs.status]}</span>
      {open && <span id="ps-nhs-tip" role="tooltip" className="ps-nhs-badge__tip">{tip}</span>}
    </span>
  );
};

export default NhsNumberBadge;
