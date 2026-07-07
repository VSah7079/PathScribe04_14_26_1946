// src/components/Config/System/ProtocolDictionarySection.tsx
// ─────────────────────────────────────────────────────────────
// Admin screen for the standalone Protocol dictionary
// (services/protocols/IProtocolService.ts). Second pass on the editor
// specifically: first version packed everything into one narrow
// column and used a flat pill grid for stain selection — doesn't scale
// once a real customer's Stain Dictionary has hundreds of entries.
// Rebuilt with a real 2-column layout and an actual search+multiselect
// for stains, not a static list of checkboxes.
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect, useMemo, useRef } from 'react';
import '../../../pathscribe.css';
import { protocolService, stainTypeService } from '../../../services';
import type { Protocol, ProtocolPathway, PathwayTask, StainType } from '../../../services';

type Draft = Omit<Protocol, 'id' | 'version' | 'updatedBy' | 'updatedAt'>;

const emptyTask = (stepOrder: number): PathwayTask => ({
  id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  stepOrder, action: '', stainTypeIds: [], isHold: false,
});
const emptyPathway = (): ProtocolPathway => ({
  id: `track-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  pathwayName: '', fixativeType: '10% Neutral Buffered Formalin', requiresDecal: false,
  processingFormat: 'Standard', tasks: [emptyTask(1)],
});
const emptyDraft = (): Draft => ({
  name: '', description: '', requiresTriage: false, triageChecklist: [], pathways: [emptyPathway()], active: true,
});

// ── Real search + multi-select for stains — a scalable replacement for a ────
// ── flat pill grid, since a real Stain Dictionary can run to hundreds ───────

const StainMultiSelect: React.FC<{
  stainTypes: StainType[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}> = ({ stainTypes, selectedIds, onChange }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const selected = selectedIds.map(id => stainTypes.find(s => s.id === id)).filter(Boolean) as StainType[];
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stainTypes
      .filter(s => !selectedIds.includes(s.id))
      .filter(s => !q || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q))
      .slice(0, 30);
  }, [stainTypes, selectedIds, query]);

  const toggle = (id: string) => onChange(selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]);

  return (
    <div className="ps-protocol-stainselect" ref={wrapRef}>
      {selected.length > 0 && (
        <div className="ps-protocol-stainselect-chips">
          {selected.map(s => (
            <span key={s.id} className="ps-protocol-stainselect-chip">
              {s.name}
              <button type="button" onClick={() => toggle(s.id)} className="ps-protocol-stainselect-chip-remove">×</button>
            </span>
          ))}
        </div>
      )}
      <input
        className="ps-conf-input"
        placeholder="Search stains to add — name or category…"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
      />
      {open && matches.length > 0 && (
        <div className="ps-protocol-stainselect-dropdown">
          {matches.map(s => (
            <div key={s.id} className="ps-protocol-stainselect-option" onMouseDown={() => toggle(s.id)}>
              <span>{s.name}</span>
              <span className="ps-protocol-stainselect-option-cat">{s.category}</span>
            </div>
          ))}
        </div>
      )}
      {open && query.trim() && matches.length === 0 && (
        <div className="ps-protocol-stainselect-dropdown">
          <div className="ps-protocol-stainselect-empty">No matching stains.</div>
        </div>
      )}
    </div>
  );
};

// ── Editor modal ─────────────────────────────────────────────────────────

interface EditorModalProps {
  mode: 'add' | 'edit';
  entry?: Protocol;
  stainTypes: StainType[];
  onSave: (draft: Draft) => void;
  onClose: () => void;
}

const EditorModal: React.FC<EditorModalProps> = ({ mode, entry, stainTypes, onSave, onClose }) => {
  const [draft, setDraft] = useState<Draft>(entry ? {
    name: entry.name, description: entry.description ?? '', requiresTriage: entry.requiresTriage,
    triageChecklist: entry.triageChecklist ?? [], pathways: entry.pathways, active: entry.active,
  } : emptyDraft());
  const [newChecklistItem, setNewChecklistItem] = useState('');

  const set = <K extends keyof Draft>(field: K, value: Draft[K]) => setDraft(prev => ({ ...prev, [field]: value }));

  const updatePathway = (idx: number, changes: Partial<ProtocolPathway>) => {
    set('pathways', draft.pathways.map((p, i) => i === idx ? { ...p, ...changes } : p));
  };
  const removePathway = (idx: number) => set('pathways', draft.pathways.filter((_, i) => i !== idx));
  const addPathway = () => set('pathways', [...draft.pathways, emptyPathway()]);

  const updateTask = (pathwayIdx: number, taskIdx: number, changes: Partial<PathwayTask>) => {
    const pathway = draft.pathways[pathwayIdx];
    const tasks = pathway.tasks.map((t, i) => i === taskIdx ? { ...t, ...changes } : t);
    updatePathway(pathwayIdx, { tasks });
  };
  const removeTask = (pathwayIdx: number, taskIdx: number) => {
    const pathway = draft.pathways[pathwayIdx];
    updatePathway(pathwayIdx, { tasks: pathway.tasks.filter((_, i) => i !== taskIdx) });
  };
  const addTask = (pathwayIdx: number) => {
    const pathway = draft.pathways[pathwayIdx];
    updatePathway(pathwayIdx, { tasks: [...pathway.tasks, emptyTask(pathway.tasks.length + 1)] });
  };

  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    set('triageChecklist', [...(draft.triageChecklist ?? []), newChecklistItem.trim()]);
    setNewChecklistItem('');
  };
  const removeChecklistItem = (idx: number) => {
    set('triageChecklist', (draft.triageChecklist ?? []).filter((_, i) => i !== idx));
  };

  const canSave = draft.name.trim().length > 0 && draft.pathways.length > 0 && draft.pathways.every(p => p.pathwayName.trim());

  return (
    <div className="ps-ms-overlay">
      <div className="ps-ms-modal ps-ms-modal--protocol">
        <div className="ps-ms-header">{mode === 'add' ? 'Add Protocol' : `Edit — ${entry?.name}`}</div>
        <div className="ps-ms-body ps-protocol-body-grid">

          {/* ── Left column: protocol-level fields ── */}
          <div className="ps-protocol-col-left">
            <div className="ps-conf-form-field">
              <label className="ps-conf-label">Name <span className="ps-conf-required">*</span></label>
              <input className="ps-conf-input" value={draft.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Medical Renal Protocol" />
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
            <div className="ps-conf-form-field">
              <label className="ps-conf-label">Description</label>
              <textarea className="ps-conf-input ps-conf-textarea" value={draft.description} onChange={e => set('description', e.target.value)}
                placeholder="What this protocol is for, and which specimen types typically map to it" />
            </div>

            <div className="ps-conf-form-field">
              <label className="ps-conf-label">Requires Triage at the Bench</label>
              <div className="ps-conf-toggle-row">
                <div onClick={() => set('requiresTriage', !draft.requiresTriage)} className={`ps-conf-toggle-track ${draft.requiresTriage ? 'ps-conf-toggle-track--active' : ''}`}>
                  <div className="ps-conf-toggle-thumb" />
                </div>
                <span className={`ps-conf-toggle-label ${draft.requiresTriage ? 'ps-conf-toggle-label--active' : ''}`}>{draft.requiresTriage ? 'Required' : 'Not required'}</span>
              </div>
            </div>

            {draft.requiresTriage && (
              <div className="ps-conf-form-field">
                <label className="ps-conf-label">Triage Checklist</label>
                {(draft.triageChecklist ?? []).map((item, i) => (
                  <div key={i} className="ps-protocol-checklist-item">
                    <span>{item}</span>
                    <button className="ps-protocol-remove-btn" onClick={() => removeChecklistItem(i)}>Remove</button>
                  </div>
                ))}
                <div className="ps-protocol-checklist-add">
                  <input className="ps-conf-input" value={newChecklistItem} onChange={e => setNewChecklistItem(e.target.value)}
                    placeholder="e.g. Split core into LM/IF/EM portions" onKeyDown={e => e.key === 'Enter' && addChecklistItem()} />
                  <button className="ps-conf-btn-row" onClick={addChecklistItem}>Add Step</button>
                </div>
              </div>
            )}
          </div>

          {/* ── Right column: tracks, independently scrollable ── */}
          <div className="ps-protocol-col-right">
            <div className="ps-protocol-tracks-header">
              <label className="ps-conf-label">Tracks</label>
              <button className="ps-conf-btn-primary" onClick={addPathway}>+ Add Track</button>
            </div>

            <div className="ps-protocol-tracks-scroll">
              {draft.pathways.map((pathway, pIdx) => (
                <div key={pathway.id} className="ps-protocol-track-card">
                  <div className="ps-protocol-track-header">
                    <input className="ps-conf-input ps-protocol-track-name" value={pathway.pathwayName}
                      onChange={e => updatePathway(pIdx, { pathwayName: e.target.value })} placeholder={`Track ${pIdx + 1} name — e.g. Light Microscopy`} />
                    {draft.pathways.length > 1 && (
                      <button className="ps-protocol-remove-btn" onClick={() => removePathway(pIdx)}>Remove Track</button>
                    )}
                  </div>
                  <div className="ps-conf-form-row">
                    <div className="ps-conf-form-field">
                      <label className="ps-conf-label">Fixative</label>
                      <input className="ps-conf-input" value={pathway.fixativeType} onChange={e => updatePathway(pIdx, { fixativeType: e.target.value })} />
                    </div>
                    <div className="ps-conf-form-field">
                      <label className="ps-conf-label">Processing Format</label>
                      <input className="ps-conf-input" value={pathway.processingFormat} onChange={e => updatePathway(pIdx, { processingFormat: e.target.value })} />
                    </div>
                    <div className="ps-conf-form-field ps-protocol-decal-field">
                      <label className="ps-conf-label">Requires Decal</label>
                      <div className="ps-conf-toggle-row">
                        <div onClick={() => updatePathway(pIdx, { requiresDecal: !pathway.requiresDecal })}
                          className={`ps-conf-toggle-track ${pathway.requiresDecal ? 'ps-conf-toggle-track--active' : ''}`}>
                          <div className="ps-conf-toggle-thumb" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {pathway.tasks.map((task, tIdx) => (
                    <div key={task.id} className="ps-protocol-step-row">
                      <div className="ps-conf-form-row">
                        <div className="ps-conf-form-field">
                          <label className="ps-conf-label">Step {tIdx + 1} Action</label>
                          <input className="ps-conf-input" value={task.action} onChange={e => updateTask(pIdx, tIdx, { action: e.target.value })}
                            placeholder="e.g. Cut Level 1, Frozen Section" />
                        </div>
                        <div className="ps-conf-form-field ps-protocol-slidecount-field">
                          <label className="ps-conf-label">Slides</label>
                          <input className="ps-conf-input" type="number" min="0" value={task.slideCount ?? ''}
                            onChange={e => updateTask(pIdx, tIdx, { slideCount: e.target.value ? Number(e.target.value) : undefined })} />
                        </div>
                        <div className="ps-conf-form-field ps-protocol-hold-field">
                          <label className="ps-conf-label">Hold</label>
                          <div className="ps-conf-toggle-row">
                            <div onClick={() => updateTask(pIdx, tIdx, { isHold: !task.isHold })}
                              className={`ps-conf-toggle-track ${task.isHold ? 'ps-conf-toggle-track--active' : ''}`}>
                              <div className="ps-conf-toggle-thumb" />
                            </div>
                          </div>
                        </div>
                      </div>
                      {!task.isHold && (
                        <StainMultiSelect
                          stainTypes={stainTypes}
                          selectedIds={task.stainTypeIds}
                          onChange={ids => updateTask(pIdx, tIdx, { stainTypeIds: ids })}
                        />
                      )}
                      <button className="ps-protocol-remove-btn" onClick={() => removeTask(pIdx, tIdx)}>Remove Step</button>
                    </div>
                  ))}
                  <button className="ps-conf-btn-row" onClick={() => addTask(pIdx)}>+ Add Step</button>
                </div>
              ))}
            </div>
          </div>

        </div>
        <div className="ps-ms-footer">
          <button className="ps-ms-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="ps-ms-btn-apply" onClick={() => onSave(draft)} disabled={!canSave}>
            {mode === 'add' ? 'Add Protocol' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main section ─────────────────────────────────────────────────────────

const ProtocolDictionarySection: React.FC = () => {
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [stainTypes, setStainTypes] = useState<StainType[]>([]);
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; entry?: Protocol } | null>(null);

  const loadAll = () => {
    protocolService.getAll().then(res => { if (res.ok) setProtocols(res.data); });
  };
  useEffect(() => {
    loadAll();
    stainTypeService.getAll().then(res => { if (res.ok) setStainTypes(res.data.filter(s => s.active)); });
  }, []);

  const handleSave = (draft: Draft) => {
    const promise = modal?.mode === 'edit' && modal.entry
      ? protocolService.update(modal.entry.id, draft)
      : protocolService.add(draft);
    promise.then(() => { setModal(null); loadAll(); });
  };

  return (
    <div>
      <div className="ps-conf-section-header">
        <div>
          <h3 className="ps-conf-section-title">Protocol Dictionary</h3>
          <p className="ps-conf-section-subtitle">
            Standalone, referenceable processing workflows — a Protocol isn't tied to one specimen type. Map it
            from the Specimen Dictionary's "Processing Protocol" field; editing it here cascades to every
            specimen type that references it.
          </p>
        </div>
        <button className="ps-conf-btn-primary" onClick={() => setModal({ mode: 'add' })}>+ Add Protocol</button>
      </div>

      <div className="ps-conf-table-wrap">
        <div className="ps-conf-table-scroll">
          <table className="ps-conf-table">
            <thead className="ps-conf-thead-sticky">
              <tr>{['Name', 'Tracks', 'Requires Triage', 'Status', 'Actions'].map(h => <th key={h} className="ps-conf-th">{h}</th>)}</tr>
            </thead>
            <tbody>
              {protocols.map(p => (
                <tr key={p.id} className="ps-conf-tr">
                  <td className="ps-conf-td">
                    <div className="ps-conf-identity-name">{p.name}</div>
                    {p.description && <div className="ps-specreq-meta">{p.description}</div>}
                  </td>
                  <td className="ps-conf-td">{p.pathways.map(pw => pw.pathwayName).join(', ')}</td>
                  <td className="ps-conf-td">{p.requiresTriage ? 'Yes' : 'No'}</td>
                  <td className="ps-conf-td">
                    <span className="ps-conf-status-cell">
                      <span className={`ps-conf-status-dot ${p.active ? 'ps-conf-status-dot--active' : ''}`} />
                      <span className={`ps-conf-status-text ${p.active ? 'ps-conf-status-text--active' : ''}`}>{p.active ? 'Active' : 'Inactive'}</span>
                    </span>
                  </td>
                  <td className="ps-conf-td"><button className="ps-conf-btn-row" onClick={() => setModal({ mode: 'edit', entry: p })}>Edit</button></td>
                </tr>
              ))}
              {protocols.length === 0 && <tr><td className="ps-conf-empty-row" colSpan={5}>No protocols yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <EditorModal mode={modal.mode} entry={modal.entry} stainTypes={stainTypes} onSave={handleSave} onClose={() => setModal(null)} />
      )}
    </div>
  );
};

export default ProtocolDictionarySection;
