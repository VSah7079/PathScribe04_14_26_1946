// src/pages/SynopticReportPage/modals/CaseTeamModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Case Team modal — drag staff cards onto participation type drop zones.
// Left: participation type lanes (drop targets)
// Right: staff directory (draggable cards)
//
// July 2026, draft-then-save conversion: nothing is persisted to the real
// backend until Save is clicked -- see the earlier version of this file's
// header note for the fuller reasoning (matches FlagManagerModal's model).
//
// July 2026, second pass — real drag validation added after a confirmed
// bug report: 'pathologist'/'resident' roles had ZERO participationTypeIds
// configured, meaning EVERY drag involving either role was silently
// rejected with no feedback -- effectively the whole feature was
// non-functional for the two most common roles in the app. Fixed at the
// data layer (services/roles/mockRoleService.ts), but the silent-failure
// UX itself was a real, separate bug worth fixing regardless of correct
// data -- added here:
//   1. Live eligibility preview: the moment a drag starts, EVERY zone
//      immediately shows whether it would accept the dragged person (not
//      just on hover) -- red/dashed for role-ineligible, amber for
//      "occupied, will offer to replace", normal highlight for eligible.
//   2. Real rejection messages instead of a silent no-op.
//   3. Single-occupancy conflicts (allowsMultiple: false, someone else
//      already assigned) offer a Replace confirmation rather than a hard
//      block -- per Pete's real clinical-workflow spec: Primary
//      Pathologist etc. must stay single-occupancy for medico-legal
//      reasons, but the common case (correcting a mis-assignment) should
//      be one click, not "remove them first, then drag the right person."
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
  DndContext, DragEndEvent, DragStartEvent, DragOverlay,
  useDraggable, useDroppable, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Case }    from '@/types/case/Case';

interface CaseParticipant {
  staffId: string;
  staffName: string;
  externalId?: string;
  externalIdType?: 'GMC' | 'NPI';
  source: 'system' | 'manual';
  participationTypeIds: string[];
  addedBy: string;
  addedAt: string;
  status: 'active' | 'removed';
}
import { mockCaseService }               from '@/services/cases/mockCaseService';
import { userService, roleService }      from '@/services';
import { mockParticipationTypeService } from '@/services/participationTypes/mockParticipationTypeService';
import type { ParticipationTypeRecord as ParticipationType } from '@/services/participationTypes/IParticipationTypeService';
import type { StaffUser }                from '@/services/users/IUserService';
import type { Role }                     from '@/services/roles/IRoleService';
import { useAuth }                       from '@/contexts/AuthContext';

type DragEligibility = 'eligible' | 'role-ineligible' | 'occupied';

// ─── Draggable staff card ─────────────────────────────────────────────────────

interface StaffCardProps {
  staff:       StaffUser;
  roles:       Role[];
  allTypes:    ParticipationType[];
  disabled?:   boolean;
  isDragging?: boolean;
}

const StaffCard: React.FC<StaffCardProps & { id: string }> = ({ id, staff, roles, allTypes, disabled, isDragging }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id, disabled });
  const staffRoles   = roles.filter(r => staff.roles.includes(r.name));
  const allowedTypeIds = new Set(staffRoles.flatMap(r => (r as any).participationTypeIds ?? []));
  const allowedTypes = allTypes.filter(t => allowedTypeIds.has(t.id));

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        padding: '10px 12px',
        background: isDragging ? 'rgba(138,180,248,0.15)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${isDragging ? 'rgba(138,180,248,0.4)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 10, cursor: disabled ? 'default' : 'grab',
        opacity: disabled ? 0.4 : 1,
        transform: transform ? CSS.Translate.toString(transform) : undefined,
        userSelect: 'none', touchAction: 'none',
        transition: isDragging ? 'none' : 'border-color 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: 'rgba(138,180,248,0.15)', border: '1.5px solid rgba(138,180,248,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: '#8AB4F8',
        }}>
          {`${staff.firstName[0]}${staff.lastName[0]}`}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb' }}>{staff.firstName} {staff.lastName}</div>
          <div style={{ fontSize: 11, color: '#cbd5e1' }}>{staff.roles.join(', ')} · {staff.department}</div>
        </div>
        {!disabled && <div style={{ fontSize: 16, color: '#374151', flexShrink: 0, cursor: 'grab' }}>⠿</div>}
        {disabled  && <span style={{ fontSize: 10, color: '#22c55e', padding: '1px 6px', borderRadius: 4, border: '1px solid rgba(34,197,94,0.2)', background: 'rgba(34,197,94,0.06)', flexShrink: 0 }}>on case</span>}
      </div>
      {allowedTypes.length > 0 && !disabled && (
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 3, marginTop: 6 }}>
          {allowedTypes.map(t => (
            <span key={t.id} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: t.color + '18', color: t.color, border: `1px solid ${t.color}33` }}>
              {t.abbreviation}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Drop zone (participation type lane) ──────────────────────────────────────

interface DropZoneProps {
  type:          ParticipationType;
  participants:  CaseParticipant[];
  currentUserId: string;
  isOver:        boolean;
  dragEligibility: DragEligibility | null; // null = nothing currently being dragged
  onRemove:      (staffId: string, typeId: string) => void;
  onUndoRemove:  (staffId: string, typeId: string) => void;
  removedKeys:   Set<string>;
  onDelegate?:   () => void;
}

const DropZone: React.FC<DropZoneProps> = ({
  type, participants, currentUserId, isOver, dragEligibility, onRemove, onUndoRemove, removedKeys, onDelegate,
}) => {
  const { setNodeRef } = useDroppable({ id: `type-${type.id}` });
  const inType = participants.filter(p => p.status === 'active' && p.participationTypeIds.includes(type.id));

  // Live preview colors — shown for EVERY zone the instant a drag starts,
  // not just on hover, so the user can see at a glance which zones will
  // work before they even move the cursor there.
  let borderColor = 'rgba(255,255,255,0.08)';
  let bgColor = 'rgba(255,255,255,0.02)';
  let borderStyle: 'dashed' | 'solid' = 'dashed';
  let previewLabel: string | null = null;

  if (dragEligibility === 'role-ineligible') {
    borderColor = isOver ? 'rgba(239,68,68,0.6)' : 'rgba(239,68,68,0.35)';
    bgColor = isOver ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.04)';
    borderStyle = 'dashed';
    previewLabel = '⊘ Not eligible for this role';
  } else if (dragEligibility === 'occupied') {
    borderColor = isOver ? 'rgba(245,158,11,0.6)' : 'rgba(245,158,11,0.35)';
    bgColor = isOver ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.04)';
    borderStyle = isOver ? 'solid' : 'dashed';
    previewLabel = isOver ? 'Drop to replace' : 'Already assigned — will offer to replace';
  } else if (dragEligibility === 'eligible') {
    borderColor = isOver ? type.color + '66' : 'rgba(255,255,255,0.14)';
    bgColor = isOver ? type.color + '12' : 'rgba(255,255,255,0.02)';
    borderStyle = isOver ? 'solid' : 'dashed';
    previewLabel = isOver ? 'Drop to assign' : null;
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        borderRadius: 10, padding: 12,
        background: bgColor,
        border: `2px ${borderStyle} ${borderColor}`,
        transition: 'all 0.15s', minHeight: 80,
        cursor: dragEligibility === 'role-ineligible' ? 'not-allowed' : undefined,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: type.color + '22', color: type.color, border: `1px solid ${type.color}44` }}>{type.abbreviation}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#e5e7eb', flex: 1 }}>{type.label}</span>
        {!type.allowsMultiple && <span style={{ fontSize: 9, fontWeight: 700, color: '#64748b', letterSpacing: '0.04em' }}>SINGLE</span>}
        {type.requiresCountersign && <span style={{ fontSize: 10, color: '#f59e0b', padding: '1px 5px', borderRadius: 4, border: '1px solid rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.06)' }}>Countersign req.</span>}
        {type.canFinalize        && <span style={{ fontSize: 10, color: '#22c55e', padding: '1px 5px', borderRadius: 4, border: '1px solid rgba(34,197,94,0.2)',   background: 'rgba(34,197,94,0.06)' }}>Can finalise</span>}
      </div>

      {previewLabel && (
        <div style={{
          padding: '6px 0', textAlign: 'center', fontSize: 11, fontStyle: 'italic',
          color: dragEligibility === 'role-ineligible' ? '#f87171' : dragEligibility === 'occupied' ? '#fbbf24' : type.color,
        }}>
          {previewLabel}
        </div>
      )}

      {inType.length === 0 && !previewLabel && (
        <div style={{ padding: '8px 0', textAlign: 'center', fontSize: 11, color: '#475569', fontStyle: 'italic' }}>
          Drag staff here
        </div>
      )}

      <div className="ps-case-team-list">
        {inType.map(p => {
          const removeKey    = `${p.staffId}-${type.id}`;
          const isRemoved    = removedKeys.has(removeKey);
          const isSelf       = p.staffId === currentUserId;
          const isPrimary    = type.id === 'primary';
          const isOnlyPrimary = isPrimary && inType.length === 1;

          return (
            <div key={removeKey} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8,
              background: isRemoved ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${isRemoved ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)'}`,
              opacity: isRemoved ? 0.7 : 1, transition: 'all 0.2s',
            }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: 'rgba(138,180,248,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#8AB4F8' }}>
                {p.staffName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
              </div>
              <span style={{ fontSize: 12, color: isRemoved ? '#8a9db5' : '#e5e7eb', flex: 1, textDecoration: isRemoved ? 'line-through' : 'none' }}>
                {p.staffName}
                {isSelf         && <span style={{ fontSize: 10, color: '#8AB4F8', marginLeft: 5 }}>(you)</span>}
                {p.source === 'system' && <span style={{ fontSize: 10, color: '#22c55e', marginLeft: 5 }}>· auto</span>}
              </span>

              {isRemoved ? (
                <button onClick={() => onUndoRemove(p.staffId!, type.id)}
                  style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5, border: '1px solid rgba(138,180,248,0.3)', background: 'transparent', color: '#8AB4F8', cursor: 'pointer' }}>
                  Undo
                </button>
              ) : isSelf && isOnlyPrimary ? (
                <button onClick={() => onDelegate?.()}
                  title="Removing yourself from Primary requires Delegate — click to open"
                  style={{ padding: '3px 6px', borderRadius: 5, border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.06)', cursor: 'pointer', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600 }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  Delegate
                </button>
              ) : (
                <button onClick={() => onRemove(p.staffId!, type.id)} title="Remove from this participation type"
                  style={{ padding: '3px 6px', borderRadius: 5, border: 'none', background: 'transparent', cursor: 'pointer', color: '#4b5563', display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#4b5563'; }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Self-removal blocked modal ───────────────────────────────────────────────

const SelfRemoveBlockedModal: React.FC<{ onClose: () => void; onDelegate: () => void }> = ({ onClose, onDelegate }) => (
  <div className="ps-overlay" style={{ zIndex: 9000 }}>
    <div className="ps-modal-dark" style={{ width: 'min(460px, 90vw)' }}>
      <div className="ps-modal-dark-header">
        <span style={{ fontSize: 18 }}>⚠</span>
        <span className="ps-modal-dark-title">Cannot Remove Primary</span>
      </div>
      <p className="ps-modal-dark-body">
        Removing yourself from <strong style={{ color: '#e2e8f0' }}>Primary</strong> is not allowed while you are the sole primary pathologist on this case.
      </p>
      <p className="ps-modal-dark-hint">
        To transfer ownership of this case to another pathologist or pool, use <strong style={{ color: '#e2e8f0' }}>Delegate</strong>.
      </p>
      <div className="ps-modal-dark-footer">
        <button className="ps-btn-ghost-dark" onClick={onClose}>Cancel</button>
        <button onClick={onDelegate} style={{ padding: '8px 18px', background: '#0891B2', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          Open Delegate →
        </button>
      </div>
    </div>
  </div>
);

// ─── Replace confirmation modal ───────────────────────────────────────────────

interface ReplaceConfirmState {
  typeId: string; typeLabel: string;
  newStaffId: string; newStaffName: string;
  existingStaffId: string; existingStaffName: string;
}

const ReplaceConfirmModal: React.FC<{ state: ReplaceConfirmState; onConfirm: () => void; onCancel: () => void }> = ({ state, onConfirm, onCancel }) => (
  <div className="ps-overlay" style={{ zIndex: 9500 }}>
    <div className="ps-modal-dark" style={{ width: 'min(460px, 90vw)' }}>
      <div className="ps-modal-dark-header">
        <span style={{ fontSize: 18 }}>⚠</span>
        <span className="ps-modal-dark-title">{state.typeLabel} already assigned</span>
      </div>
      <p className="ps-modal-dark-body">
        <strong style={{ color: '#e2e8f0' }}>{state.existingStaffName}</strong> is currently the {state.typeLabel}.
        Replace with <strong style={{ color: '#e2e8f0' }}>{state.newStaffName}</strong>?
      </p>
      <p className="ps-modal-dark-hint">
        This only changes the draft — nothing is saved until you click Save below.
      </p>
      <div className="ps-modal-dark-footer">
        <button className="ps-btn-ghost-dark" onClick={onCancel}>Cancel</button>
        <button onClick={onConfirm} style={{ padding: '8px 18px', background: '#0891B2', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          Replace
        </button>
      </div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  caseData:    Case;
  onClose:     () => void;
  onUpdated:   (updated: Case) => void;
  onDelegate?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

export const CaseTeamModal: React.FC<Props> = ({ caseData, onClose, onUpdated, onDelegate, onDirtyChange }) => {
  const { user } = useAuth();
  const [staffList,    setStaffList]    = useState<StaffUser[]>([]);
  const [roles,        setRoles]        = useState<Role[]>([]);
  const [allTypes,     setAllTypes]     = useState<ParticipationType[]>([]);
  const [participants, setParticipants] = useState<CaseParticipant[]>([]);
  const initialParticipantsRef = useRef<CaseParticipant[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [activeId,     setActiveId]     = useState<string | null>(null);
  const [overId,       setOverId]       = useState<string | null>(null);
  const [removedKeys,  setRemovedKeys]  = useState<Set<string>>(new Set());
  const [showSelfBlock,setShowSelfBlock]= useState(false);
  const [showDirtyWarn,setShowDirtyWarn]= useState(false);
  const [isSaving,     setIsSaving]     = useState(false);
  const [rejectionMessage, setRejectionMessage] = useState<string | null>(null);
  const [replaceConfirm, setReplaceConfirm] = useState<ReplaceConfirmState | null>(null);
  const rejectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    Promise.all([userService.getAll(), roleService.getAll(), mockParticipationTypeService.getActive()]).then(([usersRes, rolesRes, typesRes]) => {
      const users     = usersRes.ok ? usersRes.data : [];
      const rolesData = rolesRes.ok ? rolesRes.data : [];
      setStaffList(users);
      setRoles(rolesData);
      setAllTypes(typesRes.ok ? typesRes.data : []);
      const existing: CaseParticipant[] = (caseData as any).participants ?? [];
      const assignedId = caseData.order?.assignedTo;
      let finalExisting = existing;
      if (assignedId && !existing.find(p => p.staffId === assignedId && p.status === 'active')) {
        const staffMember = users.find(u => u.id === assignedId);
        if (staffMember) {
          const autoP: CaseParticipant = {
            staffId: staffMember.id,
            staffName: `${staffMember.firstName} ${staffMember.lastName}`,
            externalId: (staffMember as any).gmcNumber || staffMember.npi || undefined,
            externalIdType: (staffMember as any).gmcNumber ? 'GMC' : staffMember.npi ? 'NPI' : undefined,
            source: 'system', participationTypeIds: ['primary'],
            addedBy: 'system', addedAt: caseData.createdAt, status: 'active',
          };
          finalExisting = [autoP, ...existing];
          mockCaseService.updateCase(caseData.id, { participants: finalExisting } as any);
        }
      }
      setParticipants(finalExisting);
      initialParticipantsRef.current = finalExisting;
      setLoading(false);
    });
  }, []);

  const relevantTypeIds = useMemo(() => {
    const ids = new Set<string>();
    participants.filter(p => p.status === 'active').forEach(p => p.participationTypeIds.forEach((id: string) => ids.add(id)));
    staffList.filter(s => s.status === 'Active').forEach(s => {
      const staffRoles = roles.filter(r => s.roles.includes(r.name));
      staffRoles.flatMap(r => (r as any).participationTypeIds ?? []).forEach((id: string) => ids.add(id));
    });
    return ids;
  }, [staffList, roles, participants]);

  const visibleTypes  = useMemo(() => allTypes.filter(t => relevantTypeIds.has(t.id)), [allTypes, relevantTypeIds]);
  const filteredStaff = useMemo(() =>
    staffList
      .filter(s => s.status === 'Active')
      .filter(s => !search || `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.lastName.localeCompare(b.lastName)),
    [staffList, search]
  );

  const activeParticipants = participants.filter(p => p.status === 'active');
  const staffOnCase        = new Set(activeParticipants.map(p => p.staffId));

  // ── rejection banner — auto-dismisses ─────────────────────────────────────────
  const showRejection = useCallback((msg: string) => {
    setRejectionMessage(msg);
    if (rejectionTimerRef.current) clearTimeout(rejectionTimerRef.current);
    rejectionTimerRef.current = setTimeout(() => setRejectionMessage(null), 4500);
  }, []);
  useEffect(() => () => { if (rejectionTimerRef.current) clearTimeout(rejectionTimerRef.current); }, []);

  // ── eligibility check — single source of truth, used for BOTH the live
  //    drag-preview highlighting AND the actual drop validation, so they
  //    can never disagree with each other ──────────────────────────────────────
  const getDragEligibility = useCallback((staffId: string, typeId: string): DragEligibility => {
    const staffMember = staffList.find(s => s.id === staffId);
    const type = allTypes.find(t => t.id === typeId);
    if (!staffMember || !type) return 'role-ineligible';
    const staffRoles = roles.filter(r => staffMember.roles.includes(r.name));
    const allowedIds = new Set(staffRoles.flatMap(r => (r as any).participationTypeIds ?? []));
    if (!allowedIds.has(typeId)) return 'role-ineligible';
    const occupant = activeParticipants.find(p => p.participationTypeIds.includes(typeId) && p.staffId !== staffId);
    if (occupant && !type.allowsMultiple) return 'occupied';
    return 'eligible';
  }, [staffList, allTypes, roles, activeParticipants]);

  const draggedStaffId = activeId?.startsWith('staff-') ? activeId.replace('staff-', '') : null;

  const handleDragStart = (event: DragStartEvent) => { setActiveId(String(event.active.id)); };
  const handleDragOver  = (event: any)             => { setOverId(event.over ? String(event.over.id) : null); };

  // ── assign — draft only, no API call ──────────────────────────────────────────
  const assignStaffToType = useCallback((staff: StaffUser, typeId: string) => {
    setParticipants(prev => {
      const existingP = prev.find(p => p.staffId === staff.id && p.status === 'active');
      if (existingP) {
        return prev.map(p =>
          p.staffId === staff.id && p.status === 'active'
            ? { ...p, participationTypeIds: [...p.participationTypeIds, typeId] } : p
        );
      }
      const newP: CaseParticipant = {
        staffId: staff.id, staffName: `${staff.firstName} ${staff.lastName}`,
        externalId: (staff as any).gmcNumber || staff.npi || undefined,
        externalIdType: (staff as any).gmcNumber ? 'GMC' : staff.npi ? 'NPI' : undefined,
        source: 'manual', participationTypeIds: [typeId],
        addedBy: user?.id ?? 'unknown', addedAt: new Date().toISOString(), status: 'active',
      };
      return [...prev, newP];
    });
  }, [user?.id]);

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null); setOverId(null);
    const { active, over } = event;
    if (!over) return;
    const staffId = String(active.id).replace('staff-', '');
    const typeId  = String(over.id).replace('type-', '');
    const staff   = staffList.find(s => s.id === staffId);
    const type    = allTypes.find(t => t.id === typeId);
    if (!staff || !type) return;

    const eligibility = getDragEligibility(staffId, typeId);

    if (eligibility === 'role-ineligible') {
      const roleName = staff.roles[0] ?? 'This role';
      showRejection(`${roleName}s cannot be assigned as ${type.label}.`);
      return;
    }

    const alreadyAssigned = activeParticipants.find(p => p.staffId === staffId && p.participationTypeIds.includes(typeId));
    if (alreadyAssigned) return; // no-op, already there

    if (eligibility === 'occupied') {
      const occupant = activeParticipants.find(p => p.participationTypeIds.includes(typeId) && p.staffId !== staffId);
      if (occupant) {
        setReplaceConfirm({
          typeId, typeLabel: type.label,
          newStaffId: staff.id, newStaffName: `${staff.firstName} ${staff.lastName}`,
          existingStaffId: occupant.staffId, existingStaffName: occupant.staffName,
        });
        return;
      }
    }

    assignStaffToType(staff, typeId);
  };

  const resolveReplace = useCallback((confirmed: boolean) => {
    if (confirmed && replaceConfirm) {
      const { typeId, existingStaffId, newStaffId } = replaceConfirm;
      setParticipants(prev => {
        let updated = prev.map(p => {
          if (p.staffId === existingStaffId && p.status === 'active') {
            const remaining = p.participationTypeIds.filter(id => id !== typeId);
            return remaining.length === 0 ? { ...p, status: 'removed' as const } : { ...p, participationTypeIds: remaining };
          }
          return p;
        });
        const staff = staffList.find(s => s.id === newStaffId);
        if (staff) {
          const existingNewP = updated.find(p => p.staffId === staff.id && p.status === 'active');
          if (existingNewP) {
            updated = updated.map(p => p.staffId === staff.id && p.status === 'active' ? { ...p, participationTypeIds: [...p.participationTypeIds, typeId] } : p);
          } else {
            const newP: CaseParticipant = {
              staffId: staff.id, staffName: `${staff.firstName} ${staff.lastName}`,
              externalId: (staff as any).gmcNumber || staff.npi || undefined,
              externalIdType: (staff as any).gmcNumber ? 'GMC' : staff.npi ? 'NPI' : undefined,
              source: 'manual', participationTypeIds: [typeId],
              addedBy: user?.id ?? 'unknown', addedAt: new Date().toISOString(), status: 'active',
            };
            updated = [...updated, newP];
          }
        }
        return updated;
      });
    }
    setReplaceConfirm(null);
  }, [replaceConfirm, staffList, user?.id]);

  // ── remove — draft only, resolved at Save time ────────────────────────────────
  const handleRemove = (staffId: string, typeId: string) => {
    const isSelf        = staffId === user?.id;
    const isPrimary     = typeId === 'primary';
    const primaryCount  = activeParticipants.filter(p => p.participationTypeIds.includes('primary')).length;
    if (isSelf && isPrimary && primaryCount <= 1) { setShowSelfBlock(true); return; }

    const key = `${staffId}-${typeId}`;
    setRemovedKeys(prev => new Set(prev).add(key));
  };

  const handleUndoRemove = (staffId: string, typeId: string) => {
    const key = `${staffId}-${typeId}`;
    setRemovedKeys(prev => { const n = new Set(prev); n.delete(key); return n; });
  };

  const resolveFinalParticipants = useCallback((): CaseParticipant[] => {
    if (removedKeys.size === 0) return participants;
    return participants.map(p => {
      if (p.status !== 'active') return p;
      const keptTypes = p.participationTypeIds.filter((id: string) => !removedKeys.has(`${p.staffId}-${id}`));
      if (keptTypes.length === p.participationTypeIds.length) return p;
      return keptTypes.length === 0 ? { ...p, status: 'removed' as const } : { ...p, participationTypeIds: keptTypes };
    });
  }, [participants, removedKeys]);

  const isDraftDirty = useMemo(() => {
    if (removedKeys.size > 0) return true;
    const final = resolveFinalParticipants();
    const orig  = initialParticipantsRef.current;
    if (final.length !== orig.length) return true;
    const key = (p: CaseParticipant) => `${p.staffId}|${p.status}|${[...p.participationTypeIds].sort().join(',')}`;
    const origKeys  = new Set(orig.map(key));
    const finalKeys = new Set(final.map(key));
    if (origKeys.size !== finalKeys.size) return true;
    for (const k of origKeys) if (!finalKeys.has(k)) return true;
    return false;
  }, [resolveFinalParticipants, removedKeys]);

  useEffect(() => {
    onDirtyChange?.(isDraftDirty);
    return () => { onDirtyChange?.(false); };
  }, [isDraftDirty, onDirtyChange]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const final = resolveFinalParticipants();
      await mockCaseService.updateCase(caseData.id, { participants: final } as any);
      onUpdated({ ...caseData, participants: final } as any);
      onClose();
    } finally {
      setIsSaving(false);
    }
  }, [resolveFinalParticipants, caseData, onUpdated, onClose]);

  const handleClose = useCallback(() => {
    if (isDraftDirty) { setShowDirtyWarn(true); return; }
    onClose();
  }, [isDraftDirty, onClose]);

  const handleDiscardConfirm = useCallback(() => {
    setShowDirtyWarn(false);
    onClose();
  }, [onClose]);

  const draggingStaff = activeId ? staffList.find(s => `staff-${s.id}` === activeId) : null;

  return (
    <>
      <div className="ps-overlay" onClick={handleClose}>
        <div onClick={e => e.stopPropagation()} style={{
          width: '100%', maxWidth: 960, height: '88vh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }} className="ps-research-modal">

          {/* Header */}
          <div className="ps-research-header">
            <div>
              <div className="fm-eyebrow">Case Team</div>
              <div className="fm-title-row">
                <h2 className="fm-title">{caseData.accession?.fullAccession ?? caseData.id}</h2>
              </div>
              <div style={{ fontSize: 12, color: '#8a9db5', marginTop: 2 }}>
                {caseData.patient ? `${caseData.patient.lastName}, ${caseData.patient.firstName}` : ''}
                {' · '}
                <span style={{ color: '#64748b' }}>Drag staff cards onto participation types to assign · Removing yourself from Primary requires </span>
                <span onClick={() => { onDelegate?.(); }} style={{ color: '#0891B2', cursor: 'pointer', textDecoration: 'underline' }}>Delegate</span>
              </div>
            </div>
            <button className="ps-research-close" onClick={handleClose} aria-label="Close">✕</button>
          </div>

          {/* Rejection banner — real feedback instead of a silent no-op */}
          {rejectionMessage && (
            <div style={{
              margin: '10px 20px 0', padding: '8px 14px', borderRadius: 8,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
            }}>
              <span style={{ fontSize: 13 }}>⊘</span>
              <span style={{ fontSize: 12, color: '#fca5a5', flex: 1 }}>{rejectionMessage}</span>
              <button onClick={() => setRejectionMessage(null)} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: 13 }}>✕</button>
            </div>
          )}

          {/* Body */}
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 340px', minHeight: 0, overflow: 'hidden' }}>

              {/* LEFT — drop zones */}
              <div style={{ borderRight: '1px solid rgba(255,255,255,0.06)', overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="fm-eyebrow" style={{ marginBottom: 4 }}>Participation Types</div>
                {loading ? (
                  <div style={{ padding: '32px 0', textAlign: 'center', color: '#475569', fontSize: 13 }}>Loading…</div>
                ) : visibleTypes.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: '#475569', fontSize: 13, border: '1px dashed rgba(255,255,255,0.07)', borderRadius: 10 }}>
                    No participation types configured. Set up types in System → Participation Types.
                  </div>
                ) : visibleTypes.map(type => (
                  <DropZone
                    key={type.id} type={type} participants={participants}
                    currentUserId={user?.id ?? ''} isOver={overId === `type-${type.id}`}
                    dragEligibility={draggedStaffId ? getDragEligibility(draggedStaffId, type.id) : null}
                    onRemove={handleRemove} onUndoRemove={handleUndoRemove}
                    removedKeys={removedKeys} onDelegate={() => { onClose(); onDelegate?.(); }}
                  />
                ))}
              </div>

              {/* RIGHT — staff directory */}
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '16px 16px 10px', flexShrink: 0 }}>
                  <div className="fm-eyebrow" style={{ marginBottom: 8 }}>Staff Directory</div>
                  <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search staff…"
                    className="fm-search-input"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {filteredStaff.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: '#475569', fontSize: 12 }}>No staff found</div>
                  ) : filteredStaff.map(s => {
                    const isOnCase = staffOnCase.has(s.id);
                    return (
                      <StaffCard
                        key={s.id} id={`staff-${s.id}`} staff={s} roles={roles} allTypes={allTypes}
                        disabled={isOnCase} isDragging={activeId === `staff-${s.id}`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Drag overlay */}
            <DragOverlay>
              {draggingStaff && (
                <div style={{ padding: '10px 14px', background: '#1e293b', border: '2px solid #8AB4F8', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', cursor: 'grabbing', opacity: 0.95 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(138,180,248,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#8AB4F8' }}>
                      {`${draggingStaff.firstName[0]}${draggingStaff.lastName[0]}`}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb' }}>{draggingStaff.firstName} {draggingStaff.lastName}</div>
                      <div style={{ fontSize: 11, color: '#cbd5e1' }}>{draggingStaff.roles.join(', ')}</div>
                    </div>
                  </div>
                </div>
              )}
            </DragOverlay>
          </DndContext>

          {/* Footer — Cancel (reverts) | Save (commits + closes) */}
          <div className="fm-footer">
            <span className="fm-footer-status" style={{ color: isDraftDirty ? '#f59e0b' : undefined }}>
              {activeParticipants.length} team member{activeParticipants.length !== 1 ? 's' : ''}
              {isDraftDirty ? ' · Unsaved changes' : ''}
            </span>
            <button className="fm-btn-cancel" onClick={handleClose}>Cancel</button>
            <button
              className="fm-btn-cancel"
              onClick={handleSave}
              disabled={!isDraftDirty || isSaving}
              style={{
                background: isDraftDirty ? 'rgba(34,197,94,0.15)' : undefined,
                borderColor: isDraftDirty ? 'rgba(34,197,94,0.5)' : undefined,
                color: isDraftDirty ? '#4ade80' : undefined,
                fontWeight: 700,
                opacity: isSaving ? 0.6 : 1,
                cursor: (!isDraftDirty || isSaving) ? 'default' : 'pointer',
              }}
            >
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          </div>

        </div>
      </div>

      {showSelfBlock && (
        <SelfRemoveBlockedModal
          onClose={() => setShowSelfBlock(false)}
          onDelegate={() => { setShowSelfBlock(false); onClose(); onDelegate?.(); }}
        />
      )}

      {replaceConfirm && (
        <ReplaceConfirmModal
          state={replaceConfirm}
          onConfirm={() => resolveReplace(true)}
          onCancel={() => resolveReplace(false)}
        />
      )}

      {showDirtyWarn && ReactDOM.createPortal(
        <div className="ps-overlay" style={{ zIndex: 9500 }}>
          <div className="ps-modal-dark ps-modal-dark--sm">
            <div className="ps-modal-dark-header">
              <span className="ps-modal-dark-emoji">⚠️</span>
              <span className="ps-modal-dark-title">Discard changes?</span>
            </div>
            <p className="ps-modal-dark-body">You have unsaved team changes. Closing will discard them — nothing has been saved yet.</p>
            <div className="ps-modal-dark-footer ps-modal-dark-footer--stretch">
              <button className="ps-btn-ghost-dark ps-modal-dark-footer__flex-btn" onClick={() => setShowDirtyWarn(false)}>Keep editing</button>
              <button className="ps-btn-red ps-modal-dark-footer__flex-btn" onClick={handleDiscardConfirm}>Discard changes</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default CaseTeamModal;
