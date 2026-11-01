// src/components/FacilityDictionary/FacilityOutboundDocumentsSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The Facility editor's LIS Integration tab, Outbound documents (a performing lab's settings for what goes to its
// laboratory system). Moved out of FacilityEditorModal.tsx in Batch 751 (CLAUDE.md rule 10) with no change:
//   • Batch 427: "Send one combined PDF per case" (part of the facility form, saved with it).
//   • Batch 751 (spec section 12.3): Organ map delivery (OrganMapDeliverySetting), saved on its own with
//     config:organ-map-delivery:manage, once the facility exists.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Facility } from '@/services/facilities/IFacilityService';
import { OrganMapDeliverySetting } from './OrganMapDeliverySetting';

interface Props {
  consolidateOutboundPdfs: boolean;
  onConsolidateChange: (value: boolean) => void;
  /** The saved facility (absent while a new one is being added). */
  facility?: Facility;
}

export const FacilityOutboundDocumentsSection: React.FC<Props> = ({ consolidateOutboundPdfs, onConsolidateChange, facility }) => {
  const { t } = useTranslation();
  return (
    <>
      <div className="cem-section">{t('facilityEditorModal.lis.outboundDocuments')}</div>
      <label className="ps-fem-check">
        <input type="checkbox" checked={consolidateOutboundPdfs} onChange={e => onConsolidateChange(e.target.checked)} />
        {t('facilityEditorModal.lis.consolidateOutboundPdfs')}
      </label>
      <p className="cem-note">{t('facilityEditorModal.lis.consolidateOutboundPdfsNote')}</p>
      {facility?.id && <OrganMapDeliverySetting facility={facility} />}
    </>
  );
};
