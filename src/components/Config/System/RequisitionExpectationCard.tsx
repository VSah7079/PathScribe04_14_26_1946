// src/components/Config/System/RequisitionExpectationCard.tsx
// Batch 762 (Pete, Nov 2, 2026): which cases are expected to have a scanned requisition, and after how many hours one
// with none is flagged (a Missing Requisition case deficiency), and after how many hours a scan with no case is flagged.
// By default every case except an electronic HIS order, 24 hours each.
// The organisation default, and each performing facility's own. Saving needs config:requisition-ingestion:manage.
import React from 'react';
import { useTranslation } from 'react-i18next';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { useRequisitionExpectations } from '@/hooks/useRequisitionExpectations';
import { REQUISITION_ORIGINS } from '@/services';

const K = 'requisitionIngestion.expected';

export const RequisitionExpectationCard: React.FC<{ facilities: { id: string; name: string }[] }> = ({ facilities }) => {
  const { t } = useTranslation();
  const x = useRequisitionExpectations();
  if (!x.loaded) return null;
  return (
    <section className="ps-req-card ps-req-form" aria-labelledby="ps-req-expected-title">
      <div id="ps-req-expected-title" className="ps-req-card-title">{t(`${K}.title`)}</div>
      <p className="ps-req-hint">{t(`${K}.hint`)}</p>
      <label className="ps-req-field">
        <span>{t(`${K}.scope`)}</span>
        <select className="ps-req-select" value={x.facilityId ?? ''} onChange={e => x.setFacilityId(e.target.value || null)}>
          <option value="">{t(`${K}.organisationDefault`)}</option>
          {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        {x.usesDefault && <span className="ps-req-hint">{t(`${K}.usesDefault`)}</span>}
      </label>
      <fieldset className="ps-req-fieldset">
        <legend className="ps-req-field">{t(`${K}.origins`)}</legend>
        {REQUISITION_ORIGINS.map(o => (
          <label key={o} className="ps-req-check">
            <input type="checkbox" checked={x.draft.expected[o]} onChange={() => x.toggle(o)} />
            <span>{t(`requisitions.origins.${o}`)}</span>
          </label>
        ))}
      </fieldset>
      <label className="ps-req-field">
        <span>{t(`${K}.graceHours`)}</span>
        <input className="ps-req-input ps-req-input--short" type="number" min={0} max={720} value={x.draft.graceHours} aria-invalid={!x.valid}
          onChange={e => x.setGraceHours(Number(e.target.value))} />
        <span className="ps-req-hint">{t(`${K}.graceHint`)}</span>
      </label>
      <label className="ps-req-field">
        <span>{t(`${K}.unmatchedHours`)}</span>
        <input className="ps-req-input ps-req-input--short" type="number" min={0} max={720} value={x.draft.unmatchedAlertHours} aria-invalid={!x.valid}
          onChange={e => x.setUnmatchedAlertHours(Number(e.target.value))} />
        <span className="ps-req-hint">{t(`${K}.unmatchedHint`)}</span>
      </label>
      {x.problem && <p className="ps-req-problem" role="alert">{t('requisitionIngestion.problem')}</p>}
      {x.notice && <p className="ps-req-note" role="status">{t('requisitionIngestion.saved')}</p>}
      <div className="ps-req-card-row">
        <span />
        <CapabilityButton capability="config:requisition-ingestion:manage" className="ps-btn-primary" disabled={!x.valid} onClick={() => { void x.save(); }}>
          {t(`${K}.save`)}
        </CapabilityButton>
      </div>
    </section>
  );
};

export default RequisitionExpectationCard;
