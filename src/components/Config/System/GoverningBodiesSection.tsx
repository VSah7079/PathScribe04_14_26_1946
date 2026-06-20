/**
 * components/Config/System/GoverningBodiesSection.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Super-admin only. Configure which governing bodies are active in the
 * Synoptic Library and nightly sync.
 *
 * Standard bodies (CAP, RCPath, ICCR, RCPA): toggle only.
 * Custom bodies: full CRUD with ID conflict guard.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import '../../../pathscribe.css';

export interface GoverningBody {
  id:          string;
  label:       string;
  fullName:    string;
  region:      string;
  website:     string;
  enabled:     boolean;
  syncEnabled: boolean;
  isCustom:    boolean;
}

const DEFAULT_BODIES: GoverningBody[] = [
  { id: 'CAP',    label: 'CAP',    fullName: 'College of American Pathologists',               region: 'United States',          website: 'https://www.cap.org',        enabled: true,  syncEnabled: true,  isCustom: false },
  { id: 'RCPath', label: 'RCPath', fullName: 'Royal College of Pathologists',                  region: 'United Kingdom',          website: 'https://www.rcpath.org',     enabled: true,  syncEnabled: true,  isCustom: false },
  { id: 'ICCR',   label: 'ICCR',   fullName: 'International Collaboration on Cancer Reporting', region: 'International',           website: 'https://www.iccr-cancer.org',enabled: true,  syncEnabled: true,  isCustom: false },
  { id: 'RCPA',   label: 'RCPA',   fullName: 'Royal College of Pathologists of Australasia',   region: 'Australia / New Zealand', website: 'https://www.rcpa.edu.au',    enabled: false, syncEnabled: false, isCustom: false },
];

// ── Toggle ────────────────────────────────────────────────────────────────────

const Toggle: React.FC<{
  checked:   boolean;
  onChange:  (v: boolean) => void;
  disabled?: boolean;
  color?:    string;
}> = ({ checked, onChange, disabled = false, color = '#0891B2' }) => (
  <div
    onClick={() => !disabled && onChange(!checked)}
    className={`ps-toggle-track${checked ? ' on' : ' off'}${disabled ? ' disabled' : ''}`}
    style={{ background: checked ? color : undefined }}
  >
    <div className="ps-toggle-thumb" />
  </div>
);

// ── Body Modal ────────────────────────────────────────────────────────────────

const BodyModal: React.FC<{
  initial?:    GoverningBody;
  existingIds: string[];
  onClose:     () => void;
  onSave:      (body: GoverningBody) => void;
}> = ({ initial, existingIds, onClose, onSave }) => {
  const isEdit = !!initial;

  const [label,    setLabel]    = useState(initial?.label    ?? '');
  const [fullName, setFullName] = useState(initial?.fullName ?? '');
  const [region,   setRegion]   = useState(initial?.region   ?? '');
  const [website,  setWebsite]  = useState(initial?.website  ?? '');

  const derivedId  = label.trim().toUpperCase().replace(/\s+/g, '_');
  const idConflict = !isEdit && existingIds.includes(derivedId);
  const canSubmit  = !!(label.trim() && fullName.trim() && !idConflict);

  const handleSave = () => {
    if (!canSubmit) return;
    onSave({
      id:          isEdit ? initial!.id : derivedId,
      label:       label.trim().toUpperCase(),
      fullName:    fullName.trim(),
      region:      region.trim(),
      website:     website.trim(),
      enabled:     initial?.enabled     ?? true,
      syncEnabled: initial?.syncEnabled ?? false,
      isCustom:    true,
    });
    onClose();
  };

  return (
    <div className="ps-conf-backdrop">
      <div className="fm-modal fm-modal--config" style={{ width: 'min(480px, 96vw)' }} onClick={e => e.stopPropagation()}>

        <div className="fm-modal-header">
          <div>
            <div className="fm-eyebrow">Configuration · Governing Bodies</div>
            <h2 className="fm-title" style={{ fontSize: 16 }}>
              {isEdit ? `Edit — ${initial!.label}` : 'Add Governing Body'}
            </h2>
          </div>
          <button onClick={onClose} className="fm-btn-cancel" style={{ padding: '4px 10px' }}>✕</button>
        </div>
        <div className="ps-client-editor-body">

          <div className="ps-body-modal-field">
            <label className="ps-body-modal-label">
              Abbreviation <span className="ps-body-modal-label-req">*</span>
              {isEdit && <span className="ps-body-modal-label-note">(cannot be changed)</span>}
            </label>
            <input
              value={label}
              onChange={e => !isEdit && setLabel(e.target.value)}
              disabled={isEdit}
              placeholder="e.g. RCPA"
              className={[
                'ps-body-modal-input',
                'ps-body-modal-input--mono',
                isEdit     ? 'ps-body-modal-input--disabled' : '',
                idConflict ? 'ps-body-modal-input--error'    : '',
              ].filter(Boolean).join(' ')}
            />
            {idConflict && (
              <div className="ps-body-modal-error">
                ID <strong>{derivedId}</strong> already exists. Custom bodies must have a unique
                abbreviation that does not duplicate a standard body (CAP, RCPath, ICCR, RCPA)
                or another custom body.
              </div>
            )}
          </div>

          <div className="ps-body-modal-field">
            <label className="ps-body-modal-label">
              Full Name <span className="ps-body-modal-label-req">*</span>
            </label>
            <input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="e.g. Royal College of Pathologists of Australasia"
              className="ps-body-modal-input"
            />
          </div>

          <div className="ps-body-modal-field-row">
            <div className="ps-body-modal-field">
              <label className="ps-body-modal-label">Region</label>
              <input
                value={region}
                onChange={e => setRegion(e.target.value)}
                placeholder="e.g. Australia / NZ"
                className="ps-body-modal-input"
              />
            </div>
            <div className="ps-body-modal-field">
              <label className="ps-body-modal-label">Website</label>
              <input
                value={website}
                onChange={e => setWebsite(e.target.value)}
                placeholder="https://..."
                className="ps-body-modal-input"
              />
            </div>
          </div>

          {!isEdit && (
            <div className="ps-body-modal-note">
              <span className="ps-body-modal-note-label">ℹ️ Note — </span>
              auto-sync is disabled for custom bodies by default. Enable it manually once
              the sync feed is configured.
            </div>
          )}

          <div className="fm-footer">
            <span className="fm-footer-status" />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} className="fm-btn-cancel">Cancel</button>
              <button onClick={handleSave} disabled={!canSubmit} className="fm-btn-apply">
                {isEdit ? 'Save Changes' : 'Add Governing Body'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// ── Body Row ──────────────────────────────────────────────────────────────────

const BodyRow: React.FC<{
  body:         GoverningBody;
  isSuperAdmin: boolean;
  onUpdate:     (patch: Partial<GoverningBody>) => void;
  canRemove:    boolean;
  onEdit?:      () => void;
  onRemove?:    () => void;
}> = ({ body, isSuperAdmin, onUpdate, canRemove, onEdit, onRemove }) => (
  <div className={`ps-gov-row${body.enabled ? '' : ' ps-gov-row--disabled'}`}>

    <div>
      <div className="ps-gov-row-name">
        {body.label}
        {body.isCustom && <span className="ps-gov-custom-badge" style={{ marginLeft: 8 }}>CUSTOM</span>}
      </div>
      <div className="ps-gov-row-fullname">
        {body.fullName}
        {body.website && (
          <a href={body.website} target="_blank" rel="noreferrer" className="ps-gov-row-link">↗</a>
        )}
      </div>
    </div>

    <div className="ps-gov-row-region">{body.region}</div>

    <Toggle
      checked={body.enabled}
      onChange={v => onUpdate({ enabled: v, syncEnabled: v ? body.syncEnabled : false })}
      disabled={!isSuperAdmin}
    />

    <Toggle
      checked={body.syncEnabled}
      onChange={v => onUpdate({ syncEnabled: v })}
      disabled={!isSuperAdmin || !body.enabled}
      color="#a78bfa"
    />

    <div className="ps-gov-row-actions">
      {canRemove && onEdit && (
        <button className="ps-btn-ghost-dark" onClick={onEdit} style={{ fontSize: 11, padding: '4px 8px' }}>
          Edit
        </button>
      )}
      {canRemove && onRemove && (
        <button className="ps-gov-remove-btn" onClick={onRemove} title="Remove">✕</button>
      )}
    </div>

  </div>
);

// ── Main ──────────────────────────────────────────────────────────────────────

const GoverningBodiesSection: React.FC<{ isSuperAdmin?: boolean }> = ({ isSuperAdmin = false }) => {
  const [bodies,     setBodies]     = useState<GoverningBody[]>(DEFAULT_BODIES);
  const [showAdd,    setShowAdd]    = useState(false);
  const [editTarget, setEditTarget] = useState<GoverningBody | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const updateBody = (id: string, patch: Partial<GoverningBody>) => { setBodies(p => p.map(b => b.id === id ? { ...b, ...patch } : b)); setHasChanges(true); };
  const removeBody = (id: string)                                  => { setBodies(p => p.filter(b => b.id !== id));                       setHasChanges(true); };
  const handleAdd  = (body: GoverningBody)                         => { setBodies(p => [...p, body]);                                      setHasChanges(true); };
  const handleEdit = (body: GoverningBody)                         => { setBodies(p => p.map(b => b.id === body.id ? body : b));           setHasChanges(true); };
  const handleSave = ()                                            => { /* TODO: persist */ setHasChanges(false); };

  const standardBodies = bodies.filter(b => !b.isCustom);
  const customBodies   = bodies.filter(b =>  b.isCustom);
  const allIds         = bodies.map(b => b.id);

  return (
    <div className="ps-gov-shell">

      <div className="ps-gov-header">
        <div className="ps-gov-header-text">
          <h3 className="ps-gov-title">Governing Bodies</h3>
          <p className="ps-gov-subtitle">
            Controls which governing bodies appear in the Synoptic Library and nightly protocol sync.
            {!isSuperAdmin && <span className="ps-gov-subtitle-warn"> · Super admin access required.</span>}
          </p>
        </div>
        <div className="ps-gov-header-actions">
          {hasChanges && <span className="ps-gov-unsaved">● Unsaved changes</span>}
          {isSuperAdmin && hasChanges && <button className="ps-btn-primary" onClick={handleSave}>Save Changes</button>}
          {isSuperAdmin && <button className="ps-section-add-btn" onClick={() => setShowAdd(true)}>+ Add Custom Body</button>}
        </div>
      </div>

      <div className="ps-gov-callout">
        <span className="ps-gov-callout-icon">🔬</span>
        <div>
          <div className="ps-gov-callout-title">Terminology Monitoring — Coming Soon</div>
          <div className="ps-gov-callout-body">
            The nightly sync will monitor SNOMED CT and ICD-10/11 for deprecated or updated codes
            in your published templates, surfacing alerts in the Synoptic Library.
          </div>
        </div>
      </div>

      <div className="ps-gov-col-headers">
        {['Governing Body', 'Region', 'Enabled', 'Auto-sync', ''].map(h => (
          <div key={h} className="ps-gov-col-header">{h}</div>
        ))}
      </div>

      {standardBodies.map(body => (
        <BodyRow key={body.id} body={body} isSuperAdmin={isSuperAdmin}
          onUpdate={patch => updateBody(body.id, patch)} canRemove={false} />
      ))}

      {customBodies.length > 0 && (
        <>
          <div className="ps-gov-divider-row">
            <span className="ps-gov-divider-label">Custom</span>
            <div className="ps-gov-divider-line" />
          </div>
          <p className="ps-gov-custom-note">
            Custom bodies supplement standard ones — use them for institutional overlays or bodies
            not in the standard list. Enable alongside standard bodies only if they cover distinct
            protocol sets.
          </p>
          {customBodies.map(body => (
            <BodyRow key={body.id} body={body} isSuperAdmin={isSuperAdmin}
              onUpdate={patch => updateBody(body.id, patch)} canRemove={isSuperAdmin}
              onEdit={() => setEditTarget(body)} onRemove={() => removeBody(body.id)} />
          ))}
        </>
      )}

      {showAdd && <BodyModal existingIds={allIds} onClose={() => setShowAdd(false)} onSave={handleAdd} />}
      {editTarget && <BodyModal initial={editTarget} existingIds={allIds} onClose={() => setEditTarget(null)} onSave={handleEdit} />}

    </div>
  );
};

export default GoverningBodiesSection;
