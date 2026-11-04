// src/pages/SynopticReportPage/modals/TechnicalComponentFacilityField.tsx
// Batch 606 (PS-37): picks the facility that did the technical component when
// it is not the reporting lab. Saved straight to the case (independent of the
// team draft around it). The report then shows a second branding block.

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Case } from '@/types/case/Case';
import { facilityService, auditService } from '@/services';
import { useAuth } from '@/contexts/AuthContext';
import { technicalFacilityChoices } from '@/services/accessioning/resolveTechnicalFacilityOffer';
import { buildTechnicalFacilityAuditEntry } from '@/services/facilities/technicalFacilityAudit';
import type { Facility } from '@/services/facilities/IFacilityService';
import { updateCaseWithRetryOrThrow } from '@/services/cases/caseWrite';
import { caseRouter } from '@/services/cases/CaseRouter';

interface Props {
  caseData: Case;
  onUpdated: (updated: Case, version: number) => void;
}

const TechnicalComponentFacilityField: React.FC<Props> = ({ caseData, onUpdated }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const current = caseData.order?.technicalComponentFacilityId ?? '';

  useEffect(() => {
    facilityService.getAll().then(res => { if (res.ok) setFacilities(technicalFacilityChoices(res.data)); });
  }, []);

  const handleChange = async (facilityId: string) => {
    setSaving(true);
    setMessage(null);
    try {
      const r = await updateCaseWithRetryOrThrow(caseData.id, cur => ({
        order: { ...(cur.order ?? caseData.order), technicalComponentFacilityId: facilityId || undefined },
      }), caseRouter);
      if (r.ok) {
        const entry = buildTechnicalFacilityAuditEntry(caseData.id, current || undefined, facilityId || undefined, user?.name ?? 'unknown');
        if (entry) void auditService.logEvent(entry).catch(() => {});
        onUpdated({ ...caseData, order: { ...caseData.order, technicalComponentFacilityId: facilityId || undefined } }, r.version);
        setMessage(t('technicalComponentFacility.saved'));
      } else {
        setMessage(t('technicalComponentFacility.notSaved'));
      }
    } catch {
      setMessage(t('technicalComponentFacility.notSaved'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ps-ctm-technical-facility">
      <label className="ps-label" htmlFor="ctm-technical-facility">{t('technicalComponentFacility.label')}</label>
      <select id="ctm-technical-facility" className="ps-input-dark" value={current} disabled={saving}
        onChange={e => handleChange(e.target.value)}>
        <option value="">{t('technicalComponentFacility.none')}</option>
        {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
      </select>
      <span className="ps-helper-text">{message ?? t('technicalComponentFacility.help')}</span>
    </div>
  );
};

export default TechnicalComponentFacilityField;
