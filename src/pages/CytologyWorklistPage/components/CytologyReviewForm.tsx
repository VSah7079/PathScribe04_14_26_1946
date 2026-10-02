// src/pages/CytologyWorklistPage/components/CytologyReviewForm.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The Bethesda-style review form on the Cytology screening page (moved out of
// CytologyScreeningPage.tsx in Batch 386, PS-359).
//
// What the form needs before it can save comes from the organisation's Field
// Requirements (page "cytology"): the primary interpretation is always
// required; adequacy, categorization, comments, additional interpretations,
// recommendations, notes and (gynaecologic specimens) the last menstrual
// period are switches. The form shows "Still required: …", marks required
// labels, keeps Save off until they are filled, and can be saved by voice
// ("save review", CYTOLOGY_SAVE_REVIEW) with the same check.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import '../../../pathscribe.css';
import { actionRegistryService, cytologyFieldRequired, cytologyReviewMissing } from '@/services';
import type { ResolvedFieldRequirement } from '@/services/fieldRequirements/fieldRequirementRules';
import { formatList } from '@/utils/formatList';
import { SpellCheckedTextarea } from '@/components/SpellCheck/SpellCheckedTextarea';
import type { CytologyCategoryEntry } from '@/services/cytology/ICytologyCategoryService';
import { CytologyFieldLabel, MultiSearchSelect, SingleSearchSelect } from './CytologySearchSelect';
import type { Draft } from '../cytologyDrafts';

interface Props {
  draft: Draft;
  onDraftChange: (draft: Draft) => void;
  editing: boolean;
  saving: boolean;
  /** The reviewer's role, already translated (shown on the Save button). */
  roleLabel: string;
  isGynCytology: boolean;
  lastMenstrualPeriod: string;
  requirements: readonly ResolvedFieldRequirement[];
  generalCategorizationOptions: CytologyCategoryEntry[];
  adequacyOptions: CytologyCategoryEntry[];
  primaryOptions: CytologyCategoryEntry[];
  additionalOptions: CytologyCategoryEntry[];
  recommendationOptions: CytologyCategoryEntry[];
  categoryLabel: (id: string) => string;
  onSave: () => void;
  onRequestPeerReview: () => void;
}

export const CytologyReviewForm: React.FC<Props> = ({
  draft, onDraftChange, editing, saving, roleLabel, isGynCytology, lastMenstrualPeriod, requirements,
  generalCategorizationOptions, adequacyOptions, primaryOptions, additionalOptions, recommendationOptions,
  categoryLabel, onSave, onRequestPeerReview,
}) => {
  const { t, i18n } = useTranslation();
  const missing = cytologyReviewMissing({
    generalCategorizationId: draft.generalCategorizationId,
    adequacyCount: draft.adequacySelections.length,
    primaryInterpretationId: draft.primaryInterpretationId,
    primaryInterpretationComment: draft.primaryInterpretationComment,
    additionalCount: draft.additionalInterpretations.length,
    recommendationCount: draft.recommendations.length,
    notes: draft.notes,
    lastMenstrualPeriod,
  }, isGynCytology, requirements);
  const canSave = missing.length === 0 && !saving;
  const req = (id: string) => cytologyFieldRequired(requirements, id);

  // Voice/keyboard "save review": the same Save, with the same check.
  const saveRef = useRef(() => { if (canSave) onSave(); });
  saveRef.current = () => { if (canSave) onSave(); };
  useEffect(() => actionRegistryService.onAction((actionId: string) => {
    if (actionId === 'CYTOLOGY_SAVE_REVIEW') saveRef.current();
  }), []);

  return (
    <div className="ps-cytoscreen-form-panel">
      <h2 className="ps-cytoscreen-form-title ps-cytoscreen-form-title--roomy">
        {editing ? t('cytologyScreening.reviewForm.titleEdit') : t('cytologyScreening.reviewForm.titleNew')}
      </h2>

      <CytologyFieldLabel text={t('cytologyScreening.reviewForm.generalCategorization')} hint={t('cytologyScreening.reviewForm.generalCategorizationHint')} required={req('reviewGeneralCategorization')} />
      <select value={draft.generalCategorizationId} onChange={e => onDraftChange({ ...draft, generalCategorizationId: e.target.value })}
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

      <CytologyFieldLabel text={t('cytologyScreening.reviewForm.notes')} required={req('reviewNotes')} />
      <SpellCheckedTextarea value={draft.notes} onChange={e => onDraftChange({ ...draft, notes: e.target.value })} rows={2}
        className="ps-cytoscreen-textarea ps-mb-16" />

      {missing.length > 0 && (
        <p className="ps-field-still-required" role="status">
          {t('fieldRequirements.stillRequired', { fields: formatList(missing.map(id => t(`fieldRequirements.fields.cytology.${id}`)), i18n.language) })}
        </p>
      )}

      <div className="ps-cytoscreen-form-actions">
        <button onClick={onSave} disabled={!canSave}
          className={`ps-cytoscreen-save-btn ${missing.length > 0 ? 'ps-cytoscreen-save-btn--disabled' : 'ps-cytoscreen-save-btn--ready'}`}>
          {saving ? t('common.saving') : editing ? t('cytologyScreening.reviewForm.updateBtn') : t('cytologyScreening.reviewForm.saveAsRole', { role: roleLabel })}
        </button>
        <button onClick={onRequestPeerReview} className="ps-cytoscreen-peer-review-btn">
          👥 {t('cytologyScreening.requestPeerReviewBtn')}
        </button>
      </div>
    </div>
  );
};
