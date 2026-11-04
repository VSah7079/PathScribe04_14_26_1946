// src/components/InterfaceDictionary/MappingEditor.tsx
// ─────────────────────────────────────────────────
// Batch 612: the mapping rows of a vendor profile's working copy. Presentational:
// it shows the rows and what is wrong with each (the definition check is
// services/interfaceDictionary/mappingEngine.ts) and hands every change up.
// ─────────────────────────────────────────────────
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MAPPING_DATA_TYPES, MAPPING_TRANSFORMS, blankMapping, codeKey, formatValueMap, isZSegment, parseValueMap,
  type FieldMapping, type MappingProblem, type VendorMessageFormat,
} from '@/services';

const ValueMapInput: React.FC<{ value: FieldMapping['valueMap']; disabled: boolean; label: string; onCommit: (v: FieldMapping['valueMap']) => void; testId: string }> = ({ value, disabled, label, onCommit, testId }) => {
  const [text, setText] = useState(formatValueMap(value));
  return (
    <input className="ps-conf-input" aria-label={label} data-testid={testId} disabled={disabled} value={text}
      onChange={e => setText(e.target.value)} onBlur={() => onCommit(parseValueMap(text))} />
  );
};

const hl7Segment = (path: string) => /^[A-Z][A-Z0-9]{2}/.exec(path.trim())?.[0] ?? '';

export interface MappingEditorProps {
  format: VendorMessageFormat;
  mappings: FieldMapping[];
  problems: MappingProblem[];
  disabled?: boolean;
  onChange: (next: FieldMapping[]) => void;
}

export const MappingEditor: React.FC<MappingEditorProps> = ({ format, mappings, problems, disabled = false, onChange }) => {
  const { t } = useTranslation();
  const set = (id: string, patch: Partial<FieldMapping>) => onChange(mappings.map(m => (m.id === id ? { ...m, ...patch } : m)));

  return (
    <div className="ps-idict-editor" data-testid="idict-editor">
      {mappings.length === 0 && <p className="ps-conf-hint">{t('interfaceDictionary.editor.noMappings')}</p>}
      {mappings.map((m, i) => {
        const mine = problems.filter(p => p.mappingId === m.id);
        const id = `idict-${m.id}`;
        return (
          <div key={m.id} className="ps-idict-row" data-testid={`idict-row-${m.id}`}>
            <div className="ps-idict-row-head">
              <strong>{t('interfaceDictionary.editor.rowTitle', { n: i + 1 })}</strong>
              {format === 'hl7v2' && isZSegment(hl7Segment(m.sourcePath)) && <span className="ps-idict-chip">{t('interfaceDictionary.editor.zSegment')}</span>}
              <button type="button" className="ps-btn ps-btn-secondary" disabled={disabled} data-testid={`idict-remove-${m.id}`}
                onClick={() => onChange(mappings.filter(x => x.id !== m.id))}>{t('interfaceDictionary.editor.remove')}</button>
            </div>
            <div className="ps-idict-grid">
              <label className="ps-idict-field" htmlFor={`${id}-source`}>
                <span>{t('interfaceDictionary.editor.sourceLabel')}</span>
                <input id={`${id}-source`} className="ps-conf-input ps-idict-mono" data-testid={`${id}-source`} disabled={disabled} value={m.sourcePath}
                  placeholder={t(`interfaceDictionary.editor.sourcePlaceholder.${format}`)} onChange={e => set(m.id, { sourcePath: e.target.value })} />
              </label>
              <label className="ps-idict-field" htmlFor={`${id}-target`}>
                <span>{t('interfaceDictionary.editor.targetLabel')}</span>
                <input id={`${id}-target`} className="ps-conf-input ps-idict-mono" data-testid={`${id}-target`} disabled={disabled} value={m.target}
                  placeholder={t('interfaceDictionary.editor.targetPlaceholder')} onChange={e => set(m.id, { target: e.target.value })} />
              </label>
              <label className="ps-idict-field" htmlFor={`${id}-label`}>
                <span>{t('interfaceDictionary.editor.labelLabel')}</span>
                <input id={`${id}-label`} className="ps-conf-input" data-testid={`${id}-label`} disabled={disabled} value={m.label}
                  onChange={e => set(m.id, { label: e.target.value })} />
              </label>
              <label className="ps-idict-field" htmlFor={`${id}-type`}>
                <span>{t('interfaceDictionary.editor.typeLabel')}</span>
                <select id={`${id}-type`} className="ps-conf-select" data-testid={`${id}-type`} disabled={disabled} value={m.dataType}
                  onChange={e => set(m.id, { dataType: e.target.value as FieldMapping['dataType'] })}>
                  {MAPPING_DATA_TYPES.map(x => <option key={x} value={x}>{t(`interfaceDictionary.type.${x}`)}</option>)}
                </select>
              </label>
              <label className="ps-idict-field" htmlFor={`${id}-transform`}>
                <span>{t('interfaceDictionary.editor.transformLabel')}</span>
                <select id={`${id}-transform`} className="ps-conf-select" data-testid={`${id}-transform`} disabled={disabled} value={m.transform}
                  onChange={e => set(m.id, { transform: e.target.value as FieldMapping['transform'] })}>
                  {MAPPING_TRANSFORMS.map(x => <option key={x} value={x}>{t(`interfaceDictionary.transform.${x}`)}</option>)}
                </select>
              </label>
              <label className="ps-idict-field" htmlFor={`${id}-default`}>
                <span>{t('interfaceDictionary.editor.defaultLabel')}</span>
                <input id={`${id}-default`} className="ps-conf-input" data-testid={`${id}-default`} disabled={disabled} value={m.defaultValue ?? ''}
                  onChange={e => set(m.id, { defaultValue: e.target.value || undefined })} />
              </label>
              <div className="ps-idict-field ps-idict-field--wide">
                <span>{t('interfaceDictionary.editor.valueMapLabel')}</span>
                <ValueMapInput value={m.valueMap} disabled={disabled} label={t('interfaceDictionary.editor.valueMapLabel')} testId={`${id}-valuemap`}
                  onCommit={v => set(m.id, { valueMap: v })} />
                <span className="ps-conf-hint">{t('interfaceDictionary.editor.valueMapHint')}</span>
              </div>
              <label className="ps-conf-toggle-label-row">
                <input type="checkbox" data-testid={`${id}-required`} disabled={disabled} checked={!!m.required} onChange={e => set(m.id, { required: e.target.checked })} />
                <span>{t('interfaceDictionary.editor.requiredLabel')}</span>
              </label>
            </div>
            {mine.length > 0 && (
              <ul className="ps-idict-problems" role="alert" data-testid={`idict-problems-${m.id}`}>
                {mine.map(p => <li key={p.code}>{t(`interfaceDictionary.problem.${codeKey(p.code)}`)}</li>)}
              </ul>
            )}
          </div>
        );
      })}
      <button type="button" className="ps-btn ps-btn-secondary" disabled={disabled} data-testid="idict-add-mapping"
        onClick={() => onChange([...mappings, blankMapping(mappings)])}>{t('interfaceDictionary.editor.add')}</button>
    </div>
  );
};
