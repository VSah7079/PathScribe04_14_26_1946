// src/components/Billing/BillingCorrectionDialog.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 433: the one place a billing correction is made after sign-out,
// without opening the case (Pete). Used from Quality Assurance → Financials:
//   • "Start correction": no case yet; the person finds it by case id or
//     accession number, and a correction record (deficiency) is created;
//   • resolving a billing deficiency as "code corrected" or "charge
//     reversed": the deficiency's case and charge are filled in, and the
//     deficiency resolves only when the correction succeeds.
// The person picks a kind (change the code, change the modifier, reverse,
// add a missing charge), and every correction needs a post-sign-out
// billing reason and a comment. The work (permission, credit/rebill,
// approval, audit) is services/billing/billingCorrection.ts.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { reasonDictionaryService } from '@/services';
import { applyBillingCorrection, type BillingCorrectionRefusal } from '@/services/billing/billingCorrection';
import {
  BILLING_CORRECTION_KINDS, correctionFromForm, findCaseForCorrection, initialCorrection, loadCaseForCorrection,
  type BillingCorrectionKind, type CorrectionCase, type CorrectionForm,
} from '@/services/billing/billingCorrectionCase';
import type { BillingDeficiencyRecord } from '@/types/billing/BillingDeficiencyRecord';
import type { ReasonDictionaryEntry } from '@/types/reasons/ReasonDictionaryEntry';
import { LoadingState } from '@/components/Common/LoadingState';

export interface BillingCorrectionDialogProps {
  /** The deficiency this correction resolves (its case and charge are filled in). */
  deficiency?: BillingDeficiencyRecord;
  /** How the deficiency is being resolved; decides where the dialog starts. */
  resolution?: 'CODE_CORRECTED' | 'CHARGE_REVERSED';
  onDone: () => void;
  onClose: () => void;
}

const KIND_KEY: Record<BillingCorrectionKind, string> = {
  changeCode: 'billingCorrection.kind.changeCode',
  changeModifier: 'billingCorrection.kind.changeModifier',
  reverse: 'billingCorrection.kind.reverse',
  addMissing: 'billingCorrection.kind.addMissing',
};

const REFUSAL_KEY: Record<BillingCorrectionRefusal, string> = {
  NOT_PERMITTED: 'billingCorrection.refusal.notPermitted',
  REASON_REQUIRED: 'billingCorrection.refusal.reasonRequired',
  CHARGE_NOT_FOUND: 'billingCorrection.refusal.chargeNotFound',
  CHARGE_ALREADY_REVERSED: 'billingCorrection.refusal.chargeAlreadyReversed',
  NO_CHANGE: 'billingCorrection.refusal.noChange',
  SPECIMEN_NOT_FOUND: 'billingCorrection.refusal.specimenNotFound',
  NO_DATE_OF_SERVICE: 'billingCorrection.refusal.noDateOfService',
  NO_ACTIVE_RULE: 'billingCorrection.refusal.noActiveRule',
  SAVE_FAILED: 'billingCorrection.refusal.saveFailed',
};

export const BillingCorrectionDialog: React.FC<BillingCorrectionDialogProps> = ({ deficiency, resolution, onDone, onClose }) => {
  const { t } = useTranslation();
  const start = initialCorrection(deficiency, resolution);
  const [query, setQuery] = useState('');
  const [caseInfo, setCaseInfo] = useState<CorrectionCase | null>(null);
  const [lookupState, setLookupState] = useState<'idle' | 'loading' | 'notFound'>(deficiency ? 'loading' : 'idle');
  const [form, setForm] = useState<CorrectionForm>({ kind: start.kind, chargeId: start.chargeId, newCptCode: '', newModifier: '', specimenId: '', blockId: '', billingCode: '' });
  const [reasonOptions, setReasonOptions] = useState<ReasonDictionaryEntry[]>([]);
  const [reasonId, setReasonId] = useState('');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [refusal, setRefusal] = useState<BillingCorrectionRefusal | null>(null);

  useEffect(() => {
    let cancelled = false;
    reasonDictionaryService.getAll('POST_SIGNOUT_BILLING_CHANGE').then(res => {
      if (!cancelled && res.ok) setReasonOptions(res.data.filter(r => r.status === 'Active'));
    });
    if (deficiency) {
      loadCaseForCorrection(deficiency.caseId).then(c => {
        if (cancelled) return;
        setCaseInfo(c);
        setLookupState(c ? 'idle' : 'notFound');
      });
    }
    return () => { cancelled = true; };
  }, [deficiency]);

  const findCase = async () => {
    setLookupState('loading');
    setRefusal(null);
    const c = await findCaseForCorrection(query);
    setCaseInfo(c);
    setLookupState(c ? 'idle' : 'notFound');
    setForm(f => ({ ...f, chargeId: '', specimenId: '', blockId: '' }));
  };

  const set = <K extends keyof CorrectionForm>(key: K, value: CorrectionForm[K]) => { setRefusal(null); setForm(f => ({ ...f, [key]: value })); };
  const correction = correctionFromForm(form);
  const canApply = !!caseInfo && !!correction && !!reasonId && comment.trim().length > 0 && !saving;
  const specimen = useMemo(() => caseInfo?.specimens.find(s => s.id === form.specimenId), [caseInfo, form.specimenId]);
  const needsCharge = form.kind !== 'addMissing';

  const apply = async () => {
    if (!caseInfo || !correction) return;
    setSaving(true);
    const res = await applyBillingCorrection({ caseId: caseInfo.caseId, correction, reason: { reasonId, comment }, deficiencyId: deficiency?.id });
    setSaving(false);
    if (res.ok === false) { setRefusal(res.error); return; }
    onDone();
  };

  return (
    <div className="ps-ms-overlay">
      <div className="ps-ms-modal ps-ms-modal--wide" role="dialog" aria-label={t('billingCorrection.header')}>
        <div className="ps-ms-header">{t('billingCorrection.header')}</div>
        <div className="ps-ms-body">
          <p className="ps-fixgate-intro">{t(deficiency ? 'billingCorrection.introDeficiency' : 'billingCorrection.introStart')}</p>

          {!deficiency && (
            <div className="ps-conf-form-field">
              <label className="ps-conf-label" htmlFor="billing-correction-case">{t('billingCorrection.caseLabel')} <span className="ps-conf-required">*</span></label>
              <div className="ps-billing-correction-find">
                <input
                  id="billing-correction-case"
                  className="ps-conf-input"
                  data-phi="accession"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && query.trim()) void findCase(); }}
                  placeholder={t('billingCorrection.casePlaceholder')}
                />
                <button type="button" className="ps-conf-btn-secondary" disabled={!query.trim() || lookupState === 'loading'} onClick={() => void findCase()}>{t('billingCorrection.findCase')}</button>
              </div>
            </div>
          )}
          {lookupState === 'loading' && <LoadingState variant="inline" className="ps-billing-reason-hint" label={t('billingCorrection.loading')} />}
          {lookupState === 'notFound' && <p className="ps-conf-error-text" role="alert">{t('billingCorrection.caseNotFound')}</p>}

          {caseInfo && (
            <>
              <p className="ps-billing-correction-case">
                <span data-phi="accession">{caseInfo.accession}</span>{' '}
                {t(caseInfo.signedOut ? 'billingCorrection.signedOut' : 'billingCorrection.notSignedOut')}
              </p>
              <div className="ps-conf-form-field">
                <label className="ps-conf-label" htmlFor="billing-correction-kind">{t('billingCorrection.kindLabel')} <span className="ps-conf-required">*</span></label>
                <select id="billing-correction-kind" className="ps-conf-select" value={form.kind} onChange={e => set('kind', e.target.value as BillingCorrectionKind)}>
                  {BILLING_CORRECTION_KINDS.map(k => <option key={k} value={k}>{t(KIND_KEY[k])}</option>)}
                </select>
              </div>

              {needsCharge && (
                <div className="ps-conf-form-field">
                  <label className="ps-conf-label" htmlFor="billing-correction-charge">{t('billingCorrection.chargeLabel')} <span className="ps-conf-required">*</span></label>
                  <select id="billing-correction-charge" className="ps-conf-select" value={form.chargeId} onChange={e => set('chargeId', e.target.value)}>
                    <option value="">{t('billingCorrection.selectCharge')}</option>
                    {caseInfo.charges.map(c => (
                      <option key={c.id} value={c.id}>
                        {t('billingCorrection.chargeOption', { source: c.sourceLabel, cpt: c.cptCode, modifier: c.modifier ?? '—', description: c.cptDescription ?? '' })}
                      </option>
                    ))}
                  </select>
                  {caseInfo.charges.length === 0 && <p className="ps-billing-reason-hint">{t('billingCorrection.noCharges')}</p>}
                </div>
              )}

              {form.kind === 'changeCode' && (
                <div className="ps-conf-form-field">
                  <label className="ps-conf-label" htmlFor="billing-correction-cpt">{t('billingCorrection.newCptLabel')} <span className="ps-conf-required">*</span></label>
                  <input id="billing-correction-cpt" className="ps-conf-input" value={form.newCptCode} onChange={e => set('newCptCode', e.target.value)} placeholder={t('billingCorrection.newCptPlaceholder')} />
                </div>
              )}
              {form.kind === 'changeModifier' && (
                <div className="ps-conf-form-field">
                  <label className="ps-conf-label" htmlFor="billing-correction-modifier">{t('billingCorrection.newModifierLabel')}</label>
                  <input id="billing-correction-modifier" className="ps-conf-input" value={form.newModifier} onChange={e => set('newModifier', e.target.value)} placeholder={t('billingCorrection.newModifierPlaceholder')} />
                </div>
              )}
              {form.kind === 'addMissing' && (
                <>
                  <div className="ps-conf-form-field">
                    <label className="ps-conf-label" htmlFor="billing-correction-specimen">{t('billingCorrection.specimenLabel')} <span className="ps-conf-required">*</span></label>
                    <select id="billing-correction-specimen" className="ps-conf-select" value={form.specimenId} onChange={e => { set('specimenId', e.target.value); set('blockId', ''); }}>
                      <option value="">{t('billingCorrection.selectSpecimen')}</option>
                      {caseInfo.specimens.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </div>
                  {specimen && specimen.blocks.length > 0 && (
                    <div className="ps-conf-form-field">
                      <label className="ps-conf-label" htmlFor="billing-correction-block">{t('billingCorrection.blockLabel')}</label>
                      <select id="billing-correction-block" className="ps-conf-select" value={form.blockId} onChange={e => set('blockId', e.target.value)}>
                        <option value="">{t('billingCorrection.wholeSpecimen')}</option>
                        {specimen.blocks.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="ps-conf-form-field">
                    <label className="ps-conf-label" htmlFor="billing-correction-code">{t('billingCorrection.billingCodeLabel')} <span className="ps-conf-required">*</span></label>
                    <select id="billing-correction-code" className="ps-conf-select" value={form.billingCode} onChange={e => set('billingCode', e.target.value)}>
                      <option value="">{t('billingCorrection.selectBillingCode')}</option>
                      {caseInfo.billingCodes.map(c => <option key={c.code} value={c.code}>{t('billingCorrection.billingCodeOption', { code: c.code, description: c.description })}</option>)}
                    </select>
                  </div>
                </>
              )}

              <div className="ps-conf-form-field">
                <label className="ps-conf-label" htmlFor="billing-correction-reason">{t('billingCorrection.reasonLabel')} <span className="ps-conf-required">*</span></label>
                <select id="billing-correction-reason" className="ps-conf-select" value={reasonId} onChange={e => { setRefusal(null); setReasonId(e.target.value); }}>
                  <option value="">{t('billingCorrection.selectReason')}</option>
                  {reasonOptions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="ps-conf-form-field">
                <label className="ps-conf-label" htmlFor="billing-correction-comment">{t('billingCorrection.commentLabel')} <span className="ps-conf-required">*</span></label>
                <textarea id="billing-correction-comment" className="ps-conf-input ps-conf-textarea" value={comment} onChange={e => { setRefusal(null); setComment(e.target.value); }} placeholder={t('billingCorrection.commentPlaceholder')} />
              </div>
              <p className="ps-billing-reason-hint">{t('billingCorrection.recordHint')}</p>
            </>
          )}
          {refusal && <p className="ps-conf-error-text" role="alert">{t(REFUSAL_KEY[refusal])}</p>}
        </div>
        <div className="ps-ms-footer">
          <button type="button" className="ps-conf-btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
          <button type="button" className="ps-conf-btn-primary" disabled={!canApply} onClick={() => void apply()}>
            {t(saving ? 'billingCorrection.applying' : 'billingCorrection.apply')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BillingCorrectionDialog;
