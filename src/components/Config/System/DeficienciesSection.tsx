// src/components/Config/System/DeficienciesSection.tsx
// ─────────────────────────────────────────────────────────────
// Admin config for the Specimen/Requisition Deficiency pattern —
// Deficiency Types and Resolution Types are one section with tabs, not
// two sidebar entries, because Resolution Type has no independent use
// anywhere else in the app (unlike e.g. Specimen Category, which Client/
// TAT/Routing all reference on their own — that pairing gets separate
// sidebar entries; this one doesn't need to).
//
// Built with CSS classes (pathscribe.css), not inline style objects —
// deliberately not following PhysiciansSection.tsx/SpecimenCategories
// Section.tsx's older inline-style-constant convention, since
// modalStyles.ts (which those lean on) is itself marked deprecated in
// favor of the .ps-ms-* classes used here.
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import '../../../pathscribe.css';
import {
  deficiencyTypeService, resolutionTypeService,
} from '../../../services';
import type { DeficiencyType, ResolutionType } from '../../../services';

// ─── Shared type-dictionary tab (Deficiency Types / Resolution Types) ────────

interface TypeDictItem { id: string; name: string; description?: string; status: 'Active' | 'Inactive' }
interface TypeDictService {
  getAll(): Promise<{ ok: boolean; data?: TypeDictItem[] }>;
  add(item: { name: string; description?: string; status: 'Active' | 'Inactive' }): Promise<{ ok: boolean; data?: TypeDictItem }>;
  update(id: string, changes: Partial<{ name: string; description?: string; status: 'Active' | 'Inactive' }>): Promise<{ ok: boolean; data?: TypeDictItem }>;
  deactivate(id: string): Promise<{ ok: boolean; data?: TypeDictItem }>;
  reactivate(id: string): Promise<{ ok: boolean; data?: TypeDictItem }>;
}

const TypeDictionaryTab: React.FC<{ service: TypeDictService; noun: string; addLabel: string }> = ({ service, noun, addLabel }) => {
  const [items, setItems] = useState<TypeDictItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; item?: TypeDictItem } | null>(null);
  const [draft, setDraft] = useState({ name: '', description: '', active: true });

  const load = () => { service.getAll().then(res => { if (res.ok && res.data) setItems(res.data); setLoading(false); }); };
  useEffect(load, []);

  useEffect(() => {
    if (modal?.mode === 'edit' && modal.item) {
      setDraft({ name: modal.item.name, description: modal.item.description ?? '', active: modal.item.status === 'Active' });
    } else if (modal?.mode === 'add') {
      setDraft({ name: '', description: '', active: true });
    }
  }, [modal]);

  const handleSave = async () => {
    if (!draft.name.trim()) return;
    const payload = { name: draft.name.trim(), description: draft.description.trim() || undefined, status: (draft.active ? 'Active' : 'Inactive') as 'Active' | 'Inactive' };
    if (modal?.mode === 'add') {
      const res = await service.add(payload);
      if (res.ok && res.data) setItems(prev => [...prev, res.data!]);
    } else if (modal?.item) {
      const res = await service.update(modal.item.id, payload);
      if (res.ok && res.data) setItems(prev => prev.map(i => i.id === res.data!.id ? res.data! : i));
    }
    setModal(null);
  };

  const handleToggleActive = async (item: TypeDictItem) => {
    const res = item.status === 'Active' ? await service.deactivate(item.id) : await service.reactivate(item.id);
    if (res.ok && res.data) setItems(prev => prev.map(i => i.id === item.id ? res.data! : i));
  };

  if (loading) return <div className="ps-defic-loading">Loading {noun.toLowerCase()}s...</div>;

  return (
    <div>
      <div className="ps-defic-tab-header">
        <p className="ps-defic-tab-desc">Manage the {noun.toLowerCase()} options available when raising or resolving a specimen requisition deficiency.</p>
        <button className="ps-btn-primary" onClick={() => setModal({ mode: 'add' })}>+ {addLabel}</button>
      </div>

      <div className="ps-defic-table-wrap">
        <table className="ps-defic-table">
          <thead>
            <tr><th>{noun}</th><th>Description</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td className="ps-defic-cell-name">{item.name}</td>
                <td className="ps-defic-cell-desc">{item.description || '—'}</td>
                <td>
                  <span className={`ps-defic-status-badge ${item.status === 'Active' ? 'ps-defic-status-badge--active' : 'ps-defic-status-badge--inactive'}`}>
                    {item.status}
                  </span>
                </td>
                <td>
                  <div className="ps-defic-row-actions">
                    <button className="ps-btn-secondary" onClick={() => setModal({ mode: 'edit', item })}>Edit</button>
                    <button className="ps-btn-secondary" onClick={() => handleToggleActive(item)}>
                      {item.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={4} className="ps-defic-empty">No {noun.toLowerCase()}s yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="ps-ms-overlay" onClick={() => setModal(null)}>
          <div className="ps-ms-modal" onClick={e => e.stopPropagation()}>
            <div className="ps-ms-header">{modal.mode === 'add' ? `Add ${noun}` : `Edit ${noun}`}</div>
            <div className="ps-ms-field-group">
              <label className="ps-ms-label">Name</label>
              <input className="ps-ms-input" value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder={`e.g. "Container Damaged"`} />
            </div>
            <div className="ps-ms-field-group">
              <label className="ps-ms-label">Description</label>
              <textarea className="ps-ms-textarea" value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} placeholder="Shown as a hint when selecting this option" />
            </div>
            <div className="ps-ms-field-group">
              <label className="ps-ms-label">Status</label>
              <select className="ps-ms-select" value={draft.active ? 'active' : 'inactive'} onChange={e => setDraft(d => ({ ...d, active: e.target.value === 'active' }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="ps-ms-footer">
              <button className="ps-ms-btn-cancel" onClick={() => setModal(null)}>Cancel</button>
              <button className="ps-ms-btn-apply" onClick={handleSave}>{modal.mode === 'add' ? 'Add' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// The Deficiency Log tab that used to live here has been removed —
// superseded by the dedicated Deficiencies page (src/pages/
// DeficienciesPage.tsx, reachable from Home), which does everything
// this tab did (view the log) plus what it never could (actually
// resolve an open item). Config now only holds the two things that
// genuinely belong here: the Deficiency Type and Resolution Type
// dictionaries — vocabulary configuration, not operational data. A
// list of actual deficiency records doesn't belong in Config any more
// than a list of actual cases would.

// ─── Main section ─────────────────────────────────────────────────────────

type DeficienciesTab = 'types' | 'resolutions';

const DeficienciesSection: React.FC = () => {
  const [tab, setTab] = useState<DeficienciesTab>('types');

  return (
    <div className="ps-defic-section">
      <h3 className="ps-defic-title">Specimen Deficiencies</h3>
      <p className="ps-defic-subtitle">
        Configure the deficiency and resolution options used when a specimen can't be processed as received —
        e.g. no Specimen Dictionary match, label mismatch, damaged container.
      </p>

      <div className="ps-tab-bar ps-defic-tabs">
        <button className={`ps-tab-btn ${tab === 'types' ? 'active' : ''}`} onClick={() => setTab('types')}>Deficiency Types</button>
        <button className={`ps-tab-btn ${tab === 'resolutions' ? 'active' : ''}`} onClick={() => setTab('resolutions')}>Resolution Types</button>
      </div>

      {tab === 'types' && <TypeDictionaryTab service={deficiencyTypeService} noun="Deficiency Type" addLabel="Add Deficiency Type" />}
      {tab === 'resolutions' && <TypeDictionaryTab service={resolutionTypeService} noun="Resolution Type" addLabel="Add Resolution Type" />}
    </div>
  );
};

export default DeficienciesSection;
