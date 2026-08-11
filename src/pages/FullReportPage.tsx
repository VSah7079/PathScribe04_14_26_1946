// src/pages/FullReportPage.tsx

import { useState, useEffect } from "react";
import '../pathscribe.css';
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getMockReport, FullReport, MinimalReport } from "../mock/mockReports";
import { useAuth } from "../contexts/AuthContext";
import { useMessaging } from "../contexts/MessagingContext";
import { internalNoteService } from "../services";
import { PoolClaimModal } from "../components/Worklist/PoolClaimModal";
import InternalNotesDrawer from "../components/InternalNotes/InternalNotesDrawer";
import { VoiceCommandOverlay } from "../components/Voice/VoiceCommandOverlay";
import { VoiceMissPrompt }     from "../components/Voice/VoiceMissPrompt";
import { mockActionRegistryService } from "../services/actionRegistry/mockActionRegistryService";
import { VOICE_CONTEXT } from "../constants/systemActions";

// react-router's useLocation() always returns Location<any> — there's no
// generic parameter to narrow it at the call site. This describes what
// this page actually expects to find there (set by WorklistPage's row
// click and the Messages portal's "view case" action), so `location.state`
// gets one real assertion to this shape instead of two stacked `any`s
// (the state field itself defaults to `any`, then was being cast to
// `any` again on top of that).
interface FullReportLocationState {
  fromFilter?: string;
  fromMessages?: boolean;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FullReportPage() {
  const { accession } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [internalNotesOpen, setInternalNotesOpen] = useState(false);

  const locationState = location.state as FullReportLocationState | null;
  const fromFilter = locationState?.fromFilter;
  const fromMessages = locationState?.fromMessages;
  const { setPortalOpen } = useMessaging();

  const handleBack = () => {
    if (fromFilter) {
      navigate('/worklist', { state: { restoreFilter: fromFilter } });
    } else if (fromMessages) {
      setPortalOpen(true);
      navigate(-1);
    } else {
      navigate(-1);
    }
  };

  const cleanedAccession = accession?.trim() || "";
  const report = cleanedAccession ? getMockReport(cleanedAccession) : null;
  const isPool = cleanedAccession.endsWith('-POOL');
  const [unreadNoteCount, setUnreadNoteCount] = useState(0);
  const [claimOpen, setClaimOpen] = useState(false);

  useEffect(() => {
    if (!cleanedAccession) return;
    internalNoteService.getForCase(cleanedAccession, user?.id ?? 'u1').then(result => {
      if (result.ok) {
        const count = result.data.filter(n => n.authorId !== (user?.id ?? 'u1') && n.visibility === 'shared').length;
        setUnreadNoteCount(count);
      }
    }).catch(() => {});
  }, [cleanedAccession, user?.id]);

  // ── Voice: set CASE_VIEW context — this page is outside AppShell so
  //    it needs its own context setting and voice overlay components.
  useEffect(() => {
    mockActionRegistryService.setCurrentContext(VOICE_CONTEXT.CASE_VIEW);
    return () => mockActionRegistryService.setCurrentContext(VOICE_CONTEXT.WORKLIST);
  }, []);

  // ── Voice: case navigation and go back/forward ─────────────────────────────
  useEffect(() => {
    const goBack    = () => navigate(-1);
    const goForward = () => navigate(1);
    const nextCase  = () => navigate(1);   // navigate forward in history
    const prevCase  = () => navigate(-1);  // navigate back in history

    window.addEventListener('PATHSCRIBE_GO_BACK',            goBack);
    window.addEventListener('PATHSCRIBE_GO_FORWARD',         goForward);
    window.addEventListener('PATHSCRIBE_NAV_NEXT_CASE',      nextCase);
    window.addEventListener('PATHSCRIBE_NAV_PREVIOUS_CASE',  prevCase);

    return () => {
      window.removeEventListener('PATHSCRIBE_GO_BACK',            goBack);
      window.removeEventListener('PATHSCRIBE_GO_FORWARD',         goForward);
      window.removeEventListener('PATHSCRIBE_NAV_NEXT_CASE',      nextCase);
      window.removeEventListener('PATHSCRIBE_NAV_PREVIOUS_CASE',  prevCase);
    };
  }, [navigate]);

  if (!report) {
    return (
      <div className="ps-report-page">
        <div className="ps-report-bg" />
        <div className="ps-report-bg-grad" />
        <div className="ps-report-content ps-report-notfound">
          <div className="ps-report-notfound-icon">🔍</div>
          <h1 className="ps-report-notfound-title">
            Report Not Found
          </h1>
          <p className="ps-report-notfound-sub">
            Accession <code className="ps-report-notfound-code">{cleanedAccession || "—"}</code> could not be found.
          </p>
          <button onClick={handleBack} className="ps-report-notfound-btn">
            ← Go Back
          </button>
        </div>
        <VoiceCommandOverlay showSuccess={import.meta.env.DEV} />
        <VoiceMissPrompt />
      </div>
    );
  }

  const isFull = (report as FullReport).synoptic !== undefined;
  const poolCaseSummary = report
    ? `${(report as FullReport).patientName} — ${(report as FullReport).specimens?.[0]?.type ?? ''}`
    : cleanedAccession;

  return (
    <div className="ps-report-page">
      <div className="ps-report-bg" />
      <div className="ps-report-bg-grad" />
      <div className="ps-report-content">

        {/* Back + actions */}
        <div className="ps-report-actions-row">
          <button onClick={handleBack} className="ps-report-back-btn">
            ← Back
          </button>

          <div className="ps-report-actions-right">
            {/* Claim button — only visible for pool cases */}
            {isPool && (
              <button onClick={() => setClaimOpen(true)} className="ps-report-claim-btn">
                ✋ Claim This Case
              </button>
            )}

            <button onClick={() => setInternalNotesOpen(true)} className="ps-report-notes-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              Internal Notes
              {unreadNoteCount > 0 && (
                <span className="ps-report-notes-badge">
                  {unreadNoteCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {internalNotesOpen && (
          <InternalNotesDrawer
            accession={cleanedAccession}
            userId={user?.id ?? 'u1'}
            userName={user?.name ?? 'Unknown'}
            onClose={() => setInternalNotesOpen(false)}
          />
        )}

        {/* Header card */}
        <div className="ps-report-card ps-report-header-card">
          <div className="ps-report-header-row">
            <div>
              <div className="ps-report-eyebrow">
                Pathology Report
              </div>
              <h1 className="ps-report-accession-title" data-phi="accession">
                {report.accession}
              </h1>
              {isFull && (
                <p className="ps-report-header-dx">
                  {(report as FullReport).diagnosis}
                </p>
              )}
            </div>
            <div className="ps-report-header-meta">
              <div className="ps-report-label">Last Updated</div>
              <div className="ps-report-header-meta-value">
                {report.lastUpdated}
              </div>
            </div>
          </div>
        </div>

        {isFull
          ? <FullReportView report={report as FullReport} />
          : <MinimalReportView report={report as MinimalReport} />
        }
      </div>

      {/* Voice overlays — this page is outside AppShell so mounts them directly */}
      <VoiceCommandOverlay showSuccess={import.meta.env.DEV} />
      <VoiceMissPrompt />

      {/* Pool claim modal — shown when pathologist clicks Claim This Case */}
      <PoolClaimModal
        isOpen={claimOpen}
        caseId={cleanedAccession}
        caseSummary={poolCaseSummary}
        poolName="MFT Pool"
        currentUserId={user?.id ?? 'u1'}
        currentUserName={user?.name ?? 'Unknown'}
        continueToReport={true}
        fromFilter={fromFilter ?? 'pool'}
        onAccepted={() => setClaimOpen(false)}
        onPassed={() => { setClaimOpen(false); navigate('/worklist', { state: { restoreFilter: fromFilter ?? 'pool' } }); }}
        onClose={() => setClaimOpen(false)}
      />
    </div>
  );
}

// ─── Full Report View ─────────────────────────────────────────────────────────

function FullReportView({ report }: { report: FullReport }) {
  return (
    <div className="ps-report-grid">

      {/* ── LEFT COLUMN: Specimens + Synoptic ── */}
      <div className="ps-report-col">

        <div className="ps-report-card">
          <div className="ps-report-section-heading">Specimens</div>
          <div className="ps-report-specimen-list">
            {report.specimens.map(s => (
              <div key={s.id} className="ps-report-specimen-row">
                <div className="ps-report-specimen-id">
                  {s.id}
                </div>
                <div>
                  <div className="ps-report-specimen-type">{s.type}</div>
                  <div className="ps-report-specimen-desc">{s.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="ps-report-card">
          <div className="ps-report-section-heading">Synoptic Summary</div>
          <div className="ps-report-synoptic-grid">
            {[
              { label: "Tumor Type",              value: report.synoptic.tumorType },
              { label: "Grade",                   value: report.synoptic.grade },
              { label: "Size",                    value: report.synoptic.size },
              { label: "Margins",                 value: report.synoptic.margins },
              { label: "Lymphovascular Invasion", value: report.synoptic.lymphovascularInvasion },
            ].map(({ label, value }) => (
              <div key={label} className="ps-report-synoptic-tile">
                <div className="ps-report-label">{label}</div>
                <div className="ps-report-value">{value}</div>
              </div>
            ))}
          </div>
          <div className="ps-report-label ps-report-biomarkers-label">Biomarkers</div>
          <div className="ps-report-biomarker-grid">
            {[
              { label: "ER",    value: report.synoptic.biomarkers.er   },
              { label: "PR",    value: report.synoptic.biomarkers.pr   },
              { label: "HER2",  value: report.synoptic.biomarkers.her2 },
              { label: "Ki-67", value: report.synoptic.biomarkers.ki67 },
            ].map(({ label, value }) => (
              <div key={label} className="ps-report-biomarker-tile">
                <div className="ps-report-biomarker-label">{label}</div>
                <div className="ps-report-biomarker-value">{value}</div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── RIGHT COLUMN: Diagnosis + Text sections ── */}
      <div className="ps-report-col">

        <div className="ps-report-card">
          <div className="ps-report-section-heading">Diagnosis</div>
          <p className="ps-report-value ps-report-diagnosis-text" data-phi="diagnosis">
            {report.diagnosis}
          </p>
        </div>

        <div className="ps-report-card">
          <div className="ps-report-section-heading">Gross Description</div>
          <p className="ps-report-value ps-report-desc-text">{report.grossDescription}</p>
        </div>

        <div className="ps-report-card">
          <div className="ps-report-section-heading">Microscopic Description</div>
          <p className="ps-report-value ps-report-desc-text">{report.microscopicDescription}</p>
        </div>

        <div className="ps-report-card">
          <div className="ps-report-section-heading">Ancillary Studies</div>
          <p className="ps-report-value ps-report-desc-text">{report.ancillaryStudies}</p>
        </div>

      </div>
    </div>
  );
}

// ─── Minimal Report View ──────────────────────────────────────────────────────

function MinimalReportView({ report }: { report: MinimalReport }) {
  return (
    <>
      <div className="ps-report-card">
        <div className="ps-report-section-heading">Diagnosis</div>
        <p className="ps-report-value ps-report-diagnosis-text" data-phi="diagnosis">
          {report.diagnosis}
        </p>
      </div>

      {report.specimenType && (
        <div className="ps-report-card">
          <div className="ps-report-section-heading">Specimen Type</div>
          <p className="ps-report-value">{report.specimenType}</p>
        </div>
      )}

      <div className="ps-report-card ps-report-limited-card">
        <div className="ps-report-limited-row">
          <span className="ps-report-limited-icon">⚠️</span>
          <div>
            <div className="ps-report-limited-title">Limited Data</div>
            <p className="ps-report-value ps-report-limited-text">
              This report contains limited data. Additional LIS details may not be available.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
