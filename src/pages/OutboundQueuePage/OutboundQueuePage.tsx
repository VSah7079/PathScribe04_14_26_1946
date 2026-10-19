// src/pages/OutboundQueuePage/OutboundQueuePage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 619 (PS-800): the Outbound Queue: every outbound message in one list
// (results, ADT, accession, LIS sync, billing, report delivery, cytology
// results, referrals, molecular orders and registry submissions), with hold,
// release, retry and, for a message a registry rejected, fix-and-resubmit or
// mark not reportable. Reached from Home → Quality & Compliance.
//
// Rendering only. States, filters, sorting and what each state allows come from
// services/outboundQueue; each action checks its own capability in the service
// and is audited there. The buttons are CapabilityButtons. Accession numbers
// are tagged data-phi; the screen shows fixed codes, never receiver text.
// Keyboard: every control is a native button, input or checkbox; Escape closes
// an open reason panel.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../pathscribe.css';
import './OutboundQueuePage.css';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { useOutboundQueue } from '@/hooks/useOutboundQueue';
import { OUTBOUND_FEEDS, OUTBOUND_STATES, HOLD_REASONS } from '@/services';
import { NOT_REPORTABLE_REASONS, RESUBMIT_REASONS, RETRACT_REASONS, type OutboundSortKey } from '@/services/outboundQueue/outboundQueueTypes';
import { formatDateTime } from '@/utils/formatDate';

const K = 'outboundQueue';
type Panel = 'hold' | 'resubmit' | 'notReportable' | 'retract' | null;
const SORTS: OutboundSortKey[] = ['state', 'deadline', 'scheduledFor', 'queuedAt', 'feed', 'attempts'];
const REASONS = { hold: HOLD_REASONS, resubmit: RESUBMIT_REASONS, notReportable: NOT_REPORTABLE_REASONS, retract: RETRACT_REASONS } as const;
const REASON_NS = { hold: 'holdReason', resubmit: 'resubmitReason', notReportable: 'notReportableReason', retract: 'retractReason' } as const;

const OutboundQueuePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { pushCrumb } = useBreadcrumb();
  useEffect(() => { pushCrumb(t(`${K}.pageTitle`), '/outbound-queue'); }, [pushCrumb, t]);
  const q = useOutboundQueue();
  const [panel, setPanel] = useState<Panel>(null);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');

  const open = (p: Exclude<Panel, null>) => { setPanel(p); setReason(REASONS[p][0]); setNote(''); };
  const confirm = async () => {
    if (panel === 'hold') await q.actions.hold(reason as never, note);
    else if (panel === 'resubmit') await q.actions.retry(reason as never);
    else if (panel === 'retract') await q.actions.retract(reason as never);
    else if (panel === 'notReportable') await q.actions.markNotReportable(reason as never, note);
    setPanel(null);
  };
  const retry = () => { if (q.items.some(i => q.selected.has(i.ref) && i.state === 'rejected')) open('resubmit'); else void q.actions.retry(); };
  const when = (iso?: string) => formatDateTime(iso, i18n.language);
  const allSelected = q.items.length > 0 && q.items.every(i => q.selected.has(i.ref));

  return (
    <div className="ps-obq" onKeyDown={e => { if (e.key === 'Escape') setPanel(null); }}>
      <h1 className="ps-obq-title">{t(`${K}.pageTitle`)}</h1>
      <p className="ps-obq-subtitle">{t(`${K}.subtitle`)}</p>

      <div className="ps-obq-tiles" role="group" aria-label={t(`${K}.deadlineTiles`)}>
        {(['overdue', 'dueSoon'] as const).map(flag => (
          <button key={flag} type="button" className={`ps-obq-tile ps-obq-tile--${flag === 'overdue' ? 'overdue' : 'soon'}`} aria-pressed={q.deadlines.includes(flag)} onClick={() => q.toggleDeadline(flag)}>
            <span className="ps-obq-tile-count">{q.deadlineCounts[flag]}</span>
            <span className="ps-obq-tile-label">{t(`${K}.deadline.${flag}`)}</span>
          </button>
        ))}
        <button type="button" className="ps-obq-tile ps-obq-tile--soon" aria-pressed={q.needsReview} onClick={q.toggleNeedsReview}>
          <span className="ps-obq-tile-count">{q.billingCounts.needsReview}</span>
          <span className="ps-obq-tile-label">{t(`${K}.tiles.needsReview`)}</span>
        </button>
        <div className="ps-obq-tile">
          <span className="ps-obq-tile-count">{q.billingCounts.amendmentDelta}</span>
          <span className="ps-obq-tile-label">{t(`${K}.tiles.amendmentDelta`)}</span>
        </div>
        {OUTBOUND_STATES.map(s => (
          <button key={s} type="button" className="ps-obq-tile" aria-pressed={q.states.includes(s)} onClick={() => q.toggleState(s)}>
            <span className="ps-obq-tile-count">{q.counts[s]}</span>
            <span className="ps-obq-tile-label">{t(`${K}.state.${s}`)}</span>
          </button>
        ))}
      </div>

      <div className="ps-obq-filters" role="group" aria-label={t(`${K}.feedsLabel`)}>
        {OUTBOUND_FEEDS.map(f => (
          <button key={f} type="button" className="ps-obq-chip" aria-pressed={q.feeds.includes(f)} onClick={() => q.toggleFeed(f)}>{t(`${K}.feed.${f}`)}</button>
        ))}
      </div>
      <div className="ps-obq-filters">
        <input className="ps-obq-input" type="search" value={q.search} onChange={e => q.setSearch(e.target.value)} aria-label={t(`${K}.searchLabel`)} placeholder={t(`${K}.searchPlaceholder`)} data-phi="true" />
        <select className="ps-obq-input" value={q.facilityId} onChange={e => q.setFacilityId(e.target.value)} aria-label={t(`${K}.facilityLabel`)}>
          <option value="">{t(`${K}.allFacilities`)}</option>
          {q.facilityOptions.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <select className="ps-obq-input" value={q.sortKey} onChange={e => q.setSortKey(e.target.value as OutboundSortKey)} aria-label={t(`${K}.sortLabel`)}>
          {SORTS.map(s => <option key={s} value={s}>{t(`${K}.sort.${s}`)}</option>)}
        </select>
        <button type="button" className="ps-obq-chip" onClick={() => q.setDirection(q.direction === 'asc' ? 'desc' : 'asc')} aria-label={t(`${K}.direction.${q.direction}`)}>{q.direction === 'asc' ? '↑' : '↓'}</button>
      </div>

      <div className="ps-obq-actions" role="toolbar" aria-label={t(`${K}.actionsLabel`)}>
        <span className="ps-obq-muted">{t(`${K}.selectedCount`, { count: q.selected.size })}</span>
        <CapabilityButton capability="interface:outbound:hold" className="ps-conf-btn-secondary" disabled={!q.canAct('hold')} onClick={() => open('hold')}>{t(`${K}.actions.hold`)}</CapabilityButton>
        <CapabilityButton capability="interface:outbound:release" className="ps-conf-btn-secondary" disabled={!q.canAct('release')} onClick={() => { void q.actions.release(); }}>{t(`${K}.actions.release`)}</CapabilityButton>
        <CapabilityButton capability="interface:outbound:resend" className="ps-conf-btn-primary" disabled={!q.canAct('retry')} onClick={retry}>{t(`${K}.actions.retry`)}</CapabilityButton>
        <CapabilityButton capability="interface:outbound:override-release" className="ps-conf-btn-secondary" disabled={!q.canAct('overrideRelease')} onClick={() => { void q.actions.overrideRelease(); }}>{t(`${K}.actions.overrideRelease`)}</CapabilityButton>
        <CapabilityButton capability="interface:outbound:retract" className="ps-conf-btn-secondary" disabled={!q.canAct('retract')} onClick={() => open('retract')}>{t(`${K}.actions.retract`)}</CapabilityButton>
        <CapabilityButton capability="interface:outbound:mark-not-reportable" className="ps-conf-btn-secondary" disabled={!q.canAct('markNotReportable')} onClick={() => open('notReportable')}>{t(`${K}.actions.markNotReportable`)}</CapabilityButton>
      </div>

      {panel && (
        <fieldset className="ps-obq-panel">
          <legend>{t(`${K}.panel.${panel}`)}</legend>
          <div className="ps-obq-reasons" role="radiogroup" aria-label={t(`${K}.panel.reasonLabel`)}>
            {REASONS[panel].map(r => (
              <label key={r}><input type="radio" name="obq-reason" value={r} checked={reason === r} onChange={() => setReason(r)} /> {t(`${K}.${REASON_NS[panel]}.${r}`)}</label>
            ))}
          </div>
          {panel !== 'resubmit' && panel !== 'retract' && (
            <input className="ps-obq-input" value={note} maxLength={200} onChange={e => setNote(e.target.value)} aria-label={t(`${K}.panel.noteLabel`)} placeholder={t(`${K}.panel.notePlaceholder`)} />
          )}
          <div className="ps-obq-actions">
            <button type="button" className="ps-conf-btn-primary" onClick={() => { void confirm(); }}>{t(`${K}.panel.confirm`)}</button>
            <button type="button" className="ps-conf-btn-secondary" onClick={() => setPanel(null)}>{t(`${K}.panel.cancel`)}</button>
          </div>
        </fieldset>
      )}

      {q.summary && (
        <div className="ps-obq-summary" role="status">
          {t(`${K}.summary.done`, { count: q.summary.succeeded })}
          {q.summary.skipped > 0 && ` ${t(`${K}.summary.skipped`, { count: q.summary.skipped })}`}
          {Object.entries(q.summary.refused).map(([k, n]) => ` ${t(`${K}.refusal.${k}`, { count: n })}`)}
        </div>
      )}

      {!q.loading && q.items.length === 0 ? <div className="ps-obq-empty">{t(`${K}.empty`)}</div> : (
        <table className="ps-obq-table">
          <thead>
            <tr>
              <th scope="col"><input type="checkbox" className="ps-obq-row-check" checked={allSelected} onChange={e => q.selectAll(e.target.checked)} aria-label={t(`${K}.selectAll`)} /></th>
              <th scope="col">{t(`${K}.col.case`)}</th>
              <th scope="col">{t(`${K}.col.feed`)}</th>
              <th scope="col">{t(`${K}.col.destination`)}</th>
              <th scope="col">{t(`${K}.col.state`)}</th>
              <th scope="col">{t(`${K}.col.scheduled`)}</th>
              <th scope="col">{t(`${K}.col.attempts`)}</th>
              <th scope="col">{t(`${K}.col.detail`)}</th>
              <th scope="col">{t(`${K}.col.deadline`)}</th>
            </tr>
          </thead>
          <tbody>
            {q.items.map(i => (
              <tr key={i.ref} className={i.deadline?.flag === 'overdue' ? 'ps-obq-row--overdue' : i.deadline?.flag === 'dueSoon' ? 'ps-obq-row--soon' : undefined}>
                <td><input type="checkbox" className="ps-obq-row-check" checked={q.selected.has(i.ref)} onChange={() => q.toggleSelected(i.ref)} aria-label={t(`${K}.selectRow`, { feed: t(`${K}.feed.${i.feed}`) })} /></td>
                <td data-phi="true">{i.accessionNumber ?? '–'}</td>
                <td>{t(`${K}.feed.${i.feed}`)}<div className="ps-obq-muted">{i.kind}</div></td>
                <td>{t(`${K}.destination.${i.destination}`)}{i.transport && <div className="ps-obq-muted">{t(`${K}.transport.${i.transport}`)}</div>}</td>
                <td><span className={`ps-obq-state ps-obq-state--${i.state}`}>{t(`${K}.state.${i.state}`)}</span></td>
                <td>{when(i.scheduledFor)}</td>
                <td>{i.attempts}</td>
                <td>
                  {i.errorCode && <div>{t(`${K}.errorCode.${i.errorCode}`)}</div>}
                  {i.rejection && (
                    <div>
                      <span className="ps-obq-codes">{i.rejection.errorCodes.join(', ') || '–'}</span>
                      {i.rejection.fatal && <div className="ps-obq-muted">{t(`${K}.fatal`)}</div>}
                      {i.rejection.correctionDueAt && <div className="ps-obq-muted">{t(`${K}.correctionDue`, { date: when(i.rejection.correctionDueAt) })}</div>}
                    </div>
                  )}
                  {i.hold && <div className="ps-obq-muted">{t(`${K}.heldFor`, { reason: t(`${K}.holdReason.${i.hold.reason}`) })}</div>}
                  {i.closedReason && <div className="ps-obq-muted">{t(`${K}.closedFor`, { reason: t(i.state === 'retracted' ? `${K}.retractReason.${i.closedReason}` : `${K}.notReportableReason.${i.closedReason}`) })}</div>}
                  {i.amendsRef && <div className="ps-obq-muted">{t(`${K}.amends`)}</div>}
                  {i.billing?.retraction && !i.closedReason && <div className="ps-obq-muted">{t(`${K}.closedFor`, { reason: t(`${K}.retractReason.${i.billing.retraction.reasonCode}`) })}</div>}
                  {i.billing?.billingType && <div className="ps-obq-muted">{t(`${K}.billingType`, { type: i.billing.billingType })}</div>}
                  {i.billing?.needsReview && <div className="ps-obq-flag ps-obq-flag--dueSoon">{t(`${K}.needsReview.${i.billing.needsReview}`)}</div>}
                  {i.billing?.scheduledReleaseAt && i.state === 'waiting' && <div className="ps-obq-muted">{t(`${K}.releaseAt`, { date: when(i.billing.scheduledReleaseAt) })}</div>}
                  {i.billing?.overriddenBy && <div className="ps-obq-muted">{t(`${K}.overridden`, { id: i.billing.overriddenBy })}</div>}
                </td>
                <td>
                  {i.deadline && i.deadline.flag !== 'ok'
                    ? <span className={`ps-obq-flag ps-obq-flag--${i.deadline.flag}`}>{t(`${K}.deadline.${i.deadline.flag}`)}</span>
                    : null}
                  {i.deadline && <div className="ps-obq-muted">{when(i.deadline.dueAt)}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default OutboundQueuePage;
