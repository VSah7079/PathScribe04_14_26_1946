import React, { useState, useEffect } from 'react';
import '../../../pathscribe.css';
<<<<<<< HEAD
import { IActionRegistryService } from '../../../services/actionRegistry/IActionRegistryService';
import { mockStaffDirectoryService } from '../../../services/staffDirectory/mockStaffDirectoryService';
import type { StaffMember } from '../../../services/staffDirectory/IStaffDirectoryService';
import { useSubspecialties } from '../../../contexts/useSubspecialties';
import { mockDelegationTypeService } from '../../../services/delegationTypes/mockDelegationTypeService';
import { loadDelegationTypes } from '../../../constants/delegationTypes';
=======
import {
  DndContext, DragEndEvent, DragStartEvent, DragOverlay,
  useDraggable, useDroppable, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { IActionRegistryService } from '../../../services/actionRegistry/IActionRegistryService';
import { userService, subspecialtyService } from '../../../services';
import { getStaffSubspecialtyDisplay } from '../../../utils/staffSubspecialties';
import type { StaffUser, Subspecialty } from '../../../services';
import { mockDelegationTypeService } from '../../../services/delegationTypes/mockDelegationTypeService';
>>>>>>> upstream/main
import { delegateCase } from '../../../services/cases/mockCaseService';

interface Pool {
  id: string;
  name: string;
  subspecialty: string;
  memberCount: number;
}

interface SynopticOption {
  instanceId: string;
  specimenDescription: string;
  templateName: string;
}

interface DelegateModalProps {
  isOpen: boolean;
  onClose: () => void;
  registry: IActionRegistryService;
  caseId?: string;
  currentUserId?: string;
  onDelegated?: () => void;
  synopticInstances?: SynopticOption[];
}

<<<<<<< HEAD
const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  Available: { bg: 'rgba(16,185,129,0.12)',  color: '#34d399' },
  Busy:      { bg: 'rgba(251,146,60,0.12)',   color: '#fb923c' },
  Active:    { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8' },
};

export const DelegateModal: React.FC<DelegateModalProps> = ({ isOpen, onClose, registry, caseId, currentUserId = 'PATH-001', onDelegated, synopticInstances = [] }) => {
  const { subspecialties } = useSubspecialties();
  const [searchTerm,         setSearchTerm]         = useState('');
  const [selectedId,         setSelectedId]         = useState<string | null>(null);
  const [tab,                setTab]                = useState<'individuals' | 'pools'>('individuals');
  const [confirming,         setConfirming]         = useState(false);
  const [delegationType,     setDelegationType]     = useState<string | null>(null);
  const [note,               setNote]               = useState('');
  const [step,               setStep]               = useState<'type' | 'recipient'>('type');
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [delegationTypes, setDelegationTypes] = useState(() => loadDelegationTypes().filter((d: any) => d.active));
  const [staff,      setStaff]      = useState<StaffMember[]>([]);
  // Pools come directly from the subspecialties context (same source as Config UI)
=======
// ─── Draggable recipient card — staff or pool ────────────────────────────────

interface RecipientCardProps {
  id: string; // 'staff-<id>' or 'pool-<id>'
  primary: string;
  secondary: string;
  isSelected: boolean;
  onClick: () => void;
}

const RecipientCard: React.FC<RecipientCardProps> = ({ id, primary, secondary, isSelected, onClick }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      style={{
        padding: '9px 12px',
        background: isDragging ? 'rgba(138,180,248,0.15)' : isSelected ? 'rgba(8,145,178,0.12)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${isDragging ? 'rgba(138,180,248,0.4)' : isSelected ? 'rgba(8,145,178,0.4)' : 'rgba(255,255,255,0.08)'}`,
        borderLeft: isSelected ? '2px solid #0891B2' : '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8, cursor: 'grab', marginBottom: 4,
        transform: transform ? CSS.Translate.toString(transform) : undefined,
        userSelect: 'none', touchAction: 'none',
        transition: isDragging ? 'none' : 'all 0.12s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
          background: 'rgba(138,180,248,0.15)', border: '1.5px solid rgba(138,180,248,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, color: '#8AB4F8',
        }}>
          {primary.replace(/^Dr\.\s*/, '').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{primary}</div>
          <div style={{ fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{secondary}</div>
        </div>
        <div style={{ fontSize: 14, color: '#374151', flexShrink: 0 }}>⠿</div>
      </div>
    </div>
  );
};

// ─── Delegation type — now a real drop zone ───────────────────────────────────

interface TypeZoneProps {
  dt: any;
  isSelected: boolean;
  isOver: boolean;
  selectedRecipientLabel: string | null;
  onSelectType: () => void;
  onClearRecipient: () => void;
}

const TypeZone: React.FC<TypeZoneProps> = ({ dt, isSelected, isOver, selectedRecipientLabel, onSelectType, onClearRecipient }) => {
  const { setNodeRef } = useDroppable({ id: `type-${dt.id}` });

  return (
    <div
      ref={setNodeRef}
      onClick={onSelectType}
      style={{
        padding: '10px 12px', marginBottom: 6, borderRadius: 10, cursor: 'pointer',
        background: isOver ? dt.color + '14' : isSelected ? 'rgba(8,145,178,0.08)' : 'rgba(255,255,255,0.02)',
        border: `1.5px ${isOver ? 'solid' : isSelected ? 'solid' : 'dashed'} ${isOver ? dt.color + '66' : isSelected ? 'rgba(8,145,178,0.4)' : 'rgba(255,255,255,0.08)'}`,
        transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.03em', padding: '2px 6px', borderRadius: 5, flexShrink: 0,
          background: isSelected ? dt.color + '22' : 'rgba(255,255,255,0.06)', color: isSelected ? dt.color : '#94a3b8',
        }}>
          {dt.id.replace('_', ' ')}
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb', flex: 1 }}>{dt.label}</span>
        {isSelected && <span style={{ color: '#0891B2', fontSize: 13, fontWeight: 700 }}>✓</span>}
      </div>
      <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>{dt.description}</div>
      {dt.transfersOwnership && (
        <span style={{ display: 'inline-block', marginTop: 4, fontSize: 10, fontWeight: 700, color: '#f59e0b' }}>transfers ownership</span>
      )}
      {isSelected && (
        selectedRecipientLabel ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '6px 10px', background: 'rgba(8,145,178,0.1)', border: '1px solid rgba(8,145,178,0.25)', borderRadius: 7 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#7dd3fc', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedRecipientLabel}</span>
            <button onClick={e => { e.stopPropagation(); onClearRecipient(); }} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 13, padding: 0 }}>✕</button>
          </div>
        ) : (
          <div style={{ marginTop: 8, padding: '6px 10px', border: '1px dashed rgba(255,255,255,0.12)', borderRadius: 7, fontSize: 11, color: '#475569', textAlign: 'center' }}>
            {isOver ? 'Drop to assign' : 'Drag a recipient here, or click one on the right'}
          </div>
        )
      )}
    </div>
  );
};

export const DelegateModal: React.FC<DelegateModalProps> = ({
  isOpen, onClose, registry, caseId, currentUserId = 'PATH-001', onDelegated, synopticInstances = []
}) => {
  const [subspecialties, setSubspecialties] = useState<Subspecialty[]>([]);
  const [searchTerm,         setSearchTerm]         = useState('');
  const [selectedId,         setSelectedId]         = useState<string | null>(null);
  const [filter,             setFilter]             = useState<'individuals' | 'pools'>('individuals');
  const [confirming,         setConfirming]         = useState(false);
  const [delegationType,     setDelegationType]     = useState<string | null>(null);
  const [note,               setNote]               = useState('');
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [delegationTypes,    setDelegationTypes]    = useState<any[]>([]);
  const [staff,              setStaff]              = useState<{id:string;name:string;role:string;subspecialty:string}[]>([]);
  const [loading,            setLoading]            = useState(false);
  const [activeId,           setActiveId]           = useState<string | null>(null);
  const [overId,             setOverId]             = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

>>>>>>> upstream/main
  const contextPools: Pool[] = subspecialties
    .filter(s => s.active)
    .map(s => ({
      id: s.id,
      name: s.name,
      subspecialty: s.name,
      memberCount: s.userIds?.length ?? 0,
    }));
<<<<<<< HEAD
  const [loading,    setLoading]    = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm(''); setSelectedId(null); setConfirming(false); setDelegationType(null); setNote(''); setStep('type'); setSelectedInstanceId(null);
      // Load real data from services
      setLoading(true);
      Promise.all([
        mockStaffDirectoryService.listIndividuals(),
        mockDelegationTypeService.getActive(),
      ]).then(([individuals, typesResult]) => {
        setStaff(individuals);
        if (typesResult.ok) setDelegationTypes(typesResult.data);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [isOpen]);
=======

  useEffect(() => {
    if (isOpen) {
      setSearchTerm(''); setSelectedId(null); setConfirming(false);
      setDelegationType(null); setNote(''); setSelectedInstanceId(null);
      setLoading(true);
      Promise.all([
        userService.getAll(),
        mockDelegationTypeService.getActive(),
        subspecialtyService.getAll(),
      ]).then(([usersResult, typesResult, subspecialtiesResult]) => {
        const allSubspecialties = subspecialtiesResult.ok ? subspecialtiesResult.data : [];
        if (usersResult.ok) {
          const delegates = usersResult.data
            .filter((u: StaffUser) =>
              u.id !== currentUserId &&
              u.roles.some(r => r === 'Pathologist' || r === 'Resident')
            )
            .map((u: StaffUser) => {
              const prefix = u.credentials ? 'Dr. ' : '';
              const parts   = [u.firstName, u.middleName, u.lastName].filter(Boolean);
              return {
                id:          u.id,
                name:        prefix + parts.join(' '),
                role:        u.roles.find(r => r === 'Pathologist' || r === 'Resident') ?? u.roles[0] ?? 'Staff',
                // Real fix, per direct confirmation: replaces the old
                // free-text department field with the real, assigned
                // Subspecialty name(s) — this field was already
                // called "subspecialty" but was incorrectly reading
                // department instead of the real relationship.
                subspecialty: getStaffSubspecialtyDisplay(u.id, allSubspecialties),
              };
            });
          setStaff(delegates);
        }
        if (typesResult.ok) setDelegationTypes(typesResult.data);
        if (subspecialtiesResult.ok) setSubspecialties(subspecialtiesResult.data);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [isOpen, currentUserId]);
>>>>>>> upstream/main

  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = registry.onAction((actionId) => {
      if (actionId === 'CLOSE_MODAL' || actionId === 'NAVIGATE_BACK') onClose();
    });
    return () => unsubscribe();
  }, [isOpen, registry, onClose]);

  const filteredStaff = staff.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.subspecialty.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPools = contextPools.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.subspecialty.toLowerCase().includes(searchTerm.toLowerCase())
  );

<<<<<<< HEAD
  const selectedStaff = staff.find(s => s.id === selectedId);
  const selectedPool  = contextPools.find(p => p.id === selectedId);
  const selectedLabel = selectedStaff?.name ?? selectedPool?.name ?? null;

  const selectedDelegationType = delegationTypes.find(d => d.id === delegationType);

  const handleConfirm = async () => {
    if (!selectedLabel || !delegationType) return;
=======
  const selectedStaff     = staff.find(s => s.id === selectedId);
  const selectedPool      = contextPools.find(p => p.id === selectedId);
  const selectedLabel     = selectedStaff?.name ?? selectedPool?.name ?? null;
  const selectedDelegType = delegationTypes.find(d => d.id === delegationType);

  const canConfirm =
    !!delegationType &&
    !!selectedId &&
    !confirming &&
    !(selectedDelegType?.requiresNote && !note) &&
    !(delegationType === 'SYNOPTIC_ASSIGN' && synopticInstances.length > 0 && !selectedInstanceId);

  // ── drag handling — sets BOTH delegationType and selectedId at once ──────────
  // Click-to-select (below, on each type zone and each recipient card) still
  // works independently -- this is a faster additive gesture, not a
  // replacement. Deliberately does NOT auto-confirm: dropping only sets the
  // selection, same as clicking would -- the explicit Confirm Delegation
  // button is still required before anything real happens. A couple of
  // these delegation types transfer case ownership; a single accidental
  // drag is a much easier mistake than a deliberate click sequence, so the
  // final confirm step stays mandatory regardless of how the selection was made.
  const handleDragStart = (event: DragStartEvent) => { setActiveId(String(event.active.id)); };
  const handleDragOver  = (event: any)             => { setOverId(event.over ? String(event.over.id) : null); };
  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null); setOverId(null);
    const { active, over } = event;
    if (!over) return;
    const recipientId = String(active.id).replace(/^(staff|pool)-/, '');
    const typeId = String(over.id).replace('type-', '');
    setDelegationType(typeId);
    setSelectedId(recipientId);
    setSelectedInstanceId(null);
  };

  const draggingStaff = activeId?.startsWith('staff-') ? staff.find(s => `staff-${s.id}` === activeId) : null;
  const draggingPool  = activeId?.startsWith('pool-')  ? contextPools.find(p => `pool-${p.id}` === activeId) : null;

  const handleConfirm = async () => {
    if (!canConfirm) return;
>>>>>>> upstream/main
    setConfirming(true);
    try {
      if (caseId) {
        if (delegationType === 'SYNOPTIC_ASSIGN' && selectedInstanceId) {
          const { assignSynoptic } = await import('../../../services/cases/mockCaseService');
          await assignSynoptic(
            caseId, selectedInstanceId,
            selectedId ?? '', selectedLabel ?? '',
            currentUserId, true, note || undefined,
          );
        } else {
          const isPool = selectedPool !== undefined;
<<<<<<< HEAD
          await delegateCase(
            caseId, currentUserId, delegationType,
            isPool ? undefined   : (selectedId ?? undefined),
            isPool ? (selectedId ?? undefined) : undefined,
            isPool ? selectedLabel : undefined,
            note || undefined,
          );
=======
          await delegateCase({
            caseId, requestorId: currentUserId, delegationType: delegationType!,
            targetUserId:   isPool ? undefined : (selectedId ?? undefined),
            targetUserName: isPool ? undefined : (selectedLabel ?? undefined),
            targetPoolId:   isPool ? (selectedId ?? undefined) : undefined,
            targetPoolName: isPool ? selectedLabel ?? undefined : undefined,
            note: note || undefined,
          });
>>>>>>> upstream/main
        }
      }
      onDelegated?.();
      onClose();
    } finally {
      setConfirming(false);
    }
  };

  if (!isOpen) return null;

  return (
<<<<<<< HEAD
    <div className="fm-overlay" onClick={onClose}>
      <div className="ps-research-modal fm-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="ps-research-header">
          <div>
            <div className="fm-eyebrow">Case Action · Step {step === 'type' ? '1 of 2' : '2 of 2'}</div>
            <div className="fm-title-row">
              <span style={{ fontSize: 20 }}>👤</span>
              <h2 className="fm-title">{step === 'type' ? 'Delegation Type' : 'Select Recipient'}</h2>
              {selectedDelegationType && step === 'recipient' && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: 'rgba(8,145,178,0.12)', color: '#38bdf8', border: '1px solid rgba(8,145,178,0.2)' }}>
                  {selectedDelegationType.label}
=======
    <div className="ps-overlay" onClick={onClose}>
      <div className="ps-research-modal fm-modal" onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column' }}>

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="ps-research-header">
          <div>
            <div className="fm-eyebrow">Case Action · Delegation</div>
            <div className="fm-title-row">
              <span className="fm-del-persona-icon">👤</span>
              <h2 className="fm-title">Delegate Case</h2>
              {selectedDelegType && (
                <span className="fm-del-mode-badge">
                  {selectedDelegType.label}
>>>>>>> upstream/main
                </span>
              )}
            </div>
          </div>
<<<<<<< HEAD
          <button className="ps-research-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {/* Step 1 — Delegation Type */}
        {step === 'type' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
              Select the reason for delegation — this is recorded in the audit log and shown in My Contributions.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {delegationTypes.map(dt => {
                const isSelected = delegationType === dt.id;
                return (
                  <button
                    key={dt.id}
                    onClick={() => { setDelegationType(dt.id); setStep('recipient'); }}
                    className={'fm-flag-card' + (isSelected ? ' applied' : '')}
                    style={{ textAlign: 'left', cursor: 'pointer' }}
                  >
                    <span
                      className="fm-code-chip"
                      title={dt.id}
                      style={{ width: 76, minWidth: 76, flexShrink: 0, textAlign: 'center', fontSize: 9, letterSpacing: '0.03em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', background: isSelected ? dt.color + '22' : undefined, color: isSelected ? dt.color : undefined }}
                    >
                      {dt.id.replace('_', ' ')}
                    </span>
                    <div className="fm-flag-info">
                      <div className="fm-flag-name-row">
                        <span className="fm-flag-name">{dt.label}</span>
                        {dt.transfersOwnership && (
                          <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600 }}>transfers ownership</span>
                        )}
                        {dt.cptHint && (
                          <span style={{ fontSize: 10, color: '#94a3b8' }}>CPT {dt.cptHint}</span>
                        )}
                      </div>
                      <div className="fm-flag-desc">{dt.description}</div>
                    </div>
                    {isSelected
                      ? <span className="fm-applied-text">✓ Selected</span>
                      : <span className="fm-apply-btn">Select</span>
                    }
                  </button>
                );
              })}

              {/* Synoptic picker — shown when SYNOPTIC_ASSIGN is selected */}
              {delegationType === 'SYNOPTIC_ASSIGN' && synopticInstances.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    Select Synoptic to Assign
                  </div>
=======
          <button className="ps-close-btn" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* ── Two-panel body — matches CaseTeamModal's drop-zone pattern ── */}
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 340px', minHeight: 0, overflow: 'hidden' }}>

            {/* LEFT — delegation types, each a real drop zone */}
            <div style={{ borderRight: '1px solid rgba(255,255,255,0.06)', overflowY: 'auto', padding: '16px 20px' }}>
              <div className="fm-section-label" style={{ marginBottom: 8 }}>Delegation Type</div>
              {delegationTypes.map(dt => (
                <TypeZone
                  key={dt.id}
                  dt={dt}
                  isSelected={delegationType === dt.id}
                  isOver={overId === `type-${dt.id}`}
                  selectedRecipientLabel={delegationType === dt.id ? selectedLabel : null}
                  onSelectType={() => {
                    const isSel = delegationType === dt.id;
                    setDelegationType(isSel ? null : dt.id);
                    if (!isSel) setSelectedInstanceId(null);
                  }}
                  onClearRecipient={() => setSelectedId(null)}
                />
              ))}

              {/* Synoptic picker — unchanged from before */}
              {delegationType === 'SYNOPTIC_ASSIGN' && synopticInstances.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div className="fm-section-label" style={{ marginBottom: 6 }}>Select Synoptic</div>
>>>>>>> upstream/main
                  {synopticInstances.map(inst => {
                    const isSel = selectedInstanceId === inst.instanceId;
                    return (
                      <div
                        key={inst.instanceId}
<<<<<<< HEAD
                        className={'fm-flag-card' + (isSel ? ' applied' : '')}
                        onClick={() => setSelectedInstanceId(isSel ? null : inst.instanceId)}
                        style={{ cursor: 'pointer', marginBottom: 4 }}
                      >
                        <span className="fm-code-chip" style={{ width: 80, fontSize: 10, textAlign: 'center' }}>SYNOPTIC</span>
                        <div className="fm-flag-info">
                          <span className="fm-flag-name">{inst.specimenDescription}</span>
                          <span className="fm-flag-desc">{inst.templateName}</span>
                        </div>
                        {isSel
                          ? <span className="fm-applied-text">✓ Selected</span>
                          : <span className="fm-apply-btn">Select</span>
                        }
=======
                        onClick={() => setSelectedInstanceId(isSel ? null : inst.instanceId)}
                        style={{
                          padding: '8px 12px', marginBottom: 4, borderRadius: 8, cursor: 'pointer',
                          background: isSel ? 'rgba(8,145,178,0.12)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${isSel ? 'rgba(8,145,178,0.4)' : 'rgba(255,255,255,0.08)'}`,
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb' }}>{inst.specimenDescription}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{inst.templateName}</div>
>>>>>>> upstream/main
                      </div>
                    );
                  })}
                </div>
              )}
<<<<<<< HEAD
            </div>
          </div>
        )}

        {/* Step 2 — Recipient selection (existing body) */}
        {step === 'recipient' && (
          <div className="fm-body">
          {/* Left panel — tab switcher */}
          <div className="fm-left">
            <div className="fm-section-label" style={{ padding: '0 16px', marginBottom: 8 }}>Delegate to</div>

            <button
              className={'fm-target-row' + (tab === 'individuals' ? ' active' : '')}
              onClick={() => { setTab('individuals'); setSelectedId(null); }}
            >
              <span style={{ fontSize: 15 }}>👤</span>
              <span style={{ flex: 1 }}>Individual</span>
            </button>

            <button
              className={'fm-target-row' + (tab === 'pools' ? ' active' : '')}
              onClick={() => { setTab('pools'); setSelectedId(null); }}
            >
              <span style={{ fontSize: 15 }}>👥</span>
              <span style={{ flex: 1 }}>Pool / Queue</span>
            </button>

            <div className="fm-divider" />

            {/* Selected summary */}
            {selectedLabel && (
              <div style={{ padding: '12px 16px' }}>
                <div className="fm-section-label" style={{ marginBottom: 6 }}>Selected</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#38bdf8' }}>{selectedLabel}</div>
                {selectedStaff && (
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{selectedStaff.role}</div>
                )}
              </div>
            )}
          </div>

          {/* Right panel — search + list */}
          <div className="fm-right">

            {/* Search */}
            <div style={{ padding: '14px 16px 10px' }}>
              <div className="fm-search-wrap">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: '#64748b', flexShrink: 0 }}>
                  <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M10 10l4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
=======

              {/* Note field if required — unchanged from before */}
              {selectedDelegType?.requiresNote && (
                <div style={{ marginTop: 12 }}>
                  <div className="fm-section-label" style={{ marginBottom: 4 }}>Note (required)</div>
                  <input
                    type="text"
                    placeholder="Add a note…"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    className="fm-del-note-textarea"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
              )}
            </div>

            {/* RIGHT — recipient directory (filter + search + draggable cards) */}
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '16px 16px 0', flexShrink: 0 }}>
                <div className="fm-section-label" style={{ marginBottom: 8 }}>Delegate To</div>
                <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                  <button
                    onClick={() => { setFilter('individuals'); }}
                    style={{
                      flex: 1, padding: '6px 10px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      border: `1px solid ${filter === 'individuals' ? 'rgba(8,145,178,0.4)' : 'rgba(255,255,255,0.08)'}`,
                      background: filter === 'individuals' ? 'rgba(8,145,178,0.12)' : 'transparent',
                      color: filter === 'individuals' ? '#7dd3fc' : '#94a3b8',
                    }}
                  >
                    👤 Individual
                  </button>
                  <button
                    onClick={() => { setFilter('pools'); }}
                    style={{
                      flex: 1, padding: '6px 10px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      border: `1px solid ${filter === 'pools' ? 'rgba(8,145,178,0.4)' : 'rgba(255,255,255,0.08)'}`,
                      background: filter === 'pools' ? 'rgba(8,145,178,0.12)' : 'transparent',
                      color: filter === 'pools' ? '#7dd3fc' : '#94a3b8',
                    }}
                  >
                    👥 Pool / Queue
                  </button>
                </div>
>>>>>>> upstream/main
                <input
                  autoFocus
                  className="fm-search-input"
                  type="text"
<<<<<<< HEAD
                  placeholder={tab === 'individuals' ? 'Search by name or role…' : 'Search pools…'}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button className="fm-search-clear" onClick={() => setSearchTerm('')}>✕</button>
                )}
              </div>
            </div>

            {/* Column header */}
            <div style={{ display: 'flex', gap: 8, padding: '4px 16px 8px', borderBottom: '1px solid rgba(30,41,59,0.9)' }}>
              <span className="fm-col-header" style={{ width: 120 }}>NAME</span>
              <span className="fm-col-header" style={{ flex: 1 }}>
                {tab === 'individuals' ? 'ROLE · STATUS' : 'MEMBERS'}
              </span>
              <span className="fm-col-header" style={{ width: 80, textAlign: 'right' }}>ACTION</span>
            </div>

            {/* List */}
            <div className="fm-flag-list">
              {loading && (
                <div className="fm-empty">
                  <div className="fm-empty-hint">Loading staff…</div>
                </div>
              )}
              {tab === 'individuals' && !loading && (
                filteredStaff.length === 0
                  ? (
                    <div className="fm-empty">
                      <div className="fm-empty-heading">No results for "{searchTerm}"</div>
                      <div className="fm-empty-hint">Try a different name or role</div>
                    </div>
                  )
                  : filteredStaff.map(staff => {
                    const isSelected = selectedId === staff.id;
                    const s = STATUS_STYLE[staff.status] ?? STATUS_STYLE.Active;
                    return (
                      <div
                        key={staff.id}
                        className={'fm-flag-card' + (isSelected ? ' applied' : '')}
                        onClick={() => setSelectedId(isSelected ? null : staff.id)}
                      >
                        <span className="fm-code-chip" style={{ width: 80, minWidth: 80, flexShrink: 0, textAlign: 'center', fontSize: 9, letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {staff.role}
                        </span>
                        <div className="fm-flag-info">
                          <div className="fm-flag-name-row">
                            <span className="fm-flag-name">{staff.name}</span>
                          </div>
                          <div className="fm-flag-desc">
                            <span style={{ padding: '1px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: s.bg, color: s.color }}>
                              {staff.status}
                            </span>
                          </div>
                        </div>
                        {isSelected
                          ? <span className="fm-applied-text">✓ Selected</span>
                          : <span className="fm-apply-btn">+ Select</span>
                        }
                      </div>
                    );
                  })
              )}

              {tab === 'pools' && !loading && (
                filteredPools.length === 0
                  ? (
                    <div className="fm-empty">
                      <div className="fm-empty-heading">No pools found</div>
                      <div className="fm-empty-hint">Try a different search term</div>
                    </div>
                  )
                  : filteredPools.map(pool => {
                    const isSelected = selectedId === pool.id;
                    return (
                      <div
                        key={pool.id}
                        className={'fm-flag-card' + (isSelected ? ' applied' : '')}
                        onClick={() => setSelectedId(isSelected ? null : pool.id)}
                      >
                        <span className="fm-code-chip" style={{ width: 108, textAlign: 'center', fontSize: 11 }}>
                          POOL
                        </span>
                        <div className="fm-flag-info">
                          <div className="fm-flag-name-row">
                            <span className="fm-flag-name">{pool.name}</span>
                          </div>
                          <div className="fm-flag-desc">{pool.memberCount} members available</div>
                        </div>
                        {isSelected
                          ? <span className="fm-applied-text">✓ Selected</span>
                          : <span className="fm-apply-btn">+ Select</span>
                        }
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
        )} {/* end step === 'recipient' */}

        {/* Footer */}
        <div className="fm-footer">
          <span className={'fm-footer-status' + (delegationType || selectedLabel ? ' dirty' : '')}>
            {step === 'type'
              ? (delegationType ? delegationTypes.find(d => d.id === delegationType)?.label : 'Select a delegation type')
              : (selectedLabel ? 'Delegating to: ' + selectedLabel : 'No recipient selected')
            }
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            {step === 'recipient' && (
              <button className="fm-btn-cancel" onClick={() => setStep('type')}>← Back</button>
            )}
            <button className="fm-btn-cancel" onClick={onClose}>Cancel</button>
            {step === 'type' ? (
              <button
                className="fm-btn-save"
                disabled={!delegationType}
                style={{ opacity: (!delegationType || (delegationType === 'SYNOPTIC_ASSIGN' && synopticInstances.length > 0 && !selectedInstanceId)) ? 0.5 : 1 }}
                onClick={() => {
                  if (delegationType === 'SYNOPTIC_ASSIGN' && synopticInstances.length > 0 && !selectedInstanceId) return;
                  setStep('recipient');
                }}
              >
                Next →
              </button>
            ) : (
              <>
                {/* Optional note field */}
                {selectedDelegationType?.requiresNote && (
                  <input
                    type="text"
                    placeholder="Add a note (required)…"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#e2e8f0', width: 200, outline: 'none' }}
                  />
                )}
                <button
                  className="fm-btn-save"
                  disabled={!selectedId || confirming || (selectedDelegationType?.requiresNote && !note)}
                  onClick={handleConfirm}
                  style={{ opacity: !selectedId || confirming ? 0.5 : 1 }}
                >
                  {confirming ? 'Delegating…' : 'Confirm Delegation'}
                </button>
              </>
            )}
=======
                  placeholder={filter === 'individuals' ? 'Search by name or role…' : 'Search pools…'}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px 16px' }}>
                {loading && <div style={{ padding: 24, textAlign: 'center', color: '#475569', fontSize: 12 }}>Loading…</div>}

                {filter === 'individuals' && !loading && (
                  filteredStaff.length === 0
                    ? <div style={{ padding: 24, textAlign: 'center', color: '#475569', fontSize: 12 }}>No results for "{searchTerm}"</div>
                    : filteredStaff.map(s => (
                        <RecipientCard
                          key={s.id}
                          id={`staff-${s.id}`}
                          primary={s.name}
                          secondary={`${s.role} · ${s.subspecialty || '—'}`}
                          isSelected={selectedId === s.id}
                          onClick={() => setSelectedId(selectedId === s.id ? null : s.id)}
                        />
                      ))
                )}

                {filter === 'pools' && !loading && (
                  filteredPools.length === 0
                    ? <div style={{ padding: 24, textAlign: 'center', color: '#475569', fontSize: 12 }}>No pools found</div>
                    : filteredPools.map(pool => (
                        <RecipientCard
                          key={pool.id}
                          id={`pool-${pool.id}`}
                          primary={pool.name}
                          secondary={`POOL · ${pool.memberCount} members available`}
                          isSelected={selectedId === pool.id}
                          onClick={() => setSelectedId(selectedId === pool.id ? null : pool.id)}
                        />
                      ))
                )}
              </div>
            </div>
          </div>

          <DragOverlay>
            {(draggingStaff || draggingPool) && (
              <div style={{ padding: '9px 12px', background: '#1e293b', border: '2px solid #8AB4F8', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', cursor: 'grabbing', opacity: 0.95, width: 300 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(138,180,248,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#8AB4F8' }}>
                    {(draggingStaff?.name ?? draggingPool?.name ?? '').replace(/^Dr\.\s*/, '').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase()}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb' }}>{draggingStaff?.name ?? draggingPool?.name}</div>
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {/* ── Footer — unchanged ─────────────────────────────── */}
        <div className="fm-footer">
          <span className={'fm-footer-status' + (delegationType || selectedLabel ? ' dirty' : '')}>
            {!delegationType
              ? 'Choose a delegation type'
              : !selectedId
                ? `${selectedDelegType?.label} — choose a recipient`
                : `Delegating to ${selectedLabel} · ${selectedDelegType?.label}`
            }
          </span>
          <div className="fm-del-footer-row">
            <button className="fm-btn-cancel" onClick={onClose}>Cancel</button>
            <button
              className="fm-btn-save"
              disabled={!canConfirm}
              onClick={handleConfirm}
            >
              {confirming ? 'Delegating…' : 'Confirm Delegation'}
            </button>
>>>>>>> upstream/main
          </div>
        </div>

      </div>
    </div>
  );
};

export default DelegateModal;
