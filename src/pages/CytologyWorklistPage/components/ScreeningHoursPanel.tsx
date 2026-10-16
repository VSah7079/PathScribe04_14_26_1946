// src/pages/CytologyWorklistPage/components/ScreeningHoursPanel.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 572 (Pete, Oct 14, 2026; readiness review F7, option C): today's
// screening hours on the Cytology worklist, and the end-of-day sign-off.
// One click confirms the recorded figure (click economy); "Correct" opens the
// figure, a quick-pick reason and an optional note, inline (no window). The
// confirmed hours are the screening hours record (the supervisor's workload
// report counts them; the live limit uses the recorded time); a correction more
// than the tolerance from the recorded figure is flagged for the supervisor.
// A sign-off made before more screening was recorded is out of date: the
// panel says so and asks for one more confirmation.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SCREENING_HOURS_FLAG_TOLERANCE_HOURS, isCorrection, isSignOffStale, type ScreeningHoursDay } from '@/services';
import { SCREENING_HOURS_NOTE_MAX, SCREENING_HOURS_REASONS, type ScreeningHoursReason } from '@/types/cytology/CytologyScreeningHoursSignOff';
import { formatDate, formatTime } from '@/utils/formatDate';
import type { SignOffResult } from '../hooks/useScreeningHoursSignOff';

interface Props {
  day: ScreeningHoursDay;
  saving: boolean;
  onSignOff: (hours: number, reasonId?: ScreeningHoursReason, note?: string) => Promise<SignOffResult>;
  /** Batch 574: yesterday's panel (a night shift's first part), shown while it still needs signing off. */
  which?: 'today' | 'yesterday';
}

export const ScreeningHoursPanel: React.FC<Props> = ({ day, saving, onSignOff, which = 'today' }) => {
  const titleId = `ps-cyto-hours-title-${which}`;
  const reasonName = `ps-cyto-hours-reason-${which}`;
  const { t, i18n } = useTranslation();
  const fmt = (h: number) => new Intl.NumberFormat(i18n.language, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(h);
  const [editing, setEditing] = useState(false);
  const [hours, setHours] = useState('');
  const [reasonId, setReasonId] = useState<ScreeningHoursReason | ''>('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<SignOffResult | null>(null);
  const recorded = day.recordedHours;
  const stale = isSignOffStale(day.signOff, recorded);
  const signed = stale ? null : day.signOff;

  const startEditing = () => {
    setHours(String(signed ? signed.signedHours : recorded));
    setReasonId(signed?.reasonId ?? '');
    setNote(signed?.note ?? '');
    setError(null);
    setEditing(true);
  };
  const submit = async (h: number, r?: ScreeningHoursReason, n?: string) => {
    const result = await onSignOff(h, r, n);
    if (result === 'saved') {
      setEditing(false); setError(null);
      // Batch 574: yesterday's panel goes once signed off: keep the keyboard's place on today's heading.
      if (which === 'yesterday') document.getElementById('ps-cyto-hours-title-today')?.focus();
    } else setError(result);
  };
  const typed = Number(hours.replace(',', '.'));
  const correcting = editing && Number.isFinite(typed) && isCorrection(recorded, typed);

  return (
    <section className={which === 'yesterday' ? 'ps-cyto-hours ps-cyto-hours--yesterday' : 'ps-cyto-hours'} aria-labelledby={titleId}>
      <div className="ps-cyto-hours-head">
        <h2 id={titleId} className="ps-cyto-hours-title" tabIndex={-1}>
          {t(which === 'yesterday' ? 'cytologyWorklist.screeningHours.titleYesterday' : 'cytologyWorklist.screeningHours.title')}
          {/* Batch 574: the lab's date, so a night shift can see which day it is signing. */}
          {' '}<span className="ps-cyto-hours-date">{formatDate(day.date, i18n.language)}</span>
        </h2>
        <span className="ps-cyto-hours-recorded">{t('cytologyWorklist.screeningHours.recorded', { hours: fmt(recorded) })}</span>
      </div>
      {!editing && !signed && (
        <div className="ps-cyto-hours-row">
          <span className="ps-cyto-hours-hint">
            {stale && day.signOff
              ? t('cytologyWorklist.screeningHours.staleNote', { signed: fmt(day.signOff.signedHours), time: formatTime(day.signOff.signedAt, i18n.language) })
              : t(which === 'yesterday' ? 'cytologyWorklist.screeningHours.hintYesterday' : 'cytologyWorklist.screeningHours.hint')}
          </span>
          <button type="button" className="ps-conf-btn-primary" disabled={saving} onClick={() => void submit(recorded)}>
            {t('cytologyWorklist.screeningHours.confirm', { hours: fmt(recorded) })}
          </button>
          <button type="button" className="ps-conf-btn-secondary" onClick={startEditing}>{t('cytologyWorklist.screeningHours.correct')}</button>
        </div>
      )}
      {!editing && signed && (
        <div className="ps-cyto-hours-row">
          <span className="ps-cyto-hours-signed">
            {signed.reasonId
              ? t('cytologyWorklist.screeningHours.signedOffCorrected', { hours: fmt(signed.signedHours), time: formatTime(signed.signedAt, i18n.language), recorded: fmt(signed.recordedHours) })
              : t('cytologyWorklist.screeningHours.signedOff', { hours: fmt(signed.signedHours), time: formatTime(signed.signedAt, i18n.language) })}
          </span>
          {signed.flagged && <span className="ps-cyto-hours-flag">{t('cytologyWorklist.screeningHours.flaggedNote', { tolerance: fmt(SCREENING_HOURS_FLAG_TOLERANCE_HOURS) })}</span>}
          <button type="button" className="ps-conf-btn-secondary" onClick={startEditing}>{t('cytologyWorklist.screeningHours.change')}</button>
        </div>
      )}
      {editing && (
        <form className="ps-cyto-hours-form" onSubmit={e => { e.preventDefault(); void submit(typed, reasonId || undefined, note); }}>
          <label className="ps-cyto-hours-field">
            <span>{t(which === 'yesterday' ? 'cytologyWorklist.screeningHours.hoursLabelYesterday' : 'cytologyWorklist.screeningHours.hoursLabel')}</span>
            <input type="number" inputMode="decimal" min={0} max={24} step="any" value={hours} onChange={e => setHours(e.target.value)} className="ps-cyto-hours-input" />
          </label>
          {correcting && (
            <fieldset className="ps-cyto-hours-reasons">
              <legend>{t('cytologyWorklist.screeningHours.reasonLabel')}</legend>
              {SCREENING_HOURS_REASONS.map(r => (
                <label key={r} className="ps-cyto-hours-reason">
                  <input type="radio" name={reasonName} value={r} checked={reasonId === r} onChange={() => setReasonId(r)} />
                  <span>{t(`cytologyWorklist.screeningHours.reasons.${r}`)}</span>
                </label>
              ))}
            </fieldset>
          )}
          {correcting && (
            <label className="ps-cyto-hours-field">
              <span>{reasonId === 'other' ? t('cytologyWorklist.screeningHours.noteLabel') : t('cytologyWorklist.screeningHours.noteOptional')}</span>
              <input type="text" value={note} onChange={e => setNote(e.target.value)} className="ps-cyto-hours-note" maxLength={SCREENING_HOURS_NOTE_MAX} aria-describedby={`${titleId}-note-hint`} />
              {/* Batch 574: the note shows on the supervisor's report. */}
              <span id={`${titleId}-note-hint`} className="ps-cyto-hours-hint">{t('cytologyWorklist.screeningHours.noteHint')}</span>
            </label>
          )}
          {error && <p className="ps-cyto-hours-error" role="alert">{t(`cytologyWorklist.screeningHours.errors.${error}`)}</p>}
          <div className="ps-cyto-hours-row">
            <button type="submit" className="ps-conf-btn-primary" disabled={saving}>{t('cytologyWorklist.screeningHours.save')}</button>
            <button type="button" className="ps-conf-btn-secondary" onClick={() => { setEditing(false); setError(null); }}>{t('cytologyWorklist.screeningHours.cancel')}</button>
          </div>
        </form>
      )}
    </section>
  );
};
