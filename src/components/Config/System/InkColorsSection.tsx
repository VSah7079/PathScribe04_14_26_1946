// src/components/Config/System/InkColorsSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Structured Inking, Module 3 (PS-359 follow-up). The ink-colour admin
// palette deferred by Batch 480/481 — the real dictionary
// MarginInkApplication.colorCode is validated against (see
// resolveInkingValidationSeverity.ts's margin_ink_color_unmapped check) and
// GrossingScreenPage.tsx's margin/ink forms pick from. Same table+modal
// pattern as CassetteColorsSection.tsx, simplified per IInkColorService.ts's
// own doc comment (no key/fallback-policy/lab-scope fields — see there).
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import '../../../pathscribe.css';
import { inkColorService } from '../../../services';
import type { InkColor } from '../../../services/inkColors/IInkColorService';
import { findDuplicate } from '../../../utils/validateUnique';
import { switchable } from '@/utils/a11y/pressable';
import { LoadingState } from '@/components/Common/LoadingState';

type Draft = Omit<InkColor, 'id' | 'createdAt' | 'updatedAt'>;

const emptyDraft: Draft = { name: '', code: '#0000FF', active: true };

interface ColorModalProps {
  mode: 'add' | 'edit';
  color?: InkColor;
  allColors: InkColor[];
  onSave: (draft: Draft) => void;
  onClose: () => void;
}

const ColorModal: React.FC<ColorModalProps> = ({ mode, color, allColors, onSave, onClose }) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Draft>(color ? { ...color } : emptyDraft);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const set = (k: keyof Draft, v: any) => { setDraft(prev => ({ ...prev, [k]: v })); setErrors(prev => ({ ...prev, [k]: '' })); };

  const validate = () => {
    const e: typeof errors = {};
    if (!draft.name.trim()) e.name = t('common.required');
    if (!draft.code.trim()) e.code = t('inkColorsSection.modal.errors.codeRequired');
    const excludeId = mode === 'edit' ? color?.id : undefined;
    if (draft.name.trim()) {
      const nameCollision = findDuplicate(allColors, { name: draft.name.trim() }, ['name'], excludeId);
      if (nameCollision) e.name = t('inkColorsSection.modal.errors.nameCollision', { name: nameCollision.name });
    }
    if (draft.code.trim()) {
      const codeCollision = findDuplicate(allColors, { code: draft.code.trim() }, ['code'], excludeId);
      if (codeCollision) e.code = t('inkColorsSection.modal.errors.codeCollision', { code: codeCollision.code, name: codeCollision.name });
    }
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    onSave(draft);
  };

  const isHex = /^#[0-9A-Fa-f]{6}$/.test(draft.code);

  return (
    <div className="ps-ms-overlay">
      <div className="ps-ms-modal">
        <div className="ps-ms-header">{mode === 'add' ? t('inkColorsSection.modal.addTitle') : t('inkColorsSection.modal.editTitle', { name: color?.name })}</div>

        <div className="ps-ms-body">
          <div className="ps-conf-form-field">
            <label className="ps-conf-label">{t('inkColorsSection.modal.nameField')} <span className="ps-conf-required">*</span></label>
            <input aria-label={t('inkColorsSection.modal.nameField')} className={`ps-conf-input ${errors.name ? 'ps-conf-input--error' : ''}`}
              value={draft.name} onChange={e => set('name', e.target.value)} placeholder={t('inkColorsSection.modal.namePlaceholder')} />
            {errors.name && <span className="ps-conf-error-text">{errors.name}</span>}
          </div>

          <div className="ps-conf-form-field">
            <label className="ps-conf-label">{t('inkColorsSection.modal.codeField')} <span className="ps-conf-required">*</span></label>
            <div className="ps-flex-row-gap-8">
              <input aria-label={t('inkColorsSection.modal.codeField')} type="color" value={isHex ? draft.code : '#0000FF'} onChange={e => set('code', e.target.value)} className="ps-cassclr-color-input" />
              <input className={`ps-conf-input ps-conf-input--flex ${errors.code ? 'ps-conf-input--error' : ''}`}
                value={draft.code} onChange={e => set('code', e.target.value)} placeholder={t('inkColorsSection.modal.codePlaceholder')} />
            </div>
            {errors.code
              ? <span className="ps-conf-error-text">{errors.code}</span>
              : <span className="ps-conf-field-hint">{t('inkColorsSection.modal.codeHint')}</span>}
          </div>

          <div className="ps-conf-form-field">
            <label className="ps-conf-label">{t('inkColorsSection.modal.statusField')}</label>
            <div className="ps-conf-toggle-row">
              <div {...switchable(draft.active, () => set('active', !draft.active), t('inkColorsSection.modal.statusField'))} className={`ps-conf-toggle-track ${draft.active ? 'ps-conf-toggle-track--active' : ''}`}>
                <div className="ps-conf-toggle-thumb" />
              </div>
              <span className={`ps-conf-toggle-label ${draft.active ? 'ps-conf-toggle-label--active' : ''}`}>{draft.active ? t('common.active') : t('common.inactive')}</span>
            </div>
          </div>
        </div>

        <div className="ps-ms-footer">
          <button className="ps-ms-btn-cancel" onClick={onClose}>{t('common.cancel')}</button>
          <button className="ps-ms-btn-apply" onClick={handleSave}>{mode === 'add' ? t('inkColorsSection.modal.addColorButton') : t('inkColorsSection.modal.saveChangesButton')}</button>
        </div>
      </div>
    </div>
  );
};

const InkColorsSection: React.FC = () => {
  const { t } = useTranslation();
  const [colors, setColors] = useState<InkColor[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; color?: InkColor } | null>(null);

  useEffect(() => {
    inkColorService.getAll().then(res => {
      if (res.ok) setColors(res.data);
      setLoading(false);
    });
  }, []);

  const handleSave = async (draft: Draft) => {
    if (modal?.mode === 'add') {
      const res = await inkColorService.create(draft);
      if (res.ok) setColors(prev => [...prev, res.data]);
    } else if (modal?.color) {
      const res = await inkColorService.update(modal.color.id, draft);
      if (res.ok) setColors(prev => prev.map(c => c.id === res.data.id ? res.data : c));
    }
    setModal(null);
  };

  const handleToggleStatus = async (color: InkColor) => {
    const res = color.active ? await inkColorService.deactivate(color.id) : await inkColorService.reactivate(color.id);
    if (res.ok) setColors(prev => prev.map(c => c.id === color.id ? res.data : c));
  };

  if (loading) return <LoadingState label={t('inkColorsSection.loading')} />;

  const headers: Array<[string, string]> = [
    ['color', t('inkColorsSection.headers.color')],
    ['code', t('inkColorsSection.headers.code')],
    ['status', t('inkColorsSection.headers.status')],
    ['actions', t('inkColorsSection.headers.actions')],
  ];

  return (
    <div>
      <div className="ps-conf-section-header">
        <div>
          <h3 className="ps-conf-section-title">{t('inkColorsSection.title')}</h3>
          <p className="ps-conf-section-subtitle">{t('inkColorsSection.subtitle')}</p>
        </div>
        <button className="ps-conf-btn-primary ps-conf-btn-primary--nowrap" onClick={() => setModal({ mode: 'add' })}>{t('inkColorsSection.addColorButton')}</button>
      </div>

      <div className="ps-conf-table-wrap">
        <div className="ps-conf-table-scroll">
          <table className="ps-conf-table">
            <thead className="ps-conf-thead-sticky">
              <tr>
                {headers.map(([key, label]) => (
                  <th key={key} className="ps-conf-th">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {colors.map(c => (
                <tr key={c.id} className="ps-conf-tr">
                  <td className="ps-conf-td">
                    <span className="ps-flex-row-gap-8">
                      <span className="ps-cassette-color-swatch" style={{ '--swatch-color': c.code } as React.CSSProperties} />
                      <span className="ps-conf-identity-name">{c.name}</span>
                    </span>
                  </td>
                  <td className="ps-conf-td"><code>{c.code}</code></td>
                  <td className="ps-conf-td">
                    <div className="ps-conf-status-cell">
                      <span className={`ps-conf-status-dot ${c.active ? 'ps-conf-status-dot--active' : ''}`} />
                      <span className={`ps-conf-status-text ${c.active ? 'ps-conf-status-text--active' : ''}`}>{c.active ? t('common.active') : t('common.inactive')}</span>
                    </div>
                  </td>
                  <td className="ps-conf-td">
                    <div className="ps-conf-row-actions">
                      <button className="ps-conf-btn-row" onClick={() => setModal({ mode: 'edit', color: c })}>{t('common.edit')}</button>
                      <button className="ps-conf-btn-row" onClick={() => handleToggleStatus(c)}>{c.active ? t('common.deactivate') : t('common.reactivate')}</button>
                    </div>
                  </td>
                </tr>
              ))}
              {colors.length === 0 && (
                <tr><td className="ps-conf-empty-row" colSpan={4}>{t('inkColorsSection.emptyState')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <ColorModal mode={modal.mode} color={modal.color} allColors={colors} onSave={handleSave} onClose={() => setModal(null)} />
      )}
    </div>
  );
};

export default InkColorsSection;
