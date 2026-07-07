// src/components/Config/System/PhysiciansSection.tsx
// ─────────────────────────────────────────────────────────────
// Migrated off the inline-style-constant pattern (FIELD/LABEL/INPUT/
// SELECT/ROW2 objects) and off modalStyles.ts onto pathscribe.css's
// ps-conf-* classes, June 2026. modalStyles.ts's own header marks it
// deprecated in favor of CSS classes and lists this file as a consumer
// still needing the refactor — this is that refactor.
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import '../../../pathscribe.css';
import { physicianService, clientService } from '../../../services';
import type { Physician } from '../../../services';
import { SuffixSelect } from '../../Common/SuffixSelect';
import { formatFullDisplayName } from '../../../utils/personName';

// Physician imported from services/physicians/IPhysicianService.ts (via
// the services barrel) rather than redeclared locally — see git history
// for the reconciliation story (this component used to have its own
// diverged copy, status: 'Active' | 'Inactive' only, no autoCreated).

function initials(p: Physician) { return (p.givenNames[0] + p.familyNames[0]).toUpperCase(); }
function fullName(p: Physician) { return formatFullDisplayName(p); }

// ─── Toggle ───────────────────────────────────────────────────────────────────
const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
  <div className="ps-conf-toggle-row">
    <div onClick={() => onChange(!value)} className={`ps-conf-toggle-track ${value ? 'ps-conf-toggle-track--active' : ''}`}>
      <div className="ps-conf-toggle-thumb" />
    </div>
    <span className={`ps-conf-toggle-label ${value ? 'ps-conf-toggle-label--active' : ''}`}>{value ? 'Active' : 'Inactive'}</span>
  </div>
);

// ─── Modal ────────────────────────────────────────────────────────────────────
type Draft = Omit<Physician, 'id'> & { active: boolean };

const emptyDraft: Draft = {
  namePrefix: 'Dr.', givenNames: '', familyNames: '', preferredName: '', nameSuffix: '',
  firstName: '', lastName: '', // stale by design — mockPhysicianService always recomputes these from givenNames/familyNames on save
  npi: '', specialty: '', phone: '', fax: '',
  email: '', preferredContact: 'Email', clientIds: [], status: 'Active', active: true,
};

interface PhysicianModalProps {
  mode: 'add' | 'edit';
  physician?: Physician;
  clients: { id: string; name: string }[];
  onSave: (draft: Draft) => void;
  onClose: () => void;
}

const PhysicianModal: React.FC<PhysicianModalProps> = ({ mode, physician, clients, onSave, onClose }) => {
  const [draft, setDraft] = useState<Draft>(
    physician
      ? { ...physician, active: physician.status === 'Active' }
      : emptyDraft
  );
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [clientSearch, setClientSearch] = useState('');

  const set = (k: keyof Draft, v: any) => { setDraft(prev => ({ ...prev, [k]: v })); setErrors(prev => ({ ...prev, [k]: '' })); };

  const toggleClient = (id: string) => {
    setDraft(prev => ({
      ...prev,
      clientIds: prev.clientIds.includes(id) ? prev.clientIds.filter(x => x !== id) : [...prev.clientIds, id],
    }));
  };

  const validate = () => {
    const e: typeof errors = {};
    if (!draft.givenNames.trim()) e.givenNames = 'Required';
    if (!draft.familyNames.trim())  e.familyNames  = 'Required';
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    onSave(draft);
  };

  const filteredClients = clients.filter(c =>
    !clientSearch || c.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  return (
    <div className="ps-ms-overlay">
      <div className="ps-ms-modal ps-ms-modal--wide">
        <div className="ps-ms-header">
          {mode === 'add' ? 'Add Physician' : `Edit — ${formatFullDisplayName(physician!)}`}
        </div>

        <div className="ps-ms-body">

          {/* Name */}
          <div className="ps-conf-form-row">
            <div className="ps-conf-form-field">
              <label className="ps-conf-label">Prefix</label>
              <select className="ps-conf-select" value={draft.namePrefix ?? ''} onChange={e => set('namePrefix', e.target.value)}>
                <option value="">None</option>
                <option value="Mr.">Mr.</option>
                <option value="Mrs.">Mrs.</option>
                <option value="Ms.">Ms.</option>
                <option value="Mx.">Mx.</option>
                <option value="Dr.">Dr.</option>
              </select>
            </div>
            <div className="ps-conf-form-field">
              <label className="ps-conf-label">Suffix</label>
              <SuffixSelect value={draft.nameSuffix ?? ''} onChange={v => set('nameSuffix', v)} selectClassName="ps-conf-select" inputClassName="ps-conf-input" />
            </div>
          </div>
          <div className="ps-conf-form-row">
            <div className="ps-conf-form-field">
              <label className="ps-conf-label">Given Name(s) <span className="ps-conf-required">*</span></label>
              <input data-phi="name" className={`ps-conf-input ${errors.givenNames ? 'ps-conf-input--error' : ''}`}
                value={draft.givenNames} onChange={e => set('givenNames', e.target.value)} placeholder="All first/middle names" />
              {errors.givenNames && <span className="ps-conf-error-text" data-phi="name">{errors.givenNames}</span>}
            </div>
            <div className="ps-conf-form-field">
              <label className="ps-conf-label">Family Name(s) <span className="ps-conf-required">*</span></label>
              <input data-phi="name" className={`ps-conf-input ${errors.familyNames ? 'ps-conf-input--error' : ''}`}
                value={draft.familyNames} onChange={e => set('familyNames', e.target.value)} placeholder="Surname(s)" />
              {errors.familyNames && <span className="ps-conf-error-text" data-phi="name">{errors.familyNames}</span>}
            </div>
          </div>
          <div className="ps-conf-form-field">
            <label className="ps-conf-label">Preferred Name (optional)</label>
            <input data-phi="name" className="ps-conf-input" value={draft.preferredName ?? ''} onChange={e => set('preferredName', e.target.value)} placeholder="What staff should call them, if different" />
          </div>

          {/* NPI + Specialty */}
          <div className="ps-conf-form-row">
            <div className="ps-conf-form-field">
              <label className="ps-conf-label">NPI Number</label>
              <input className="ps-conf-input" value={draft.npi} onChange={e => set('npi', e.target.value)} placeholder="10-digit NPI" />
            </div>
            <div className="ps-conf-form-field">
              <label className="ps-conf-label">Specialty</label>
              <input className="ps-conf-input" value={draft.specialty} onChange={e => set('specialty', e.target.value)} placeholder="e.g. Gastroenterology" />
            </div>
          </div>

          {/* Phone + Fax */}
          <div className="ps-conf-form-row">
            <div className="ps-conf-form-field">
              <label className="ps-conf-label">Phone</label>
              <input className="ps-conf-input" value={draft.phone} onChange={e => set('phone', e.target.value)} placeholder="555-0100" />
            </div>
            <div className="ps-conf-form-field">
              <label className="ps-conf-label">Fax</label>
              <input className="ps-conf-input" value={draft.fax} onChange={e => set('fax', e.target.value)} placeholder="555-0101" />
            </div>
          </div>

          {/* Email + Preferred Contact */}
          <div className="ps-conf-form-row">
            <div className="ps-conf-form-field">
              <label className="ps-conf-label">Email</label>
              <input className="ps-conf-input" value={draft.email} onChange={e => set('email', e.target.value)} placeholder="dr@clinic.org" />
            </div>
            <div className="ps-conf-form-field">
              <label className="ps-conf-label">Preferred Contact</label>
              <select className="ps-conf-select" value={draft.preferredContact} onChange={e => set('preferredContact', e.target.value)}>
                <option value="Email">Email</option>
                <option value="Fax">Fax</option>
                <option value="Phone">Phone</option>
              </select>
            </div>
          </div>

          {/* Status */}
          <div className="ps-conf-form-field">
            <label className="ps-conf-label">Status</label>
            <Toggle value={draft.active} onChange={v => set('active', v)} />
          </div>

          {/* Client Affiliations */}
          <div className="ps-conf-form-field">
            <label className="ps-conf-label">Client Affiliations</label>
            <div className="ps-conf-picker">
              <div className="ps-conf-picker-search-wrap">
                <input type="text" placeholder="Search clients..." value={clientSearch}
                  onChange={e => setClientSearch(e.target.value)} className="ps-conf-picker-search" />
              </div>
              <div className="ps-conf-picker-list">
                {filteredClients.length === 0
                  ? <div className="ps-conf-picker-empty">No clients match.</div>
                  : filteredClients.map(c => {
                      const checked = draft.clientIds.includes(c.id);
                      return (
                        <div key={c.id} onClick={() => toggleClient(c.id)}
                          className={`ps-conf-picker-item ${checked ? 'ps-conf-picker-item--checked' : ''}`}>
                          <div className={`ps-conf-picker-checkbox ${checked ? 'ps-conf-picker-checkbox--checked' : ''}`}>
                            {checked && <span className="ps-conf-picker-check-icon">✓</span>}
                          </div>
                          <span className="ps-conf-picker-item-label">{c.name}</span>
                        </div>
                      );
                    })
                }
              </div>
            </div>
            {draft.clientIds.length > 0 && (
              <div className="ps-conf-badge-list ps-conf-picker-selected">
                {draft.clientIds.map(id => {
                  const c = clients.find(x => x.id === id);
                  return c ? <span key={id} className="ps-conf-badge">{c.name}</span> : null;
                })}
              </div>
            )}
          </div>

        </div>

        <div className="ps-ms-footer">
          <button className="ps-ms-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="ps-ms-btn-apply" onClick={handleSave}>
            {mode === 'add' ? 'Add Physician' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main PhysiciansSection ───────────────────────────────────────────────────
const PhysiciansSection: React.FC = () => {
  const [physicians,   setPhysicians]   = useState<Physician[]>([]);
  const [clients,      setClients]      = useState<{ id: string; name: string }[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive' | 'Unverified'>('All');
  const [modal,        setModal]        = useState<{ mode: 'add' | 'edit'; physician?: Physician } | null>(null);

  useEffect(() => {
    Promise.all([
      physicianService.getAll(),
      clientService.getAll(),
    ]).then(([physRes, clientRes]) => {
      if (physRes.ok)   setPhysicians(physRes.data);
      if (clientRes.ok) setClients(clientRes.data.map(c => ({ id: c.id, name: c.name })));
      setLoading(false);
    });
  }, []);

  const filtered = physicians.filter(p => {
    const matchSearch = !search || fullName(p).toLowerCase().includes(search.toLowerCase()) || p.npi.includes(search) || p.specialty.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleSave = async (draft: Draft) => {
    const payload = { ...draft, status: (draft.active ? 'Active' : 'Inactive') as 'Active' | 'Inactive' };
    if (modal?.mode === 'add') {
      const res = await physicianService.add({ ...payload, autoCreated: false });
      if (res.ok) setPhysicians(prev => [...prev, res.data]);
    } else if (modal?.physician) {
      const res = await physicianService.update(modal.physician.id, payload);
      if (res.ok) setPhysicians(prev => prev.map(p => p.id === res.data.id ? res.data : p));
    }
    setModal(null);
  };

  const handleVerify = async (id: string) => {
    const res = await physicianService.verify(id);
    if (res.ok) setPhysicians(prev => prev.map(p => p.id === id ? res.data : p));
  };

  if (loading) return <div className="ps-conf-loading">Loading physicians...</div>;

  return (
    <div>
      <div className="ps-conf-section-header">
        <div>
          <h3 className="ps-conf-section-title">Physicians</h3>
          <p className="ps-conf-section-subtitle">Manage ordering and submitting physicians and their client affiliations.</p>
        </div>
        <button className="ps-conf-btn-primary" onClick={() => setModal({ mode: 'add' })}>+ Add Physician</button>
      </div>

      <div className="ps-conf-form-row">
        <input type="text" placeholder="Search by name, NPI, or specialty..." value={search} onChange={e => setSearch(e.target.value)}
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
                {['Physician', 'Specialty', 'Contact', 'Clients', 'Status', 'Actions'].map(h => (
                  <th key={h} className="ps-conf-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="ps-conf-tr">
                  <td className="ps-conf-td">
                    <div className="ps-conf-identity-cell">
                      <div className="ps-conf-avatar">{initials(p)}</div>
                      <div>
                        <div className="ps-conf-identity-name" data-phi="name">{fullName(p)}</div>
                        <div className="ps-conf-identity-sub">NPI: {p.npi || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="ps-conf-td">{p.specialty || '—'}</td>
                  <td className="ps-conf-td">
                    <div className="ps-conf-contact-cell" data-phi="email">
                      {p.preferredContact === 'Email' && <div>✉ {p.email || '—'}</div>}
                      {p.preferredContact === 'Fax'   && <div>📠 {p.fax || '—'}</div>}
                      {p.preferredContact === 'Phone' && <div data-phi="phone">📞 {p.phone || '—'}</div>}
                      <div className="ps-conf-contact-via">via {p.preferredContact}</div>
                    </div>
                  </td>
                  <td className="ps-conf-td">
                    {p.clientIds.length === 0
                      ? <span className="ps-conf-badge-none">None</span>
                      : <div className="ps-conf-badge-list">
                          {p.clientIds.map(id => {
                            const c = clients.find(x => x.id === id);
                            return c ? <span key={id} className="ps-conf-badge">{c.name}</span> : null;
                          })}
                        </div>
                    }
                  </td>
                  <td className="ps-conf-td">
                    <div className="ps-conf-status-cell">
                      <span className={`ps-conf-status-dot ${p.status === 'Active' ? 'ps-conf-status-dot--active' : p.status === 'Unverified' ? 'ps-conf-status-dot--pending' : ''}`} />
                      <span className={`ps-conf-status-text ${p.status === 'Active' ? 'ps-conf-status-text--active' : p.status === 'Unverified' ? 'ps-conf-status-text--pending' : ''}`}>{p.status}</span>
                    </div>
                    {p.autoCreated && (
                      <div className="ps-conf-auto-note" title={p.autoCreatedNote}>
                        Auto-created{p.autoCreatedAt ? ` ${p.autoCreatedAt}` : ''} — from order intake
                      </div>
                    )}
                  </td>
                  <td className="ps-conf-td">
                    <div className="ps-conf-row-actions">
                      {p.status === 'Unverified' && (
                        <button className="ps-conf-btn-verify" onClick={() => handleVerify(p.id)}>Verify</button>
                      )}
                      <button className="ps-conf-btn-row" onClick={() => setModal({ mode: 'edit', physician: p })}>Edit</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td className="ps-conf-empty-row" colSpan={6}>No physicians match the current filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && <PhysicianModal mode={modal.mode} physician={modal.physician} clients={clients} onSave={handleSave} onClose={() => setModal(null)} />}
    </div>
  );
};

export default PhysiciansSection;
