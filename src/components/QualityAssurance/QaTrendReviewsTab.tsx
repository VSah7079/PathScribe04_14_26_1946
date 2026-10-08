// src/components/QualityAssurance/QaTrendReviewsTab.tsx
// ─────────────────────────────────────────────────────────────────────────────
// PS-147 (Batch 442): Quality Assurance → CAPA → Discordance Patterns. The
// Lab Director's list of patterns over time — a pathologist's reviewed work,
// or a specimen type, judged against the site's own policy (Configuration →
// System → Discordance Trend Policy). Opening the tab runs the evaluation
// (qaTrendService.evaluate). A pattern is never a CAPA by itself: the
// director starts a review of the underlying cases, then concludes it with a
// CAPA or dismisses it, with a reason. Viewing needs
// qa:pathologist-trend:view; deciding qa:pathologist-trend:decide, both
// checked in the service. Decisions live in services/quality/qaTrendRules.ts.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { facilityService, qaTrendService, qaTrendDecisionProblem, qaTrendQueueOrder, qaTrendPendingCount, type QaTrendDecision, type TrendCandidate } from '@/services';
import type { QaTrendRecommendation } from '@/types/quality/QaTrend';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { formatDate, formatDateTime } from '@/utils/formatDate';
import '@/pathscribe.css';

interface Props {
  /** Told when the count waiting for a decision changes (the tile shows it). */
  onPendingCountChange?: (count: number) => void;
}

type Pending = { rec: QaTrendRecommendation; kind: QaTrendDecision['kind'] };
const K = 'qualityAssurance.qaTrends';

export const QaTrendReviewsTab: React.FC<Props> = ({ onPendingCountChange }) => {
  const { t, i18n } = useTranslation();
  const [recs, setRecs] = useState<QaTrendRecommendation[]>([]);
  const [candidates, setCandidates] = useState<TrendCandidate[]>([]);
  const [labNames, setLabNames] = useState<Record<string, string>>({});
  const [showClosed, setShowClosed] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [refused, setRefused] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const evaluated = await qaTrendService.evaluate();
    if (evaluated.ok === false) { setRefused(true); return; }
    setCandidates(evaluated.data.candidates);
    const res = await qaTrendService.list();
    if (res.ok) { setRecs(res.data); onPendingCountChange?.(qaTrendPendingCount(res.data)); }
  }, [onPendingCountChange]);

  useEffect(() => {
    void load();
    facilityService.getAll().then(r => { if (r.ok) setLabNames(Object.fromEntries(r.data.map(f => [f.id, f.name]))); }).catch(() => {});
  }, [load]);

  const rows = useMemo(() => qaTrendQueueOrder(recs, showClosed), [recs, showClosed]);
  const lab = (id?: string) => (id ? labNames[id] ?? id : t(`${K}.orgPolicy`));
  const numbers = (r: Pick<TrendCandidate, 'majorCount' | 'totalReviewed' | 'ratePercent'>) =>
    t(`${K}.numbers`, { major: r.majorCount, total: r.totalReviewed, rate: r.ratePercent.toLocaleString(i18n.language) });

  const open = (rec: QaTrendRecommendation, kind: QaTrendDecision['kind']) => { setPending({ rec, kind }); setNote(''); setError(null); };
  const submit = async () => {
    if (!pending) return;
    const decision = { kind: pending.kind, note } as QaTrendDecision;
    const problem = qaTrendDecisionProblem(pending.rec, decision);
    if (problem) { setError(t(`${K}.errors.${problem}`)); return; }
    const res = await qaTrendService.decide(pending.rec.id, decision);
    if (res.ok === false) { setError(t(`${K}.errors.${res.error}`, { defaultValue: t(`${K}.errors.failed`) })); return; }
    setPending(null);
    await load();
  };

  if (refused) return <div className="ps-conf-empty">{t(`${K}.notPermitted`)}</div>;

  return (
    <div className="ps-capa-rec">
      <div className="ps-capa-rec__intro">
        <p className="ps-conf-card-description--tight">{t(`${K}.intro`)}</p>
        <label className="ps-conf-toggle-label-row">
          <input type="checkbox" checked={showClosed} onChange={e => setShowClosed(e.target.checked)} className="ps-conf-radio-input" />
          <span className="ps-conf-option-text">{t(`${K}.showClosed`)}</span>
        </label>
      </div>

      {rows.length === 0 ? (
        <div className="ps-conf-empty">{t(`${K}.empty`)}</div>
      ) : (
        <div className="ps-conf-table-wrap">
          <table className="ps-conf-table">
            <thead>
              <tr>
                <th className="ps-conf-th">{t(`${K}.columns.status`)}</th>
                <th className="ps-conf-th">{t(`${K}.columns.pattern`)}</th>
                <th className="ps-conf-th">{t(`${K}.columns.subject`)}</th>
                <th className="ps-conf-th">{t(`${K}.columns.site`)}</th>
                <th className="ps-conf-th">{t(`${K}.columns.numbers`)}</th>
                <th className="ps-conf-th">{t(`${K}.columns.window`)}</th>
                <th className="ps-conf-th">{t(`${K}.columns.decision`)}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="ps-conf-tr">
                  <td className="ps-conf-td"><span className={`ps-qa-trend__status ps-qa-trend__status--${r.status}`}>{t(`${K}.status.${r.status}`)}</span></td>
                  <td className="ps-conf-td">{t(`${K}.kinds.${r.kind}`)}</td>
                  <td className="ps-conf-td">{r.subjectName}</td>
                  <td className="ps-conf-td">{lab(r.performingLabId)}</td>
                  <td className="ps-conf-td">
                    <div>{numbers(r)}</div>
                    <div className="ps-specreq-meta">{t(`${K}.triggers.${r.trigger}`)}</div>
                  </td>
                  <td className="ps-conf-td">{t(`${K}.window`, { from: formatDate(r.windowStart, i18n.language), to: formatDate(r.windowEnd, i18n.language) })}</td>
                  <td className="ps-conf-td">
                    {(r.status === 'recommended' || r.status === 'noted') && (
                      <div className="ps-qa-inline-actions">
                        <CapabilityButton capability="qa:pathologist-trend:decide" className="ps-conf-btn-primary" onClick={() => open(r, 'start-review')}>{t(`${K}.startReview`)}</CapabilityButton>
                        <CapabilityButton capability="qa:pathologist-trend:decide" className="ps-conf-btn-secondary" onClick={() => open(r, 'dismiss')}>{t(`${K}.dismiss`)}</CapabilityButton>
                      </div>
                    )}
                    {r.status === 'under-review' && (
                      <div className="ps-qa-inline-actions">
                        <CapabilityButton capability="qa:pathologist-trend:decide" className="ps-conf-btn-primary" onClick={() => open(r, 'open-capa')}>{t(`${K}.openCapa`)}</CapabilityButton>
                        <CapabilityButton capability="qa:pathologist-trend:decide" className="ps-conf-btn-secondary" onClick={() => open(r, 'dismiss')}>{t(`${K}.dismiss`)}</CapabilityButton>
                      </div>
                    )}
                    {r.decidedAt && (
                      <div className="ps-specreq-meta">
                        {t(`${K}.decidedLine`, { name: r.decidedBy?.userName ?? '', date: formatDateTime(r.decidedAt, i18n.language) })}
                        {r.note ? ` — ${r.note}` : ''}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <label className="ps-conf-toggle-label-row">
        <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} className="ps-conf-radio-input" />
        <span className="ps-conf-option-text">{t(`${K}.showAll`)}</span>
      </label>
      {showAll && (
        candidates.length === 0 ? <div className="ps-conf-empty">{t(`${K}.noData`)}</div> : (
          <div className="ps-conf-table-wrap">
            <table className="ps-conf-table">
              <thead>
                <tr>
                  <th className="ps-conf-th">{t(`${K}.columns.pattern`)}</th>
                  <th className="ps-conf-th">{t(`${K}.columns.subject`)}</th>
                  <th className="ps-conf-th">{t(`${K}.columns.site`)}</th>
                  <th className="ps-conf-th">{t(`${K}.columns.numbers`)}</th>
                  <th className="ps-conf-th">{t(`${K}.columns.policy`)}</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map(c => (
                  <tr key={`${c.kind}-${c.subjectId}-${c.performingLabId ?? ''}`} className="ps-conf-tr">
                    <td className="ps-conf-td">{t(`${K}.kinds.${c.kind}`)}</td>
                    <td className="ps-conf-td">{c.subjectName}</td>
                    <td className="ps-conf-td">{lab(c.performingLabId)}</td>
                    <td className="ps-conf-td">{numbers(c)}{c.trigger ? ` · ${t(`${K}.triggers.${c.trigger}`)}` : ''}</td>
                    <td className="ps-conf-td">{t(`${K}.policyLine`, { months: c.policy.rollingWindowMonths, min: c.policy.minSampleSize, count: c.policy.countThreshold, rate: c.policy.rateThresholdPercent })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {pending && (
        <div className="ps-ms-overlay">
          <div className="ps-ms-modal">
            <div className="ps-ms-header">{t(`${K}.titles.${pending.kind}`)}</div>
            <div className="ps-ms-body">
              <p className="ps-specreq-meta">{t(`${K}.kinds.${pending.rec.kind}`)} · {pending.rec.subjectName} · {numbers(pending.rec)}</p>
              <div className="ps-conf-form-field">
                <label className="ps-conf-label" htmlFor="qa-trend-note">
                  {t(`${K}.noteLabels.${pending.kind}`)}{pending.kind !== 'start-review' && <> <span className="ps-conf-required">*</span></>}
                </label>
                <textarea id="qa-trend-note" className="ps-conf-input ps-capa-rec__textarea" value={note} onChange={e => setNote(e.target.value)} />
              </div>
              {error && <div className="ps-conf-error-text">{error}</div>}
            </div>
            <div className="ps-ms-footer">
              <button className="ps-ms-btn-cancel" onClick={() => setPending(null)}>{t('common.cancel')}</button>
              <button className="ps-ms-btn-apply" onClick={() => { void submit(); }}>{t(`${K}.confirm.${pending.kind}`)}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QaTrendReviewsTab;
