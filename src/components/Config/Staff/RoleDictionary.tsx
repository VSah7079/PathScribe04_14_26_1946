// src/components/Config/Users/RoleDictionary.tsx
// Two-panel layout: category groups left, permissions/clients/cheat-sheet right

import React, { useState, useEffect, useMemo } from 'react';
import '../../../pathscribe.css';
import {
  ACTION_GROUPS, DEFAULT_ROLE_PERMISSIONS,
  ActionId, PermissionSet,
} from '../../../constants/systemActions';
import { mockParticipationTypeService } from '../../../services/participationTypes/mockParticipationTypeService';
import type { ParticipationTypeRecord } from '../../../services/participationTypes/IParticipationTypeService';
import { roleService, auditService } from '../../../services';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Role {
  id: string;
  name: string;
  description: string;
  color: string;
  caseAccess: boolean;
  canViewPediatric: boolean;
  configAccess: boolean;
  permissions: PermissionSet;
  builtIn: boolean;
  clientIds?: string[];
  participationTypeIds: string[];
}

export const DEFAULT_PARTICIPATION: Record<string, string[]> = {
  pathologist: ['primary', 'consultant', 'second_opinion', 'frozen_section'],
  resident:    ['grossing', 'preliminary_report', 'observer'],
  admin:       [],
  physician:   [],
};

export const DEFAULT_ROLES: Role[] = [
  { id: 'pathologist', name: 'Pathologist', description: 'Licensed pathologist with full clinical case access and sign-out authority.',   color: '#8AB4F8', caseAccess: true,  configAccess: false, permissions: DEFAULT_ROLE_PERMISSIONS['Pathologist'], canViewPediatric: false, builtIn: true, participationTypeIds: DEFAULT_PARTICIPATION['pathologist'] },
  { id: 'resident',    name: 'Resident',    description: 'Pathology resident with case access and co-sign capability.',                    color: '#81C995', caseAccess: true,  configAccess: false, permissions: DEFAULT_ROLE_PERMISSIONS['Resident'],    canViewPediatric: false, builtIn: true, participationTypeIds: DEFAULT_PARTICIPATION['resident']    },
  { id: 'admin',       name: 'Admin',       description: 'System administrator with configuration access but no clinical case access.',    color: '#FDD663', caseAccess: false, configAccess: true,  permissions: DEFAULT_ROLE_PERMISSIONS['Admin'],        canViewPediatric: false, builtIn: true, participationTypeIds: []                                    },
  { id: 'physician',   name: 'Physician',   description: 'External ordering physician. Directory only — no app access.',                   color: '#C084FC', caseAccess: false, configAccess: false, permissions: DEFAULT_ROLE_PERMISSIONS['Physician'],    canViewPediatric: false, builtIn: true, participationTypeIds: []                                    },
];

const MOCK_CLIENTS = [
  { id: 'client_hosp_001', name: 'Phoenix Memorial Hospital' },
  { id: 'client_hosp_002', name: 'Desert Valley Medical Center' },
  { id: 'client_hosp_003', name: 'Scottsdale Regional Health' },
  { id: 'client_hosp_004', name: 'Mesa General Hospital' },
  { id: 'client_lab_001',  name: 'Southwest Reference Laboratory' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

type TriState = 'all' | 'some' | 'none';

function groupTriState(groupIds: ActionId[], permissions: PermissionSet): TriState {
  const granted = groupIds.filter(id => permissions[id]).length;
  if (granted === 0) return 'none';
  if (granted === groupIds.length) return 'all';
  return 'some';
}

// ─── TriCheckbox ──────────────────────────────────────────────────────────────

const TriCheckbox: React.FC<{ state: TriState; onClick: (e: React.MouseEvent) => void; size?: number }> = ({ state, onClick, size = 16 }) => (
  <div
    onClick={onClick}
    className={`ps-rd-cb ps-rd-tri-${state}`}
    style={{ width: size, height: size }}
  >
    {state === 'all'  && <span className="ps-rd-tri-check" style={{ fontSize: size * 0.6 }}>✓</span>}
    {state === 'some' && <span className="ps-rd-tri-dash"  style={{ fontSize: size * 0.75 }}>—</span>}
  </div>
);

// ─── DivCheckbox (div-based custom checkbox for interactive lists) ─────────────

const DivCheckbox: React.FC<{ checked: boolean; size?: number; variant?: 'blue' | 'green' }> = ({ checked, size = 18, variant = 'blue' }) => (
  <div
    className={`ps-rd-cb ${checked ? (variant === 'green' ? 'ps-rd-cb--on-green' : 'ps-rd-cb--on-blue') : 'ps-rd-cb--off'}`}
    style={{ width: size, height: size }}
  >
    {checked && <span className="ps-rd-tri-check" style={{ fontSize: size * 0.55 }}>✓</span>}
  </div>
);

// ─── RoleModal ────────────────────────────────────────────────────────────────

const RoleModal: React.FC<{
  mode: 'add' | 'edit';
  role?: Role;
  onSave: (draft: Omit<Role, 'id'>) => void;
  onClose: () => void;
}> = ({ mode, role, onSave, onClose }) => {
  const [draft, setDraft] = useState<Omit<Role, 'id'>>({
    name:                 role?.name ?? '',
    description:          role?.description ?? '',
    color:                role?.color ?? '#8AB4F8',
    caseAccess:           role?.caseAccess ?? false,
    canViewPediatric:     (role as any)?.canViewPediatric ?? false,
    configAccess:         role?.configAccess ?? false,
    permissions:          role?.permissions ?? {},
    builtIn:              role?.builtIn ?? false,
    clientIds:            role?.clientIds ?? [],
    participationTypeIds: role?.participationTypeIds ?? [],
  });

  const [activeTab,       setActiveTab]       = useState<'permissions' | 'clients' | 'participation' | 'cheatsheet'>('permissions');
  const [selectedGroupId, setSelectedGroupId] = useState<string>(ACTION_GROUPS[0].id);
  const [search,          setSearch]          = useState('');
  const [cheatSearch,     setCheatSearch]     = useState('');
  // July 2026: was loadParticipationTypes() from ParticipationTypesSection's
  // own separate, disconnected local list -- now the real service, the
  // same one CaseTeamModal actually uses.
  const [participationTypes, setParticipationTypes] = useState<ParticipationTypeRecord[]>([]);
  useEffect(() => {
    mockParticipationTypeService.getActive().then(res => { if (res.ok) setParticipationTypes(res.data); });
  }, []);

  const allClients     = !draft.clientIds || draft.clientIds.length === 0;
  const selectedGroup  = ACTION_GROUPS.find(g => g.id === selectedGroupId) ?? ACTION_GROUPS[0];
  const groupIds       = selectedGroup.actions.map(a => a.id);
  const groupState     = groupTriState(groupIds, draft.permissions);
  const permCount      = Object.values(draft.permissions).filter(Boolean).length;
  const totalActions   = ACTION_GROUPS.reduce((n, g) => n + g.actions.length, 0);

  const filteredActions = search
    ? selectedGroup.actions.filter(a =>
        a.label.toLowerCase().includes(search.toLowerCase()) ||
        (a.description ?? '').toLowerCase().includes(search.toLowerCase()))
    : selectedGroup.actions;

  const cheatActions = useMemo(() => {
    const all = ACTION_GROUPS.flatMap(g => g.actions.map(a => ({ ...a, groupTitle: g.title })));
    if (!cheatSearch) return all;
    const q = cheatSearch.toLowerCase();
    return all.filter(a =>
      a.label.toLowerCase().includes(q) ||
      (a.description ?? '').toLowerCase().includes(q) ||
      a.groupTitle.toLowerCase().includes(q) ||
      a.id.toLowerCase().includes(q)
    );
  }, [cheatSearch]);

  const toggleGroupAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newVal = groupState !== 'all';
    const next = { ...draft.permissions };
    groupIds.forEach(id => { next[id] = newVal; });
    setDraft(d => ({ ...d, permissions: next }));
  };

  const toggleAction = (id: ActionId) =>
    setDraft(d => ({ ...d, permissions: { ...d.permissions, [id]: !d.permissions[id] } }));

  const toggleClient = (clientId: string) => {
    const current = draft.clientIds ?? [];
    const next = current.includes(clientId)
      ? current.filter(c => c !== clientId)
      : [...current, clientId];
    setDraft(d => ({ ...d, clientIds: next }));
  };

  const TABS = [
    { id: 'permissions',   label: `Permissions (${permCount})` },
    { id: 'clients',       label: `Client Access (${allClients ? 'All' : (draft.clientIds?.length ?? 0)})` },
    { id: 'participation', label: `Case Participation (${draft.participationTypeIds?.length ?? 0})` },
    { id: 'cheatsheet',    label: 'Action Reference' },
  ] as const;

  return (
    <div data-capture-hide="true" className="ps-conf-backdrop" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="fm-modal fm-modal--config" style={{ width: 'min(1080px, 96vw)', maxHeight: '90vh' }}>

        {/* Header */}
        <div className="fm-modal-header">
          <div>
            <div className="fm-eyebrow">Configuration · Role Dictionary</div>
            <div className="ps-rd-modal-name-row">
              <input
                value={draft.name}
                onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                placeholder="Role name"
                className="ps-conf-input ps-rd-modal-name-input"
              />
              <input
                type="color"
                value={draft.color}
                onChange={e => setDraft(d => ({ ...d, color: e.target.value }))}
                className="ps-rd-color-picker"
                title="Badge colour"
              />
              <span className="ps-rd-role-badge" style={{ background: draft.color + '22', color: draft.color, border: `1px solid ${draft.color}44` }}>
                {draft.name || 'Preview'}
              </span>
              <span className="ps-rd-perm-badge">{permCount} / {totalActions} actions granted</span>
            </div>
          </div>
          <button onClick={onClose} className="ps-rd-close-btn">×</button>
        </div>

        {/* Description + access toggles */}
        <div className="ps-rd-desc-row">
          <input
            value={draft.description}
            onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
            placeholder="Role description"
            className="ps-conf-input"
            style={{ flex: 1, minWidth: 200 }}
          />
          <label className="ps-rd-access-label">
            <input type="checkbox" checked={draft.caseAccess}
              onChange={e => setDraft(d => ({ ...d, caseAccess: e.target.checked }))}
              className="ps-rd-checkbox" />
            <span>Case Access</span>
          </label>
          <label className="ps-rd-access-label">
            <input type="checkbox" checked={draft.configAccess}
              onChange={e => setDraft(d => ({ ...d, configAccess: e.target.checked }))}
              className="ps-rd-checkbox" />
            <span>Config Access</span>
          </label>
          <label className="ps-rd-access-label">
            <input type="checkbox" checked={(draft as any).canViewPediatric ?? false}
              onChange={e => setDraft(d => ({ ...d, canViewPediatric: e.target.checked } as any))}
              className="ps-rd-checkbox ps-rd-checkbox--peds" />
            <span>Pediatric Access</span>
          </label>
        </div>

        {/* Tabs */}
        <div className="ps-rd-tabs">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`ps-rd-tab ${activeTab === tab.id ? 'ps-rd-tab--active' : 'ps-rd-tab--inactive'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="ps-rd-body">

          {/* ── PERMISSIONS TAB ── */}
          {activeTab === 'permissions' && (
            <>
              {/* Left — category list */}
              <div className="ps-rd-cat-panel">
                {ACTION_GROUPS.map(g => {
                  const gIds    = g.actions.map(a => a.id);
                  const granted = gIds.filter(id => draft.permissions[id]).length;
                  const isActive = g.id === selectedGroupId;
                  const ts      = groupTriState(gIds, draft.permissions);
                  return (
                    <div key={g.id} onClick={() => setSelectedGroupId(g.id)}
                      className={`ps-rd-cat-item ${isActive ? 'ps-rd-cat-item--active' : 'ps-rd-cat-item--inactive'}`}>
                      <span className={`ps-rd-cat-label ${isActive ? 'ps-rd-cat-label--active' : 'ps-rd-cat-label--inactive'}`}>
                        {g.title}
                      </span>
                      <span className={`ps-rd-cat-count ps-rd-cat-count--${ts}`}>
                        {granted}/{gIds.length}
                      </span>
                      <div className="ps-rd-cat-bar-bg">
                        <div className={`ps-rd-cat-bar-fill ps-rd-cat-bar-fill--${ts === 'none' ? 'some' : ts}`}
                          style={{ width: `${Math.round(granted / gIds.length * 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right — action list */}
              <div className="ps-rd-action-panel">
                <div className="ps-rd-action-header">
                  <TriCheckbox state={groupState} onClick={toggleGroupAll} size={18} />
                  <span className="ps-rd-action-group-title">{selectedGroup.title}</span>
                  <span className="ps-rd-action-granted-count">
                    {groupIds.filter(id => draft.permissions[id]).length} / {groupIds.length} granted
                  </span>
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Filter actions…"
                    className="ps-conf-input ps-rd-action-search" />
                </div>
                <div className="ps-rd-action-list">
                  {filteredActions.map(action => {
                    const granted = !!draft.permissions[action.id];
                    return (
                      <div key={action.id} onClick={() => toggleAction(action.id)}
                        className={`ps-rd-action-item ${granted ? 'ps-rd-action-item--granted' : 'ps-rd-action-item--default'}`}>
                        <DivCheckbox checked={granted} size={18} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="ps-rd-action-label-row">
                            <span className={`ps-rd-action-label ${granted ? 'ps-rd-action-label--granted' : 'ps-rd-action-label--default'}`}>
                              {action.label}
                            </span>
                            {action.prebuilt    && <span className="ps-rd-tag-future">future</span>}
                            {action.shortcutable && <span className="ps-rd-tag-shortcut">shortcutable</span>}
                          </div>
                          {action.description && <div className="ps-rd-action-desc">{action.description}</div>}
                        </div>
                      </div>
                    );
                  })}
                  {filteredActions.length === 0 && (
                    <div className="ps-rd-no-match">No actions match "{search}"</div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── CLIENT ACCESS TAB ── */}
          {activeTab === 'clients' && (
            <div className="ps-rd-clients-tab">
              <p className="ps-rd-clients-intro">
                Control which hospital clients this role can access. Set to <strong>All Clients</strong> for enterprise-wide access, or restrict to specific hospitals for multi-site deployments.
              </p>
              <div onClick={() => setDraft(d => ({ ...d, clientIds: allClients ? [MOCK_CLIENTS[0].id] : [] }))}
                className={`ps-rd-all-clients-row ${allClients ? 'ps-rd-all-clients-row--on' : 'ps-rd-all-clients-row--off'}`}>
                <DivCheckbox checked={allClients} size={20} variant="green" />
                <div>
                  <div className={`ps-rd-all-clients-label ${allClients ? 'ps-rd-all-clients-label--on' : 'ps-rd-all-clients-label--off'}`}>All Clients</div>
                  <div className="ps-rd-all-clients-sub">This role has access to cases and data from all hospital clients</div>
                </div>
              </div>
              {!allClients && (
                <div>
                  <div className="ps-rd-clients-section-label">Select Specific Clients</div>
                  {MOCK_CLIENTS.map(client => {
                    const selected = (draft.clientIds ?? []).includes(client.id);
                    return (
                      <div key={client.id} onClick={() => toggleClient(client.id)}
                        className={`ps-rd-client-item ${selected ? 'ps-rd-client-item--on' : 'ps-rd-client-item--off'}`}>
                        <DivCheckbox checked={selected} size={18} />
                        <div>
                          <div className={`ps-rd-client-name ${selected ? 'ps-rd-client-name--on' : 'ps-rd-client-name--off'}`}>{client.name}</div>
                          <div className="ps-rd-client-id">{client.id}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {!allClients && (draft.clientIds ?? []).length === 0 && (
                <div className="ps-rd-no-clients-warn">
                  ⚠ No clients selected — this role will have no data access. Select at least one client or switch to All Clients.
                </div>
              )}
            </div>
          )}

          {/* ── CASE PARTICIPATION TAB ── */}
          {activeTab === 'participation' && (() => {
            const allTypes   = participationTypes;
            const selectedIds = draft.participationTypeIds ?? [];
            const toggle = (id: string) => setDraft(d => ({
              ...d,
              participationTypeIds: selectedIds.includes(id)
                ? selectedIds.filter(x => x !== id)
                : [...selectedIds, id],
            }));
            return (
              <div className="ps-rd-part-tab">
                <p className="ps-rd-part-intro">
                  Select which participation types staff with this role can serve as on a case.
                  Participation types are defined in <strong>System → Participation Types</strong>.
                </p>
                {!draft.caseAccess && (
                  <div className="ps-rd-part-warn">
                    ⚠ This role has no Case Access — participation types will have no effect until Case Access is enabled.
                  </div>
                )}
                {allTypes.length === 0 ? (
                  <div className="ps-rd-part-empty">
                    No active participation types defined yet.<br />
                    <span style={{ color: '#6b7280' }}>Go to System → Participation Types to add some.</span>
                  </div>
                ) : (
                  <div className="ps-rd-part-list">
                    {allTypes.map(t => {
                      const selected = selectedIds.includes(t.id);
                      return (
                        <div key={t.id} onClick={() => toggle(t.id)}
                          className={`ps-rd-part-item ${selected ? 'ps-rd-part-item--on' : 'ps-rd-part-item--off'}`}>
                          <DivCheckbox checked={selected} size={18} />
                          <div style={{ paddingTop: 1 }}>
                            <span className="ps-rd-role-badge" style={{ fontSize: 11, padding: '2px 10px', background: t.color + '22', color: t.color, border: `1px solid ${t.color}44`, whiteSpace: 'nowrap' }}>
                              {t.abbreviation}
                            </span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className={`ps-rd-part-name ${selected ? 'ps-rd-part-name--on' : 'ps-rd-part-name--off'}`}>{t.label}</div>
                            {t.description && <div className="ps-rd-part-desc">{t.description}</div>}
                            <div className="ps-rd-part-attrs">
                              {[
                                { label: 'Can Finalise',       value: t.canFinalize,           onColor: '#22c55e' },
                                { label: 'Countersign Req.',   value: t.requiresCountersign,   onColor: '#f59e0b' },
                                { label: 'Template Assign.',   value: t.canBeAssignedTemplate, onColor: '#8AB4F8' },
                                { label: 'Full Case View',     value: t.canViewWholeCase,      onColor: '#8AB4F8' },
                              ].map(attr => (
                                <span key={attr.label} className="ps-rd-part-attr" style={{
                                  background: attr.value ? attr.onColor + '18' : 'rgba(255,255,255,0.04)',
                                  color:      attr.value ? attr.onColor : '#4b5563',
                                  border:     `1px solid ${attr.value ? attr.onColor + '33' : 'rgba(255,255,255,0.06)'}`,
                                }}>
                                  {attr.value ? '✓' : '—'} {attr.label}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="ps-rd-part-count">
                  {selectedIds.length} of {allTypes.length} participation types selected for this role
                </div>
              </div>
            );
          })()}

          {/* ── CHEAT SHEET TAB ── */}
          {activeTab === 'cheatsheet' && (
            <div className="ps-rd-cheat-tab">
              <div className="ps-rd-cheat-header">
                <input autoFocus value={cheatSearch} onChange={e => setCheatSearch(e.target.value)}
                  placeholder="Search actions by name, description, category, or ID…"
                  className="ps-conf-input" />
                <div className="ps-rd-cheat-count">
                  {cheatActions.length} of {ACTION_GROUPS.reduce((n, g) => n + g.actions.length, 0)} actions shown
                </div>
              </div>
              <div className="ps-rd-cheat-list">
                {cheatActions.map(action => {
                  const granted = !!draft.permissions[action.id];
                  return (
                    <div key={action.id} className={`ps-rd-cheat-item ${granted ? 'ps-rd-cheat-item--granted' : 'ps-rd-cheat-item--default'}`}>
                      <div className="ps-rd-cheat-label-row">
                        <span className="ps-rd-cheat-group-tag">{action.groupTitle}</span>
                        <span className={`ps-rd-cheat-label ${granted ? 'ps-rd-cheat-label--granted' : 'ps-rd-cheat-label--default'}`}>
                          {action.label}
                        </span>
                        {granted      && <span className="ps-rd-tag-granted">✓ Granted</span>}
                        {action.prebuilt    && <span className="ps-rd-tag-future">future</span>}
                        {action.shortcutable && <span className="ps-rd-tag-shortcut">shortcutable</span>}
                      </div>
                      {action.description && <div className="ps-rd-cheat-desc">{action.description}</div>}
                      <div className="ps-rd-cheat-id">{action.id} · {action.internalKey}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="fm-footer">
          <span className="ps-rd-footer-meta">
            {permCount} permissions · {allClients ? 'All clients' : `${(draft.clientIds ?? []).length} client(s)`}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="fm-btn-cancel" onClick={onClose}>Cancel</button>
            <button className="fm-btn-apply" style={{ opacity: !draft.name.trim() ? 0.5 : 1 }} onClick={() => { if (!draft.name.trim()) return; onSave(draft); }}>
              {mode === 'add' ? 'Add Role' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main RoleDictionary ──────────────────────────────────────────────────────

const RoleDictionary: React.FC<{ onRolesChange?: (roles: Role[]) => void }> = ({ onRolesChange }) => {
  const [roles,   setRoles]   = useState<Role[]>(DEFAULT_ROLES);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [modal,   setModal]   = useState<{ mode: 'add' | 'edit'; role?: Role } | null>(null);

  useEffect(() => {
    roleService.getAll().then(res => {
      if (res.ok) {
        const mapped = res.data.map(r => ({
          ...r,
          canViewPediatric:     (r as any).canViewPediatric ?? false,
          participationTypeIds: r.participationTypeIds ?? [],
        })) as Role[];
        setRoles(mapped); onRolesChange?.(mapped);
      } else { onRolesChange?.(DEFAULT_ROLES); }
      setLoading(false);
    });
  }, []);

  const filtered = roles.filter(r =>
    !search ||
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.description.toLowerCase().includes(search.toLowerCase())
  );

  const totalActions = ACTION_GROUPS.reduce((n, g) => n + g.actions.length, 0);
  const permCount    = (r: Role) => Object.values(r.permissions).filter(Boolean).length;

  const handleSave = async (draft: Omit<Role, 'id'>) => {
    if (modal?.mode === 'add') {
      // canViewOrchestration defaults to false here too — same
      // documented "must be explicitly granted by an administrator"
      // intent as the seed roles; the create form doesn't collect
      // this yet.
      const res = await roleService.add({ ...draft, builtIn: false, canViewOrchestration: false });
      if (res.ok) {
        const next = [...roles, res.data as Role];
        setRoles(next); onRolesChange?.(next);
      }
    } else if (modal?.role) {
      const res = await roleService.update(modal.role.id, draft);
      if (res.ok) {
        const next = roles.map(r => r.id === res.data.id ? res.data as unknown as Role : r);
        setRoles(next); onRolesChange?.(next);
        const prevPed = (modal.role as any)?.canViewPediatric ?? false;
        const newPed  = (draft as any)?.canViewPediatric ?? false;
        if (prevPed !== newPed) {
          auditService.logEvent({
            type: 'system',
            event: newPed ? 'Pediatric Access Granted' : 'Pediatric Access Revoked',
            detail: `Pediatric Access ${newPed ? 'enabled' : 'disabled'} on role "${draft.name}" by administrator.`,
            user: 'System Admin', caseId: null, confidence: null,
          }).catch(() => {});
        }
      }
    }
    setModal(null);
  };

  if (loading) return <div className="ps-rd-loading">Loading roles…</div>;

  return (
    <div className="ps-rd-root">
      <div className="ps-rd-header">
        <div>
          <h2 className="ps-rd-title">Role Dictionary</h2>
          <p className="ps-rd-subtitle">Define roles, permissions, and client access scopes.</p>
        </div>
        <button className="ps-section-add-btn" onClick={() => setModal({ mode: 'add' })}>+ Add Role</button>
      </div>

      <input type="text" placeholder="Search roles…" value={search}
        onChange={e => setSearch(e.target.value)} className="ps-rd-search" />

      <div className="ps-rd-table-wrap">
        <table className="ps-rd-table">
          <thead className="ps-rd-thead">
            <tr>
              {['Role', 'Description', 'Case Access', 'Config Access', 'Pediatric Access', 'Clients', 'Permissions', ''].map(h => (
                <th key={h} className="ps-rd-th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(role => {
              const allClients = !role.clientIds || role.clientIds.length === 0;
              const pct        = Math.round(permCount(role) / totalActions * 100);
              return (
                <tr key={role.id} className="ps-rd-tr">
                  <td className="ps-rd-td">
                    <div className="ps-rd-role-cell">
                      <span className="ps-rd-role-badge" style={{ background: role.color + '22', color: role.color, border: '1px solid ' + role.color + '44' }}>
                        {role.name}
                      </span>
                      {role.builtIn && <span className="ps-rd-builtin">built-in</span>}
                    </div>
                  </td>
                  <td className="ps-rd-td ps-rd-td--desc">
                    <span className="ps-rd-desc-clamp">{role.description}</span>
                  </td>
                  <td className="ps-rd-td">
                    <span className={`ps-rd-access ${role.caseAccess ? 'ps-rd-access--yes' : 'ps-rd-access--no'}`}>
                      {role.caseAccess ? '✓ Yes' : '— No'}
                    </span>
                  </td>
                  <td className="ps-rd-td">
                    <span className={`ps-rd-access ${role.configAccess ? 'ps-rd-access--yes' : 'ps-rd-access--no'}`}>
                      {role.configAccess ? '✓ Yes' : '— No'}
                    </span>
                  </td>
                  <td className="ps-rd-td">
                    <span className={`ps-rd-access ${(role as any).canViewPediatric ? 'ps-rd-access--peds-yes' : 'ps-rd-access--no'}`}>
                      {(role as any).canViewPediatric ? '✓ Yes' : '— No'}
                    </span>
                  </td>
                  <td className="ps-rd-td">
                    <span className={`ps-rd-clients ${allClients ? 'ps-rd-clients--all' : 'ps-rd-clients--some'}`}>
                      {allClients ? '🌐 All' : `${role.clientIds?.length} client${(role.clientIds?.length ?? 0) !== 1 ? 's' : ''}`}
                    </span>
                  </td>
                  <td className="ps-rd-td">
                    <div className="ps-rd-perm-wrap">
                      <div className="ps-rd-perm-bar-bg">
                        <div className="ps-rd-perm-bar-fill" style={{ width: `${pct}%`, background: role.color }} />
                      </div>
                      <span className="ps-rd-perm-count">{permCount(role)}/{totalActions}</span>
                    </div>
                  </td>
                  <td className="ps-rd-td">
                    <button className="ps-rd-edit-btn" onClick={() => setModal({ mode: 'edit', role })}>Edit</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && <RoleModal mode={modal.mode} role={modal.role} onSave={handleSave} onClose={() => setModal(null)} />}
    </div>
  );
};

export default RoleDictionary;
