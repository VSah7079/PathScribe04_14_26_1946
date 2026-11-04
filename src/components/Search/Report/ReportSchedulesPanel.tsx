// src/components/Search/Report/ReportSchedulesPanel.tsx
// ─────────────────────────────────────────────────
// Batch 613: set up a saved report to run on a schedule and go to chosen users as CSV, and see
// when each schedule last ran. In this build a run is Simulated (counts are kept, nothing is
// sent); the API server runs schedules and sends the files (docs/architecture/SCHEDULED_REPORTS_API.md).
// ─────────────────────────────────────────────────
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { scheduledReportService, userService } from '@/services';
import { useCapabilities } from '@/hooks/useCapabilities';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { LoadingState } from '@/components/Common/LoadingState';
import type { SavedCaseReport } from '@/services/caseReports/savedCaseReports';
import {
  DEFAULT_RECIPIENT_ACCESS_CHOICE, MAX_LOOKBACK_DAYS, MAX_SCHEDULE_RECIPIENTS, SCHEDULE_FREQUENCIES, type RecipientAccessChoice,
  type RecipientAssessment, type ScheduledReport, type ScheduledReportDraft,
} from '@/services/scheduledReports/scheduledReportTypes';

interface Props { saved: readonly SavedCaseReport[]; timeZone: string }
interface Person { id: string; name: string }

const emptyDraft = (timeZone: string): ScheduledReportDraft => ({
  savedReportId: '', frequency: 'weekly', dayOfWeek: 1, dayOfMonth: 1, timeOfDay: '07:00', timeZone, lookbackDays: 7, recipientUserIds: [], recipientChoices: {},
});

export const ReportSchedulesPanel: React.FC<Props> = ({ saved, timeZone }) => {
  const { t } = useTranslation();
  const [schedules, setSchedules] = useState<ScheduledReport[] | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [draft, setDraft] = useState<ScheduledReportDraft>(() => emptyDraft(timeZone));
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Batch 613: who among the chosen recipients cannot see every case in the chosen report (null: still checking).
  const [assessments, setAssessments] = useState<RecipientAssessment[] | null>([]);
  const caps = useCapabilities();
  const canManage = caps.has('search:report-schedule:manage');

  const refresh = useCallback(async () => {
    const r = await scheduledReportService.list().catch(() => null);
    setSchedules(r?.ok ? r.data : []);
  }, []);
  // Simulated: schedules that came due while the app was closed run when the panel opens (only for someone who may run them).
  useEffect(() => {
    if (caps.loading) return;
    void (async () => {
      if (canManage) await scheduledReportService.runDue().catch(() => null);
      await refresh();
    })();
  }, [refresh, canManage, caps.loading]);
  useEffect(() => {
    void userService.getAll().then(r => {
      if (r.ok) setPeople(r.data.filter(u => u.status === 'Active').map(u => ({ id: u.id, name: `${u.firstName} ${u.lastName}`.trim() })));
    }).catch(() => {});
  }, []);

  // Worked out as the report and recipients are chosen, so the person decides before saving; no window.
  const recipientKey = draft.recipientUserIds.join(',');
  useEffect(() => {
    if (!draft.savedReportId || draft.recipientUserIds.length === 0 || !canManage) { setAssessments([]); return; }
    let live = true;
    setAssessments(null);
    void scheduledReportService.assessRecipients(draft.savedReportId, draft.recipientUserIds)
      .then(r => { if (live) setAssessments(r.ok ? r.data.filter(a => !a.seesAll) : []); })
      .catch(() => { if (live) setAssessments([]); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.savedReportId, recipientKey, canManage]);
  const personName = (id: string) => people.find(p => p.id === id)?.name ?? '';
  const choiceOf = (id: string): RecipientAccessChoice => draft.recipientChoices?.[id] ?? DEFAULT_RECIPIENT_ACCESS_CHOICE;
  const setChoice = (id: string, choice: RecipientAccessChoice) => setDraft(d => ({ ...d, recipientChoices: { ...d.recipientChoices, [id]: choice } }));

  const weekdays = useMemo(() => {
    const f = new Intl.DateTimeFormat(i18n.language, { weekday: 'long', timeZone: 'UTC' });
    return Array.from({ length: 7 }, (_, i) => f.format(new Date(Date.UTC(2023, 0, 1 + i))));
  }, []);
  const when = (iso: string | null | undefined) =>
    iso ? new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(new Date(iso)) : t('caseReport.schedule.never');
  const reportName = (id: string) => saved.find(s => s.id === id)?.name ?? '';

  const act = async (work: () => Promise<{ ok: boolean; error?: unknown }>, doneKey: string) => {
    setBusy(true); setNotice(null);
    try {
      const r = await work();
      if (r.ok) { setNotice(t(doneKey)); await refresh(); }
      else setNotice(r.error === 'CONFIG_NOT_PERMITTED' ? t('caseReport.schedule.notPermitted') : t(`caseReport.schedule.error.${String(r.error)}`, { defaultValue: t('caseReport.schedule.error.generic') }));
    } catch { setNotice(t('caseReport.schedule.error.generic')); } finally { setBusy(false); }
  };

  const toggleRecipient = (id: string) => setDraft(d => ({
    ...d, recipientUserIds: d.recipientUserIds.includes(id) ? d.recipientUserIds.filter(x => x !== id) : [...d.recipientUserIds, id].slice(0, MAX_SCHEDULE_RECIPIENTS),
  }));

  const describe = (s: ScheduledReport) => {
    const time = s.timeOfDay;
    if (s.frequency === 'daily') return t('caseReport.schedule.describeDaily', { time });
    if (s.frequency === 'weekly') return t('caseReport.schedule.describeWeekly', { day: weekdays[s.dayOfWeek], time });
    return t('caseReport.schedule.describeMonthly', { day: s.dayOfMonth, time });
  };

  return (
    <section className="ps-casereport-schedules" aria-label={t('caseReport.schedule.title')} data-testid="report-schedules">
      <h3 className="ps-casereport-h">{t('caseReport.schedule.title')}</h3>
      <p className="ps-svf-hint">{t('caseReport.schedule.simulatedNote')}</p>
      {notice && <p className="ps-searchpage-notice" role="status">{notice}</p>}

      {schedules === null ? <LoadingState label={t('caseReport.schedule.loading')} variant="inline" /> : schedules.length === 0 ? (
        <p className="ps-svf-hint">{t('caseReport.schedule.none')}</p>
      ) : (
        <ul className="ps-casereport-schedule-list">
          {schedules.map(s => (
            <li key={s.id} className="ps-casereport-schedule" data-testid={`schedule-${s.id}`}>
              <strong>{s.savedReportName}</strong>
              <span>{describe(s)}{s.lookbackDays !== null ? ` · ${t('caseReport.schedule.lookbackShort', { count: s.lookbackDays })}` : ''}</span>
              <span>{t('caseReport.schedule.recipientCount', { count: s.recipientUserIds.length })}</span>
              <span>{s.active ? t('caseReport.schedule.nextRun', { when: when(s.nextRunAt) }) : t('caseReport.schedule.paused')}</span>
              {s.lastRun?.recipients && s.lastRun.recipients.some(r => r.outcome !== 'full') && (
                <span className="ps-casereport-lastrun-access" data-testid={`lastrun-access-${s.id}`}>
                  {t('caseReport.schedule.lastRunAccess', {
                    narrowed: s.lastRun.recipients.filter(r => r.outcome === 'narrowed').length,
                    skipped: s.lastRun.recipients.filter(r => r.outcome === 'skipped').length,
                  })}
                </span>
              )}
              <span className="ps-casereport-lastrun" data-testid={`lastrun-${s.id}`}>
                {s.lastRun
                  ? (s.lastRun.status === 'simulated'
                    ? t('caseReport.schedule.lastRun', { when: when(s.lastRun.ranAt), total: s.lastRun.total, groups: s.lastRun.groupCount, rows: s.lastRun.rowCount })
                    : t('caseReport.schedule.lastRunFailed', { when: when(s.lastRun.ranAt) }))
                  : t('caseReport.schedule.neverRun')}
                {s.lastRun && <em className="ps-casereport-simulated"> {t('caseReport.schedule.simulated')}</em>}
              </span>
              <span className="ps-casereport-schedule-actions">
                <CapabilityButton capability="search:report-schedule:manage" className="ps-searchpage-export-btn" disabled={busy} onClick={() => void act(() => scheduledReportService.runNow(s.id), 'caseReport.schedule.ran')}>{t('caseReport.schedule.runNow')}</CapabilityButton>
                <CapabilityButton capability="search:report-schedule:manage" className="ps-searchpage-export-btn" disabled={busy} onClick={() => void act(() => scheduledReportService.setActive(s.id, !s.active), s.active ? 'caseReport.schedule.pausedDone' : 'caseReport.schedule.resumedDone')}>{s.active ? t('caseReport.schedule.pause') : t('caseReport.schedule.resume')}</CapabilityButton>
                <CapabilityButton capability="search:report-schedule:manage" className="ps-searchpage-export-btn" disabled={busy} onClick={() => void act(() => scheduledReportService.remove(s.id), 'caseReport.schedule.deleted')}>{t('caseReport.schedule.delete')}</CapabilityButton>
              </span>
            </li>
          ))}
        </ul>
      )}

      <form className="ps-casereport-schedule-form" onSubmit={e => e.preventDefault()} aria-label={t('caseReport.schedule.newTitle')}>
        <h4 className="ps-casereport-h">{t('caseReport.schedule.newTitle')}</h4>
        {saved.length === 0 && <p className="ps-svf-hint">{t('caseReport.schedule.saveFirst')}</p>}
        <label className="ps-casereport-field">
          <span>{t('caseReport.schedule.report')}</span>
          <select className="ps-searchpage-basis-select" value={draft.savedReportId} onChange={e => setDraft(d => ({ ...d, savedReportId: e.target.value }))}>
            <option value="">{t('caseReport.schedule.chooseReport')}</option>
            {saved.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="ps-casereport-field">
          <span>{t('caseReport.schedule.frequency')}</span>
          <select className="ps-searchpage-basis-select" value={draft.frequency} onChange={e => setDraft(d => ({ ...d, frequency: e.target.value as ScheduledReportDraft['frequency'] }))}>
            {SCHEDULE_FREQUENCIES.map(f => <option key={f} value={f}>{t(`caseReport.schedule.frequencyName.${f}`)}</option>)}
          </select>
        </label>
        {draft.frequency === 'weekly' && (
          <label className="ps-casereport-field">
            <span>{t('caseReport.schedule.dayOfWeek')}</span>
            <select className="ps-searchpage-basis-select" value={draft.dayOfWeek} onChange={e => setDraft(d => ({ ...d, dayOfWeek: Number(e.target.value) }))}>
              {weekdays.map((w, i) => <option key={i} value={i}>{w}</option>)}
            </select>
          </label>
        )}
        {draft.frequency === 'monthly' && (
          <label className="ps-casereport-field">
            <span>{t('caseReport.schedule.dayOfMonth')}</span>
            <select className="ps-searchpage-basis-select" value={draft.dayOfMonth} onChange={e => setDraft(d => ({ ...d, dayOfMonth: Number(e.target.value) }))}>
              {Array.from({ length: 28 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
            </select>
          </label>
        )}
        <label className="ps-casereport-field">
          <span>{t('caseReport.schedule.time', { zone: timeZone })}</span>
          <input type="time" className="ps-searchpage-basis-select" value={draft.timeOfDay} onChange={e => setDraft(d => ({ ...d, timeOfDay: e.target.value }))} />
        </label>
        <label className="ps-casereport-check">
          <input type="checkbox" checked={draft.lookbackDays !== null} onChange={e => setDraft(d => ({ ...d, lookbackDays: e.target.checked ? 7 : null }))} />
          {t('caseReport.schedule.useLookback')}
        </label>
        {draft.lookbackDays !== null && (
          <label className="ps-casereport-field">
            <span>{t('caseReport.schedule.lookbackDays')}</span>
            <input type="number" min={1} max={MAX_LOOKBACK_DAYS} className="ps-searchpage-basis-select" value={draft.lookbackDays}
              onChange={e => setDraft(d => ({ ...d, lookbackDays: Math.max(1, Math.min(MAX_LOOKBACK_DAYS, Math.floor(Number(e.target.value)) || 1)) }))} />
          </label>
        )}
        <fieldset className="ps-casereport-fieldset">
          <legend>{t('caseReport.schedule.recipients', { count: draft.recipientUserIds.length, max: MAX_SCHEDULE_RECIPIENTS })}</legend>
          <div className="ps-casereport-recipients">
            {people.map(p => (
              <label key={p.id} className="ps-casereport-check">
                <input type="checkbox" checked={draft.recipientUserIds.includes(p.id)} onChange={() => toggleRecipient(p.id)} />
                <span data-phi="name">{p.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {assessments === null && <p className="ps-svf-hint" role="status">{t('caseReport.schedule.accessChecking')}</p>}
        {assessments !== null && assessments.length > 0 && (
          <fieldset className="ps-casereport-fieldset ps-casereport-access" data-testid="recipient-access">
            <legend>{t('caseReport.schedule.accessLegend')}</legend>
            <p className="ps-svf-hint">{t('caseReport.schedule.accessHint')}</p>
            {assessments.map(a => (
              <div key={a.userId} className="ps-casereport-access-row" data-testid={`recipient-access-${a.userId}`}>
                <strong data-phi="name">{personName(a.userId)}</strong>
                <span>{t('caseReport.schedule.accessCounts', { visible: a.visibleCount, total: a.totalCount })}</span>
                {(['narrow', 'skip'] as const).map(c => (
                  <label key={c} className="ps-casereport-check">
                    <input type="radio" name={`access-${a.userId}`} checked={choiceOf(a.userId) === c} onChange={() => setChoice(a.userId, c)} />
                    {t(c === 'narrow' ? 'caseReport.schedule.accessNarrow' : 'caseReport.schedule.accessSkip')}
                  </label>
                ))}
              </div>
            ))}
          </fieldset>
        )}
        <p className="ps-svf-hint">{t('caseReport.schedule.formatNote')}</p>
        <CapabilityButton capability="search:report-schedule:manage" className="ps-searchpage-export-btn" disabled={busy || !draft.savedReportId || draft.recipientUserIds.length === 0}
          disabledTitle={t('caseReport.schedule.createDisabled')}
          onClick={() => void act(() => scheduledReportService.create(draft).then(r => { if (r.ok) setDraft(emptyDraft(timeZone)); return r; }), 'caseReport.schedule.created')}>
          {t('caseReport.schedule.create', { name: reportName(draft.savedReportId) || t('caseReport.schedule.thisReport') })}
        </CapabilityButton>
      </form>
    </section>
  );
};
