// src/components/Config/System/SpecimenCategoriesSection.tsx
// ─────────────────────────────────────────────────────────────
// Admin config screen for the Specimen Category Dictionary
// (src/services/specimenCategories/). Migrated off the inline-style-
// constant pattern onto pathscribe.css's ps-conf-*/ps-ms-* classes,
// June 2026, same pass as PhysiciansSection.tsx.
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import '../../../pathscribe.css';
import { specimenCategoryService } from '../../../services';
import { checkSpecimenCategoryReferences } from '../../../services/referenceCheck/referenceCheckService';
import ConfirmModal from '../../Common/ConfirmModal';
import type { SpecimenCategory } from '../../../services/specimenCategories/ISpecimenCategoryService';

// The three Grossing Templates that exist today — see protocolShared.tsx's
// PROTOCOL_REGISTRY entries with isDiagnostic: false. Hardcoded here rather
// than fetched, same pragmatic scope call as AccessionPage's own template
// resolution; revisit if the list ever needs to come from templateService
// dynamically (e.g. once custom Grossing Templates beyond the three
// Gold Standard routes are supported).
const GROSSING_TEMPLATES: { id: string; name: string }[] = [
  { id: 'grossing_standard_tissue', name: 'Standard Tissue Grossing (Route A)' },
  { id: 'grossing_fluid_cytology',  name: 'Fluid / Cell Block Grossing (Route B)' },
  { id: 'grossing_histology_only',  name: 'Histology-Only / Direct Triage (Route C)' },
];

// ─── Modal ────────────────────────────────────────────────────────────────────
type Draft = Omit<SpecimenCategory, 'id' | 'status' | 'autoCreated' | 'autoCreatedAt' | 'autoCreatedNote'> & { active: boolean };

const emptyDraft: Draft = {
  name: '', description: '', defaultGrossingTemplateId: 'grossing_standard_tissue',
  accessionPrefix: 'O', numberSeries: '', active: true,
};

interface CategoryModalProps {
  mode: 'add' | 'edit';
  category?: SpecimenCategory;
  onSave: (draft: Draft) => void;
  onClose: () => void;
}

const CategoryModal: React.FC<CategoryModalProps> = ({ mode, category, onSave, onClose }) => {
  const [draft, setDraft] = useState<Draft>(
    category
      ? { ...category, active: category.status !== 'Inactive' }
      : emptyDraft
  );
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const set = (k: keyof Draft, v: any) => { setDraft(prev => ({ ...prev, [k]: v })); setErrors(prev => ({ ...prev, [k]: '' })); };

  const validate = () => {
    const e: typeof errors = {};
    if (!draft.name.trim()) e.name = 'Required';
    if (!draft.defaultGrossingTemplateId) e.defaultGrossingTemplateId = 'Required';
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    onSave(draft);
  };

  return (
    <div className="ps-ms-overlay">
      <div className="ps-ms-modal">
        <div className="ps-ms-header">
          {mode === 'add' ? 'Add Specimen Category' : `Edit — ${category?.name}`}
        </div>

        <div className="ps-ms-body">
          <div className="ps-conf-form-field">
            <label className="ps-conf-label">Name <span className="ps-conf-required">*</span></label>
            <input className={`ps-conf-input ${errors.name ? 'ps-conf-input--error' : ''}`}
              value={draft.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Surgical Tissue" />
            {errors.name && <span className="ps-conf-error-text">{errors.name}</span>}
          </div>

          <div className="ps-conf-form-field">
            <label className="ps-conf-label">Description</label>
            <textarea className="ps-conf-input ps-conf-textarea" value={draft.description ?? ''} onChange={e => set('description', e.target.value)} placeholder="What kinds of specimens fall into this category" />
          </div>

          <div className="ps-conf-form-field">
            <label className="ps-conf-label" htmlFor="speccat-template">Default Grossing Template <span className="ps-conf-required">*</span></label>
            <select id="speccat-template" className={`ps-conf-select ${errors.defaultGrossingTemplateId ? 'ps-conf-input--error' : ''}`} value={draft.defaultGrossingTemplateId} onChange={e => set('defaultGrossingTemplateId', e.target.value)}>
              {GROSSING_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {errors.defaultGrossingTemplateId && <span className="ps-conf-error-text">{errors.defaultGrossingTemplateId}</span>}
          </div>

          <div className="ps-conf-form-row">
            <div className="ps-conf-form-field">
              <label className="ps-conf-label">Accession Prefix</label>
              <input className="ps-conf-input" value={draft.accessionPrefix ?? ''} onChange={e => set('accessionPrefix', e.target.value.toUpperCase())} placeholder="O" maxLength={3} />
            </div>
            <div className="ps-conf-form-field">
              <label className="ps-conf-label">Numbering Series (optional)</label>
              <input className="ps-conf-input" value={draft.numberSeries ?? ''} onChange={e => set('numberSeries', e.target.value)} placeholder="Leave blank to share the institution-wide series" />
            </div>
          </div>

          <div className="ps-conf-form-field">
            <label className="ps-conf-label">Status</label>
            <div className="ps-conf-toggle-row">
              <div onClick={() => set('active', !draft.active)} className={`ps-conf-toggle-track ${draft.active ? 'ps-conf-toggle-track--active' : ''}`}>
                <div className="ps-conf-toggle-thumb" />
              </div>
              <span className={`ps-conf-toggle-label ${draft.active ? 'ps-conf-toggle-label--active' : ''}`}>{draft.active ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
        </div>

        <div className="ps-ms-footer">
          <button className="ps-ms-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="ps-ms-btn-apply" onClick={handleSave}>
            {mode === 'add' ? 'Add Category' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main SpecimenCategoriesSection ────────────────────────────────────────────
const SpecimenCategoriesSection: React.FC = () => {
  const [categories,   setCategories]   = useState<SpecimenCategory[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive' | 'Unverified'>('All');
  const [modal,        setModal]        = useState<{ mode: 'add' | 'edit'; category?: SpecimenCategory } | null>(null);
  const [pendingDeactivation, setPendingDeactivation] = useState<{ draft: Draft; message: string } | null>(null);

  useEffect(() => {
    specimenCategoryService.getAll().then(res => {
      if (res.ok) setCategories(res.data);
      setLoading(false);
    });
  }, []);

  const templateName = (id: string) => GROSSING_TEMPLATES.find(t => t.id === id)?.name ?? id;

  const filtered = categories.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.description ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const persistSave = async (draft: Draft) => {
    const { active, ...rest } = draft;
    const payload = { ...rest, status: (active ? 'Active' : 'Inactive') as 'Active' | 'Inactive' };
    if (modal?.mode === 'add') {
      const res = await specimenCategoryService.add({ ...payload, autoCreated: false });
      if (res.ok) setCategories(prev => [...prev, res.data]);
    } else if (modal?.category) {
      const res = await specimenCategoryService.update(modal.category.id, payload);
      if (res.ok) setCategories(prev => prev.map(c => c.id === res.data.id ? res.data : c));
    }
    setModal(null);
  };

  const handleSave = async (draft: Draft) => {
    const wasActive = modal?.category ? modal.category.status === 'Active' : true;
    if (modal?.mode === 'edit' && modal.category && wasActive && !draft.active) {
      const refCheck = await checkSpecimenCategoryReferences(modal.category.id);
      if (refCheck.hasReferences) {
        const detail = refCheck.sources.map(s => `${s.count} ${s.label}`).join(', ');
        setPendingDeactivation({ draft, message: `This specimen category is still referenced by: ${detail}. Deactivating it now won't remove those references — they'll keep pointing at a category that's no longer active. Deactivate anyway?` });
        return;
      }
    }
    await persistSave(draft);
  };

  const handleVerify = async (id: string) => {
    const res = await specimenCategoryService.verify(id);
    if (res.ok) setCategories(prev => prev.map(c => c.id === id ? res.data : c));
  };

  const confirmDeactivation = async () => {
    if (!pendingDeactivation) return;
    await persistSave(pendingDeactivation.draft);
    setPendingDeactivation(null);
  };

  if (loading) return <div className="ps-conf-loading">Loading specimen categories...</div>;

  return (
    <div>
      <div className="ps-conf-section-header">
        <div>
          <h3 className="ps-conf-section-title">Specimen Category Dictionary</h3>
          <p className="ps-conf-section-subtitle">
            The coarse-grained classification that controls Grossing Template assignment and accession numbering at intake.
          </p>
        </div>
        <button className="ps-conf-btn-primary" onClick={() => setModal({ mode: 'add' })}>+ Add Category</button>
      </div>

      <div className="ps-conf-form-row">
        <input type="text" placeholder="Search by name or description..." value={search} onChange={e => setSearch(e.target.value)}
          className="ps-conf-search" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="ps-conf-select">
          <option value="All">All</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="Unverified">Unverified</option>
        </select>
      </div>

      <div className="ps-conf-table-wrap">
        <div className="ps-conf-table-scroll">
          <table className="ps-conf-table">
            <thead className="ps-conf-thead-sticky">
              <tr>
                {['Category', 'Default Grossing Template', 'Accession Prefix', 'Status', 'Actions'].map(h => (
                  <th key={h} className="ps-conf-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="ps-conf-tr">
                  <td className="ps-conf-td">
                    <div className="ps-conf-identity-name">{c.name}</div>
                    {c.description && <div className="ps-conf-identity-sub">{c.description}</div>}
                  </td>
                  <td className="ps-conf-td">{templateName(c.defaultGrossingTemplateId)}</td>
                  <td className="ps-conf-td">{c.accessionPrefix ?? '—'}{c.numberSeries ? ` · ${c.numberSeries}` : ''}</td>
                  <td className="ps-conf-td">
                    <div className="ps-conf-status-cell">
                      <span className={`ps-conf-status-dot ${c.status === 'Active' ? 'ps-conf-status-dot--active' : c.status === 'Unverified' ? 'ps-conf-status-dot--pending' : ''}`} />
                      <span className={`ps-conf-status-text ${c.status === 'Active' ? 'ps-conf-status-text--active' : c.status === 'Unverified' ? 'ps-conf-status-text--pending' : ''}`}>{c.status}</span>
                    </div>
                    {c.autoCreated && (
                      <div className="ps-conf-auto-note" title={c.autoCreatedNote}>
                        Auto-created{c.autoCreatedAt ? ` ${c.autoCreatedAt}` : ''} — from order intake
                      </div>
                    )}
                  </td>
                  <td className="ps-conf-td">
                    <div className="ps-conf-row-actions">
                      {c.status === 'Unverified' && (
                        <button className="ps-conf-btn-verify" onClick={() => handleVerify(c.id)}>Verify</button>
                      )}
                      <button className="ps-conf-btn-row" onClick={() => setModal({ mode: 'edit', category: c })}>Edit</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td className="ps-conf-empty-row" colSpan={5}>No specimen categories match the current filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && <CategoryModal mode={modal.mode} category={modal.category} onSave={handleSave} onClose={() => setModal(null)} />}

      <ConfirmModal
        show={!!pendingDeactivation}
        title="Specimen category still in use"
        message={pendingDeactivation?.message ?? ''}
        confirmLabel="Deactivate Anyway"
        cancelLabel="Cancel"
        onConfirm={confirmDeactivation}
        onCancel={() => setPendingDeactivation(null)}
      />
    </div>
  );
};

export default SpecimenCategoriesSection;
