// src/pages/TumorBoardWorkspacePage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 489 (Module 1 of Pete's Tumor Board / MDT Workspace spec; PS-359
// follow-up). The dedicated board-nomination workspace: filters by Board
// Selection, Meeting Window, Case Status (default Pending Presentation),
// and Presenter, per Pete's own spec. All decision logic (filtering,
// sorting, the meeting-window date math, the session grouping below) lives
// in services/tumorBoard/ and hooks/useTumorBoardWorkspace.ts; this file
// only renders and dispatches.
//
// "Flag for MDT" itself is NOT initiated here — it's reached from the
// report page at sign-out (SynopticReportPage.tsx, wired to the
// previously-dead 'delegation.tumorBoard' voice/keyboard action), since
// that's where the case and its clinical context already are.
//
// Batch 494 (PS-359 follow-up — MDT Self-Service Assignment & Batching
// redesign, Pete, Oct 8): "This is an adjustment" to the plain flat-list
// queue Batch 489-493 shipped. Pete's own write-up: cases are tagged
// MDT-Pending (board + date, presenter left Null) rather than assigned a
// presenter up front; pathologists use a self-service dashboard — upcoming
// MDT dates as headers, unassigned/assigned cases listed under each — to
// claim a case themselves (or a coordinator/admin assigns one on a
// physician's behalf) when it's time to prep; a batch's cut-off "freezes"
// its case list a configured interval before the meeting; and the list can
// be viewed digitally or printed as a checklist. This page now renders
// `rows` grouped into board+date sessions
// (services/tumorBoard/tumorBoardSessionGrouping.ts) instead of one flat
// list, with a prominent "Claim" action alongside the existing admin-assist
// dropdown (still there — Pete's own spec keeps "administrative staff...
// rights to... manually assign cases if a physician requests help").
//
// Also fixed here (a real, disclosed gap found while rebuilding this
// page): every control below the status dropdown (presenter, meeting
// date, meeting time) was gated on `case:tumor-board:manage` alone, even
// though Batch 493 moved exactly those fields to the narrower
// case:tumor-board:schedule — a custom "Admin Assistant" role granted only
// that capability (the whole point of Batch 493's split) would have hit a
// server-enforced success but a UI that still showed every one of those
// controls disabled. Scheduling controls now check case:tumor-board:schedule;
// only the status dropdown still checks case:tumor-board:manage.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../pathscribe.css';
import { useAuth } from '@contexts/AuthContext';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { useSystemConfig } from '@/contexts/SystemConfigContext';
import { useOpenCase } from '@/hooks/useOpenCase';
import { useCapabilities } from '@/hooks/useCapabilities';
import { useTumorBoardWorkspace } from '@/hooks/useTumorBoardWorkspace';
import { TUMOR_BOARD_NAMES, TUMOR_BOARD_CASE_STATUSES, type TumorBoardName, type TumorBoardCaseStatus, type TumorBoardManagedStatus } from '@/services/tumorBoard/ITumorBoardService';
import { MEETING_WINDOWS, type MeetingWindow } from '@/services/tumorBoard/tumorBoardWorkspaceFilters';
import { groupTumorBoardRowsBySession } from '@/services/tumorBoard/tumorBoardSessionGrouping';
import { isPresenterEligibleRoles } from '@/services/tumorBoard/tumorBoardPresenterEligibility';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { isServiceOk } from '@/services/types';
import { formatDate } from '@/utils/formatDate';
import { formatDisplayNameForLanguage } from '@/utils/personName';

// Batch 491: 'Dismissed' is never offered on the plain status dropdown —
// it always goes through the dedicated Dismiss action below, with its own
// mandatory reason and its own, narrower capability.
const MANAGED_STATUSES = TUMOR_BOARD_CASE_STATUSES.filter(s => s !== 'Dismissed');

const TumorBoardWorkspacePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { has } = useCapabilities();
  const { config } = useSystemConfig();
  const openCasePage = useOpenCase();
  const { pushCrumb } = useBreadcrumb();
  // Batch 492: this page never registered a breadcrumb at all (unlike every
  // sibling standalone page — IntraopQueuePage, EmbeddingStationPage, etc.),
  // so the breadcrumb bar stayed hidden here (AppShell only renders it once
  // crumbs.length > 1).
  useEffect(() => { pushCrumb(t('tumorBoard.pageTitle'), '/tumor-board'); }, [pushCrumb, t]);
  const { filters, setFilters, rows, presenters, cutoffHours, loading, error, updateListing, claimListing, dismissListing } = useTumorBoardWorkspace(config.facilityTimezone);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [dismissing, setDismissing] = useState<{ id: string; reason: string } | null>(null);
  const [dismissError, setDismissError] = useState<string | null>(null);
  const canManage = (caseId: string) => has('case:tumor-board:manage', { caseId });
  const canSchedule = (caseId: string) => has('case:tumor-board:schedule', { caseId });
  const currentUserCanPresent = !!user && 'role' in user && isPresenterEligibleRoles([(user as { role: string }).role]);

  const boardLabel = (b: TumorBoardName) => t(`tumorBoard.boards.${b}`);
  const statusLabel = (s: TumorBoardCaseStatus) => t(`tumorBoard.statuses.${s}`);
  const windowLabel = (w: MeetingWindow) => t(`tumorBoard.meetingWindows.${w}`);

  const onStatusChange = async (id: string, status: TumorBoardManagedStatus) => {
    if (!user) return;
    setSavingId(id);
    await updateListing(id, { status }, user.id, user.name);
    setSavingId(null);
  };

  const onPresenterChange = async (id: string, presenterUserId: string) => {
    if (!user) return;
    const presenter = presenters.find(p => p.id === presenterUserId);
    setSavingId(id);
    await updateListing(id, {
      presenterUserId: presenterUserId || null,
      presenterUserName: presenter ? `${presenter.firstName} ${presenter.lastName}` : null,
    }, user.id, user.name);
    setSavingId(null);
  };

  const onClaim = async (id: string) => {
    if (!user) return;
    setSavingId(id);
    await claimListing(id, user.id, user.name);
    setSavingId(null);
  };

  const onMeetingDateChange = async (id: string, meetingDate: string) => {
    if (!user) return;
    setSavingId(id);
    await updateListing(id, { meetingDate: meetingDate || null }, user.id, user.name);
    setSavingId(null);
  };

  // Batch 493 (Pete, Oct 8): the meeting-time field a real calendar invite
  // needs — see services/tumorBoard/notifyTumorBoardAssignment.ts.
  const onMeetingTimeChange = async (id: string, meetingTime: string) => {
    if (!user) return;
    setSavingId(id);
    await updateListing(id, { meetingTime: meetingTime || null }, user.id, user.name);
    setSavingId(null);
  };

  // Batch 494: Pete's own spec — "Users can choose to view the list
  // digitally or print a hard-copy checklist for their desk or lab
  // bench." Plain window.print(); the filter bar and every per-row action
  // control are hidden for print via the .ps-tb-no-print class
  // (pathscribe.css's own @media print rules — CLAUDE.md rule 1, no
  // inline styles).
  const sessionGroups = groupTumorBoardRowsBySession(rows, cutoffHours, new Date(), config.facilityTimezone);

  return (
    <div className="ps-qcqueue-page ps-tb-page">
      <div className="ps-tb-page-header">
        <h1 className="ps-qcqueue-title">{t('tumorBoard.pageTitle')}</h1>
        <button className="ps-conf-btn-secondary ps-tb-no-print" onClick={() => window.print()}>{t('tumorBoard.printBtn')}</button>
      </div>
      {error && <div className="ps-qcqueue-error" role="alert">{error}</div>}

      <div className="ps-tb-filter-bar ps-tb-no-print">
        <select className="ps-conf-select" value={filters.board} onChange={e => setFilters({ ...filters, board: e.target.value as TumorBoardName | 'all' })} aria-label={t('tumorBoard.filters.board')}>
          <option value="all">{t('tumorBoard.filters.allBoards')}</option>
          {TUMOR_BOARD_NAMES.map(b => <option key={b} value={b}>{boardLabel(b)}</option>)}
        </select>

        <select className="ps-conf-select" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value as TumorBoardCaseStatus | 'all' })} aria-label={t('tumorBoard.filters.status')}>
          <option value="all">{t('tumorBoard.filters.allStatuses')}</option>
          {TUMOR_BOARD_CASE_STATUSES.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </select>

        <select className="ps-conf-select" value={filters.presenterUserId} onChange={e => setFilters({ ...filters, presenterUserId: e.target.value })} aria-label={t('tumorBoard.filters.presenter')}>
          <option value="all">{t('tumorBoard.filters.allPresenters')}</option>
          {presenters.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
        </select>

        <select className="ps-conf-select" value={filters.meetingWindow} onChange={e => setFilters({ ...filters, meetingWindow: e.target.value as MeetingWindow })} aria-label={t('tumorBoard.filters.meetingWindow')}>
          {MEETING_WINDOWS.map(w => <option key={w} value={w}>{windowLabel(w)}</option>)}
        </select>

        <select className="ps-conf-select" value={filters.sortBy} onChange={e => setFilters({ ...filters, sortBy: e.target.value as 'meetingDate' | 'updatedAt' })} aria-label={t('tumorBoard.filters.sortBy')}>
          <option value="meetingDate">{t('tumorBoard.filters.sortByMeetingDate')}</option>
          <option value="updatedAt">{t('tumorBoard.filters.sortByUpdatedAt')}</option>
        </select>
      </div>

      {sessionGroups.map(group => (
        <section key={group.key} className="ps-tb-session">
          <div className="ps-tb-session-header">
            <span className="ps-tb-session-title">
              {group.board ? `${boardLabel(group.board)} — ${formatDate(group.meetingDate, i18n.language)}${group.meetingTime ? ` ${group.meetingTime}` : ''}` : t('tumorBoard.session.unscheduled')}
            </span>
            {group.board && (
              <span className={group.locked ? 'ps-qcqueue-badge-pill ps-tb-badge-locked' : 'ps-qcqueue-badge-pill ps-tb-badge-open'}>
                {group.locked ? t('tumorBoard.session.locked') : t('tumorBoard.session.open')}
              </span>
            )}
            {group.unassignedCount > 0 && (
              <span className="ps-qcqueue-badge-pill">{t('tumorBoard.session.unassignedCount', { count: group.unassignedCount })}</span>
            )}
          </div>

          <div className="ps-qcqueue-list">
            {group.rows.map(({ listing, patientName }) => (
              <div key={listing.id} className="ps-qcqueue-row ps-tb-row">
                <div className="ps-qcqueue-row-patient" data-phi="name">
                  {(patientName && formatDisplayNameForLanguage(patientName, i18n.language)) || listing.caseId}
                  <span className="ps-qcqueue-row-accession" data-phi="accession">{listing.caseAccession}</span>
                </div>
                <div className="ps-qcqueue-row-badges">
                  <span className="ps-qcqueue-badge-pill">{boardLabel(listing.board)}</span>
                  {/* Batch 491: the transparent-audit-trail driver — where a
                      listing came from, and (for a rule) what it matched on. */}
                  <span className="ps-qcqueue-badge-pill" title={listing.triggerReason}>
                    {t(`tumorBoard.row.source.${listing.source}`)}
                  </span>
                  {/* Batch 494: "logs the timestamp of when the case was
                      claimed and by whom" — shown right on the row, not
                      just in the audit log. */}
                  {listing.presenterUserId && listing.presenterAssignedByUserName && (
                    <span className="ps-qcqueue-badge-pill" title={listing.presenterAssignedAt}>
                      {t('tumorBoard.row.claimedBy', { name: listing.presenterAssignedByUserName })}
                    </span>
                  )}
                </div>
                <div className="ps-tb-row-controls ps-tb-no-print">
                  <select
                    className="ps-conf-select"
                    disabled={savingId === listing.id || !canManage(listing.caseId) || listing.status === 'Dismissed'}
                    value={listing.status === 'Dismissed' ? '' : listing.status}
                    onChange={e => void onStatusChange(listing.id, e.target.value as TumorBoardManagedStatus)}
                    aria-label={t('tumorBoard.filters.status')}
                  >
                    {listing.status === 'Dismissed' && <option value="">{statusLabel('Dismissed')}</option>}
                    {MANAGED_STATUSES.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
                  </select>
                  {/* Batch 494: the self-service claim — a prominent,
                      one-click action for a presenter-eligible signed-in
                      user when the case has no presenter yet, alongside
                      (not instead of) the admin-assist dropdown below. */}
                  {!listing.presenterUserId && currentUserCanPresent && (
                    <button
                      className="ps-conf-btn-primary ps-tb-claim-btn"
                      disabled={savingId === listing.id || !canSchedule(listing.caseId)}
                      onClick={() => void onClaim(listing.id)}
                    >
                      {t('tumorBoard.row.claimBtn')}
                    </button>
                  )}
                  <select className="ps-conf-select" disabled={savingId === listing.id || !canSchedule(listing.caseId)} value={listing.presenterUserId ?? ''} onChange={e => void onPresenterChange(listing.id, e.target.value)} aria-label={t('tumorBoard.filters.presenter')}>
                    <option value="">{t('tumorBoard.row.noPresenter')}</option>
                    {presenters.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
                  </select>
                  <input
                    type="date"
                    className="ps-conf-input"
                    disabled={savingId === listing.id || !canSchedule(listing.caseId)}
                    value={listing.meetingDate ?? ''}
                    onChange={e => void onMeetingDateChange(listing.id, e.target.value)}
                    aria-label={t('tumorBoard.row.meetingDate')}
                  />
                  <input
                    type="time"
                    className="ps-conf-input"
                    disabled={savingId === listing.id || !canSchedule(listing.caseId) || !listing.meetingDate}
                    value={listing.meetingTime ?? ''}
                    onChange={e => void onMeetingTimeChange(listing.id, e.target.value)}
                    aria-label={t('tumorBoard.row.meetingTime')}
                    title={!listing.meetingDate ? t('tumorBoard.row.meetingTimeNeedsDate') : undefined}
                  />
                </div>
                <div className="ps-qcqueue-row-actions ps-tb-no-print">
                  {listing.status !== 'Dismissed' && listing.status !== 'Cancelled' && (
                    <CapabilityButton
                      capability="case:tumor-board:dismiss"
                      className="ps-conf-btn-secondary"
                      context={{ caseId: listing.caseId }}
                      onClick={() => { setDismissError(null); setDismissing({ id: listing.id, reason: '' }); }}
                    >
                      {t('tumorBoard.row.dismissBtn')}
                    </CapabilityButton>
                  )}
                  <button className="ps-conf-btn-secondary" onClick={() => void openCasePage(listing.caseId, 'report', { state: { returnTo: '/tumor-board' } })}>
                    {t('tumorBoard.row.openCaseBtn')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
      {!loading && rows.length === 0 && <div className="ps-conf-empty-row">{t('tumorBoard.emptyRow')}</div>}

      {dismissing && (
        <div data-capture-hide="true" className="ps-conf-backdrop" onClick={() => setDismissing(null)}>
          <div className="ps-conf-modal" onClick={e => e.stopPropagation()}>
            <div className="ps-conf-modal-header">{t('tumorBoard.dismissModal.title')}</div>
            <div className="ps-conf-modal-body">
              <label className="ps-conf-label" htmlFor="tb-dismiss-reason">{t('tumorBoard.dismissModal.reasonLabel')}</label>
              <textarea
                id="tb-dismiss-reason"
                className="ps-conf-input"
                value={dismissing.reason}
                onChange={e => setDismissing({ ...dismissing, reason: e.target.value })}
              />
              {dismissError && <div className="ps-conf-hint ps-conf-hint--warning">{dismissError}</div>}
            </div>
            <div className="ps-conf-modal-footer">
              <button className="ps-conf-btn-secondary" onClick={() => setDismissing(null)}>{t('tumorBoard.dismissModal.cancelBtn')}</button>
              <button
                className="ps-conf-btn-primary"
                disabled={!dismissing.reason.trim()}
                onClick={async () => {
                  if (!user) return;
                  const res = await dismissListing(dismissing.id, dismissing.reason, user.id, user.name);
                  if (isServiceOk(res)) setDismissing(null);
                  else setDismissError(t(`tumorBoard.dismissModal.errors.${res.error}`, { defaultValue: t('tumorBoard.dismissModal.errors.saveFailed') }));
                }}
              >
                {t('tumorBoard.dismissModal.submitBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TumorBoardWorkspacePage;
