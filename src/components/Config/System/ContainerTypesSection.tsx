// src/components/Config/System/ContainerTypesSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Admin CRUD screen for the Container Type Dictionary
// (src/services/containerTypes/mockContainerTypeService.ts). Same
// table+modal pattern as SpecimenCategoriesSection — full create/edit,
// deactivate rather than delete, not a fixed list with only the
// description editable. A site's real bench may need containers beyond
// the 9 seeded APLIS-standard defaults.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import '../../../pathscribe.css';
import { containerTypeService } from '../../../services';
import type { ContainerType, ContainerCategory } from '../../../services/containerTypes/IContainerTypeService';

const CATEGORY_OPTIONS: { id: ContainerCategory; label: string }[] = [
  { id: 'histology',     label: 'Histology — Biopsies & Resections' },
  { id: 'cytology',      label: 'Cytology — Fluids & Smears' },
  { id: 'special_media', label: 'Special Media — Ancillary Testing' },
];

// ─── Modal ────────────────────────────────────────────────────────────────────
type Draft = Omit<ContainerType, 'id' | 'status'> & { active: boolean };

const emptyDraft: Draft = {
  name: '', description: '', category: 'histology', aplisMapping: '', systemLogicNotes: '', active: true,
};

interface ContainerTypeModalProps {
  mode: 'add' | 'edit';
  containerType?: ContainerType;
  onSave: (draft: Draft) => void;
  onClose: () => void;
}

const ContainerTypeModal: React.FC<ContainerTypeModalProps> = ({ mode, containerType, onSave, onClose }) => {
  const [draft, setDraft] = useState<Draft>(
    containerType
      ? { ...containerType, active: containerType.status !== 'Inactive' }
      : emptyDraft
  );
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  const set = (k: keyof Draft, v: any) => { setDraft(prev => ({ ...prev, [k]: v })); setErrors(prev => ({ ...prev, [k]: '' })); };

  const validate = () => {
    const e: typeof errors = {};
    if (!draft.name.trim()) e.name = 'Required';
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
          {mode === 'add' ? 'Add Container Type' : `Edit — ${containerType?.name}`}
        </div>

        <div className="ps-ms-body">
          <div className="ps-conf-form-field">
            <label className="ps-conf-label">Name <span className="ps-conf-required">*</span></label>
            <input className={`ps-conf-input ${errors.name ? 'ps-conf-input--error' : ''}`}
              value={draft.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Small Biopsy Vial (Pre-filled Formalin)" />
            {errors.name && <span className="ps-conf-error-text">{errors.name}</span>}
          </div>

          <div className="ps-conf-form-field">
            <label className="ps-conf-label">Description</label>
            <textarea className="ps-conf-input ps-conf-textarea" value={draft.description ?? ''} onChange={e => set('description', e.target.value)} placeholder="Bench terminology, brand names, or local conventions" />
          </div>

          <div className="ps-conf-form-field">
            <label className="ps-conf-label">Category</label>
            <select className="ps-conf-select" value={draft.category} onChange={e => set('category', e.target.value)}>
              {CATEGORY_OPTIONS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>

          <div className="ps-conf-form-field">
            <label className="ps-conf-label">APLIS Mapping</label>
            <input className="ps-conf-input" value={draft.aplisMapping ?? ''} onChange={e => set('aplisMapping', e.target.value)} placeholder="What specimen type this container is typically used for" />
          </div>

          <div className="ps-conf-form-field">
            <label className="ps-conf-label">System Logic Notes</label>
            <textarea className="ps-conf-input ps-conf-textarea" value={draft.systemLogicNotes ?? ''} onChange={e => set('systemLogicNotes', e.target.value)} placeholder="Intended downstream behavior — documentation only, not yet wired to real logic" />
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
            {mode === 'add' ? 'Add Container Type' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main ContainerTypesSection ────────────────────────────────────────────────
const ContainerTypesSection: React.FC = () => {
  const [types,        setTypes]        = useState<ContainerType[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [modal,        setModal]        = useState<{ mode: 'add' | 'edit'; containerType?: ContainerType } | null>(null);

  useEffect(() => {
    containerTypeService.getAll().then(res => {
      if (res.ok) setTypes(res.data);
      setLoading(false);
    });
  }, []);

  const categoryLabel = (cat: ContainerCategory) => CATEGORY_OPTIONS.find(c => c.id === cat)?.label ?? cat;

  const filtered = types.filter(t => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || (t.description ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleSave = async (draft: Draft) => {
    const { active, ...rest } = draft;
    const payload = { ...rest, status: (active ? 'Active' : 'Inactive') as 'Active' | 'Inactive' };
    if (modal?.mode === 'add') {
      const res = await containerTypeService.create(payload);
      if (res.ok) setTypes(prev => [...prev, res.data]);
    } else if (modal?.containerType) {
      const res = await containerTypeService.update(modal.containerType.id, payload);
      if (res.ok) setTypes(prev => prev.map(t => t.id === res.data.id ? res.data : t));
    }
    setModal(null);
  };

  const handleToggleStatus = async (t: ContainerType) => {
    const res = t.status === 'Active' ? await containerTypeService.deactivate(t.id) : await containerTypeService.reactivate(t.id);
    if (res.ok) setTypes(prev => prev.map(x => x.id === t.id ? res.data : x));
  };

  if (loading) return <div className="ps-conf-loading">Loading container types...</div>;

  return (
    <div>
      <div className="ps-conf-section-header">
        <div>
          <h3 className="ps-conf-section-title">Container Type Dictionary</h3>
          <p className="ps-conf-section-subtitle">
            Real APLIS container classifications used at accession — name, category, and mapping are yours to set;
            9 standard defaults are seeded to start from.
          </p>
        </div>
        <button className="ps-conf-btn-primary" onClick={() => setModal({ mode: 'add' })}>+ Add Container Type</button>
      </div>

      <div className="ps-conf-form-row">
        <input type="text" placeholder="Search by name or description..." value={search} onChange={e => setSearch(e.target.value)}
          className="ps-conf-search" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="ps-conf-select">
          <option value="All">All</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      <div className="ps-conf-table-wrap">
        <div className="ps-conf-table-scroll">
          <table className="ps-conf-table">
            <thead className="ps-conf-thead-sticky">
              <tr>
                {['Container Type', 'Category', 'APLIS Mapping', 'Status', 'Actions'].map(h => (
                  <th key={h} className="ps-conf-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} className="ps-conf-tr">
                  <td className="ps-conf-td">
                    <div className="ps-conf-identity-name">{t.name}</div>
                    {t.description && <div className="ps-conf-identity-sub">{t.description}</div>}
                  </td>
                  <td className="ps-conf-td">{categoryLabel(t.category)}</td>
                  <td className="ps-conf-td">{t.aplisMapping || '—'}</td>
                  <td className="ps-conf-td">
                    <div className="ps-conf-status-cell">
                      <span className={`ps-conf-status-dot ${t.status === 'Active' ? 'ps-conf-status-dot--active' : ''}`} />
                      <span className={`ps-conf-status-text ${t.status === 'Active' ? 'ps-conf-status-text--active' : ''}`}>{t.status}</span>
                    </div>
                  </td>
                  <td className="ps-conf-td">
                    <div className="ps-conf-row-actions">
                      <button className="ps-conf-btn-row" onClick={() => setModal({ mode: 'edit', containerType: t })}>Edit</button>
                      <button className="ps-conf-btn-row" onClick={() => handleToggleStatus(t)}>
                        {t.status === 'Active' ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td className="ps-conf-empty-row" colSpan={5}>No container types match the current filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && <ContainerTypeModal mode={modal.mode} containerType={modal.containerType} onSave={handleSave} onClose={() => setModal(null)} />}
    </div>
  );
};

export default ContainerTypesSection;
