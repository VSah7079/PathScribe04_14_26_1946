// src/components/Config/System/BatchProfileEditor.tsx
// Batch 620 part S (PS-800): the editor for one batch program profile: where its file goes, the format, the columns, the file name.
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { BATCH_FORMATS, DELIMITERS, isFormatAvailable, validateProfile, type BatchFileFormat, type BatchField, type Delimiter } from '../../../services/batchRegistryFeed/batchRegistryFeed';
import { registryChoices } from '../../../services/deliverySchedules/registryChoices';
import { addColumn, layoutPreview, moveColumn, removeColumn, unusedFields, type ProfileDraft } from './batchRegistryFeedForm';
import { BATCH_FEED_CAPABILITY } from './batchRegistryFeedCapabilities';
import './BatchRegistryFeedSection.css';

interface Props { start: ProfileDraft; onSave: (d: ProfileDraft) => void; onClose: () => void }

const BatchProfileEditor: React.FC<Props> = ({ start, onSave, onClose }) => {
  const { t } = useTranslation();
  const [d, setD] = useState<ProfileDraft>(start);
  const problems = validateProfile(d);
  const available = isFormatAvailable(d.format);
  const set = (patch: Partial<ProfileDraft>) => setD({ ...d, ...patch });
  const setColumn = (i: number, patch: Partial<ProfileDraft['columns'][number]>) => set({ columns: d.columns.map((c, k) => (k === i ? { ...c, ...patch } : c)) });
  return (
    <div className="ps-overlay" onClick={onClose}>
      <div className="ps-modal-dark" onClick={e => e.stopPropagation()}>
        <div className="ps-modal-dark-header">
          <span className="ps-modal-dark-title">{t('batchRegistryFeedSection.editor.title')}</span>
          <button className="ps-research-close" onClick={onClose} aria-label={t('common.cancel')}>✕</button>
        </div>
        <div className="ps-modal-dark-body">
          <label className="ps-conf-label" htmlFor="brf-name">{t('batchRegistryFeedSection.editor.name')}</label>
          <input id="brf-name" className="ps-conf-input" value={d.name} onChange={e => set({ name: e.target.value })} />
          <label className="ps-conf-label" htmlFor="brf-registry">{t('batchRegistryFeedSection.editor.registry')}</label>
          <select id="brf-registry" className="ps-conf-select" value={d.registryKey} onChange={e => set({ registryKey: e.target.value })}>
            {registryChoices().map(r => <option key={r.key} value={r.key}>{t(r.labelKey)}</option>)}
          </select>
          <p className="ps-rr-modal-hint">{t('batchRegistryFeedSection.editor.registryHint')}</p>
          <label className="ps-conf-label" htmlFor="brf-format">{t('batchRegistryFeedSection.editor.format')}</label>
          <select id="brf-format" className="ps-conf-select" value={d.format} onChange={e => set({ format: e.target.value as BatchFileFormat, enabled: false })}>
            {BATCH_FORMATS.map(f => <option key={f} value={f}>{t(`batchRegistryFeedSection.formats.${f}`)}</option>)}
          </select>
          {!available && <p className="ps-rr-modal-hint">{t('batchRegistryFeedSection.editor.laterHint')}</p>}
          {available && (
            <>
              {d.format === 'csv' && (
                <>
                  <label className="ps-conf-label" htmlFor="brf-delim">{t('batchRegistryFeedSection.editor.delimiter')}</label>
                  <select id="brf-delim" className="ps-conf-select" value={d.delimiter} onChange={e => set({ delimiter: e.target.value as Delimiter })}>
                    {DELIMITERS.map(x => <option key={x} value={x}>{t(`batchRegistryFeedSection.delimiters.${x === ',' ? 'comma' : x === ';' ? 'semicolon' : 'tab'}`)}</option>)}
                  </select>
                  <label className="ps-dsch-day"><input type="checkbox" checked={d.includeHeaderRow} onChange={e => set({ includeHeaderRow: e.target.checked })} />{t('batchRegistryFeedSection.editor.headerRow')}</label>
                  <label className="ps-dsch-day"><input type="checkbox" checked={d.neutraliseFormulas} onChange={e => set({ neutraliseFormulas: e.target.checked })} />{t('batchRegistryFeedSection.editor.neutralise')}</label>
                  <p className="ps-rr-modal-hint">{t('batchRegistryFeedSection.editor.neutraliseHint')}</p>
                </>
              )}
              {d.format === 'xml' && (
                <>
                  <label className="ps-conf-label" htmlFor="brf-root">{t('batchRegistryFeedSection.editor.xmlRoot')}</label>
                  <input id="brf-root" className="ps-conf-input" value={d.xmlRootElement} onChange={e => set({ xmlRootElement: e.target.value })} />
                  <label className="ps-conf-label" htmlFor="brf-rec">{t('batchRegistryFeedSection.editor.xmlRecord')}</label>
                  <input id="brf-rec" className="ps-conf-input" value={d.xmlRecordElement} onChange={e => set({ xmlRecordElement: e.target.value })} />
                </>
              )}
              <label className="ps-conf-label" htmlFor="brf-code">{t('batchRegistryFeedSection.editor.fileCode')}</label>
              <input id="brf-code" className="ps-conf-input" value={d.fileCode} onChange={e => set({ fileCode: e.target.value })} />
              <label className="ps-conf-label" htmlFor="brf-pattern">{t('batchRegistryFeedSection.editor.pattern')}</label>
              <input id="brf-pattern" className="ps-conf-input" value={d.fileNamePattern} onChange={e => set({ fileNamePattern: e.target.value })} />
              <p className="ps-rr-modal-hint">{t('batchRegistryFeedSection.editor.patternHint')}</p>
              <fieldset>
                <legend className="ps-conf-label">{t('batchRegistryFeedSection.editor.columns')}</legend>
                {d.columns.map((c, i) => (
                  <div key={i} className="ps-brf-column" data-column={i}>
                    <select className="ps-conf-select" aria-label={t('batchRegistryFeedSection.editor.field')} value={c.field} onChange={e => setColumn(i, { field: e.target.value as BatchField })}>
                      {[c.field, ...unusedFields(d.columns)].map(f => <option key={f} value={f}>{t(`batchRegistryFeedSection.fields.${f}`)}</option>)}
                    </select>
                    <input className="ps-conf-input" aria-label={t('batchRegistryFeedSection.editor.header')} value={c.header} onChange={e => setColumn(i, { header: e.target.value })} />
                    <label className="ps-dsch-day"><input type="checkbox" checked={c.required} onChange={e => setColumn(i, { required: e.target.checked })} />{t('batchRegistryFeedSection.editor.required')}</label>
                    <button className="ps-conf-btn-secondary" aria-label={t('batchRegistryFeedSection.editor.moveUp')} disabled={i === 0} onClick={() => set({ columns: moveColumn(d.columns, i, -1) })}>↑</button>
                    <button className="ps-conf-btn-secondary" aria-label={t('batchRegistryFeedSection.editor.moveDown')} disabled={i === d.columns.length - 1} onClick={() => set({ columns: moveColumn(d.columns, i, 1) })}>↓</button>
                    <button className="ps-conf-btn-secondary" aria-label={t('batchRegistryFeedSection.editor.removeColumn')} onClick={() => set({ columns: removeColumn(d.columns, i) })}>✕</button>
                  </div>
                ))}
                <button className="ps-conf-btn-secondary" disabled={unusedFields(d.columns).length === 0} onClick={() => set({ columns: addColumn(d.columns) })}>{t('batchRegistryFeedSection.editor.addColumn')}</button>
              </fieldset>
              <p className="ps-rr-modal-hint">{t('batchRegistryFeedSection.editor.previewHint')}</p>
              <pre className="ps-brf-preview" data-testid="brf-preview">{layoutPreview(d)}</pre>
            </>
          )}
          {problems.map(p => <p key={p} className="ps-rr-modal-warn" role="alert">{t(`batchRegistryFeedSection.problems.${p}`)}</p>)}
        </div>
        <div className="ps-modal-dark-footer">
          <button className="ps-conf-btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
          <CapabilityButton capability={BATCH_FEED_CAPABILITY} className="ps-conf-btn-primary" disabled={problems.length > 0} onClick={() => onSave(d)}>{t('batchRegistryFeedSection.editor.save')}</CapabilityButton>
        </div>
      </div>
    </div>
  );
};

export default BatchProfileEditor;
