// src/pages/CytologyWorklistPage/components/CytologyCisoeAForm.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The CISOE-A (PALGA) review form on the Cytology screening page (moved out of
// CytologyScreeningPage.tsx in Batch 386, PS-359). Six components are scored
// separately rather than picking one interpretation; all six are locked as
// required (resolveCisoeAValidation needs them). Comments (every axis) and
// notes are switches in Field Requirements. Shows "Still required: …", keeps
// Save off until they are filled, and can be saved by voice ("save CISOE-A
// review", CYTOLOGY_SAVE_CISOEA) with the same check.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import '../../../pathscribe.css';
import { actionRegistryService, cisoeaMissing, cytologyFieldRequired } from '@/services';
import type { ResolvedFieldRequirement } from '@/services/fieldRequirements/fieldRequirementRules';
import { formatList } from '@/utils/formatList';
import { SpellCheckedTextarea } from '@/components/SpellCheck/SpellCheckedTextarea';
import type { CisoeAAdequacy } from '@/types/cytology/CisoeAScore';
import type { CisoeADraft } from '@/services/cytology/cisoeADraft';
import { CytologyFieldLabel } from './CytologySearchSelect';

const AXES = [
  ['composition', 'compositionComment', 'cisoeaComposition', 'composition'],
  ['inflammation', 'inflammationComment', 'cisoeaInflammation', 'inflammation'],
  ['squamous', 'squamousComment', 'cisoeaSquamous', 'squamous'],
  ['otherEndometrium', 'otherEndometriumComment', 'cisoeaOtherEndometrium', 'otherEndometrium'],
  ['endocervical', 'endocervicalComment', 'cisoeaEndocervical', 'endocervical'],
] as const;

interface Props {
  draft: CisoeADraft;
  onDraftChange: (draft: CisoeADraft) => void;
  editing: boolean;
  saving: boolean;
  roleLabel: string;
  requirements: readonly ResolvedFieldRequirement[];
  /** Range and consistency messages from resolveCisoeAValidation, shown after a save attempt. */
  errors: string[];
  warnings: string[];
  /** A live suggestion from the entered S/O/E values; the reviewer still decides. */
  reflexSuggestion?: 'cyto-rec-colposcopy' | string;
  onSave: () => void;
  onRequestPeerReview: () => void;
}

export const CytologyCisoeAForm: React.FC<Props> = ({
  draft, onDraftChange, editing, saving, roleLabel, requirements, errors, warnings, reflexSuggestion, onSave, onRequestPeerReview,
}) => {
  const { t, i18n } = useTranslation();
  const missing = cisoeaMissing(draft, requirements);
  const canSave = missing.length === 0 && !saving;
  const req = (id: string) => cytologyFieldRequired(requirements, id);

  // Voice/keyboard "save CISOE-A review": the same Save, with the same check.
  const saveRef = useRef(() => { if (canSave) onSave(); });
  saveRef.current = () => { if (canSave) onSave(); };
  useEffect(() => actionRegistryService.onAction((actionId: string) => {
    if (actionId === 'CYTOLOGY_SAVE_CISOEA') saveRef.current();
  }), []);

  return (
    <div className="ps-cytoscreen-form-panel">
      <h2 className="ps-cytoscreen-form-title ps-cytoscreen-form-title--tight">
        {editing ? t('cytologyScreening.cisoea.titleEdit') : t('cytologyScreening.cisoea.titleNew')}
      </h2>
      <div className="ps-cytoscreen-form-subtitle">{t('cytologyScreening.cisoea.subtitle')}</div>

      {AXES.map(([valueKey, commentKey, fieldId, labelKey]) => (
        <div key={valueKey} className="ps-cytoscreen-cisoe-row">
          <CytologyFieldLabel text={t(`cytologyScreening.cisoea.axes.${labelKey}`)} hint={t('cytologyScreening.cisoea.scaleHint')} required={req(fieldId)} />
          <div className="ps-cytoscreen-cisoe-inputs">
            <input type="number" min={0} max={9} value={draft[valueKey]}
              aria-label={t(`cytologyScreening.cisoea.axes.${labelKey}`)}
              onChange={e => onDraftChange({ ...draft, [valueKey]: e.target.value })}
              className="ps-cytoscreen-cisoe-number-input" />
            <input type="text" placeholder={req('cisoeaComments') ? t('cytologyScreening.cisoea.commentRequiredPlaceholder') : t('cytologyScreening.search.commentPlaceholder')} value={draft[commentKey]}
              onChange={e => onDraftChange({ ...draft, [commentKey]: e.target.value })}
              className="ps-cytoscreen-cisoe-comment-input" />
          </div>
        </div>
      ))}

      <CytologyFieldLabel text={t('cytologyScreening.cisoea.adequacy')} required={req('cisoeaAdequacy')} />
      <select value={draft.adequacy} onChange={e => onDraftChange({ ...draft, adequacy: e.target.value as CisoeAAdequacy | '' })}
        aria-label={t('cytologyScreening.cisoea.adequacy')}
        className="ps-conf-select ps-w-full ps-mb-14">
        <option value="">{t('cytologyScreening.cisoea.selectOption')}</option>
        <option value="satisfactory">{t('cytologyScreening.cisoea.adequacyOptions.satisfactory')}</option>
        <option value="suboptimal">{t('cytologyScreening.cisoea.adequacyOptions.suboptimal')}</option>
        <option value="unsatisfactory">{t('cytologyScreening.cisoea.adequacyOptions.unsatisfactory')}</option>
      </select>

      <CytologyFieldLabel text={t('cytologyScreening.reviewForm.notes')} required={req('cisoeaNotes')} />
      <SpellCheckedTextarea value={draft.notes} onChange={e => onDraftChange({ ...draft, notes: e.target.value })} rows={2}
        className="ps-cytoscreen-textarea ps-mb-12" />

      {errors.length > 0 && (
        <div className="ps-cytoscreen-inline-banner ps-cytoscreen-inline-banner--error">
          {errors.map((e, i) => <div key={i} className="ps-cytoscreen-inline-banner-text--error">{e}</div>)}
        </div>
      )}
      {warnings.length > 0 && (
        <div className="ps-cytoscreen-inline-banner ps-cytoscreen-inline-banner--warning">
          {warnings.map((w, i) => <div key={i} className="ps-cytoscreen-inline-banner-text--warning">{w}</div>)}
        </div>
      )}
      {reflexSuggestion && (
        <div className="ps-cytoscreen-inline-banner ps-cytoscreen-inline-banner--info">
          <div className="ps-cytoscreen-inline-banner-text--info">
            {reflexSuggestion === 'cyto-rec-colposcopy'
              ? t('cytologyScreening.cisoea.suggestColposcopy')
              : t('cytologyScreening.cisoea.suggestHpvGenotyping')}
          </div>
        </div>
      )}

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
