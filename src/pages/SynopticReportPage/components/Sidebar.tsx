// src/pages/SynopticReportPage/components/Sidebar.tsx
import React, { useState, useEffect } from 'react';
import ConfirmModal from '@/components/UI/ConfirmModal';
import type { Case, ProtocolChange } from '@/types/case/Case';
import type { SpecimenLisStatus } from '@/types/case/Specimen';
import type { CaseComment } from '@/types/case/CaseComment';

interface SidebarProps {
  caseData: Case | null;
  activeTab: string;
  onChangeTab: (tab: string) => void;
  activeSpecimenId?: string;
  onSelectSpecimen?: (specimenId: string) => void;
  onAddSynoptic?: () => void;
  onEditSpecimen?: (specimenId: string) => void;
  onAddSpecimen?: () => void;
  onAddBlock?: () => void;
  onAddStain?: () => void;
  onOpenCaseComment?: () => void;
  onOpenSpecimenComment?: (specimenId: string) => void;
  hasCaseComment?: boolean;
  specimenComments?: Record<string, CaseComment[]>;
  activeReportInstanceId?: string;
  onSelectReport?: (instanceId: string, specimenId: string, reportType: 'grossing' | 'synoptic') => void;
  onDeleteReport?: (instanceId: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  /**
   * Stage 2 background-check results awaiting pathologist review (status
   * 'pending' — see ProtocolChange.reviewStatus in Case.ts). Drives the
   * small persistent badge shown next to an affected specimen row,
   * mirroring RightSynopticPanel.tsx's AI field-suggestion badge
   * language (confidence-colored pill) but at the whole-synoptic level
   * rather than per-field. Defaults to caseData.pendingProtocolChanges
   * if not explicitly passed, but accepted as a prop so the page can
   * filter/override if needed.
   */
  pendingProtocolChanges?: ProtocolChange[];
  /**
   * Opens ProtocolChangeModal for on-demand review, the same modal Stage
   * 1/2's blocking checks already use — just a voluntary entry point
   * here (clicking the badge) instead of a forced one. Page-controlled
   * (Sidebar doesn't own modal state for this, same pattern as every
   * other onX callback here), and intentionally not specimen-filtered:
   * mirrors ProtocolChangeModal's existing design, which already renders
   * multiple specimens' changes together in one review session.
   */
  onReviewProtocolChanges?: () => void;
}

type DotStatus = 'complete' | 'partial' | 'empty';

const StatusDot: React.FC<{ status: DotStatus }> = ({ status }) => {
  const color = status === 'complete' ? '#10b981' : status === 'partial' ? '#f59e0b' : '#334155';
  return (
    <span className="ps-status-dot-wrap">
      <span className="ps-status-dot" style={{ background: color }} />
    </span>
  );
};

// ── LIS status badge ─────────────────────────────────────────────────────────
const LIS_BADGE: Record<Exclude<SpecimenLisStatus, 'lis_owned' | 'local_only'>, { label: string; className: string }> = {
  pending_sync:  { label: 'Not in LIS',    className: 'ps-sp-lis-badge ps-sp-lis-badge--pending'  },
  sync_sent:     { label: 'Awaiting LIS',  className: 'ps-sp-lis-badge ps-sp-lis-badge--sent'     },
  sync_rejected: { label: 'LIS Rejected',  className: 'ps-sp-lis-badge ps-sp-lis-badge--rejected' },
};

const LisStatusBadge: React.FC<{ status?: SpecimenLisStatus }> = ({ status }) => {
  if (!status || status === 'lis_owned' || status === 'local_only') return null;
  const badge = LIS_BADGE[status as keyof typeof LIS_BADGE];
  if (!badge) return null;
  return <span className={badge.className}>{badge.label}</span>;
};

const Sidebar: React.FC<SidebarProps> = ({
  caseData,
  activeSpecimenId,
  onSelectSpecimen,
  onAddSynoptic,
  onEditSpecimen,
  onAddSpecimen,
  onAddBlock,
  onAddStain,
  onOpenCaseComment,
  onOpenSpecimenComment,
  hasCaseComment = false,
  specimenComments = {},
  activeReportInstanceId,
  onSelectReport,
  onDeleteReport,
  collapsed = false,
  onToggleCollapse,
  pendingProtocolChanges,
  onReviewProtocolChanges,
}) => {
  const specimens = caseData?.specimens ?? [];
  // Falls back to reading straight off caseData if the page doesn't pass
  // this explicitly — same default-to-source-data pattern as
  // caseData.synopticReports/grossingReports being read directly below,
  // rather than requiring every caller to thread it through manually.
  const pendingChanges = pendingProtocolChanges ?? caseData?.pendingProtocolChanges ?? [];
  const hasPendingChangeForSpecimen = (specimenId: string): boolean =>
    pendingChanges.some(c => c.specimenId === specimenId && (c.reviewStatus ?? 'pending') === 'pending');
  const [confirmDeleteId,   setConfirmDeleteId]   = useState<string | null>(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState<string>('');
  const [expandedIds,       setExpandedIds]       = useState<Set<string>>(new Set());

  useEffect(() => {
    if (specimens.length > 0) setExpandedIds(new Set(specimens.map(s => s.id)));
  }, [caseData?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className={`ps-syn-sidebar ${collapsed ? 'collapsed' : 'expanded'}`}>

      {/* ── COLLAPSED: icon rail ─────────────────────────────── */}
      {collapsed && (
        <div className="ps-syn-rail">
          <button className="ps-syn-rail-toggle" onClick={onToggleCollapse} title="Expand sidebar">
            ›
          </button>

          {specimens.map(sp => {
            const grossingInstances = (caseData?.grossingReports ?? []).filter(r => r.specimenId === sp.id);
            const instances  = (caseData?.synopticReports ?? []).filter(r => r.specimenId === sp.id);
            const allInstances = [...grossingInstances, ...instances];
            const hasAnswers = allInstances.some(r =>
              Object.values(r.answers ?? {}).some(v => v !== '' && !(Array.isArray(v) && !v.length))
            );
            const dotColor = allInstances.length === 0 ? '#334155' : hasAnswers ? '#f59e0b' : '#334155';
            const isActive = activeSpecimenId === sp.id;
            const hasPendingChange = hasPendingChangeForSpecimen(sp.id);
            return (
              <button
                key={sp.id}
                className={`ps-syn-rail-btn${isActive ? ' active' : ''}`}
                onClick={() => {
                  onSelectSpecimen?.(sp.id);
                  const first = allInstances[0];
                  if (first) {
                    const isGrossing = grossingInstances.some(g => g.instanceId === first.instanceId);
                    onSelectReport?.(first.instanceId, sp.id, isGrossing ? 'grossing' : 'synoptic');
                  }
                }}
                title={hasPendingChange
                  ? `${sp.label}: ${sp.description} — AI re-evaluation suggests reviewing this specimen's synoptic assignment`
                  : `${sp.label}: ${sp.description}`}
                style={{ position: 'relative' }}
              >
                <span className="ps-syn-rail-letter">{sp.label}</span>
                <span className="ps-status-dot" style={{ background: dotColor, width: 6, height: 6 }} />
                {hasPendingChange && (
                  <span
                    onClick={e => { e.stopPropagation(); onReviewProtocolChanges?.(); }}
                    style={{
                      position: 'absolute', top: -3, right: -3,
                      width: 9, height: 9, borderRadius: '50%',
                      background: '#fbbf24', border: '1.5px solid #0d1829',
                      cursor: 'pointer',
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── EXPANDED: full content ────────────────────────────── */}
      {!collapsed && (
        <div className="ps-syn-sidebar-content">

          <button className="ps-syn-sidebar-toggle" onClick={onToggleCollapse} title="Collapse sidebar">
            ‹
          </button>

          {/* Case comment */}
          <div
            className={`ps-syn-comment-btn${hasCaseComment ? ' has-comment' : ''}`}
            onClick={() => onOpenCaseComment?.()}
            role="button" tabIndex={0}
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onOpenCaseComment?.()}
          >
            <span style={{ fontSize: 13, lineHeight: 1 }}>💬</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="ps-syn-comment-label">
                {hasCaseComment ? 'Edit Case Comment' : '+ Add Case Comment'}
              </div>
              {hasCaseComment && <div className="ps-syn-comment-sublabel">Applies to entire case</div>}
            </div>
            {hasCaseComment && <span className="ps-syn-comment-check">✓</span>}
          </div>

          {/* Section label */}
          <div className="ps-syn-section-label">Specimens &amp; Reports</div>

          {/* Specimen rows */}
          {specimens.map(specimen => {
            const isExpanded = expandedIds.has(specimen.id);
            const isActive   = activeSpecimenId === specimen.id;

            const grossingInstances = (caseData?.grossingReports ?? []).filter(r => r.specimenId === specimen.id)
              .map(r => ({ ...r, reportType: 'grossing' as const }));
            const instances = (caseData?.synopticReports ?? []).filter(r => r.specimenId === specimen.id)
              .map(r => ({ ...r, reportType: 'synoptic' as const }));
            const legacyId  = !instances.length && caseData?.synopticTemplateId;
            const legacyRows = legacyId ? [{
              instanceId:   '__legacy__',
              templateId:   caseData!.synopticTemplateId!,
              templateName: (caseData!.synopticTemplateId!).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
              answers:      caseData?.synopticAnswers ?? {},
              status:       'draft' as const,
              specimenId:   specimen.id,
              createdAt: '', updatedAt: '',
              reportType:   'synoptic' as const,
            }] : [];
            // Grossing rows first — matches real workflow order (gross,
            // then microscopic/synoptic), and lets the sidebar visually
            // separate the two kinds of report the same way accession →
            // grossing → sign-out treats them as sequential stages.
            const allRows = [...grossingInstances, ...(instances.length > 0 ? instances : legacyRows)];

            const specimenHasAnswers = allRows.some(r =>
              Object.values(r.answers ?? {}).some(v => v !== '' && !(Array.isArray(v) && !v.length))
            );
            const specimenDot: DotStatus = allRows.length === 0 ? 'empty' : specimenHasAnswers ? 'partial' : 'empty';

            return (
              <div key={specimen.id}>
                <div
                  className={`ps-syn-specimen-row${isActive ? ' active' : ''}`}
                  onClick={() => {
                    if (allRows.length === 0) { onSelectSpecimen?.(specimen.id); onAddSynoptic?.(); }
                    else { toggleExpand(specimen.id); onSelectSpecimen?.(specimen.id); }
                  }}
                  title={`${specimen.label}: ${specimen.description}`}
                  role="button" tabIndex={0}
                  onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && toggleExpand(specimen.id)}
                >
                  <span className={`ps-syn-expand-arrow${isExpanded ? ' open' : ''}${allRows.length === 0 ? ' hidden' : ''}`}>
                    ▶
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="ps-syn-specimen-label">
                      <span className="ps-syn-specimen-label-letter">{specimen.label}:</span>{' '}
                      {specimen.description}
                    </div>
                    <LisStatusBadge status={specimen.lisStatus} />
                  </div>

                  <span
                    className="ps-specimen-comment-btn"
                    onClick={e => { e.stopPropagation(); onOpenSpecimenComment?.(specimen.id); }}
                    title={(specimenComments[specimen.id]?.length ?? 0) > 0 ? 'View / add comment' : 'Add comment'}
                    style={{
                      opacity: (specimenComments[specimen.id]?.length ?? 0) > 0 ? 1 : 0.35,
                      color:   (specimenComments[specimen.id]?.length ?? 0) > 0 ? '#38bdf8' : '#94a3b8',
                    }}
                  >💬</span>

                  <span
                    className="ps-specimen-edit-btn"
                    onClick={e => { e.stopPropagation(); onEditSpecimen?.(specimen.id); }}
                    title="Edit specimen details"
                  >✏️</span>

                  {hasPendingChangeForSpecimen(specimen.id) && (
                    <span
                      onClick={e => { e.stopPropagation(); onReviewProtocolChanges?.(); }}
                      title="AI re-evaluation suggests this specimen's synoptic assignment may need review — click to see proposed changes."
                      style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 8,
                        background: 'rgba(245,158,11,0.15)',
                        border: '1px solid rgba(245,158,11,0.4)',
                        color: '#fbbf24', cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ fontSize: 11 }}>⚠</span> Review
                    </span>
                  )}

                  <StatusDot status={specimenDot} />
                </div>

                {isExpanded && (
                  <div className="ps-syn-instance-list">
                    {allRows.map(inst => {
                      const isActiveInst = activeReportInstanceId === inst.instanceId ||
                        (!activeReportInstanceId && inst.instanceId === '__legacy__');
                      const filledCount = Object.values(inst.answers ?? {}).filter(v =>
                        v !== '' && !(Array.isArray(v) && !v.length)
                      ).length;
                      const instDot: DotStatus = filledCount > 0 ? 'partial' : 'empty';

                      return (
                        <div
                          key={inst.instanceId}
                          className={`ps-syn-instance-row${isActiveInst ? ' active' : ''}`}
                          onClick={() => onSelectReport?.(inst.instanceId, specimen.id, inst.reportType)}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="ps-syn-instance-name">
                              <span style={{
                                fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                                color: inst.reportType === 'grossing' ? '#fbbf24' : '#38bdf8',
                                marginRight: 6,
                              }}>
                                {inst.reportType === 'grossing' ? 'Gross' : 'Synoptic'}
                              </span>
                              {inst.templateName}
                            </div>
                            <div className="ps-syn-instance-meta">
                              {filledCount} field{filledCount !== 1 ? 's' : ''} answered
                            </div>
                          </div>
                          <StatusDot status={instDot} />
                          {inst.instanceId !== '__legacy__' && onDeleteReport && (
                            <button
                              type="button"
                              className="ps-btn-icon-danger"
                              onClick={e => {
                                e.stopPropagation();
                                setConfirmDeleteId(inst.instanceId);
                                setConfirmDeleteName(inst.templateName);
                              }}
                              title="Remove this synoptic report"
                            >🗑</button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          <button className="ps-syn-add-btn" onClick={() => onAddSynoptic?.()}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add Synoptic Report
          </button>

        </div>
      )}

      <ConfirmModal
        show={!!confirmDeleteId}
        title="Remove Synoptic Report"
        message={`Remove "${confirmDeleteName}"? This cannot be undone until you save the case.`}
        confirmLabel="Remove"
        cancelLabel="Keep"
        onConfirm={() => { if (confirmDeleteId) onDeleteReport?.(confirmDeleteId); setConfirmDeleteId(null); }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
};

export default Sidebar;
