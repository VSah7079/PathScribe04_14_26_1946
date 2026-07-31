// src/pages/DeficienciesPage.tsx
// ─────────────────────────────────────────────────────────────
// A dedicated, independent nonconformance-management work queue —
// built this way specifically because it's the industry-standard
// architecture, not a design preference. ISO 15189:2022 Clause 7.5
// ("Nonconforming Work") requires labs to have a documented process to
// identify, assess, act on, and retain records of a nonconformity;
// Clause 8.7 requires a full CAPA cycle including an effectiveness
// check later — genuinely coming back and confirming a corrective
// action worked, not just marking something done and moving on. Real
// laboratory Quality Management Systems implement this as its own
// dedicated module, separate from (but integrated with) audit
// management — a nonconformance's resolution lifecycle is independent
// of whatever clinical workflow raised it, which is why this isn't a
// modal hanging off Synoptic Report or a Search filter.
//
// Three real, permanent stages — Open, Pending Verification, Closed —
// not a simple open/closed flag. Nothing here is ever deleted; Clause
// 7.5's "retain records" requirement means every stage stays visible.
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect, useMemo } from 'react';
import '../pathscribe.css';
import { useNavigate } from 'react-router-dom';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { useAuth } from '@/contexts/AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  specimenDeficiencyService, deficiencyTypeService, resolutionTypeService, managementReviewService,
} from '@/services';
import type {
  SpecimenDeficiency, DeficiencyType, ResolutionType, ManagementReview,
} from '@/services/deficiencies/IDeficiencyService';
import { ManagementReviewModal } from './modals/ManagementReviewModal';
import { IntraopLinkageTab } from '@/components/QualityAssurance/IntraopLinkageTab';
import { ReconciliationTab } from '@/components/QualityAssurance/ReconciliationTab';
import { CountersignTurnaroundTab } from '@/components/QualityAssurance/CountersignTurnaroundTab';
import { FppeTrackingTab } from '@/components/QualityAssurance/FppeTrackingTab';
import { DriftCorrectionTab } from '@/components/QualityAssurance/DriftCorrectionTab';

type Tab = 'open' | 'pending-verification' | 'closed' | 'reviews' | 'intraop-linkage' | 'discordance' | 'countersign' | 'fppe' | 'drift-correction';

const formatTimestamp = (iso?: string) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); }
  catch { return iso; }
};
const formatDateOnly = (iso?: string) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' } as any); }
  catch { return iso; }
};
const isOverdue = (iso?: string) => !!iso && new Date(iso).getTime() < Date.now();

// ── Resolve modal — moves Open → Pending Verification ───────────────────────

const ResolveModal: React.FC<{
  deficiency: SpecimenDeficiency;
  resolutionTypes: ResolutionType[];
  onResolve: (resolutionTypeId: string, correctiveAction: string, preventiveAction: string, verificationDueDate: string) => void;
  onClose: () => void;
}> = ({ deficiency, resolutionTypes, onResolve, onClose }) => {
  const [resolutionTypeId, setResolutionTypeId] = useState(resolutionTypes[0]?.id ?? '');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [preventiveAction, setPreventiveAction] = useState('');
  const defaultDue = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const [verificationDueDate, setVerificationDueDate] = useState(defaultDue);

  return (
    <div className="ps-ms-overlay">
      <div className="ps-ms-modal">
        <div className="ps-ms-header">Corrective Action</div>
        <div className="ps-ms-body">
          <p className="ps-fixgate-intro">
            {deficiency.specimenLabel ? `Specimen ${deficiency.specimenLabel}, ` : ''}case {deficiency.caseId} — {deficiency.comment || 'no additional detail recorded'}
          </p>
          <p className="ps-fixgate-intro">
            This moves to <strong>Pending Verification</strong>, not Closed — someone still needs to come back and
            confirm the corrective action actually worked.
          </p>
          <div className="ps-conf-form-field">
            <label className="ps-conf-label">Resolution Type <span className="ps-conf-required">*</span></label>
            <select className="ps-conf-select" value={resolutionTypeId} onChange={e => setResolutionTypeId(e.target.value)}>
              {resolutionTypes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="ps-conf-form-field">
            <label className="ps-conf-label">Corrective Action <span className="ps-conf-required">*</span></label>
            <textarea className="ps-conf-input ps-conf-textarea" value={correctiveAction} onChange={e => setCorrectiveAction(e.target.value)}
              placeholder="What was actually done to fix this specific occurrence?" />
          </div>
          <div className="ps-conf-form-field">
            <label className="ps-conf-label">Preventive Action (optional)</label>
            <textarea className="ps-conf-input ps-conf-textarea" value={preventiveAction} onChange={e => setPreventiveAction(e.target.value)}
              placeholder="What stops this from recurring, beyond just fixing this one instance?" />
          </div>
          <div className="ps-conf-form-field">
            <label className="ps-conf-label">Effectiveness Check Due</label>
            <input className="ps-conf-input" type="date" value={verificationDueDate} onChange={e => setVerificationDueDate(e.target.value)} />
          </div>
        </div>
        <div className="ps-ms-footer">
          <button className="ps-ms-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="ps-ms-btn-apply"
            onClick={() => onResolve(resolutionTypeId, correctiveAction, preventiveAction, new Date(verificationDueDate).toISOString())}
            disabled={!resolutionTypeId || !correctiveAction.trim()}>
            Move to Pending Verification
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Verify modal — moves Pending Verification → Closed, or back to Open ─────

const VerifyModal: React.FC<{
  deficiency: SpecimenDeficiency;
  onVerify: (outcome: 'effective' | 'recurred', comment: string) => void;
  onClose: () => void;
}> = ({ deficiency, onVerify, onClose }) => {
  const [comment, setComment] = useState('');

  return (
    <div className="ps-ms-overlay">
      <div className="ps-ms-modal">
        <div className="ps-ms-header">Effectiveness Check</div>
        <div className="ps-ms-body">
          <p className="ps-fixgate-intro">
            {deficiency.specimenLabel ? `Specimen ${deficiency.specimenLabel}, ` : ''}case {deficiency.caseId}
          </p>
          <div className="ps-defichist-item">
            <div className="ps-defichist-row"><span className="ps-defic-label">Corrective action taken:</span> {deficiency.correctiveAction}</div>
            {deficiency.preventiveAction && (
              <div className="ps-defichist-row"><span className="ps-defic-label">Preventive action:</span> {deficiency.preventiveAction}</div>
            )}
          </div>
          <div className="ps-conf-form-field">
            <label className="ps-conf-label">Did the corrective action actually work? <span className="ps-conf-required">*</span></label>
            <textarea className="ps-conf-input ps-conf-textarea" value={comment} onChange={e => setComment(e.target.value)}
              placeholder="What did you check, and what did you find?" />
          </div>
        </div>
        <div className="ps-ms-footer">
          <button className="ps-ms-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="ps-ms-btn-cancel" onClick={() => onVerify('recurred', comment)} disabled={!comment.trim()}>
            Recurred — Reopen
          </button>
          <button className="ps-ms-btn-apply" onClick={() => onVerify('effective', comment)} disabled={!comment.trim()}>
            Effective — Close
          </button>
        </div>
      </div>
    </div>
  );
};

const DeficienciesPage: React.FC = () => {
  const navigate = useNavigate();
  const { pushCrumb } = useBreadcrumb();
  useEffect(() => { pushCrumb('Quality Assurance', '/deficiencies'); }, [pushCrumb]);
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('open');
  const [deficiencies, setDeficiencies] = useState<SpecimenDeficiency[]>([]);
  const [deficiencyTypes, setDeficiencyTypes] = useState<DeficiencyType[]>([]);
  const [resolutionTypes, setResolutionTypes] = useState<ResolutionType[]>([]);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [managementReviews, setManagementReviews] = useState<ManagementReview[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const loadAll = () => {
    specimenDeficiencyService.getAll().then(res => { if (res.ok) setDeficiencies(res.data); });
    managementReviewService.getAll().then(res => { if (res.ok) setManagementReviews(res.data); });
  };
  useEffect(() => {
    loadAll();
    deficiencyTypeService.getAll().then(res => { if (res.ok) setDeficiencyTypes(res.data); });
    resolutionTypeService.getAll().then(res => { if (res.ok) setResolutionTypes(res.data); });
  }, []);

  const typeName = (id: string) => deficiencyTypes.find(t => t.id === id)?.name ?? id;
  const resolutionName = (id?: string) => id ? (resolutionTypes.find(t => t.id === id)?.name ?? id) : '—';

  const filtered = useMemo(
    () => deficiencies.filter(d => d.status === tab).sort((a, b) => b.raisedAt.localeCompare(a.raisedAt)),
    [deficiencies, tab]
  );
  const openCount = deficiencies.filter(d => d.status === 'open').length;
  const pendingCount = deficiencies.filter(d => d.status === 'pending-verification').length;
  const closedCount = deficiencies.filter(d => d.status === 'closed').length;
  const overdueCount = deficiencies.filter(d => d.status === 'pending-verification' && isOverdue(d.verificationDueDate)).length;
  const unreviewedClosed = useMemo(
    () => deficiencies.filter(d => d.status === 'closed' && !d.managementReviewId),
    [deficiencies]
  );

  // Trend: deficiencies closed per month, last 6 months — the actual
  // point of doing a Management Review as a batch rather than per-item
  // is spotting a pattern like this, not re-litigating each record.
  const trendData = useMemo(() => {
    const months: { month: string; closed: number; reopened: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthKey = d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' } as any);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
      const closedThisMonth = deficiencies.filter(x => {
        if (!x.resolvedAt) return false;
        const t = new Date(x.resolvedAt).getTime();
        return t >= monthStart && t < monthEnd && x.status === 'closed';
      });
      months.push({
        month: monthKey,
        closed: closedThisMonth.length,
        reopened: closedThisMonth.filter(x => (x.reopenCount ?? 0) > 0).length,
      });
    }
    return months;
  }, [deficiencies]);

  const resolvingItem = deficiencies.find(d => d.id === resolvingId) ?? null;
  const verifyingItem = deficiencies.find(d => d.id === verifyingId) ?? null;

  const handleResolve = (resolutionTypeId: string, correctiveAction: string, preventiveAction: string, verificationDueDate: string) => {
    if (!resolvingId) return;
    specimenDeficiencyService.resolve(resolvingId, {
      resolutionTypeId, correctiveAction, preventiveAction: preventiveAction || undefined,
      resolvedBy: user?.id ?? 'unknown', verificationDueDate,
    }).then(() => { setResolvingId(null); loadAll(); });
  };

  const handleVerify = (outcome: 'effective' | 'recurred', comment: string) => {
    if (!verifyingId) return;
    specimenDeficiencyService.verifyEffectiveness(verifyingId, {
      outcome, comment, verifiedBy: user?.id ?? 'unknown',
    }).then(() => { setVerifyingId(null); loadAll(); });
  };

  const handleSubmitReview = (deficiencyIds: string[], findings: string) => {
    managementReviewService.create({
      reviewedBy: user?.id ?? 'unknown', deficiencyIds, findings,
    }).then(() => { setShowReviewModal(false); loadAll(); });
  };

  const columnsFor = (t: Tab) => {
    if (t === 'open') return ['Case', 'Specimen', 'Issue', 'Detail', 'Raised', 'Actions'];
    if (t === 'pending-verification') return ['Case', 'Specimen', 'Issue', 'Corrective Action', 'Due', 'Actions'];
    return ['Case', 'Specimen', 'Issue', 'Resolution', 'Verified', 'Closed'];
  };

  return (
    <div className="ps-defic-page">
      <div className="ps-defic-page-header">
        <h1 className="ps-defic-page-title">✓ Quality Assurance</h1>
        <p className="ps-defic-page-subtitle">
          Nonconformance tracking (Deficiencies), independent of case status — a corrective action doesn't close
          this out by itself, it moves to Pending Verification until someone actually confirms it worked — plus
          department-wide Intraoperative Linkage and Discordance & Reconciliation reporting.
        </p>
      </div>

      {/* Trend — closed per month, last 6 months. The actual point of a
          batch Management Review is spotting a pattern like this.
          Explicitly gated to the tabs this chart is actually about —
          previously rendered unconditionally regardless of which tab was
          active, so viewing Intraoperative Linkage or Discordance &
          Reconciliation still showed the deficiency-closure trend, which
          has nothing to do with either. Same explicit-enumeration
          pattern used below for the table/reviews block, rather than a
          negative check, so a future new tab can't silently fall through
          into this again. */}
      {(tab === 'open' || tab === 'pending-verification' || tab === 'closed' || tab === 'reviews') && (
        <div className="ps-defic-trend-card">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={trendData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} width={28} />
              <Tooltip content={({ active, payload, label }: any) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="ps-tat-trend__tooltip">
                    <div className="ps-tat-trend__tooltip-header">{label}</div>
                    <div style={{ color: '#0891B2' }}>Closed: {payload[0]?.payload?.closed ?? 0}</div>
                    <div style={{ color: '#f87171' }}>Reopened at least once: {payload[0]?.payload?.reopened ?? 0}</div>
                  </div>
                );
              }} />
              <Line type="monotone" dataKey="closed" stroke="#0891B2" strokeWidth={2.5} dot={{ r: 3, fill: '#0891B2', strokeWidth: 0 }} />
              <Line type="monotone" dataKey="reopened" stroke="#f87171" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 2, fill: '#f87171', strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="ps-tab-bar">
        <button className={`ps-tab-btn ${tab === 'open' ? 'active' : ''}`} onClick={() => setTab('open')}>Open ({openCount})</button>
        <button className={`ps-tab-btn ${tab === 'pending-verification' ? 'active' : ''}`} onClick={() => setTab('pending-verification')}>
          Pending Verification ({pendingCount}){overdueCount > 0 ? ` — ${overdueCount} overdue` : ''}
        </button>
        <button className={`ps-tab-btn ${tab === 'closed' ? 'active' : ''}`} onClick={() => setTab('closed')}>Closed ({closedCount})</button>
        <button className={`ps-tab-btn ${tab === 'reviews' ? 'active' : ''}`} onClick={() => setTab('reviews')}>Management Reviews ({managementReviews.length})</button>
        <button className={`ps-tab-btn ${tab === 'intraop-linkage' ? 'active' : ''}`} onClick={() => setTab('intraop-linkage')}>Intraoperative Linkage</button>
        <button className={`ps-tab-btn ${tab === 'discordance' ? 'active' : ''}`} onClick={() => setTab('discordance')}>Discordance &amp; Reconciliation</button>
        <button className={`ps-tab-btn ${tab === 'countersign' ? 'active' : ''}`} onClick={() => setTab('countersign')}>Countersign Turnaround</button>
        <button className={`ps-tab-btn ${tab === 'fppe' ? 'active' : ''}`} onClick={() => setTab('fppe')}>Credentialing Review</button>
        <button className={`ps-tab-btn ${tab === 'drift-correction' ? 'active' : ''}`} onClick={() => setTab('drift-correction')}>Post-Finalization Drift</button>
      </div>

      {tab === 'intraop-linkage' && <IntraopLinkageTab />}
      {tab === 'discordance' && <ReconciliationTab />}
      {tab === 'countersign' && <CountersignTurnaroundTab />}
      {tab === 'fppe' && <FppeTrackingTab />}
      {tab === 'drift-correction' && <DriftCorrectionTab />}

      {tab === 'closed' && (
        <div className="ps-defic-review-banner">
          <span>{unreviewedClosed.length} closed item{unreviewedClosed.length === 1 ? '' : 's'} not yet covered by a Management Review.</span>
          <button className="ps-conf-btn-primary" onClick={() => setShowReviewModal(true)} disabled={unreviewedClosed.length === 0}>
            Start Management Review
          </button>
        </div>
      )}

      {(tab === 'open' || tab === 'pending-verification' || tab === 'closed') ? (
        <div className="ps-conf-table-wrap">
          <div className="ps-conf-table-scroll">
            <table className="ps-conf-table">
              <thead className="ps-conf-thead-sticky">
                <tr>{columnsFor(tab).map(h => <th key={h} className="ps-conf-th">{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.map(d => (
                  <tr key={d.id} className="ps-conf-tr">
                    <td className="ps-conf-td">
                      <button className="ps-conf-btn-row" onClick={() => navigate(`/case/${d.caseId}/synoptic`)}>{d.caseId}</button>
                    </td>
                    <td className="ps-conf-td">
                      {d.specimenLabel ? `Specimen ${d.specimenLabel}` : <em className="ps-defic-caselevel">Case-level</em>}
                    </td>
                    <td className="ps-conf-td">
                      {typeName(d.deficiencyTypeId)}
                      {!!d.reopenCount && <span className="ps-defic-reopen-badge" title="Reopened after a failed effectiveness check">↺ {d.reopenCount}</span>}
                    </td>

                    {tab === 'open' && (
                      <>
                        <td className="ps-conf-td"><div className="ps-specreq-meta">{d.comment || '—'}</div></td>
                        <td className="ps-conf-td">{d.raisedBy === 'system' ? 'System' : d.raisedBy} · {formatTimestamp(d.raisedAt)}</td>
                        <td className="ps-conf-td"><button className="ps-conf-btn-primary" onClick={() => setResolvingId(d.id)}>Take Corrective Action</button></td>
                      </>
                    )}
                    {tab === 'pending-verification' && (
                      <>
                        <td className="ps-conf-td"><div className="ps-specreq-meta">{d.correctiveAction || '—'}</div></td>
                        <td className="ps-conf-td">
                          <span className={isOverdue(d.verificationDueDate) ? 'ps-defic-overdue' : ''}>{formatDateOnly(d.verificationDueDate)}</span>
                        </td>
                        <td className="ps-conf-td"><button className="ps-conf-btn-primary" onClick={() => setVerifyingId(d.id)}>Verify Effectiveness</button></td>
                      </>
                    )}
                    {tab === 'closed' && (
                      <>
                        <td className="ps-conf-td">{resolutionName(d.resolutionTypeId)}</td>
                        <td className="ps-conf-td">{d.verifiedBy ? `${d.verifiedBy} · ${formatTimestamp(d.verifiedAt)}` : <em className="ps-defic-caselevel">instant fix, not verified</em>}</td>
                        <td className="ps-conf-td">{formatTimestamp(d.resolvedAt)}</td>
                      </>
                    )}
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td className="ps-conf-empty-row" colSpan={6}>
                    {tab === 'open' && 'No open deficiencies — nothing needs attention right now.'}
                    {tab === 'pending-verification' && 'Nothing pending an effectiveness check.'}
                    {tab === 'closed' && 'No closed deficiencies yet.'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : tab === 'reviews' ? (
        <div className="ps-conf-table-wrap">
          <div className="ps-conf-table-scroll">
            <table className="ps-conf-table">
              <thead className="ps-conf-thead-sticky">
                <tr>{['Reviewed', 'Reviewed By', 'Items in Scope', 'Findings'].map(h => <th key={h} className="ps-conf-th">{h}</th>)}</tr>
              </thead>
              <tbody>
                {[...managementReviews].sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt)).map(r => (
                  <tr key={r.id} className="ps-conf-tr">
                    <td className="ps-conf-td">{formatTimestamp(r.reviewedAt)}</td>
                    <td className="ps-conf-td">{r.reviewedBy}</td>
                    <td className="ps-conf-td">{r.deficiencyIds.length}</td>
                    <td className="ps-conf-td"><div className="ps-specreq-meta">{r.findings}</div></td>
                  </tr>
                ))}
                {managementReviews.length === 0 && (
                  <tr><td className="ps-conf-empty-row" colSpan={4}>No management reviews recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {resolvingItem && (
        <ResolveModal deficiency={resolvingItem} resolutionTypes={resolutionTypes} onResolve={handleResolve} onClose={() => setResolvingId(null)} />
      )}
      {verifyingItem && (
        <VerifyModal deficiency={verifyingItem} onVerify={handleVerify} onClose={() => setVerifyingId(null)} />
      )}
      {showReviewModal && (
        <ManagementReviewModal
          unreviewedClosed={unreviewedClosed}
          deficiencyTypes={deficiencyTypes}
          onSubmit={handleSubmitReview}
          onClose={() => setShowReviewModal(false)}
        />
      )}
    </div>
  );
};

export default DeficienciesPage;
