// src/pages/CytologyWorklistPage/CytologyWorklistPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real Cytotech worklist — "their assigned cases and pool worklist,"
// per direct guidance. Deliberately NOT a second worklist destination
// for Pathologists — cytology cases needing pathologist review are
// real, separate, later work to surface within the existing
// /worklist instead (per direct guidance's own explicit constraint:
// "I do not want to send the Pathologist to multiple worklist").
//
// Real, per direct follow-up: three real tiles, matching the existing
// WorklistPage.tsx's own real stat-tile pattern (a colored, glowing,
// count-bearing tile row) more closely than this page's earlier,
// plainer tab design — My Worklist (default), Pool, and a genuinely
// new third tile, QC, for cases already flagged for mandatory QC and
// awaiting that specific review. QC is a real, distinct pool from the
// general one: a never-yet-screened case sits in Pool; a case
// already screened but flagged for mandatory rescreen sits in QC —
// conflating them would hide exactly the cases CLIA/CAP most need
// visible and actionable.
//
// Real, deliberate reuse rather than a parallel system: case
// visibility via caseRouter.listCasesForUser (the same real, secure,
// tenant-scoped entry point WorklistPage.tsx uses), assignment via the
// same real Case.order.assignedTo/CaseStatus.pool fields, and pool
// claim/pass via the same real claimPoolCase/acceptPoolCase/passPoolCase
// service functions WorklistPage.tsx's own PoolClaimModal calls.
//
// Batch 440 (Pete, Oct 2): the GYN QC / Rescreen tile is an unassigned,
// shared queue (loadQcRescreenQueue): every QC-flagged GYN specimen the
// viewer may open. One they did the primary screen on is shown with a
// badge and an "Ask a colleague" message button; the save refuses their
// own rescreen. A pathologist doing the QC (rare) uses the same tile. Positive GYN cases waiting for a
// pathologist are on the main Worklist's Cytology Review tile, not here.
// The page's text is translated (cytologyWorklist.*).
//
// Batch 441: the page renders and dispatches only. Loading, per-facility
// routing and which tab lists what are services/cytology/cytologyWorklist.ts
// and cytologyWorklistLive.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { useOpenCase } from '@/hooks/useOpenCase';
import { acceptPoolCase, availableOrganSites, claimPoolCase, cytologyWorklistView, loadCytologyWorklist, passPoolCase, showScreeningHoursPanel, simulatedHpvResultEvent, type CytologyDomain, type CytologyWorklistCase, type CytologyWorklistTab } from '@/services';
import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import '../../pathscribe.css';
import { useAuth } from '@contexts/AuthContext';
import { processInboundHpvResultEvent } from '@/services/hl7/processInboundHpvResultEvent';
import type { Case } from '@/types/case/Case';
import { formatDisplayNameForLanguage } from '@/utils/personName';
import { useSynopticFlags } from '@/pages/Synoptic/useSynopticFlags';
import FlagManagerModal from '@/components/Flags/FlagManagerModal';
import { openComposeTo } from '@/utils/openComposeTo';
import { clickableContainer, pressable } from '@/utils/a11y/pressable';
import { LoadingState } from '@/components/Common/LoadingState';
import { useCapabilities } from '@/hooks/useCapabilities';
import { useSystemConfig } from '@/contexts/SystemConfigContext';
import { useScreeningHoursSignOff } from './hooks/useScreeningHoursSignOff';
import { ScreeningHoursPanel } from './components/ScreeningHoursPanel';
import { useCytologyWorkloadSummary } from './hooks/useCytologyWorkloadSummary';
import { CytologyWorkloadCounter } from './components/CytologyWorkloadCounter';
import { showCytologyWorkloadCounter } from '@/services/cytology/cytologyWorkloadSummary';

type Tab = CytologyWorklistTab;

// Real, per direct guidance's own confirmed domain split: "Because GYN
// and Non-GYN have completely different regulatory workflows, Bethesda
// classifications, cell block tracking, and sub-filter needs, trying
// to jam both into a single tile set will force awkward UI
// compromises." Two real, separate primary tile sets, swapped by the
// real domain switcher below — not a single, shared row relabeled.
const GYN_TILES: { key: Tab; label: string; color: string }[] = [
  { key: 'assigned',   label: 'assigned',   color: '#009E73' },
  { key: 'pool',       label: 'pool',       color: '#F97316' },
  { key: 'qc',         label: 'qc',         color: '#EF4444' },
  { key: 'hpv_triage', label: 'hpvTriage',  color: '#8B5CF6' },
];
const NON_GYN_TILES: { key: Tab; label: string; color: string }[] = [
  { key: 'assigned', label: 'assigned',     color: '#009E73' },
  { key: 'pool',     label: 'unassignedPool', color: '#F97316' },
  { key: 'cell_block_ancillary_pending', label: 'cellBlockAncillaryPending', color: '#EAB308' },
  { key: 'rose_active', label: 'roseActive', color: '#EC4899' },
];
// Real, per direct guidance's own earlier resolution: these serve a
// genuinely different, QA/compliance-aggregate purpose than the real,
// day-to-day GYN/Non-GYN screening domains above — kept as their own,
// separate secondary section, not folded into either domain's own
// primary tile set.
// Batch 440: `label` is the key under cytologyWorklist.tiles.
const QA_COMPLIANCE_TILES: { key: Tab; label: string; color: string }[] = [
  { key: 'recall_needed', label: 'recallNeeded',  color: '#DC2626' },
  { key: 'csms_qa',       label: 'csmsQa',        color: '#0EA5E9' },
  { key: 'retrospective_lookback', label: 'retrospectiveLookback', color: '#A855F7' },
  { key: 'post_signout_peer_review', label: 'postSignOutPeerReview', color: '#14B8A6' },
  { key: 'histology_correlation', label: 'histologyCorrelation', color: '#F472B6' },
  { key: 'follow_up_due', label: 'followUpDue', color: '#EF4444' },
  { key: 'scans_completed', label: 'scansCompleted', color: '#22C55E' },
];

/** The empty-list text key (cytologyWorklist.empty.*) for each tab. */
const EMPTY_KEY: Record<Tab, string> = {
  assigned: 'assigned', pool: 'pool', qc: 'qc', hpv_triage: 'hpvTriage', recall_needed: 'recallNeeded',
  csms_qa: 'csmsQa', retrospective_lookback: 'retrospectiveLookback', post_signout_peer_review: 'postSignOutPeerReview',
  histology_correlation: 'histologyCorrelation', scans_completed: 'scansCompleted',
  cell_block_ancillary_pending: 'cellBlockAncillaryPending', rose_active: 'roseActive',
  follow_up_due: 'followUpDue',
};


const CytologyWorklistPage: React.FC = () => {
  const { user } = useAuth();
  const openCasePage = useOpenCase();
  const { t, i18n } = useTranslation();
  // Real, per direct guidance's own explicit spec: "Home > Cytology
  // Workspace" breadcrumb navigation across Cytology sub-routes —
  // reuses the app's own real, existing BreadcrumbContext mechanism
  // (the same one BatchManagementPage.tsx and others already use),
  // not a new, separate breadcrumb system.
  const { pushCrumb } = useBreadcrumb();
  useEffect(() => { pushCrumb(t('cytologyWorklist.breadcrumbLabel'), '/cytology-worklist'); }, [pushCrumb, t]);
  // Batch 572 (F7, option C): today's screening hours and the end-of-day sign-off, for those who screen.
  const capabilities = useCapabilities();
  const systemConfig = useSystemConfig().config;
  const facilityTimezone = systemConfig.facilityTimezone;
  const screeningHours = useScreeningHoursSignOff(user, capabilities.has('cytology:screening-hours:sign-off'), facilityTimezone);
  // Batch 574: reviews and slides over the last 24 hours, for the people whose screening counts toward the limit.
  // No case open here: the lab's jurisdiction decides whether the limit applies.
  const workloadSummary = useCytologyWorkloadSummary(user?.id, { jurisdiction: systemConfig.jurisdiction }, capabilities.has('cytology:screening-hours:sign-off'));
  const [rows, setRows]             = useState<CytologyWorklistCase[]>([]);
  const [triageRows, setTriageRows] = useState<Case[]>([]);
  const [scansCompletedRows, setScansCompletedRows] = useState<Case[]>([]);
  const [recallRows, setRecallRows] = useState<Case[]>([]);
  const [qcRows, setQcRows]         = useState<CytologyWorklistCase[]>([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState<Tab>('assigned');
  const [domain, setDomain] = useState<CytologyDomain>('gyn');
  // Real, per direct guidance's own Organ/Site Quick-Filter Chips ask
  // — a real, additional narrowing within the current Non-GYN tab
  // (My Worklist/Pool/etc.), not a separate tab of its own. Reset
  // whenever the domain changes so a stale GYN-side filter never
  // silently persists into Non-GYN or vice versa.
  const [organSiteFilter, setOrganSiteFilter] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  // Real, per direct guidance: "The flag can be removed like other
  // case or specimen flags." useSynopticFlags/FlagManagerModal are
  // already fully generic (despite the "Synoptic" name) — reused
  // directly here rather than building a second, cytology-specific
  // flag-removal mechanism. The hook's own caseId argument is only
  // ever used as a real, rarely-needed accession-number fallback;
  // openFlagManager takes the real, actual case to manage directly.
  const { flagCaseData, flagDefinitions, showFlagManager, setShowFlagManager, openFlagManager, onApplyFlags, onRemoveFlag } = useSynopticFlags('');

  // Batch 441: fetched and decided by services/cytology/cytologyWorklistLive.ts.
  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await loadCytologyWorklist(user.id);
      setRows(data.rows);
      setQcRows(data.qcRows);
      setTriageRows(data.triageRows);
      setScansCompletedRows(data.scansCompletedRows);
      setRecallRows(data.recallRows);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  // Batch 441: what each tab lists, and the counts (services/cytology/cytologyWorklist.ts).
  const { lists, counts } = cytologyWorklistView(
    { rows, qcRows, triageCount: triageRows.length, recallCount: recallRows.length, scansCompletedCount: scansCompletedRows.length },
    domain, organSiteFilter, user?.id,
  );
  const visible = (lists as Record<string, typeof rows>)[activeTab] ?? lists.csms_qa;

  // Real, per direct correction: "for the molecular platform they
  // would be sending results through your engine which would
  // transform that into a json payload... no one is resulting an HPV
  // in the application." This button does not mutate the specimen
  // itself — it builds the real, already-translated
  // HpvResultEventPayload a real interface engine would deliver, and
  // routes it through the exact same processInboundHpvResultEvent
  // this app would use for a genuine, external delivery (services/hl7/).
  // The button exists because no real, external molecular platform is
  // actually connected in this environment — it simulates the
  // delivery, not the result itself.
  const handleRecordHpvResult = async (c: Case, result: 'Positive' | 'Negative') => {
    const event = simulatedHpvResultEvent(c, result, crypto.randomUUID(), new Date().toISOString());
    if (!event) return;
    await processInboundHpvResultEvent(event);
    await load();
  };

  const handleClaim = async (caseId: string) => {
    if (!user?.id) return;
    setClaimingId(caseId);
    try {
      const claim = await claimPoolCase(caseId, user.id);
      if (claim.success) {
        // PS-71 (Batch 458): if someone else accepted it first, say so (the claim isn't theirs to keep).
        try { await acceptPoolCase(caseId, user.id, user.name); }
        catch { toast.warning(t('poolClaimModal.takenMessage')); }
        await load();
      }
    } finally {
      setClaimingId(null);
    }
  };

  const handlePass = async (caseId: string) => {
    if (!user?.id) return;
    setClaimingId(caseId);
    try {
      const claim = await claimPoolCase(caseId, user.id);
      if (claim.success) {
        await passPoolCase(caseId);
        await load();
      }
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <>
        <main className="ps-cytoworklist-main">
          <h1 className="ps-cytoworklist-title">{t('cytologyWorklist.title')}</h1>
          <p className="ps-cytoworklist-subtitle">
            {t('cytologyWorklist.subtitle')}
          </p>

          {/* Real, per direct guidance's own confirmed domain switcher —
              GYN vs Non-GYN, each with its own real, separate tile set. */}
          <div className="ps-cytoworklist-domain-switch">
            {(['gyn', 'non_gyn'] as CytologyDomain[]).map(d => (
              <button key={d} onClick={() => { setDomain(d); setActiveTab('assigned'); setOrganSiteFilter(null); }}
                className={`ps-cytoworklist-domain-btn ${domain === d ? 'ps-cytoworklist-domain-btn--active' : 'ps-cytoworklist-domain-btn--inactive'}`}>
                {d === 'gyn' ? t('cytologyWorklist.domain.gyn') : t('cytologyWorklist.domain.nonGyn')}
              </button>
            ))}
          </div>

          {/* Real, per direct guidance's own Organ/Site Quick-Filter
              Chips ask — real, dynamic chips for whichever organSite
              values genuinely appear among this lab's own real
              Non-GYN cases right now, never a fixed, always-shown
              list that could include a site with zero real cases. */}
          {domain === 'non_gyn' && (() => {
            const availableSites = availableOrganSites(rows);
            if (availableSites.length === 0) return null;
            return (
              <div className="ps-cytoworklist-organsite-row">
                <button onClick={() => setOrganSiteFilter(null)}
                  className={`ps-cytoworklist-pill ${!organSiteFilter ? 'ps-cytoworklist-pill--all-active' : 'ps-cytoworklist-pill--all-inactive'}`}>
                  {t('cytologyWorklist.organSite.all')}
                </button>
                {availableSites.map(site => (
                  <button key={site} onClick={() => setOrganSiteFilter(site)}
                    className={`ps-cytoworklist-pill ${organSiteFilter === site ? 'ps-cytoworklist-pill--site-active' : 'ps-cytoworklist-pill--site-inactive'}`}>
                    {t(`cytologyWorklist.organSite.${site}`)}
                  </button>
                ))}
              </div>
            );
          })()}

          {showCytologyWorkloadCounter(workloadSummary) && <CytologyWorkloadCounter summary={workloadSummary} />}
          {/* Batch 574: yesterday first, while it still needs signing off (a night shift's first part). */}
          {screeningHours.yesterday && (
            <ScreeningHoursPanel which="yesterday" day={screeningHours.yesterday} saving={screeningHours.saving}
              onSignOff={(h, r, n) => screeningHours.signOff(screeningHours.yesterday!.date, h, r, n)} />
          )}
          {screeningHours.today && showScreeningHoursPanel(screeningHours.today) && (
            <ScreeningHoursPanel day={screeningHours.today} saving={screeningHours.saving}
              onSignOff={(h, r, n) => screeningHours.signOff(screeningHours.today!.date, h, r, n)} />
          )}

          {/* Real, three-tile row — matches the existing WorklistPage.tsx's own real stat-tile pattern */}
          <div className="ps-cytoworklist-tiles">
            {(domain === 'gyn' ? GYN_TILES : NON_GYN_TILES).map(tile => {
              const active = activeTab === tile.key;
              return (
                <button key={tile.key} type="button" onClick={() => setActiveTab(tile.key)} aria-pressed={active}
                  className={`ps-cytoworklist-tile ${active ? 'ps-cytoworklist-tile--active' : 'ps-cytoworklist-tile--inactive'}`}
                  style={{ '--ps-hue': tile.color } as React.CSSProperties}>
                  <div className="ps-cytoworklist-tile-count">{counts[tile.key]}</div>
                  <div className="ps-cytoworklist-tile-label">{t(`cytologyWorklist.tiles.${tile.label}`)}</div>
                </button>
              );
            })}
          </div>

          {/* Real, per direct guidance's own earlier resolution: QA &
              Compliance stays its own, separate section — a genuinely
              different, aggregate purpose than either screening domain
              above, not folded into GYN or Non-GYN specifically. */}
          <div className="ps-cytoworklist-qa-section">
            <div className="ps-cytoworklist-qa-section-label">
              {t('cytologyWorklist.qaComplianceSectionLabel')}
            </div>
            <div className="ps-cytoworklist-qa-tiles">
              {QA_COMPLIANCE_TILES.map(tile => {
                const active = activeTab === tile.key;
                return (
                  <button key={tile.key} onClick={() => setActiveTab(tile.key)}
                    className={`ps-cytoworklist-qa-tile ${active ? 'ps-cytoworklist-qa-tile--active' : 'ps-cytoworklist-qa-tile--inactive'}`}
                    style={{ '--ps-hue': tile.color } as React.CSSProperties}>
                    <div className="ps-cytoworklist-qa-tile-count">{counts[tile.key]}</div>
                    <div className="ps-cytoworklist-qa-tile-label">{t(`cytologyWorklist.tiles.${tile.label}`)}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {loading && <LoadingState variant="inline" className="ps-cytoworklist-empty" label={t('cytologyWorklist.loading')} />}

          {!loading && activeTab === 'hpv_triage' && (
            triageRows.length === 0 ? (
              <div className="ps-cytoworklist-empty">{t('cytologyWorklist.empty.hpvTriage')}</div>
            ) : (
              <div className="ps-cytoworklist-list">
                {triageRows.map((c, i) => (
                  <div key={c.id} className={`ps-cytoworklist-row ${i === triageRows.length - 1 ? 'ps-cytoworklist-row--last' : ''}`}>
                    <div className="ps-cytoworklist-row-main">
                      <div className="ps-cytoworklist-row-title" data-phi="name">{formatDisplayNameForLanguage(c.patient as any, i18n.language) || c.patient?.mrn || t('cytologyWorklist.unknownPatient')}</div>
                      <div className="ps-cytoworklist-row-subtitle" data-phi="true">{t('cytologyWorklist.rowSubtitle', { caseId: c.id, mrn: c.patient?.mrn ?? '—' })}</div>
                    </div>
                    <span className="ps-cytoworklist-badge ps-cytoworklist-badge--violet">{t('cytologyWorklist.badges.awaitingHpv')}</span>
                    <div className="ps-cytoworklist-row-actions">
                      <button onClick={() => handleRecordHpvResult(c, 'Negative')} className="ps-cytoworklist-action-btn">{t('cytologyWorklist.actions.recordHpvNegative')}</button>
                      <button onClick={() => handleRecordHpvResult(c, 'Positive')} className="ps-cytoworklist-action-btn--violet">{t('cytologyWorklist.actions.recordHpvPositive')}</button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Real, per direct guidance's own Australia/NZ NCSP recall rule —
              a positive self-collected result can never itself produce a
              screenable slide; this tile is the real, visible surface for
              the recall recommendation instead of the case silently
              vanishing from every real cytology tile. */}
          {!loading && activeTab === 'recall_needed' && (
            recallRows.length === 0 ? (
              <div className="ps-cytoworklist-empty">{t('cytologyWorklist.empty.recallNeeded')}</div>
            ) : (
              <div className="ps-cytoworklist-list">
                {recallRows.map((c, i) => (
                  <div key={c.id} className={`ps-cytoworklist-row ${i === recallRows.length - 1 ? 'ps-cytoworklist-row--last' : ''}`}>
                    <div className="ps-cytoworklist-row-main">
                      <div className="ps-cytoworklist-row-title" data-phi="name">{formatDisplayNameForLanguage(c.patient as any, i18n.language) || c.patient?.mrn || t('cytologyWorklist.unknownPatient')}</div>
                      <div className="ps-cytoworklist-row-subtitle" data-phi="true">{t('cytologyWorklist.rowSubtitle', { caseId: c.id, mrn: c.patient?.mrn ?? '—' })}</div>
                    </div>
                    <span className="ps-cytoworklist-badge ps-cytoworklist-badge--red-strong">
                      {t('cytologyWorklist.badges.recallNeeded')}
                    </span>
                  </div>
                ))}
              </div>
            )
          )}

          {!loading && activeTab === 'scans_completed' && (
            scansCompletedRows.length === 0 ? (
              <div className="ps-cytoworklist-empty">{t('cytologyWorklist.empty.scansCompleted')}</div>
            ) : (
              <div className="ps-cytoworklist-list">
                {scansCompletedRows.map((c, i) => (
                  <div key={c.id} className={`ps-cytoworklist-row ps-cytoworklist-row--clickable ${i === scansCompletedRows.length - 1 ? 'ps-cytoworklist-row--last' : ''}`}
                    {...pressable(() => void openCasePage(c.id, 'cytology'))}>
                    <div className="ps-cytoworklist-row-main">
                      <div className="ps-cytoworklist-row-title" data-phi="name">{formatDisplayNameForLanguage(c.patient as any, i18n.language) || c.patient?.mrn || t('cytologyWorklist.unknownPatient')}</div>
                      <div className="ps-cytoworklist-row-subtitle" data-phi="true">{t('cytologyWorklist.rowSubtitle', { caseId: c.id, mrn: c.patient?.mrn ?? '—' })}</div>
                    </div>
                    <span className="ps-cytoworklist-badge ps-cytoworklist-badge--green">{t('cytologyWorklist.badges.scanComplete')}</span>
                  </div>
                ))}
              </div>
            )
          )}

          {!loading && activeTab !== 'hpv_triage' && activeTab !== 'recall_needed' && activeTab !== 'scans_completed' && visible.length === 0 && (
            <div className="ps-cytoworklist-empty">
              {t(`cytologyWorklist.empty.${EMPTY_KEY[activeTab]}`)}
            </div>
          )}

          {!loading && activeTab !== 'hpv_triage' && activeTab !== 'recall_needed' && activeTab !== 'scans_completed' && visible.length > 0 && (
            <div className="ps-cytoworklist-list">
              {visible.map((row, i) => {
                const c = row.caseData;
                const hasFinalDiagnosis = row.hasFinalDiagnosis;
                const title = formatDisplayNameForLanguage(c.patient as any, i18n.language) || c.patient?.mrn || t('cytologyWorklist.unknownPatient');
                return (
                  <div key={c.id}
                    // Batch 565: a pool row isn't clickable. Batch 566: these rows hold buttons of their own (flags,
                    // ask a colleague, claim), so the row is a mouse shortcut only and its title is the button that
                    // opens the case (axe nested-interactive).
                    {...clickableContainer(activeTab !== 'pool' ? () => void openCasePage(c.id, 'cytology') : undefined)}
                    className={`ps-cytoworklist-row ${activeTab !== 'pool' ? 'ps-cytoworklist-row--clickable' : 'ps-cytoworklist-row--static'} ${i === visible.length - 1 ? 'ps-cytoworklist-row--last' : ''}`}>
                    <div className="ps-cytoworklist-row-main">
                      {activeTab !== 'pool' ? (
                        <button type="button" className="ps-cytoworklist-row-title ps-cytoworklist-row-open" data-phi="name"
                          onClick={e => { e.stopPropagation(); void openCasePage(c.id, 'cytology'); }}>
                          {title}
                        </button>
                      ) : (
                        <div className="ps-cytoworklist-row-title" data-phi="name">{title}</div>
                      )}
                      <div className="ps-cytoworklist-row-subtitle" data-phi="true">
                        {t('cytologyWorklist.rowSubtitle', { caseId: c.id, mrn: c.patient?.mrn ?? '—' })}
                      </div>
                    </div>
                    {activeTab === 'qc' && (
                      <span className="ps-cytoworklist-badge ps-cytoworklist-badge--red">
                        {row.qcReason === 'targeted_high_risk' ? t('cytologyWorklist.badges.qcHighRisk') : t('cytologyWorklist.badges.qcRandom')}
                      </span>
                    )}
                    {activeTab === 'qc' && row.ownPrimaryScreen && (
                      <>
                        <span className="ps-cytoworklist-badge ps-cytoworklist-badge--amber">
                          {t('cytologyWorklist.badges.ownPrimaryScreen')}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); openComposeTo('', t('cytologyWorklist.askColleagueSubject', { caseId: c.id })); }}
                          className="ps-cytoworklist-badge ps-cytoworklist-badge--gray-action"
                          title={t('cytologyWorklist.actions.askColleagueTitle')}
                        >
                          {t('cytologyWorklist.actions.askColleague')}
                        </button>
                      </>
                    )}
                    {activeTab === 'csms_qa' && (
                      <>
                        <span className="ps-cytoworklist-badge ps-cytoworklist-badge--sky">
                          {t('cytologyWorklist.badges.csmsVerification')}
                        </span>
                        <button
                          onClick={e => { e.stopPropagation(); openFlagManager(c); }}
                          className="ps-cytoworklist-badge ps-cytoworklist-badge--gray-action"
                        >
                          {t('cytologyWorklist.actions.manageFlags')}
                        </button>
                      </>
                    )}
                    {row.aiScreeningResult?.slideTriage && (
                      <span
                        className={`ps-cytoworklist-badge ${row.aiScreeningResult.slideTriage.reviewRecommended ? 'ps-cytoworklist-badge--amber' : 'ps-cytoworklist-badge--green'}`}
                        title={t('cytologyWorklist.badges.aiTriageTitle')}>
                        {row.aiScreeningResult.slideTriage.rankGroup != null && row.aiScreeningResult.slideTriage.totalRankGroups != null
                          ? t(row.aiScreeningResult.slideTriage.reviewRecommended ? 'cytologyWorklist.badges.aiReviewRanked' : 'cytologyWorklist.badges.aiNoReviewRanked', { rank: row.aiScreeningResult.slideTriage.rankGroup, total: row.aiScreeningResult.slideTriage.totalRankGroups })
                          : t(row.aiScreeningResult.slideTriage.reviewRecommended ? 'cytologyWorklist.badges.aiReview' : 'cytologyWorklist.badges.aiNoReview')}
                      </span>
                    )}
                    {!row.aiScreeningResult?.slideTriage && (row.aiScreeningResult?.findings?.length ?? 0) > 0 && (
                      <span className="ps-cytoworklist-badge ps-cytoworklist-badge--cyan"
                        title={t('cytologyWorklist.badges.aiFovTitle')}>
                        {t('cytologyWorklist.badges.aiFov', { count: row.aiScreeningResult!.findings.length })}
                      </span>
                    )}
                    <span className={`ps-cytoworklist-badge ${hasFinalDiagnosis ? 'ps-cytoworklist-badge--green' : 'ps-cytoworklist-badge--amber'}`}>
                      {hasFinalDiagnosis ? t('cytologyWorklist.badges.finalDiagnosis') : t('cytologyWorklist.badges.awaitingReview')}
                    </span>
                    {activeTab === 'pool' && (
                      <div className="ps-cytoworklist-row-actions">
                        <button onClick={(e) => { e.stopPropagation(); handlePass(c.id); }} disabled={claimingId === c.id}
                          className="ps-cytoworklist-action-btn">
                          {t('cytologyWorklist.actions.pass')}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleClaim(c.id); }} disabled={claimingId === c.id}
                          className="ps-cytoworklist-action-btn--claim">
                          {claimingId === c.id ? t('cytologyWorklist.actions.claiming') : t('cytologyWorklist.actions.claim')}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      {showFlagManager && flagCaseData && (
        <FlagManagerModal
          key={`flag-modal-${flagCaseData.id}`}
          caseData={flagCaseData as any}
          flagDefinitions={flagDefinitions}
          onApplyFlags={onApplyFlags}
          onRemoveFlag={onRemoveFlag}
          onDirtyChange={() => {}}
          onClose={() => { setShowFlagManager(false); load(); }}
        />
      )}
    </>
  );
};

export default CytologyWorklistPage;
