// src/pages/WorklistPage/WorklistPage.tsx
import { useOpenCase } from '@/hooks/useOpenCase';
import { useReviewQueueCounts } from '@/hooks/useReviewQueueCounts';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { caseRouter } from '@/services/cases/CaseRouter';
import { externalResourceService, facilityService, actionRegistryService, wsiScanBatchService, aiScreeningResultService, specimenDictionaryService, flagService, caseViewTrackingService } from '@/services';
import { resolvePerformingLabFacilityId } from '@/services/facilities/IFacilityService';
import { getSessionUser } from '@/services/auth/caseAccessControl';
import type { Case } from '@/types/case/Case';
import { useNavigate, useLocation } from 'react-router';
import { useLogout } from '@hooks/useLogout';
import WorklistTable      from '../../components/Worklist/WorklistTable';
import ResourcesModal     from './ResourcesModal';
import { toQuickLinks, type ResourceQuickLink } from '@/services/externalResources/externalResourceUrl';
import LogoutWarningModal from '@/components/Common/LogoutWarningModal';
import { VOICE_CONTEXT } from '../../constants/systemActions';
import { PoolClaimModal } from '../../components/Worklist/PoolClaimModal';
import { useAuth } from '@/contexts/AuthContext';
import { useSystemConfig } from '@/contexts/SystemConfigContext';
import { AmendedAddendaTriageTile } from './AmendedAddendaTriageTile';
import { PendingGrossingTriageTile } from './PendingGrossingTriageTile';
import { amendmentService, lisAmendmentNoticeService, informalReviewService, delegationService, peerReviewService, loadCytologyReviewTray, takeCytologyReview, loadFollowUpCaseIdsForUser, loadOpenSlaBreaches, type SlaBreachKind } from '@/services';
import ConfirmModal from '@/components/Common/ConfirmModal';
import { pendingDelegationsTo } from '@/services/delegations/delegationRules';
import type { AmendmentType } from '@/types/reports/AmendmentRecord';
import type { WsiScanSlide } from '@/services/digitalPathology/IWsiScanBatchService';
import type { AiScreeningResult } from '@/types/digitalPathology/AiScreeningResult';
import { worklistViews, resolveWorklistView, type WorklistView } from '@/services/screens/screenAccess';
import { useCapabilities } from '@/hooks/useCapabilities';
import CytologyQcQueuePage from '../CytologyQcQueuePage';
import SurgicalQaWorklistPage from '../SurgicalQaWorklistPage';
import { computeWorklistTileCounts, filterWorklistCases, type WorklistCountDeps } from '@/services/worklist/worklistTileCounts';
import { usePoolAssignmentTimeout } from './hooks/usePoolAssignmentTimeout';
import { SlideDetailDrawer } from '@/components/Worklist/SlideDetailDrawer';
import { resolveDigitalReadinessBadge, resolveDpTriageBadge } from '@/services/digitalPathology/resolveWorklistDpBadges';
import { Flag }           from '@/services/flags/IFlagService';
import { initialWorklistContext } from '@/services/worklist/worklistContext'; import { getSessionFlag, setSessionFlag } from '@/utils/uiPreferences'; import { ROW_COMMAND_EVENTS, resolveRowCommand } from '@/services/worklist/rowCommands';

// One map for the page title above the table and every filter tile's label, so the two cannot drift apart.
// Filter-state keys ('all', 'urgent', ...) drive filtering and routing; only the displayed label is resolved through i18n.
const FILTER_LABEL_KEY: Record<string, string> = {
  all:           'worklistPage.filterLabel.all',
  urgent:        'worklistPage.filterLabel.urgent',
  pool:          'worklistPage.filterLabel.pool',
  // Real feature, per direct follow-up: "The Tile titles are getting
  // cut off with no ... Maybe consider abbreviation." Shortened the
  // real worst offenders (longest labels, most likely to actually
  // need it) rather than every label indiscriminately — a label that
  // already fits doesn't need shortening just because others do.
  // 'Amend & Addenda' keeps the same, deliberate both-types clarity
  // the original 'Amendment & Addenda' wording was fixed to convey
  // (see the Worklist Filters item this was built for) — just
  // shortened the one long word, not dropped either type.
  delegated:     'worklistPage.filterLabel.delegated',
  countersign:   'worklistPage.filterLabel.countersign',
  collaborating: 'worklistPage.filterLabel.collaborating',
  // Real feature, per direct specification: Post-Sign-Out Release
  // Buffer. Same real "queue that's specifically mine" pattern as
  // countersign above — where a pathologist finds a case they might
  // need to recall before it releases.
  pendingrelease: 'worklistPage.filterLabel.pendingrelease',
  // Real, per direct guidance ("Yes we should scope 'Return to
  // Trainee'/'Reject with Notes'... one unified tile instead of
  // two"): deliberately one, role-neutral tile — combines "returned
  // to me" (resident) and "returned by me, still awaiting revision"
  // (attending) into a single real filter, rather than two
  // permanently-visible tiles most viewers would only ever see one
  // side of.
  needsrevision: 'worklistPage.filterLabel.needsrevision',
  inprogress:    'worklistPage.filterLabel.inprogress',
  draft:         'worklistPage.filterLabel.draft',
  finalizing:    'worklistPage.filterLabel.finalizing',
  amended:       'worklistPage.filterLabel.amended',
  informalreview: 'worklistPage.filterLabel.informalreview',
  peerreview:    'worklistPage.filterLabel.peerreview',
  followup:      'worklistPage.filterLabel.followup',
  cytologyreview: 'worklistPage.filterLabel.cytologyreview',
  completed:     'worklistPage.filterLabel.completed',
  physician:     'worklistPage.filterLabel.physician',
  accessioned:   'worklistPage.filterLabel.accessioned',
  grosscomplete: 'worklistPage.filterLabel.grosscomplete',
  // Real feature, per direct follow-up: "putting a case on Hold at
  // the case level makes sense if there is something truly wrong...
  // add a tile in their worklist for Cases on Hold."
  onhold:        'worklistPage.filterLabel.onhold',
  // Real feature, per direct follow-up: "I want a DP Tile to filter
  // away non DP cases."
  dp:            'worklistPage.filterLabel.dp',
  // Real, per direct follow-up recalling a real, prior requirement
  // ("I do not want to send the Pathologist to multiple worklist").
  gyncyto:       'worklistPage.filterLabel.gyncyto',
  nongyncyto:    'worklistPage.filterLabel.nongyncyto',
  autopsy:       'worklistPage.filterLabel.autopsy',
  // Real, per direct follow-up recalling the messaging system's own
  // unread pattern.
  newcases:      'worklistPage.filterLabel.newcases',
};

const WorklistPage: React.FC = () => {
  const { t } = useTranslation();
  const handleLogout = useLogout();
  const { user } = useAuth();
  const { config } = useSystemConfig();
  // Batch 659: no audit hook here; a claim is audited by poolCaseActions and a case open by the report page.
  const navigate = useNavigate();
  const openCasePage = useOpenCase();
  const location  = useLocation();

  // Batch 396: synopticLoader.ts and FullReportPage.tsx no longer redirect
  // here with the restriction in the address; a case the reader can't open shows the neutral
  // "no access" screen instead (components/CaseUnavailable).

  // Batch 375 (Pete): the Cytology QC Peer Review Queue and Surgical
  // Post-Sign-Out QA live here as views beside the case list, shown to whoever
  // may open them (services/screens/screenAccess.ts). `?view=` picks one, so
  // the old /cytology-qc-queue and /surgical-qa-worklist addresses still land
  // on them. Until the user's capabilities are known, nothing is shown.
  const capabilities = useCapabilities();
  const allowedViews = worklistViews(c => capabilities.has(c));
  const [viewChoice, setViewChoice] = useState<WorklistView | null>(null);
  const view: WorklistView | null = capabilities.loading
    ? null
    : resolveWorklistView(viewChoice ?? new URLSearchParams(location.search).get('view'), allowedViews);
  const queueCounts = useReviewQueueCounts(
    { cytologyQc: allowedViews.includes('cytologyQc'), surgicalQa: allowedViews.includes('surgicalQa') },
    view,
  );

  // contextFilter: which data source (LIS or Outreach) — the "home" context
  // Sticky for the session — restored from the session flags on mount
  const [contextFilter, setContextFilter] = useState<'lis' | 'outreach'>(
    () => initialWorklistContext(location.search, getSessionFlag('ps_worklist_context')) // Batch 703: ?context= wins
  );
  // Persist whenever it changes
  React.useEffect(() => {
    setSessionFlag('ps_worklist_context', contextFilter);
  }, [contextFilter]);

  // Real, per direct follow-up ("Surg Path, Cytology and Autopsy...
  // almost belong together" — three real, established discipline
  // branches this app's own work already files under). Same real
  // per-session persistence as contextFilter right above.
  // 'all' is the real, unchanged default — "the worklist automatically
  // opens and had everything" stays true; branch narrowing is
  // something a real user opts into, not the default.
  const [branchFilter, setBranchFilter] = useState<'all' | 'surgpath' | 'cytology' | 'autopsy'>(
    () => (getSessionFlag('ps_worklist_branch') as 'all' | 'surgpath' | 'cytology' | 'autopsy' | null) ?? 'all'
  );
  React.useEffect(() => {
    setSessionFlag('ps_worklist_branch', branchFilter);
  }, [branchFilter]);

  // activeFilter:  which sub-filter within that context
  const [activeFilter, setActiveFilter]       = useState<'all' | 'completed' | 'urgent' | 'physician' | 'pool' | 'delegated' | 'inprogress' | 'amended' | 'draft' | 'finalizing' | 'accessioned' | 'grosscomplete' | 'countersign' | 'pendingrelease' | 'needsrevision' | 'informalreview' | 'peerreview' | 'cytologyreview' | 'onhold' | 'dp' | 'gyncyto' | 'nongyncyto' | 'autopsy' | 'newcases' | 'followup' | 'collaborating'>('all');
  const [realCases, setRealCases]             = useState<Case[]>([]);
  usePoolAssignmentTimeout(realCases, setRealCases);

  const [delegatedToMeCount, setDelegatedToMeCount] = useState(0);
  const [delegatedCaseIds, setDelegatedCaseIds]     = useState<string[]>([]);
  // Amendment & Addenda — live open drafts + pending LIS notices, not a
  // static status string. Replaces the old c.status === 'amended' check,
  // which could only ever catch a case mid-amendment and completely
  // missed open addendum drafts (the S26-4401 gap). Same two calls
  // AmendedAddendaTriageTile already makes — see
  // AMENDMENT_STATUS_REDESIGN_BRIEF.md.
  // Real feature, per direct follow-up: "we could segment the filter
  // results into those subgroups... Amendment and Correction at the
  // top followed by Addenda." Changed from a bare Set<string> to a
  // Map carrying each case's real revision type — needed to actually
  // group the filtered results, not just know which cases matched.
  // 'notice' covers LisAmendmentNotice records specifically: those are
  // pending_review LIS-detected changes the pathologist hasn't yet
  // decided how to act on — genuinely not yet any of amendment/
  // addendum/correction, not a type to guess at.
  const [amendmentAddendaCaseIds, setAmendmentAddendaCaseIds] = useState<Map<string, AmendmentType | 'notice'>>(new Map());
  // Real, per direct follow-up ("some cases will have DP, others may
  // not") — same, single worklist a pathologist already uses, not a
  // second, separate page. Both maps are genuinely sparse.
  const [wsiSlidesByCaseId, setWsiSlidesByCaseId] = useState<Map<string, WsiScanSlide[]>>(new Map());
  const [dpResultByCaseId, setDpResultByCaseId] = useState<Map<string, AiScreeningResult>>(new Map());
  const [dpDrawerCaseId, setDpDrawerCaseId] = useState<string | null>(null);
  // Real, per direct follow-up recalling a real, prior requirement
  // ("I do not want to send the Pathologist to multiple worklist")
  // — GYN Cytology / Non-GYN Cytology-FNA tiles need each case's own
  // real specimen category, which lives only on the specimen
  // dictionary entry, not on Specimen itself.
  const [specimenDictionary, setSpecimenDictionary] = useState<Pick<import('@/services/specimenDictionary/specimenTypes').SpecimenEntry, 'id' | 'specimenCategory'>[]>([]);
  // Real, per direct follow-up recalling the messaging system's own
  // unread pattern (Message.isRead) — the real, full set of case ids
  // this real user has ever opened, refetched whenever the route
  // changes so a case just opened elsewhere and returned to already
  // reflects as "seen."
  const [viewedCaseIds, setViewedCaseIds] = useState<Set<string>>(new Set());
  // Real feature, per direct follow-up: "I want to queue these
  // informal requests on the worklist with a Tile." Real, pending
  // InformalReviewRequest records assigned to the current user as
  // reviewer - a genuinely separate concept from amendmentAddendaCaseIds
  // above (which tracks amendment/addendum/correction work, not
  // informal peer-review asks).
  const [informalReviewCaseIds, setInformalReviewCaseIds] = useState<Set<string>>(new Set());
  // Batch 439 (PS-144): cases with a peer review waiting on this pathologist
  // (their independent read, or a consensus they are part of).
  const [peerReviewCaseIds, setPeerReviewCaseIds] = useState<Set<string>>(new Set());
  // Batch 454: my signed-out cases with a follow-up due soon or overdue.
  const [followUpCaseIds, setFollowUpCaseIds] = useState<Set<string>>(new Set());
  // Batch 610 (#164): open cases past a client SLA target right now (set in Configuration → System → Client SLA).
  const [slaBreaches, setSlaBreaches] = useState<ReadonlyMap<string, SlaBreachKind>>(new Map());
  // Batch 440: positive GYN cytology waiting for a pathologist — the open
  // ones anyone may take, plus the viewer's own (loadCytologyReviewTray).
  // Kept apart from realCases so open cases don't join the viewer's All list.
  const [cytologyReviewCases, setCytologyReviewCases] = useState<Case[]>([]);
  const [cytologyReviewState, setCytologyReviewState] = useState<Map<string, 'open' | 'mine'>>(new Map());
  const [cytologyTake, setCytologyTake] = useState<{ caseId: string; error?: string } | null>(null);
  const [physicianFilter, setPhysicianFilter] = useState<string>('');
  const [physicianPrompt, setPhysicianPrompt] = useState<string | null>(null);
  const [isResourcesOpen, setIsResourcesOpen] = useState(false);
  const [showLogoutWarning, setShowLogoutWarning] = useState(false);
  const CURRENT_USER_ID   = user?.id   ?? 'PATH-001';
  const CURRENT_USER_NAME = user?.name ?? 'Dr. Sarah Johnson';

  // Height for the table container: from its top edge to the bottom of the window.
  // Batch 395: re-measured whenever the window or anything above the table
  // changes size, so the table always reaches the bottom of the window.
  // Batch 416 (Pete: "too much dead space in the worklist"): the table fills
  // the space left below the tiles with CSS (.ps-table-scroll-wrap--fill), not a
  // measured height. This page is exactly window-height, so the measurement
  // never heard that the tiles above had changed and stuck at its 400 px start.
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Pool claim modal state
  const [claimModal, setClaimModal] = useState<{ caseId: string; summary: string; poolName: string } | null>(null);

  // Flag definitions — needed by WorklistTable's (now-unused but still
  // accepted) flagDefinitions prop, and by FlagManagerModal.
  const [allFlags,           setAllFlags]           = useState<Flag[]>([]);

  useEffect(() => {
    flagService.getAll().then(res => {
      if (!res.ok) return;
      setAllFlags(res.data);
    }).catch(() => {});
  }, []);

  // Load cases via the unified CaseRouter (routes LIS / Orchestrator by case ID prefix).
  // Batch 452: the facility pediatric thresholds loaded here only fed the
  // tile counts' access check, which is gone (counts match the redacted rows).
  useEffect(() => {
    // Load cases from both services via the unified router
    caseRouter.listCasesForUser(user?.id ?? 'current')
      .then(setRealCases)
      .catch(() => {});
    // Load delegated-to-me count + case IDs
    // Batch 353: through delegationService (was the demo case service).
    delegationService.list().then(res => {
      const mine = res.ok ? pendingDelegationsTo(res.data, CURRENT_USER_ID) : [];
      setDelegatedToMeCount(mine.length);
      setDelegatedCaseIds(mine.map(d => d.caseId).filter(Boolean));
    }).catch(() => {});
  }, [user?.id, location.key, CURRENT_USER_ID]);

  useEffect(() => {
    if (!user?.id) { setAmendmentAddendaCaseIds(new Map()); return; }
    Promise.all([
      lisAmendmentNoticeService.getPendingForPathologist(user.id),
      amendmentService.getOpenDraftsForPathologist(user.id),
    ]).then(([noticesRes, draftsRes]) => {
      const ids = new Map<string, AmendmentType | 'notice'>();
      // Real, deliberate order: draft records set first, notices second
      // but only fill in a case that isn't already covered by a real
      // draft — a case with both an open draft AND a pending notice is
      // more accurately represented by the draft's own, real type than
      // by 'notice', since the pathologist has already started acting
      // on it.
      if (draftsRes.ok)  for (const d of draftsRes.data)  ids.set(d.caseId, d.type);
      if (noticesRes.ok) for (const n of noticesRes.data) if (!ids.has(n.caseId)) ids.set(n.caseId, 'notice');
      setAmendmentAddendaCaseIds(ids);
    }).catch(() => {});
  }, [user?.id, location.key]);

  // Real, per direct follow-up ("some cases will have DP, others may
  // not") — same bulk-fetch-then-Map-by-caseId pattern as
  // CytologyWorklistPage.tsx's own aiResultByCaseId, so every real
  // row's own lookup is O(1) rather than N+1 fetches. Most-recent
  // completed AiScreeningResult per case, since a case could in
  // principle carry more than one real AI screening order over its
  // own lifecycle. WsiScanBatch slides flattened by caseId across
  // every real batch, not just the most recent one, since a real
  // case's own slides can span multiple real batches.
  useEffect(() => {
    Promise.all([wsiScanBatchService.getAll(), aiScreeningResultService.getAll()]).then(([batchRes, aiRes]) => {
      if (batchRes.ok) {
        const slideMap = new Map<string, WsiScanSlide[]>();
        for (const batch of batchRes.data) {
          for (const slide of batch.slides) {
            const existing = slideMap.get(slide.caseId) ?? [];
            slideMap.set(slide.caseId, [...existing, slide]);
          }
        }
        setWsiSlidesByCaseId(slideMap);
      }
      if (aiRes.ok) {
        const resultMap = new Map<string, AiScreeningResult>();
        for (const r of aiRes.data) {
          if (r.status !== 'completed') continue;
          const existing = resultMap.get(r.caseId);
          if (!existing || (r.completedAt ?? '') > (existing.completedAt ?? '')) resultMap.set(r.caseId, r);
        }
        setDpResultByCaseId(resultMap);
      }
    }).catch(() => {});
  }, [location.key]);

  // Real, per direct follow-up recalling a real, prior requirement —
  // fetched once, same real dictionary CytologyWorklistPage.tsx
  // already fetches for the exact same real reason.
  useEffect(() => {
    specimenDictionaryService.getAll().then(res => {
      if (res.ok) setSpecimenDictionary(res.data);
    }).catch(() => {});
  }, [location.key]);

  useEffect(() => {
    if (!user?.id) { setViewedCaseIds(new Set()); return; }
    caseViewTrackingService.getViewedCaseIds(user.id).then(res => {
      if (res.ok) setViewedCaseIds(res.data);
    }).catch(() => {});
  }, [user?.id, location.key]);

  // Real feature, per direct follow-up: populates the Informal Review
  // tile's real, pending count/case set - same real
  // getPendingForReviewer() call the Worklist tile itself needs.
  useEffect(() => {
    if (!user?.id) { setInformalReviewCaseIds(new Set()); return; }
    informalReviewService.getPendingForReviewer(user.id).then(res => {
      if (res.ok) setInformalReviewCaseIds(new Set(res.data.map(r => r.caseId)));
    }).catch(() => {});
  }, [user?.id, location.key]);

  useEffect(() => {
    if (!user?.id) { setPeerReviewCaseIds(new Set()); return; }
    peerReviewService.getOpenForUser(user.id).then(res => {
      if (res.ok) setPeerReviewCaseIds(new Set(res.data.map(r => r.caseId)));
    }).catch(() => {});
  }, [user?.id, location.key]);

  useEffect(() => {
    if (!user?.id) { setFollowUpCaseIds(new Set()); return; }
    loadFollowUpCaseIdsForUser(user.id).then(setFollowUpCaseIds).catch(() => {});
  }, [user?.id, location.key]);

  // Batch 610 (#164): a client SLA breach on an open case, shown as a badge on its row.
  useEffect(() => {
    let cancelled = false;
    loadOpenSlaBreaches(realCases).then(m => { if (!cancelled) setSlaBreaches(m); }).catch(() => {});
    return () => { cancelled = true; };
  }, [realCases]);

  const canTakeCytologyReview = capabilities.has('cytology:pathologist-review:take');
  const refreshCytologyReview = useCallback(() => {
    if (!user?.id || !canTakeCytologyReview) { setCytologyReviewCases([]); setCytologyReviewState(new Map()); return; }
    loadCytologyReviewTray(user.id).then(refs => {
      setCytologyReviewCases(refs.map(r => r.caseData));
      setCytologyReviewState(new Map(refs.map(r => [r.caseData.id, r.state])));
    }).catch(() => {});
  }, [user?.id, canTakeCytologyReview]);
  useEffect(() => { refreshCytologyReview(); }, [refreshCytologyReview, location.key]);

  // A Cytology Review case opens in the Cytology Workspace; an open one is taken first.
  const openCytologyReviewCase = useCallback((caseId: string): boolean => {
    const state = cytologyReviewState.get(caseId);
    if (!state) return false;
    if (state === 'mine') void openCasePage(caseId, 'cytology');
    else setCytologyTake({ caseId });
    return true;
  }, [cytologyReviewState, openCasePage]);
  const confirmCytologyTake = async () => {
    if (!cytologyTake) return;
    const res = await takeCytologyReview(cytologyTake.caseId);
    if (res.ok === false) {
      setCytologyTake({ caseId: cytologyTake.caseId, error: t(`worklistPage.cytologyReview.errors.${res.error}`, { defaultValue: t('worklistPage.cytologyReview.errors.generic') }) });
      refreshCytologyReview();
      return;
    }
    const caseId = cytologyTake.caseId;
    setCytologyTake(null);
    void openCasePage(caseId, 'cytology');
  };

  // Real fix, per direct follow-up: "A case could be sitting in the
  // queue for an informal review." Confirmed directly: delegatedCaseIds
  // / amendmentAddendaCaseIds / informalReviewCaseIds were only ever
  // used to FILTER cases already present in realCases (from
  // listCasesForUser's own narrow assignedTo-or-pool rule) — never to
  // EXPAND that set. A case delegated to, or awaiting informal review
  // by, someone who is neither the assigned pathologist nor pulling
  // from the pool would never actually appear in their Worklist at
  // all — defeating the entire point of those features, which is
  // specifically asking someone who ISN'T already on the case to look
  // at it. Fetches any referenced case genuinely missing from
  // realCases and merges it in. Purely additive — never removes or
  // reorders what listCasesForUser already returned; converges to a
  // no-op once every referenced case is present, since a case already
  // in realCases can never become "missing" again.
  useEffect(() => {
    const referencedIds = new Set<string>([
      ...delegatedCaseIds,
      ...amendmentAddendaCaseIds.keys(),
      ...informalReviewCaseIds,
      ...peerReviewCaseIds,
      ...followUpCaseIds,
    ]);
    const existingIds = new Set(realCases.map(c => c.id));
    const missingIds = [...referencedIds].filter(id => id && !existingIds.has(id));
    if (missingIds.length === 0) return;
    Promise.all(missingIds.map(id => caseRouter.getCase(id, user?.id ?? 'current')))
      .then(fetched => {
        const validCases = fetched.filter((c): c is Case => !!c);
        if (validCases.length === 0) return;
        setRealCases(prev => {
          const prevIds = new Set(prev.map(c => c.id));
          const newOnes = validCases.filter(c => !prevIds.has(c.id));
          return newOnes.length > 0 ? [...prev, ...newOnes] : prev;
        });
      })
      .catch(() => {});
  }, [delegatedCaseIds, amendmentAddendaCaseIds, informalReviewCaseIds, peerReviewCaseIds, followUpCaseIds, realCases, user?.id]);

  // Batch 431: the "access requested" badges come from the person's own
  // pending access requests (WorklistTable.tsx), so the browser markers this
  // page used to tidy up are gone.

  // Quick Links Data — real admin-managed resources, resolved for this
  // viewer's own organisation (Config -> System -> External Resources).
  // Was a hardcoded object here directly (including a CAP URL that had
  // gone stale and 404'd, with no way for anyone to fix it without a
  // code change) — now genuinely admin-editable and org-scoped so a
  // different organisation's resources never leak into this list.
  //
  // Real lab-context resolution, not just org-level: the Worklist has
  // no single case in view, but it does have a real, concrete set of
  // cases this specific viewer can actually see — including pool cases,
  // which per a direct question can span multiple hospitals/labs, not
  // just one. Resolved via the same case -> ordering Client ->
  // resolvePerformingLabFacilityId() chain already established for
  // idle-timeout (services/session/mockSessionTimeoutService.ts), just
  // applied across every visible case instead of one. A viewer whose
  // worklist spans several performing labs' pools sees each of those
  // labs' own resources, not just the first one or none at all.
  const [quickLinks, setQuickLinks] = useState<Record<'protocols' | 'references' | 'systems', ResourceQuickLink[]>>({ protocols: [], references: [], systems: [] });

  useEffect(() => {
    const session = getSessionUser();
    if (!session?.organisationId) return;
    if (realCases.length === 0) return;

    facilityService.getAll().then(clientsRes => {
      if (!clientsRes.ok) return;
      const clientsById = new Map(clientsRes.data.map(c => [c.id, c]));
      const labIds = new Set<string>();
      realCases.forEach(c => {
        const orderingFacilityId = c?.order?.facilityId;
        const orderingFacility = orderingFacilityId ? clientsById.get(orderingFacilityId) : undefined;
        const labId = orderingFacility ? resolvePerformingLabFacilityId(orderingFacility) : undefined;
        if (labId) labIds.add(labId);
      });

      externalResourceService.resolveForViewer({
        organisationId: session.organisationId!,
        performingLabFacilityIds: Array.from(labIds),
      }).then(resolved => {
        setQuickLinks(toQuickLinks(resolved));
      });
    }).catch(() => {});
  }, [realCases]);

  // ── Voice: selected row index for keyboard/voice navigation ───────────────
  const [selectedIndex,    setSelectedIndex]    = useState<number>(-1);
  const [selectedCaseId,   setSelectedCaseId]   = useState<string | null>(null);
  const [displayOrder,     setDisplayOrder]      = useState<string[]>([]);

  // ── Return-from-case selection ─────────────────────────────────────────
  // When navigating back from a synoptic report, advance to the next case
  // in the table's actual display order (respects active sort).
  // displayOrder is populated by WorklistTable via onDisplayOrder before this runs.
  const fromCaseId    = (location.state as any)?.fromCaseId    as string | undefined;
  const restoreFilter = (location.state as any)?.restoreFilter as string | undefined;

  // Restore filter when navigating back from report page
  useEffect(() => {
    if (restoreFilter) {
      setActiveFilter(restoreFilter as any);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // once on mount

  useEffect(() => {
    if (!fromCaseId || displayOrder.length === 0) return;
    const viewedIdx = displayOrder.indexOf(fromCaseId);
    const targetId  = displayOrder[viewedIdx + 1] ?? displayOrder[viewedIdx] ?? null;
    if (!targetId) return;
    setSelectedIndex(0);
    setSelectedCaseId(targetId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayOrder]); // fires once displayOrder arrives from the table


  // Tile counts and the list each tile opens (PS-305/PS-307/PS-309) — the
  // deciding logic lives in services/worklist/worklistTileCounts.ts, so a
  // tile's count and its click are computed from the same rules.
  // Batch 452: no access check here; counts include restricted cases,
  // which the list shows as redacted rows (canViewCase decides the redaction).
  const worklistCountDeps: WorklistCountDeps = {
    specimenDictionary,
    userId: user?.id,
    viewedCaseIds,
    amendmentAddendaCaseIds,
    informalReviewCaseIds,
    peerReviewCaseIds,
    followUpCaseIds,
    delegatedCaseIds,
    wsiSlidesByCaseId,
    dpResultByCaseId,
    facilityTimezone: config.facilityTimezone,
    now: new Date(),
  };

  // filteredCases — context, then branch, then the active status filter.
  const filteredCases = React.useMemo(
    () => filterWorklistCases(
      { cases: realCases, contextFilter, branchFilter, activeFilter, physicianFilter, cytologyReviewCases },
      worklistCountDeps,
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [realCases, contextFilter, cytologyReviewCases, activeFilter, physicianFilter, amendmentAddendaCaseIds, informalReviewCaseIds, peerReviewCaseIds, followUpCaseIds, delegatedCaseIds, user?.id, config.facilityTimezone, branchFilter, specimenDictionary, wsiSlidesByCaseId, dpResultByCaseId, viewedCaseIds],
  );

  const tileCounts = computeWorklistTileCounts(
    { cases: realCases, contextFilter, branchFilter, cytologyReviewCount: cytologyReviewCases.length },
    worklistCountDeps,
  );
  const { stats, urgentPoolCount, hasUrgentNewCase, countersignPendingCount, collaboratingCount, pendingReleaseCount, needsRevisionCount } = tileCounts;
  const { urgentCount: lisUrgentCount, poolCount: lisPoolCount, totalCount: lisTotalCount, hasUrgentPool: hasUrgentLisPool } = tileCounts.lis;
  const { urgentCount: orchUrgentCount, poolCount: orchPoolCount, totalCount: orchTotalCount, hasUrgentPool } = tileCounts.outreach;

  useEffect(() => {
    actionRegistryService.setCurrentContext(VOICE_CONTEXT.WORKLIST);
    return () => actionRegistryService.setCurrentContext(VOICE_CONTEXT.WORKLIST);
  }, []);

  // ── Voice: table navigation listeners ────────────────────────────────────────
  useEffect(() => {
    const clamp = (i: number) => Math.max(0, Math.min(i, filteredCases.length - 1));

    // Sync both index and case ID together so selection survives sort/filter changes
    const syncId = (idx: number) => {
      setSelectedIndex(idx);
      setSelectedCaseId(filteredCases[idx]?.id ?? null);
    };

    // Default to row 0 on first voice command if nothing selected yet
    const ensureSelection = (i: number) => i < 0 ? 0 : i;

    const next        = () => setSelectedIndex(i => { const n = clamp(ensureSelection(i) + 1); syncId(n); return n; });
    const previous    = () => setSelectedIndex(i => { const n = clamp(ensureSelection(i) - 1); syncId(n); return n; });
    const pageDown    = () => setSelectedIndex(i => { const n = clamp(ensureSelection(i) + 10); syncId(n); return n; });
    const pageUp      = () => setSelectedIndex(i => { const n = clamp(ensureSelection(i) - 10); syncId(n); return n; });
    const first       = () => syncId(0);
    const last        = () => syncId(clamp(filteredCases.length - 1));
    const refresh     = () => { caseRouter.listCasesForUser(user?.id ?? 'current').then(setRealCases).catch(() => {}); };

    // TTS helper — reads text aloud via Web Speech Synthesis
    const speak = (text: string) => {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.95; u.pitch = 1; u.volume = 1;
      window.speechSynthesis.speak(u);
    };

    // Read flags for the focused row
    // Real, confirmed fix (Jira PS-57 + its follow-up "should be able
    // to assign Flags at either a Case or Specimen level"): caseFlags/
    // specimenFlags entries are real FlagInstance records now
    // (flagDefinitionId, no .name of their own) — this used to speak
    // "undefined" for every real flag. Resolved against allFlags, the
    // same real catalog this page already fetches for
    // FlagManagerModal. Specimen-level flags aggregated from each
    // specimen's own, nested specimenFlags — there's deliberately no
    // case-level specimenFlags field; each specimen's own is the only
    // real place a flag applied to a specific specimen can live,
    // since FlagInstance itself carries no specimenId. Deleted
    // (removed) flags excluded — the old, wrong type had no real
    // field for this at all.
    const readFlags = () => {
      const focused = realCases.find(c => c.id === selectedCaseId);
      if (!focused) { speak('No case selected.'); return; }
      const flagDefById = new Map(allFlags.map(f => [f.id, f]));
      const resolveNames = (instances: any[]) =>
        instances.filter(f => !f.deletedAt).map(f => flagDefById.get(f.flagDefinitionId)?.name).filter(Boolean);
      const flags = [
        ...resolveNames((focused as any).caseFlags ?? []),
        ...((focused as any).specimens ?? []).flatMap((sp: any) => resolveNames(sp.specimenFlags ?? [])),
      ];
      if (flags.length === 0) {
        speak(`${focused.id} has no flags.`);
      } else {
        speak(`${focused.id} has ${flags.join(' and ')}.`);
      }
    };

    // Read specimen type for the focused row
    const readSpecimen = () => {
      const focused = realCases.find(c => c.id === selectedCaseId);
      if (!focused) { speak('No case selected.'); return; }
      const spec = focused.specimens?.[0];
      speak(`${focused.id}: ${spec ? spec.description : 'no specimen description'}.`);
    };

    // Real, per direct follow-up ("some cases will have DP, others
    // may not") — same real readFlags/readSpecimen pattern, never a
    // separate, parallel voice system for DP-relevant rows. Each
    // reads the exact same real badge data the row's own compact
    // badge already shows, via the same real, shared resolution
    // functions (resolveWorklistDpBadges.ts) — never a second,
    // separate summary that could drift from what's on screen.
    const readDigitalReadiness = () => {
      const focused = realCases.find(c => c.id === selectedCaseId);
      if (!focused) { speak('No case selected.'); return; }
      const badge = resolveDigitalReadinessBadge(wsiSlidesByCaseId.get(focused.id));
      speak(badge ? `${focused.id}: ${badge.summaryText}.` : `${focused.id} has no real digital slide data on file.`);
    };

    const readDpTriage = () => {
      const focused = realCases.find(c => c.id === selectedCaseId);
      if (!focused) { speak('No case selected.'); return; }
      const badge = resolveDpTriageBadge(dpResultByCaseId.get(focused.id));
      speak(badge ? `${focused.id}: ${badge.primaryText}${badge.biomarkerSummary ? '. ' + badge.biomarkerSummary : ''}.` : `${focused.id} has no real AI screening result on file.`);
    };

    const openSlideDetails = () => {
      if (!selectedCaseId) { speak('No case selected.'); return; }
      setDpDrawerCaseId(selectedCaseId);
    };

    // Filter by physician name — extracted from transcript
    const filterPhysician = (e: Event) => {
      const transcript = ((e as CustomEvent).detail?.transcript as string) ?? '';
      const name = transcript.toLowerCase().replace(/filter by\s*/i, '').trim();
      if (!name) return;

      // Find all unique physicians in the worklist
      const physicians = [...new Set(realCases.map(c => c.order?.requestingProvider ?? '').filter(Boolean))];
      const matches = physicians.filter(p => p.toLowerCase().includes(name));

      if (matches.length === 0) {
        speak(`No physician found matching ${name}.`);
      } else if (matches.length === 1) {
        setPhysicianFilter(matches[0]);
        setActiveFilter('physician');
        setSelectedIndex(-1); setSelectedCaseId(null);
        speak(`Filtering by ${matches[0]}.`);
      } else {
        // Ambiguity — prompt for clarification
        setPhysicianPrompt(`Did you mean: ${matches.slice(0, 3).join(', or ')}?`);
        speak(`Multiple physicians match ${name}. ${matches.slice(0, 3).join(', or ')}?`);
      }
    };

    // Filter commands — reset selection when filter changes
    const filterUrgent    = () => { setActiveFilter('urgent');    setSelectedIndex(-1); setSelectedCaseId(null); };
    const filterCompleted = () => { setActiveFilter('completed'); setSelectedIndex(-1); setSelectedCaseId(null); };
    // Real feature, per direct follow-up: "I want a DP Tile to
    // filter away non DP cases." Same real filterUrgent/
    // filterCompleted pattern, never a separate, parallel mechanism.
    const filterDp         = () => { setActiveFilter('dp');        setSelectedIndex(-1); setSelectedCaseId(null); };
    // Real, per direct follow-up recalling a real, prior requirement
    // ("I do not want to send the Pathologist to multiple worklist")
    // — same real filterUrgent/filterDp pattern.
    const filterGynCyto    = () => { setActiveFilter('gyncyto');    setSelectedIndex(-1); setSelectedCaseId(null); };
    const filterNonGynCyto = () => { setActiveFilter('nongyncyto'); setSelectedIndex(-1); setSelectedCaseId(null); };
    const filterAutopsy    = () => { setActiveFilter('autopsy');    setSelectedIndex(-1); setSelectedCaseId(null); };
    const filterNewCases   = () => { setActiveFilter('newcases');   setSelectedIndex(-1); setSelectedCaseId(null); };
    const clearFilter     = () => { setActiveFilter('all');       setSelectedIndex(-1); setSelectedCaseId(null); };
    // Batch 650: "pool cases" (Alt+Shift+P) and "awaiting countersign" (Alt+A) choose those tiles, as clicking them does.
    const filterPool        = () => { setActiveFilter('pool');        setSelectedIndex(-1); setSelectedCaseId(null); };
    const filterCountersign = () => { setActiveFilter('countersign'); setSelectedIndex(-1); setSelectedCaseId(null); };
    const filterCollaborating = () => { setActiveFilter('collaborating'); setSelectedIndex(-1); setSelectedCaseId(null); };

    // Sort commands — forward to WorklistTable's internal sort system via custom events
    const sortDate     = () => window.dispatchEvent(new CustomEvent('PATHSCRIBE_TABLE_SORT_APPLY', { detail: { key: 'accessionDate', dir: 'desc' } }));
    const sortPriority = () => window.dispatchEvent(new CustomEvent('PATHSCRIBE_TABLE_SORT_APPLY', { detail: { key: 'flagSeverity',  dir: 'desc' } }));
    const sortStatus   = () => window.dispatchEvent(new CustomEvent('PATHSCRIBE_TABLE_SORT_APPLY', { detail: { key: 'status',        dir: 'asc'  } }));

    // Sort by column name — extracted from transcript e.g. "sort by date", "sort by physician"
    const sortByColumn = (e: Event) => {
      const t = ((e as CustomEvent).detail?.transcript as string ?? '').toLowerCase().replace('sort by', '').trim();
      const map: Record<string, () => void> = {
        'date': sortDate, 'accession date': sortDate, 'accession': sortDate,
        'priority': sortPriority, 'stat': sortPriority, 'urgency': sortPriority,
        'status': sortStatus, 'case status': sortStatus,
      };
      const fn = map[t];
      if (fn) { fn(); }
      else { speak(`Column "${t}" not recognised. Try date, priority, or status.`); }
    };
    const clearSort    = () => window.dispatchEvent(new CustomEvent('PATHSCRIBE_TABLE_SORT_CLEAR'));

    const openResources = () => setIsResourcesOpen(true);

    const worklistState = { worklistCaseIds: filteredCases.map(c => c.id) };
    // Real feature, per direct follow-up: same routing rule openCase
    // in WorklistTable.tsx applies for mouse clicks - voice-driven
    // navigation needs to stay consistent, not silently bypass it.
    const openCaseId = (id: string) => {
      // Voice-driven opens record a view like a click does, so they are never left "new".
      if (user?.id) caseViewTrackingService.recordView(user.id, id);
      if (activeFilter === 'cytologyreview' && openCytologyReviewCase(id)) return;
      if (activeFilter === 'informalreview') {
        void openCasePage(id, 'report', { state: { fromFilter: activeFilter, openInternalNotes: true } });
      } else {
        void openCasePage(id, 'synoptic', { state: worklistState });
      }
    };

    const openSelected = () => {
      if (selectedIndex >= 0 && filteredCases[selectedIndex]) {
        openCaseId(filteredCases[selectedIndex].id);
      }
    };

    const nextCase = () => {
      const idx = clamp(ensureSelection(selectedIndex) + 1);
      syncId(idx);
      openCaseId(filteredCases[idx].id);
    };

    const prevCase = () => {
      const idx = clamp(ensureSelection(selectedIndex) - 1);
      syncId(idx);
      openCaseId(filteredCases[idx].id);
    };

    // Batch 663: "go to row 7", "open accession A26-4660" (services/worklist/rowCommands.ts)
    const rowCmd = (e: Event) => { const r = resolveRowCommand(e.type, (e as CustomEvent<{ transcript?: string }>).detail?.transcript ?? '', filteredCases); if (r) { syncId(r.index); if (r.open) openCaseId(r.open); } };
    ROW_COMMAND_EVENTS.forEach(n => window.addEventListener(n, rowCmd));
    window.addEventListener('PATHSCRIBE_TABLE_NEXT',             next);
    window.addEventListener('PATHSCRIBE_TABLE_PREVIOUS',         previous);
    window.addEventListener('PATHSCRIBE_TABLE_PAGE_DOWN',        pageDown);
    window.addEventListener('PATHSCRIBE_TABLE_PAGE_UP',          pageUp);
    window.addEventListener('PATHSCRIBE_TABLE_FIRST',            first);
    window.addEventListener('PATHSCRIBE_TABLE_LAST',             last);
    window.addEventListener('PATHSCRIBE_TABLE_OPEN_SELECTED',    openSelected);
    window.addEventListener('PATHSCRIBE_TABLE_REFRESH',          refresh);
    window.addEventListener('PATHSCRIBE_TABLE_FILTER_URGENT',    filterUrgent);
    window.addEventListener('PATHSCRIBE_TABLE_FILTER_COMPLETED', filterCompleted);
    window.addEventListener('PATHSCRIBE_TABLE_FILTER_DP',        filterDp);
    window.addEventListener('PATHSCRIBE_TABLE_FILTER_GYNCYTO',    filterGynCyto);
    window.addEventListener('PATHSCRIBE_TABLE_FILTER_NONGYNCYTO', filterNonGynCyto);
    window.addEventListener('PATHSCRIBE_TABLE_FILTER_AUTOPSY',    filterAutopsy);
    window.addEventListener('PATHSCRIBE_TABLE_FILTER_NEWCASES',   filterNewCases);
    window.addEventListener('PATHSCRIBE_TABLE_CLEAR_FILTER',     clearFilter);
    window.addEventListener('PATHSCRIBE_TABLE_FILTER_POOL',        filterPool);
    window.addEventListener('PATHSCRIBE_TABLE_FILTER_COUNTERSIGN', filterCountersign);
    window.addEventListener('PATHSCRIBE_TABLE_FILTER_PARTICIPATING', filterCollaborating);
    window.addEventListener('PATHSCRIBE_TABLE_FILTER_PHYSICIAN', filterPhysician);
    window.addEventListener('PATHSCRIBE_READ_FLAGS',             readFlags);
    window.addEventListener('PATHSCRIBE_READ_SPECIMEN',          readSpecimen);
    window.addEventListener('PATHSCRIBE_READ_DIGITAL_READINESS', readDigitalReadiness);
    window.addEventListener('PATHSCRIBE_READ_DP_TRIAGE',         readDpTriage);
    window.addEventListener('PATHSCRIBE_OPEN_SLIDE_DETAILS',     openSlideDetails);
    window.addEventListener('PATHSCRIBE_TABLE_SORT_DATE',        sortDate);
    window.addEventListener('PATHSCRIBE_TABLE_SORT_PRIORITY',    sortPriority);
    window.addEventListener('PATHSCRIBE_TABLE_SORT_STATUS',      sortStatus);
    window.addEventListener('PATHSCRIBE_TABLE_SORT_BY_COLUMN',   sortByColumn);
    window.addEventListener('PATHSCRIBE_TABLE_CLEAR_SORT',       clearSort);
    window.addEventListener('PATHSCRIBE_NAV_NEXT_CASE',          nextCase);
    window.addEventListener('PATHSCRIBE_NAV_PREVIOUS_CASE',      prevCase);
    window.addEventListener('PATHSCRIBE_PAGE_OPEN_RESOURCES',    openResources);

    // Computational Sidecar voice actions removed along with the
    // Sidecar itself — these all dispatched events nothing listens
    // for anymore.

    return () => {
      ROW_COMMAND_EVENTS.forEach(n => window.removeEventListener(n, rowCmd));
      window.removeEventListener('PATHSCRIBE_TABLE_NEXT',             next);
      window.removeEventListener('PATHSCRIBE_TABLE_PREVIOUS',         previous);
      window.removeEventListener('PATHSCRIBE_TABLE_PAGE_DOWN',        pageDown);
      window.removeEventListener('PATHSCRIBE_TABLE_PAGE_UP',          pageUp);
      window.removeEventListener('PATHSCRIBE_TABLE_FIRST',            first);
      window.removeEventListener('PATHSCRIBE_TABLE_LAST',             last);
      window.removeEventListener('PATHSCRIBE_TABLE_OPEN_SELECTED',    openSelected);
      window.removeEventListener('PATHSCRIBE_TABLE_REFRESH',          refresh);
      window.removeEventListener('PATHSCRIBE_TABLE_FILTER_URGENT',    filterUrgent);
      window.removeEventListener('PATHSCRIBE_TABLE_FILTER_COMPLETED', filterCompleted);
      window.removeEventListener('PATHSCRIBE_TABLE_FILTER_DP',        filterDp);
      window.removeEventListener('PATHSCRIBE_TABLE_FILTER_GYNCYTO',    filterGynCyto);
      window.removeEventListener('PATHSCRIBE_TABLE_FILTER_NONGYNCYTO', filterNonGynCyto);
      window.removeEventListener('PATHSCRIBE_TABLE_FILTER_AUTOPSY',    filterAutopsy);
      window.removeEventListener('PATHSCRIBE_TABLE_FILTER_NEWCASES',   filterNewCases);
      window.removeEventListener('PATHSCRIBE_TABLE_CLEAR_FILTER',     clearFilter);
      window.removeEventListener('PATHSCRIBE_TABLE_FILTER_POOL',        filterPool);
      window.removeEventListener('PATHSCRIBE_TABLE_FILTER_COUNTERSIGN', filterCountersign);
      window.removeEventListener('PATHSCRIBE_TABLE_FILTER_PARTICIPATING', filterCollaborating);
      window.removeEventListener('PATHSCRIBE_TABLE_FILTER_PHYSICIAN', filterPhysician);
      window.removeEventListener('PATHSCRIBE_READ_FLAGS',             readFlags);
      window.removeEventListener('PATHSCRIBE_READ_SPECIMEN',          readSpecimen);
      window.removeEventListener('PATHSCRIBE_READ_DIGITAL_READINESS', readDigitalReadiness);
      window.removeEventListener('PATHSCRIBE_READ_DP_TRIAGE',         readDpTriage);
      window.removeEventListener('PATHSCRIBE_OPEN_SLIDE_DETAILS',     openSlideDetails);
      window.removeEventListener('PATHSCRIBE_TABLE_SORT_DATE',        sortDate);
      window.removeEventListener('PATHSCRIBE_TABLE_SORT_PRIORITY',    sortPriority);
      window.removeEventListener('PATHSCRIBE_TABLE_SORT_STATUS',      sortStatus);
      window.removeEventListener('PATHSCRIBE_TABLE_SORT_BY_COLUMN',   sortByColumn);
      window.removeEventListener('PATHSCRIBE_TABLE_CLEAR_SORT',       clearSort);
      window.removeEventListener('PATHSCRIBE_NAV_NEXT_CASE',          nextCase);
      window.removeEventListener('PATHSCRIBE_NAV_PREVIOUS_CASE',      prevCase);
      window.removeEventListener('PATHSCRIBE_PAGE_OPEN_RESOURCES',    openResources);
    };
  }, [filteredCases, selectedIndex, navigate, realCases, selectedCaseId, activeFilter, openCytologyReviewCase, allFlags, dpResultByCaseId, openCasePage, user?.id, wsiSlidesByCaseId]);

  // Batch 375: hoisted out of the JSX; the table now renders only in the case view, and a hook can't be conditional.
  const handleDisplayOrder = useCallback((ids: string[]) => setDisplayOrder(ids), []);

  return (
    <div className="ps-wl-page">
      {/* Real, per direct UI-review follow-up ("Fix the root"): this
          page's own competing background image/gradient (and the
          backgroundColor/color pairing that went with them) removed
          entirely — falls through to AppShell's own real
          .ps-app-root background now, matching Configuration/Quality
          Assurance/Intraop Queue/Contribution. Rest of this inline
          style block (position/width/height/fontFamily/display/
          flexDirection) left as-is — a full inline-style-to-CSS-class
          conversion for this page is separate, larger, pre-existing
          work (tracked elsewhere as PS-74), not part of this pass.
          Batch 353: the page layout's inline styles are now the
          .ps-wl-page / -content / -main / -main-inner classes. */}

      {/* All content — fills viewport exactly, no overflow */}
      <div className="ps-wl-page-content">

        {/* Main — fills remaining height */}
        <main className="ps-wl-page-main">
          <div className="ps-wl-page-main-inner">

            {/* ── Header: Row 1 = Title + Search, Row 2 = Mode tiles + Filter tiles ── */}
            <div data-capture-hide="true" className="ps-wl-header ps-wl-header--page">

              {/* Row 1 — Real feature, per direct follow-up: "move the two
                  main Tiles (LIS Cases and OutReach) up a line and to the
                  left of the Title. This will give more breathing room for
                  the other tiles." LIS Cases/Outreach are genuinely
                  different from the filter tiles to their right below —
                  they're a scope switch (which whole case population
                  you're looking at), not a status filter — so pairing them
                  with the title, rather than competing with the filter
                  strip for the same row's width, is a real, correct
                  grouping too, not just a space trick. */}
              <div className="ps-wl-header-row">

                {/* Left: LIS Cases + Outreach */}
                <div className="ps-wl-mode-tiles">
                  {/* LIS TILE */}
                  {allowedViews.includes('cases') && (() => {
                    const isActive  = view === 'cases' && contextFilter === 'lis';
                    const showBadge = contextFilter === 'outreach';
                    return (
                      <button
                        type="button"
                        // Batch 568: on/off colours from modifier classes (pathscribe.css), not values set here.
                        className={`ps-wl-mode-tile ps-wl-mode-tile--lis${isActive ? ' ps-wl-mode-tile--active' : ''}`}
                        aria-pressed={isActive}
                        title={isActive ? t('worklistPage.lisTile.currently') : t('worklistPage.lisTile.switch')}
                        onClick={() => { setViewChoice('cases'); setContextFilter('lis'); setActiveFilter('all'); setSelectedIndex(-1); setSelectedCaseId(null); }}
                      >
                        <div className="ps-wl-mode-tile__main">
                          <div className="ps-wl-mode-tile__label">{t('worklistPage.lisCasesLabel')}</div>
                          <div className="ps-wl-mode-tile__count">{lisTotalCount}</div>
                        </div>
                        {showBadge && (lisUrgentCount > 0 || lisPoolCount > 0) && (
                          <div className="ps-wl-mode-tile__badges">
                            {lisUrgentCount > 0 && <span className="ps-wl-mode-tile__badge" style={{ '--badge-color': '#EF4444' } as React.CSSProperties}>{t('worklistPage.badgeUrgent')}</span>}
                            {lisPoolCount > 0 && <span className="ps-wl-mode-tile__badge" style={{ '--badge-color': hasUrgentLisPool ? '#EF4444' : '#F97316' } as React.CSSProperties}>{t('worklistPage.badgePool')}</span>}
                          </div>
                        )}
                      </button>
                    );
                  })()}
                  {/* OUTREACH TILE */}
                  {allowedViews.includes('cases') && (() => {
                    const isActive  = view === 'cases' && contextFilter === 'outreach';
                    const showBadge = contextFilter === 'lis';
                    const poolColor = hasUrgentPool ? '#EF4444' : '#F97316';
                    return (
                      <button
                        type="button"
                        className={`ps-wl-mode-tile ps-wl-mode-tile--outreach${isActive ? ' ps-wl-mode-tile--active' : ''}`}
                        aria-pressed={isActive}
                        title={isActive ? t('worklistPage.outreachTile.currently') : t('worklistPage.outreachTile.switch')}
                        onClick={() => { setViewChoice('cases'); setContextFilter('outreach'); setActiveFilter('all'); setSelectedIndex(-1); setSelectedCaseId(null); }}
                      >
                        <div className="ps-wl-mode-tile__main">
                          <div className="ps-wl-mode-tile__label">{t('worklistPage.outreachLabel')}</div>
                          <div className="ps-wl-mode-tile__count">{orchTotalCount}</div>
                        </div>
                        {showBadge && (orchUrgentCount > 0 || orchPoolCount > 0) && (
                          <div className="ps-wl-mode-tile__badges">
                            {orchUrgentCount > 0 && <span className="ps-wl-mode-tile__badge" style={{ '--badge-color': '#EF4444' } as React.CSSProperties}>{t('worklistPage.badgeUrgent')}</span>}
                            {orchPoolCount > 0 && <span className="ps-wl-mode-tile__badge" style={{ '--badge-color': poolColor } as React.CSSProperties}>{t('worklistPage.badgePool')}</span>}
                          </div>
                        )}
                      </button>
                    );
                  })()}
                  {/* Batch 375: the peer-review queues, as views of this page. */}
                  {allowedViews.filter(v => v !== 'cases').map(v => (
                    <button
                      key={v}
                      type="button"
                      className={`ps-wl-mode-tile ps-wl-queue-tile${view === v ? ' ps-wl-queue-tile--active' : ''}`}
                      aria-pressed={view === v}
                      onClick={() => { setViewChoice(v); setSelectedIndex(-1); setSelectedCaseId(null); }}
                      title={t(`worklistPage.queues.${v}`)}
                    >
                      <div className="ps-wl-mode-tile__main">
                        <div className="ps-wl-queue-tile__label">{t(`worklistPage.queues.${v}`)}</div>
                        {/* Batch 396 (Pete): how many items wait in this queue. */}
                        {queueCounts[v as 'cytologyQc' | 'surgicalQa'] !== null && (
                          <div className="ps-wl-mode-tile__count ps-wl-queue-tile__count">{queueCounts[v as 'cytologyQc' | 'surgicalQa']}</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {view === 'cases' && (
                  <h1 className="ps-wl-title">
                    {t(FILTER_LABEL_KEY[activeFilter] ?? FILTER_LABEL_KEY.all)}
                  </h1>
                )}

              </div>

              {view === 'cases' && (<>
              {/* Real, per direct follow-up ("Surg Path, Cytology and
                  Autopsy... almost belong together") — the real
                  branch tabs. 'All Cases' is the real, unchanged
                  default; picking a branch narrows both the case
                  list and which specialty tiles show below, without
                  changing the status filter row's own established
                  "always visible" behavior. */}
              <div className="ps-wl-branch-tabs">
                {([
                  { key: 'all', labelKey: 'worklistPage.branchTab.all', count: stats.allBranches },
                  { key: 'surgpath', labelKey: 'worklistPage.branchTab.surgpath', count: stats.surgpathBranch },
                  { key: 'cytology', labelKey: 'worklistPage.branchTab.cytology', count: stats.cytologyBranch },
                  { key: 'autopsy', labelKey: 'worklistPage.branchTab.autopsy', count: stats.autopsy },
                ] as const).map(b => (
                  <button
                    key={b.key}
                    type="button"
                    className={`ps-wl-branch-tab${branchFilter === b.key ? ' ps-wl-branch-tab--active' : ''}`}
                    onClick={() => { setBranchFilter(b.key); setSelectedIndex(-1); setSelectedCaseId(null); }}
                  >
                    {t(b.labelKey)} ({b.count})
                  </button>
                ))}
              </div>

              {/* Row 2 — filter tiles now have the full row's width to
                  themselves, real breathing room instead of sharing it
                  with the LIS Cases/Outreach tiles above. */}
              <div className="ps-wl-filter-row">

                {/* Filter tiles */}
                <div className="ps-wl-filter-strip">

                {/* Real simplification found while converting: every tile
                    below computed this exact same "← Back to LIS Cases" /
                    "← Back to Outreach" string inline, 19 separate times —
                    collapsed into one shared value. */}
                {(() => { const backToLabel = t('worklistPage.backTo', { target: contextFilter === 'outreach' ? t('worklistPage.outreachLabel') : t('worklistPage.lisCasesLabel') }); return ([
                  // Real fix, per direct accessibility follow-up: "Let's
                  // not use the same color for two different tiles. How
                  // are we dealing with colorblindness here?" Confirmed
                  // quantitatively (Euclidean distance under simulated
                  // deuteranopia/protanopia): pool vs Outreach's own
                  // summary color, delegated vs countersign, and
                  // pendingrelease vs inprogress were all genuinely close
                  // to indistinguishable for red-green colorblind users —
                  // review vs Outreach specifically at 4.5/5.1 distance,
                  // essentially the same color. Fixed as a genuine
                  // two-channel problem (fill hue AND border hue, not
                  // fill alone) after confirming 15 mutually-distinct
                  // hues don't fit the wheel with real separation margin.
                  // review/delegated get real new fill colors; pool/
                  // pendingrelease/inprogress/amended keep their original
                  // fill (preserving existing visual identity/muscle
                  // memory) and get a distinct border instead. Per direct,
                  // explicit rule: red stays exclusive to the urgent tile
                  // — no other tile's fill or border uses it, including
                  // during this fix.
                  { key: 'pool',       label: activeFilter === 'pool'       ? backToLabel : t(FILTER_LABEL_KEY.pool),      count: stats.pool,           color: '#F97316', bg: 'rgba(249,115,22,0.05)',  border: 'rgba(38,217,74,0.18)',  activeBg: 'rgba(249,115,22,0.18)',  activeBorder: '#26D94A',  glow: '0 0 12px rgba(38,217,74,0.4)',  sublabel: undefined },
                  { key: 'delegated',  label: activeFilter === 'delegated'  ? backToLabel : t(FILTER_LABEL_KEY.delegated), count: delegatedToMeCount,   color: '#E4F042', bg: 'rgba(228,240,66,0.05)',  border: 'rgba(228,240,66,0.18)',  activeBg: 'rgba(228,240,66,0.18)',  activeBorder: '#E4F042',  glow: '0 0 12px rgba(228,240,66,0.4)',  sublabel: undefined },
                  { key: 'countersign', label: activeFilter === 'countersign' ? backToLabel : t(FILTER_LABEL_KEY.countersign), count: countersignPendingCount, color: '#AB1CE3', bg: 'rgba(171,28,227,0.05)', border: 'rgba(171,28,227,0.18)', activeBg: 'rgba(171,28,227,0.18)', activeBorder: '#AB1CE3', glow: '0 0 12px rgba(171,28,227,0.4)', sublabel: undefined },
                  { key: 'collaborating', label: activeFilter === 'collaborating' ? backToLabel : t(FILTER_LABEL_KEY.collaborating), count: collaboratingCount, color: '#F472B6', bg: 'rgba(244,114,182,0.05)', border: 'rgba(244,114,182,0.18)', activeBg: 'rgba(244,114,182,0.18)', activeBorder: '#F472B6', glow: '0 0 12px rgba(244,114,182,0.4)', sublabel: undefined },
                  // Real feature, per direct specification: Post-Sign-Out
                  // Release Buffer. Same real "queue that's specifically
                  // mine" pattern as countersign immediately above — where
                  // a pathologist finds a case they might need to recall
                  // before it releases. Teal matches HeaderBar.tsx's own
                  // dedicated pending-release color, for cross-page
                  // consistency. Border color deliberately differs from
                  // fill — see the accessibility fix note above.
                  { key: 'pendingrelease', label: activeFilter === 'pendingrelease' ? backToLabel : t(FILTER_LABEL_KEY.pendingrelease), count: pendingReleaseCount, color: '#1C8DE3', bg: 'rgba(28,141,227,0.05)', border: 'rgba(74,217,38,0.18)', activeBg: 'rgba(28,141,227,0.18)', activeBorder: '#4AD926', glow: '0 0 12px rgba(74,217,38,0.4)', sublabel: undefined },
                  // Real, per direct guidance ("Yes we should scope
                  // 'Return to Trainee'/'Reject with Notes'... let's
                  // not display tiles with 0 entries" — the real,
                  // dedicated .filter() just below this array, unlike
                  // every other tile here, which always renders
                  // regardless of count): a distinct amber/gold, not
                  // reused from any existing tile's hue.
                  { key: 'needsrevision', label: activeFilter === 'needsrevision' ? backToLabel : t(FILTER_LABEL_KEY.needsrevision), count: needsRevisionCount, color: '#78350F', bg: 'rgba(120,53,15,0.05)', border: 'rgba(120,53,15,0.18)', activeBg: 'rgba(120,53,15,0.18)', activeBorder: '#78350F', glow: '0 0 12px rgba(120,53,15,0.4)', sublabel: undefined },
                  { key: 'urgent',     label: activeFilter === 'urgent'     ? backToLabel : t(FILTER_LABEL_KEY.urgent),          count: stats.urgent,         color: '#EF4444', bg: 'rgba(239,68,68,0.05)',   border: 'rgba(239,68,68,0.18)',   activeBg: 'rgba(239,68,68,0.18)',   activeBorder: '#EF4444',  glow: '0 0 12px rgba(239,68,68,0.4)',   sublabel: urgentPoolCount > 0 ? t('worklistPage.inPoolSublabel', { count: urgentPoolCount }) : undefined },
                  { key: 'inprogress', label: activeFilter === 'inprogress' ? backToLabel : t(FILTER_LABEL_KEY.inprogress),     count: stats.inProgress,     color: '#536EEA', bg: 'rgba(83,110,234,0.05)',   border: 'rgba(19,236,236,0.18)',   activeBg: 'rgba(83,110,234,0.18)',   activeBorder: '#13ECEC',  glow: '0 0 12px rgba(19,236,236,0.4)',   sublabel: undefined },
                  { key: 'accessioned',   label: activeFilter === 'accessioned'   ? backToLabel : t(FILTER_LABEL_KEY.accessioned), count: stats.accessioned,   color: '#261CE3', bg: 'rgba(38,28,227,0.05)',  border: 'rgba(38,28,227,0.18)',  activeBg: 'rgba(38,28,227,0.18)',  activeBorder: '#261CE3',  glow: '0 0 12px rgba(38,28,227,0.4)',  sublabel: undefined },
                  { key: 'grosscomplete', label: activeFilter === 'grosscomplete' ? backToLabel : t(FILTER_LABEL_KEY.grosscomplete),    count: stats.grossComplete, color: '#53E2EA', bg: 'rgba(83,226,234,0.05)',  border: 'rgba(83,226,234,0.18)',  activeBg: 'rgba(83,226,234,0.18)',  activeBorder: '#53E2EA',  glow: '0 0 12px rgba(83,226,234,0.4)',  sublabel: undefined },
                  { key: 'onhold',     label: activeFilter === 'onhold'     ? backToLabel : t(FILTER_LABEL_KEY.onhold),          count: stats.onHold,         color: '#F87171', bg: 'rgba(248,113,113,0.05)', border: 'rgba(248,113,113,0.18)', activeBg: 'rgba(248,113,113,0.18)', activeBorder: '#F87171',  glow: '0 0 12px rgba(248,113,113,0.4)', sublabel: undefined },
                  // Real feature, per direct follow-up: "I want a DP
                  // Tile to filter away non DP cases." Same real
                  // dpRelevant count the stats object above already
                  // computes — a real case with WSI slides, a real
                  // AI screening result, or both.
                  // Real, per direct guidance's own confirmed
                  // Digital Readiness/AI flowcharts — DP genuinely
                  // applies to both Surg Path (Paige/PathAI) and
                  // Cytology (Hologic/BD), never Autopsy, which has
                  // no real DP integration at all. Hidden, not just
                  // inactive, once the Autopsy branch is selected —
                  // a visible-but-always-empty tile would be its own
                  // real source of confusion.
                  ...(branchFilter !== 'autopsy' ? [
                    { key: 'dp' as const,         label: activeFilter === 'dp'         ? backToLabel : t(FILTER_LABEL_KEY.dp),              count: stats.dpRelevant,    color: '#6366F1', bg: 'rgba(99,102,241,0.05)', border: 'rgba(99,102,241,0.18)', activeBg: 'rgba(99,102,241,0.18)', activeBorder: '#6366F1',  glow: '0 0 12px rgba(99,102,241,0.4)',  sublabel: undefined },
                  ] : []),
                  // Real, per direct follow-up ("If I pick SurgPath,
                  // I just see Surg Path and the other filters
                  // related to Surg Path, Cytology, Shows the Tile
                  // related to their Special needs") — GYN/Non-GYN
                  // Cytology tiles only render at all once the
                  // Cytology branch is actually selected, never
                  // cluttering the default 'all' or other-branch
                  // views. The standalone Autopsy tile that used to
                  // sit here is deliberately removed — the new
                  // Autopsy branch tab above already does that exact
                  // job, so a second, separate chip for the same
                  // real filter would be pure redundancy, not a
                  // second, genuinely different option.
                  ...(branchFilter === 'cytology' ? [
                    { key: 'gyncyto' as const,    label: activeFilter === 'gyncyto'    ? backToLabel : t(FILTER_LABEL_KEY.gyncyto),         count: stats.gynCytology,    color: '#14B8A6', bg: 'rgba(20,184,166,0.05)', border: 'rgba(20,184,166,0.18)', activeBg: 'rgba(20,184,166,0.18)', activeBorder: '#14B8A6',  glow: '0 0 12px rgba(20,184,166,0.4)',  sublabel: undefined },
                    { key: 'nongyncyto' as const, label: activeFilter === 'nongyncyto' ? backToLabel : t(FILTER_LABEL_KEY.nongyncyto),      count: stats.nonGynCytology, color: '#84CC16', bg: 'rgba(132,204,22,0.05)', border: 'rgba(132,204,22,0.18)', activeBg: 'rgba(132,204,22,0.18)', activeBorder: '#84CC16',  glow: '0 0 12px rgba(132,204,22,0.4)',  sublabel: undefined },
                  ] : []),
                  // Real, per direct follow-up recalling the
                  // messaging system's own "unread + urgent → red"
                  // pattern (AppShell.tsx's own ps-unread-urgent) —
                  // this tile's own color genuinely switches to red
                  // when any real new case is also urgent, the same
                  // real dynamic behavior as that bubble, never a
                  // fixed color like every other tile here.
                  { key: 'newcases',   label: activeFilter === 'newcases'   ? backToLabel : t(FILTER_LABEL_KEY.newcases),
                    count: stats.newCases,
                    color: hasUrgentNewCase ? '#EF4444' : '#0EA5E9',
                    bg: hasUrgentNewCase ? 'rgba(239,68,68,0.05)' : 'rgba(14,165,233,0.05)',
                    border: hasUrgentNewCase ? 'rgba(239,68,68,0.18)' : 'rgba(14,165,233,0.18)',
                    activeBg: hasUrgentNewCase ? 'rgba(239,68,68,0.18)' : 'rgba(14,165,233,0.18)',
                    activeBorder: hasUrgentNewCase ? '#EF4444' : '#0EA5E9',
                    glow: hasUrgentNewCase ? '0 0 12px rgba(239,68,68,0.4)' : '0 0 12px rgba(14,165,233,0.4)',
                    // Real, direct follow-up: the "\u26a1 Urgent" sublabel
                    // that used to render here alongside the red color
                    // removed per direct feedback \u2014 "I think the color
                    // alone indicates that some of the new cases are
                    // urgent, so remove the badge + Urgent from that
                    // tile." The color switch above (color/bg/border/
                    // activeBg/activeBorder/glow) already carries the
                    // same real signal; the text was reinforcing it, not
                    // adding new information.
                    sublabel: undefined },
                  { key: 'amended',    label: activeFilter === 'amended'    ? backToLabel : t(FILTER_LABEL_KEY.amended), count: stats.amended,        color: '#EA53DD', bg: 'rgba(234,83,221,0.05)',  border: 'rgba(224,167,82,0.18)',  activeBg: 'rgba(234,83,221,0.18)',  activeBorder: '#E0A752',  glow: '0 0 12px rgba(224,167,82,0.4)',  sublabel: undefined },
                  { key: 'completed',  label: activeFilter === 'completed'  ? backToLabel : t(FILTER_LABEL_KEY.completed), count: stats.completedToday, color: '#10B981', bg: 'rgba(16,185,129,0.05)',  border: 'rgba(16,185,129,0.18)',  activeBg: 'rgba(16,185,129,0.18)',  activeBorder: '#10B981',  glow: '0 0 12px rgba(16,185,129,0.4)',  sublabel: undefined },
                  { key: 'draft',      label: activeFilter === 'draft'      ? backToLabel : t(FILTER_LABEL_KEY.draft),           count: stats.draft,          color: '#94a3b8', bg: 'rgba(148,163,184,0.05)', border: 'rgba(148,163,184,0.18)', activeBg: 'rgba(148,163,184,0.18)', activeBorder: '#94a3b8',  glow: '0 0 12px rgba(148,163,184,0.4)', sublabel: undefined },
                  { key: 'finalizing', label: activeFilter === 'finalizing' ? backToLabel : t(FILTER_LABEL_KEY.finalizing),      count: stats.finalizing,     color: '#EC4899', bg: 'rgba(236,72,153,0.05)',  border: 'rgba(236,72,153,0.18)',  activeBg: 'rgba(236,72,153,0.18)',  activeBorder: '#EC4899',  glow: '0 0 12px rgba(236,72,153,0.4)',  sublabel: undefined },
                  // Real feature, per direct follow-up: "I want to
                  // queue these informal requests on the worklist with
                  // a Tile." Deliberately a distinct violet, not
                  // reused from "completed"'s own green (the retired
                  // "Needs Review" tile used that green before it was
                  // removed) or grosscomplete's cyan.
                  { key: 'informalreview', label: activeFilter === 'informalreview' ? backToLabel : t(FILTER_LABEL_KEY.informalreview), count: stats.informalReview, color: '#8B5CF6', bg: 'rgba(139,92,246,0.05)',  border: 'rgba(139,92,246,0.18)',  activeBg: 'rgba(139,92,246,0.18)',  activeBorder: '#8B5CF6',  glow: '0 0 12px rgba(139,92,246,0.4)',  sublabel: undefined },
                  // Batch 439 (PS-144): peer reviews waiting on this pathologist. Shown only when there are some.
                  { key: 'peerreview', label: activeFilter === 'peerreview' ? backToLabel : t(FILTER_LABEL_KEY.peerreview), count: stats.peerReview, color: '#F59E0B', bg: 'rgba(245,158,11,0.05)',  border: 'rgba(245,158,11,0.18)',  activeBg: 'rgba(245,158,11,0.18)',  activeBorder: '#F59E0B',  glow: '0 0 12px rgba(245,158,11,0.4)',  sublabel: undefined },
                  { key: 'followup', label: activeFilter === 'followup' ? backToLabel : t(FILTER_LABEL_KEY.followup), count: stats.followUp, color: '#DC2626', bg: 'rgba(220,38,38,0.05)',  border: 'rgba(220,38,38,0.18)',  activeBg: 'rgba(220,38,38,0.18)',  activeBorder: '#DC2626',  glow: '0 0 12px rgba(220,38,38,0.4)',  sublabel: undefined },
                  // Batch 440: positive GYN cytology waiting for a pathologist. Shown only when there are some.
                  { key: 'cytologyreview', label: activeFilter === 'cytologyreview' ? backToLabel : t(FILTER_LABEL_KEY.cytologyreview), count: stats.cytologyReview, color: '#EF4444', bg: 'rgba(239,68,68,0.05)',  border: 'rgba(239,68,68,0.18)',  activeBg: 'rgba(239,68,68,0.18)',  activeBorder: '#EF4444',  glow: '0 0 12px rgba(239,68,68,0.4)',  sublabel: undefined },
                ] as const)
                  // Real, per direct guidance ("let's not display
                  // tiles with 0 entries" — deliberately scoped to
                  // just this new tile, not a retroactive change to
                  // every other tile above, all of which keep their
                  // own established "always visible, count included"
                  // behavior unchanged): the filtered-out tile's own
                  // filter still works correctly if a viewer had it
                  // active and its count later drops to 0 — the table
                  // below just shows its own real "no cases" state,
                  // it doesn't reset or break.
                  .filter(tile => (tile.key !== 'needsrevision' && tile.key !== 'peerreview' && tile.key !== 'followup' && tile.key !== 'cytologyreview') || tile.count > 0)
                  .map(tile => {
                  const isActive = activeFilter === tile.key;
                  return (
                    <button
                      key={tile.key}
                      aria-pressed={isActive}
                      className="ps-wl-filter-tile"
                      title={isActive ? t('worklistPage.tileTitleActive', { label: tile.label }) : t('worklistPage.tileTitleInactive', { label: tile.label })}
                      onClick={() => { setActiveFilter(isActive ? 'all' : tile.key as any); setSelectedIndex(-1); setSelectedCaseId(null); }}
                      style={{
                        '--tile-bg':     isActive ? tile.activeBg  : tile.bg,
                        '--tile-border': isActive ? tile.activeBorder : tile.border,
                        '--tile-shadow': isActive ? tile.glow : 'none',
                      } as React.CSSProperties}
                    >
                      <div className="ps-wl-filter-tile__label" style={{ '--tile-label-color': isActive ? tile.color : '#8899aa', '--tile-label-mix': isActive ? '55%' : '100%' } as React.CSSProperties}>
                        {tile.label}
                      </div>
                      <div className="ps-wl-filter-tile__count" style={{ '--tile-count-color': tile.color } as React.CSSProperties}>
                        {tile.count}
                      </div>
                      <div className="ps-wl-filter-tile__sublabel" style={{ '--tile-count-color': tile.color, '--tile-sublabel-opacity': tile.sublabel ? 0.75 : 0 } as React.CSSProperties}>
                        {tile.sublabel || '\u00A0'}
                      </div>
                    </button>
                  );
                });
                })()}

                {activeFilter === 'physician' && physicianFilter && (
                  <div className="ps-wl-physician-chip">
                    👤 {physicianFilter}
                    <button onClick={() => { setActiveFilter('all'); setPhysicianFilter(''); }} className="ps-wl-physician-chip-clear">✕</button>
                  </div>
                )}


              </div>
            </div>
              </>)}
            </div>

            {view === 'cases' && (<>
            {/* Physician voice prompt — conditional, fixed height */}
            {physicianPrompt && (
              <div className="ps-wl-voice-prompt">
                <span className="ps-wl-voice-prompt-text">🎙️ {physicianPrompt}</span>
                <button onClick={() => setPhysicianPrompt(null)} className="ps-wl-voice-prompt-close">✕</button>
              </div>
            )}

            {/* Worklist table: fills the rest of the page (CSS flex, Batch 416) */}
            <AmendedAddendaTriageTile pathologistId={user?.id ?? ''} />
            <PendingGrossingTriageTile cases={realCases} />
            <div
              ref={wrapperRef}
              data-capture-hide="true"
              className="ps-table-scroll-wrap ps-table-scroll-wrap--relative ps-table-scroll-wrap--fill"
              tabIndex={0}
              role="region"
              aria-label={t('worklistPage.tableRegionLabel')}
            >
              <WorklistTable
                flagDefinitions={allFlags}
                cases={filteredCases}
                activeFilter={activeFilter}
                amendmentTypeByCaseId={amendmentAddendaCaseIds}
                onBeforeNavigate={caseId => { if (user?.id) caseViewTrackingService.recordView(user.id, caseId); }}
                wsiSlidesByCaseId={wsiSlidesByCaseId}
                dpResultByCaseId={dpResultByCaseId}
                onOpenDpDrawer={setDpDrawerCaseId}
                branchFilter={branchFilter}
                delegatedCaseIds={delegatedCaseIds}
                slaBreaches={slaBreaches}
                interceptOpen={activeFilter === 'cytologyreview' ? openCytologyReviewCase : undefined}
                onPoolCaseClick={(caseId, summary) => {
                  const c = realCases.find(c => c.id === caseId);
                  // The pool name is the case's own poolName (membership and access requests match on it); no made-up fallback.
                  const poolName = (c as { poolName?: string } | undefined)?.poolName;
                  if (!poolName) { console.error('[Worklist] Pool case has no pool name:', caseId); return; }
                  setClaimModal({
                    caseId,
                    summary,
                    poolName,
                  });
                }}
                selectedIndex={selectedIndex}
                selectedCaseId={selectedCaseId}
                onRowSelect={(idx: number, id: string) => { setSelectedIndex(idx); setSelectedCaseId(id); }}
                onFirstCaseId={(id: string | null) => {
                  if ((location.state as any)?.fromCaseId) return;
                  if (selectedCaseId) return;
                  if (id) { setSelectedIndex(0); setSelectedCaseId(id); }
                }}
                onDisplayOrder={handleDisplayOrder}
              />
            </div>
            </>)}
            {(view === 'cytologyQc' || view === 'surgicalQa') && (
              <div className="ps-wl-queue-view">
                {view === 'cytologyQc' ? <CytologyQcQueuePage /> : <SurgicalQaWorklistPage />}
              </div>
            )}

          </div>
        </main>

      </div>

      <ResourcesModal
        isOpen={isResourcesOpen}
        onClose={() => setIsResourcesOpen(false)}
        quickLinks={quickLinks}
      />
      {/* Real, per direct follow-up ("some cases will have DP,
          others may not") — same, single worklist. "Open Case
          Workspace" reuses the exact same real navigate() call
          openCaseId already uses for every other real row — the
          real Smart Landing Routing itself (Synoptic vs. Standard)
          is already handled internally by SynopticReportPage.tsx
          per that case's own real data, not a second, separate
          routing rule invented here. */}
      {dpDrawerCaseId && (() => {
        const dpCase = realCases.find(c => c.id === dpDrawerCaseId);
        if (!dpCase) return null;
        return (
          <SlideDetailDrawer
            caseData={dpCase}
            slides={wsiSlidesByCaseId.get(dpDrawerCaseId) ?? []}
            aiResult={dpResultByCaseId.get(dpDrawerCaseId)}
            onClose={() => setDpDrawerCaseId(null)}
            onOpenCaseWorkspace={() => {
              setDpDrawerCaseId(null);
              void openCasePage(dpDrawerCaseId, 'synoptic', { state: { worklistCaseIds: filteredCases.map(c => c.id) } });
            }}
          />
        );
      })()}
      <LogoutWarningModal
        isOpen={showLogoutWarning}
        onClose={() => setShowLogoutWarning(false)}
        onLogout={handleLogout}
      />
      <PoolClaimModal
        isOpen={!!claimModal}
        caseId={claimModal?.caseId ?? null}
        caseSummary={claimModal?.summary}
        poolName={claimModal?.poolName}
        currentUserId={CURRENT_USER_ID}
        currentUserName={CURRENT_USER_NAME}
        currentUserOrganisationId={(user as any)?.organisationId}
        fromFilter="pool"
        continueToReport={true}
        onAccepted={() => {
          setClaimModal(null);
          caseRouter.listCasesForUser(user?.id ?? 'current').then(setRealCases).catch(() => {});
        }}
        onPassed={() => setClaimModal(null)}
        onClose={() => setClaimModal(null)}
      />
      <ConfirmModal
        show={!!cytologyTake}
        title={t('worklistPage.cytologyReview.takeTitle')}
        message={cytologyTake?.error ?? t('worklistPage.cytologyReview.takeMessage')}
        confirmLabel={t('worklistPage.cytologyReview.takeConfirm')}
        onConfirm={confirmCytologyTake}
        onCancel={() => setCytologyTake(null)}
      />

    </div>
  );
};

export default WorklistPage;
