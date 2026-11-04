// src/components/Config/System/BillingReleaseTestPanel.tsx
// Batch 619 (PS-800): "what would happen to this charge?" against the rules as they are now. Same logic as the queue's.
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Facility } from '../../../services/facilities/IFacilityService';
import { BILLING_TYPES, decideRelease, type BillingChargeFacts, type BillingReleaseRule, type BillingType, type ReleaseDecision } from '../../../services/billingRelease/billingRelease';
import { zonedInstant } from '../../../services/deliverySchedules/deliverySchedule';

const toIso = (local: string) => zonedInstant(local.slice(0, 10), local.slice(11, 16), 'UTC').toISOString();

const BillingReleaseTestPanel: React.FC<{ rules: BillingReleaseRule[]; facilities: Facility[] }> = ({ rules, facilities }) => {
  const { t } = useTranslation();
  const [billingType, setBillingType] = useState<BillingType>('26');
  const [caseType, setCaseType] = useState('');
  const [facilityId, setFacilityId] = useState('');
  const [amended, setAmended] = useState(false);
  const [delta, setDelta] = useState(false);
  const [mapped, setMapped] = useState(true);
  const [techMissing, setTechMissing] = useState(false);
  const [signedOut, setSignedOut] = useState(true);
  const [generated, setGenerated] = useState('2026-10-19T08:00');
  const [signedAt, setSignedAt] = useState('2026-10-19T09:00');
  const [when, setWhen] = useState('2026-10-19T10:00');
  const [shown, setShown] = useState<ReleaseDecision | null>(null);
  const run = () => {
    const facts: BillingChargeFacts = {
      billingType, ...(caseType.trim() ? { caseType: caseType.trim() } : {}), ...(facilityId ? { performingFacilityId: facilityId } : {}),
      amended, amendmentDelta: delta, cptMapped: mapped, technicalFacilityMissing: techMissing,
      generatedAt: toIso(generated), ...(signedOut ? { signedOutAt: toIso(signedAt) } : {}),
    };
    setShown(decideRelease(rules, facts, new Date(toIso(when))));
  };
  const check = (id: string, label: string, value: boolean, set: (v: boolean) => void) => (
    <label className="ps-dsch-day" htmlFor={id}><input id={id} type="checkbox" checked={value} onChange={e => set(e.target.checked)} />{t(label)}</label>
  );
  const at = shown?.scheduledReleaseAt ? new Intl.DateTimeFormat(undefined, { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(shown.scheduledReleaseAt)) : null;
  return (
    <div className="ps-dsch-test">
      <div className="ps-rr-test-title">{t('billingReleaseSection.test.title')}</div>
      <div className="ps-rr-test-subtitle">{t('billingReleaseSection.test.subtitle')}</div>
      <label className="ps-conf-label" htmlFor="brr-t-type">{t('billingReleaseSection.test.billingType')}</label>
      <select id="brr-t-type" className="ps-conf-select" value={billingType} onChange={e => setBillingType(e.target.value as BillingType)}>
        {BILLING_TYPES.map(b => <option key={b} value={b}>{t(`billingReleaseSection.types.${b}`)}</option>)}
      </select>
      <label className="ps-conf-label" htmlFor="brr-t-case">{t('billingReleaseSection.test.caseType')}</label>
      <input id="brr-t-case" className="ps-conf-input" value={caseType} onChange={e => setCaseType(e.target.value)} />
      <label className="ps-conf-label" htmlFor="brr-t-fac">{t('billingReleaseSection.test.facility')}</label>
      <select id="brr-t-fac" className="ps-conf-select" value={facilityId} onChange={e => setFacilityId(e.target.value)}>
        <option value="">{t('billingReleaseSection.test.noFacility')}</option>
        {facilities.map(f => <option key={f.id as string} value={f.id as string}>{f.name}</option>)}
      </select>
      {check('brr-t-amended', 'billingReleaseSection.test.amended', amended, setAmended)}
      {check('brr-t-delta', 'billingReleaseSection.test.amendmentDelta', delta, setDelta)}
      {check('brr-t-mapped', 'billingReleaseSection.test.cptMapped', mapped, setMapped)}
      {check('brr-t-tech', 'billingReleaseSection.test.technicalMissing', techMissing, setTechMissing)}
      <label className="ps-conf-label" htmlFor="brr-t-gen">{t('billingReleaseSection.test.generatedAt')}</label>
      <input id="brr-t-gen" type="datetime-local" className="ps-conf-input" value={generated} onChange={e => setGenerated(e.target.value)} />
      {check('brr-t-signed', 'billingReleaseSection.test.signedOut', signedOut, setSignedOut)}
      {signedOut && (
        <>
          <label className="ps-conf-label" htmlFor="brr-t-signedat">{t('billingReleaseSection.test.signedOutAt')}</label>
          <input id="brr-t-signedat" type="datetime-local" className="ps-conf-input" value={signedAt} onChange={e => setSignedAt(e.target.value)} />
        </>
      )}
      <label className="ps-conf-label" htmlFor="brr-t-when">{t('billingReleaseSection.test.when')}</label>
      <input id="brr-t-when" type="datetime-local" className="ps-conf-input" value={when} onChange={e => setWhen(e.target.value)} />
      <button className="ps-conf-btn-primary" onClick={run}>{t('billingReleaseSection.test.run')}</button>
      {shown && (
        <div className="ps-dsch-result" role="status">
          <div className="ps-dsch-result-value">{t(`billingReleaseSection.test.states.${shown.state}`)}</div>
          <div>{t(`billingReleaseSection.reasons.${shown.reason}`)}</div>
          {shown.needsReview && <div>{t(`billingReleaseSection.review.${shown.needsReview}`)}</div>}
          <div>{t(`billingReleaseSection.source.${shown.source}`)}</div>
          {at && <div>{t('billingReleaseSection.test.scheduledFor', { when: at })}</div>}
        </div>
      )}
    </div>
  );
};

export default BillingReleaseTestPanel;
