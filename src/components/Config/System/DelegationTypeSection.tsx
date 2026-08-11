/**
 * DelegationTypeSection.tsx
 * System › Delegation Types
 * System types: toggle only. Custom types: full CRUD.
 * Form converted from inline to ps-conf-backdrop + fm-modal pattern.
 */
import React, { useState, useEffect, useCallback } from 'react';
import '../../../pathscribe.css';
import { mockDelegationTypeService } from '../../../services/delegationTypes/mockDelegationTypeService';
import type { DelegationType } from '../../../services/delegationTypes/IDelegationTypeService';

const PRESET_COLORS = [
  '#0891B2','#6366f1','#f59e0b','#10b981',
  '#8b5cf6','#64748b','#ef4444','#38bdf8',
  '#34d399','#fb923c','#f87171','#e879f9',
];

function generateId(label: string): string {
  return label.toUpperCase().replace(/[^A-Z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,24);
}

const BLANK = (): DelegationType => ({
  id:'', label:'', description:'', active:true,
  color: PRESET_COLORS[0], transfersOwnership:false,
  requiresNote:false, multiAssign:false,
  isSystem:false, sortOrder:999, cptHint:undefined,
});

// ── Toggle ────────────────────────────────────────────────────────────────────

const Toggle: React.FC<{checked:boolean; onChange:(v:boolean)=>void; label?:string; disabled?:boolean}> =
({ checked, onChange, label, disabled=false }) => (
  <div className="ps-sub-toggle-wrap" style={{ opacity: disabled ? 0.4 : 1 }}>
    <div
      onClick={() => !disabled && onChange(!checked)}
      className={checked ? 'ps-sub-toggle-track ps-sub-toggle-track--on' : 'ps-sub-toggle-track ps-sub-toggle-track--off'}
    >
      <div className={checked ? 'ps-sub-toggle-thumb ps-sub-toggle-thumb--on' : 'ps-sub-toggle-thumb ps-sub-toggle-thumb--off'} />
    </div>
    {label && <span className={checked ? 'ps-sub-toggle-label--on' : 'ps-sub-toggle-label--off'}>{label}</span>}
  </div>
);

// ── Form modal ────────────────────────────────────────────────────────────────

interface FormProps {
  initial:     DelegationType | null;
  existingIds: string[];
  onSave:      (dt: DelegationType) => void;
  onCancel:    () => void;
}

const Form: React.FC<FormProps> = ({ initial, existingIds, onSave, onCancel }) => {
  const isNew = initial === null;
  const [form, setForm]         = useState<DelegationType>(initial ?? BLANK());
  const [idTouched, setIdTouched] = useState(!isNew);
  const [errors, setErrors]     = useState<Partial<Record<keyof DelegationType, string>>>({});

  useEffect(() => {
    if (isNew && !idTouched && form.label) setForm(f => ({ ...f, id: generateId(f.label) }));
  }, [form.label, idTouched, isNew]);

  const set = <K extends keyof DelegationType>(k: K, v: DelegationType[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e: Partial<Record<keyof DelegationType, string>> = {};
    if (!form.label.trim())       e.label       = 'Required';
    if (!form.id.trim())          e.id          = 'Required';
    if (!form.description.trim()) e.description = 'Required';
    if (isNew && existingIds.includes(form.id)) e.id = 'ID already exists';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <div className="ps-conf-backdrop">
      <div
        className="fm-modal fm-modal--config"
        style={{ width: 'min(600px, 96vw)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="fm-modal-header">
          <div>
            <div className="fm-eyebrow">Configuration · Delegation Types</div>
            <h2 className="fm-title" style={{ fontSize: 16 }}>
              {isNew ? 'Add Delegation Type' : 'Edit — ' + initial!.label}
            </h2>
          </div>
        </div>

        <div className="ps-client-editor-body">

          {/* Label + ID row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="ps-sub-field">
              <label className="ps-sub-label">Label <span className="ps-sub-label-req">*</span></label>
              <input
                className={errors.label ? 'ps-sub-input ps-sub-input--error' : 'ps-sub-input'}
                value={form.label}
                placeholder="e.g. Consult Request"
                onChange={e => set('label', e.target.value)}
              />
              {errors.label && <span className="ps-sub-error">{errors.label}</span>}
            </div>
            <div className="ps-sub-field">
              <label className="ps-sub-label">
                ID {isNew && <span className="ps-sub-label-opt">(auto-derived)</span>}
              </label>
              <input
                className={errors.id ? 'ps-sub-input ps-sub-input--error' : 'ps-sub-input'}
                value={form.id}
                disabled={!isNew}
                placeholder="CONSULT_REQUEST"
                style={{ fontFamily: 'monospace', opacity: isNew ? 1 : 0.5 }}
                onChange={e => { setIdTouched(true); set('id', e.target.value.toUpperCase()); }}
              />
              {errors.id && <span className="ps-sub-error">{errors.id}</span>}
            </div>
          </div>

          {/* Description */}
          <div className="ps-sub-field">
            <label className="ps-sub-label">Description <span className="ps-sub-label-req">*</span></label>
            <textarea
              className={errors.description ? 'ps-sub-input ps-sub-input--error' : 'ps-sub-input'}
              value={form.description}
              rows={2}
              placeholder="Shown to staff during delegation…"
              style={{ resize: 'vertical' }}
              onChange={e => set('description', e.target.value)}
            />
            {errors.description && <span className="ps-sub-error">{errors.description}</span>}
          </div>

          {/* CPT Hint */}
          <div className="ps-sub-field">
            <label className="ps-sub-label">CPT Hint <span className="ps-sub-label-opt">(optional)</span></label>
            <input
              className="ps-sub-input"
              value={form.cptHint ?? ''}
              placeholder="e.g. 88321–88325"
              onChange={e => set('cptHint', e.target.value || undefined)}
            />
          </div>

          {/* Colour */}
          <div className="ps-sub-field">
            <label className="ps-sub-label">Accent Colour</label>
            <div className="ps-type-color-row">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  className={form.color === c ? 'ps-type-color-swatch ps-type-color-swatch--active' : 'ps-type-color-swatch'}
                  style={{ background: c }}
                  onClick={() => set('color', c)}
                  title={c}
                />
              ))}
              <input
                type="color"
                value={form.color}
                onChange={e => set('color', e.target.value)}
                className="ps-type-color-input"
                title="Custom colour"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="ps-sub-field">
            <label className="ps-sub-label">Options</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Toggle checked={form.active}               onChange={v => set('active', v)}               label="Active" />
              <Toggle checked={!!form.transfersOwnership} onChange={v => set('transfersOwnership', v)}   label="Transfers Ownership" />
              <Toggle checked={!!form.requiresNote}       onChange={v => set('requiresNote', v)}         label="Requires Note" />
            </div>
          </div>

        </div>

        <div className="fm-footer">
          <span className="fm-footer-status" />
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onCancel} className="fm-btn-cancel">Cancel</button>
            <button
              onClick={() => validate() && onSave({ ...form, cptHint: form.cptHint?.trim() || undefined })}
              className="fm-btn-apply"
            >
              {isNew ? 'Add Type' : 'Save Changes'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

// ── Row ───────────────────────────────────────────────────────────────────────

interface RowProps {
  dt:              DelegationType;
  editingAny:      boolean;
  onToggle:        (dt: DelegationType) => void;
  onEdit:          (dt: DelegationType) => void;
  onDeleteRequest: (id: string) => void;
  deleteConfirm:   string | null;
  onDeleteConfirm: (id: string) => void;
  onDeleteCancel:  () => void;
}

const Row: React.FC<RowProps> = ({
  dt, editingAny, onToggle, onEdit, onDeleteRequest,
  deleteConfirm, onDeleteConfirm, onDeleteCancel,
}) => (
  <div className={`ps-del-row${dt.active ? '' : ' ps-del-row--inactive'}`}>
    <div className="ps-del-dot" style={{ background: dt.color }} />
    <span
      className="ps-del-id-badge"
      style={{ background: dt.color + '22', color: dt.color, border: '1px solid ' + dt.color + '44' }}
    >
      {dt.id}
    </span>
    <div className="ps-del-info">
      <div className="ps-del-name-row">
        <span className="ps-del-name">{dt.label}</span>
        {dt.isSystem          && <span className="ps-del-tag">🔒 system</span>}
        {dt.transfersOwnership && <span className="ps-del-tag ps-del-tag--warn">transfers ownership</span>}
        {dt.requiresNote       && <span className="ps-del-tag">requires note</span>}
        {dt.cptHint            && <span className="ps-del-tag">CPT {dt.cptHint}</span>}
      </div>
      <div className="ps-del-desc">{dt.description}</div>
    </div>
    <Toggle checked={dt.active} onChange={() => onToggle(dt)} label={dt.active ? 'Active' : 'Inactive'} />
    {!dt.isSystem && (
      <button
        className="ps-sub-edit-btn"
        onClick={() => onEdit(dt)}
        disabled={editingAny}
        style={{ opacity: editingAny ? 0.4 : 1 }}
      >
        Edit
      </button>
    )}
    {!dt.isSystem && (
      deleteConfirm === dt.id ? (
        <div className="ps-del-confirm-row">
          <span className="ps-del-confirm-label">Delete?</span>
          <button className="ps-sub-btn-inactivate" onClick={() => onDeleteConfirm(dt.id)}>Yes</button>
          <button className="fm-btn-cancel" onClick={onDeleteCancel}>No</button>
        </div>
      ) : (
        <button
          className="ps-del-delete-btn"
          onClick={() => onDeleteRequest(dt.id)}
          disabled={editingAny}
          style={{ opacity: editingAny ? 0.4 : 1 }}
        >
          ✕
        </button>
      )
    )}
  </div>
);

// ── Main section ──────────────────────────────────────────────────────────────

const DelegationTypeSection: React.FC = () => {
  const [types,         setTypes]         = useState<DelegationType[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [editing,       setEditing]       = useState<DelegationType | 'new' | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await mockDelegationTypeService.getAll();
    if (result.ok) setTypes(result.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (dt: DelegationType) => {
    await mockDelegationTypeService.update(dt.id, { active: !dt.active });
    await load();
  };

  const handleSave = async (dt: DelegationType) => {
    if (editing === 'new') {
      const { id: _id, isSystem: _isSystem, ...rest } = dt;
      await mockDelegationTypeService.add(rest);
    } else {
      await mockDelegationTypeService.update(dt.id, dt);
    }
    setEditing(null);
    await load();
  };

  const handleDelete = async (id: string) => {
    await mockDelegationTypeService.remove(id);
    setDeleteConfirm(null);
    await load();
  };

  const editingAny  = editing !== null;
  const systemTypes = types.filter(t =>  t.isSystem);
  const customTypes = types.filter(t => !t.isSystem);
  const existingIds = types.map(t => t.id);

  const groupLabel = (text: string) => (
    <div className="ps-del-group-label">{text}</div>
  );

  return (
    <div className="ps-del-shell">

      <div className="ps-del-header">
        <div>
          <h2 className="ps-sub-title">Delegation Types</h2>
          <p className="ps-sub-subtitle">System types can be enabled or disabled. Custom types are fully editable.</p>
        </div>
        <button className="ps-section-add-btn" onClick={() => setEditing('new')}>
          + Add Type
        </button>
      </div>

      {editing && (
        <Form
          initial={editing === 'new' ? null : editing}
          existingIds={existingIds}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}

      {loading ? (
        <div className="ps-del-loading">Loading…</div>
      ) : (
        <>
          <div className="ps-del-group">
            {groupLabel('System Types')}
            <div className="ps-del-list">
              {systemTypes.map(dt => (
                <Row key={dt.id} dt={dt} editingAny={editingAny} onToggle={handleToggle}
                  onEdit={() => {}} onDeleteRequest={() => {}}
                  deleteConfirm={null} onDeleteConfirm={() => {}} onDeleteCancel={() => {}} />
              ))}
            </div>
          </div>

          <div className="ps-del-group">
            {groupLabel('Custom Types')}
            {customTypes.length === 0 ? (
              <div className="ps-del-empty">No custom types yet — create one with the Add Type button.</div>
            ) : (
              <div className="ps-del-list">
                {customTypes.map(dt => (
                  <Row key={dt.id} dt={dt} editingAny={editingAny} onToggle={handleToggle}
                    onEdit={d => setEditing(d)} onDeleteRequest={id => setDeleteConfirm(id)}
                    deleteConfirm={deleteConfirm} onDeleteConfirm={handleDelete}
                    onDeleteCancel={() => setDeleteConfirm(null)} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default DelegationTypeSection;
