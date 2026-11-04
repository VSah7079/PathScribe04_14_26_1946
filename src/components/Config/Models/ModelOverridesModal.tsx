// src/components/Config/Models/ModelOverridesModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 609 (#173): edit this organisation's overrides for one adopted AI model:
// the output-length cap and the confidence threshold. A blank field means "use
// the organisation setting". The rules (allowed keys, ranges) are in
// services/models/modelOverrides.ts; this only collects the text and shows the
// service's answer.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../../pathscribe.css';
import { modelService } from '@/services';
import type { AIModel } from '@/services/models/IModelService';
import {
  CONFIG_OVERRIDE_KEYS, THRESHOLD_OVERRIDE_KEYS, overrideFormFrom, overridesFromForm, validateOverrides, type OverrideForm,
} from '@/services/models/modelOverrides';

interface Props {
  model: AIModel;
  /** The organisation-wide confidence threshold, shown as the value a blank field falls back to. */
  organisationThreshold: number;
  onClose: (saved: boolean) => void;
}

const range = (specs: readonly { key: string; min: number; max: number }[], key: string) => specs.find(s => s.key === key)!;

export const ModelOverridesModal: React.FC<Props> = ({ model, organisationThreshold, onClose }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState<OverrideForm>(() => overrideFormFrom(model));
  const [error, setError] = useState<string | null>(null);
  const maxTokens = range(CONFIG_OVERRIDE_KEYS, 'maxTokens');
  const confidence = range(THRESHOLD_OVERRIDE_KEYS, 'confidenceThreshold');

  const save = async () => {
    const wanted = overridesFromForm(form);
    const checked = validateOverrides(wanted);
    if (checked.ok === false) { setError(t('modelsTab.overrides.invalid')); return; }
    const res = await modelService.update(model.id, {
      configOverrides: checked.value.configOverrides ?? {},
      thresholdOverrides: checked.value.thresholdOverrides ?? {},
    });
    if (res.ok) { onClose(true); return; }
    setError(t('modelsTab.overrides.failed'));
  };

  return (
    <div className="ps-overlay ps-overlay--confirm" role="dialog" aria-modal="true" aria-label={t('modelsTab.overrides.title')}>
      <div className="ps-modal-dark ps-modal-sm">
        <span className="ps-modal-dark-title">{t('modelsTab.overrides.title')}</span>
        <p className="ps-modal-dark-body">{t('modelsTab.overrides.intro', { name: `${model.name} ${model.version}` })}</p>

        <label className="ps-models-override-field">
          <span>{t('modelsTab.overrides.maxTokens.label')}</span>
          <input
            type="text" inputMode="numeric" value={form.maxTokens}
            placeholder={t('modelsTab.overrides.maxTokens.placeholder')}
            onChange={e => { setForm({ ...form, maxTokens: e.target.value }); setError(null); }}
          />
          <small>{t('modelsTab.overrides.maxTokens.help', { min: maxTokens.min, max: maxTokens.max })}</small>
        </label>

        <label className="ps-models-override-field">
          <span>{t('modelsTab.overrides.confidence.label')}</span>
          <input
            type="text" inputMode="numeric" value={form.confidenceThreshold}
            placeholder={t('modelsTab.overrides.confidence.placeholder', { value: organisationThreshold })}
            onChange={e => { setForm({ ...form, confidenceThreshold: e.target.value }); setError(null); }}
          />
          <small>{t('modelsTab.overrides.confidence.help', { min: confidence.min, max: confidence.max })}</small>
        </label>

        {error && <p className="ps-models-override-error" role="alert">{error}</p>}
        <div className="ps-modal-dark-footer">
          <button type="button" className="ps-btn-ghost-dark" onClick={() => onClose(false)}>{t('common.cancel')}</button>
          <button type="button" className="ps-btn-amber" onClick={save}>{t('common.save')}</button>
        </div>
      </div>
    </div>
  );
};
