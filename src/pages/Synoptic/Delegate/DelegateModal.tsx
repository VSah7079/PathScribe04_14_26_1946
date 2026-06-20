import React, { useState, useEffect } from 'react';
import '../../../pathscribe.css';
import { IActionRegistryService } from '../../../services/actionRegistry/IActionRegistryService';
import { userService } from '../../../services';
import type { StaffUser } from '../../../services';
import { useSubspecialties } from '../../../contexts/useSubspecialties';
import { mockDelegationTypeService } from '../../../services/delegationTypes/mockDelegationTypeService';
import { loadDelegationTypes } from '../../../constants/delegationTypes';
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

export const DelegateModal: React.FC<DelegateModalProps> = ({
  isOpen, onClose, registry, caseId, currentUserId = 'PATH-001', onDelegated, synopticInstances = []
}) => {
  const { subspecialties } = useSubspecialties();
  const [searchTerm,         setSearchTerm]         = useState('');
  const [selectedId,         setSelectedId]         = useState<string | null>(null);
  const [tab,                setTab]                = useState<'individuals' | 'pools'>('individuals');
  const [confirming,         setConfirming]         = useState(false);
  const [delegationType,     setDelegationType]     = useState<string | null>(null);
  const [note,               setNote]               = useState('');
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [delegationTypes,    setDelegationTypes]    = useState(() => loadDelegationTypes().filter((d: any) => d.active));
  const [staff,              setStaff]              = useState<{id:string;name:string;role:string;subspecialty:string}[]>([]);
  const [loading,            setLoading]            = useState(false);

  const contextPools: Pool[] = subspecialties
    .filter(s => s.active)
    .map(s => ({
      id: s.id,
      name: s.name,
      subspecialty: s.name,
      memberCount: s.userIds?.length ?? 0,
    }));

  useEffect(() => {
    if (isOpen) {
      setSearchTerm(''); setSelectedId(null); setConfirming(false);
      setDelegationType(null); setNote(''); setSelectedInstanceId(null);
      setLoading(true);
      Promise.all([
        userService.getAll(),
        mockDelegationTypeService.getActive(),
      ]).then(([usersResult, typesResult]) => {
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
                subspecialty: u.department,

              };
            });
          setStaff(delegates);
        }
        if (typesResult.ok) setDelegationTypes(typesResult.data);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [isOpen]);

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

  const handleConfirm = async () => {
    if (!canConfirm) return;
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
          await delegateCase(
            caseId, currentUserId, delegationType!,
            isPool ? undefined   : (selectedId ?? undefined),
            isPool ? (selectedId ?? undefined) : undefined,
            isPool ? selectedLabel : undefined,
            note || undefined,
          );
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
    <div className="ps-overlay" onClick={onClose}>
      <div className="ps-research-modal fm-modal" onClick={e => e.stopPropagation()}>

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
                </span>
              )}
            </div>
          </div>
          {/* X — matches all other modals */}
          <button className="ps-close-btn" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* ── Three-panel body ───────────────────────────────── */}
        <div className="fm-body">

          {/* Panel 1 — Delegation Type */}
          <div className="fm-left fm-del-left-panel">
            <div className="fm-section-label fm-del-slabel-padded">Delegation Type</div>
            <div className="fm-del-type-list">
              {delegationTypes.map(dt => {
                const isSelected = delegationType === dt.id;
                return (
                  <button
                    key={dt.id}
                    onClick={() => {
                      setDelegationType(isSelected ? null : dt.id);
                      if (!isSelected) setSelectedInstanceId(null);
                    }}
                    className={'fm-flag-card' + (isSelected ? ' applied' : '')}
                    className="fm-del-type-btn"
                  >
                    <div className="fm-del-type-btn-row">
                      <span
                        className="fm-code-chip"
                        style={{ fontSize: 9, letterSpacing: '0.03em', background: isSelected ? dt.color + '22' : undefined, color: isSelected ? dt.color : undefined, flexShrink: 0 }}
                      >
                        {dt.id.replace('_', ' ')}
                      </span>
                      <span className="fm-flag-name fm-del-flex1">{dt.label}</span>
                      {isSelected && <span className="fm-del-type-check">✓</span>}
                    </div>
                    <div className="fm-flag-desc fm-del-desc-text">
                      {dt.description}
                    </div>
                    {dt.transfersOwnership && (
                      <span className="fm-del-ownership-warn">transfers ownership</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Synoptic picker */}
            {delegationType === 'SYNOPTIC_ASSIGN' && synopticInstances.length > 0 && (
              <div className="fm-del-synoptic-section">
                <div className="fm-section-label fm-del-slabel-mb6">Select Synoptic</div>
                {synopticInstances.map(inst => {
                  const isSel = selectedInstanceId === inst.instanceId;
                  return (
                    <div
                      key={inst.instanceId}
                      className={'fm-flag-card' + (isSel ? ' applied' : '')}
                      onClick={() => setSelectedInstanceId(isSel ? null : inst.instanceId)}
                      className="fm-del-synoptic-row"
                    >
                      <span className="fm-flag-name">{inst.specimenDescription}</span>
                      <span className="fm-flag-desc">{inst.templateName}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Panel 2 — Delegate To */}
          <div className="fm-middle">
            <div className="fm-section-label fm-del-slabel-padded">Delegate To</div>

            <button
              className={'fm-target-row' + (tab === 'individuals' ? ' active' : '')}
              onClick={() => { setTab('individuals'); setSelectedId(null); }}
            >
              <span className="fm-del-tab-icon">👤</span>
              <span className="fm-del-tab-label">Individual</span>
            </button>

            <button
              className={'fm-target-row' + (tab === 'pools' ? ' active' : '')}
              onClick={() => { setTab('pools'); setSelectedId(null); }}
            >
              <span className="fm-del-tab-icon">👥</span>
              <span className="fm-del-tab-label">Pool / Queue</span>
            </button>

            <div className="fm-divider" />

            {/* Selected summary */}
            {selectedLabel && (
              <div className="fm-del-selected-box">
                <div className="fm-section-label fm-del-slabel-mb6">Selected</div>
                <div className="fm-del-selected-name">{selectedLabel}</div>
                {selectedStaff && (
                  <div className="fm-del-selected-role">{selectedStaff.role}</div>
                )}
              </div>
            )}

            {/* Note field if required */}
            {selectedDelegType?.requiresNote && (
              <div className="fm-del-note-section">
                <div className="fm-section-label fm-del-slabel-mb4">Note (required)</div>
                <input
                  type="text"
                  placeholder="Add a note…"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="fm-del-note-textarea"
                />
              </div>
            )}
          </div>

          {/* Panel 3 — Search & Results */}
          <div className="fm-right">

            <div className="fm-del-search-wrap">
              <div className="fm-del-search-rel">
                <span className="fm-del-search-icon">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
                    <path d="M10 10l4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                </span>
                <input
                  autoFocus
                  className="fm-search-input"
                  type="text"
                  placeholder={tab === 'individuals' ? 'Search by name or role…' : 'Search pools…'}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button className="fm-search-clear" onClick={() => setSearchTerm('')}>✕</button>
                )}
              </div>
            </div>

            <div className="fm-del-col-headers fm-del-col-headers--3col">
              <span className="fm-col-label">ROLE</span>
              <span className="fm-col-label">{tab === 'individuals' ? 'NAME' : 'NAME · MEMBERS'}</span>
              <span className="fm-col-label">DEPARTMENT</span>
              <span />
            </div>

            <div className="fm-flag-list fm-del-flag-list">
              {loading && (
                <div className="fm-empty"><div className="fm-empty-hint">Loading…</div></div>
              )}

              {tab === 'individuals' && !loading && (
                filteredStaff.length === 0
                  ? <div className="fm-empty"><div className="fm-empty-heading">No results for "{searchTerm}"</div><div className="fm-empty-hint">Try a different name or role</div></div>
                  : filteredStaff.map(s => {
                      const isSelected = selectedId === s.id;
                      return (
                        <div
                          key={s.id}
                          className={'fm-flag-card' + (isSelected ? ' applied' : '')}
                          onClick={() => setSelectedId(isSelected ? null : s.id)}
                          className="fm-del-row-grid"
                        >
                          <span className="fm-code-chip fm-del-role-chip">
                            {s.role}
                          </span>
                          <div className="fm-flag-info">
                            <div className="fm-flag-name-row">
                              <span className="fm-flag-name">{s.name}</span>
                              {(s as any).credentials && <span className="fm-del-cred">{(s as any).credentials}</span>}
                            </div>
                          </div>
                          <span className="fm-del-dept">
                            {(s as any).department ?? '—'}
                          </span>
                          <span className={`fm-del-check-col${isSelected ? ' fm-del-check-col--selected' : ' fm-del-check-col--default'}`}>
                            {isSelected
                              ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              : <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 2.5l4 4.5-4 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            }
                          </span>
                        </div>
                      );
                    })
              )}

              {tab === 'pools' && !loading && (
                filteredPools.length === 0
                  ? <div className="fm-empty"><div className="fm-empty-heading">No pools found</div><div className="fm-empty-hint">Try a different search term</div></div>
                  : filteredPools.map(pool => {
                      const isSelected = selectedId === pool.id;
                      return (
                        <div
                          key={pool.id}
                          className={'fm-flag-card' + (isSelected ? ' applied' : '')}
                          onClick={() => setSelectedId(isSelected ? null : pool.id)}
                          className="fm-del-row-grid"
                        >
                          <span className="fm-code-chip fm-del-pool-chip">POOL</span>
                          <div className="fm-flag-info">
                            <div className="fm-flag-name-row">
                              <span className="fm-flag-name">{pool.name}</span>
                            </div>
                            <div className="fm-flag-desc">{pool.memberCount} members available</div>
                          </div>
                          <span className={`fm-del-check-col${isSelected ? ' fm-del-check-col--selected' : ' fm-del-check-col--default'}`}>
                            {isSelected
                              ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              : <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 2.5l4 4.5-4 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            }
                          </span>
                        </div>
                      );
                    })
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────── */}
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
          </div>
        </div>

      </div>
    </div>
  );
};

export default DelegateModal;
