import React, { useEffect, useRef, useState } from 'react';
import { useFocusTrap } from '../../../hooks/useFocusTrap';
import '../../../pathscribe.css';
import { Flag } from '../../../services/flags/IFlagService';
import { IconKey } from '../../../types/smarttag.types';
import { flagService } from '../../../services';
import { COMP_AUDIT } from '../../../constants/computationalActions';
import { useAuditLog } from '../../Audit/useAuditLog';
import AutoCreatedBanner from '../../Flags/AutoCreatedBanner';

// ─── Constants ────────────────────────────────────────────────────────────────

const SEVERITY_LABELS: Record<number, string> = {
  1: 'Informational',
  2: 'Low',
  3: 'Medium',
  4: 'High',
  5: 'Critical',
};

const ICON_KEY_OPTIONS: IconKey[] = [
  'ihc', 'fish', 'molecular', 'flow-cytometry',
  'cytogenetics', 'micro', 'coag', 'generic-lab',
];

// ─── Toggle ───────────────────────────────────────────────────────────────────

const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
    <div
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
        background: value ? 'var(--ps-conf-green)' : 'var(--ps-conf-text-dim)',
      }}
    >
      <div style={{
        position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%',
        background: '#fff', transition: 'left 0.2s',
        left: value ? 23 : 3, boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </div>
    <span style={{ fontSize: 13, fontWeight: 600, color: value ? 'var(--ps-conf-green)' : 'var(--ps-conf-text-3)' }}>
      {value ? 'Active' : 'Inactive'}
    </span>
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────

const FlagConfigPage: React.FC = () => {
  const { log } = useAuditLog();
  const modalRef = useRef<HTMLDivElement>(null);
  const [flags,         setFlags]         = useState<Flag[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [showModal,     setShowModal]     = useState(false);
  const [showConfirm,   setShowConfirm]   = useState(false);
  const [editingFlag,   setEditingFlag]   = useState<Flag | null>(null);
  useFocusTrap(modalRef, showModal);

  // ── Form state ────────────────────────────────────────────────────────────
  const [name,          setName]          = useState('');
  const [description,   setDescription]   = useState('');
  const [level,         setLevel]         = useState<'Case' | 'Specimen'>('Case');
  const [lisCode,       setLisCode]       = useState('');
  const [active,        setActive]        = useState(true);
  const [severity,      setSeverity]      = useState<1|2|3|4|5>(1);

  // Icon is now a universal field, not gated behind a Computational/
  // Administrative toggle — that distinction turned out to be
  // vestigial (see IFlagService.ts's Flag.tagClass comment) and its
  // removal fixed a real bug: FlagManagerModal was filtering out every
  // COMPUTATIONAL-tagged flag, hiding them from the only place a flag
  // could actually be applied.
  const [iconKey,          setIconKey]          = useState<IconKey>('generic-lab');

  // ── Filter state ──────────────────────────────────────────────────────────
  const [errors,        setErrors]        = useState<{ name?: string }>({});
  const [search,        setSearch]        = useState('');
  const [statusFilter,  setStatusFilter]  = useState<'All' | 'Active' | 'Inactive'>('All');
  const [levelFilter,   setLevelFilter]   = useState<'All' | 'Case' | 'Specimen'>('All');
  const [reviewingAutoCreated, setReviewingAutoCreated] = useState(false);

  useEffect(() => { loadFlags(); }, []);

  const loadFlags = async () => {
    setLoading(true);
    const res = await flagService.getAll();
    if (res.ok) setFlags(res.data);
    setLoading(false);
  };

  // ── Auto-created flags ────────────────────────────────────────────────────

  const autoCreatedFlags = flags.filter(f => f.autoCreated && f.status === 'Active');

  const handleReviewAutoCreated = () => {
    setReviewingAutoCreated(true);
    setSearch('');
    setStatusFilter('All');
    setLevelFilter('All');
    setClassFilter('All');
  };

  // ── Modal helpers ─────────────────────────────────────────────────────────

  const resetForm = () => {
    setName(''); setDescription(''); setLevel('Case'); setLisCode('');
    setActive(true); setSeverity(1);
    setIconKey('generic-lab'); setErrors({});
  };

  const openAddModal = () => {
    setEditingFlag(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (flag: Flag) => {
    setEditingFlag(flag);
    setName(flag.name);
    setDescription(flag.description ?? '');
    setLevel(flag.level);
    setLisCode(flag.lisCode);
    setActive(flag.status === 'Active');
    setSeverity(flag.severity);
    setIconKey(flag.iconKey ?? 'generic-lab');
    setErrors({});
    setShowModal(true);
  };

  const requestSave = () => {
    const e: typeof errors = {};
    if (!name.trim()) e.name = 'Name is required';
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setShowModal(false);
    setShowConfirm(true);
  };

  const buildPayload = (): Omit<Flag, 'id'> => ({
    name, description, level, lisCode, severity, iconKey,
    status: (active ? 'Active' : 'Inactive') as 'Active' | 'Inactive',
    autoCreated: false,
  });

  const confirmSave = async () => {
    const payload = buildPayload();

    if (editingFlag) {
      const res = await flagService.update(editingFlag.id, payload);
      if (res.ok) {
        setFlags(prev => prev.map(f => f.id === res.data.id ? res.data : f));
        // Audit: track changes
        const changes: string[] = [];
        if (name        !== editingFlag.name)                         changes.push('name');
        if (description !== (editingFlag.description ?? ''))          changes.push('description');
        if (lisCode     !== (editingFlag.lisCode ?? ''))              changes.push('lisCode');

        if (!active && editingFlag.status === 'Active') {
          log(COMP_AUDIT.CONFIG_FLAG_DEACTIVATED, { flagId: editingFlag.id, flagName: editingFlag.name });
        }
        if (changes.length > 0) {
          log(COMP_AUDIT.CONFIG_FLAG_UPDATED, { flagId: editingFlag.id, changes });
        }
      }
    } else {
      const res = await flagService.add(payload);
      if (res.ok) {
        setFlags(prev => [...prev, res.data]);
        // Audit: new flag
        log(COMP_AUDIT.CONFIG_FLAG_CREATED, {
          flagId: res.data.id, flagName: name, lisCode
        });
      }
    }
    setShowConfirm(false);
  };

  // ── Filtering ─────────────────────────────────────────────────────────────

  const filtered = flags.filter(f => {
    if (reviewingAutoCreated) return !!f.autoCreated;
    const matchSearch = !search ||
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      (f.lisCode ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' ||
      (statusFilter === 'Active' ? f.status === 'Active' : f.status === 'Inactive');
    const matchLevel  = levelFilter === 'All' || f.level === levelFilter;
    return matchSearch && matchStatus && matchLevel;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Auto-created banner ── */}
      {autoCreatedFlags.length > 0 && (
        <AutoCreatedBanner flags={autoCreatedFlags} onReview={handleReviewAutoCreated} />
      )}

      {reviewingAutoCreated && (
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--ps-conf-text-3)' }}>
            Showing {autoCreatedFlags.length} auto-created flag{autoCreatedFlags.length !== 1 ? 's' : ''} pending review
          </span>
          <button className="ps-conf-btn-secondary" onClick={() => setReviewingAutoCreated(false)}>
            Clear filter
          </button>
        </div>
      )}

      {/* ── Header ── */}
      <div className="ps-conf-section-header">
        <div>
          <h3 className="ps-conf-section-title">Case &amp; Specimen Flags</h3>
          <p className="ps-conf-section-subtitle">Manage administrative and computational flags used in case workflows</p>
        </div>
        <button className="ps-conf-btn-primary" onClick={openAddModal}>+ Add Flag</button>
      </div>

      {/* ── Filters ── */}
      {!reviewingAutoCreated && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search flags..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="ps-conf-search"
            style={{ flex: 1, minWidth: 180 }}
          />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="ps-conf-select">
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <select value={levelFilter} onChange={e => setLevelFilter(e.target.value as any)} className="ps-conf-select">
            <option value="All">All Levels</option>
            <option value="Case">Case</option>
            <option value="Specimen">Specimen</option>
          </select>
        </div>
      )}

      {/* ── Table ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th className="ps-conf-th">Name</th>
            <th className="ps-conf-th">Level</th>
            <th className="ps-conf-th">LIS Code</th>
            <th className="ps-conf-th">Severity</th>
            <th className="ps-conf-th">Status</th>
            <th className="ps-conf-th">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(flag => (
            <tr key={flag.id}>
              <td className="ps-conf-td">
                {flag.name}
                {flag.autoCreated && (
                  <span style={{
                    marginLeft: 8, fontSize: 10, fontWeight: 600,
                    background: 'var(--ps-conf-amber-bg, #fef9e7)',
                    color: 'var(--ps-conf-amber, #b7791f)',
                    padding: '1px 6px', borderRadius: 4,
                  }}>
                    LIS import
                  </span>
                )}
              </td>
              <td className="ps-conf-td" style={{ color: 'var(--ps-conf-text-3)' }}>{flag.level}</td>
              <td className="ps-conf-td" style={{ color: 'var(--ps-conf-text-3)' }}>{flag.lisCode}</td>
              <td className="ps-conf-td" style={{ color: 'var(--ps-conf-text-3)' }}>
                {SEVERITY_LABELS[flag.severity]} ({flag.severity})
              </td>
              <td className="ps-conf-td">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%', display: 'inline-block', flexShrink: 0,
                    background: flag.status === 'Active' ? 'var(--ps-conf-green)' : 'var(--ps-conf-text-dim)',
                  }} />
                  <span style={{ fontSize: 13, color: flag.status === 'Active' ? 'var(--ps-conf-text)' : 'var(--ps-conf-text-3)' }}>
                    {flag.status}
                  </span>
                </div>
              </td>
              <td className="ps-conf-td">
                <button className="ps-conf-btn-row" onClick={() => openEditModal(flag)}>Edit</button>
              </td>
            </tr>
          ))}
          {!loading && filtered.length === 0 && (
            <tr>
              <td className="ps-conf-td" style={{ color: 'var(--ps-conf-text-3)' }} colSpan={7}>
                No flags found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="ps-conf-backdrop">
          <div className="fm-modal fm-modal--config" ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="flag-modal-title"
            style={{ width: 'min(600px, 96vw)' }}
            onClick={e => e.stopPropagation()}>
            <div className="fm-modal-header">
              <div>
                <div className="fm-eyebrow">Configuration · Flags</div>
                <h2 id="flag-modal-title" className="fm-title" style={{ fontSize: 16 }}>{editingFlag ? 'Edit Flag' : 'Create Flag'}</h2>
              </div>
            </div>
            <div className="ps-client-editor-body">

              {/* No more Administrative/Computational toggle here — that
                  distinction turned out to be vestigial (see
                  IFlagService.ts's Flag.tagClass comment) and removing
                  it fixed a real bug: FlagManagerModal was filtering
                  out every COMPUTATIONAL-tagged flag, hiding them from
                  the only place a flag could actually be applied.
                  Every flag is just a flag now — one form, one set of
                  fields, attachable to a case, a specimen, or both. */}
              <label className="ps-conf-label">Name <span style={{ color: 'var(--ps-conf-red)' }}>*</span></label>
              <input value={name} onChange={e => { setName(e.target.value); setErrors(prev => ({ ...prev, name: '' })); }}
                className="ps-conf-input" placeholder="Flag name"
                style={{ marginBottom: errors.name ? 4 : 16, borderColor: errors.name ? 'var(--ps-conf-red)' : undefined }} />
              {errors.name && <div style={{ fontSize: 11, color: 'var(--ps-conf-red)', marginBottom: 12 }}>{errors.name}</div>}

              <label className="ps-conf-label">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                className="ps-conf-input" placeholder="Brief description of this flag"
                style={{ height: 70, resize: 'vertical', marginBottom: 16 }} />

              <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <label className="ps-conf-label">Level</label>
                  <div style={{ display: 'flex', gap: 20, marginTop: 6 }}>
                    {(['Case', 'Specimen'] as const).map(l => (
                      <label key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                        <input type="radio" checked={level === l} onChange={() => setLevel(l)} />
                        {l}
                      </label>
                    ))}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="ps-conf-label">Severity</label>
                  <select value={severity} onChange={e => setSeverity(Number(e.target.value) as 1|2|3|4|5)} className="ps-conf-input" style={{ marginBottom: 0 }}>
                    {Object.entries(SEVERITY_LABELS).map(([v, l]) => <option key={v} value={v}>{v} — {l}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <label className="ps-conf-label">LIS Code</label>
                  <input value={lisCode} onChange={e => setLisCode(e.target.value)}
                    className="ps-conf-input" placeholder="e.g. STAT, MAL, IHC"
                    style={{ marginBottom: 0 }} />
                </div>
                <div style={{ flex: '0 0 140px' }}>
                  <label className="ps-conf-label">Icon</label>
                  <select className="ps-conf-input" style={{ marginBottom: 0 }} value={iconKey} onChange={e => setIconKey(e.target.value as IconKey)}>
                    {ICON_KEY_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
              </div>

            <label className="ps-conf-label" style={{ marginTop: 16 }}>Status</label>
            <Toggle value={active} onChange={setActive} />

            </div>{/* /body */}
            <div className="fm-footer">
              <span className="fm-footer-status" />
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowModal(false)} className="fm-btn-cancel">Cancel</button>
                <button onClick={requestSave} className="fm-btn-apply">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Modal ── */}
      {showConfirm && (
        <div className="ps-conf-backdrop">
          <div className="fm-modal fm-modal--config" style={{ width: 'min(440px, 96vw)' }} onClick={e => e.stopPropagation()}>
            <div className="fm-modal-header">
              <div>
                <div className="fm-eyebrow">Configuration · Flags</div>
                <h2 className="fm-title" style={{ fontSize: 16 }}>{editingFlag ? 'Save Changes' : 'Create Flag'}</h2>
              </div>
            </div>
            <div className="ps-client-editor-body">
              <p style={{ margin: 0, color: '#94a3b8', fontSize: 14 }}>
                Are you sure you want to apply these changes?
              </p>
            </div>
            <div className="fm-footer">
              <span className="fm-footer-status" />
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowConfirm(false)} className="fm-btn-cancel">Cancel</button>
                <button onClick={confirmSave} className="fm-btn-apply">Confirm</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FlagConfigPage;
