import React, { useState, useEffect } from 'react';
import '../pathscribe.css';
<<<<<<< HEAD
import { useNavigate } from 'react-router-dom';

// ── Types & Data ─────────────────────────────────────────────────────────────
// Components import ONLY from services/index.ts — never directly from mock/firestore files.
import type { AuditLog, ErrorLog } from '../services/auditLog/IAuditService';
import { auditService } from '../services';
=======
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSystemConfig } from '@/contexts/SystemConfigContext';
import { useAuth } from '@/contexts/AuthContext';
import { getFacilityDateParts, getFacilityMidnightUtc } from '@/utils/facilityTime';
import ResourcesModal from './WorklistPage/ResourcesModal';

// ── Types & Data ─────────────────────────────────────────────────────────────
// Components import ONLY from services/index.ts — never directly from mock/firestore files.
// Two exceptions below (mockPatientIndexService, listOrganisations) — neither
// is exported through services/index.ts today; PatientMatchReviewSection.tsx
// itself already imports them directly the same way, so this matches a real,
// existing precedent rather than introducing a new one.
import type { AuditLog, ErrorLog } from '../services/auditlog/IAuditService';
import type { SpecimenDeficiency, DeficiencyType } from '../services/deficiencies/IDeficiencyService';
import type { ManagementReview } from '../services/deficiencies/IDeficiencyService';
import type { IntraoperativeEntry } from '../types/intraop/IntraoperativeEntry';
import type { ReconciliationRecord } from '../types/quality/ReconciliationRecord';
import type { CountersignRecord } from '../types/case/CountersignRecord';
import type { FppeAssignment } from '../types/case/FppeAssignment';
import type { MasterPatientRecord } from '../services/patients/IPatientIndexService';
import type { InterfaceException } from '../services/interfaceExceptions/IInterfaceExceptionService';
import InterfaceExceptionReviewModal from '../components/Audit/InterfaceExceptionReviewModal';
import BreakGlassRebindModal from '../components/Audit/BreakGlassRebindModal';
import {
  auditService, specimenDeficiencyService, deficiencyTypeService,
  intraoperativeService, reconciliationService, countersignService,
  fppeAssignmentService, managementReviewService, interfaceExceptionService,
} from '../services';
import { mockPatientIndexService } from '../services/patients/mockPatientIndexService';
import { listOrganisations } from '../services/organisation/organisationService';
import { formatAuditTimestamp } from '../utils/formatDate';

type ActiveTab = 'audit' | 'errors' | 'quality';

// ── Quality Assurance groups ─────────────────────────────────────────────────
// Every tabbed item group from the Quality Assurance working queue
// (pages/DeficienciesPage.tsx), normalized into one searchable/exportable
// shape here — this is the complete historical record across all of them,
// not just deficiencies. Each group keeps its own real status vocabulary
// (a deficiency's Open/Pending/Closed isn't the same thing as a countersign's
// Pending/Countersigned) rather than forcing one fake shared status set.
type QaGroup = 'deficiency' | 'intraop-linkage' | 'reconciliation' | 'countersign' | 'fppe' | 'drift' | 'patient-match' | 'management-review';

const GROUP_LABELS: Record<QaGroup, string> = {
  'deficiency': 'Deficiencies',
  'intraop-linkage': 'Intraoperative Linkage',
  'reconciliation': 'Discordance & Reconciliation',
  'countersign': 'Countersign Turnaround',
  'fppe': 'Credentialing Review',
  'drift': 'Post-Finalization Drift',
  'patient-match': 'Patient Match Review',
  'management-review': 'Management Reviews',
};

// Status options per group — 'all' plus whatever that group's own real
// status values are. Management Reviews and Patient Match Review each have
// only one real status ('Completed' / 'Needs Review' respectively) — kept
// in the record as a real value rather than omitted, since a recorded
// review or a flagged match is itself the compliance evidence, status
// vocabulary or not. See Pete's own point: not having a multi-value status
// isn't a reason to leave something out of the permanent record.
const GROUP_STATUS_OPTIONS: Record<QaGroup, { value: string; label: string }[]> = {
  'deficiency': [{ value: 'open', label: 'Open' }, { value: 'pending-verification', label: 'Pending Verification' }, { value: 'closed', label: 'Closed' }],
  'intraop-linkage': [{ value: 'pending', label: 'Pending' }, { value: 'merged', label: 'Merged' }],
  'reconciliation': [{ value: 'concordant', label: 'Concordant' }, { value: 'discordant', label: 'Discordant' }],
  'countersign': [{ value: 'pending', label: 'Pending' }, { value: 'countersigned', label: 'Countersigned' }],
  'fppe': [{ value: 'active', label: 'Active' }, { value: 'completed', label: 'Completed' }],
  'drift': [{ value: 'Post-Finalization Drift Detected', label: 'Detected' }, { value: 'Post-Finalization Drift Auto-Corrected', label: 'Auto-Corrected' }, { value: 'Post-Finalization Drift Correction Deferred', label: 'Deferred' }, { value: 'Post-Finalization Drift Correction Failed', label: 'Failed' }],
  'patient-match': [{ value: 'needs-review', label: 'Needs Review' }],
  'management-review': [{ value: 'completed', label: 'Completed' }],
};

// One normalized shape every group's real records get mapped into, so one
// table/filter/export can cover all 8 without 8 parallel implementations.
interface QualityRecord {
  id: string;
  group: QaGroup;
  date: string;       // ISO — drives date-range filtering and the Date column
  caseId?: string;
  specimen?: string;
  detail: string;      // main descriptive text (issue/event/finding)
  statusValue: string; // matches a GROUP_STATUS_OPTIONS[group] value, for filtering
  statusLabel: string; // display text
  user?: string;        // who's associated, for user-filtering
}
>>>>>>> upstream/main

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseDateStr(ts: string): Date {
  return new Date(ts.replace(' ', 'T'));
}

<<<<<<< HEAD
function getDateThreshold(range: string): Date | null {
  const now = new Date();
  const d   = new Date(now);
  if (range === 'today')  { d.setHours(0, 0, 0, 0); return d; }
  if (range === '7days')  { d.setDate(d.getDate() - 7);  return d; }
  if (range === '30days') { d.setDate(d.getDate() - 30); return d; }
=======
function getDateThreshold(range: string, timezone: string): Date | null {
  const now = new Date();
  const d   = new Date(now);
  // Real fix: "today" specifically needs the real, configured facility
  // timezone's own midnight, not the viewing device's own local midnight
  // - the other three cases below are genuine, timezone-independent
  // absolute-time subtraction (N days' worth of real milliseconds), not
  // at risk of the same bug.
  if (range === 'today')  {
    const { year, month, day } = getFacilityDateParts(now, timezone);
    return getFacilityMidnightUtc(year, month, day, timezone);
  }
  // eslint-disable-next-line no-restricted-properties -- Real, honest justification: genuinely different from the 'today' case above (already fixed with real facility-timezone logic). This is absolute-time subtraction (N days' worth of real milliseconds from now), not calendar-day bucketing - not at risk of the same facility-timezone bug.
  if (range === '7days')  { d.setDate(d.getDate() - 7);  return d; }
  // eslint-disable-next-line no-restricted-properties -- Same real justification as the '7days' case above.
  if (range === '30days') { d.setDate(d.getDate() - 30); return d; }
  // eslint-disable-next-line no-restricted-properties -- Same real justification as the '7days' case above.
>>>>>>> upstream/main
  if (range === '90days') { d.setDate(d.getDate() - 90); return d; }
  return null;
}

function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function buildMetaHeader(
  reportType: string,
  requestedBy: string,
  filters: Record<string, string>,
  rowCount: number
): string {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  const filterStr = Object.entries(filters)
    .filter(([, v]) => v && v !== 'all')
    .map(([k, v]) => `${k}: ${v}`)
    .join(' | ') || 'None';
  return [
    `${esc('PathScribe AI — System Audit Log Export')}`,
    `${esc('NOTICE: For authorised audit and compliance purposes only. Do not distribute.')}`,
    `${esc('No direct patient identifiers included (HIPAA / GDPR / Privacy Act compliant).')}`,
    ``,
    `"Report Type",${esc(reportType)}`,
    `"Exported At",${esc(now)}`,
    `"Requested By",${esc(requestedBy)}`,
    `"Active Filters",${esc(filterStr)}`,
    `"Total Records",${esc(String(rowCount))}`,
    ``,
  ].join('\n');
}

function exportAuditCSV(rows: AuditLog[], requestedBy: string, filters: Record<string, string>) {
  const esc = (v: string | number | null) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const meta = buildMetaHeader('Audit Log', requestedBy, filters, rows.length);
  const data = [
    ['ID', 'Timestamp', 'Type', 'Event', 'Detail', 'Actioned By', 'Accession No.', 'AI Confidence'].join(','),
    ...rows.map(r => [r.id, r.timestamp, r.type, r.event, r.detail, r.user, r.caseId ?? '', r.confidence ?? ''].map(esc).join(','))
  ];
  downloadCSV(meta + data.join('\n'), `pathscribe-audit-log-${new Date().toISOString().slice(0,10)}.csv`);
}

function exportErrorCSV(rows: ErrorLog[], requestedBy: string, filters: Record<string, string>) {
  const esc = (v: string | number | boolean | null) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const meta = buildMetaHeader('Error Log', requestedBy, filters, rows.length);
  const data = [
    ['ID', 'Timestamp', 'Severity', 'Code', 'Message', 'Source', 'Accession No.', 'Resolved'].join(','),
    ...rows.map(r => [r.id, r.timestamp, r.severity, r.code, r.message, r.source, r.caseId ?? '', r.resolved].map(esc).join(','))
  ];
  downloadCSV(meta + data.join('\n'), `pathscribe-error-log-${new Date().toISOString().slice(0,10)}.csv`);
}

<<<<<<< HEAD
// UNIQUE_USERS is derived from loaded data — see useMemo below


// ── Component ────────────────────────────────────────────────────────────────

const AuditLogPage: React.FC = () => {
  const navigate = useNavigate();
=======
// Same compliance-notice/meta-header convention as the other two exports
// on this page, and the same PHI-safety principle qaReportUtils.ts
// already established for this exact data elsewhere (Intraop Linkage,
// Reconciliation, etc. exports): no patient name, MRN, or DOB — only
// case/accession identifiers, since none of the app's normal access
// controls apply once something leaves as a downloaded file. This is
// the record CAP and other certification bodies get pointed to during
// an inspection, so it needs to hold up as a real, self-explanatory
// document on its own — the notice/filter/requester header makes clear
// what it is and how it was scoped, the same way the audit/error
// exports already do.
function exportQualityCSV(rows: QualityRecord[], requestedBy: string, filters: Record<string, string>) {
  const esc = (v: string | number | null) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const meta = buildMetaHeader('Quality Assurance Log', requestedBy, filters, rows.length);
  const data = [
    ['ID', 'Group', 'Date', 'Case', 'Specimen', 'Detail', 'Status', 'User'].join(','),
    ...rows.map(r => [
      r.id, GROUP_LABELS[r.group], r.date, r.caseId ?? '', r.specimen ?? '', r.detail, r.statusLabel, r.user ?? '',
    ].map(esc).join(','))
  ];
  downloadCSV(meta + data.join('\n'), `pathscribe-quality-assurance-log-${new Date().toISOString().slice(0,10)}.csv`);
}

// UNIQUE_USERS is derived from loaded data — see useMemo below

// ── Role-based access helpers ─────────────────────────────────────────────────

const VALIDATION_EVENTS = new Set([
  'validation_study_created', 'validation_study_activated',
  'validation_study_closed',  'validation_study_deleted',
  'validation_report_generated',
  'validation_routing_rule_added', 'validation_routing_rule_updated',
  'validation_routing_rule_deleted',
]);

// ── Badge style helpers ──────────────────────────────────────────────────────
// Return a class-name modifier + label rather than raw colors — the actual
// color values live in pathscribe.css's .ps-auditlog-badge-- family.

const TYPE_LABELS: Record<string, string> = { ai: 'AI', user: 'User', system: 'System' };
function getTypeBadge(type: string): { className: string; label: string } {
  const known = type === 'ai' || type === 'user' || type === 'system';
  return {
    className: known ? `ps-auditlog-badge--${type}` : 'ps-auditlog-badge--default',
    label: TYPE_LABELS[type] ?? type,
  };
}

const SEVERITY_LABELS: Record<string, string> = { error: 'Error', warning: 'Warning', info: 'Info' };
function getSeverityBadge(sev: string): { className: string; label: string } {
  const known = sev === 'error' || sev === 'warning' || sev === 'info';
  return {
    className: known ? `ps-auditlog-badge--${sev}` : 'ps-auditlog-badge--default',
    label: SEVERITY_LABELS[sev] ?? sev,
  };
}

// ── Component ────────────────────────────────────────────────────────────────
const AuditLogPage: React.FC = () => {
  const navigate = useNavigate();
  const { config } = useSystemConfig();
>>>>>>> upstream/main

  const [isLoaded,        setIsLoaded]        = useState(false);
  const [auditLogs,       setAuditLogs]       = useState<AuditLog[]>([]);
  const [errorLogs,       setErrorLogs]       = useState<ErrorLog[]>([]);
<<<<<<< HEAD
  const [isResourcesOpen, setIsResourcesOpen] = useState(false);
  const [activeTab,       setActiveTab]       = useState<ActiveTab>('audit');
=======
  /** Real feature, per direct confirmation: "Users should be able to
   *  see interface error log under Audit, a new pill Interfaces." A
   *  genuinely different data shape from ErrorLog — real HL7 interface
   *  messages this app could not safely auto-resolve (see
   *  services/interfaceExceptions/ for the full A43 story that created
   *  the need for this), not a generic system error. Loaded alongside
   *  errorLogs, shown via its own pill within the same Error Log tab. */
  const [interfaceExceptions, setInterfaceExceptions] = useState<InterfaceException[]>([]);
  /** Real feature, per direct confirmation: "Manual Review Queue /
   *  Flagging (Safest)" — the exception currently open in the review
   *  modal, or null when closed. */
  const [reviewingException, setReviewingException] = useState<InterfaceException | null>(null);
  /** Real feature, per direct confirmation, building Phase B of the
   *  "Interface Exception & Case-Binding Module." Deliberately gated
   *  to isAdmin at the trigger below — restricted, not a general tool. */
  const [breakGlassOpen, setBreakGlassOpen] = useState(false);
  const [deficiencyLogs,      setDeficiencyLogs]      = useState<SpecimenDeficiency[]>([]);
  const [deficiencyTypes,     setDeficiencyTypes]     = useState<DeficiencyType[]>([]);
  const [intraopEntries,      setIntraopEntries]      = useState<IntraoperativeEntry[]>([]);
  const [reconciliationLogs,  setReconciliationLogs]  = useState<ReconciliationRecord[]>([]);
  const [countersignLogs,     setCountersignLogs]     = useState<CountersignRecord[]>([]);
  const [fppeLogs,            setFppeLogs]            = useState<FppeAssignment[]>([]);
  const [driftLogs,           setDriftLogs]           = useState<AuditLog[]>([]);
  const [patientMatchLogs,    setPatientMatchLogs]    = useState<MasterPatientRecord[]>([]);
  const [managementReviews,   setManagementReviews]   = useState<ManagementReview[]>([]);
  const [isResourcesOpen, setIsResourcesOpen] = useState(false);
  const [activeTab,       setActiveTab]       = useState<ActiveTab>('audit');
  const [searchParams] = useSearchParams();

  // Real feature, per direct confirmation: a high-priority message
  // about pending interface exceptions should land the recipient
  // directly on the relevant view, not the generic page — real
  // deep-linking via ?tab=errors&pill=interfaces, read once on mount.
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const pillParam = searchParams.get('pill');
    if (tabParam === 'errors') setActiveTab('errors');
    if (pillParam === 'interfaces') setErrorSeverity('interfaces');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Role-based access ─────────────────────────────────────────────────────
  // Was two independent localStorage.getItem('pathscribe-user') + JSON.parse
  // calls (a module-level getRole() plus this component's own storedUser
  // IIFE) — the same duplication already found and fixed in
  // ConfigurationPage.tsx. Both now read from the one AuthContext already
  // parses and exposes.
  const { user: storedUser } = useAuth();
  const role          = storedUser?.role ?? 'pathologist';
  const isSuperAdmin  = role === 'superadmin';
  const isAdmin       = ['admin', 'pathologist-admin', 'superadmin'].includes(role);
  const isPathologist = role === 'pathologist';
  // Real fix: all three exports on this page previously hardcoded
  // "Requested By: Unknown" regardless of who was actually logged in —
  // a real gap given these are exactly the exports meant to hold up
  // under a CAP or other certification inspection, where knowing who
  // pulled the report is part of the point.
  const requestedByLabel = storedUser?.name ?? storedUser?.email ?? 'Unknown';
>>>>>>> upstream/main

  // Audit filters
  const [typeFilter,  setTypeFilter]  = useState<'all' | 'ai' | 'user' | 'system'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [userFilter,  setUserFilter]  = useState('all');
  const [dateRange,   setDateRange]   = useState('7days');
  const [dateFrom,    setDateFrom]    = useState('');
  const [dateTo,      setDateTo]      = useState('');

  // Error filters
<<<<<<< HEAD
  const [errorSeverity, setErrorSeverity] = useState<'all' | 'error' | 'warning' | 'info'>('all');
  const [errorSearch,   setErrorSearch]   = useState('');
  const [errorResolved, setErrorResolved] = useState<'all' | 'open' | 'resolved'>('all');
=======
  const [errorSeverity, setErrorSeverity] = useState<'all' | 'error' | 'warning' | 'info' | 'interfaces'>('all');
  const [errorSearch,   setErrorSearch]   = useState('');
  const [errorResolved, setErrorResolved] = useState<'all' | 'open' | 'resolved'>('all');
  /** Real feature, per direct confirmation. Separate resolution filter
   *  for interface exceptions, since their real status vocabulary
   *  ('pending'/'resolved'/'dismissed') is genuinely different from
   *  ErrorLog's own open/resolved boolean. */
  const [interfaceStatus, setInterfaceStatus] = useState<'all' | 'pending' | 'resolved' | 'dismissed'>('all');

  // Quality Assurance filters — Group first (which of the 8 tabbed item
  // groups from the working queue), then Status (that group's own real
  // vocabulary — see GROUP_STATUS_OPTIONS, not one fake shared status
  // set), then User, then Date, then Search. Matches the exact order
  // requested, and mirrors the Audit tab's own filter shape/order above.
  const [qualityGroup,  setQualityGroup]  = useState<QaGroup>('deficiency');
  const [qualityStatus, setQualityStatus] = useState('all');
  const [qualityUser,   setQualityUser]   = useState('all');
  const [qualitySearch, setQualitySearch] = useState('');
  const [qualityDateRange, setQualityDateRange] = useState('all');
  const [qualityDateFrom,  setQualityDateFrom]  = useState('');
  const [qualityDateTo,    setQualityDateTo]    = useState('');
>>>>>>> upstream/main

  useEffect(() => {
    const t = setTimeout(() => setIsLoaded(true), 100);
    // Load audit and error logs from service layer
    auditService.getAuditLogs().then(r => { if (r.ok) setAuditLogs(r.data); });
    auditService.getErrorLogs().then(r => { if (r.ok) setErrorLogs(r.data); });
<<<<<<< HEAD
    return () => clearTimeout(t);
  }, []);


  // ── Filtering ────────────────────────────────────────────────────────────

  const filteredAuditLogs = auditLogs.filter(log => {
    if (typeFilter !== 'all' && log.type !== typeFilter) return false;
    if (userFilter !== 'all' && log.user !== userFilter) return false;
=======
    interfaceExceptionService.getAll().then(r => { if (r.ok) setInterfaceExceptions(r.data); });
    specimenDeficiencyService.getAll().then(r => { if (r.ok) setDeficiencyLogs(r.data); });
    deficiencyTypeService.getAll().then(r => { if (r.ok) setDeficiencyTypes(r.data); });
    intraoperativeService.getAll().then(r => { if (r.ok) setIntraopEntries(r.data); });
    reconciliationService.getAll().then(r => { if (r.ok) setReconciliationLogs(r.data); });
    countersignService.getAll().then(r => { if (r.ok) setCountersignLogs(r.data); });
    fppeAssignmentService.getAll().then(r => { if (r.ok) setFppeLogs(r.data); });
    managementReviewService.getAll().then(r => { if (r.ok) setManagementReviews(r.data); });
    // Drift reuses the same real audit-log-backed source
    // DriftCorrectionTab.tsx itself reads from — no dedicated service
    // exists for this, by design (see that file's own header comment).
    auditService.getAuditLogs({ search: 'Drift' }).then(r => {
      if (r.ok) setDriftLogs(r.data.filter(l => (Object.keys(GROUP_STATUS_OPTIONS.drift.reduce((a, o) => ({ ...a, [o.value]: 1 }), {} as Record<string, 1>))).includes(l.event)));
    });
    // Patient Match Review's own service is org-scoped with no
    // cross-org getAll (see PatientMatchReviewSection.tsx) — aggregate
    // across every organisation for the same complete-record purpose
    // this whole tab exists for.
    listOrganisations().then(async orgs => {
      const perOrg = await Promise.all(orgs.map(o => mockPatientIndexService.listPendingReview(o.id)));
      setPatientMatchLogs(perOrg.flat());
    });
    return () => clearTimeout(t);
  }, []);

  /** Real feature, per direct confirmation. Callable reload, distinct
   *  from the one-time load above — the review modal calls this after
   *  a real resolve/dismiss action, so the list (and the pending-count
   *  badge on the pill) reflects the real, current state immediately. */
  const reloadInterfaceExceptions = () => {
    interfaceExceptionService.getAll().then(r => { if (r.ok) setInterfaceExceptions(r.data); });
  };

  // Real bug fix: this page declared isResourcesOpen and rendered
  // ResourcesModal but never listened for the global
  // PATHSCRIBE_PAGE_OPEN_RESOURCES event that actually opens it elsewhere
  // (see WorklistPage.tsx, where this same modal is wired up correctly) —
  // meaning the modal had no way to ever open on this page at all.
  useEffect(() => {
    const openResources = () => setIsResourcesOpen(true);
    window.addEventListener('PATHSCRIBE_PAGE_OPEN_RESOURCES', openResources);
    return () => window.removeEventListener('PATHSCRIBE_PAGE_OPEN_RESOURCES', openResources);
  }, []);

  // ── Role-based scoping ───────────────────────────────────────────────────────
  // Applied before user-defined filters.
  const roleFilteredLogs = auditLogs.filter(log => {
    // Validation study events hidden from all except admin/superadmin
    if (!isAdmin && VALIDATION_EVENTS.has(log.event)) return false;
    // Pathologists: case audit is a shared clinical record — show all case events
    // Hide system/config events from other users that have no caseId
    if (isPathologist) {
      if (log.caseId) return true;
      if (log.user === storedUser?.name || log.user === storedUser?.email) return true;
      return false;
    }
    return true;
  });

  const filteredAuditLogs = roleFilteredLogs.filter(log => {
    if (typeFilter !== 'all' && log.type !== typeFilter) return false;
    if (isSuperAdmin && userFilter !== 'all' && log.user !== userFilter) return false;
>>>>>>> upstream/main
    const logDate = parseDateStr(log.timestamp);
    if (dateRange === 'custom') {
      if (dateFrom && logDate < new Date(dateFrom))                    return false;
      if (dateTo   && logDate > new Date(dateTo + 'T23:59:59'))        return false;
    } else {
<<<<<<< HEAD
      const threshold = getDateThreshold(dateRange);
=======
      const threshold = getDateThreshold(dateRange, config.facilityTimezone);
>>>>>>> upstream/main
      if (threshold && logDate < threshold)                            return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (![log.event, log.detail, log.user, log.caseId ?? ''].some(s => s.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const filteredErrorLogs = errorLogs.filter(log => {
<<<<<<< HEAD
    if (errorSeverity !== 'all' && log.severity !== errorSeverity)     return false;
=======
    if (errorSeverity !== 'all' && (log.severity as string) !== errorSeverity) return false;
>>>>>>> upstream/main
    if (errorResolved === 'open'     &&  log.resolved)                 return false;
    if (errorResolved === 'resolved' && !log.resolved)                 return false;
    if (errorSearch) {
      const q = errorSearch.toLowerCase();
      if (![log.message, log.code, log.source, log.caseId ?? ''].some(s => s.toLowerCase().includes(q))) return false;
    }
    return true;
  });

<<<<<<< HEAD
  // ── Style helpers ────────────────────────────────────────────────────────

  const getTypeStyle = (type: string) => ({
    ai:     { bg: 'rgba(8,145,178,0.12)',   color: '#0891B2', label: 'AI'     },
    user:   { bg: 'rgba(16,185,129,0.12)',  color: '#10B981', label: 'User'   },
    system: { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8', label: 'System' },
  }[type] ?? { bg: 'rgba(100,116,139,0.12)', color: '#64748b', label: type });

  const getSeverityStyle = (sev: string) => ({
    error:   { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444', label: 'Error'   },
    warning: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', label: 'Warning' },
    info:    { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', label: 'Info'    },
  }[sev] ?? { bg: 'rgba(100,116,139,0.12)', color: '#64748b', label: sev });

  const sel: React.CSSProperties = {
    padding: '8px 12px', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px',
    color: '#cbd5e1', fontSize: '13px', cursor: 'pointer', outline: 'none',
  };

  const openErrors = errorLogs.filter(e => !e.resolved).length;
=======
  const filteredInterfaceExceptions = interfaceExceptions.filter(e => {
    if (interfaceStatus !== 'all' && e.status !== interfaceStatus) return false;
    if (errorSearch) {
      const q = errorSearch.toLowerCase();
      if (![e.eventType, e.reason, e.sourcePatientIdentifier ?? '', e.targetPatientIdentifier ?? ''].some(s => s.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const qualityTypeName = (id: string) => deficiencyTypes.find(t => t.id === id)?.name ?? id;
  const driftStatusLabel = (event: string) => GROUP_STATUS_OPTIONS.drift.find(o => o.value === event)?.label ?? event;

  // Normalizes whichever group is currently selected into the one shared
  // QualityRecord shape — only the active group's own source data is
  // normalized (not all 8 at once on every render), since only one
  // group's table is ever visible at a time.
  const normalizedQualityRecords: QualityRecord[] = (() => {
    switch (qualityGroup) {
      case 'deficiency': return deficiencyLogs.map(d => ({
        id: d.id, group: 'deficiency' as const, date: d.raisedAt, caseId: d.caseId,
        specimen: d.specimenLabel ?? 'Case-level',
        detail: `${qualityTypeName(d.deficiencyTypeId)}${d.status === 'open' ? (d.comment ? ' — ' + d.comment : '') : (d.correctiveAction ? ' — ' + d.correctiveAction : '')}`,
        statusValue: d.status, statusLabel: d.status === 'open' ? 'Open' : d.status === 'pending-verification' ? 'Pending Verification' : 'Closed',
        user: d.raisedBy === 'system' ? 'System' : d.raisedBy,
      }));
      case 'intraop-linkage': return intraopEntries.map(e => ({
        id: e.id, group: 'intraop-linkage' as const, date: e.mergedAt ?? e.createdAt, caseId: e.mergedIntoCaseId,
        detail: `OR ${e.orNumber}`, statusValue: e.status, statusLabel: e.status === 'merged' ? 'Merged' : 'Pending',
        user: e.performedBy?.userName,
      }));
      case 'reconciliation': return reconciliationLogs.map(r => ({
        id: r.id, group: 'reconciliation' as const, date: r.recordedAt, caseId: r.caseId, specimen: r.caseType,
        detail: r.outcome === 'discordant' ? `${r.frozenDx} → ${r.finalDx}${r.comments ? ' — ' + r.comments : ''}` : `${r.frozenDx} → ${r.finalDx}`,
        statusValue: r.outcome, statusLabel: r.outcome === 'concordant' ? 'Concordant' : 'Discordant',
        user: r.recordedBy?.userName,
      }));
      case 'countersign': return countersignLogs.map(c => ({
        id: c.id, group: 'countersign' as const, date: c.countersignedAt ?? c.releasedAt, caseId: c.caseId,
        detail: `${c.residentName} → ${c.attendingName ?? 'pending'}${c.attendingFeedback ? ' — ' + c.attendingFeedback : ''}`,
        statusValue: c.status, statusLabel: c.status === 'countersigned' ? 'Countersigned' : 'Pending',
        user: c.residentName,
      }));
      case 'fppe': return fppeLogs.map(a => ({
        id: a.id, group: 'fppe' as const, date: a.completedAt ?? a.startedAt,
        detail: `${a.provisionalUserName} (proctor: ${a.proctorUserName}) — ${a.casesReviewedCount} cases reviewed`,
        statusValue: a.status, statusLabel: a.status === 'completed' ? 'Completed' : 'Active',
        user: a.provisionalUserName,
      }));
      case 'drift': return driftLogs.map(l => ({
        id: l.id, group: 'drift' as const, date: l.timestamp, caseId: l.caseId ?? undefined,
        detail: l.detail, statusValue: l.event, statusLabel: driftStatusLabel(l.event), user: l.user,
      }));
      case 'patient-match': return patientMatchLogs.map(p => ({
        id: p.id, group: 'patient-match' as const, date: p.createdAt,
        detail: `${p.lastName}, ${p.firstName} (MRN ${p.mrn}) — ${p.reviewReason}`,
        statusValue: 'needs-review', statusLabel: 'Needs Review',
      }));
      case 'management-review': return managementReviews.map(r => ({
        id: r.id, group: 'management-review' as const, date: r.reviewedAt,
        detail: `${r.deficiencyIds.length} item${r.deficiencyIds.length === 1 ? '' : 's'} — ${r.findings}`,
        statusValue: 'completed', statusLabel: 'Completed', user: r.reviewedBy,
      }));
    }
  })();

  const qualityUniqueUsers = Array.from(new Set(normalizedQualityRecords.map(r => r.user).filter((u): u is string => !!u))).sort();

  const filteredQualityLogs = normalizedQualityRecords.filter(r => {
    if (qualityStatus !== 'all' && r.statusValue !== qualityStatus) return false;
    if (isSuperAdmin && qualityUser !== 'all' && r.user !== qualityUser) return false;
    const logDate = parseDateStr(r.date);
    if (qualityDateRange === 'custom') {
      if (qualityDateFrom && logDate < new Date(qualityDateFrom))                return false;
      if (qualityDateTo   && logDate > new Date(qualityDateTo + 'T23:59:59'))    return false;
    } else {
      const threshold = getDateThreshold(qualityDateRange, config.facilityTimezone);
      if (threshold && logDate < threshold)                                      return false;
    }
    if (qualitySearch) {
      const q = qualitySearch.toLowerCase();
      const haystack = [r.caseId ?? '', r.specimen ?? '', r.detail, r.user ?? ''];
      if (!haystack.some(s => s.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const openQualityCount = deficiencyLogs.filter(l => l.status === 'open').length;

  useEffect(() => { setQualityStatus('all'); }, [qualityGroup]);

  const openErrors = errorLogs.filter(e => !e.resolved).length;
  const pendingInterfaceCount = interfaceExceptions.filter(e => e.status === 'pending').length;

  // Was an IIFE `{(() => { ... })()}` computed inline inside the JSX
  // return — pulled out to a real component-body value, same standard
  // applied to business logic found embedded in the UI elsewhere in this
  // review.
  const stats = activeTab === 'audit' ? [
    { label: 'Total Events',  value: roleFilteredLogs.length,                                  colorClass: 'ps-auditlog-stat-value--teal',   icon: '📋' },
    { label: 'AI Actions',    value: roleFilteredLogs.filter(l => l.type === 'ai').length,     colorClass: 'ps-auditlog-stat-value--purple', icon: '🤖' },
    { label: 'User Changes',  value: roleFilteredLogs.filter(l => l.type === 'user').length,   colorClass: 'ps-auditlog-stat-value--green',  icon: '👤' },
    { label: 'System Events', value: roleFilteredLogs.filter(l => l.type === 'system').length, colorClass: 'ps-auditlog-stat-value--gray',   icon: '⚙️' },
  ] : activeTab === 'errors' ? [
    { label: 'Total Errors', value: errorLogs.length,                                        colorClass: 'ps-auditlog-stat-value--red',   icon: '🚨' },
    { label: 'Open Issues',  value: errorLogs.filter(e => !e.resolved).length,               colorClass: 'ps-auditlog-stat-value--amber', icon: '🔓' },
    { label: 'Resolved',     value: errorLogs.filter(e => e.resolved).length,                colorClass: 'ps-auditlog-stat-value--green', icon: '✅' },
    { label: 'Warnings',     value: errorLogs.filter(e => e.severity === 'warning').length,  colorClass: 'ps-auditlog-stat-value--amber', icon: '⚠️' },
  ] : [
    { label: 'Total Records', value: normalizedQualityRecords.length, colorClass: 'ps-auditlog-stat-value--teal', icon: '✓' },
    ...GROUP_STATUS_OPTIONS[qualityGroup].map(opt => ({
      label: opt.label,
      value: normalizedQualityRecords.filter(r => r.statusValue === opt.value).length,
      colorClass: opt.label === 'Closed' || opt.label === 'Merged' || opt.label === 'Concordant' || opt.label === 'Countersigned' || opt.label === 'Completed' || opt.label === 'Auto-Corrected'
        ? 'ps-auditlog-stat-value--green'
        : opt.label === 'Open' || opt.label === 'Discordant' || opt.label === 'Failed'
        ? 'ps-auditlog-stat-value--red'
        : 'ps-auditlog-stat-value--amber',
      icon: opt.label === 'Closed' || opt.label === 'Merged' || opt.label === 'Concordant' || opt.label === 'Countersigned' || opt.label === 'Completed' || opt.label === 'Auto-Corrected' ? '✅'
        : opt.label === 'Open' || opt.label === 'Discordant' || opt.label === 'Failed' ? '🔴' : '🟡',
    })),
  ];
>>>>>>> upstream/main

  const quickLinks = {
    protocols:  [{ title: 'CAP Cancer Protocols', url: 'https://www.cap.org/protocols-and-guidelines' }, { title: 'WHO Classification', url: 'https://www.who.int/publications' }],
    references: [{ title: 'PathologyOutlines', url: 'https://www.pathologyoutlines.com' }, { title: 'UpToDate', url: 'https://www.uptodate.com' }],
    systems:    [{ title: 'Hospital LIS', url: '#' }, { title: 'Lab Management', url: '#' }],
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
<<<<<<< HEAD
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#000', color: '#fff', fontFamily: "'Inter', sans-serif", opacity: isLoaded ? 1 : 0, transition: 'opacity 0.6s ease', display: 'flex', flexDirection: 'column' }}>

      {/* Background */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/main_background.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0, filter: 'brightness(0.3) contrast(1.1)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, #000 100%)', zIndex: 1 }} />

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* ── Nav ── */}

        {/* ── Main ── */}
        <main style={{ flex: 1, minHeight: 0, padding: '28px 40px 20px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Header + Tab switcher */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px', flexShrink: 0 }}>
            <div>
              <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '4px' }}>System Logs</h1>
              <p style={{ fontSize: '14px', color: '#94a3b8' }}>Complete record of AI actions, user changes, system events and errors</p>
            </div>
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
              {(['audit', 'error'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '8px 18px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'all 0.2s', background: activeTab === tab ? 'rgba(8,145,178,0.25)' : 'transparent', color: activeTab === tab ? '#0891B2' : '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {tab === 'audit' ? '📋 Audit Log' : '⚠️ Error Log'}
                  {tab === 'error' && openErrors > 0 && <span style={{ background: '#ef4444', color: '#fff', borderRadius: '10px', fontSize: '10px', fontWeight: 700, padding: '1px 6px' }}>{openErrors}</span>}
=======
    <div className={`ps-auditlog-page${isLoaded ? ' ps-auditlog-page--loaded' : ''}`}>

      {/* Background */}
      <div className="ps-auditlog-bg" />
      <div className="ps-auditlog-bg-grad" />

      <div className="ps-auditlog-content">

        {/* ── Main ── */}
        <main className="ps-auditlog-main">

          {/* Header + Tab switcher */}
          <div className="ps-auditlog-header-row">
            <div>
              <h1 className="ps-auditlog-title">System Logs</h1>
              <p className="ps-auditlog-subtitle">Complete record of AI actions, user changes, system events, errors, and quality assurance activity</p>
              {isPathologist && (
                <div className="ps-auditlog-role-notice">
                  Showing your case activity only — validation study events are not visible to pathologists
                </div>
              )}
            </div>
            <div className="ps-auditlog-tabswitch">
              {(['audit', 'errors', 'quality'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`ps-auditlog-tabswitch-btn${activeTab === tab ? ' ps-auditlog-tabswitch-btn--active' : ''}`}>
                  {tab === 'audit' ? '📋 Audit Log' : tab === 'errors' ? '⚠️ Error Log' : '✓ Quality Assurance'}
                  {tab === 'errors' && openErrors > 0 && <span className="ps-auditlog-tabswitch-badge">{openErrors}</span>}
                  {tab === 'quality' && openQualityCount > 0 && <span className="ps-auditlog-tabswitch-badge">{openQualityCount}</span>}
>>>>>>> upstream/main
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
<<<<<<< HEAD
          {(() => {
            const stats = activeTab === 'audit' ? [
              { label: 'Total Events',  value: auditLogs.length,                                  color: '#0891B2', icon: '📋' },
              { label: 'AI Actions',    value: auditLogs.filter(l => l.type === 'ai').length,     color: '#8B5CF6', icon: '🤖' },
              { label: 'User Changes',  value: auditLogs.filter(l => l.type === 'user').length,   color: '#10B981', icon: '👤' },
              { label: 'System Events', value: auditLogs.filter(l => l.type === 'system').length, color: '#94a3b8', icon: '⚙️' },
            ] : [
              { label: 'Total Errors', value: errorLogs.length,                                        color: '#ef4444', icon: '🚨' },
              { label: 'Open Issues',  value: errorLogs.filter(e => !e.resolved).length,               color: '#f59e0b', icon: '🔓' },
              { label: 'Resolved',     value: errorLogs.filter(e => e.resolved).length,                color: '#10B981', icon: '✅' },
              { label: 'Warnings',     value: errorLogs.filter(e => e.severity === 'warning').length,  color: '#f59e0b', icon: '⚠️' },
            ];
            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px', flexShrink: 0 }}>
                {stats.map((s, i) => (
                  <div key={i} style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '26px' }}>{s.icon}</span>
                    <div>
                      <div style={{ fontSize: '22px', fontWeight: 800, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
=======
          <div className="ps-auditlog-stats-grid">
            {stats.map((s, i) => (
              <div key={i} className="ps-auditlog-stat-card">
                <span className="ps-auditlog-stat-icon">{s.icon}</span>
                <div>
                  <div className={`ps-auditlog-stat-value ${s.colorClass}`}>{s.value}</div>
                  <div className="ps-auditlog-stat-label">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
>>>>>>> upstream/main

          {/* ── AUDIT TAB ── */}
          {activeTab === 'audit' && (
            <>
              {/* Filters */}
<<<<<<< HEAD
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '12px', flexShrink: 0 }}>
                {/* Type pills */}
                <div style={{ display: 'flex', gap: '5px' }}>
                  {([{ id: 'all', label: 'All' }, { id: 'ai', label: '🤖 AI' }, { id: 'user', label: '👤 User' }, { id: 'system', label: '⚙️ System' }] as const).map(f => (
                    <button key={f.id} onClick={() => setTypeFilter(f.id)} style={{ padding: '6px 13px', borderRadius: '20px', border: typeFilter === f.id ? '2px solid #0891B2' : '1px solid rgba(255,255,255,0.2)', background: typeFilter === f.id ? 'rgba(8,145,178,0.15)' : 'transparent', color: typeFilter === f.id ? '#0891B2' : '#94a3b8', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>{f.label}</button>
                  ))}
                </div>
                <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }} />
                {/* User */}
                <select value={userFilter} onChange={e => setUserFilter(e.target.value)} style={{ ...sel, minWidth: '170px' }}>
                  {['all', ...Array.from(new Set(auditLogs.map(l => l.user))).sort()].map(u => (
                    <option key={u} value={u}>{u === 'all' ? 'All Users' : u}</option>
                  ))}
                </select>
                {/* Date range */}
                <select value={dateRange} onChange={e => setDateRange(e.target.value)} style={sel}>
=======
              <div className="ps-auditlog-filter-row">
                {/* Type pills */}
                <div className="ps-auditlog-pill-group">
                  {([{ id: 'all', label: 'All' }, { id: 'ai', label: '🤖 AI' }, { id: 'user', label: '👤 User' }, { id: 'system', label: '⚙️ System' }] as const).map(f => (
                    <button key={f.id} onClick={() => setTypeFilter(f.id)} className={`ps-auditlog-pill${typeFilter === f.id ? ' ps-auditlog-pill--active-teal' : ''}`}>{f.label}</button>
                  ))}
                </div>
                <div className="ps-auditlog-filter-divider" />
                {/* User filter — superadmin only to prevent bias in validation studies */}
                {isSuperAdmin && (
                <select value={userFilter} onChange={e => setUserFilter(e.target.value)} aria-label="Filter by user" className="ps-auditlog-select ps-auditlog-select--wide">
                  {['all', ...Array.from(new Set(roleFilteredLogs.map(l => l.user))).sort()].map(u => (
                    <option key={u} value={u}>{u === 'all' ? 'All Users' : u}</option>
                  ))}
                </select>
                )}
                {/* Date range */}
                <select value={dateRange} onChange={e => setDateRange(e.target.value)} aria-label="Filter by date range" className="ps-auditlog-select">
>>>>>>> upstream/main
                  <option value="today">Today</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="90days">Last 90 Days</option>
                  <option value="custom">Custom Range…</option>
                </select>
                {dateRange === 'custom' && (
                  <>
<<<<<<< HEAD
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...sel, colorScheme: 'dark' }} />
                    <span style={{ color: '#64748b', fontSize: '13px' }}>to</span>
                    <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   style={{ ...sel, colorScheme: 'dark' }} />
                  </>
                )}
                {/* Text search */}
                <div style={{ position: 'relative', flex: 1, minWidth: '160px' }}>
                  <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  </div>
                  <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search event, detail, case ID…" style={{ ...sel, paddingLeft: '30px', width: '100%', boxSizing: 'border-box', color: '#fff' }} />
=======
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="ps-auditlog-select ps-auditlog-select--date" />
                    <span className="ps-auditlog-date-to">to</span>
                    <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   className="ps-auditlog-select ps-auditlog-select--date" />
                  </>
                )}
                {/* Text search */}
                <div className="ps-auditlog-search-wrap">
                  <div className="ps-auditlog-search-icon">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  </div>
                  <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search event, detail, case ID…" className="ps-auditlog-select ps-auditlog-search-input" />
>>>>>>> upstream/main
                </div>
                {/* Export */}
                <button onClick={() => exportAuditCSV(
                    filteredAuditLogs,
<<<<<<< HEAD
                    'Unknown',
                    { 'Type': typeFilter, 'User': userFilter, 'Date Range': dateRange === 'custom' ? `${dateFrom} to ${dateTo}` : dateRange, 'Search': searchQuery }
                  )} style={{ padding: '7px 13px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#94a3b8', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.borderColor = '#0891B2'; e.currentTarget.style.color = '#0891B2'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#94a3b8'; }}>
=======
                    requestedByLabel,
                    { 'Type': typeFilter, 'User': userFilter, 'Date Range': dateRange === 'custom' ? `${dateFrom} to ${dateTo}` : dateRange, 'Search': searchQuery }
                  )} className="ps-auditlog-export-btn">
>>>>>>> upstream/main
                  ↓ Export CSV
                </button>
              </div>

              {/* Table */}
<<<<<<< HEAD
              <div style={{ flex: 1, minHeight: 0, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '170px 75px 145px 1fr 155px 80px', padding: '10px 20px', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>
                  <div>Timestamp</div><div>Type</div><div>Event</div><div>Detail</div><div>User</div><div>Case</div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {filteredAuditLogs.length === 0 ? (
                    <div style={{ padding: '50px', textAlign: 'center', color: '#475569' }}>
                      <div style={{ fontSize: '36px', marginBottom: '10px' }}>📋</div>
                      <div style={{ fontSize: '15px', fontWeight: 600 }}>No logs match your filters</div>
                    </div>
                  ) : filteredAuditLogs.map((log, idx) => {
                    const ts = getTypeStyle(log.type);
                    return (
                      <div key={log.id} style={{ display: 'grid', gridTemplateColumns: '170px 75px 145px 1fr 155px 80px', padding: '12px 20px', borderBottom: idx < filteredAuditLogs.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', fontSize: '13px', alignItems: 'center', transition: 'background 0.15s', cursor: 'default' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <div style={{ color: '#64748b', fontSize: '12px', fontFamily: 'monospace' }}>{log.timestamp}</div>
                        <div><span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: ts.bg, color: ts.color }}>{ts.label}</span></div>
                        <div style={{ color: '#e2e8f0', fontWeight: 600 }}>{log.event}</div>
                        <div style={{ color: '#94a3b8', fontSize: '12px', paddingRight: '16px' }}>{log.detail}</div>
                        <div style={{ color: '#cbd5e1', fontSize: '12px' }}>{log.user}</div>
                        <div>{log.caseId ? <span style={{ color: '#0891B2', fontSize: '12px', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }} onClick={() => navigate(`/case/${log.caseId}/synoptic`)}>{log.caseId}</span> : <span style={{ color: '#475569' }}>—</span>}</div>
=======
              <div className="ps-table-scroll-wrap" tabIndex={0} role="region" aria-label="Audit log entries, scrollable table">
              <div className="ps-auditlog-table ps-auditlog-table--audit">
                <div className="ps-auditlog-thead ps-auditlog-thead--audit">
                  <div>Timestamp</div><div>Type</div><div>Event</div><div>Detail</div><div>User</div><div>Case</div>
                </div>
                <div className="ps-auditlog-tbody">
                  {filteredAuditLogs.length === 0 ? (
                    <div className="ps-auditlog-empty">
                      <div className="ps-auditlog-empty-icon">📋</div>
                      <div className="ps-auditlog-empty-text">No logs match your filters</div>
                    </div>
                  ) : filteredAuditLogs.map((log) => {
                    const typeBadge = getTypeBadge(log.type);
                    return (
                      <div key={log.id} className="ps-auditlog-row ps-auditlog-row--audit">
                        <div className="ps-auditlog-cell-time">{formatAuditTimestamp(log.timestamp)}</div>
                        <div><span className={`ps-auditlog-badge ${typeBadge.className}`}>{typeBadge.label}</span></div>
                        <div className="ps-auditlog-cell-event">{log.event}</div>
                        <div className="ps-auditlog-cell-detail">{log.detail}</div>
                        <div className="ps-auditlog-cell-user">{log.user}</div>
                        <div>{log.caseId ? <span className="ps-auditlog-case-link" onClick={() => navigate(`/case/${log.caseId}/synoptic`)}>{log.caseId}</span> : <span className="ps-auditlog-case-dash">—</span>}</div>
>>>>>>> upstream/main
                      </div>
                    );
                  })}
                </div>
              </div>
<<<<<<< HEAD
              <div style={{ marginTop: '6px', fontSize: '12px', color: '#475569', textAlign: 'right', flexShrink: 0 }}>Showing {filteredAuditLogs.length} of {auditLogs.length} events</div>
=======
              </div>{/* end ps-table-scroll-wrap */}
              <div className="ps-auditlog-count-footer">Showing {filteredAuditLogs.length} of {roleFilteredLogs.length} events</div>
>>>>>>> upstream/main
            </>
          )}

          {/* ── ERROR TAB ── */}
<<<<<<< HEAD
          {activeTab === 'error' && (
            <>
              {/* Filters */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '12px', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: '5px' }}>
                  {([{ id: 'all', label: 'All' }, { id: 'error', label: '🚨 Error' }, { id: 'warning', label: '⚠️ Warning' }, { id: 'info', label: 'ℹ️ Info' }] as const).map(f => (
                    <button key={f.id} onClick={() => setErrorSeverity(f.id)} style={{ padding: '6px 13px', borderRadius: '20px', border: errorSeverity === f.id ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.2)', background: errorSeverity === f.id ? 'rgba(239,68,68,0.12)' : 'transparent', color: errorSeverity === f.id ? '#ef4444' : '#94a3b8', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>{f.label}</button>
                  ))}
                </div>
                <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }} />
                <select value={errorResolved} onChange={e => setErrorResolved(e.target.value as any)} style={sel}>
                  <option value="all">All Status</option>
                  <option value="open">Open Only</option>
                  <option value="resolved">Resolved Only</option>
                </select>
                <div style={{ position: 'relative', flex: 1, minWidth: '160px' }}>
                  <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  </div>
                  <input type="text" value={errorSearch} onChange={e => setErrorSearch(e.target.value)} placeholder="Search message, code, source…" style={{ ...sel, paddingLeft: '30px', width: '100%', boxSizing: 'border-box', color: '#fff' }} />
                </div>
                <button onClick={() => exportErrorCSV(
                    filteredErrorLogs,
                    'Unknown',
                    { 'Severity': errorSeverity, 'Status': errorResolved, 'Search': errorSearch }
                  )} style={{ padding: '7px 13px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#94a3b8', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#94a3b8'; }}>
                  ↓ Export CSV
                </button>
              </div>

              {/* Error Table */}
              <div style={{ flex: 1, minHeight: 0, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '165px 85px 105px 1fr 145px 75px 85px', padding: '10px 20px', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>
                  <div>Timestamp</div><div>Severity</div><div>Code</div><div>Message</div><div>Source</div><div>Case</div><div>Status</div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {filteredErrorLogs.length === 0 ? (
                    <div style={{ padding: '50px', textAlign: 'center', color: '#475569' }}>
                      <div style={{ fontSize: '36px', marginBottom: '10px' }}>✅</div>
                      <div style={{ fontSize: '15px', fontWeight: 600 }}>No errors match your filters</div>
                    </div>
                  ) : filteredErrorLogs.map((log, idx) => {
                    const ss = getSeverityStyle(log.severity);
                    return (
                      <div key={log.id} style={{ display: 'grid', gridTemplateColumns: '165px 85px 105px 1fr 145px 75px 85px', padding: '12px 20px', borderBottom: idx < filteredErrorLogs.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', fontSize: '13px', alignItems: 'center', transition: 'background 0.15s', cursor: 'default' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <div style={{ color: '#64748b', fontSize: '12px', fontFamily: 'monospace' }}>{log.timestamp}</div>
                        <div><span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: ss.bg, color: ss.color }}>{ss.label}</span></div>
                        <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '12px', fontFamily: 'monospace' }}>{log.code}</div>
                        <div style={{ color: '#94a3b8', fontSize: '12px', paddingRight: '16px' }}>{log.message}</div>
                        <div style={{ color: '#cbd5e1', fontSize: '12px' }}>{log.source}</div>
                        <div>{log.caseId ? <span style={{ color: '#0891B2', fontSize: '12px', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }} onClick={() => navigate(`/case/${log.caseId}/synoptic`)}>{log.caseId}</span> : <span style={{ color: '#475569' }}>—</span>}</div>
                        <div><span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: log.resolved ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', color: log.resolved ? '#10B981' : '#ef4444' }}>{log.resolved ? 'Resolved' : 'Open'}</span></div>
=======
          {activeTab === 'errors' && (
            <>
              {/* Filters */}
              <div className="ps-auditlog-filter-row">
                <div className="ps-auditlog-pill-group">
                  {([{ id: 'all', label: 'All' }, { id: 'error', label: '🚨 Error' }, { id: 'warning', label: '⚠️ Warning' }, { id: 'info', label: 'ℹ️ Info' }, { id: 'interfaces', label: '🔌 Interfaces' }] as const).map(f => (
                    <button key={f.id} onClick={() => setErrorSeverity(f.id)} className={`ps-auditlog-pill${errorSeverity === f.id ? ' ps-auditlog-pill--active-red' : ''}`}>
                      {f.label}
                      {f.id === 'interfaces' && pendingInterfaceCount > 0 && <span className="ps-auditlog-tabswitch-badge">{pendingInterfaceCount}</span>}
                    </button>
                  ))}
                </div>
                <div className="ps-auditlog-filter-divider" />
                {errorSeverity === 'interfaces' ? (
                  <select value={interfaceStatus} onChange={e => setInterfaceStatus(e.target.value as 'all' | 'pending' | 'resolved' | 'dismissed')} aria-label="Filter by interface exception status" className="ps-auditlog-select">
                    <option value="all">All Status</option>
                    <option value="pending">Pending Only</option>
                    <option value="resolved">Resolved Only</option>
                    <option value="dismissed">Dismissed Only</option>
                  </select>
                ) : (
                  <select value={errorResolved} onChange={e => setErrorResolved(e.target.value as 'all' | 'open' | 'resolved')} aria-label="Filter by resolution status" className="ps-auditlog-select">
                    <option value="all">All Status</option>
                    <option value="open">Open Only</option>
                    <option value="resolved">Resolved Only</option>
                  </select>
                )}
                <div className="ps-auditlog-search-wrap">
                  <div className="ps-auditlog-search-icon">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  </div>
                  <input type="text" value={errorSearch} onChange={e => setErrorSearch(e.target.value)} placeholder={errorSeverity === 'interfaces' ? 'Search event type, reason…' : 'Search message, code, source…'} className="ps-auditlog-select ps-auditlog-search-input" />
                </div>
                {errorSeverity !== 'interfaces' && (
                  <button onClick={() => exportErrorCSV(
                      filteredErrorLogs,
                      requestedByLabel,
                      { 'Severity': errorSeverity, 'Status': errorResolved, 'Search': errorSearch }
                    )} className="ps-auditlog-export-btn ps-auditlog-export-btn--danger">
                    ↓ Export CSV
                  </button>
                )}
                {/* Real feature, per direct confirmation, building
                    Phase B of the "Interface Exception & Case-Binding
                    Module." Deliberately restricted (isAdmin only)
                    and only surfaced alongside the related Interfaces
                    pill — a rare, exceptional tool, not a general
                    action. */}
                {errorSeverity === 'interfaces' && isAdmin && storedUser?.organisationId && (
                  <button onClick={() => setBreakGlassOpen(true)} className="ps-auditlog-export-btn ps-auditlog-export-btn--danger">
                    ⚡ Break-Glass Rebind
                  </button>
                )}
              </div>

              {errorSeverity === 'interfaces' ? (
                <>
                  {/* Real feature, per direct confirmation: "Users
                      should be able to see interface error log under
                      Audit, a new pill Interfaces." Read-only display,
                      matching the existing Error Log table's own
                      convention exactly — no inline actions yet; see
                      services/interfaceExceptions/README.md for the
                      real resolve()/dismiss() methods this could wire
                      up to later. */}
                  <div className="ps-table-scroll-wrap" tabIndex={0} role="region" aria-label="Interface exception entries, scrollable table">
                    <div className="ps-auditlog-table ps-auditlog-table--error">
                      <div className="ps-auditlog-thead ps-auditlog-thead--interfaces">
                        <div>Timestamp</div><div>Event Type</div><div>Reason</div><div>Source Patient</div><div>Target Patient</div><div>Status</div>
                      </div>
                      <div className="ps-auditlog-tbody">
                        {filteredInterfaceExceptions.length === 0 ? (
                          <div className="ps-auditlog-empty">
                            <div className="ps-auditlog-empty-icon">✅</div>
                            <div className="ps-auditlog-empty-text">No interface exceptions match your filters</div>
                          </div>
                        ) : filteredInterfaceExceptions.map((e) => (
                          <div key={e.id} className="ps-auditlog-row ps-auditlog-row--interfaces">
                            <div className="ps-auditlog-cell-time">{formatAuditTimestamp(e.createdAt)}</div>
                            <div><span className="ps-auditlog-badge ps-auditlog-badge--info">{e.eventType}</span></div>
                            <div className="ps-auditlog-cell-detail">{e.reason}</div>
                            <div className="ps-auditlog-cell-user">{e.sourcePatientIdentifier ?? '—'}</div>
                            <div className="ps-auditlog-cell-user">{e.targetPatientIdentifier ?? '—'}</div>
                            <div>
                              {/* Real feature, per direct confirmation:
                                  "Manual Review Queue / Flagging
                                  (Safest)." A pending exception is
                                  actionable — clicking it opens the
                                  review modal. Resolved/dismissed ones
                                  stay a plain, read-only badge. */}
                              {e.status === 'pending' ? (
                                <button
                                  onClick={() => setReviewingException(e)}
                                  className="ps-auditlog-status-badge ps-auditlog-status-badge--open ps-iexc-review-btn"
                                >
                                  Review
                                </button>
                              ) : (
                                <span className="ps-auditlog-status-badge ps-auditlog-status-badge--resolved">
                                  {e.status === 'resolved' ? 'Resolved' : 'Dismissed'}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="ps-auditlog-count-footer">Showing {filteredInterfaceExceptions.length} of {interfaceExceptions.length} interface exceptions</div>
                </>
              ) : (
                <>
              {/* Error Table */}
              <div className="ps-table-scroll-wrap" tabIndex={0} role="region" aria-label="Error log entries, scrollable table">
              <div className="ps-auditlog-table ps-auditlog-table--error">
                <div className="ps-auditlog-thead ps-auditlog-thead--error">
                  <div>Timestamp</div><div>Severity</div><div>Code</div><div>Message</div><div>Source</div><div>Case</div><div>Status</div>
                </div>
                <div className="ps-auditlog-tbody">
                  {filteredErrorLogs.length === 0 ? (
                    <div className="ps-auditlog-empty">
                      <div className="ps-auditlog-empty-icon">✅</div>
                      <div className="ps-auditlog-empty-text">No errors match your filters</div>
                    </div>
                  ) : filteredErrorLogs.map((log) => {
                    const severityBadge = getSeverityBadge(log.severity);
                    return (
                      <div key={log.id} className="ps-auditlog-row ps-auditlog-row--error">
                        <div className="ps-auditlog-cell-time">{formatAuditTimestamp(log.timestamp)}</div>
                        <div><span className={`ps-auditlog-badge ${severityBadge.className}`}>{severityBadge.label}</span></div>
                        <div className="ps-auditlog-cell-code">{log.code}</div>
                        <div className="ps-auditlog-cell-detail">{log.message}</div>
                        <div className="ps-auditlog-cell-user">{log.source}</div>
                        <div>{log.caseId ? <span className="ps-auditlog-case-link" onClick={() => navigate(`/case/${log.caseId}/synoptic`)}>{log.caseId}</span> : <span className="ps-auditlog-case-dash">—</span>}</div>
                        <div><span className={`ps-auditlog-status-badge ${log.resolved ? 'ps-auditlog-status-badge--resolved' : 'ps-auditlog-status-badge--open'}`}>{log.resolved ? 'Resolved' : 'Open'}</span></div>
>>>>>>> upstream/main
                      </div>
                    );
                  })}
                </div>
              </div>
<<<<<<< HEAD
              <div style={{ marginTop: '6px', fontSize: '12px', color: '#475569', textAlign: 'right', flexShrink: 0 }}>Showing {filteredErrorLogs.length} of {errorLogs.length} errors</div>
=======
              </div>{/* end ps-table-scroll-wrap */}
              <div className="ps-auditlog-count-footer">Showing {filteredErrorLogs.length} of {errorLogs.length} errors</div>
                </>
              )}
            </>
          )}

          {/* ── QUALITY ASSURANCE TAB ──
              The permanent, complete Quality Assurance record — every
              tabbed item group from the working queue
              (pages/DeficienciesPage.tsx), not just deficiencies, the
              record CAP and other certification bodies get pointed to
              during an inspection. Deliberately separate from the
              working queue itself: that page is for active, day-to-day
              work (what needs a corrective action right now), this is
              the searchable historical archive across every group,
              including ones with no real open/closed lifecycle at all
              (a completed Management Review is itself the compliance
              evidence a review happened, status vocabulary or not).
              Active entries still stay downloadable from the working
              queue itself — this doesn't replace that, it's the
              complete record alongside it. */}
          {activeTab === 'quality' && (
            <>
              {/* Filters — Group, then Status (that group's own real
                  vocabulary), then User, then Date, then Search. */}
              <div className="ps-auditlog-filter-row">
                <select value={qualityGroup} onChange={e => setQualityGroup(e.target.value as QaGroup)} aria-label="Filter by group" className="ps-auditlog-select ps-auditlog-select--wide">
                  {(Object.keys(GROUP_LABELS) as QaGroup[]).map(g => <option key={g} value={g}>{GROUP_LABELS[g]}</option>)}
                </select>
                <div className="ps-auditlog-filter-divider" />
                <select value={qualityStatus} onChange={e => setQualityStatus(e.target.value)} aria-label="Filter by status" className="ps-auditlog-select">
                  <option value="all">All Statuses</option>
                  {GROUP_STATUS_OPTIONS[qualityGroup].map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                {/* User filter — superadmin only, same as the Audit
                    tab's own user filter above, and for the same
                    reason (avoid biasing validation/review work by
                    letting non-admins single out an individual). */}
                {isSuperAdmin && (
                  <select value={qualityUser} onChange={e => setQualityUser(e.target.value)} aria-label="Filter by user" className="ps-auditlog-select ps-auditlog-select--wide">
                    <option value="all">All Users</option>
                    {qualityUniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                )}
                {/* Date range — defaults to All Time, unlike Audit Log's
                    default of last 7 days, since this is meant to be
                    the complete historical record, not a recent-activity
                    feed. */}
                <select value={qualityDateRange} onChange={e => setQualityDateRange(e.target.value)} aria-label="Filter by date range" className="ps-auditlog-select">
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="90days">Last 90 Days</option>
                  <option value="custom">Custom Range…</option>
                </select>
                {qualityDateRange === 'custom' && (
                  <>
                    <input type="date" value={qualityDateFrom} onChange={e => setQualityDateFrom(e.target.value)} className="ps-auditlog-select ps-auditlog-select--date" />
                    <span className="ps-auditlog-date-to">to</span>
                    <input type="date" value={qualityDateTo}   onChange={e => setQualityDateTo(e.target.value)}   className="ps-auditlog-select ps-auditlog-select--date" />
                  </>
                )}
                {/* Text search */}
                <div className="ps-auditlog-search-wrap">
                  <div className="ps-auditlog-search-icon">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  </div>
                  <input type="text" value={qualitySearch} onChange={e => setQualitySearch(e.target.value)} placeholder="Search case, detail, user…" className="ps-auditlog-select ps-auditlog-search-input" />
                </div>
                {/* Export */}
                <button onClick={() => exportQualityCSV(
                    filteredQualityLogs,
                    requestedByLabel,
                    {
                      'Group': GROUP_LABELS[qualityGroup], 'Status': qualityStatus,
                      'User': qualityUser,
                      'Date Range': qualityDateRange === 'custom' ? `${qualityDateFrom} to ${qualityDateTo}` : qualityDateRange,
                      'Search': qualitySearch,
                    },
                  )} className="ps-auditlog-export-btn">
                  ↓ Export CSV
                </button>
              </div>

              {/* Table */}
              <div className="ps-table-scroll-wrap" tabIndex={0} role="region" aria-label="Quality assurance log entries, scrollable table">
              <div className="ps-auditlog-table ps-auditlog-table--quality">
                <div className="ps-auditlog-thead ps-auditlog-thead--quality">
                  <div>Date</div><div>Case</div><div>Specimen</div><div>Detail</div><div>Status</div><div>User</div>
                </div>
                <div className="ps-auditlog-tbody">
                  {filteredQualityLogs.length === 0 ? (
                    <div className="ps-auditlog-empty">
                      <div className="ps-auditlog-empty-icon">✓</div>
                      <div className="ps-auditlog-empty-text">No {GROUP_LABELS[qualityGroup].toLowerCase()} records match your filters</div>
                    </div>
                  ) : filteredQualityLogs.map((r) => (
                    <div key={r.id} className="ps-auditlog-row ps-auditlog-row--quality">
                      <div className="ps-auditlog-cell-time">{formatAuditTimestamp(r.date)}</div>
                      <div>{r.caseId ? <span className="ps-auditlog-case-link" onClick={() => navigate(`/case/${r.caseId}/synoptic`)}>{r.caseId}</span> : <span className="ps-auditlog-case-dash">—</span>}</div>
                      <div>{r.specimen ?? <span className="ps-auditlog-case-dash">—</span>}</div>
                      <div className="ps-auditlog-cell-detail">{r.detail}</div>
                      <div>
                        <span className={`ps-auditlog-status-badge ${
                          ['Closed', 'Merged', 'Concordant', 'Countersigned', 'Completed', 'Auto-Corrected'].includes(r.statusLabel) ? 'ps-auditlog-status-badge--resolved'
                          : ['Open', 'Discordant', 'Failed'].includes(r.statusLabel) ? 'ps-auditlog-status-badge--open'
                          : 'ps-auditlog-status-badge--pending'}`}>
                          {r.statusLabel}
                        </span>
                      </div>
                      <div>{r.user ?? <span className="ps-auditlog-case-dash">—</span>}</div>
                    </div>
                  ))}
                </div>
              </div>
              </div>{/* end ps-table-scroll-wrap */}
              <div className="ps-auditlog-count-footer">Showing {filteredQualityLogs.length} of {normalizedQualityRecords.length} {GROUP_LABELS[qualityGroup].toLowerCase()} records</div>
>>>>>>> upstream/main
            </>
          )}
        </main>

        {/* Footer */}
<<<<<<< HEAD
        <footer style={{ padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
          <div>© 2026 PathScribe AI Systems • HIPAA Compliant</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', background: '#10B981', borderRadius: '50%', boxShadow: '0 0 8px #10B981', display: 'inline-block' }} />
=======
        <footer className="ps-auditlog-footer">
          <div>© 2026 PathScribe AI Systems • HIPAA Compliant</div>
          <div className="ps-auditlog-footer-status">
            <span className="ps-auditlog-status-dot" />
>>>>>>> upstream/main
            SYSTEMS OPERATIONAL
          </div>
        </footer>
      </div>

<<<<<<< HEAD
      {/* Quick Links Modal */}
      {isResourcesOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }} onClick={() => setIsResourcesOpen(false)}>
          <div style={{ width: '500px', maxHeight: '80vh', overflowY: 'auto', backgroundColor: '#111', borderRadius: '20px', padding: '40px', border: '1px solid rgba(8,145,178,0.3)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
            <div style={{ color: '#0891B2', fontSize: '24px', fontWeight: 700, marginBottom: '24px', textAlign: 'center' }}>Quick Links</div>
            {Object.entries(quickLinks).map(([section, links]) => (
              <div key={section} style={{ marginBottom: '24px' }}>
                <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 700, marginBottom: '12px', textTransform: 'uppercase' }}>{section}</div>
                {links.map((link, i) => (
                  <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" onClick={() => setIsResourcesOpen(false)} style={{ display: 'block', color: '#cbd5e1', textDecoration: 'none', padding: '12px 16px', fontSize: '16px', borderRadius: '8px', marginBottom: '8px', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.color = '#0891B2'; e.currentTarget.style.backgroundColor = 'rgba(8,145,178,0.1)'; }} onMouseLeave={e => { e.currentTarget.style.color = '#cbd5e1'; e.currentTarget.style.backgroundColor = 'transparent'; }}>→ {link.title}</a>
                ))}
              </div>
            ))}
            <button onClick={() => setIsResourcesOpen(false)} style={{ padding: '12px 24px', borderRadius: '10px', background: 'rgba(8,145,178,0.15)', border: '1px solid rgba(8,145,178,0.3)', color: '#0891B2', fontWeight: 600, fontSize: '15px', cursor: 'pointer', width: '100%' }}>Close</button>
          </div>
        </div>
=======
      <ResourcesModal
        isOpen={isResourcesOpen}
        onClose={() => setIsResourcesOpen(false)}
        quickLinks={quickLinks}
      />

      {/* Real feature, per direct confirmation: "Manual Review Queue /
          Flagging (Safest)." */}
      {reviewingException && (
        <InterfaceExceptionReviewModal
          exception={reviewingException}
          requestedBy={requestedByLabel}
          onClose={() => setReviewingException(null)}
          onResolved={reloadInterfaceExceptions}
        />
      )}

      {/* Real feature, per direct confirmation, building Phase B of
          the "Interface Exception & Case-Binding Module." Restricted
          — the trigger button itself is isAdmin-gated above, and this
          render is too, as defense in depth. Real, deliberate
          fail-safe: never guesses an organisationId — a restricted
          tool silently operating on the wrong tenant's patient pool
          is a real, serious risk, not a cosmetic one, so an
          unresolvable session simply doesn't render the modal at all
          rather than defaulting to a specific organisation. */}
      {breakGlassOpen && isAdmin && storedUser?.organisationId && (
        <BreakGlassRebindModal
          organisationId={storedUser.organisationId}
          performedBy={storedUser.id}
          onClose={() => setBreakGlassOpen(false)}
          onRebound={reloadInterfaceExceptions}
        />
>>>>>>> upstream/main
      )}
    </div>
  );
};

export default AuditLogPage;
