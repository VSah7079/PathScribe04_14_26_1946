// src/components/Autopsy/AutopsyBodyReleaseForm.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct guidance's own confirmed requirements: no inline
// CSS (real classNames only), no inline logic
// (resolveAutopsyBodyReleaseGate.ts and releaseAutopsyBody.ts — this
// file only calls and renders), no text strings (useTranslation()
// throughout).
//
// Real, deliberate difference from AutopsyAuthorizationCompletionForm.tsx:
// per direct guidance's own "continue with wiring and UI," this
// component actually calls the real, async releaseAutopsyBody.ts
// itself (fetch, gate re-check, persist) rather than handing built
// data back to a caller — closing the loop instead of deferring it
// again.
//
// Batch 383 (PS-359, and the rule that a release needs a permission): who
// the body goes to and who released it are locked Field Requirements
// (chain of custody), shown as "Still required: …"; Release needs
// autopsy:body:release (checked in releaseAutopsyBody, greyed out here) and
// can be said ("release body", AUTOPSY_RELEASE_SUBMIT) with the same checks.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../pathscribe.css';
import { actionRegistryService, autopsyReleaseMissing, reportFieldRequired } from '@/services';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { useCapabilities } from '@/hooks/useCapabilities';
import { useFieldRequirements } from '@/hooks/useFieldRequirements';
import { formatList } from '@/utils/formatList';
import type { AutopsyCaseDetails } from '@/types/autopsy/AutopsyCaseDetails';
import { resolveAutopsyBodyReleaseGate } from '@/services/autopsy/resolveAutopsyBodyReleaseGate';
import { releaseAutopsyBody } from '@/services/autopsy/releaseAutopsyBody';

interface AutopsyBodyReleaseFormProps {
  caseId: string;
  specimenId: string;
  autopsyDetails: AutopsyCaseDetails;
  onReleased: () => void;
}

const AutopsyBodyReleaseForm: React.FC<AutopsyBodyReleaseFormProps> = ({ caseId, specimenId, autopsyDetails, onReleased }) => {
  const { t, i18n } = useTranslation();
  const requirements = useFieldRequirements('report');
  const { decide } = useCapabilities();
  const [releasedTo, setReleasedTo] = useState('');
  const [releasedByName, setReleasedByName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const gate = resolveAutopsyBodyReleaseGate(autopsyDetails);
  const missing = autopsyReleaseMissing(releasedTo, releasedByName, requirements);
  const formValid = missing.length === 0;
  const star = (id: string) => reportFieldRequired(requirements, id) && <span className="ps-conf-required">*</span>;
  const context = { caseId };

  const handleSubmit = async () => {
    if (!formValid || !gate.allowed || submitting || !decide('autopsy:body:release', context)?.allowed) return;
    setSubmitting(true);
    setServerError(null);
    const result = await releaseAutopsyBody(caseId, specimenId, { releasedTo: releasedTo.trim(), releasedByName: releasedByName.trim() });
    setSubmitting(false);
    if (result.ok) {
      onReleased();
    } else {
      // Batch 495: translated text only — never the service's English
      // `error` string or raw block-reason codes.
      setServerError(
        result.notPermitted ? t('autopsyBodyRelease.notPermitted')
        : result.blockedReasons?.length ? formatList(result.blockedReasons.map(r => t(`autopsyBodyRelease.blockedReasons.${r}`)), i18n.language)
        : result.reasonCode ? t(`autopsyBodyRelease.errors.${result.reasonCode}`)
        : t('autopsyBodyRelease.genericError'),
      );
    }
  };

  // Voice/keyboard "release body": the same Release, with the same checks.
  const submitRef = useRef(handleSubmit);
  submitRef.current = handleSubmit;
  useEffect(() => actionRegistryService.onAction((actionId: string) => {
    if (actionId === 'AUTOPSY_RELEASE_SUBMIT') void submitRef.current();
  }), []);

  return (
    <div className="ps-conf-card ps-autopsy-intake-card">
      <div className="ps-conf-section-title">{t('autopsyBodyRelease.title')}</div>
      <p className="ps-conf-section-subtitle">{t('autopsyBodyRelease.subtitle')}</p>

      {!gate.allowed && (
        <div className="ps-conf-validation-errors">
          {gate.blockedReasons.map(reason => <div key={reason}>{t(`autopsyBodyRelease.blockedReasons.${reason}`)}</div>)}
        </div>
      )}

      {gate.allowed && (
        <>
          <div className="ps-conf-form-row">
            <div>
              <label className="ps-label" htmlFor="autopsy-release-to">{t('autopsyBodyRelease.releasedToLabel')} {star('autopsyReleasedTo')}</label>
              <input
                id="autopsy-release-to"
                className="ps-conf-input"
                value={releasedTo}
                placeholder={t('autopsyBodyRelease.releasedToPlaceholder')}
                onChange={e => setReleasedTo(e.target.value)}
              />
            </div>
            <div>
              <label className="ps-label" htmlFor="autopsy-release-by">{t('autopsyBodyRelease.releasedByLabel')} {star('autopsyReleasedBy')}</label>
              <input
                id="autopsy-release-by"
                className="ps-conf-input"
                value={releasedByName}
                placeholder={t('autopsyBodyRelease.releasedByPlaceholder')}
                onChange={e => setReleasedByName(e.target.value)}
              />
            </div>
          </div>

          {!formValid && (
            <p className="ps-field-still-required" role="status">
              {t('fieldRequirements.stillRequired', { fields: formatList(missing.map(id => t(`fieldRequirements.fields.report.${id}`)), i18n.language) })}
            </p>
          )}

          {serverError && (
            <div className="ps-conf-validation-errors">{serverError}</div>
          )}

          <div className="ps-conf-modal-footer ps-autopsy-intake-footer">
            <CapabilityButton
              capability="autopsy:body:release"
              context={context}
              className="ps-conf-btn-primary"
              disabled={submitting || !formValid}
              onClick={handleSubmit}
            >
              {submitting ? t('autopsyBodyRelease.submittingBtn') : t('autopsyBodyRelease.submitBtn')}
            </CapabilityButton>
          </div>
        </>
      )}
    </div>
  );
};

export default AutopsyBodyReleaseForm;
