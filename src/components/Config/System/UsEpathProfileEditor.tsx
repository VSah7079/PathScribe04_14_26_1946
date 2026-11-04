// src/components/Config/System/UsEpathProfileEditor.tsx
// Batch 620 (part E, PS-800): the editor for one US ePath state profile: the state, the fields it requires, how it is reached,
// the checks that run before a report is released, and where the state's own codes replace the base ones.
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { EPATH_EXTENSION_MODES, EPATH_FACILITY_BASES, EPATH_RULE_IDS, EPATH_TRANSPORTS, validateProfile, type EpathExtensionMode, type EpathFacilityBasis, type EpathTransportKind } from '../../../services/usEpath/epathProfile';
import { parseFields, toInput, toggleRule, type ProfileDraft } from './usEpathForm';

export const US_EPATH_CAPABILITY = 'config:us-epath:manage' as const;

interface Props { start: ProfileDraft; onSave: (d: ProfileDraft) => void; onClose: () => void }

const UsEpathProfileEditor: React.FC<Props> = ({ start, onSave, onClose }) => {
  const { t } = useTranslation();
  const [d, setD] = useState<ProfileDraft>(start);
  const input = toInput(d);
  const problems = validateProfile({ ...input, example: false });
  const setExtension = (i: number, patch: Partial<ProfileDraft['extensions'][number]>) => setD({ ...d, extensions: d.extensions.map((e, k) => (k === i ? { ...e, ...patch } : e)) });
  return (
    <div className="ps-overlay" onClick={onClose}>
      <div className="ps-modal-dark" onClick={e => e.stopPropagation()}>
        <div className="ps-modal-dark-header">
          <span className="ps-modal-dark-title">{t(d.id ? 'usEpathSection.editor.titleEdit' : 'usEpathSection.editor.titleAdd')}</span>
          <button className="ps-research-close" onClick={onClose} aria-label={t('common.cancel')}>✕</button>
        </div>
        <div className="ps-modal-dark-body">
          <label className="ps-conf-label" htmlFor="uep-state">{t('usEpathSection.editor.state')}</label>
          <input id="uep-state" className="ps-conf-input" maxLength={2} value={d.state} onChange={e => setD({ ...d, state: e.target.value.toUpperCase() })} />
          <p className="ps-rr-modal-hint">{t('usEpathSection.editor.stateHint')}</p>
          <label className="ps-conf-label" htmlFor="uep-name">{t('usEpathSection.editor.name')}</label>
          <input id="uep-name" className="ps-conf-input" value={d.name} onChange={e => setD({ ...d, name: e.target.value })} />

          <fieldset>
            <legend className="ps-conf-label">{t('usEpathSection.editor.fields')}</legend>
            <label className="ps-conf-label" htmlFor="uep-required">{t('usEpathSection.editor.required')}</label>
            <input id="uep-required" className="ps-conf-input" value={d.requiredText} onChange={e => setD({ ...d, requiredText: e.target.value })} />
            <label className="ps-conf-label" htmlFor="uep-optional">{t('usEpathSection.editor.optional')}</label>
            <input id="uep-optional" className="ps-conf-input" value={d.optionalText} onChange={e => setD({ ...d, optionalText: e.target.value })} />
            <p className="ps-rr-modal-hint">{t('usEpathSection.editor.fieldsHint', { count: parseFields(d.requiredText).length + parseFields(d.optionalText).length })}</p>
          </fieldset>

          <fieldset>
            <legend className="ps-conf-label">{t('usEpathSection.editor.delivery')}</legend>
            <label className="ps-conf-label" htmlFor="uep-transport">{t('usEpathSection.editor.transport')}</label>
            <select id="uep-transport" className="ps-conf-select" value={d.transport} onChange={e => setD({ ...d, transport: e.target.value as EpathTransportKind })}>
              {EPATH_TRANSPORTS.map(k => <option key={k} value={k}>{t(`usEpathSection.transports.${k}`)}</option>)}
            </select>
            <p className="ps-rr-modal-hint">{t('usEpathSection.editor.transportHint')}</p>
            <label className="ps-conf-label" htmlFor="uep-basis">{t('usEpathSection.editor.basis')}</label>
            <select id="uep-basis" className="ps-conf-select" value={d.facilityBasis} onChange={e => setD({ ...d, facilityBasis: e.target.value as EpathFacilityBasis })}>
              {EPATH_FACILITY_BASES.map(b => <option key={b} value={b}>{t(`usEpathSection.bases.${b}`)}</option>)}
            </select>
            <p className="ps-rr-modal-hint">{t('usEpathSection.editor.basisHint')}</p>
          </fieldset>

          <fieldset>
            <legend className="ps-conf-label">{t('usEpathSection.editor.rules')}</legend>
            {EPATH_RULE_IDS.map(r => (
              <label key={r} className="ps-dsch-day">
                <input type="checkbox" checked={d.validationRules.includes(r)} onChange={() => setD({ ...d, validationRules: toggleRule(d.validationRules, r) })} />
                {t(`usEpathSection.rules.${r}`)}
              </label>
            ))}
          </fieldset>

          <fieldset>
            <legend className="ps-conf-label">{t('usEpathSection.editor.extensions')}</legend>
            <p className="ps-rr-modal-hint">{t('usEpathSection.editor.extensionsHint')}</p>
            {d.extensions.map((e, i) => (
              <div key={i} className="ps-dsch-actions">
                <input className="ps-conf-input" aria-label={t('usEpathSection.editor.extensionField')} value={e.field} onChange={ev => setExtension(i, { field: ev.target.value })} />
                <select className="ps-conf-select" aria-label={t('usEpathSection.editor.extensionMode')} value={e.mode} onChange={ev => setExtension(i, { mode: ev.target.value as EpathExtensionMode })}>
                  {EPATH_EXTENSION_MODES.map(m => <option key={m} value={m}>{t(`usEpathSection.modes.${m}`)}</option>)}
                </select>
                {e.mode === 'fixed' && <input className="ps-conf-input" aria-label={t('usEpathSection.editor.extensionValue')} value={e.value ?? ''} onChange={ev => setExtension(i, { value: ev.target.value })} />}
                <button type="button" className="ps-conf-btn-secondary" onClick={() => setD({ ...d, extensions: d.extensions.filter((_, k) => k !== i) })}>{t('usEpathSection.editor.removeExtension')}</button>
              </div>
            ))}
            <button type="button" className="ps-conf-btn-secondary" onClick={() => setD({ ...d, extensions: [...d.extensions, { field: '', mode: 'required' }] })}>{t('usEpathSection.editor.addExtension')}</button>
          </fieldset>
          {problems.map(p => <p key={p} className="ps-rr-modal-warn" role="alert">{t(`usEpathSection.problems.${p}`)}</p>)}
        </div>
        <div className="ps-modal-dark-footer">
          <button className="ps-conf-btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
          <CapabilityButton capability={US_EPATH_CAPABILITY} className="ps-conf-btn-primary" disabled={problems.length > 0} onClick={() => onSave(d)}>{t('usEpathSection.editor.save')}</CapabilityButton>
        </div>
      </div>
    </div>
  );
};

export default UsEpathProfileEditor;
