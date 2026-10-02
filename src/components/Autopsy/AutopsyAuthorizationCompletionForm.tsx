// src/components/Autopsy/AutopsyAuthorizationCompletionForm.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct guidance's own confirmed requirements: no inline
// CSS (real classNames only), no inline logic
// (resolveAutopsyAuthorizationCompletionValidation.ts,
// applyAutopsyAuthorizationCompletion.ts, and
// resolveAutopsyGrossExaminationGate.ts — this file only calls and
// renders), no text strings (useTranslation() throughout).
//
// Real, deliberate scope: takes a real, EXISTING AutopsyCaseDetails
// (the one built at temporary-accession time) and lets staff enter
// the real, previously-missing written authorization/consent grant —
// the real completion of resolveAutopsyGrossExaminationGate.ts's own
// requirements. A real, presentational component; onSubmit hands the
// caller a real, updated AutopsyCaseDetails — case persistence is
// the real caller's own job, not this component's.
//
// Real, first mounted caller (per direct follow-up: "persistence —
// hands back updated data, nothing saves it"): SynopticReportPage.tsx —
// a banner shows whenever resolveAutopsyGrossExaminationGate blocks
// the case, opening this form in a modal; its own
// handleAutopsyAuthCompletionSubmit persists via the same real
// caseRouter.updateCase() + knownVersionRef pattern used throughout
// that file. Investigation before this fix found neither this form
// nor the gate itself had ANY real UI caller anywhere in the app —
// this is that real, first one.
//
// Batch 383 (PS-359): what the form still needs comes from the
// organisation's Field Requirements (the written order and date, or the
// consent time, are locked; the consent scope is an optional switch). The
// form shows "Still required: …", marks the required labels, keeps Submit
// off until they are filled, and can be submitted by voice ("record
// authorization", AUTOPSY_AUTH_SUBMIT) with the same check.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../pathscribe.css';
import { actionRegistryService, reportFieldRequired } from '@/services';
import { useFieldRequirements } from '@/hooks/useFieldRequirements';
import { formatList } from '@/utils/formatList';
import type { AutopsyCaseDetails } from '@/types/autopsy/AutopsyCaseDetails';
import {
  resolveAutopsyAuthorizationCompletionValidation,
  type AutopsyAuthorizationCompletionFormState,
} from '@/services/autopsy/resolveAutopsyAuthorizationCompletionValidation';
import { applyAutopsyAuthorizationCompletion } from '@/services/autopsy/applyAutopsyAuthorizationCompletion';
import { resolveAutopsyGrossExaminationGate } from '@/services/autopsy/resolveAutopsyGrossExaminationGate';

const EMPTY_FORM: AutopsyAuthorizationCompletionFormState = {
  orderReference: '', orderDate: '', consentGivenAt: '', consentScope: '',
};

interface AutopsyAuthorizationCompletionFormProps {
  caseDetails: AutopsyCaseDetails;
  onSubmit: (updatedDetails: AutopsyCaseDetails) => void;
}

const AutopsyAuthorizationCompletionForm: React.FC<AutopsyAuthorizationCompletionFormProps> = ({ caseDetails, onSubmit }) => {
  const { t, i18n } = useTranslation();
  const requirements = useFieldRequirements('report');
  const [form, setForm] = useState<AutopsyAuthorizationCompletionFormState>(EMPTY_FORM);

  const currentGate = resolveAutopsyGrossExaminationGate(caseDetails);
  const validation = resolveAutopsyAuthorizationCompletionValidation(caseDetails.caseAuthority, form, requirements);
  const previewDetails = applyAutopsyAuthorizationCompletion(caseDetails, form);
  const previewGate = resolveAutopsyGrossExaminationGate(previewDetails);

  const star = (id: string) => reportFieldRequired(requirements, id) && <span className="ps-conf-required">*</span>;
  const handleSubmit = () => {
    if (!validation.valid) return;
    onSubmit(applyAutopsyAuthorizationCompletion(caseDetails, form));
  };

  // Voice/keyboard "record authorization": the same Submit, with the same check.
  const submitRef = useRef(handleSubmit);
  submitRef.current = handleSubmit;
  useEffect(() => actionRegistryService.onAction((actionId: string) => {
    if (actionId === 'AUTOPSY_AUTH_SUBMIT') submitRef.current();
  }), []);

  return (
    <div className="ps-conf-card ps-autopsy-intake-card">
      <div className="ps-conf-section-title">{t('autopsyAuthCompletion.title')}</div>
      <p className="ps-conf-section-subtitle">{t('autopsyAuthCompletion.subtitle')}</p>

      {!currentGate.allowed && (
        <div className="ps-autopsy-intake-status">
          <span className="ps-autopsy-status-badge ps-autopsy-status-badge--temporary">
            {t('autopsyIntake.accessionStatus.temporary')}
          </span>
        </div>
      )}

      {caseDetails.caseAuthority === 'medicolegal_forensic' && caseDetails.forensicAuthorization && (
        <>
          <div className="ps-conf-form-section-title">{t('autopsyAuthCompletion.onFileSectionTitle')}</div>
          <p className="ps-conf-section-subtitle ps-conf-section-subtitle--form-gap">
            {t('autopsyAuthCompletion.verbalOrderOnFile', {
              authority: caseDetails.forensicAuthorization.verbalOrderReceivedFrom || t('autopsyAuthCompletion.unknownValue'),
              at: caseDetails.forensicAuthorization.verbalOrderReceivedAt || t('autopsyAuthCompletion.unknownValue'),
            })}
          </p>

          <div className="ps-conf-form-section-title">{t('autopsyAuthCompletion.writtenOrderSectionTitle')}</div>
          <div className="ps-conf-form-row">
            <div>
              <label className="ps-label" htmlFor="autopsy-auth-order-reference">{t('autopsyAuthCompletion.orderReferenceLabel')} {star('autopsyOrderReference')}</label>
              <input
                id="autopsy-auth-order-reference"
                className="ps-conf-input"
                value={form.orderReference}
                placeholder={t('autopsyAuthCompletion.orderReferencePlaceholder')}
                onChange={e => setForm({ ...form, orderReference: e.target.value })}
              />
            </div>
            <div>
              <label className="ps-label" htmlFor="autopsy-auth-order-date">{t('autopsyAuthCompletion.orderDateLabel')} {star('autopsyOrderDate')}</label>
              <input
                id="autopsy-auth-order-date"
                type="date"
                className="ps-conf-input"
                value={form.orderDate}
                onChange={e => setForm({ ...form, orderDate: e.target.value })}
              />
            </div>
          </div>
        </>
      )}

      {caseDetails.caseAuthority === 'hospital_consented' && (
        <>
          <div className="ps-conf-form-section-title">{t('autopsyAuthCompletion.onFileSectionTitle')}</div>
          <p className="ps-conf-section-subtitle ps-conf-section-subtitle--form-gap">
            {t('autopsyAuthCompletion.relativeOnFile', {
              name: caseDetails.hospitalConsent?.consentingRelativeName || t('autopsyAuthCompletion.unknownValue'),
              relationship: caseDetails.hospitalConsent?.consentingRelativeRelationship || t('autopsyAuthCompletion.unknownValue'),
            })}
          </p>

          <div className="ps-conf-form-section-title">{t('autopsyAuthCompletion.consentGrantSectionTitle')}</div>
          <div className="ps-conf-form-row">
            <div>
              <label className="ps-label" htmlFor="autopsy-auth-consent-at">{t('autopsyAuthCompletion.consentGivenAtLabel')} {star('autopsyConsentGivenAt')}</label>
              <input
                id="autopsy-auth-consent-at"
                type="datetime-local"
                className="ps-conf-input"
                value={form.consentGivenAt}
                onChange={e => setForm({ ...form, consentGivenAt: e.target.value })}
              />
            </div>
            <div>
              <label className="ps-label" htmlFor="autopsy-auth-consent-scope">{t('autopsyAuthCompletion.consentScopeLabel')} {star('autopsyConsentScope')}</label>
              <input
                id="autopsy-auth-consent-scope"
                className="ps-conf-input"
                value={form.consentScope}
                placeholder={t('autopsyAuthCompletion.consentScopePlaceholder')}
                onChange={e => setForm({ ...form, consentScope: e.target.value })}
              />
            </div>
          </div>
        </>
      )}

      {!validation.valid && (
        <p className="ps-field-still-required" role="status">
          {t('fieldRequirements.stillRequired', { fields: formatList(validation.missingFieldIds.map(id => t(`fieldRequirements.fields.report.${id}`)), i18n.language) })}
        </p>
      )}

      <div className="ps-autopsy-intake-status">
        <span className={`ps-autopsy-status-badge ps-autopsy-status-badge--${previewGate.allowed ? 'fully_authorized' : 'temporary'}`}>
          {t(previewGate.allowed ? 'autopsyIntake.accessionStatus.fully_authorized' : 'autopsyIntake.accessionStatus.temporary')}
        </span>
        <p className="ps-conf-section-subtitle ps-conf-section-subtitle--form-gap">
          {previewGate.allowed ? t('autopsyAuthCompletion.willUnblockNote') : t('autopsyIntake.grossExamPendingNote')}
        </p>
      </div>

      <div className="ps-conf-modal-footer ps-autopsy-intake-footer">
        <button className="ps-conf-btn-primary" disabled={!validation.valid} onClick={handleSubmit}>{t('autopsyAuthCompletion.submitBtn')}</button>
      </div>
    </div>
  );
};

export default AutopsyAuthorizationCompletionForm;
