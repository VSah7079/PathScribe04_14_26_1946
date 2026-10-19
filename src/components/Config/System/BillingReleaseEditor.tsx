// src/components/Config/System/BillingReleaseEditor.tsx
// Batch 619 (PS-800): the editor for one billing release rule: what it applies to, and when the charge is released.
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import type { Facility } from '../../../services/facilities/IFacilityService';
import { AMENDMENT_FLAGS, BILLING_TYPES, RELEASE_MODES, batchToCron, validateRule, type AmendmentFlag, type BillingType, type ReleaseMode } from '../../../services/billingRelease/billingRelease';
import { toggleDay, WEEKDAYS_MON_FIRST, WEEKDAY_KEYS } from './deliveryScheduleForm';
import { toInput, withMode, type RuleDraft } from './billingReleaseForm';

export const BILLING_RELEASE_CAPABILITY = 'config:billing-release:manage' as const;
const OWN_PROBLEMS = new Set(['billingTypeInvalid', 'modeInvalid', 'holdInvalid', 'batchRequired', 'amendmentInvalid', 'caseTypesInvalid']);

interface Props { start: RuleDraft; scopeName: string | null; facilities: Facility[]; onSave: (d: RuleDraft) => void; onClose: () => void }

const BillingReleaseEditor: React.FC<Props> = ({ start, scopeName, facilities, onSave, onClose }) => {
  const { t } = useTranslation();
  const [d, setD] = useState<RuleDraft>(start);
  const problems = validateRule(toInput(d));
  const batch = d.action.batchSchedule;
  const setCriteria = (patch: Partial<RuleDraft['criteria']>) => setD({ ...d, criteria: { ...d.criteria, ...patch } });
  const setAction = (patch: Partial<RuleDraft['action']>) => setD({ ...d, action: { ...d.action, ...patch } });
  const setBatch = (patch: Partial<NonNullable<typeof batch>>) => batch && setAction({ batchSchedule: { ...batch, ...patch } });
  const cron = batchToCron(batch ? { ...batch, batchTimes: d.timesText.split(/[\s,;]+/).filter(Boolean).sort() } : null);
  return (
    <div className="ps-overlay" onClick={onClose}>
      <div className="ps-modal-dark" onClick={e => e.stopPropagation()}>
        <div className="ps-modal-dark-header">
          <span className="ps-modal-dark-title">{t('billingReleaseSection.editor.title', { scope: scopeName ?? t('billingReleaseSection.scope.enterprise') })}</span>
          <button className="ps-research-close" onClick={onClose} aria-label={t('common.cancel')}>✕</button>
        </div>
        <div className="ps-modal-dark-body">
          <fieldset>
            <legend className="ps-conf-label">{t('billingReleaseSection.editor.appliesTo')}</legend>
            <label className="ps-conf-label" htmlFor="brr-type">{t('billingReleaseSection.editor.billingType')}</label>
            <select id="brr-type" className="ps-conf-select" value={d.criteria.billingType ?? ''} onChange={e => setCriteria({ billingType: (e.target.value || null) as BillingType | null })}>
              <option value="">{t('billingReleaseSection.types.any')}</option>
              {BILLING_TYPES.map(b => <option key={b} value={b}>{t(`billingReleaseSection.types.${b}`)}</option>)}
            </select>
            <label className="ps-conf-label" htmlFor="brr-cases">{t('billingReleaseSection.editor.caseTypes')}</label>
            <input id="brr-cases" className="ps-conf-input" value={d.caseTypesText} onChange={e => setD({ ...d, caseTypesText: e.target.value })} />
            <p className="ps-rr-modal-hint">{t('billingReleaseSection.editor.caseTypesHint')}</p>
            <label className="ps-conf-label" htmlFor="brr-site">{t('billingReleaseSection.editor.orderingSite')}</label>
            <select id="brr-site" className="ps-conf-select" value={d.criteria.orderingSiteId ?? ''} onChange={e => setCriteria({ orderingSiteId: e.target.value || null })}>
              <option value="">{t('billingReleaseSection.editor.anySite')}</option>
              {facilities.map(f => <option key={f.id as string} value={f.id as string}>{f.name}</option>)}
            </select>
            <label className="ps-conf-label" htmlFor="brr-path">{t('billingReleaseSection.editor.pathologist')}</label>
            <input id="brr-path" className="ps-conf-input" value={d.criteria.primaryPathologistId ?? ''} onChange={e => setCriteria({ primaryPathologistId: e.target.value.trim() || null })} />
            <p className="ps-rr-modal-hint">{t('billingReleaseSection.editor.pathologistHint')}</p>
            <label className="ps-conf-label" htmlFor="brr-amend">{t('billingReleaseSection.editor.amendment')}</label>
            <select id="brr-amend" className="ps-conf-select" value={d.criteria.amendment} onChange={e => setCriteria({ amendment: e.target.value as AmendmentFlag })}>
              {AMENDMENT_FLAGS.map(a => <option key={a} value={a}>{t(`billingReleaseSection.amendment.${a}`)}</option>)}
            </select>
          </fieldset>

          <fieldset>
            <legend className="ps-conf-label">{t('billingReleaseSection.editor.release')}</legend>
            <label className="ps-conf-label" htmlFor="brr-mode">{t('billingReleaseSection.editor.mode')}</label>
            <select id="brr-mode" className="ps-conf-select" value={d.action.releaseMode} onChange={e => setD(withMode(d, e.target.value as ReleaseMode))}>
              {RELEASE_MODES.map(m => <option key={m} value={m}>{t(`billingReleaseSection.modes.${m}`)}</option>)}
            </select>
            <p className="ps-rr-modal-hint">{t(`billingReleaseSection.editor.modeHints.${d.action.releaseMode}`)}</p>
            {d.action.releaseMode === 'DYNAMIC_WITH_HOLD' && (
              <>
                <label className="ps-conf-label" htmlFor="brr-hold">{t('billingReleaseSection.editor.holdMinutes')}</label>
                <input id="brr-hold" type="number" min={0} className="ps-conf-input" value={d.action.holdDurationMinutes} onChange={e => setAction({ holdDurationMinutes: Number(e.target.value) })} />
                <p className="ps-rr-modal-hint">{t('billingReleaseSection.editor.holdHint')}</p>
              </>
            )}
            {batch && (
              <>
                <label className="ps-conf-label" htmlFor="brr-freq">{t('billingReleaseSection.editor.frequency')}</label>
                <select id="brr-freq" className="ps-conf-select" value={batch.batchFrequency} onChange={e => setBatch({ batchFrequency: e.target.value as 'daily' | 'weekly' })}>
                  <option value="daily">{t('deliverySchedulesSection.frequencies.daily')}</option>
                  <option value="weekly">{t('deliverySchedulesSection.frequencies.weekly')}</option>
                </select>
                {batch.batchFrequency === 'weekly' && (
                  <div className="ps-dsch-days" role="group" aria-label={t('billingReleaseSection.editor.batchDays')}>
                    {WEEKDAYS_MON_FIRST.map(day => (
                      <label key={day} className="ps-dsch-day">
                        <input type="checkbox" checked={batch.batchDays.includes(day)} onChange={() => setBatch({ batchDays: toggleDay(batch.batchDays, day) })} />
                        {t(`deliverySchedulesSection.weekdays.${WEEKDAY_KEYS[day]}`)}
                      </label>
                    ))}
                  </div>
                )}
                <label className="ps-conf-label" htmlFor="brr-times">{t('billingReleaseSection.editor.batchTimes')}</label>
                <input id="brr-times" className="ps-conf-input" value={d.timesText} onChange={e => setD({ ...d, timesText: e.target.value })} />
                <p className="ps-rr-modal-hint">{t('billingReleaseSection.editor.batchTimesHint')}</p>
                <label className="ps-conf-label" htmlFor="brr-zone">{t('billingReleaseSection.editor.timeZone')}</label>
                <input id="brr-zone" className="ps-conf-input" value={batch.timeZone} onChange={e => setBatch({ timeZone: e.target.value })} />
                {cron && <p className="ps-rr-modal-hint">{t('billingReleaseSection.editor.cron', { cron })}</p>}
              </>
            )}
            <label className="ps-dsch-day"><input type="checkbox" checked={d.action.autoReleaseOnComplete} onChange={e => setAction({ autoReleaseOnComplete: e.target.checked })} />{t('billingReleaseSection.editor.autoRelease')}</label>
            <p className="ps-rr-modal-hint">{t('billingReleaseSection.editor.autoReleaseHint')}</p>
            <label className="ps-dsch-day"><input type="checkbox" checked={d.action.manualReviewRequired} onChange={e => setAction({ manualReviewRequired: e.target.checked })} />{t('billingReleaseSection.editor.manualReview')}</label>
            <p className="ps-rr-modal-hint">{t('billingReleaseSection.editor.manualReviewHint')}</p>
          </fieldset>
          {problems.map(p => <p key={p} className="ps-rr-modal-warn" role="alert">{t(OWN_PROBLEMS.has(p) ? `billingReleaseSection.problems.${p}` : `deliverySchedulesSection.problems.${p}`)}</p>)}
        </div>
        <div className="ps-modal-dark-footer">
          <button className="ps-conf-btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
          <CapabilityButton capability={BILLING_RELEASE_CAPABILITY} className="ps-conf-btn-primary" disabled={problems.length > 0} onClick={() => onSave(d)}>{t('billingReleaseSection.editor.save')}</CapabilityButton>
        </div>
      </div>
    </div>
  );
};

export default BillingReleaseEditor;
