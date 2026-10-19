// src/components/Config/System/BillingReleaseSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 619 (PS-800): Configuration > System > Billing Release. A charge is generated at its milestone
// (Billing Type Trigger); these rules decide when it is RELEASED from the Outbound Queue to billing:
// at once, after a review hold, in a batch, or only when a person releases it. Rules are set for the
// whole enterprise and a performing facility may have its own. Logic: services/billingRelease/billingRelease.ts.
// Contract: docs/architecture/BILLING_RELEASE_API.md
// ─────────────────────────────────────────────────────────────────────────────
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../../pathscribe.css';
import './DeliverySchedulesSection.css';

import { billingReleaseService, facilityService } from '@/services';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { LoadingState } from '@/components/Common/LoadingState';
import type { Facility } from '../../../services/facilities/IFacilityService';
import { toReleaseSchedule, type BillingReleaseRule } from '../../../services/billingRelease/billingRelease';
import { WEEKDAY_KEYS } from './deliveryScheduleForm';
import { draftFromRule, toInput } from './billingReleaseForm';
import BillingReleaseEditor, { BILLING_RELEASE_CAPABILITY } from './BillingReleaseEditor';
import BillingReleaseTestPanel from './BillingReleaseTestPanel';

const Summary: React.FC<{ rule: BillingReleaseRule; facilities: Facility[] }> = ({ rule, facilities }) => {
  const { t } = useTranslation();
  const { criteria: c, action: a } = rule;
  const who = [
    c.caseTypes.length ? t('billingReleaseSection.summary.caseTypes', { types: c.caseTypes.join(', ') }) : null,
    c.orderingSiteId ? t('billingReleaseSection.summary.site', { site: facilities.find(f => f.id === c.orderingSiteId)?.name ?? c.orderingSiteId }) : null,
    c.primaryPathologistId ? t('billingReleaseSection.summary.pathologist', { id: c.primaryPathologistId }) : null,
    c.amendment !== 'any' ? t(`billingReleaseSection.amendment.${c.amendment}`) : null,
  ].filter(Boolean).join(' · ');
  const b = a.batchSchedule;
  const when = !a.autoReleaseOnComplete ? t('billingReleaseSection.summary.manual')
    : a.releaseMode === 'SCHEDULED_BATCH' && b
      ? t('billingReleaseSection.summary.batch', {
        days: b.batchFrequency === 'daily' ? t('deliverySchedulesSection.frequencies.daily') : b.batchDays.map(d => t(`deliverySchedulesSection.weekdays.${WEEKDAY_KEYS[d]}`)).join(' '),
        times: b.batchTimes.join(', '), zone: b.timeZone,
      })
      : a.holdDurationMinutes === 0 ? t('billingReleaseSection.summary.atMilestone') : t('billingReleaseSection.summary.hold', { minutes: a.holdDurationMinutes });
  const cron = toReleaseSchedule(rule).batchScheduleCron;
  return (
    <>
      {when}
      {who && <> · {who}</>}
      {a.manualReviewRequired && <> · {t('billingReleaseSection.summary.review')}</>}
      {a.releaseMode === 'SCHEDULED_BATCH' && cron && <> · {t('billingReleaseSection.summary.cron', { cron })}</>}
    </>
  );
};

const BillingReleaseSection: React.FC = () => {
  const { t } = useTranslation();
  const [rules, setRules] = useState<BillingReleaseRule[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [scopeId, setScopeId] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ rule: BillingReleaseRule | null } | null>(null);
  const [status, setStatus] = useState<'saved' | 'refused' | null>(null);

  const load = useCallback(async () => {
    const [r, f] = await Promise.all([billingReleaseService.getAll(), facilityService.getAll()]);
    if (r.ok) setRules(r.data);
    if (f.ok) setFacilities((f.data as Facility[]).filter(x => x.status === 'Active'));
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const scopeFacility = scopeId ? facilities.find(f => f.id === scopeId) ?? null : null;
  const inScope = rules.filter(r => r.facilityId === (scopeId || null));
  const save = async (d: ReturnType<typeof draftFromRule>) => {
    const r = await billingReleaseService.set(toInput(d));
    setStatus(r.ok ? 'saved' : 'refused');
    setEditing(null);
    await load();
  };
  const remove = async (id: string) => {
    const r = await billingReleaseService.remove(id);
    setStatus(r.ok ? 'saved' : 'refused');
    await load();
  };

  if (loading) return <LoadingState label={t('billingReleaseSection.loading')} />;
  return (
    <div className="ps-dsch-root">
      <div>
        <h2 className="tmpl-list-title">{t('billingReleaseSection.title')}</h2>
        <p className="tmpl-list-subtitle">{t('billingReleaseSection.subtitle')}</p>
      </div>
      <div className="ps-dsch-scope">
        <label className="ps-conf-label" htmlFor="brr-scope">{t('billingReleaseSection.scope.label')}</label>
        <select id="brr-scope" className="ps-conf-select" value={scopeId} onChange={e => { setScopeId(e.target.value); setStatus(null); }}>
          <option value="">{t('billingReleaseSection.scope.enterprise')}</option>
          {facilities.map(f => <option key={f.id as string} value={f.id as string}>{f.name}</option>)}
        </select>
        <CapabilityButton capability={BILLING_RELEASE_CAPABILITY} className="ps-conf-btn-primary" onClick={() => setEditing({ rule: null })}>{t('billingReleaseSection.addRule')}</CapabilityButton>
      </div>
      {scopeId && inScope.length === 0 && <p className="ps-conf-hint">{t('billingReleaseSection.followsEnterprise')}</p>}
      <div className="ps-dsch-list">
        {inScope.map(rule => (
          <div key={rule.id} className="ps-dsch-card" data-rule={rule.id}>
            <div>
              <div className="ps-dsch-feed">{t(`billingReleaseSection.types.${rule.criteria.billingType ?? 'any'}`)}</div>
              <div className="ps-dsch-summary"><Summary rule={rule} facilities={facilities} /></div>
              <span className={`ps-dsch-source ps-dsch-source--${rule.facilityId ? 'facility' : 'enterprise'}`}>{t(`billingReleaseSection.source.${rule.facilityId ? 'facility' : 'enterprise'}`)}</span>
            </div>
            <div className="ps-dsch-actions">
              <CapabilityButton capability={BILLING_RELEASE_CAPABILITY} className="ps-conf-btn-secondary" onClick={() => setEditing({ rule })}>{t('billingReleaseSection.editButton')}</CapabilityButton>
              <CapabilityButton capability={BILLING_RELEASE_CAPABILITY} className="ps-conf-btn-secondary" onClick={() => { void remove(rule.id); }}>{t('billingReleaseSection.removeButton')}</CapabilityButton>
            </div>
          </div>
        ))}
      </div>
      {status && <p className="ps-conf-hint" role="status">{t(`billingReleaseSection.${status}`)}</p>}
      <BillingReleaseTestPanel rules={rules} facilities={facilities} />
      {editing && (
        <BillingReleaseEditor start={draftFromRule(editing.rule, scopeId || null)} scopeName={scopeFacility ? scopeFacility.name : null} facilities={facilities}
          onSave={d => { void save(d); }} onClose={() => setEditing(null)} />
      )}
    </div>
  );
};

export default BillingReleaseSection;
