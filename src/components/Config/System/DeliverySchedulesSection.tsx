// src/components/Config/System/DeliverySchedulesSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 619 (PS-800): Configuration > System > Delivery Schedules. PathScribe decides WHEN things go
// out; the interface engine decides how. A schedule is set for each feed at the ENTERPRISE level, and
// a performing facility may override it. Choosing a facility shows which feeds follow the enterprise
// and which have their own schedule. The test panel answers "would this go out at that time?".
// Logic: services/deliverySchedules/deliverySchedule.ts. Contract: docs/architecture/DELIVERY_SCHEDULES_API.md
// ─────────────────────────────────────────────────────────────────────────────
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../../pathscribe.css';
import './DeliverySchedulesSection.css';

import { deliveryScheduleService, facilityService } from '@/services';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { LoadingState } from '@/components/Common/LoadingState';
import type { Facility } from '../../../services/facilities/IFacilityService';
import { registryChoices } from '../../../services/deliverySchedules/registryChoices';
import {
  BATCH_FREQUENCIES, DELIVERY_FEEDS, SCHEDULE_KINDS, deadlineStatus, evaluateSchedule, resolveDeliverySchedule, validateSchedule, zonedInstant,
  type BatchFrequency, type DeliveryFeed, type DeliverySchedule, type DeliveryScheduleEntry, type ScheduleKind,
} from '../../../services/deliverySchedules/deliverySchedule';
import { WEEKDAYS_MON_FIRST, WEEKDAY_KEYS, datesText, defaultWindow, draftFrom, parseDates, parseNumbers, parseTimes, toggleDay, withKind } from './deliveryScheduleForm';

const CAPABILITY = 'config:delivery-schedules:manage' as const;

const Days: React.FC<{ value: number[]; onChange: (d: number[]) => void; label: string }> = ({ value, onChange, label }) => {
  const { t } = useTranslation();
  return (
    <div className="ps-dsch-days" role="group" aria-label={label}>
      {WEEKDAYS_MON_FIRST.map(d => (
        <label key={d} className="ps-dsch-day">
          <input type="checkbox" checked={value.includes(d)} onChange={() => onChange(toggleDay(value, d))} />
          {t(`deliverySchedulesSection.weekdays.${WEEKDAY_KEYS[d]}`)}
        </label>
      ))}
    </div>
  );
};

const Summary: React.FC<{ schedule: DeliverySchedule }> = ({ schedule }) => {
  const { t } = useTranslation();
  const day = (d: number) => t(`deliverySchedulesSection.weekdays.${WEEKDAY_KEYS[d]}`);
  if (schedule.kind === 'windows') {
    const windows = schedule.windows.map(w => `${w.days.map(day).join(' ')} ${w.start}–${w.end}`).join('; ');
    return <>{t('deliverySchedulesSection.summary.windows', { windows, zone: schedule.timeZone })}</>;
  }
  const extra = (
    <>
      {schedule.reportingDeadlineDays !== null && <> · {t('deliverySchedulesSection.summary.deadline', { days: schedule.reportingDeadlineDays })}</>}
      {schedule.amendmentRequeues && <> · {t('deliverySchedulesSection.summary.requeues')}</>}
    </>
  );
  if (schedule.kind === 'batch') {
    const when = schedule.batchFrequency === 'daily' ? t('deliverySchedulesSection.frequencies.daily')
      : schedule.batchFrequency === 'monthly' ? t('deliverySchedulesSection.summary.monthDays', { days: schedule.batchMonthDays.join(', ') })
      : schedule.batchDays.map(day).join(' ');
    return <>{t('deliverySchedulesSection.summary.batch', { days: when, times: schedule.batchTimes.join(', '), zone: schedule.timeZone })}{schedule.cutoffTime && <> · {t('deliverySchedulesSection.summary.cutoff', { time: schedule.cutoffTime })}</>}{extra}</>;
  }
  if (schedule.kind === 'review_hold') return <>{t('deliverySchedulesSection.summary.review_hold', { minutes: schedule.reviewHoldMinutes })}{extra}</>;
  return <>{t(`deliverySchedulesSection.summary.${schedule.kind}`)}{extra}</>;
};

const Editor: React.FC<{ feed: DeliveryFeed; start: DeliverySchedule; scopeName: string | null; onSave: (s: DeliverySchedule) => void; onClose: () => void }> =
  ({ feed, start, scopeName, onSave, onClose }) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<DeliverySchedule>(draftFrom(start));
  const [blackoutText, setBlackoutText] = useState(datesText(start.blackoutDates));
  const [timesText, setTimesText] = useState(start.batchTimes.join(', '));
  const [monthDaysText, setMonthDaysText] = useState(start.batchMonthDays.join(', '));
  const current: DeliverySchedule = {
    ...draft, blackoutDates: parseDates(blackoutText),
    batchTimes: draft.kind === 'batch' ? parseTimes(timesText) : draft.batchTimes,
    batchMonthDays: draft.kind === 'batch' && draft.batchFrequency === 'monthly' ? parseNumbers(monthDaysText) : draft.batchMonthDays,
  };
  const problems = validateSchedule(current);
  const timed = draft.kind === 'windows' || draft.kind === 'batch';
  const setWindow = (i: number, patch: Partial<DeliverySchedule['windows'][number]>) =>
    setDraft({ ...draft, windows: draft.windows.map((w, j) => (j === i ? { ...w, ...patch } : w)) });
  return (
    <div className="ps-overlay" onClick={onClose}>
      <div className="ps-modal-dark" onClick={e => e.stopPropagation()}>
        <div className="ps-modal-dark-header">
          <span className="ps-modal-dark-title">{t('deliverySchedulesSection.editor.title', { feed: t(`deliverySchedulesSection.feeds.${feed}`), scope: scopeName ?? t('deliverySchedulesSection.scope.enterprise') })}</span>
          <button className="ps-research-close" onClick={onClose} aria-label={t('common.cancel')}>✕</button>
        </div>
        <div className="ps-modal-dark-body">
          <label className="ps-conf-label" htmlFor="dsch-kind">{t('deliverySchedulesSection.editor.kind')}</label>
          <select id="dsch-kind" className="ps-conf-select" value={draft.kind} onChange={e => { setDraft(withKind(current, e.target.value as ScheduleKind)); setTimesText(withKind(current, e.target.value as ScheduleKind).batchTimes.join(', ')); }}>
            {SCHEDULE_KINDS.map(k => <option key={k} value={k}>{t(`deliverySchedulesSection.kinds.${k}`)}</option>)}
          </select>
          <p className="ps-rr-modal-hint">{t(`deliverySchedulesSection.kindHints.${draft.kind}`)}</p>

          {draft.kind === 'windows' && (
            <fieldset>
              <legend className="ps-conf-label">{t('deliverySchedulesSection.editor.windows')}</legend>
              {draft.windows.map((w, i) => (
                <div key={i} className="ps-dsch-window">
                  <Days value={w.days} onChange={d => setWindow(i, { days: d })} label={t('deliverySchedulesSection.editor.days')} />
                  <input type="time" className="ps-conf-input" aria-label={t('deliverySchedulesSection.editor.start')} value={w.start} onChange={e => setWindow(i, { start: e.target.value })} />
                  <input type="time" className="ps-conf-input" aria-label={t('deliverySchedulesSection.editor.end')} value={w.end} onChange={e => setWindow(i, { end: e.target.value })} />
                  <button className="ps-conf-btn-secondary" onClick={() => setDraft({ ...draft, windows: draft.windows.filter((_, j) => j !== i) })}>{t('deliverySchedulesSection.editor.removeWindow')}</button>
                </div>
              ))}
              <button className="ps-conf-btn-secondary" onClick={() => setDraft({ ...draft, windows: [...draft.windows, defaultWindow()] })}>{t('deliverySchedulesSection.editor.addWindow')}</button>
            </fieldset>
          )}

          {draft.kind === 'batch' && (
            <fieldset>
              <label className="ps-conf-label" htmlFor="dsch-freq">{t('deliverySchedulesSection.editor.frequency')}</label>
              <select id="dsch-freq" className="ps-conf-select" value={draft.batchFrequency} onChange={e => setDraft({ ...draft, batchFrequency: e.target.value as BatchFrequency, batchMonthDays: e.target.value === 'monthly' && draft.batchMonthDays.length === 0 ? [1] : draft.batchMonthDays })}>
                {BATCH_FREQUENCIES.map(f => <option key={f} value={f}>{t(`deliverySchedulesSection.frequencies.${f}`)}</option>)}
              </select>
              {draft.batchFrequency === 'weekly' && <Days value={draft.batchDays} onChange={d => setDraft({ ...draft, batchDays: d })} label={t('deliverySchedulesSection.editor.batchDays')} />}
              {draft.batchFrequency === 'monthly' && (
                <>
                  <label className="ps-conf-label" htmlFor="dsch-mdays">{t('deliverySchedulesSection.editor.monthDays')}</label>
                  <input id="dsch-mdays" className="ps-conf-input" value={monthDaysText} onChange={e => setMonthDaysText(e.target.value)} placeholder="1, 15" />
                  <p className="ps-rr-modal-hint">{t('deliverySchedulesSection.editor.monthDaysHint')}</p>
                </>
              )}
              <label className="ps-conf-label" htmlFor="dsch-cutoff">{t('deliverySchedulesSection.editor.cutoff')}</label>
              <input id="dsch-cutoff" type="time" className="ps-conf-input" value={draft.cutoffTime ?? ''} onChange={e => setDraft({ ...draft, cutoffTime: e.target.value || null })} />
              <p className="ps-rr-modal-hint">{t('deliverySchedulesSection.editor.cutoffHint')}</p>
              <label className="ps-conf-label" htmlFor="dsch-times">{t('deliverySchedulesSection.editor.batchTimes')}</label>
              <input id="dsch-times" className="ps-conf-input" value={timesText} onChange={e => setTimesText(e.target.value)} placeholder="06:00, 22:00" />
              <p className="ps-rr-modal-hint">{t('deliverySchedulesSection.editor.batchTimesHint')}</p>
            </fieldset>
          )}

          {draft.kind === 'review_hold' && (
            <>
              <label className="ps-conf-label" htmlFor="dsch-hold">{t('deliverySchedulesSection.editor.holdMinutes')}</label>
              <input id="dsch-hold" type="number" min={1} className="ps-conf-input" value={draft.reviewHoldMinutes} onChange={e => setDraft({ ...draft, reviewHoldMinutes: Number(e.target.value) })} />
              <p className="ps-rr-modal-hint">{t('deliverySchedulesSection.editor.holdHint')}</p>
            </>
          )}

          {timed && (
            <>
              <label className="ps-conf-label" htmlFor="dsch-zone">{t('deliverySchedulesSection.editor.timeZone')}</label>
              <input id="dsch-zone" className="ps-conf-input" value={draft.timeZone} onChange={e => setDraft({ ...draft, timeZone: e.target.value })} />
              <p className="ps-rr-modal-hint">{t('deliverySchedulesSection.editor.timeZoneHint')}</p>
              <label className="ps-conf-label" htmlFor="dsch-blackout">{t('deliverySchedulesSection.editor.blackout')}</label>
              <input id="dsch-blackout" className="ps-conf-input" value={blackoutText} onChange={e => setBlackoutText(e.target.value)} placeholder="2026-12-25, 2027-01-01" />
              <p className="ps-rr-modal-hint">{t('deliverySchedulesSection.editor.blackoutHint')}</p>
            </>
          )}
          <label className="ps-conf-label" htmlFor="dsch-deadline">{t('deliverySchedulesSection.editor.deadline')}</label>
          <input id="dsch-deadline" type="number" min={1} className="ps-conf-input" value={draft.reportingDeadlineDays ?? ''} onChange={e => setDraft({ ...draft, reportingDeadlineDays: e.target.value === '' ? null : Number(e.target.value) })} />
          <p className="ps-rr-modal-hint">{t('deliverySchedulesSection.editor.deadlineHint')}</p>
          <label className="ps-dsch-day"><input type="checkbox" checked={draft.amendmentRequeues} onChange={e => setDraft({ ...draft, amendmentRequeues: e.target.checked })} />{t('deliverySchedulesSection.editor.amendmentRequeues')}</label>
          <p className="ps-rr-modal-hint">{t('deliverySchedulesSection.editor.amendmentRequeuesHint')}</p>
          {problems.map(p => <p key={p} className="ps-rr-modal-warn" role="alert">{t(`deliverySchedulesSection.problems.${p}`)}</p>)}
        </div>
        <div className="ps-modal-dark-footer">
          <button className="ps-conf-btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
          <CapabilityButton capability={CAPABILITY} className="ps-conf-btn-primary" disabled={problems.length > 0} onClick={() => onSave(current)}>{t('deliverySchedulesSection.editor.save')}</CapabilityButton>
        </div>
      </div>
    </div>
  );
};

const TestPanel: React.FC<{ entries: DeliveryScheduleEntry[]; facilities: Facility[] }> = ({ entries, facilities }) => {
  const { t } = useTranslation();
  const registries = registryChoices();
  const [registryKey, setRegistryKey] = useState(registries[0]?.key ?? '');
  const [feed, setFeed] = useState<DeliveryFeed>('report_delivery');
  const [facilityId, setFacilityId] = useState('');
  const [when, setWhen] = useState('2026-10-19T10:00');
  const [signedOut, setSignedOut] = useState(false);
  const [signedAtText, setSignedAtText] = useState('2026-10-19T09:00');
  const [signedDate, signedTime] = signedAtText.split('T');
  const [shown, setShown] = useState<{ deadline: string | null; source: string; reason: string; canSendNow: boolean; nextDueAt: string | null; zone: string } | null>(null);
  const run = () => {
    const r = resolveDeliverySchedule(entries, feed, facilityId || null, feed === 'registry' ? registryKey : null);
    const [date, time] = when.split('T');
    const at = zonedInstant(date, time, r.schedule.timeZone);
    const signedAt = signedOut ? zonedInstant(signedDate, signedTime, r.schedule.timeZone) : null;
    const d = evaluateSchedule(r.schedule, at, { signedOut, signedOutAt: signedAt ? signedAt.toISOString() : null });
    const dl = signedAt ? deadlineStatus(r.schedule, signedAt, at) : null;
    setShown({ deadline: dl && dl.state !== 'none' ? dl.state : null, source: r.source, reason: d.reason, canSendNow: d.canSendNow, nextDueAt: d.nextDueAt, zone: r.schedule.timeZone });
  };
  const nextText = shown?.nextDueAt
    ? new Intl.DateTimeFormat(undefined, { timeZone: shown.zone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(shown.nextDueAt))
    : null;
  return (
    <div className="ps-dsch-test">
      <div className="ps-rr-test-title">{t('deliverySchedulesSection.test.title')}</div>
      <div className="ps-rr-test-subtitle">{t('deliverySchedulesSection.test.subtitle')}</div>
      <label className="ps-conf-label" htmlFor="dsch-t-feed">{t('deliverySchedulesSection.test.feed')}</label>
      <select id="dsch-t-feed" className="ps-conf-select" value={feed} onChange={e => setFeed(e.target.value as DeliveryFeed)}>
        {DELIVERY_FEEDS.map(f => <option key={f} value={f}>{t(`deliverySchedulesSection.feeds.${f}`)}</option>)}
      </select>
      {feed === 'registry' && (
        <>
          <label className="ps-conf-label" htmlFor="dsch-t-reg">{t('deliverySchedulesSection.test.registry')}</label>
          <select id="dsch-t-reg" className="ps-conf-select" value={registryKey} onChange={e => setRegistryKey(e.target.value)}>
            {registries.map(r => <option key={r.key} value={r.key}>{t(r.labelKey)}</option>)}
          </select>
        </>
      )}
      <label className="ps-conf-label" htmlFor="dsch-t-fac">{t('deliverySchedulesSection.test.facility')}</label>
      <select id="dsch-t-fac" className="ps-conf-select" value={facilityId} onChange={e => setFacilityId(e.target.value)}>
        <option value="">{t('deliverySchedulesSection.test.noFacility')}</option>
        {facilities.map(f => <option key={f.id as string} value={f.id as string}>{f.name}</option>)}
      </select>
      <label className="ps-conf-label" htmlFor="dsch-t-when">{t('deliverySchedulesSection.test.when')}</label>
      <input id="dsch-t-when" type="datetime-local" className="ps-conf-input" value={when} onChange={e => setWhen(e.target.value)} />
      <label className="ps-dsch-day"><input type="checkbox" checked={signedOut} onChange={e => setSignedOut(e.target.checked)} />{t('deliverySchedulesSection.test.signedOut')}</label>
      {signedOut && (
        <>
          <label className="ps-conf-label" htmlFor="dsch-t-signed">{t('deliverySchedulesSection.test.signedOutAt')}</label>
          <input id="dsch-t-signed" type="datetime-local" className="ps-conf-input" value={signedAtText} onChange={e => setSignedAtText(e.target.value)} />
        </>
      )}
      <button className="ps-conf-btn-primary" onClick={run}>{t('deliverySchedulesSection.test.run')}</button>
      {shown && (
        <div className="ps-dsch-result" role="status">
          <div className="ps-dsch-result-value">{t(shown.canSendNow ? 'deliverySchedulesSection.test.goesOut' : 'deliverySchedulesSection.test.waits')}</div>
          <div>{t(`deliverySchedulesSection.reasons.${shown.reason}`)}</div>
          <div>{t(`deliverySchedulesSection.source.${shown.source}`)}</div>
          {shown.deadline && <div>{t(`deliverySchedulesSection.deadlineStates.${shown.deadline}`)}</div>}
          {!shown.canSendNow && <div>{nextText ? t('deliverySchedulesSection.test.nextDue', { when: nextText }) : t('deliverySchedulesSection.test.noNextDue')}</div>}
        </div>
      )}
    </div>
  );
};

/** One card: a feed, or one registry of the registry feed. */
interface Target { feed: DeliveryFeed; registryKey: string | null; label?: string }
const TARGETS: Target[] = DELIVERY_FEEDS.filter(f => f !== 'registry').map(feed => ({ feed, registryKey: null }));

const DeliverySchedulesSection: React.FC = () => {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<DeliveryScheduleEntry[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [scopeId, setScopeId] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Target | null>(null);
  const [status, setStatus] = useState<'saved' | 'refused' | null>(null);

  const load = useCallback(async () => {
    const [s, f] = await Promise.all([deliveryScheduleService.getAll(), facilityService.getAll()]);
    if (s.ok) setEntries(s.data);
    if (f.ok) setFacilities((f.data as Facility[]).filter(x => x.status === 'Active'));
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const scopeFacility = scopeId ? facilities.find(f => f.id === scopeId) ?? null : null;
  const save = async (target: Target, schedule: DeliverySchedule) => {
    const r = await deliveryScheduleService.set({ feed: target.feed, facilityId: scopeId || null, registryKey: target.registryKey, schedule });
    setStatus(r.ok ? 'saved' : 'refused');
    setEditing(null);
    await load();
  };
  const useEnterprise = async (target: Target) => {
    const r = await deliveryScheduleService.remove(target.feed, scopeId, target.registryKey);
    setStatus(r.ok ? 'saved' : 'refused');
    await load();
  };

  if (loading) return <LoadingState label={t('deliverySchedulesSection.loading')} />;
  return (
    <div className="ps-dsch-root">
      <div>
        <h2 className="tmpl-list-title">{t('deliverySchedulesSection.title')}</h2>
        <p className="tmpl-list-subtitle">{t('deliverySchedulesSection.subtitle')}</p>
      </div>
      <div className="ps-dsch-scope">
        <label className="ps-conf-label" htmlFor="dsch-scope">{t('deliverySchedulesSection.scope.label')}</label>
        <select id="dsch-scope" className="ps-conf-select" value={scopeId} onChange={e => { setScopeId(e.target.value); setStatus(null); }}>
          <option value="">{t('deliverySchedulesSection.scope.enterprise')}</option>
          {facilities.map(f => <option key={f.id as string} value={f.id as string}>{f.name}</option>)}
        </select>
      </div>
      <div className="ps-dsch-list">
        {[...TARGETS, ...registryChoices().map(c => ({ feed: 'registry' as DeliveryFeed, registryKey: c.key, label: c.labelKey }))].map(target => {
          const feed = target.feed;
          const cardKey = target.registryKey ?? feed;
          const r = resolveDeliverySchedule(entries, feed, scopeId || null, target.registryKey);
          const own = !!scopeId && r.source === 'facility';
          return (
            <div key={cardKey} className="ps-dsch-card" data-feed={cardKey}>
              <div>
                <div className="ps-dsch-feed">{target.label ? t('deliverySchedulesSection.registryCard', { registry: t(target.label) }) : t(`deliverySchedulesSection.feeds.${feed}`)}</div>
                <div className="ps-dsch-summary"><Summary schedule={r.schedule} /></div>
                <span className={`ps-dsch-source ps-dsch-source--${r.source}`}>{t(`deliverySchedulesSection.source.${r.source}`)}</span>
              </div>
              <div className="ps-dsch-actions">
                <CapabilityButton capability={CAPABILITY} className="ps-conf-btn-secondary" onClick={() => setEditing(target)}>
                  {t(scopeId && !own ? 'deliverySchedulesSection.overrideButton' : 'deliverySchedulesSection.editButton')}
                </CapabilityButton>
                {own && (
                  <CapabilityButton capability={CAPABILITY} className="ps-conf-btn-secondary" onClick={() => { void useEnterprise(target); }}>
                    {t('deliverySchedulesSection.useEnterpriseButton')}
                  </CapabilityButton>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {status && <p className="ps-conf-hint" role="status">{t(`deliverySchedulesSection.${status}`)}</p>}
      <TestPanel entries={entries} facilities={facilities} />
      {editing && (
        <Editor feed={editing.feed} start={resolveDeliverySchedule(entries, editing.feed, scopeId || null, editing.registryKey).schedule} scopeName={scopeFacility ? scopeFacility.name : null}
          onSave={s => { void save(editing, s); }} onClose={() => setEditing(null)} />
      )}
    </div>
  );
};

export default DeliverySchedulesSection;
