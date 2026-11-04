// src/components/QualityAssurance/AccessRequestResponseTab.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real feature, per direct follow-up: "Do we Track the request to gain
// access? I would think that would be a good quality metric. How long
// did the Admins take, Do we generate a ticket system that has its own
// status. (Quality Assurance Tab)." The department-wide equivalent of
// what "My Contribution" shows one Admin at a time (see
// qualityCalculations.ts's own computeAccessRequestResponseOutliers) —
// same real relationship CountersignTurnaroundTab has to its own
// per-resident "My Contribution" figure. Real turnaround time
// (resolvedAt - requestedAt), across all three real request types
// (Pediatric, Pool, Orchestration).
//
// i18n note: TYPE_LABELS below stays exactly as it was — literal English
// — because the CSV export uses it directly ('Type': TYPE_LABELS[r.type]),
// and exported data stays English per this sweep's standing rule. The
// new TYPE_LABEL_KEY map is the on-screen-only translated counterpart;
// `r.type`/`r.status` themselves (the persisted enum values) are never
// touched.
// ─────────────────────────────────────────────────────────────────────────────
import { useOpenCase } from '@/hooks/useOpenCase';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { TooltipContentProps } from 'recharts';
import { accessRequestService } from '@/services';
import type { AccessRequest } from '@/types/access/AccessRequest';
import { QaScopeSwitcher } from './QaScopeSwitcher';
import { exportQaReportRows, scopeLabel, QaScope, qaScopeContext } from './qaReportUtils';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import ReasonPromptModal from '@/components/Common/ReasonPromptModal';
import { useAuth } from '@/contexts/AuthContext';
import { ACCESS_REQUEST_DECISION_CAPABILITY } from '@/services/access/accessRequestDecision';
import { getPatientCaseAccess } from '@/services/patientCaseAccess/patientCaseAccessService';
import { formatDateTime } from '@/utils/formatDate';
import { facilityMonthlyTrend, averageHours } from '@/services/quality/facilityMonthlyTrend';
import { useSystemConfig } from '@/contexts/SystemConfigContext';
import { pressable } from '@/utils/a11y/pressable';
import { LoadingState } from '@/components/Common/LoadingState';
import { CHART_TICK_COLOR } from '@/utils/chartTheme';

const hoursBetween = (a: string, b: string) => (new Date(b).getTime() - new Date(a).getTime()) / 3600000;

// Exported/persisted CSV column — stays literal English.
const TYPE_LABELS: Record<AccessRequest['type'], string> = {
  pediatric: 'Pediatric',
  pool: 'Pool',
  orchestration: 'Orchestration',
  patient_cases: "Patient's other cases",
};

// On-screen display only.
const TYPE_LABEL_KEY: Record<AccessRequest['type'], string> = {
  pediatric:     'accessRequestResponseTab.type.pediatric',
  pool:          'accessRequestResponseTab.type.pool',
  orchestration: 'accessRequestResponseTab.type.orchestration',
  patient_cases: 'accessRequestResponseTab.type.patient_cases',
};

const STATUS_LABEL_KEY: Record<'granted' | 'denied', string> = {
  granted: 'accessRequestResponseTab.status.granted',
  denied:  'accessRequestResponseTab.status.denied',
};

/** AccessRequest doesn't share Case's shape (order.facilityId /
 *  originHospitalId), so this scopes directly against its own real
 *  fields rather than forcing it through caseMatchesScope. Pool and
 *  Orchestration requests have no real facilityId (neither is tied to
 *  a referring facility) — only match a 'client' scope for Pediatric,
 *  which genuinely has one. */
function accessRequestMatchesScope(r: AccessRequest, scope: QaScope): boolean {
  if (scope.level === 'enterprise') return true;
  if (scope.level === 'client') return r.facilityId === scope.clientId;
  return r.organisationId === scope.organisationId;
}

export const AccessRequestResponseTab: React.FC = () => {
  const { t, i18n } = useTranslation();
  const openCasePage = useOpenCase();
  // Row click handler: only rows that name a case open it.
  const openCaseHandler = (caseId: string | undefined) => (caseId ? () => void openCasePage(caseId, 'synoptic') : undefined);
  const [scope, setScope] = useState<QaScope>({ level: 'enterprise' });
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  // Batch 432: denying a request (the service checks the permission and messages the requester).
  const [denyTarget, setDenyTarget] = useState<AccessRequest | null>(null);
  const [denyError, setDenyError] = useState<string | null>(null);
  // Batch 613: access to a patient's other cases in force (this person may revoke), and the one being revoked.
  const [grants, setGrants] = useState<AccessRequest[]>([]);
  const [revokeTarget, setRevokeTarget] = useState<AccessRequest | null>(null);
  const accessUser = user ? { id: user.id, name: user.name, role: user.role, organisationId: user.organisationId } : null;

  const load = () => Promise.all([
    accessRequestService.getAll(),
    accessUser ? getPatientCaseAccess().listRevocableGrants(accessUser) : Promise.resolve([] as AccessRequest[]),
  ]).then(([res, revocable]) => {
    if (res.ok) setRequests(res.data);
    setGrants(revocable);
    setLoading(false);
  });
  useEffect(() => { void load(); }, []);

  const confirmDeny = async (reason: string) => {
    const target = denyTarget;
    setDenyTarget(null);
    if (!target || !user) return;
    const res = target.type === 'patient_cases'
      ? await getPatientCaseAccess().denyAccess(target.id, accessUser!, reason)
      : await accessRequestService.deny(target.id, user.id, user.name ?? user.id, reason);
    setDenyError(res.ok ? null : t('accessRequestResponseTab.deny.failed'));
    await load();
  };

  const approvePatientCases = async (target: AccessRequest) => {
    if (!accessUser) return;
    const res = await getPatientCaseAccess().grantAccess(target.id, accessUser);
    setDenyError(res.ok ? null : t('accessRequestResponseTab.deny.failed'));
    await load();
  };

  const confirmRevoke = async (reason: string) => {
    const target = revokeTarget;
    setRevokeTarget(null);
    if (!target || !accessUser) return;
    const res = await getPatientCaseAccess().revokeAccess(target.id, accessUser, reason);
    setDenyError(res.ok ? null : t('accessRequestResponseTab.patientCases.revoke.failed'));
    await load();
  };

  const scoped = useMemo(
    () => requests.filter(r => accessRequestMatchesScope(r, scope)),
    [requests, scope]
  );

  const visibleClientIds = useMemo(
    () => Array.from(new Set(scoped.map(r => r.facilityId).filter((v): v is string => !!v))),
    [scoped]
  );

  const resolved = scoped.filter(r => r.status !== 'pending' && r.resolvedAt);
  const pending = scoped.filter(r => r.status === 'pending');
  const avgTurnaroundHours = resolved.length > 0
    ? resolved.reduce((s, r) => s + hoursBetween(r.requestedAt, r.resolvedAt!), 0) / resolved.length
    : null;
  const grantedCount = scoped.filter(r => r.status === 'granted').length;
  const deniedCount = scoped.filter(r => r.status === 'denied').length;

  // Real monthly turnaround trend, last 6 months — same pattern as the
  // other QA tabs' trend charts.
  const { config: systemConfig } = useSystemConfig();
  // Batch 504: by the facility's calendar month (services/quality/facilityMonthlyTrend.ts).
  const monthlyTrend = useMemo(() => facilityMonthlyTrend(resolved, r => r.resolvedAt, inMonth => ({
    avgHours: averageHours(inMonth, r => r.requestedAt, r => r.resolvedAt!), total: inMonth.length,
  }), systemConfig.facilityTimezone), [resolved, systemConfig.facilityTimezone]);

  const handleExport = () => {
    const rows = scoped.map(r => ({
      'Type': TYPE_LABELS[r.type],
      'Requested By': r.requestingUserName,
      'Case': r.caseId ?? '',
      'Status': r.status,
      'Requested At': r.requestedAt,
      'Resolved At': r.resolvedAt ?? '',
      'Turnaround Hours': r.resolvedAt ? hoursBetween(r.requestedAt, r.resolvedAt).toFixed(1) : '',
      'Resolved By': r.resolvedByUserName ?? '',
    }));
    void exportQaReportRows('qa:access-request-response:export', rows, `access-request-response-${scopeLabel(scope)}-${new Date().toISOString().slice(0, 10)}.csv`, qaScopeContext(scope), { scope });
  };

  if (loading) return <LoadingState label={t('accessRequestResponseTab.loading')} />;

  return (
    <div>
      <div className="ps-qa-tab-toolbar">
        <QaScopeSwitcher scope={scope} onChange={setScope} visibleClientIds={visibleClientIds} />
        <CapabilityButton capability="qa:access-request-response:export" context={qaScopeContext(scope)} className="ps-conf-btn-secondary" onClick={handleExport}>{t('common.export')}</CapabilityButton>
      </div>

      <div className="ps-defic-trend-card">
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={monthlyTrend} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: CHART_TICK_COLOR }} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: CHART_TICK_COLOR }} axisLine={false} tickLine={false} width={32} unit="h" />
            <Tooltip content={({ active, payload, label }: TooltipContentProps) => {
              if (!active || !payload?.length) return null;
              const point = payload[0]?.payload;
              return (
                <div className="ps-tat-trend__tooltip">
                  <div className="ps-tat-trend__tooltip-header">{label}</div>
                  {point?.avgHours !== null
                    ? <div className="ps-accessreq-trend-tooltip-value">{t('accessRequestResponseTab.tooltip.avgTurnaround', { hours: point.avgHours, count: point.total })}</div>
                    : <div className="ps-defic-trend-tooltip-empty">{t('accessRequestResponseTab.tooltip.noRequestsResolvedThisMonth')}</div>}
                </div>
              );
            }} />
            <Line type="monotone" dataKey="avgHours" stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 3, fill: '#38bdf8', strokeWidth: 0 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="ps-qa-summary-tiles">
        <div className="ps-qa-tile">
          <div className="ps-qa-tile-value">{avgTurnaroundHours !== null ? `${avgTurnaroundHours.toFixed(1)}h` : '—'}</div>
          <div className="ps-qa-tile-label">{t('countersignTurnaroundTab.tile.avgTurnaround')}</div>
        </div>
        <div className={`ps-qa-tile${pending.length > 0 ? ' ps-qa-tile--warning' : ''}`}>
          <div className={`ps-qa-tile-value${pending.length > 0 ? ' ps-qa-tile-value--warning' : ''}`}>{pending.length}</div>
          <div className="ps-qa-tile-label">{t('auditLog.statusLabels.pending')}</div>
        </div>
        <div className="ps-qa-tile">
          <div className="ps-qa-tile-value">{grantedCount}</div>
          <div className="ps-qa-tile-label">{t('accessRequestResponseTab.status.granted')}</div>
        </div>
        <div className="ps-qa-tile">
          <div className="ps-qa-tile-value">{deniedCount}</div>
          <div className="ps-qa-tile-label">{t('accessRequestResponseTab.status.denied')}</div>
        </div>
      </div>

      <div className="ps-defic-review-banner ps-mt-20 ps-mb-8">
        <span className="ps-defic-review-banner-label">{t('countersignTurnaroundTab.pendingBanner', { count: pending.length })}</span>
      </div>
      {denyError && <div className="ps-qa-inline-error" role="alert">{denyError}</div>}
      <ReasonPromptModal
        show={!!denyTarget}
        title={t('accessRequestResponseTab.deny.title')}
        message={denyTarget ? t('accessRequestResponseTab.deny.message', { name: denyTarget.requestingUserName }) : ''}
        reasonLabel={t('accessRequestResponseTab.deny.reasonLabel')}
        confirmLabel={t('accessRequestResponseTab.deny.button')}
        onConfirm={reason => void confirmDeny(reason)}
        onCancel={() => setDenyTarget(null)}
      />
      <div className="ps-conf-table-wrap">
        <table className="ps-conf-table">
          <thead><tr>
            <th className="ps-conf-th">{t('qualityAssurance.common.type')}</th>
            <th className="ps-conf-th">{t('accessRequestResponseTab.headers.requestedBy')}</th>
            <th className="ps-conf-th">{t('qualityAssurance.common.case')}</th>
            <th className="ps-conf-th">{t('accessRequestResponseTab.headers.requestedAt')}</th>
            <th className="ps-conf-th">{t('countersignTurnaroundTab.headers.waiting')}</th>
            <th className="ps-conf-th">{t('accessRequestResponseTab.headers.actions')}</th>
          </tr></thead>
          <tbody>
            {pending.length === 0 && <tr><td className="ps-conf-td" colSpan={6}>{t('accessRequestResponseTab.noPendingMessage')}</td></tr>}
            {pending.map(r => (
              <tr key={r.id} className={r.caseId ? 'ps-conf-tr-clickable' : undefined} {...pressable(openCaseHandler(r.caseId), { role: null })}>
                <td className="ps-conf-td">{t(TYPE_LABEL_KEY[r.type])}</td>
                <td className="ps-conf-td">{r.requestingUserName}</td>
                <td className="ps-conf-td" data-phi="accession">{r.caseId ?? <span className="ps-conf-td--muted-italic">—</span>}</td>
                <td className="ps-conf-td">{new Date(r.requestedAt).toLocaleString()}</td>
                <td className="ps-conf-td">{hoursBetween(r.requestedAt, new Date().toISOString()).toFixed(1)}h</td>
                {/* Batch 432: deny, with a reason. Granting happens where the
                    access lives (the request then closes itself). */}
                <td className="ps-conf-td" onClick={e => e.stopPropagation()}>
                  {r.type === 'patient_cases' && (
                    <CapabilityButton capability="patient:other-cases:decide-access" className="ps-conf-btn-primary" onClick={() => void approvePatientCases(r)}>
                      {t('patientCaseAccess.decide.approve')}
                    </CapabilityButton>
                  )}
                  <CapabilityButton capability={ACCESS_REQUEST_DECISION_CAPABILITY[r.type]} className="ps-conf-btn-secondary" onClick={() => setDenyTarget(r)}>
                    {t('accessRequestResponseTab.deny.button')}
                  </CapabilityButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ReasonPromptModal
        show={!!revokeTarget}
        title={t('accessRequestResponseTab.patientCases.revoke.title')}
        message={revokeTarget ? t('accessRequestResponseTab.patientCases.revoke.message', { name: revokeTarget.requestingUserName }) : ''}
        reasonLabel={t('accessRequestResponseTab.patientCases.revoke.reasonLabel')}
        confirmLabel={t('patientCaseAccess.grants.confirmRevoke')}
        onConfirm={reason => void confirmRevoke(reason)}
        onCancel={() => setRevokeTarget(null)}
      />
      <div className="ps-defic-review-banner ps-mt-20 ps-mb-8">
        <span className="ps-defic-review-banner-label">{t('accessRequestResponseTab.patientCases.heading')}</span>
      </div>
      <div className="ps-conf-table-wrap">
        <table className="ps-conf-table">
          <thead><tr>
            <th className="ps-conf-th">{t('accessRequestResponseTab.headers.requestedBy')}</th>
            <th className="ps-conf-th">{t('accessRequestResponseTab.headers.resolvedBy')}</th>
            <th className="ps-conf-th">{t('accessRequestResponseTab.headers.actions')}</th>
          </tr></thead>
          <tbody>
            {grants.length === 0 && <tr><td className="ps-conf-td" colSpan={3}>{t('accessRequestResponseTab.patientCases.none')}</td></tr>}
            {grants.map(g => (
              <tr key={g.id}>
                <td className="ps-conf-td">{g.requestingUserName}</td>
                <td className="ps-conf-td">{g.resolvedByUserName ?? '—'}{g.resolvedAt ? ` · ${formatDateTime(g.resolvedAt, i18n.language)}` : ''}</td>
                <td className="ps-conf-td">
                  <CapabilityButton capability="patient:other-cases:decide-access" className="ps-conf-btn-secondary" onClick={() => setRevokeTarget(g)}>
                    {t('patientCaseAccess.grants.revoke')}
                  </CapabilityButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ps-defic-review-banner ps-mt-20 ps-mb-8">
        <span className="ps-defic-review-banner-label">{t('accessRequestResponseTab.resolvedBanner', { count: resolved.length })}</span>
      </div>
      <div className="ps-conf-table-wrap">
        <table className="ps-conf-table">
          <thead>
            <tr>
              <th className="ps-conf-th">{t('qualityAssurance.common.type')}</th><th className="ps-conf-th">{t('accessRequestResponseTab.headers.requestedBy')}</th><th className="ps-conf-th">{t('qualityAssurance.common.status')}</th>
              <th className="ps-conf-th">{t('countersignTurnaroundTab.headers.turnaround')}</th><th className="ps-conf-th">{t('accessRequestResponseTab.headers.resolvedBy')}</th>
            </tr>
          </thead>
          <tbody>
            {resolved.length === 0 && <tr><td className="ps-conf-td" colSpan={5}>{t('accessRequestResponseTab.noResolvedMessage')}</td></tr>}
            {resolved.map(r => (
              <tr key={r.id} className={r.caseId ? 'ps-conf-tr-clickable' : undefined} {...pressable(openCaseHandler(r.caseId), { role: null })}>
                <td className="ps-conf-td">{t(TYPE_LABEL_KEY[r.type])}</td>
                <td className="ps-conf-td">{r.requestingUserName}</td>
                <td className={`ps-conf-td ${r.status === 'granted' ? 'ps-accessreq-status--granted' : 'ps-accessreq-status--denied'}`}>{t(STATUS_LABEL_KEY[r.status as 'granted' | 'denied'])}</td>
                <td className="ps-conf-td">{hoursBetween(r.requestedAt, r.resolvedAt!).toFixed(1)}h</td>
                <td className="ps-conf-td">{r.resolvedByUserName ?? <span className="ps-conf-td--muted-italic">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
