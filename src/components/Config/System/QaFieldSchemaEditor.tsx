// src/components/Config/System/QaFieldSchemaEditor.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 516 (PS-125): the review-field editor for a Custom QA activity in the
// QA Configuration Center. Add fields, reorder them, relabel them, make them
// optional or required, give choice fields their options.
//
// Pete's schema-evolution rules (services/quality/qaFieldSchemaRules.ts): a
// field or option saved before this edit can be relabelled or made optional,
// never removed or retyped, because past QA records keep their answers under
// its id. The editor shows that as a locked type and no Remove button; the
// service refuses it again on save.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { QaReviewFieldDefinition, QaReviewFieldType } from '@/types/quality/QaActivityType';
import { isChoiceField, isSavedField, isSavedOption, newQaFieldId, moveQaField, qaFieldSchemaProblem } from '@/services/quality/qaFieldSchemaRules';

const FIELD_TYPES: QaReviewFieldType[] = ['text', 'longtext', 'numeric', 'dropdown', 'radio', 'checkboxes'];
const K = 'qaConfigurationCenterSection.fieldEditor';

interface Props {
  fields: QaReviewFieldDefinition[];
  /** The fields as stored before this edit; null for a new activity or a duplicate. */
  saved: QaReviewFieldDefinition[] | null;
  onChange: (fields: QaReviewFieldDefinition[]) => void;
  readOnly?: boolean;
}

export const QaFieldSchemaEditor: React.FC<Props> = ({ fields, saved, onChange, readOnly }) => {
  const { t } = useTranslation();
  const problem = qaFieldSchemaProblem(saved, fields);

  const patch = (index: number, change: Partial<QaReviewFieldDefinition>) =>
    onChange(fields.map((f, i) => (i === index ? { ...f, ...change } : f)));

  const addField = () => {
    const id = newQaFieldId('field', fields.map(f => f.id));
    onChange([...fields, { id, label: '', type: 'text', required: false, options: [] }]);
  };

  const setType = (index: number, type: QaReviewFieldType) =>
    patch(index, { type, options: isChoiceField(type) ? fields[index].options : [] });

  const addOption = (index: number) => {
    const f = fields[index];
    patch(index, { options: [...f.options, { id: newQaFieldId('option', f.options.map(o => o.id)), label: '' }] });
  };

  if (readOnly) {
    return (
      <ul className="ps-qa-field-editor-list">
        {fields.map(f => (
          <li key={f.id} className="ps-conf-section-subtitle">
            {t(`${K}.readOnlyLine`, { label: f.label, type: t(`${K}.types.${f.type}`) })}
            {f.required ? ` ${t(`${K}.requiredTag`)}` : ''}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="ps-qa-field-editor">
      <p className="ps-conf-hint">{t(`${K}.rulesHint`)}</p>
      {fields.map((f, i) => {
        const locked = isSavedField(saved, f.id);
        return (
          <div key={f.id} className="ps-qa-field-editor-row">
            <div className="ps-qa-field-editor-row-head">
              <input className="ps-conf-input" value={f.label} placeholder={t(`${K}.labelPlaceholder`)}
                aria-label={t(`${K}.labelAria`, { n: i + 1 })} onChange={e => patch(i, { label: e.target.value })} />
              <select className="ps-conf-select" value={f.type} disabled={locked} aria-label={t(`${K}.typeAria`, { n: i + 1 })}
                title={locked ? t(`${K}.typeLocked`) : undefined} onChange={e => setType(i, e.target.value as QaReviewFieldType)}>
                {FIELD_TYPES.map(type => <option key={type} value={type}>{t(`${K}.types.${type}`)}</option>)}
              </select>
              <label className="ps-conf-label ps-qa-field-editor-required">
                <input type="checkbox" checked={f.required} onChange={e => patch(i, { required: e.target.checked })} />
                {' '}{t(`${K}.required`)}
              </label>
            </div>
            <input className="ps-conf-input" value={f.hint ?? ''} placeholder={t(`${K}.hintPlaceholder`)}
              aria-label={t(`${K}.hintAria`, { n: i + 1 })} onChange={e => patch(i, { hint: e.target.value || undefined })} />
            {isChoiceField(f.type) && (
              <div className="ps-qa-field-editor-options">
                {f.options.map((o, oi) => (
                  <div key={o.id} className="ps-qa-field-editor-option">
                    <input className="ps-conf-input" value={o.label} placeholder={t(`${K}.optionPlaceholder`)}
                      aria-label={t(`${K}.optionAria`, { n: oi + 1 })}
                      onChange={e => patch(i, { options: f.options.map(x => (x.id === o.id ? { ...x, label: e.target.value } : x)) })} />
                    {!isSavedOption(saved, f.id, o.id) && (
                      <button type="button" className="ps-conf-btn-secondary" onClick={() => patch(i, { options: f.options.filter(x => x.id !== o.id) })}>
                        {t(`${K}.removeOption`)}
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" className="ps-conf-btn-secondary" onClick={() => addOption(i)}>{t(`${K}.addOption`)}</button>
              </div>
            )}
            <div className="ps-qa-field-editor-actions">
              <button type="button" className="ps-conf-btn-secondary" disabled={i === 0} onClick={() => onChange(moveQaField(fields, i, -1))}>{t(`${K}.moveUp`)}</button>
              <button type="button" className="ps-conf-btn-secondary" disabled={i === fields.length - 1} onClick={() => onChange(moveQaField(fields, i, 1))}>{t(`${K}.moveDown`)}</button>
              {locked
                ? <span className="ps-conf-hint">{t(`${K}.savedFieldNote`)}</span>
                : <button type="button" className="ps-conf-btn-secondary" onClick={() => onChange(fields.filter((_, j) => j !== i))}>{t(`${K}.removeField`)}</button>}
            </div>
          </div>
        );
      })}
      <button type="button" className="ps-conf-btn-secondary" onClick={addField}>{t(`${K}.addField`)}</button>
      {problem && <p className="ps-conf-hint ps-qa-field-editor-problem" role="alert">{t(`${K}.problems.${problem}`)}</p>}
    </div>
  );
};
