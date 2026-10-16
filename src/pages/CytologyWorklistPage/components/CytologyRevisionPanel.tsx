// src/pages/CytologyWorklistPage/components/CytologyRevisionPanel.tsx
// ─────────────────────────────────────────────────────────────────────────────
// PS-340 (Batch 390). The form for one correction or one addendum on a
// signed-out cytology report.
//
//   Correction  the corrected interpretation (starting from what was signed),
//               and the reason. What the organisation requires of a review
//               (Field Requirements, page "cytology") applies, except the last
//               menstrual period and notes; the reason is always required.
//   Addendum    the text to add and the reason, both always required. The
//               original diagnosis is not touched.
//
// Shows "Still required: …", stars required labels and keeps the release
// button off until they are filled. Releasing asks for the signature
// confirmation (the page), then the release service checks the permission
// again.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useTranslation } from 'react-i18next';
import '../../../pathscribe.css';
import { cytologyAddendumMissing, cytologyCorrectionMissing, cytologyFieldRequired } from '@/services';
import type { ResolvedFieldRequirement } from '@/services/fieldRequirements/fieldRequirementRules';
import { formatList } from '@/utils/formatList';
import { SpellCheckedTextarea } from '@/components/SpellCheck/SpellCheckedTextarea';
import type { CytologyCategoryEntry } from '@/services/cytology/ICytologyCategoryService';
import type { CytologyCorrectionDraft } from '@/services/cytology/resolveCytologyRevisionInputs';
import { CytologyFieldLabel, MultiSearchSelect, SingleSearchSelect } from './CytologySearchSelect';
import type { CytologyRevisionMode } from './CytologyRevisionActions';

interface Props {
  mode: CytologyRevisionMode;
  /** What the report says now (the interpretation's label). */
  currentDiagnosis: string;
  draft: CytologyCorrectionDraft;
  onDraftChange: (draft: CytologyCorrectionDraft) => void;
  addendumText: string;
  onAddendumTextChange: (text: string) => void;
  reason: string;
  onReasonChange: (reason: string) => void;
  saving: boolean;
  requirements: readonly ResolvedFieldRequirement[];
  generalCategorizationOptions: CytologyCategoryEntry[];
  adequacyOptions: CytologyCategoryEntry[];
  primaryOptions: CytologyCategoryEntry[];
  additionalOptions: CytologyCategoryEntry[];
  recommendationOptions: CytologyCategoryEntry[];
  categoryLabel: (id: string) => string;
  onRelease: () => void;
  onCancel: () => void;
}

export const CytologyRevisionPanel: React.FC<Props> = ({
  mode, currentDiagnosis, draft, onDraftChange, addendumText, onAddendumTextChange, reason, onReasonChange, saving, requirements,
  generalCategorizationOptions, adequacyOptions, primaryOptions, additionalOptions, recommendationOptions, categoryLabel, onRelease, onCancel,
}) => {
  const { t, i18n } = useTranslation();
  const isCorrection = mode === 'correction';
  const missing = isCorrection
    ? cytologyCorrectionMissing(draft, reason, requirements)
    : cytologyAddendumMissing(addendumText, reason, requirements);
  const canRelease = missing.length === 0 && !saving;
  const req = (id: string) => cytologyFieldRequired(requirements, id);

  return (
    <div className="ps-cytoscreen-form-panel ps-cytoscreen-revision-panel">
      <h2 className="ps-cytoscreen-form-title ps-cytoscreen-form-title--roomy">
        {isCorrection ? t('cytologyRevision.correction.title') : t('cytologyRevision.addendum.title')}
      </h2>
      <p className="ps-cytoscreen-revision-note">{isCorrection ? t('cytologyRevision.correction.intro') : t('cytologyRevision.addendum.intro')}</p>
      <p className="ps-cytoscreen-revision-note">{t('cytologyRevision.currentlyReported', { diagnosis: currentDiagnosis })}</p>

      {isCorrection ? (
        <>
          <CytologyFieldLabel text={t('cytologyScreening.reviewForm.generalCategorization')} hint={t('cytologyScreening.reviewForm.generalCategorizationHint')} required={req('reviewGeneralCategorization')} />
          <select aria-label={t('a11y.fields.generalCategorization')} value={draft.generalCategorizationId} onChange={e => onDraftChange({ ...draft, generalCategorizationId: e.target.value })}
            className="ps-conf-select ps-w-full ps-mb-14">
            <option value="">{t('cytologyScreening.reviewForm.noneOption')}</option>
            {generalCategorizationOptions.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>

          <CytologyFieldLabel text={t('cytologyScreening.reviewForm.adequacy')} hint={t('cytologyScreening.reviewForm.multiHint')} required={req('reviewAdequacy')} />
          <MultiSearchSelect options={adequacyOptions} selections={draft.adequacySelections}
            onChange={sel => onDraftChange({ ...draft, adequacySelections: sel })} placeholder={t('cytologyScreening.reviewForm.adequacyPlaceholder')} categoryLabel={categoryLabel} />

          <CytologyFieldLabel text={t('cytologyScreening.reviewForm.primary')} hint={t('cytologyScreening.reviewForm.primaryHint')} required={req('reviewPrimaryInterpretation')} />
          <SingleSearchSelect options={primaryOptions} value={draft.primaryInterpretationId} comment={draft.primaryInterpretationComment}
            onChange={id => onDraftChange({ ...draft, primaryInterpretationId: id, additionalInterpretations: draft.additionalInterpretations.filter(s => s.categoryId !== id) })}
            onCommentChange={c => onDraftChange({ ...draft, primaryInterpretationComment: c })} placeholder={t('cytologyScreening.reviewForm.primaryPlaceholder')} />

          <CytologyFieldLabel text={t('cytologyScreening.reviewForm.additional')} hint={t('cytologyScreening.reviewForm.multiHint')} required={req('reviewAdditional')} />
          <MultiSearchSelect options={additionalOptions} selections={draft.additionalInterpretations}
            onChange={sel => onDraftChange({ ...draft, additionalInterpretations: sel })} placeholder={t('cytologyScreening.reviewForm.additionalPlaceholder')} categoryLabel={categoryLabel} />

          <CytologyFieldLabel text={t('cytologyScreening.reviewForm.recommendations')} hint={t('cytologyScreening.reviewForm.multiHint')} required={req('reviewRecommendations')} />
          <MultiSearchSelect options={recommendationOptions} selections={draft.recommendations}
            onChange={sel => onDraftChange({ ...draft, recommendations: sel })} placeholder={t('cytologyScreening.reviewForm.recommendationsPlaceholder')} categoryLabel={categoryLabel} />
        </>
      ) : (
        <>
          <CytologyFieldLabel text={t('cytologyRevision.addendum.text')} required={req('revisionAddendumText')} />
          <SpellCheckedTextarea value={addendumText} onChange={e => onAddendumTextChange(e.target.value)} rows={4}
            placeholder={t('cytologyRevision.addendum.textPlaceholder')} className="ps-cytoscreen-textarea ps-mb-14" />
        </>
      )}

      <CytologyFieldLabel text={isCorrection ? t('cytologyRevision.correction.reason') : t('cytologyRevision.addendum.reason')} required={req('revisionReason')} />
      <SpellCheckedTextarea value={reason} onChange={e => onReasonChange(e.target.value)} rows={2}
        placeholder={t('cytologyRevision.reasonPlaceholder')} className="ps-cytoscreen-textarea ps-mb-16" />

      {missing.length > 0 && (
        <p className="ps-field-still-required" role="status">
          {t('fieldRequirements.stillRequired', { fields: formatList(missing.map(id => t(`fieldRequirements.fields.cytology.${id}`)), i18n.language) })}
        </p>
      )}

      <div className="ps-cytoscreen-form-actions">
        <button onClick={onRelease} disabled={!canRelease}
          className={`ps-cytoscreen-save-btn ${canRelease ? 'ps-cytoscreen-save-btn--ready' : 'ps-cytoscreen-save-btn--disabled'}`}>
          {saving ? t('common.saving') : isCorrection ? t('cytologyRevision.correction.releaseBtn') : t('cytologyRevision.addendum.releaseBtn')}
        </button>
        <button onClick={onCancel} disabled={saving} className="ps-cytoscreen-peer-review-btn">{t('common.cancel')}</button>
      </div>
    </div>
  );
};
