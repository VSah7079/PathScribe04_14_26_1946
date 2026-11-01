import { caseAddresses } from '@/services';
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Case } from '@/types/case/Case';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router';
import RequestReviewModal from '@/components/RequestReview/RequestReviewModal';
import ExternalConsultAccessModal from '@/components/ExternalConsult/ExternalConsultAccessModal';
import { PoolClaimModal } from '@/components/Worklist/PoolClaimModal';
import EMRSidecarDrawer from './EMRSidecarDrawer';
import { useCompanionWindow } from '@/hooks/useCompanionWindow';
import { resolveIsFinalStatus } from '@/services/reportTemplates/TemplateRoutingService';
import { type FollowUpMarkOffer } from '@/services';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { useCapabilities } from '@/hooks/useCapabilities';
import { VOICE_CONTEXT } from '@/constants/systemActions';
import { bottomBarVisibility } from '@/services/reports/bottomBarActions';
import { useBottomBarActionEvents } from '../hooks/useBottomBarActionEvents';
import { useRevisionReleaseAvailability } from '../hooks/useRevisionReleaseAvailability';
import { useCaseAttachmentCount } from '@/hooks/useCaseAttachments';
import { revisionEntryDisabledTitle } from '@/services/reports/revisionReleaseCapability';
import './BottomActionBar.css';
import { formatDate } from '@/utils/formatDate';


interface BottomActionBarProps {
  caseData: Case | null;
  isDirty?: boolean;
  onSaveDraft: () => void;
  onSaveAndNext: () => void;
  onFinalize: () => void;
  onFinalizeAndNext: () => void;
  onSignOut: () => void;
  /** Batch 664: Orchestration's Sign Out and Next (arms the move to the next case, then signs out as Sign Out Case does). */
  onSignOutAndNext?: () => void;
  /** Real, per direct research and design recommendation ("Provide a
   *  Manual Trigger... 'Release as Preliminary' button... at any point
   *  before final verification") — the manual pathologist action
   *  identified as the primary real trigger (~80% of real preliminary-
   *  report cases). Optional: undefined on any surface (e.g. the
   *  Cytology sign-out page) that hasn't wired this yet — never a
   *  broken button on a page that doesn't support it. */
  onReleasePreliminary?: () => void;
  /** Manual trigger for the Amendment/Addendum modal on an already-
   *  finalized case — before this, the modal only ever opened itself
   *  automatically for one narrow scenario (a deferred synoptic being
   *  completed), with no way for a pathologist to request a genuine
   *  correction or addition on demand. Shown in the same slot Sign Out
   *  occupies before finalization — mutually exclusive with it. */
  onRequestAmendment?: () => void;
  /** Batch 459: after sign-out, mark the case "follow-up specimen expected"
   *  (case:follow-up:expect), or show the existing mark. The page loads the
   *  offer from loadFollowUpMarkOffer; this bar only renders it. */
  followUpOffer?: FollowUpMarkOffer;
  onMarkFollowUp?: () => void;
  /** CoPilot-specific print action — Orchestration's print button lives
   *  inside the full report preview panel, which is Orchestration-only
   *  (relies on narrative sections that don't exist for CoPilot). This
   *  is a separate, dedicated entry point reusing the same underlying
   *  PDF generation, not a duplicate implementation. */
  onPrint?: () => void;
  /** Real feature, per direct follow-up: "Move Manage Reprints...
   *  Bottom-Right Action Cluster... it keeps all case-level actions in
   *  one predictable location... removes the visual orphaning of the
   *  current Manage Reports button." Was tab-specific (Material tab
   *  only, inside MaterialTreePanel.tsx); now global and always
   *  available here, alongside Save Draft/Finalize. */
  onOpenReprints?: () => void;
  /** Batch 609 (PS-44): opens the Attach images screen (images printed after the report's pages). */
  onAttachImages?: () => void;
  
  onDelegate?: () => void;
  onHistory?: () => void;
  onFlags?: () => void;
  /** Batch 492: the real, clickable entry point for "Flag for Tumor Board /
   *  MDT" (case:tumor-board:flag) — until now, `showFlagForMdtModal` in
   *  SynopticReportPage.tsx was only ever set by the 'delegation.tumorBoard'
   *  voice/keyboard action, with no button anywhere that opened it. Gated
   *  with CapabilityButton (not plain ActionButton, unlike Delegate/Flags/
   *  Team/Codes) because this maps to exactly one capability, not a modal
   *  offering several actions of its own. */
  onFlagForMdt?: () => void;
  onCodes?: () => void;
  onTeam?: () => void;
  onNextCase: () => void;
  onPreviousCase: () => void;
  /** Orchestrator — generate report from synoptic answers */
  onGenerateReport?: () => void;
  isGenerating?: boolean;
  onAbortGenerate?: () => void;
  /**
   * Stage 1 trigger — PA marks Grossing finalized, fires
   * evaluateSynopticAssignment. Shown INSTEAD OF Generate Report/Save
   * Draft/Finalize/Finalize & Next while grossing is still in progress
   * (same slot, mutually exclusive — see showGrossComplete below), not
   * alongside them. None of those actions make sense yet at this stage:
   * there's no synoptic data to save, generate from, or finalize until
   * Stage 1 has run.
   */
  /**
   * Stage 1 trigger — single action, dynamic meaning. Fires on both first
   * finalize ("Gross Complete") and re-finalize after a correction
   * ("Update Gross") — same handler either way, see
   * SynopticReportPage.tsx's handleGrossComplete. There is no separate
   * "unlock"/"reopen" action: editing an already-finalized Grossing
   * instance's answers is itself what brings this button back (handled
   * reactively in the page, not here).
   */
  onGrossComplete?: () => void;
  /**
   * True while a Stage 1 evaluation is running OR its resulting Protocol
   * Change Review modal is still open and unresolved. Disables Finalize/
   * Finalize & Next/Sign Out while true — a case should not be signable
   * while its synoptic assignment might be stale relative to a just-
   * edited Gross.
   */
  synopticFitPending?: boolean;
}

const ActionButton: React.FC<{
  onClick: () => void;
  children: React.ReactNode;
  variant: 'outline' | 'solid';
  color: string;
  hoverColor?: string;
  title?: string;
  disabled?: boolean;
}> = ({ onClick, children, variant, color, hoverColor, title, disabled = false }) => {
  // Batch 367 (PS-74): the look lives in .ps-bab-action-btn (hover by CSS);
  // only the button's colour is per instance.
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled} title={title}
      className={`ps-bab-action-btn ps-bab-action-btn--${variant}`}
      style={{ '--ps-hue': color, '--bab-hover': hoverColor || color } as React.CSSProperties}>
      {children}
    </button>
  );
};

const Divider = () => <div className="ps-bab-divider" />;

const BottomActionBar: React.FC<BottomActionBarProps> = ({
  caseData,
  isDirty = false,
  onSaveDraft,
  onSaveAndNext,
  onFinalize,
  onFinalizeAndNext,
  onSignOutAndNext,
  onSignOut,
  onReleasePreliminary,
  onRequestAmendment,
  followUpOffer,
  onMarkFollowUp,
  onPrint,
  onOpenReprints,
  onAttachImages,
  
  onDelegate,
  onHistory,
  onFlags,
  onFlagForMdt,
  onCodes,
  onTeam,
  onNextCase,
  onPreviousCase,
  onGenerateReport,
  isGenerating = false,
  onAbortGenerate,
  onGrossComplete,
  synopticFitPending = false,
}) => {
  const { t, i18n } = useTranslation();
  const { availability: revisionAvailability } = useRevisionReleaseAvailability(caseData);
  // Batch 742: the case's Attachments badge counts its photos, files and links.
  const attachmentCount = useCaseAttachmentCount(caseData, caseData?.id, caseData?.accession?.fullAccession ?? caseData?.accession?.accessionNumber);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [claimOpen,  setClaimOpen]  = useState(false);
  // PS-290 — see ExternalConsultAccessModal.tsx's own header for the
  // real, load-bearing disclosure this feature carries.
  const [consultOpen, setConsultOpen] = useState(false);

  // Real fix, per direct report: at a narrow enough effective viewport
  // (the fixed-width right-hand action cluster forcing this scrollable
  // left group to shrink well below what its own content needs),
  // History/Flags/Codes could become entirely invisible with only the
  // existing 28px fade gradient as a cue — not discoverable enough on
  // its own, confirmed by direct reproduction. Real, visible, clickable
  // scroll arrows only render when genuinely needed (real overflow
  // present), never as permanent visual clutter on a normal-width
  // screen where everything already fits.
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const updateScrollState = () => {
      setCanScrollLeft(el.scrollLeft > 2);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
    };
    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      resizeObserver.disconnect();
    };
  }, []);

  const scrollBar = (direction: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: direction === 'left' ? -160 : 160, behavior: 'smooth' });
  };
  const [emrOpen,    setEmrOpen]    = useState(false);
  const { openCompanion, closeCompanion: _closeCompanion, isWindowOpen: isEmrWindowOpen } = useCompanionWindow({
    // _closeCompanion unused — openCompanion/isEmrWindowOpen are both
    // actively used below, but nothing in this component ever explicitly
    // closes the EMR companion window (presumably left to the user
    // closing the actual browser window). Flagged, not deleted, in case
    // an explicit "Close EMR" action is wanted later.
    windowName: 'PathScribeEMRSidecar',
    preferredWidth: 1200,
    preferredHeight: 800,
  });
  const status = caseData?.status ?? 'draft';
  const isFinalized = status === 'finalized';
  const isPool = status === 'pool';

  // Batch 654: printing a report that is still in its release delay follows the Release Hold Print
  // Policy (allow, warn, supervisor, block). The decision is made where the print happens
  // (services/printing planReportPrint, in the report view and the Orchestration preview), so this
  // button only opens the view; viewing is never restricted.
  const isPendingRelease = status === 'pending-release';
  const handlePrintClick = () => { onPrint?.(); };

  // Safety requirement: never let a stale patient's EMR keep showing
  // after the case changes. If a real companion window is currently
  // open, proactively navigate it to the new patient (reusing the same
  // window rather than leaving it stale or abruptly closing it) --
  // otherwise just close the embedded drawer fallback, which is safe by
  // construction (see EMRSidecarDrawer.tsx's key={patientId}).
  useEffect(() => {
    if (isEmrWindowOpen && caseData?.id) {
      // Batch 446: addressed by the case reference, never the MRN.
      void caseAddresses.addressOf(caseData.id, 'emr').then(address => { if (address) openCompanion(`${window.location.origin}${address}`); });
    }
    setEmrOpen(false);
  }, [caseData?.id, caseData?.patient?.mrn, isEmrWindowOpen, openCompanion]);

  const handleLaunchEMR = async () => {
    const address = caseData?.id ? await caseAddresses.addressOf(caseData.id, 'emr') : null;
    if (!address) { setEmrOpen(true); return; }
    const targetUrl = `${window.location.origin}${address}`;
    // Dev-only testing shortcut: append ?forceEmrFallback=1 to the URL
    // to skip straight to the embedded drawer without even attempting
    // openCompanion(). Useful for quickly iterating on the drawer's UI
    // without repeatedly toggling browser popup-block settings -- does
    // NOT test the real blocked-detection logic. To verify that for
    // real, block popups for this site in the browser's own settings
    // and launch normally (no query param) -- see this function's
    // header note for the real end-to-end test.
    if (new URLSearchParams(window.location.search).get('forceEmrFallback') === '1') {
      setEmrOpen(true);
      return;
    }
    const result = await openCompanion(targetUrl);
    if (result === 'blocked') setEmrOpen(true);
  };

  const hasCodes = ((caseData as any)?.coding?.icd10?.length ?? 0) > 0 ||
                   ((caseData as any)?.coding?.snomed?.length ?? 0) > 0;
  const codesColor = hasCodes ? '#0891B2' : '#f59e0b';
  const allFinalized = (caseData?.synopticReports?.length ?? 0) > 0 &&
    caseData!.synopticReports!.every(r => r.status === 'finalized');

  // Stage 1 gate: grossing is still in progress if any GrossingReportInstance
  // is still 'draft'. While true, none of Generate Report/Save Draft/
  // Finalize/Finalize & Next make sense — there's no synoptic data yet for
  // any of them to act on. This is a real gap this component had before:
  // it didn't know about 'accessioned'/'gross-complete' statuses at all, so
  // Finalize/Finalize & Next would have shown immediately and incorrectly
  // for a case still sitting at the PA bench.
  const hasUnfinishedGrossing = (caseData?.grossingReports ?? []).some((g: any) => g.status === 'draft');
  const showGrossComplete = !isPool && !isFinalized && hasUnfinishedGrossing;
  // Batch 650: one decision draws these buttons and answers their voice / keyboard commands (services/reports/bottomBarActions.ts).
  const vis = bottomBarVisibility({ status, reportingMode: caseData?.reportingMode, allFinalized, hasUnfinishedGrossing });
  const { decide } = useCapabilities();
  useBottomBarActionEvents({
    state: { status, reportingMode: caseData?.reportingMode, allFinalized, hasUnfinishedGrossing },
    synopticFitPending,
    signOutAllowed: !!decide('surgical:report:sign-out', { caseId: caseData?.id ?? null, facilityId: caseData?.order?.facilityId ?? null })?.allowed,
    revisionAny: revisionAvailability.any,
    handlers: { signOutCase: onSignOut, signOutAndNext: onSignOutAndNext, finalize: onFinalize, finalizeAndNext: onFinalizeAndNext, requestAmendment: onRequestAmendment, history: onHistory, codes: onCodes },
  });
  // Dynamic label/icon: "Update Gross" if any of the draft instances about
  // to be finalized were previously finalized before (i.e. this is a
  // correction, not a first pass) — previouslyFinalized survives the
  // automatic draft-revert-on-edit, so this stays accurate even after
  // that revert. See GrossingReportInstance.previouslyFinalized in Case.ts.
  const isUpdateGross = (caseData?.grossingReports ?? [])
    .some((g: any) => g.status === 'draft' && g.previouslyFinalized);

  return (
    <>
    <div className="ps-bab-bar">
      <div className="ps-bottombar-scroll-wrapper">
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scrollBar('left')}
            aria-label={t('bottomActionBar.nav.scrollLeftAria')}
            className="ps-bottombar-scroll-arrow ps-bottombar-scroll-arrow--left"
          >
            ‹
          </button>
        )}
        <div ref={scrollRef} className="ps-bottombar-scroll">
          <ActionButton onClick={onPreviousCase} variant="outline" color="#94a3b8" title={t('bottomActionBar.nav.prevTitle')}>{t('bottomActionBar.nav.prevLabel')}</ActionButton>
          <ActionButton onClick={onNextCase} variant="outline" color="#94a3b8" title={t('bottomActionBar.nav.nextTitle')}>{t('bottomActionBar.nav.nextLabel')}</ActionButton>
          <Divider />

          {/* LAUNCH EMR BUTTON */}
          <ActionButton onClick={handleLaunchEMR} variant="outline" color="#0ea5e9" title={t('bottomActionBar.emr.title')}>
            🌐 {t('bottomActionBar.emr.label')}
          </ActionButton>

          {/* Hide delegate/review/flags/codes for pool cases — not yet assigned */}
          {!isPool && <>
            <ActionButton onClick={() => onDelegate?.()} variant="outline" color="#a78bfa" title={t('bottomActionBar.actions.delegateTitle')}>👥 {t('bottomActionBar.actions.delegateLabel')}</ActionButton>
            <ActionButton onClick={() => onTeam?.()} variant="outline" color="#0891B2" title={t('bottomActionBar.actions.teamTitle')}>👤 {t('bottomActionBar.actions.teamLabel')}</ActionButton>
            <ActionButton onClick={() => setReviewOpen(true)} variant="outline" color="#a78bfa" title={t('bottomActionBar.actions.reviewTitle')}>🔍 {t('bottomActionBar.actions.reviewLabel')}</ActionButton>
            <ActionButton onClick={() => setConsultOpen(true)} variant="outline" color="#f87171" title={t('bottomActionBar.actions.consultTitle')}>🌐 {t('bottomActionBar.actions.consultLabel')}</ActionButton>
            <ActionButton onClick={() => onHistory?.()} variant="outline" color="#0891B2">📋 {t('bottomActionBar.actions.historyLabel')}</ActionButton>
            <ActionButton onClick={() => onFlags?.()} variant="outline" color="#f59e0b">🚩 {t('bottomActionBar.actions.flagsLabel')}</ActionButton>
            {onFlagForMdt && (
              <CapabilityButton
                capability="case:tumor-board:flag"
                context={{ caseId: caseData?.id ?? null }}
                className="ps-bab-action-btn ps-bab-action-btn--outline ps-bab-action-btn--flag-mdt"
                title={t('bottomActionBar.actions.flagForMdtTitle')}
                onClick={onFlagForMdt}
              >
                ⚕️ {t('bottomActionBar.actions.flagForMdtLabel')}
              </CapabilityButton>
            )}
            <ActionButton onClick={() => onCodes?.()} variant="outline" color={codesColor}># {t('bottomActionBar.actions.codesLabel')}</ActionButton>
          </>}
        </div>
        {canScrollRight && (
          <>
            <div className="ps-bottombar-fade" aria-hidden="true" />
            <button
              type="button"
              onClick={() => scrollBar('right')}
              aria-label={t('bottomActionBar.nav.scrollRightAria')}
              className="ps-bottombar-scroll-arrow ps-bottombar-scroll-arrow--right"
            >
              ›
            </button>
          </>
        )}
      </div>

      <div className="ps-bab-right-cluster">
        {/* Real feature, per direct follow-up: "Move Manage Reprints...
            Bottom-Right Action Cluster... Place Manage Reports as the
            leftmost button in the bottom-right cluster." Placed
            outside every case-state branch below (pool/finalized/
            grossing/normal) rather than inside any single one of
            them — the original button (MaterialTreePanel.tsx, before
            this move) was available unconditionally whenever a case
            was open; case state deciding whether a lost/damaged label
            can be reprinted would have been a real, unintended
            regression, not a UI cleanup. */}
        {onOpenReprints && (
          <>
            <ActionButton onClick={onOpenReprints} variant="outline" color="#94a3b8" title={t('bottomActionBar.reprints.title')}>
              🖨️ {t('bottomActionBar.reprints.label')}
            </ActionButton>
            <Divider />
          </>
        )}
        {/* Batch 609 (PS-44): attach images to the report; greyed without report:case-images:attach.
            Batch 742: the case's Attachments badge, "Attachments (n)" or "Add Attachments", opens the Attachments window. */}
        {onAttachImages && !isPool && (
          <CapabilityButton
            capability="report:case-images:attach"
            context={{ caseId: caseData?.id ?? null, facilityId: caseData?.order?.facilityId ?? null }}
            className="ps-bab-action-btn ps-bab-action-btn--outline"
            title={t('bottomActionBar.attachments.title')}
            onClick={onAttachImages}
          >
            📎 {attachmentCount > 0 ? t('bottomActionBar.attachments.label', { number: attachmentCount }) : t('bottomActionBar.attachments.add')}
          </CapabilityButton>
        )}
        {/* Pool case — show Claim button only */}
        {isPool && (
          // Batch 649: greyed without case:pool:claim (acceptPoolCase checks it again).
          <CapabilityButton capability="case:pool:claim" context={{ caseId: caseData?.id ?? null }} className="ps-bab-action-btn ps-bab-action-btn--solid ps-bab-action-btn--claim" onClick={() => setClaimOpen(true)}>
            ✋ {t('bottomActionBar.pool.claimLabel')}
          </CapabilityButton>
        )}

        {/* Stage 1 — grossing still in progress: Gross Complete plus a real
            way to persist partial progress. Real fix, per direct report:
            a PA working through several specimens in one case (fill in
            Specimen A, want to save and move to B/C without the whole
            case's grossing being done yet) previously had no option here
            at all except Gross Complete itself — which isn't a plain
            save, it's a finalizing transition that triggers AI evaluation
            of diagnostic synoptic assignment. saveDraftInternal (Save
            Draft's real handler) is generic — it persists whatever
            caseData holds at the moment, with no dependency on which
            phase the case is in — so it's exactly as safe here as it is
            once grossing is done. */}
        {showGrossComplete && (
          <>
            <ActionButton onClick={onSaveDraft} variant="outline" color={isDirty ? '#38bdf8' : '#94a3b8'} title={t('bottomActionBar.grossing.saveDraftTitle')}>
              💾 {t('bottomActionBar.grossing.saveDraftLabel')}
            </ActionButton>
            <Divider />
            <ActionButton
              onClick={() => onGrossComplete?.()}
              variant="solid"
              color={isUpdateGross ? '#f59e0b' : '#34d399'}
              hoverColor={isUpdateGross ? '#d97706' : '#10b981'}
              title={isUpdateGross
                ? t('bottomActionBar.grossing.updateGrossTitle')
                : t('bottomActionBar.grossing.grossCompleteTitle')}
            >
              {isUpdateGross ? `✏️ ${t('bottomActionBar.grossing.updateGrossLabel')}` : `✅ ${t('bottomActionBar.grossing.grossCompleteLabel')}`}
            </ActionButton>
          </>
        )}

        {/* Normal reporting actions — hidden for pool cases AND while grossing is still in progress */}
        {!isPool && !isFinalized && !showGrossComplete && (
          <>
            {/* Generate Report — shown when Orchestrator is wired */}
            {onGenerateReport && (
              <>
                {isGenerating ? (
                  <ActionButton onClick={() => onAbortGenerate?.()} variant="outline" color="#ef4444" title={t('bottomActionBar.report.abortTitle')}>
                    ✕ {t('bottomActionBar.report.abortLabel')}
                  </ActionButton>
                ) : (
                  <ActionButton onClick={onGenerateReport} variant="outline" color="#38bdf8" title={t('bottomActionBar.report.genReportTitle')}>
                    ⚡ {t('bottomActionBar.report.genReportLabel')}
                  </ActionButton>
                )}
                <Divider />
              </>
            )}
            <ActionButton onClick={onSaveDraft} variant="outline" color={isDirty ? '#38bdf8' : '#94a3b8'} title={t('bottomActionBar.report.saveDraftTitle')}>💾 {t('bottomActionBar.report.saveDraftLabel')}</ActionButton>
            <ActionButton onClick={onSaveAndNext} variant="outline" color={isDirty ? '#38bdf8' : '#94a3b8'} title={t('bottomActionBar.report.saveNextTitle')}>💾 {t('bottomActionBar.report.saveNextLabel')}</ActionButton>
            {/* Real, per direct guidance ("Path B Execution Plan" — Step
                3, "What to do with Finalize"): retired for Orchestration
                Mode, since Sign Out Case now safely handles the trainee
                early-return, the attending's real sign-out + buffer
                start, and the cron-equivalent's own real dispatch —
                Finalize has no remaining real purpose there. Stays real
                and active for Assist Mode's own distinct handoff to the
                external LIS, unaffected by any of this. */}
            {vis.finalize && (
              <>
                <Divider />
                {/* Batch 649: greyed without surgical:report:sign-out (authorizeSurgicalSignOut checks it again). */}
                <CapabilityButton
                  capability="surgical:report:sign-out"
                  context={{ caseId: caseData?.id ?? null, facilityId: caseData?.order?.facilityId ?? null }}
                  className="ps-bab-action-btn ps-bab-action-btn--outline ps-bab-action-btn--finalize"
                  onClick={onFinalize}
                  disabled={synopticFitPending}
                  disabledTitle={t('bottomActionBar.common.synopticPendingTitle')}
                  title={t('bottomActionBar.report.finalizeTitle')}
                >
                  🔒 {t('bottomActionBar.report.finalizeLabel')}
                </CapabilityButton>
                <CapabilityButton
                  capability="surgical:report:sign-out"
                  context={{ caseId: caseData?.id ?? null, facilityId: caseData?.order?.facilityId ?? null }}
                  className="ps-bab-action-btn ps-bab-action-btn--outline ps-bab-action-btn--finalize"
                  onClick={onFinalizeAndNext}
                  disabled={synopticFitPending}
                  disabledTitle={t('bottomActionBar.common.synopticPendingTitle')}
                  title={t('bottomActionBar.report.finalizeNextTitle')}
                >
                  🔒 {t('bottomActionBar.report.finalizeNextLabel')}
                </CapabilityButton>
              </>
            )}
          </>
        )}
        {!isPool && caseData?.reportingMode !== 'assist' && onReleasePreliminary && !resolveIsFinalStatus(caseData?.status) && (
          // Real, per direct research and design recommendation: shown
          // "at any point before final verification" — deliberately
          // NOT gated on allFinalized/isFinalized the way Sign Out
          // Case is. The whole real point of this action is releasing
          // a partial, in-progress finding early (the acute leukemia
          // bone marrow case, the transplant kidney showing acute
          // rejection) — requiring the case to already be complete
          // first would defeat it entirely.
          // Batch 649: greyed without surgical:preliminary:release (releasePreliminaryReport checks it again).
          <CapabilityButton
            capability="surgical:preliminary:release"
            context={{ caseId: caseData?.id ?? null }}
            className="ps-bab-action-btn ps-bab-action-btn--outline ps-bab-action-btn--prelim"
            onClick={onReleasePreliminary}
            title={t('bottomActionBar.release.preliminaryTitle')}
          >
            📤 {t('bottomActionBar.release.preliminaryLabel')}
          </CapabilityButton>
        )}
        {vis.signOutCase &&
          // Real, critical fix, per direct specification: Post-Sign-Out
          // Release Buffer. A real, serious bug found during a
          // post-delivery gap review: this button calls onSignOut →
          // handleSignOutConfirm → finalizeSignOut(), a genuinely
          // separate code path from onFinalize's own finalizeCase() —
          // the one this whole feature's buffer logic lives in.
          // finalizeSignOut() has zero awareness of the release buffer
          // and unconditionally creates a new ReportVersionRecord
          // (isOrchestrationMode's own 'initial_signout'/'amendment'
          // trigger) regardless of it. Before this fix, a case already
          // sitting in the recall window (status === 'pending-release')
          // still showed this button — clicking it would have created
          // a real, externally-dispatchable report version while
          // completely bypassing the very buffer the pathologist might
          // still be relying on to recall and correct their report.
          (
          // Batch 649: greyed without surgical:report:sign-out (authorizeSurgicalSignOut checks it again).
          <CapabilityButton
            capability="surgical:report:sign-out"
            context={{ caseId: caseData?.id ?? null, facilityId: caseData?.order?.facilityId ?? null }}
            className="ps-bab-action-btn ps-bab-action-btn--solid ps-bab-action-btn--sign-out"
            onClick={onSignOut}
            disabled={synopticFitPending}
            disabledTitle={t('bottomActionBar.common.synopticPendingTitle')}
          >
            ✍️ {t('bottomActionBar.signOut.label')}
          </CapabilityButton>
        )}
        {vis.signOutAndNext && onSignOutAndNext && (
          // Batch 664 (Pete): the same sign-out (checks, signature window), then the next case in the queue.
          <CapabilityButton
            capability="surgical:report:sign-out"
            context={{ caseId: caseData?.id ?? null, facilityId: caseData?.order?.facilityId ?? null }}
            className="ps-bab-action-btn ps-bab-action-btn--outline ps-bab-action-btn--sign-out"
            onClick={onSignOutAndNext}
            disabled={synopticFitPending}
            disabledTitle={t('bottomActionBar.common.synopticPendingTitle')}
            title={t('bottomActionBar.signOut.nextTitle')}
          >
            ✍️ {t('bottomActionBar.signOut.nextLabel')} →
          </CapabilityButton>
        )}
        {!isPool && caseData?.reportingMode === 'assist' && (allFinalized || isFinalized) && (
          <span className="ps-bab-assist-complete" title={t('bottomActionBar.assistComplete.title')}>
            ✓ {t('bottomActionBar.assistComplete.label')}
          </span>
        )}
        {!isPool && caseData?.reportingMode === 'assist' && (allFinalized || isFinalized || isPendingRelease) && onPrint && (
          // Batch 495 (PS-283 §4.2.4): greyed without report:case-report:print;
          // the print itself is checked in services/printing/reportPrintGate.ts.
          <CapabilityButton
            capability="report:case-report:print"
            context={{ caseId: caseData?.id ?? null, facilityId: caseData?.order?.facilityId ?? null }}
            className="ps-bab-action-btn ps-bab-action-btn--outline ps-bab-action-btn--print"
            title={isPendingRelease ? t('bottomActionBar.print.restrictedTitle') : t('bottomActionBar.print.normalTitle')}
            onClick={handlePrintClick}
          >
            🖨 {t('bottomActionBar.print.label')}
          </CapabilityButton>
        )}
        {vis.requestAmendment && onRequestAmendment && (
          <ActionButton
            onClick={onRequestAmendment}
            variant="outline"
            color="#d97706"
            disabled={!revisionAvailability.any}
            title={revisionEntryDisabledTitle(revisionAvailability) ?? t('bottomActionBar.amendment.title')}
          >
            ✏️ {t('bottomActionBar.amendment.label')}
          </ActionButton>
        )}
        {followUpOffer?.kind === 'offer' && onMarkFollowUp && (
          <CapabilityButton
            capability="case:follow-up:expect"
            context={{ caseId: caseData?.id ?? null, facilityId: caseData?.order?.facilityId ?? null }}
            className="ps-bab-action-btn ps-bab-action-btn--outline ps-bab-action-btn--follow-up"
            title={t('bottomActionBar.followUp.markTitle')}
            onClick={onMarkFollowUp}
          >
            🔁 {t('bottomActionBar.followUp.markLabel')}
          </CapabilityButton>
        )}
        {followUpOffer?.kind === 'marked' && (
          <span className="ps-bab-follow-up-marked" title={t('bottomActionBar.followUp.markedTitle', { name: followUpOffer.expectation.markedByName })}>
            🔁 {t('bottomActionBar.followUp.marked', { date: formatDate(followUpOffer.expectation.window.endsAt, i18n.language) })}
          </span>
        )}
      </div>
    </div>

    <RequestReviewModal
      isOpen={reviewOpen}
      caseId={caseData?.id ?? ''}
      caseLabel={caseData ? `${caseData.patient?.lastName}, ${caseData.patient?.firstName}` : undefined}
      fromUserId={user?.id ?? 'u1'}
      fromUserName={user?.name ?? 'Unknown'}
      onClose={() => setReviewOpen(false)}
    />

    <ExternalConsultAccessModal
      isOpen={consultOpen}
      caseData={caseData}
      currentUserId={user?.id ?? 'u1'}
      currentUserName={user?.name ?? 'Unknown'}
      onClose={() => setConsultOpen(false)}
    />

    <PoolClaimModal
      isOpen={claimOpen && isPool}
      caseId={caseData?.id ?? null}
      caseSummary={caseData ? `${caseData.patient?.lastName}, ${caseData.patient?.firstName} — ${caseData.specimens?.[0]?.description ?? ''}` : undefined}
      poolName={t('bottomActionBar.pool.nameSuffix', { hospitalId: (caseData as any)?.originHospitalId ?? 'MFT' })}
      currentUserId={user?.id ?? 'u1'}
      currentUserName={user?.name ?? 'Unknown'}
      continueToReport={true}
      restoreVoiceContext={VOICE_CONTEXT.SYNOPTIC}
      onAccepted={() => setClaimOpen(false)}
      onPassed={() => {
        setClaimOpen(false);
        navigate('/worklist');
      }}
      onClose={() => setClaimOpen(false)}
    />

    <EMRSidecarDrawer
      isOpen={emrOpen}
      patientId={caseData?.patient?.mrn ?? '100004'}
      onClose={() => setEmrOpen(false)}
    />
    </>
  );
};

export default BottomActionBar;
