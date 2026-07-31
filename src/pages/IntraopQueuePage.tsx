// src/pages/IntraopQueuePage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The Intraop tile's actual destination — both halves of the feature live
// here: starting a new session at the bench (this page IS the mobile
// capture surface, reached via phone browser same as desktop — no
// separate app), and the desktop merge queue for sessions still unlinked
// to a formal case.
//
// Session != specimen — one patient, one OR, one surgeon can send
// multiple specimens to the same consult. Patient/OR/surgeon are
// captured once; each specimen underneath gets its own label, Quick
// Gross, and frozen diagnosis. "Next Specimen" reuses the session,
// "Close and Save" ends it.
//
// The scan button is the first, primary thing shown — no intermediate
// "Start New" button, no modal. Selecting it (or falling back to manual
// entry) is understood as starting a frozen.
//
// Milestone timeline stays informational once logged — real timestamps,
// skip reasons visible inline, no second gate at review time. The real
// gate lives in the service layer's addMilestone: Quick Gross is a hard,
// per-specimen requirement before Touch Prep or Frozen Section Cut can
// be logged for that specimen (no clinical scenario skips basic
// measurements the way touch prep itself can be skipped for dense,
// fibrotic tissue).
//
// Patient match is honestly limited to manual entry and a labeled
// "simulated" barcode affordance — no real camera/barcode library exists
// anywhere in this app (checked directly), and pretending otherwise here
// would be dishonest about what's actually wired.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import '../pathscribe.css';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { useAuth } from '@/contexts/AuthContext';
import { intraoperativeService } from '@/services';
import { mockActionRegistryService } from '../services/actionRegistry/mockActionRegistryService';
import type { IntraoperativeEntry, IntraopSpecimen, MatchCandidate, MilestoneType, SkipReason, FrozenCategory } from '@/types/intraop/IntraoperativeEntry';

const MILESTONE_LABEL: Record<MilestoneType, string> = {
  gross_logged: 'Gross Logged',
  touch_prep_performed: 'Touch Prep Performed',
  touch_prep_skipped: 'Touch Prep Skipped',
  frozen_section_cut: 'Frozen Section Cut',
};

const SKIP_REASON_LABEL: Record<string, string> = {
  fibrotic_scant: 'Fibrotic / Scant',
  direct_to_frozen: 'Direct to Frozen',
  other: 'Other',
};

const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

// ─── New session form — scan leads, session info once, specimens loop ─────────
// Scan/manual -> patient identified -> demographics + OR/surgeon (creates
// the session) -> specimen label + Quick Gross + frozen dx -> Next
// Specimen (same session, back to specimen step) or Close and Save.
const NewEntryForm: React.FC<{
  performedBy: { userId: string; userName: string };
  onSessionSaved: () => void;
}> = ({ performedBy, onSessionSaved }) => {
  const [step, setStep] = useState<'scan' | 'demographics' | 'specimen'>('scan');
  const [patientName, setPatientName] = useState('');
  const [mrn, setMrn] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [source, setSource] = useState<'barcode' | 'adt_match'>('barcode');
  const [adtMatched, setAdtMatched] = useState(false);
  const [orNumber, setOrNumber] = useState('');
  const [surgeon, setSurgeon] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [specimenLabel, setSpecimenLabel] = useState('');
  const [quickGross, setQuickGross] = useState('');
  const [frozenDx, setFrozenDx] = useState('');
  const [frozenCategory, setFrozenCategory] = useState<FrozenCategory | ''>('');
  const [specimenCount, setSpecimenCount] = useState(0);
  const [busy, setBusy] = useState(false);

  const [manualMrn, setManualMrn] = useState('');
  const [showManualMrn, setShowManualMrn] = useState(false);

  const lookupPatient = async (mrnValue: string, matchSource: 'barcode' | 'adt_match') => {
    setBusy(true);
    setMrn(mrnValue);
    setSource(matchSource);
    const res = await intraoperativeService.lookupAdtRecord(mrnValue);
    setBusy(false);
    if (res.ok && res.data) {
      setPatientName(res.data.patientName);
      setDateOfBirth(res.data.dateOfBirth);
      setAdtMatched(true);
    } else {
      setPatientName(''); setDateOfBirth('');
      setAdtMatched(false);
    }
    setStep('demographics');
  };

  const simulateScan = () => {
    // Honest simulation, not a real camera read — see file header. A
    // real wristband scan would decode an actual MRN; here a random one
    // is generated, then genuinely checked against the same ADT lookup
    // manual entry uses — not a coin flip pretending to be a match.
    lookupPatient(`MRN-${Math.floor(10000 + Math.random() * 89999)}`, 'barcode');
  };

  const patientIdentified = patientName.trim() && mrn.trim();

  const startSession = async () => {
    if (!patientIdentified || !orNumber.trim() || !surgeon.trim()) return;
    setBusy(true);
    const res = await intraoperativeService.createSession({
      patientMatch: { source, patientName: patientName.trim(), mrn: mrn.trim(), dateOfBirth: dateOfBirth.trim() || undefined },
      performedBy, orNumber: orNumber.trim(), surgeon: surgeon.trim(),
    });
    setBusy(false);
    if (res.ok) { setSessionId(res.data.id); setStep('specimen'); }
  };

  const saveSpecimen = async (andContinue: boolean) => {
    if (!sessionId || !specimenLabel.trim() || !quickGross.trim()) return;
    setBusy(true);
    const specRes = await intraoperativeService.addSpecimen(sessionId, specimenLabel);
    if (!specRes.ok) { setBusy(false); return; }
    const newSpecimen = specRes.data.specimens[specRes.data.specimens.length - 1];
    await intraoperativeService.addMilestone(sessionId, newSpecimen.id, 'gross_logged', undefined, undefined, quickGross);
    if (frozenDx.trim()) {
      await intraoperativeService.addMilestone(sessionId, newSpecimen.id, 'frozen_section_cut');
      await intraoperativeService.setFrozenSectionDiagnosis(sessionId, newSpecimen.id, frozenDx, frozenCategory || undefined);
    }
    setBusy(false);
    setSpecimenCount(c => c + 1);
    setSpecimenLabel(''); setQuickGross(''); setFrozenDx(''); setFrozenCategory('');
    if (andContinue) {
      // Same session — patient/OR/surgeon already captured, straight
      // back to the specimen step for the next one.
    } else {
      onSessionSaved();
    }
  };

  if (step === 'scan') {
    return (
      <div className="ps-intraop-capture-step1">
        <button className="ps-conf-btn-primary ps-intraop-scan-btn" disabled={busy} onClick={simulateScan} type="button">
          📷 Scan Patient Barcode
        </button>
        <p className="ps-intraop-scan-hint">Simulated scan — no real camera read yet.</p>

        {!showManualMrn ? (
          <button className="ps-intraop-manual-link" onClick={() => setShowManualMrn(true)} type="button">
            No barcode? Enter MRN manually
          </button>
        ) : (
          <div className="ps-intraop-manual-fields">
            <div className="ps-conf-form-field">
              <label className="ps-conf-label">MRN</label>
              <input className="ps-conf-input" value={manualMrn} onChange={e => setManualMrn(e.target.value)} placeholder="e.g. 12345" autoFocus />
            </div>
            <button className="ps-conf-btn-row" disabled={busy || !manualMrn.trim()} onClick={() => lookupPatient(manualMrn.trim(), 'adt_match')}>
              Look Up Patient
            </button>
          </div>
        )}
      </div>
    );
  }

  if (step === 'demographics') {
    return (
      <div className="ps-intraop-capture-step2">
        {adtMatched ? (
          <div className="ps-intraop-identified-banner">
            Matched via ADT: {patientName} · DOB {dateOfBirth} · {mrn}
          </div>
        ) : (
          <>
            <div className="ps-intraop-identified-banner ps-intraop-identified-banner--warn">
              No ADT match — MRN {mrn} from barcode only. Enter name and date of birth.
            </div>
            <div className="ps-conf-form-field">
              <label className="ps-conf-label">Patient name (Last, First)</label>
              <input className="ps-conf-input" value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="Ibarra, Consuelo" />
            </div>
            <div className="ps-conf-form-field">
              <label className="ps-conf-label">Date of birth</label>
              <input className="ps-conf-input" type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} />
            </div>
          </>
        )}
        <div className="ps-conf-form-field">
          <label className="ps-conf-label">OR number</label>
          <input className="ps-conf-input" value={orNumber} onChange={e => setOrNumber(e.target.value)} placeholder="OR-3" />
        </div>
        <div className="ps-conf-form-field">
          <label className="ps-conf-label">Surgeon</label>
          <input className="ps-conf-input" value={surgeon} onChange={e => setSurgeon(e.target.value)} placeholder="Dr. Reyes" />
        </div>
        <button
          className="ps-conf-btn-primary ps-intraop-scan-btn"
          disabled={busy || !patientIdentified || !orNumber.trim() || !surgeon.trim()}
          onClick={startSession}
        >
          Continue to Specimen
        </button>
      </div>
    );
  }

  // step === 'specimen'
  return (
    <div className="ps-intraop-capture-step2">
      <div className="ps-intraop-identified-banner">
        {patientName} · {mrn} · {orNumber} · {surgeon}{specimenCount > 0 ? ` · ${specimenCount} specimen${specimenCount === 1 ? '' : 's'} saved` : ''}
      </div>
      <div className="ps-conf-form-field">
        <label className="ps-conf-label">Specimen label</label>
        <input className="ps-conf-input" value={specimenLabel} onChange={e => setSpecimenLabel(e.target.value)} placeholder="Specimen A: Left breast, margins" />
      </div>
      <div className="ps-conf-form-field">
        <label className="ps-conf-label">Quick Gross — dimensions, blocks frozen, orientation</label>
        <textarea className="ps-conf-input ps-conf-textarea" value={quickGross} onChange={e => setQuickGross(e.target.value)}
          placeholder="e.g. Received a 2.5 cm core of tan-pink tissue. Block FS1 cut from fatty margin. Superior suture placed by surgeon." />
      </div>
      <div className="ps-conf-form-field">
        <label className="ps-conf-label">Frozen section diagnosis (optional here — can be added later from the log)</label>
        <textarea className="ps-conf-input ps-conf-textarea" value={frozenDx} onChange={e => setFrozenDx(e.target.value)}
          placeholder="e.g. Invasive carcinoma, margins negative." />
      </div>
      <div className="ps-conf-form-field">
        <label className="ps-conf-label">Preliminary category</label>
        <select className="ps-conf-select" value={frozenCategory} onChange={e => setFrozenCategory(e.target.value as FrozenCategory | '')}>
          <option value="">Select…</option>
          <option value="benign">Benign</option>
          <option value="malignant">Malignant</option>
          <option value="atypical_suspicious">Atypical / Suspicious</option>
          <option value="deferred">Deferred</option>
        </select>
        <p className="ps-intraop-scan-hint">This category, not the diagnosis text, is what gets compared against the final category at sign-out.</p>
      </div>
      <div className="ps-intraop-specimen-actions">
        <button className="ps-conf-btn-row" disabled={busy || !specimenLabel.trim() || !quickGross.trim()} onClick={() => saveSpecimen(true)}>
          Save & Next Specimen
        </button>
        <button className="ps-conf-btn-primary ps-intraop-scan-btn" disabled={busy || !specimenLabel.trim() || !quickGross.trim()} onClick={() => saveSpecimen(false)}>
          Save & Close
        </button>
      </div>
    </div>
  );
};

// ─── Skip-reason micro-menu ─────────────────────────────────────────────────
const SkipReasonMenu: React.FC<{ onPick: (reason: SkipReason, note?: string) => void; onClose: () => void }> = ({ onPick, onClose }) => {
  const [otherNote, setOtherNote] = useState('');
  const [showOther, setShowOther] = useState(false);
  return (
    <div className="ps-intraop-skipmenu">
      <button className="ps-conf-btn-row" onClick={() => onPick('fibrotic_scant')}>Fibrotic / Scant</button>
      <button className="ps-conf-btn-row" onClick={() => onPick('direct_to_frozen')}>Direct to Frozen</button>
      {!showOther ? (
        <button className="ps-conf-btn-row" onClick={() => setShowOther(true)}>Other…</button>
      ) : (
        <div className="ps-intraop-skipmenu-other">
          <input className="ps-conf-input ps-intraop-skipmenu-other-input" value={otherNote} onChange={e => setOtherNote(e.target.value)} placeholder="Reason" autoFocus />
          <button className="ps-conf-btn-row" onClick={() => onPick('other', otherNote.trim() || undefined)}>OK</button>
        </div>
      )}
      <button className="ps-conf-btn-row ps-intraop-skipmenu-cancel" onClick={onClose}>Cancel</button>
    </div>
  );
};

// ─── Milestone action controls — per specimen, not per session ────────────────
const MilestoneActions: React.FC<{ sessionId: string; specimen: IntraopSpecimen; onLogged: () => void }> = ({ sessionId, specimen, onLogged }) => {
  const [quickGrossDraft, setQuickGrossDraft] = useState('');
  const [showSkipMenu, setShowSkipMenu] = useState(false);
  const [busy, setBusy] = useState(false);

  const hasGrossLogged = specimen.milestones.some(m => m.milestone === 'gross_logged') && !!specimen.quickGrossDictation?.trim();
  const hasTouchPrepStep = specimen.milestones.some(m => m.milestone === 'touch_prep_performed' || m.milestone === 'touch_prep_skipped');
  const hasFrozenCut = specimen.milestones.some(m => m.milestone === 'frozen_section_cut');

  const log = async (milestone: MilestoneType, skipReason?: SkipReason, skipReasonNote?: string, quickGrossText?: string) => {
    setBusy(true);
    const res = await intraoperativeService.addMilestone(sessionId, specimen.id, milestone, skipReason, skipReasonNote, quickGrossText);
    setBusy(false);
    if (res.ok) { onLogged(); setShowSkipMenu(false); setQuickGrossDraft(''); }
  };

  if (hasFrozenCut) return null; // full sequence logged — nothing left to action here

  if (!hasGrossLogged) {
    return (
      <div className="ps-intraop-action-block">
        <label className="ps-conf-label">Quick Gross — dimensions, blocks frozen, orientation</label>
        <textarea className="ps-conf-input ps-conf-textarea" value={quickGrossDraft} onChange={e => setQuickGrossDraft(e.target.value)}
          placeholder="e.g. Received a 2.5 cm core of tan-pink tissue. Block FS1 cut from fatty margin. Superior suture placed by surgeon." />
        <button className="ps-conf-btn-primary" disabled={busy || !quickGrossDraft.trim()} onClick={() => log('gross_logged', undefined, undefined, quickGrossDraft)}>
          Log Quick Gross
        </button>
        <p className="ps-intraop-gate-note">Required before Touch Prep or Frozen Section can be logged — no override.</p>
      </div>
    );
  }

  if (!hasTouchPrepStep) {
    return (
      <div className="ps-intraop-action-block">
        <button className="ps-conf-btn-primary" disabled={busy} onClick={() => log('touch_prep_performed')}>Log Touch Prep Performed</button>
        <button className="ps-conf-btn-row" disabled={busy} onClick={() => setShowSkipMenu(true)}>Skip Touch Prep</button>
        {showSkipMenu && (
          <SkipReasonMenu
            onClose={() => setShowSkipMenu(false)}
            onPick={(reason, note) => log('touch_prep_skipped', reason, note)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="ps-intraop-action-block">
      <button className="ps-conf-btn-primary" disabled={busy} onClick={() => log('frozen_section_cut')}>Log Frozen Section Cut</button>
    </div>
  );
};

// ─── Merge modal ────────────────────────────────────────────────────────────
const MergeModal: React.FC<{
  entry: IntraoperativeEntry;
  candidates: MatchCandidate[];
  onConfirm: (caseId: string) => void;
  onClose: () => void;
}> = ({ entry, candidates, onConfirm, onClose }) => {
  const [selected, setSelected] = useState(candidates[0]?.caseId ?? '');
  const [manualCaseId, setManualCaseId] = useState('');
  const finalCaseId = selected === '__manual__' ? manualCaseId.trim() : selected;

  return (
    <div className="ps-ms-overlay">
      <div className="ps-ms-modal">
        <div className="ps-ms-header">Merge Mobile Intake Data</div>
        <div className="ps-ms-body">
          {/* The one legitimate place this reveals real PHI — the card
              in the list stays redacted (🔒 Pending Match); this modal
              only opens when a pathologist has actually chosen to
              review/claim this specific entry, which is the moment
              they have a real reason to see who it's for. */}
          <p className="ps-intraop-merge-patient">{entry.patientMatch.patientName} · {entry.patientMatch.mrn}</p>
          <p className="ps-intraop-merge-intro">
            Appends dictation to Gross Description / Clinical History and attaches mobile photos to the case's media gallery, once merged.
          </p>

          {candidates.length > 0 ? (
            <div className="ps-conf-form-field">
              <label className="ps-conf-label">Matched case</label>
              {candidates.map(c => (
                <label key={c.caseId} className="ps-intraop-candidate-row">
                  <input type="radio" name="matchCandidate" checked={selected === c.caseId} onChange={() => setSelected(c.caseId)} />
                  <span className="ps-intraop-candidate-case">{c.caseId}</span>
                  <span className={`ps-intraop-candidate-badge ps-intraop-candidate-badge--${c.confidence}`}>
                    {c.matchType === 'mrn_exact' ? 'MRN match' : `Fuzzy · ${c.confidence}`}
                  </span>
                  <span className="ps-intraop-candidate-reason">{c.matchReason}</span>
                </label>
              ))}
              <label className="ps-intraop-candidate-row">
                <input type="radio" name="matchCandidate" checked={selected === '__manual__'} onChange={() => setSelected('__manual__')} />
                <span className="ps-intraop-candidate-case">Enter case ID manually</span>
              </label>
            </div>
          ) : (
            <div className="ps-conf-form-field">
              <label className="ps-conf-label">No automatic match found — enter the case ID</label>
            </div>
          )}

          {(selected === '__manual__' || candidates.length === 0) && (
            <div className="ps-conf-form-field">
              <input className="ps-conf-input" placeholder="e.g. O26-0021" value={manualCaseId} onChange={e => setManualCaseId(e.target.value)} />
            </div>
          )}
        </div>
        <div className="ps-ms-footer">
          <button className="ps-ms-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="ps-ms-btn-apply" disabled={!finalCaseId} onClick={() => finalCaseId && onConfirm(finalCaseId)}>
            Merge into {finalCaseId || '…'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Specimen card — one per specimen, nested inside the session's entry card ──
const SpecimenCard: React.FC<{ sessionId: string; specimen: IntraopSpecimen; onRefresh: () => void }> = ({ sessionId, specimen, onRefresh }) => (
  <div className="ps-intraop-specimen-card">
    <div className="ps-intraop-specimen">{specimen.specimenLabel}</div>

    {specimen.milestones.length > 0 && (
      <div className="ps-intraop-timeline">
        {specimen.milestones.map(m => (
          <div key={m.id} className="ps-intraop-timeline-row">
            <span className="ps-intraop-timeline-time">{formatTime(m.timestamp)}</span>
            <span className={`ps-intraop-timeline-dot ${m.milestone === 'touch_prep_skipped' ? 'ps-intraop-timeline-dot--skip' : ''}`} />
            <span className="ps-intraop-timeline-label">{MILESTONE_LABEL[m.milestone]}</span>
            {m.skipReason && (
              <span className="ps-intraop-timeline-reason">
                {SKIP_REASON_LABEL[m.skipReason]}{m.skipReasonNote ? ` — ${m.skipReasonNote}` : ''}
              </span>
            )}
          </div>
        ))}
      </div>
    )}

    <MilestoneActions sessionId={sessionId} specimen={specimen} onLogged={onRefresh} />

    {specimen.preliminaryCytologyDictation && (
      <div className="ps-intraop-note">
        <span className="ps-intraop-note-label">Preliminary cytology</span>
        {specimen.preliminaryCytologyDictation}
      </div>
    )}
    {specimen.quickGrossDictation && (
      <div className="ps-intraop-note">
        <span className="ps-intraop-note-label">Quick Gross</span>
        {specimen.quickGrossDictation}
      </div>
    )}
    {specimen.frozenSectionDiagnosis && (
      <div className="ps-intraop-note ps-intraop-note--diagnosis">
        <span className="ps-intraop-note-label">Frozen section diagnosis</span>
        {specimen.frozenSectionDiagnosis}
      </div>
    )}
  </div>
);

// ─── Entry (session) card — one per session, holds every specimen under it ────
const EntryCard: React.FC<{
  entry: IntraoperativeEntry;
  onMergeClick: () => void;
  onRefresh: () => void;
}> = ({ entry, onMergeClick, onRefresh }) => {
  const [reporting, setReporting] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const handleReportToSurgeon = async () => {
    setBusy(true);
    await intraoperativeService.recordVerbalReport(entry.id, note);
    setBusy(false);
    setReporting(false);
    setNote('');
    onRefresh();
  };

  // Voice: INTRAOP_LOG_SURGEON_REPORT. Only listened for while this
  // specific card's reporting form is open (reporting === true) — same
  // pattern as PoolClaimModal.tsx's POOL_ACCEPT_CASE: the action only
  // ever means something with exactly this one form open, so there's
  // never a "which entry" ambiguity to resolve. Gated on !busy so a
  // stray recognition can't double-fire while the write is in flight.
  useEffect(() => {
    if (!reporting) return;
    const unsubscribe = mockActionRegistryService.onAction((actionId: string) => {
      if (busy) return;
      if (actionId === 'INTRAOP_LOG_SURGEON_REPORT') handleReportToSurgeon();
    });
    return unsubscribe;
  }, [reporting, busy, note]);

  return (
  <div className="ps-intraop-card">
    <div className="ps-intraop-card-header">
      <div>
        {/* Redacted the same way WorklistTable redacts pediatric/
            orchestration/pool cases — nobody has a specific right to
            this patient's PHI until the entry is actually claimed via
            merge. Only non-identifying operational context (OR number,
            surgeon, match source) stays visible; name and MRN don't. */}
        <div className="ps-intraop-card-patient">🔒 Pending Match</div>
        <div className="ps-intraop-card-sub">
          {entry.orNumber} · {entry.surgeon} · {entry.performedBy.userName} · matched via {entry.patientMatch.source === 'barcode' ? 'barcode scan (simulated)' : 'manual / ADT entry'}
        </div>
      </div>
      <button className="ps-conf-btn-primary" onClick={onMergeClick}>Merge Mobile Intake Data</button>
    </div>

    {entry.specimens.map(spec => (
      <SpecimenCard key={spec.id} sessionId={entry.id} specimen={spec} onRefresh={onRefresh} />
    ))}

    {entry.verbalReportLog ? (
      <div className="ps-intraop-note">
        <span className="ps-intraop-note-label">Verbal report to surgeon — {formatTime(entry.verbalReportLog.timestamp)}</span>
        {entry.verbalReportLog.note}
      </div>
    ) : reporting ? (
      <div className="ps-intraop-note">
        <span className="ps-intraop-note-label">Report to surgeon</span>
        <input
          className="ps-conf-input"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="What was said (optional) — e.g. margins clear, frozen pending"
          autoFocus
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button className="ps-conf-btn-primary" disabled={busy} onClick={handleReportToSurgeon}>Log Now</button>
          <button className="ps-conf-btn-secondary" disabled={busy} onClick={() => { setReporting(false); setNote(''); }}>Cancel</button>
        </div>
      </div>
    ) : (
      // The real, deliberate capture point this whole TAT metric
      // depends on — the moment of verbal communication to the surgeon
      // can't be inferred from any system event, unlike merge; a
      // pathologist has to actively log it. Timestamped at the moment
      // this button is pressed, not backdated or editable afterward —
      // matches the same "immutable event, captured at the moment"
      // principle as recordAiFeedback and the merge audit log.
      <button className="ps-conf-btn-secondary" onClick={() => setReporting(true)}>📞 Report to Surgeon Now</button>
    )}
  </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
const IntraopQueuePage: React.FC = () => {
  const { pushCrumb } = useBreadcrumb();
  const { user } = useAuth();
  const [entries, setEntries] = useState<IntraoperativeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [mergeTarget, setMergeTarget] = useState<{ entry: IntraoperativeEntry; candidates: MatchCandidate[] } | null>(null);

  // Below this width, the page is almost certainly a phone at the bench,
  // not a desktop workstation reviewing the queue — default the log to
  // hidden so the capture form is what's actually in view. Desktop
  // defaults to showing the log, matching how it's always worked.
  const [isMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [showLog, setShowLog] = useState(!isMobile);
  const [formResetKey, setFormResetKey] = useState(0);

  useEffect(() => { pushCrumb('Intraop Queue', '/intraop-queue'); }, [pushCrumb]);

  const load = () => {
    intraoperativeService.getPending().then(res => {
      if (res.ok) setEntries(res.data);
      setLoading(false);
    });
  };
  useEffect(() => { load(); }, []);

  const onSessionSaved = () => {
    load();
    setShowLog(true);
    setFormResetKey(k => k + 1);
  };

  // Voice command for starting a fresh capture — real caveat, not
  // glossed over: reliability on iOS Safari is genuinely inconsistent
  // (checked directly — real, recent reports of recognition silently
  // failing or never stopping); this should degrade to tapping the
  // scan button, not be depended on. Per-milestone voice commands were
  // removed with the session/specimen restructuring — "log touch prep
  // performed" needs a specific specimen in view to make sense, and
  // there's no reliable way to infer which one from voice alone; those
  // stay tap-only on the specimen card itself for now.
  useEffect(() => {
    const onStartNewEntry = () => setFormResetKey(k => k + 1);
    window.addEventListener('PATHSCRIBE_INTRAOP_START_NEW_ENTRY', onStartNewEntry);
    return () => window.removeEventListener('PATHSCRIBE_INTRAOP_START_NEW_ENTRY', onStartNewEntry);
  }, []);

  const openMerge = async (entry: IntraoperativeEntry) => {
    const res = await intraoperativeService.getMatchCandidates(entry.id);
    setMergeTarget({ entry, candidates: res.ok ? res.data : [] });
  };

  const confirmMerge = async (caseId: string) => {
    if (!mergeTarget) return;
    // The modal only returns the final caseId, not which path produced
    // it — inferred here instead of changing MergeModal's prop signature:
    // if caseId matches one of the offered candidates, that candidate's
    // real matchType/confidence apply; otherwise it was typed manually.
    // wasManualOverride is true specifically when real candidates WERE
    // offered but the user typed something else instead — not simply
    // "no candidates existed at all," which isn't an override of anything.
    const matchedCandidate = mergeTarget.candidates.find(c => c.caseId === caseId);
    const res = await intraoperativeService.merge(mergeTarget.entry.id, caseId, {
      matchType: matchedCandidate?.matchType ?? 'manual',
      confidence: matchedCandidate?.confidence ?? null,
      wasManualOverride: !matchedCandidate && mergeTarget.candidates.length > 0,
      performedBy: user?.name ?? 'Unknown User',
    });
    if (res.ok) setEntries(prev => prev.filter(e => e.id !== mergeTarget.entry.id));
    setMergeTarget(null);
  };

  if (loading) return <div className="ps-conf-loading">Loading intraoperative entries…</div>;

  return (
    <div className="ps-intraop-page">
      <div className="ps-intraop-page-header">
        <div className="ps-intraop-header-row">
          <div>
            <h1 className="ps-intraop-page-title">Intraoperative Entries</h1>
            <p className="ps-intraop-page-subtitle">
              Scan the patient to start — OR/surgeon once per session, then each specimen gets its own Quick Gross and frozen diagnosis.
            </p>
          </div>
          <div className="ps-intraop-header-actions">
            <button className="ps-conf-btn-row" onClick={() => setShowLog(v => !v)}>
              {showLog ? 'Hide Log' : 'View Log'}{entries.length > 0 ? ` (${entries.length})` : ''}
            </button>
          </div>
        </div>
      </div>

      <div className="ps-intraop-capture-inline">
        <NewEntryForm
          key={formResetKey}
          performedBy={{ userId: user?.id ?? 'unknown', userName: user?.name ?? 'Unknown User' }}
          onSessionSaved={onSessionSaved}
        />
      </div>

      {showLog && (
        entries.length === 0 ? (
          <div className="ps-intraop-empty">No unlinked intraoperative entries — everything captured has been merged.</div>
        ) : (
          <div className="ps-intraop-list">
            {entries.map(entry => (
              <EntryCard key={entry.id} entry={entry} onMergeClick={() => openMerge(entry)} onRefresh={load} />
            ))}
          </div>
        )
      )}

      {mergeTarget && (
        <MergeModal
          entry={mergeTarget.entry}
          candidates={mergeTarget.candidates}
          onConfirm={confirmMerge}
          onClose={() => setMergeTarget(null)}
        />
      )}
    </div>
  );
};

export default IntraopQueuePage;
