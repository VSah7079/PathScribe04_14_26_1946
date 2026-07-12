// src/pages/SynopticReportPage/components/HeaderBar.tsx
// Rich case header — white bar with accession, patient info, progress steps.

import React, { useState, useEffect } from 'react';
import type { Case } from '@/types/case/Case';
import { getOrchestratorMode } from '@/components/Config/NarrativeTemplates';
import { getOrganisationByHospitalId } from '@/services/organisation/organisationService';
import { lisSyncService } from '@/services';
import type { LisSyncState } from '@/services/lisSync/mockLisSyncService';
import '@/pathscribe.css';

// ── AI Synthesis Status — Gatekeeper Badge model. Matches the type defined
// in SynopticReportPage.tsx (duplicated here rather than imported to avoid
// a cross-directory type-only import cycle; keep these two in sync if the
// shape changes).
export interface AiSynthesisStatus {
  state: 'none' | 'draft-ready' | 'review-required';
  overallConfidence?:      number;
  flaggedFieldId?:          string;
  flaggedFieldConfidence?:  number;
}

interface HeaderBarProps {
  caseData:      Case | null;
  onSignOut:     () => void;
  onNavigate:    (path: string) => void;
  /**
   * Gatekeeper Badge status — replaces the old flat `aiConfidence` percentage.
   * SHORT-TERM model (per clinical review): conservative binary state — ANY
   * AI-suggested field below the configured confidence threshold trips
   * 'review-required', regardless of which field it is. A true tiered
   * "floor" model (gating only on diagnosis/staging-critical fields) is the
   * intended long-term design, deferred until tier classification can be
   * sourced from the real CAP eCC template schema rather than guessed.
   */
  aiSynthesisStatus?: AiSynthesisStatus;
  /** "Unpacking" — clicking the badge in 'review-required' state should
   *  jump the pathologist straight to the flagged field, not just display
   *  a number. No-op if omitted or if state isn't 'review-required'. */
  onAiStatusClick?: () => void;
  /** Compact single-strip mode — used in Report Draft to maximise editor space */
  compact?:      boolean;
  /**
   * Priority editing — added June 2026 to close a real gap: priority was
   * previously set once at Accession and then had no edit mechanism
   * anywhere else in the app, including here (this badge only ever
   * displayed it read-only). Omit to keep the badge read-only (e.g. on a
   * finalized/closed case, where changing urgency no longer means
   * anything).
   */
  onChangePriority?: (priority: string) => void;
  priorityLevels?: { id: string; label: string; colorHint: string }[];
  /** Deficiency history indicator — see this section's own render comment. */
  deficiencyCount?: number;
  onOpenDeficiencyHistory?: () => void;
  /** Highlights the matching block chip and shows its status — the
   *  block a Grossing voice command (next/previous/mark grossed) would
   *  currently act on. Undefined outside grossing-relevant contexts. */
  focusedBlockId?: string;
  onOpenBlockEditor?: () => void;
  /** For the CoPilot "Data as of / Check now" indicator — lets HeaderBar
   *  apply any flags a simulated LIS check returns onto the real case.
   *  Omit to leave the indicator read-only (no case mutation possible). */
  onCaseUpdate?: (updatedCase: Case) => void;
}

type StepStatus = 'completed' | 'current' | 'pending' | 'alert';

interface ProgressStep {
  id:     number;
  label:  string;
  status: StepStatus;
}

// ── Status meta ───────────────────────────────────────────────────────────────
const CASE_STATE_META: Record<string, { bg: string; border: string; color: string; dot: string }> = {
  'draft':          { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', dot: '#3b82f6' },
  'in-progress':    { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', dot: '#3b82f6' },
  'finalized':      { bg: '#f0fdf4', border: '#86efac', color: '#15803d', dot: '#22c55e' },
  'pending-review': { bg: '#fef3c7', border: '#fde047', color: '#92400e', dot: '#f59e0b' },
};

// ── Step circle class helper ──────────────────────────────────────────────────
function stepClass(status: StepStatus): string {
  return `ps-hb-step-circle ps-hb-step-circle--${status}`;
}

const HeaderBar: React.FC<HeaderBarProps> = ({ caseData, onSignOut: _onSignOut, onNavigate, aiSynthesisStatus, onAiStatusClick, compact = false, onChangePriority, priorityLevels, deficiencyCount, onOpenDeficiencyHistory, focusedBlockId, onOpenBlockEditor, onCaseUpdate }) => {
  const isOrchestration = getOrchestratorMode();

  // CoPilot-only — Orchestration mode is the system of record; there's no
  // separate LIS for anything here to be "as of" relative to.
  const isCopilotCase = caseData?.reportingMode === 'copilot';
  const [syncState, setSyncState] = useState<LisSyncState | null>(null);
  const [checkingNow, setCheckingNow] = useState(false);

  useEffect(() => {
    if (!isCopilotCase || !caseData?.id) { setSyncState(null); return; }
    let cancelled = false;
    lisSyncService.getSyncState(caseData.id).then(res => {
      if (!cancelled && res.ok) setSyncState(res.data);
    });
    return () => { cancelled = true; };
  }, [isCopilotCase, caseData?.id]);

  const handleCheckNow = async () => {
    if (!caseData?.id || checkingNow) return;
    setCheckingNow(true);
    try {
      const res = await lisSyncService.checkNow(caseData.id);
      if (res.ok) {
        setSyncState({ lastCheckedAt: res.data.lastCheckedAt });
        // Real flag-adding mechanism (caseFlagsApi / useSynopticFlags) is
        // the actual insertion point here — deliberately not duplicated
        // in this mock service, kept as the caller's job per its own
        // header comment. onCaseUpdate applies whatever came back onto
        // the case the same way any other flag addition would.
        if (res.data.newFlags.length > 0 && onCaseUpdate && caseData) {
          const updated: Case = {
            ...caseData,
            specimenFlags: [
              ...((caseData as any).specimenFlags ?? []),
              ...res.data.newFlags,
            ],
          } as any;
          onCaseUpdate(updated);
        }
      }
    } finally {
      setCheckingNow(false);
    }
  };

  const formatSyncLabel = (iso: string): string => {
    const then = new Date(iso);
    const mins = Math.round((Date.now() - then.getTime()) / 60000);
    const rel = mins < 1 ? 'just now' : mins < 60 ? `${mins} min ago` : `${Math.round(mins / 60)} hr${Math.round(mins / 60) === 1 ? '' : 's'} ago`;
    const clock = then.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `Data as of ${clock} · ${rel}`;
  };

  const accession = caseData?.accession?.fullAccession ?? caseData?.accession?.accessionNumber ?? '—';
  const patient   = caseData?.patient ? `${caseData.patient.lastName}, ${caseData.patient.firstName}` : '—';
  const dob       = caseData?.patient?.dateOfBirth
    ? new Date(caseData.patient.dateOfBirth).toLocaleDateString() : '—';
  const mrn       = caseData?.patient?.mrn ?? '—';
  const sex       = caseData?.patient?.sex ?? '—';
  const status    = caseData?.status ?? 'draft';
  const hospital    = getOrganisationByHospitalId(caseData?.originHospitalId ?? '');
  const clientName  = caseData?.order?.clientName ?? null;
  const meta        = CASE_STATE_META[status] ?? CASE_STATE_META['draft'];

  // ── Mode-aware final step label ───────────────────────────────────────────
  const finalStepLabel = isOrchestration ? 'Sign Out' : 'Finalise';

  const progressSteps: ProgressStep[] = [
    { id: 1, label: 'Grossing',       status: 'completed' },
    { id: 2, label: 'Processing',     status: 'completed' },
    { id: 3, label: 'Synoptic',       status: 'current'   },
    { id: 4, label: finalStepLabel,   status: 'pending'   },
  ];

  // ── Compact mode — single 36px strip for Report Draft ──────────────────
  if (compact) {
    const orchStage = (caseData as any)?.orchStage ?? '';
    const stageMap: Record<string, number> = {
      received: 0, grossing: 1, gross_complete: 1,
      micro_pending: 2, micro_complete: 2,
      draft_generated: 3, signed_out: 4,
    };
    const currentStageIdx = stageMap[orchStage] ?? 0;
    const stages = ['Grossing', 'Processing', 'Synoptic', finalStepLabel];

    return (
      <div className="ps-hb-compact">
        {/* Left: accession + patient + priority */}
        <div className="ps-hb-compact-left">
          <span className="ps-hb-compact-acc">{accession}</span>
          <span className="ps-hb-compact-sep">·</span>
          <span className="ps-hb-compact-patient">{patient}</span>
          {caseData?.patient?.dateOfBirth && (
            <>
              <span className="ps-hb-compact-sep">·</span>
              <span className="ps-hb-compact-meta">
                DOB {dob} · {sex}
              </span>
            </>
          )}
          {caseData?.patient?.mrn && (
            <>
              <span className="ps-hb-compact-sep">·</span>
              <span className="ps-hb-compact-meta">MRN {mrn}</span>
            </>
          )}
          {(caseData?.order as any)?.priority && (
            onChangePriority && priorityLevels?.length ? (
              <select
                className={`ps-hb-compact-priority ps-hb-compact-priority--editable${(caseData?.order as any)?.priority === 'STAT' ? ' ps-hb-compact-priority--stat' : (caseData?.order as any)?.priority === 'Rush' ? ' ps-hb-compact-priority--rush' : ' ps-hb-compact-priority--routine'}`}
                value={(caseData?.order as any)?.priority}
                onChange={e => onChangePriority(e.target.value)}
                title="Change case priority"
              >
                {priorityLevels.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            ) : (
              <span className={`ps-hb-compact-priority${(caseData?.order as any)?.priority === 'STAT' ? ' ps-hb-compact-priority--stat' : (caseData?.order as any)?.priority === 'Rush' ? ' ps-hb-compact-priority--rush' : ' ps-hb-compact-priority--routine'}`}>
                {(caseData?.order as any)?.priority}
              </span>
            )
          )}
        </div>

        {/* Centre: workflow stage dots */}
        <div className="ps-hb-compact-stages">
          {stages.map((label, i) => (
            <React.Fragment key={label}>
              <div className="ps-hb-compact-stage">
                <span className={`ps-hb-compact-dot${i < currentStageIdx ? ' done' : i === currentStageIdx ? ' active' : ''}`}>
                  {i < currentStageIdx ? '✓' : i + 1}
                </span>
                <span className={`ps-hb-compact-stage-lbl${i === currentStageIdx ? ' active' : ''}`}>{label}</span>
              </div>
              {i < stages.length - 1 && (
                <div className={`ps-hb-compact-connector${i < currentStageIdx ? ' done' : ''}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Right: AI synthesis status + breadcrumb nav */}
        <div className="ps-hb-compact-right">
          {aiSynthesisStatus && aiSynthesisStatus.state !== 'none' && (
            aiSynthesisStatus.state === 'review-required' ? (
              <button
                className="ps-hb-compact-conf ps-hb-compact-conf--warn"
                onClick={onAiStatusClick}
                style={{ background: 'none', border: 'none', font: 'inherit', cursor: 'pointer', padding: 0 }}
                title={
                  aiSynthesisStatus.flaggedFieldConfidence !== undefined
                    ? `A field is at ${aiSynthesisStatus.flaggedFieldConfidence}% confidence — click to review`
                    : 'A field is below the confidence threshold — click to review'
                }
              >
                <span className="ps-hb-compact-conf-pct">⚠</span>
                <span className="ps-hb-compact-conf-label">Review Pending</span>
              </button>
            ) : (
              <span className="ps-hb-compact-conf ps-hb-compact-conf--neutral" title="AI-drafted — no fields below threshold">
                <span className="ps-hb-compact-conf-label">AI Drafted</span>
              </span>
            )
          )}
          <button
            className="ps-hb-compact-nav-btn"
            onClick={() => onNavigate('/worklist')}
            title="Back to worklist"
          >← Worklist</button>
        </div>
      </div>
    );
  }

  return (
    <div className="ps-hb">

      {/* Breadcrumb */}
      <div className="ps-hb-breadcrumb">
        <span className="ps-hb-crumb" onClick={() => onNavigate('/')}>Home</span>
        <span className="ps-hb-crumb-sep">›</span>
        <span className="ps-hb-crumb" onClick={() => onNavigate('/worklist')}>Worklist</span>
        <span className="ps-hb-crumb-sep">›</span>
        <span className="ps-hb-crumb ps-hb-crumb--active">Case Report</span>

        {isCopilotCase && syncState && (
          <div className="ps-hb-lis-sync">
            <span className="ps-hb-lis-sync-label">{formatSyncLabel(syncState.lastCheckedAt)}</span>
            <button
              className="ps-hb-lis-sync-btn"
              disabled={checkingNow}
              onClick={handleCheckNow}
              title="Ask the LIS for the current state of this case"
            >
              {checkingNow ? 'Checking…' : '↻ Check now'}
            </button>
          </div>
        )}
      </div>

      {/* Blocks & Stains — generated at Accession from the specimen's
          protocol (or default stains). Click "Edit" to open the real
          manual editor — status, stains, and a per-block priority
          override are all hand-editable there now; this row itself
          stays a read-only summary. */}
      {(caseData?.specimens ?? []).some((sp: any) => sp.blocks?.length) && (
        <div className="ps-hb-blocks-row">
          {(caseData?.specimens ?? []).map((sp: any) => (sp.blocks ?? []).map((block: any) => (
            <span key={block.id} className={`ps-hb-block-chip${block.id === focusedBlockId ? ' ps-hb-block-chip--focused' : ''}`} title={block.sourcePathwayName ?? undefined}>
              <strong>{sp.label}{block.label}</strong>
              {block.sourcePathwayName ? ` (${block.sourcePathwayName})` : ''}
              {' · '}{block.stains.length ? block.stains.map((st: any) => st.stainName).join(', ') : 'no stains yet'}
              {' · '}<em>{block.status}</em>
              {block.priority ? <> · <em title="Priority override">{block.priority}</em></> : null}
            </span>
          )))}
          {onOpenBlockEditor && (
            <button className="ps-hb-block-edit-btn" onClick={onOpenBlockEditor}>Edit</button>
          )}
        </div>
      )}

      {/* Deficiency history indicator — closes a real gap: getByCaseId()
          already existed on the deficiency service with zero UI ever
          calling it. Only shown when there's actually something to see. */}
      {!!deficiencyCount && onOpenDeficiencyHistory && (
        <div className="ps-hb-blocks-row">
          <button className="ps-hb-deficiency-chip" onClick={onOpenDeficiencyHistory}>
            ⚠ {deficiencyCount} specimen deficienc{deficiencyCount === 1 ? 'y' : 'ies'} — click to view history
          </button>
        </div>
      )}

      {/* Main row */}
      <div className="ps-hb-row">

        {/* Left — accession + patient */}
        <div className="ps-hb-left">

          {/* Accession block */}
          <div className="ps-hb-accession">
            <div className="ps-hb-field-label">Accession</div>
            <div className="ps-hb-accession-number">{accession}</div>
            {hospital && (
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, marginTop: 2, marginBottom: 3 }}>
                {hospital.shortName} · {hospital.country === 'UK' ? 'NHS' : hospital.country}
              </div>
            )}
            <div className="ps-hb-status-pill" style={{ background: meta.bg, border: `1px solid ${meta.border}` }}>
              <div className="ps-hb-status-dot" style={{ background: meta.dot }} />
              <span className="ps-hb-status-text" style={{ color: meta.color }}>{status}</span>
            </div>
          </div>

          <div className="ps-hb-divider" />

          {/* Patient fields */}
          <div className="ps-hb-patient-fields">
            <div className="ps-hb-field">
              <div className="ps-hb-field-label">Patient</div>
              <div className="ps-hb-field-value ps-hb-field-value--lg">{patient}</div>
            </div>
            <div className="ps-hb-field">
              <div className="ps-hb-field-label">Sex</div>
              <div className="ps-hb-field-value">{sex}</div>
            </div>
            <div className="ps-hb-field">
              <div className="ps-hb-field-label">Date of Birth</div>
              <div className="ps-hb-field-value">{dob}</div>
            </div>
            <div className="ps-hb-field">
              <div className="ps-hb-field-label">MRN</div>
              <div className="ps-hb-field-value">{mrn}</div>
            </div>
            {clientName && (
              <div className="ps-hb-field">
                <div className="ps-hb-field-label">Referring</div>
                <div className="ps-hb-field-value">{clientName}</div>
              </div>
            )}
          </div>
        </div>

        {/* Centre — progress stepper */}
        <div className="ps-hb-stepper">
          {progressSteps.map((step, idx) => (
            <React.Fragment key={step.id}>
              <div className="ps-hb-step">
                <div className={stepClass(step.status)}>
                  {step.status === 'completed' ? '✓' : step.status === 'alert' ? '⚠' : step.id}
                </div>
                <div className={`ps-hb-step-label ps-hb-step-label--${step.status}`}>
                  {step.label}
                </div>
              </div>
              {idx < progressSteps.length - 1 && (
                <div className={`ps-hb-step-connector${idx < 2 ? ' ps-hb-step-connector--done' : ''}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Right — AI synthesis status card */}
        <div className="ps-hb-right">
          <div className="ps-hb-confidence-card">
            <div className="ps-hb-confidence-header">
              <span className="ps-hb-confidence-status">{status}</span>
              <span className="ps-hb-confidence-priority">{caseData?.order?.priority ?? 'Routine'}</span>
            </div>
            {aiSynthesisStatus && aiSynthesisStatus.state !== 'none' ? (
              aiSynthesisStatus.state === 'review-required' ? (
                <button
                  className="ps-hb-confidence-score ps-hb-confidence-score--warn"
                  onClick={onAiStatusClick}
                  style={{ background: 'none', border: 'none', font: 'inherit', cursor: 'pointer', padding: 0, textAlign: 'left', display: 'flex', flexDirection: 'column' }}
                  title="Click to jump to the flagged field"
                >
                  <span className="ps-hb-confidence-pct">⚠ Review Pending</span>
                  {aiSynthesisStatus.flaggedFieldConfidence !== undefined && (
                    <span className="ps-hb-confidence-label">
                      Field at {aiSynthesisStatus.flaggedFieldConfidence}% confidence
                    </span>
                  )}
                </button>
              ) : (
                <div className="ps-hb-confidence-score ps-hb-confidence-score--neutral">
                  <span className="ps-hb-confidence-pct">AI Drafted</span>
                  <span className="ps-hb-confidence-label">
                    No fields below threshold
                    {aiSynthesisStatus.overallConfidence !== undefined
                      ? ` · ${aiSynthesisStatus.overallConfidence}% avg`
                      : ''}
                  </span>
                </div>
              )
            ) : (
              // No AI suggestions exist yet for this case — rather than
              // leaving the card body empty (previously: header strip only,
              // nothing below it), give the case status itself the same
              // visual weight the AI states get, so the card always shows
              // something meaningful instead of looking unfinished/blank.
              <div className="ps-hb-confidence-score ps-hb-confidence-score--status">
                <span className="ps-hb-confidence-pct" style={{ color: meta.color }}>
                  {status.replace(/-/g, ' ').toUpperCase()}
                </span>
                <span className="ps-hb-confidence-label">No AI suggestions yet</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default HeaderBar;
