import React, { useState, useRef } from 'react';
import { VOICE_PROFILES, type VoiceProfileId } from '../../../constants/voiceProfiles';
import '../../../pathscribe.css';
import { useSubspecialties } from '../../../contexts/useSubspecialties';
import RoleDictionary, { Role, DEFAULT_ROLES } from './RoleDictionary';
import { userService } from '../../../services';
import { ServiceResult } from '../../../services/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StaffUser {
  id: string;
  firstName: string;
  lastName: string;
  credentials?: string;
  email: string;
  roles: string[];
  npi: string;
  gmcNumber?: string;
  license: string;
  phone: string;
  department: string;
  signatureUrl?: string;
  status: 'Active' | 'Inactive';
  voiceProfile?: string | null;
  canViewPediatric?: boolean;
}

function initials(u: StaffUser) {
  const parts = [u.firstName, (u as any).middleName, u.lastName].filter(Boolean);
  return parts.length >= 2 ? (parts[0][0] + parts[parts.length-1][0]).toUpperCase() : (parts[0]?.[0] ?? '?').toUpperCase();
}
function fullName(u: StaffUser) {
  return [u.firstName, (u as any).middleName, u.lastName].filter(Boolean).join(' ');
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
  <div className="ps-st-toggle-wrap">
    <div onClick={() => onChange(!value)} className={`ps-st-toggle-track ${value ? 'ps-st-toggle-track--on' : 'ps-st-toggle-track--off'}`}>
      <div className={`ps-st-toggle-thumb ${value ? 'ps-st-toggle-thumb--on' : 'ps-st-toggle-thumb--off'}`} />
    </div>
    <span className={value ? 'ps-st-toggle-label--on' : 'ps-st-toggle-label--off'}>
      {value ? 'Active' : 'Inactive'}
    </span>
  </div>
);

// ─── Signature Upload ─────────────────────────────────────────────────────────

const SignatureUpload = ({ url, onChange }: { url?: string; onChange: (url: string) => void }) => {
  const ref = useRef<HTMLInputElement>(null);
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  };
  return (
    <div className="ps-st-sig-wrap">
      {url ? (
        <div className="ps-st-sig-preview">
          <div className="ps-st-sig-img-wrap">
            <img src={url} alt="Signature" className="ps-st-sig-img" />
          </div>
          <button onClick={() => onChange('')} className="ps-st-sig-remove">Remove</button>
        </div>
      ) : (
        <div className="ps-st-sig-dropzone" onClick={() => ref.current?.click()}>
          &#128444;&nbsp; Click to upload signature image
          <div className="ps-st-sig-hint">PNG, JPG, SVG — transparent background recommended</div>
        </div>
      )}
      <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  );
};

// ─── Modal ────────────────────────────────────────────────────────────────────

type Draft = {
  firstName: string; middleName: string; lastName: string; credentials: string;
  email: string; roles: string[]; npi: string; gmcNumber: string; license: string;
  phone: string; department: string; signatureUrl: string; active: boolean;
  voiceProfile: string; canViewPediatric: boolean;
};

const emptyDraft: Draft = {
  firstName: '', middleName: '', lastName: '', credentials: '', email: '',
  roles: [], npi: '', gmcNumber: '', license: '', phone: '', department: '',
  signatureUrl: '', active: true, voiceProfile: '', canViewPediatric: false,
};

interface StaffModalProps {
  mode: 'add' | 'edit';
  user?: StaffUser;
  roles: Role[];
  onSave: (draft: Draft) => void;
  onClose: () => void;
}

const StaffModal: React.FC<StaffModalProps> = ({ mode, user, roles, onSave, onClose }) => {
  const [draft, setDraft] = useState<Draft>(
    user ? {
      firstName: user.firstName, middleName: (user as any).middleName || '',
      lastName: user.lastName, credentials: user.credentials || '',
      email: user.email, roles: [...user.roles], npi: user.npi,
      gmcNumber: user.gmcNumber || '', license: user.license, phone: user.phone,
      department: user.department, signatureUrl: user.signatureUrl || '',
      active: user.status === 'Active', voiceProfile: user.voiceProfile || '',
      canViewPediatric: user.canViewPediatric ?? false,
    } : emptyDraft
  );
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});

  const set = (k: keyof Draft, v: any) => {
    setDraft(prev => ({ ...prev, [k]: v }));
    setErrors(prev => ({ ...prev, [k]: '' }));
  };

  const validate = () => {
    const e: typeof errors = {};
    if (!draft.firstName.trim()) e.firstName = 'Required';
    if (!draft.lastName.trim())  e.lastName  = 'Required';
    if (draft.roles.length === 0) e.roles = 'At least one role is required';
    if (draft.email.trim() && !/\S+@\S+\.\S+/.test(draft.email)) e.email = 'Invalid email';
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    onSave(draft);
  };

  return (
    <div data-capture-hide="true" className="ps-conf-backdrop" onClick={onClose}>
      <div className="ps-conf-modal" onClick={e => e.stopPropagation()}>

        <div className="ps-conf-modal-header ps-st-modal-header">
          <span>{mode === 'add' ? 'Add Staff Member' : `Edit — ${[user?.firstName, (user as any)?.middleName, user?.lastName].filter(Boolean).join(' ')}`}</span>
          <button onClick={onClose} className="ps-st-modal-close" aria-label="Close">✕</button>
        </div>

        <div className="ps-conf-modal-body">

          {/* Row 1: First | Middle | Last */}
          <div className="ps-conf-form-row--3">
            <div className="ps-conf-form-field">
              <label className="ps-conf-label">First Name <span className="ps-st-required">*</span></label>
              <input className="ps-conf-input" style={{ borderColor: errors.firstName ? '#ef4444' : undefined }}
                value={draft.firstName} onChange={e => set('firstName', e.target.value)} placeholder="First name" />
              {errors.firstName && <span className="ps-st-error" data-phi="name">{errors.firstName}</span>}
            </div>
            <div className="ps-conf-form-field">
              <label className="ps-conf-label">Middle Name</label>
              <input className="ps-conf-input" value={draft.middleName} onChange={e => set('middleName', e.target.value)} placeholder="Middle name" />
            </div>
            <div className="ps-conf-form-field">
              <label className="ps-conf-label">Last Name <span className="ps-st-required">*</span></label>
              <input className="ps-conf-input" style={{ borderColor: errors.lastName ? '#ef4444' : undefined }}
                value={draft.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Last name" />
              {errors.lastName && <span className="ps-st-error" data-phi="name">{errors.lastName}</span>}
            </div>
          </div>

          {/* Row 2: Email | Role */}
          <div className="ps-conf-form-row">
            <div className="ps-conf-form-field">
              <label className="ps-conf-label">Email</label>
              <input className="ps-conf-input" style={{ borderColor: errors.email ? '#ef4444' : undefined }}
                value={draft.email} onChange={e => set('email', e.target.value)} placeholder="user@hospital.org" />
              {errors.email && <span className="ps-st-error">{errors.email}</span>}
            </div>
            <div className="ps-conf-form-field">
              <label className="ps-conf-label">Role <span className="ps-st-required">*</span></label>
              {draft.roles.length > 0 && (
                <div className="ps-st-role-chips">
                  {draft.roles.map(rName => {
                    const roleObj = roles.find(x => x.name === rName);
                    const color   = roleObj?.color ?? '#8AB4F8';
                    return (
                      <span key={rName} className="ps-st-role-chip"
                        style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
                        {rName}
                        <span className="ps-st-role-chip-x" style={{ color }}
                          onClick={() => set('roles', draft.roles.filter(x => x !== rName))}>×</span>
                      </span>
                    );
                  })}
                </div>
              )}
              <select value="" onChange={e => { const val = e.target.value; if (val && !draft.roles.includes(val)) set('roles', [...draft.roles, val]); }}
                className="ps-conf-select">
                <option value="" disabled>Select a role...</option>
                {roles.filter(r => r.name !== 'Physician' && !draft.roles.includes(r.name)).map(r => (
                  <option key={r.id} value={r.name}>{r.name}</option>
                ))}
              </select>
              {errors.roles && <span className="ps-st-error">{errors.roles}</span>}
            </div>
          </div>

          {/* Row 3: Phone | Department */}
          <div className="ps-conf-form-row">
            <div className="ps-conf-form-field">
              <label className="ps-conf-label">Phone</label>
              <input className="ps-conf-input" value={draft.phone} onChange={e => set('phone', e.target.value)} placeholder="555-0100" />
            </div>
            <div className="ps-conf-form-field">
              <label className="ps-conf-label">Department</label>
              <input className="ps-conf-input" value={draft.department} onChange={e => set('department', e.target.value)} placeholder="e.g. Surgical Pathology" />
            </div>
          </div>

          {/* Row 4: Credentials */}
          <div className="ps-conf-form-field">
            <label className="ps-conf-label">Credentials <span className="ps-st-label-note">(e.g. MD, FCAP)</span></label>
            <input className="ps-conf-input" value={draft.credentials} onChange={e => set('credentials', e.target.value)} placeholder="e.g. MD, FCAP / MBChB, FRCPath" />
          </div>

          {/* Row 5: NPI | GMC */}
          <div className="ps-conf-form-row">
            <div className="ps-conf-form-field">
              <label className="ps-conf-label">NPI Number <span className="ps-st-label-note">(US)</span></label>
              <input className="ps-conf-input" value={draft.npi} onChange={e => set('npi', e.target.value)} placeholder="10-digit NPI" />
            </div>
            <div className="ps-conf-form-field">
              <label className="ps-conf-label">GMC Number <span className="ps-st-label-note">(UK)</span></label>
              <input className="ps-conf-input" value={draft.gmcNumber} onChange={e => set('gmcNumber', e.target.value)} placeholder="7-digit GMC number" />
            </div>
          </div>

          {/* Row 6: License | Voice Profile */}
          <div className="ps-conf-form-row">
            <div className="ps-conf-form-field">
              <label className="ps-conf-label">License Number</label>
              <input className="ps-conf-input" value={draft.license} onChange={e => set('license', e.target.value)} placeholder="State license #" />
            </div>
            <div className="ps-conf-form-field">
              <label className="ps-conf-label">Voice Profile</label>
              <select value={draft.voiceProfile} onChange={e => set('voiceProfile', e.target.value)} className="ps-conf-select">
                <option value="">System Default (Inherited)</option>
                {VOICE_PROFILES.map(profile => (
                  <option key={profile.id} value={profile.id}>{profile.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 7: Pediatric Access */}
          <div className={`ps-st-peds-row ${draft.canViewPediatric ? 'ps-st-peds-row--on' : 'ps-st-peds-row--off'}`}>
            <label className="ps-st-peds-label">
              <input type="checkbox" checked={draft.canViewPediatric}
                onChange={e => setDraft(d => ({ ...d, canViewPediatric: e.target.checked }))}
                className="ps-st-peds-checkbox" />
              <div>
                <div className={draft.canViewPediatric ? 'ps-st-peds-title--on' : 'ps-st-peds-title--off'}>
                  Pediatric Access
                </div>
                <div className="ps-st-peds-desc">
                  Qualifies this pathologist to report pediatric cases. Client-level authorization is also required per client.
                </div>
              </div>
            </label>
          </div>

          {/* Row 8: Status | Signature */}
          <div className="ps-conf-form-row">
            <div className="ps-conf-form-field">
              <label className="ps-conf-label">Status</label>
              <Toggle value={draft.active} onChange={v => set('active', v)} />
            </div>
            <div className="ps-conf-form-field">
              <label className="ps-conf-label">Signature</label>
              <SignatureUpload url={draft.signatureUrl} onChange={url => set('signatureUrl', url)} />
            </div>
          </div>

        </div>

        <div className="ps-conf-modal-footer">
          <button className="ps-conf-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="ps-conf-btn-primary" onClick={handleSave}>
            {mode === 'add' ? 'Add Staff Member' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Staff Members List ───────────────────────────────────────────────────────

const StaffMembers: React.FC<{ roles: Role[] }> = ({ roles }) => {
  const { subspecialties } = useSubspecialties();
  const [users,      setUsers]     = useState<StaffUser[]>([]);
  const [loading,    setLoading]   = useState(true);
  const [search,     setSearch]    = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [modal,      setModal]     = useState<{ mode: 'add' | 'edit'; user?: StaffUser } | null>(null);

  React.useEffect(() => {
    userService.getAll().then((res: ServiceResult<StaffUser[]>) => {
      if ('ok' in res && res.ok) setUsers(res.data || []);
      else if ('error' in res) console.error(res.error);
      setLoading(false);
    });
  }, []);

  const userSubsMap: Record<string, string[]> = {};
  subspecialties.forEach(sub => {
    sub.userIds.forEach(uid => {
      if (!userSubsMap[uid]) userSubsMap[uid] = [];
      userSubsMap[uid].push(sub.name);
    });
  });

  if (loading) return <div className="ps-st-loading">Loading staff...</div>;

  const filtered = users.filter(u => {
    const name = fullName(u).toLowerCase();
    return (name.includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
      && (roleFilter === 'All' || u.roles.includes(roleFilter));
  });

  const handleSave = async (draft: Draft) => {
    const payload = {
      firstName: draft.firstName, lastName: draft.lastName, credentials: draft.credentials,
      email: draft.email, roles: draft.roles, npi: draft.npi, gmcNumber: draft.gmcNumber,
      license: draft.license, phone: draft.phone, canViewPediatric: draft.canViewPediatric,
      department: draft.department, signatureUrl: draft.signatureUrl,
      status: (draft.active ? 'Active' : 'Inactive') as 'Active' | 'Inactive',
      voiceProfile: draft.voiceProfile === '' ? undefined : (draft.voiceProfile as VoiceProfileId),
    };
    if (modal?.mode === 'add') {
      const res = await userService.add(payload);
      if (res.ok) setUsers(prev => [...prev, res.data]);
    } else if (modal?.user) {
      const res = await userService.update(modal.user.id, payload);
      if (res.ok) setUsers(prev => prev.map(u => u.id === res.data.id ? res.data : u));
    }
    setModal(null);
  };

  return (
    <div className="ps-st-root">
      <div className="ps-st-header">
        <div>
          <h2 className="ps-st-title">Staff</h2>
          <p className="ps-st-subtitle">Manage pathologists, residents, and administrators.</p>
        </div>
        <button className="ps-st-add-btn" onClick={() => setModal({ mode: 'add' })}>+ Add Staff</button>
      </div>

      <div data-capture-hide="true" className="ps-st-filter-bar">
        <input type="text" placeholder="Search staff..." value={search}
          onChange={e => setSearch(e.target.value)} className="ps-st-search" />
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          title="Filter by role" className="ps-st-role-filter">
          <option value="All">All Roles</option>
          {roles.filter(r => r.name !== 'Physician').map(r => (
            <option key={r.id} value={r.name}>{r.name}</option>
          ))}
        </select>
      </div>

      <div data-capture-hide="true" className="ps-st-table-wrap">
        <div className="ps-st-table-scroll">
          <table className="ps-st-table">
            <thead className="ps-st-thead">
              <tr>
                {['Staff Member', 'Email', 'Role', 'Subspecialties', 'Status', 'Actions'].map(h => (
                  <th key={h} className="ps-st-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const subs = userSubsMap[u.id] || [];
                return (
                  <tr key={u.id} className="ps-st-tr">
                    <td className="ps-st-td">
                      <div className="ps-st-member-cell">
                        <div className="ps-st-avatar">{initials(u)}</div>
                        <div>
                          <span className="ps-st-name" data-phi="name">{fullName(u)}</span>
                          {u.credentials && <span className="ps-st-credentials">{u.credentials}</span>}
                          {u.canViewPediatric && <span className="ps-st-peds-badge">Peds</span>}
                        </div>
                      </div>
                    </td>
                    <td className="ps-st-td ps-st-td--email">{u.email}</td>
                    <td className="ps-st-td">
                      <div className="ps-st-role-cell">
                        {u.roles.slice(0, 2).map(r => {
                          const roleObj = roles.find(x => x.name === r);
                          const color   = roleObj?.color ?? '#8AB4F8';
                          return (
                            <span key={r} className="ps-st-role-badge"
                              style={{ color, background: `${color}22`, border: `1px solid ${color}44` }}>
                              {r}
                            </span>
                          );
                        })}
                        {u.roles.length > 2 && (
                          <span className="ps-st-role-more" title={u.roles.slice(2).join(', ')}>
                            +{u.roles.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="ps-st-td">
                      {subs.length === 0
                        ? <span className="ps-st-sub-none">None</span>
                        : <div className="ps-st-sub-cell">
                            {subs.map(s => <span key={s} className="ps-st-sub-badge">{s}</span>)}
                          </div>
                      }
                    </td>
                    <td className="ps-st-td">
                      <div className="ps-st-status-cell">
                        <span className={`ps-st-status-dot ${u.status === 'Active' ? 'ps-st-status-dot--active' : 'ps-st-status-dot--inactive'}`} />
                        <span className={u.status === 'Active' ? 'ps-st-status-label--active' : 'ps-st-status-label--inactive'}>
                          {u.status}
                        </span>
                      </div>
                    </td>
                    <td className="ps-st-td">
                      <button className="ps-st-edit-btn" onClick={() => setModal({ mode: 'edit', user: u })}>Edit</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modal && <StaffModal mode={modal.mode} user={modal.user} roles={roles} onSave={handleSave} onClose={() => setModal(null)} />}
    </div>
  );
};

// ─── Staff Shell (sub-tabs) ───────────────────────────────────────────────────

type StaffSubTab = 'members' | 'roles';

const StaffTab: React.FC = () => {
  const [subTab, setSubTab] = useState<StaffSubTab>('members');
  const [roles,  setRoles]  = React.useState<Role[]>(DEFAULT_ROLES);

  return (
    <div>
      <div className="ps-st-tab-bar">
        <button className={`ps-st-tab ${subTab === 'members' ? 'ps-st-tab--active' : 'ps-st-tab--inactive'}`}
          onClick={() => setSubTab('members')}>Staff Members</button>
        <button className={`ps-st-tab ${subTab === 'roles' ? 'ps-st-tab--active' : 'ps-st-tab--inactive'}`}
          onClick={() => setSubTab('roles')}>Role Dictionary</button>
      </div>
      {subTab === 'members' && <StaffMembers roles={roles} />}
      {subTab === 'roles'   && <RoleDictionary onRolesChange={setRoles} />}
    </div>
  );
};

export default StaffTab;
