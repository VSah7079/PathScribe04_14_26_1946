// Batch 381 (PS-359): Confirm Delegation checks the organisation's Field
// Requirements (report page, Delegation): type, recipient and, when handing
// over one synoptic report, which one, are locked; a note on every
// delegation can be required, on top of a delegation type's own "requires
// note". The check is services/fieldRequirements/reportPageChecks.ts. The
// service now checks case:delegation:create; a refusal is shown. Confirm can
// also be said ("confirm delegation", DELEGATE_CONFIRM).
import React, { useState, useEffect, useRef } from 'react';
import './delegateResult.css';
import { useTranslation } from 'react-i18next';
import '../../../pathscribe.css';
import {
  DndContext, DragEndEvent, DragStartEvent, DragOverlay,
  useDraggable, useDroppable, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { IActionRegistryService } from '../../../services/actionRegistry/IActionRegistryService';
import { delegateToRecipients, toggleRecipientId, addRecipientId, limitRecipientIds } from '../../../services/delegations/delegateToRecipients';
import { formatList } from '../../../utils/formatList';
import { userService, subspecialtyService, delegationTypeService, delegationService, delegationMissing, delegationNoteShown, presetAvailable } from '../../../services';
import { useFieldRequirements } from '../../../hooks/useFieldRequirements';
import { CapabilityButton } from '../../../components/Common/CapabilityButton';
import { getStaffSubspecialtyDisplay } from '../../../utils/staffSubspecialties';
import type { StaffUser, Subspecialty } from '../../../services';
import { clickableContainer, pressable } from '@/utils/a11y/pressable';
import { LoadingState } from '@/components/Common/LoadingState';

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
  /** Batch 610 (#83): a delegation type to choose on opening (said by voice: peer review, formal consult, full transfer). */
  presetTypeId?: string;
  /** Changes each time the preset is asked for, so saying it again while open applies it again. */
  presetNonce?: number;
}

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
      {...pressable(onClick)}
      className={`ps-delegate-recipient-card${isDragging ? ' ps-delegate-recipient-card--dragging' : isSelected ? ' ps-delegate-recipient-card--selected' : ''}`}
      data-dragged={transform ? '' : undefined}
      style={transform ? { '--drag-transform': CSS.Translate.toString(transform) } as React.CSSProperties : undefined}
    >
      <div className="ps-delegate-recipient-row">
        <div className="ps-delegate-recipient-avatar">
          {primary.replace(/^Dr\.\s*/, '').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase()}
        </div>
        <div className="ps-delegate-recipient-info">
          <div className="ps-delegate-recipient-primary">{primary}</div>
          <div className="ps-delegate-recipient-secondary">{secondary}</div>
        </div>
        <div className="ps-delegate-recipient-grip">⠿</div>
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
  const { t } = useTranslation();
  const { setNodeRef } = useDroppable({ id: `type-${dt.id}` });

  return (
    <div
      ref={setNodeRef}
      // Batch 567 (axe nested-interactive): the zone can hold a button (clear the recipient), so it isn't a button
      // itself; clicking it still picks the type, and the type's name is the button for the keyboard.
      {...clickableContainer(onSelectType)}
      className={`ps-delegate-type-zone${isSelected ? ' ps-delegate-type-zone--selected' : ''}${isOver ? ' ps-delegate-type-zone--over' : ''}`}
      style={{ '--ps-hue': dt.color } as React.CSSProperties}
    >
      <div className="ps-delegate-type-zone-row">
        {/* dt.id/label/description are real, admin-configurable
            delegation-type data (mockDelegationTypeService.ts's own
            create() lets a site define custom types beyond the 7
            seeded defaults) — same "real, admin-editable dictionary
            stays untranslated" precedent as colorNames in
            EngraverMonitorPage.tsx, not static UI copy. */}
        <span className="ps-delegate-type-zone-id-badge">
          {dt.id.replace('_', ' ')}
        </span>
        <button type="button" className="ps-row-open-btn ps-delegate-type-zone-label" aria-pressed={isSelected}
          onClick={e => { e.stopPropagation(); onSelectType(); }}>{dt.label}</button>
        {isSelected && <span className="ps-delegate-type-zone-check">✓</span>}
      </div>
      <div className="ps-delegate-type-zone-desc">{dt.description}</div>
      {dt.transfersOwnership && (
        <span className="ps-delegate-type-zone-transfer-note">{t('delegateModal.transfersOwnership')}</span>
      )}
      {isSelected && (
        selectedRecipientLabel ? (
          <div className="ps-delegate-type-zone-recipient-chip">
            <span className="ps-delegate-type-zone-recipient-label">{selectedRecipientLabel}</span>
            <button type="button" aria-label={t('common.remove')} title={t('common.remove')} onClick={e => { e.stopPropagation(); onClearRecipient(); }} className="ps-delegate-type-zone-recipient-clear">✕</button>
          </div>
        ) : (
          <div className="ps-delegate-type-zone-drop-hint">
            {isOver ? t('delegateModal.dropToAssign') : t('delegateModal.dragOrClickHint')}
          </div>
        )
      )}
    </div>
  );
};

export const DelegateModal: React.FC<DelegateModalProps> = ({
  isOpen, onClose, registry, caseId, currentUserId = 'PATH-001', onDelegated, synopticInstances = [], presetTypeId, presetNonce
}) => {
  const { t, i18n } = useTranslation();
  const requirements = useFieldRequirements('report');
  const [refusal, setRefusal] = useState<string | null>(null);
  // Batch 655: some recipients delegated and some refused (a type that takes several people): the dialog stays open and lists both.
  const [partial, setPartial] = useState<{ delegated: string[]; refused: { name: string; error: string }[] } | null>(null);
  const [subspecialties, setSubspecialties] = useState<Subspecialty[]>([]);
  const [searchTerm,         setSearchTerm]         = useState('');
  // Batch 652: several recipients when the delegation type allows it (multiAssign, e.g. Teaching Case); otherwise one.
  const [selectedIds,        setSelectedIds]        = useState<string[]>([]);
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

  const contextPools: Pool[] = subspecialties
    .filter(s => s.active)
    .map(s => ({
      id: s.id,
      name: s.name,
      subspecialty: s.name,
      memberCount: s.userIds?.length ?? 0,
    }));

  // Real fix, per direct follow-up: "How is it possible to apply an
  // individual to the Move To Pool delegation Type?" Move to Pool's
  // own definition is "any available pathologist" (a workgroup
  // queue) — never one specific, named person — so the moment it's
  // selected, the directory should show pools, not individuals, and
  // vice versa the moment any other type is selected. Also clears any
  // already-selected recipient that no longer makes sense for the
  // newly-selected type (e.g. switching away from Move to Pool with a
  // pool already picked).
  useEffect(() => {
    const shouldShowPools = delegationType === 'POOL';
    setFilter(shouldShowPools ? 'pools' : 'individuals');
    const several = !!delegationTypes.find(d => d.id === delegationType)?.multiAssign;
    setSelectedIds(prev => limitRecipientIds(prev.filter(id => contextPools.some(p => p.id === id) === shouldShowPools), several));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delegationType]);

  // Batch 610 (#83): choose the preset delegation type once the list has loaded.
  const appliedPresetRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!isOpen || !presetTypeId || loading || delegationTypes.length === 0) return;
    if (appliedPresetRef.current === presetNonce) return;
    appliedPresetRef.current = presetNonce;
    if (presetAvailable(delegationTypes, presetTypeId)) { setDelegationType(presetTypeId); setRefusal(null); }
    else setRefusal('presetUnavailable');
  }, [isOpen, presetTypeId, presetNonce, loading, delegationTypes]);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm(''); setSelectedIds([]); setConfirming(false);
      setDelegationType(null); setNote(''); setSelectedInstanceId(null); setRefusal(null); setPartial(null);
      setLoading(true);
      Promise.all([
        userService.getAll(),
        delegationTypeService.getActive(),
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

  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = registry.onAction((actionId) => {
      if (actionId === 'CLOSE_MODAL' || actionId === 'NAVIGATE_BACK') onClose();
    });
    return () => unsubscribe();
  }, [isOpen, registry, onClose]);

  // Real fix, per direct follow-up: "How is it possible to apply an
  // individual to the Move To Pool delegation Type?" Confirmed
  // directly: the filter toggle below (Individual / Pool) was
  // completely independent of the selected delegation type — a user
  // could pick "Move to Pool" and still switch to "Individual" and
  // drag a named staff member onto it, even though that type's own
  // definition is "any available pathologist" (a workgroup queue),
  // not one specific, named person. The real fix lives at the filter
  // level below (auto-synced to the delegation type, with the
  // inapplicable toggle hidden entirely) rather than here — emptying
  // these arrays alone would just turn into a confusing, unexplained
  // "no results" state if the two ever got out of sync.
  const filteredStaff = staff.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.subspecialty.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPools = contextPools.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.subspecialty.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedId        = selectedIds[0] ?? null;
  const selectedPool      = contextPools.find(p => p.id === selectedId);
  const recipientName     = (id: string) => staff.find(s => s.id === id)?.name ?? contextPools.find(p => p.id === id)?.name ?? id;
  const selectedLabel     = selectedIds.length > 0 ? formatList(selectedIds.map(recipientName), i18n.language) : null;
  const selectedDelegType = delegationTypes.find(d => d.id === delegationType);
  const severalAllowed    = !!selectedDelegType?.multiAssign;

  const delegationForm = {
    delegationType, recipientId: selectedId,
    synopticChoiceNeeded: delegationType === 'SYNOPTIC_ASSIGN' && synopticInstances.length > 0,
    synopticInstanceId: selectedInstanceId, note, typeRequiresNote: !!selectedDelegType?.requiresNote,
  };
  const noteShown = delegationNoteShown(delegationForm, requirements);
  const canConfirm = !confirming && delegationMissing(delegationForm, requirements).length === 0;

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
    // Dropping on the type already chosen adds to the recipients when that type takes several.
    const typeTakesSeveral = !!delegationTypes.find(d => d.id === typeId)?.multiAssign;
    setSelectedIds(prev => (typeId === delegationType ? addRecipientId(prev, recipientId, typeTakesSeveral) : [recipientId]));
    setDelegationType(typeId);
    setSelectedInstanceId(null);
  };

  const draggingStaff = activeId?.startsWith('staff-') ? staff.find(s => `staff-${s.id}` === activeId) : null;
  const draggingPool  = activeId?.startsWith('pool-')  ? contextPools.find(p => `pool-${p.id}` === activeId) : null;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setConfirming(true);
    try {
      // Batch 353: the delegation service decides what the request does
      // (assign the chosen synoptic, or delegate the case to the user or
      // pool) and records it.
      if (caseId && selectedIds.length > 0) {
        // Batch 652: one delegation per recipient (each with the same permission check and audit entry).
        const res = await delegateToRecipients({
          caseId, requestorId: currentUserId, delegationType: delegationType!,
          recipients: selectedIds.map(id => (selectedPool !== undefined
            ? { kind: 'pool' as const, id, name: recipientName(id) }
            : { kind: 'user' as const, id, name: recipientName(id) })),
          synopticInstanceId: selectedInstanceId ?? undefined,
          note: note || undefined,
        }, { delegationService, delegationTypeService });
        // Nothing delegated: say why and stay open. Some delegated: they are done, so the page refreshes as for any delegation.
        if (!res.ok && res.delegated.length === 0) { setRefusal(res.error ?? null); return; }
        if (!res.ok) {
          setPartial({
            delegated: res.delegated.map(d => recipientName(d.toUserId ?? d.toPoolId ?? '')),
            refused: res.refused.map(r => ({ name: r.recipient.name ?? recipientName(r.recipient.id), error: r.error })),
          });
          return;
        }
      }
      onDelegated?.();
      onClose();
    } finally {
      setConfirming(false);
    }
  };

  // Voice/keyboard "confirm delegation": the same Confirm, with the same checks.
  const confirmRef = useRef(handleConfirm);
  confirmRef.current = handleConfirm;
  useEffect(() => {
    if (!isOpen) return;
    return registry.onAction((actionId) => { if (actionId === 'DELEGATE_CONFIRM') void confirmRef.current(); });
  }, [isOpen, registry]);

  if (!isOpen) return null;

  return (
    <div className="ps-overlay" onClick={onClose}>
      <div className="ps-research-modal fm-modal" onClick={e => e.stopPropagation()}>

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="ps-research-header">
          <div>
            <div className="fm-eyebrow">{t('delegateModal.eyebrow')}</div>
            <div className="fm-title-row">
              <span className="fm-del-persona-icon">👤</span>
              <h2 className="fm-title">{t('delegateModal.title')}</h2>
              {selectedDelegType && (
                <span className="fm-del-mode-badge">
                  {selectedDelegType.label}
                </span>
              )}
            </div>
          </div>
          <button className="ps-close-btn" onClick={onClose} aria-label={t('delegateModal.close')}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* ── Two-panel body — matches CaseTeamModal's drop-zone pattern ── */}
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
          <div className="ps-delegate-body">

            {/* LEFT — delegation types, each a real drop zone */}
            <div className="ps-delegate-left-panel">
              <div className="fm-section-label fm-section-label--mb8">{t('delegateModal.delegationTypeLabel')}</div>
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
                  onClearRecipient={() => setSelectedIds([])}
                />
              ))}

              {/* Synoptic picker — unchanged from before */}
              {delegationType === 'SYNOPTIC_ASSIGN' && synopticInstances.length > 0 && (
                <div className="ps-delegate-synoptic-section">
                  <div className="fm-section-label fm-section-label--mb6">{t('delegateModal.selectSynoptic')}</div>
                  {synopticInstances.map(inst => {
                    const isSel = selectedInstanceId === inst.instanceId;
                    return (
                      <div
                        key={inst.instanceId}
                        {...pressable(() => setSelectedInstanceId(isSel ? null : inst.instanceId))}
                        className={`ps-delegate-synoptic-item${isSel ? ' ps-delegate-synoptic-item--selected' : ''}`}
                      >
                        <div className="ps-delegate-synoptic-item-title">{inst.specimenDescription}</div>
                        <div className="ps-delegate-synoptic-item-subtitle">{inst.templateName}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Note field if required — unchanged from before */}
              {noteShown && (
                <div className="ps-delegate-note-section">
                  <div className="fm-section-label fm-section-label--sm">{t('delegateModal.noteRequired')}</div>
                  <input aria-label={t('delegateModal.noteRequired')}
                    type="text"
                    placeholder={t('delegateModal.notePlaceholder')}
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    className="fm-del-note-textarea ps-delegate-note-input"
                  />
                </div>
              )}
            </div>

            {/* RIGHT — recipient directory (filter + search + draggable cards) */}
            <div className="ps-delegate-right-panel">
              <div className="ps-delegate-right-header">
                <div className="fm-section-label fm-section-label--mb8">{t('delegateModal.delegateToLabel')}</div>
                <div className="ps-delegate-filter-row">
                  {delegationType !== 'POOL' && (
                  <button
                    onClick={() => { setFilter('individuals'); }}
                    className={`ps-delegate-filter-btn${filter === 'individuals' ? ' ps-delegate-filter-btn--active' : ''}`}
                  >
                    👤 {t('delegateModal.individualFilter')}
                  </button>
                  )}
                  {delegationType === 'POOL' && (
                  <button
                    onClick={() => { setFilter('pools'); }}
                    className={`ps-delegate-filter-btn${filter === 'pools' ? ' ps-delegate-filter-btn--active' : ''}`}
                  >
                    👥 {t('delegateModal.poolFilter')}
                  </button>
                  )}
                </div>
                <input
                  autoFocus
                  className="fm-search-input ps-delegate-search-input"
                  type="text"
                  placeholder={filter === 'individuals' ? t('delegateModal.searchIndividuals') : t('delegateModal.searchPools')}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="ps-delegate-list">
                {loading && <LoadingState variant="inline" className="ps-delegate-empty" label={t('delegateModal.loading')} />}

                {filter === 'individuals' && !loading && (
                  filteredStaff.length === 0
                    ? <div className="ps-delegate-empty">{t('delegateModal.noResultsFor', { query: searchTerm })}</div>
                    : filteredStaff.map(s => (
                        <RecipientCard
                          key={s.id}
                          id={`staff-${s.id}`}
                          primary={s.name}
                          secondary={t('delegateModal.staffSecondary', { role: s.role, subspecialty: s.subspecialty || '—' })}
                          isSelected={selectedIds.includes(s.id)}
                          onClick={() => setSelectedIds(prev => toggleRecipientId(prev, s.id, severalAllowed))}
                        />
                      ))
                )}

                {filter === 'pools' && !loading && (
                  filteredPools.length === 0
                    ? <div className="ps-delegate-empty">{t('delegateModal.noPoolsFound')}</div>
                    : filteredPools.map(pool => (
                        <RecipientCard
                          key={pool.id}
                          id={`pool-${pool.id}`}
                          primary={pool.name}
                          secondary={t('delegateModal.poolSecondary', { count: pool.memberCount })}
                          isSelected={selectedIds.includes(pool.id)}
                          onClick={() => setSelectedIds(prev => toggleRecipientId(prev, pool.id, false))}
                        />
                      ))
                )}
              </div>
            </div>
          </div>

          <DragOverlay>
            {(draggingStaff || draggingPool) && (
              <div className="ps-delegate-drag-overlay-card">
                <div className="ps-delegate-drag-overlay-row">
                  <div className="ps-delegate-drag-overlay-avatar">
                    {(draggingStaff?.name ?? draggingPool?.name ?? '').replace(/^Dr\.\s*/, '').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase()}
                  </div>
                  <div className="ps-delegate-drag-overlay-name">{draggingStaff?.name ?? draggingPool?.name}</div>
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {/* ── Footer — unchanged ─────────────────────────────── */}
        <div className="fm-footer">
          {refusal && <span className="ps-field-still-required" role="alert">{t(`delegateModal.refusals.${refusal}`)}</span>}
          {partial && (
            <div className="ps-delegate-result" role="status">
              <span className="ps-delegate-result__done">{t('delegateModal.partial.delegated', { names: partial.delegated.join(', ') })}</span>
              <span className="ps-delegate-result__heading">{t('delegateModal.partial.notDelegated')}</span>
              <ul className="ps-delegate-result__list">
                {partial.refused.map(r => <li key={r.name}>{t('delegateModal.partial.refusedLine', { name: r.name, reason: t(`delegateModal.refusals.${r.error}`) })}</li>)}
              </ul>
            </div>
          )}
          <span className={'fm-footer-status' + (delegationType || selectedLabel ? ' dirty' : '')}>
            {!delegationType
              ? t('delegateModal.chooseDelegationType')
              : !selectedId
                ? t('delegateModal.chooseRecipient', { typeLabel: selectedDelegType?.label })
                : t('delegateModal.delegatingTo', { recipient: selectedLabel, typeLabel: selectedDelegType?.label })
            }
          </span>
          <div className="fm-del-footer-row">
            {partial ? (
              <button className="fm-btn-save" onClick={() => { onDelegated?.(); onClose(); }}>{t('delegateModal.partial.done')}</button>
            ) : (<>
            <button className="fm-btn-cancel" onClick={onClose}>{t('delegateModal.cancel')}</button>
            <CapabilityButton
              capability="case:delegation:create"
              context={caseId ? { caseId } : undefined}
              className="fm-btn-save"
              disabled={!canConfirm}
              onClick={() => { void handleConfirm(); }}
            >
              {confirming ? t('delegateModal.delegating') : t('delegateModal.confirmDelegation')}
            </CapabilityButton>
            </>)}
          </div>
        </div>

      </div>
    </div>
  );
};

export default DelegateModal;
