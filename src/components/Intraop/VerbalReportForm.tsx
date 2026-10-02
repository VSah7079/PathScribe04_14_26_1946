// src/components/Intraop/VerbalReportForm.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 399 (Pete). The verbal report of a frozen result, as a structured
// record: who received it, their role, and the mandatory read-back. The
// critical-results dictionary suggests whether this is a critical result;
// the pathologist ticks or unticks it. A critical result going to anyone but
// the operating surgeon brings up a large "Surgeon unavailable" button, which
// shows the reasons as large buttons; the report can't be logged until one is
// chosen (Pete: "There is going to have to be a human involved in this
// Decision"). The time is the moment of logging.
//
// The rules are services/intraop/verbalReport.ts and
// services/fieldRequirements/intraopChecks.ts; the dictionary match is
// services/intraop/matchIntraopCriticalResults.ts. This form shows and dispatches.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '@/pathscribe.css';
import {
  actionRegistryService, intraoperativeService, intraopCriticalResultService, reasonDictionaryService, physicianService,
  intraopVerbalReportMissing, matchIntraopCriticalResults, surgeonUnavailableNeeded, SURGEON_UNAVAILABLE_OTHER,
  OTHER_NOTE_SUGGESTION_KEYS, otherNoteAcceptable, recipientSuggestions, receivedByForRole,
  parseVerbalReportDictationDefault, applyDictationProposal,
} from '@/services';
import { useVoice } from '@/contexts/VoiceProvider';
import { SpellCheckedTextarea } from '@/components/SpellCheck/SpellCheckedTextarea';
import { formatFullDisplayName } from '@/utils/personName';
import { useFieldRequirements } from '@/hooks/useFieldRequirements';
import { useAuth } from '@/contexts/AuthContext';
import { StillRequired, Req } from './IntraopFieldBits';
import {
  VERBAL_REPORT_RECIPIENT_ROLES,
  type IntraoperativeEntry, type VerbalReportInput, type VerbalReportRecipientRole,
} from '@/types/intraop/IntraoperativeEntry';
import type { IntraopCriticalResultEntry } from '@/types/intraop/IntraopCriticalResult';
import type { ReasonDictionaryEntry } from '@/types/reasons/ReasonDictionaryEntry';

interface VerbalReportFormProps {
  entry: IntraoperativeEntry;
  onLogged: () => void;
  onCancel: () => void;
}

export const VerbalReportForm: React.FC<VerbalReportFormProps> = ({ entry, onLogged, onCancel }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const requirements = useFieldRequirements('intraop');

  const [dictionary, setDictionary] = useState<IntraopCriticalResultEntry[]>([]);
  const [reasons, setReasons] = useState<ReasonDictionaryEntry[]>([]);
  const [directoryNames, setDirectoryNames] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    void intraopCriticalResultService.getAll().then(r => { if (!cancelled && r.ok) setDictionary(r.data); });
    void reasonDictionaryService.getAll('SURGEON_UNAVAILABLE').then(r => { if (!cancelled && r.ok) setReasons(r.data.filter(x => x.status === 'Active')); });
    // Pete: a searchable list, not a directory to scroll mid-call.
    void physicianService.getAll().then(r => { if (!cancelled && r.ok) setDirectoryNames(r.data.map(p => formatFullDisplayName(p as any)).filter(Boolean)); });
    return () => { cancelled = true; };
  }, []);

  const matches = matchIntraopCriticalResults(entry.specimens, dictionary);
  const specimenLabel = (id: string) => entry.specimens.find(s => s.id === id)?.specimenLabel ?? id;

  const [receivedBy, setReceivedBy] = useState('');
  const [role, setRole] = useState<VerbalReportRecipientRole | ''>('');
  const [readBack, setReadBack] = useState(false);
  // The pathologist's decision; until they change it, it follows the dictionary's suggestion.
  const [criticalChoice, setCriticalChoice] = useState<boolean | null>(null);
  const critical = criticalChoice ?? matches.length > 0;
  const [showReasons, setShowReasons] = useState(false);
  const [reason, setReason] = useState<ReasonDictionaryEntry | null>(null);
  const [reasonNote, setReasonNote] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  // Batch 400 (Pete): dictate the report, then let AI (or, without one,
  // keyword matching) fill in the fields for the pathologist to check.
  const [dictated, setDictated] = useState('');
  const [parsing, setParsing] = useState(false);
  const [filled, setFilled] = useState<string[]>([]);
  const [engine, setEngine] = useState<'ai' | 'rules' | null>(null);
  const [suggestedReasonId, setSuggestedReasonId] = useState<string | null>(null);
  const [dictationFocused, setDictationFocused] = useState(false);
  const { startDictation, phase, dictationTarget } = useVoice();
  useEffect(() => {
    if (phase !== 'dictate' || dictationTarget || !dictationFocused) return;
    startDictation({
      fieldId: `verbalReport-${entry.id}`,
      label: t('intraopQueue.verbalReport.dictationLabel'),
      context: 'verbal report of a frozen section result: who received it, their role, read-back',
      onText: (text: string, isInterim?: boolean) => {
        if (isInterim) return;
        setDictated(prev => (prev ? `${prev} ${text}`.trim() : text.trim()));
      },
    });
  }, [phase, dictationTarget, dictationFocused, entry.id, startDictation, t]);

  const unfill = (field: string) => setFilled(prev => prev.filter(f => f !== field));
  const fillFromDictation = async () => {
    if (!dictated.trim() || parsing) return;
    setParsing(true);
    const proposal = await parseVerbalReportDictationDefault(dictated, {
      sessionSurgeon: entry.surgeon,
      patient: { patientName: entry.patientMatch?.patientName, mrn: entry.patientMatch?.mrn, dateOfBirth: entry.patientMatch?.dateOfBirth },
      reasonIds: reasons.map(r => r.id),
    }, entry.facilityId);
    setParsing(false);
    const next = applyDictationProposal({ receivedBy, recipientRole: role, readBackConfirmed: readBack }, proposal);
    setReceivedBy(next.receivedBy);
    setRole(next.recipientRole);
    setReadBack(next.readBackConfirmed);
    setFilled(prev => [...new Set([...prev, ...next.filled])]);
    setEngine(proposal.engine);
    setSuggestedReasonId(proposal.suggestedReasonId ?? null);
    if (proposal.suggestedReasonId) setShowReasons(true);
    if (!note.trim()) setNote(dictated.trim());
  };
  const fromDictation = (field: string) =>
    filled.includes(field) ? <span className="ps-verbal-report__ai-tag">{t('intraopQueue.verbalReport.fromDictation')}</span> : null;

  const input: VerbalReportInput = {
    receivedBy, recipientRole: role, readBackConfirmed: readBack, critical,
    suggestedCriticalIds: matches.map(m => m.entryId), suggestedCriticalNames: matches.map(m => m.name),
    surgeonUnavailable: reason ? { reasonId: reason.id, reasonName: reason.name, note: reasonNote } : undefined,
    note,
    reportedBy: user ? { userId: user.id, userName: user.name } : undefined,
    dictation: engine && filled.length ? { engine, filledFields: filled } : undefined,
  };
  const missing = intraopVerbalReportMissing(input, requirements);
  const needsReason = surgeonUnavailableNeeded(input);
  const suggestions = recipientSuggestions(receivedBy, entry.surgeon, directoryNames);
  const otherNoteShort = reason?.id === SURGEON_UNAVAILABLE_OTHER && reasonNote.trim() !== '' && !otherNoteAcceptable(reasonNote);
  const pickRole = (r: VerbalReportRecipientRole) => { setRole(r); unfill('verbalReportRole'); setReceivedBy(prev => receivedByForRole(r, prev, entry.surgeon)); };
  const reasonLabel = (r: ReasonDictionaryEntry) => t(`intraopQueue.verbalReport.reasons.${r.id}`, { defaultValue: r.name });

  const submit = async () => {
    if (busy || missing.length > 0) return;
    setBusy(true);
    const res = await intraoperativeService.recordVerbalReport(entry.id, input);
    setBusy(false);
    setFailed(!res.ok);
    if (res.ok) onLogged();
  };

  // Voice/keyboard "report logged": the same Log, with the same checks.
  const submitRef = useRef(submit);
  submitRef.current = submit;
  useEffect(() => actionRegistryService.onAction((actionId: string) => {
    if (actionId === 'INTRAOP_LOG_SURGEON_REPORT') void submitRef.current();
  }), []);

  return (
    <div className="ps-intraop-note ps-verbal-report">
      <span className="ps-intraop-note-label">{t('intraopQueue.entryCard.reportToSurgeonLabel')}</span>

      <div className="ps-verbal-report__dictation">
        <label className="ps-conf-label" htmlFor={`vr-dictation-${entry.id}`}>{t('intraopQueue.verbalReport.dictationLabel')}</label>
        <SpellCheckedTextarea
          id={`vr-dictation-${entry.id}`} className="ps-conf-input ps-conf-textarea" value={dictated}
          onChange={e => setDictated(e.target.value)}
          onFocus={() => setDictationFocused(true)} onBlur={() => setDictationFocused(false)}
          placeholder={t('intraopQueue.verbalReport.dictationPlaceholder')}
        />
        <p className="ps-intraop-gate-note">{t('intraopQueue.verbalReport.dictationHint')}</p>
        <button type="button" className="ps-verbal-report__fill-btn" disabled={!dictated.trim() || parsing} onClick={() => { void fillFromDictation(); }}>
          {parsing ? t('intraopQueue.verbalReport.filling') : t('intraopQueue.verbalReport.fillFromDictation')}
        </button>
        {engine && (
          <p className="ps-verbal-report__filled-note" role="status">
            {filled.length
              ? t(engine === 'ai' ? 'intraopQueue.verbalReport.filledByAi' : 'intraopQueue.verbalReport.filledByRules', { count: filled.length })
              : t('intraopQueue.verbalReport.nothingFilled')}
          </p>
        )}
      </div>

      {matches.length > 0 && (
        <div className="ps-verbal-report__critical-suggestion" role="status">
          <strong>{t('intraopQueue.verbalReport.criticalSuggested')}</strong>
          <ul className="ps-verbal-report__critical-list">
            {matches.map(m => (
              <li key={m.entryId}>
                {t('intraopQueue.verbalReport.criticalMatch', { name: m.name, specimens: m.specimenIds.map(specimenLabel).join(', ') })}
              </li>
            ))}
          </ul>
        </div>
      )}
      <label className="ps-intraop-confirm-row">
        <input type="checkbox" checked={critical} onChange={e => setCriticalChoice(e.target.checked)} />
        {t('intraopQueue.verbalReport.criticalCheckbox')}
      </label>

      <label className="ps-conf-label" htmlFor={`vr-received-${entry.id}`}>
        {t('fieldRequirements.fields.intraop.verbalReportRecipient')}<Req requirements={requirements} id="verbalReportRecipient" />{fromDictation('verbalReportRecipient')}
      </label>
      <input
        id={`vr-received-${entry.id}`} className="ps-conf-input" value={receivedBy} autoFocus
        list={`vr-received-list-${entry.id}`} autoComplete="off"
        onChange={e => { setReceivedBy(e.target.value); unfill('verbalReportRecipient'); }} placeholder={t('intraopQueue.verbalReport.receivedByPlaceholder')}
      />
      <datalist id={`vr-received-list-${entry.id}`}>
        {suggestions.map(n => <option key={n} value={n} />)}
      </datalist>

      <div className="ps-conf-label" id={`vr-role-${entry.id}`}>
        {t('fieldRequirements.fields.intraop.verbalReportRole')}<Req requirements={requirements} id="verbalReportRole" />{fromDictation('verbalReportRole')}
      </div>
      <div className="ps-verbal-report__roles" role="radiogroup" aria-labelledby={`vr-role-${entry.id}`}>
        {VERBAL_REPORT_RECIPIENT_ROLES.map(r => (
          <button
            key={r} type="button" role="radio" aria-checked={role === r}
            className={`ps-verbal-report__big-choice${role === r ? ' ps-verbal-report__big-choice--selected' : ''}`}
            onClick={() => pickRole(r)}
          >
            {t(`intraopQueue.verbalReport.roles.${r}`)}
          </button>
        ))}
      </div>

      <label className="ps-intraop-confirm-row ps-verbal-report__readback">
        <input type="checkbox" checked={readBack} onChange={e => { setReadBack(e.target.checked); unfill('verbalReportReadBack'); }} />
        {t('intraopQueue.verbalReport.readBackCheckbox')}<Req requirements={requirements} id="verbalReportReadBack" />{fromDictation('verbalReportReadBack')}
      </label>

      {needsReason && (
        <div className="ps-verbal-report__unavailable">
          <p className="ps-verbal-report__unavailable-note">{t('intraopQueue.verbalReport.directExpected')}</p>
          {!showReasons && !reason && (
            <button type="button" className="ps-verbal-report__unavailable-btn" onClick={() => setShowReasons(true)}>
              {t('intraopQueue.verbalReport.surgeonUnavailableButton')}
            </button>
          )}
          {(showReasons || reason) && (
            <div className="ps-verbal-report__reasons" role="radiogroup" aria-label={t('fieldRequirements.fields.intraop.surgeonUnavailableReason')}>
              {reasons.map(r => (
                <button
                  key={r.id} type="button" role="radio" aria-checked={reason?.id === r.id}
                  className={`ps-verbal-report__big-choice ps-verbal-report__big-choice--reason${reason?.id === r.id ? ' ps-verbal-report__big-choice--selected' : ''}`}
                  onClick={() => setReason(r)}
                >
                  {reasonLabel(r)}
                  {suggestedReasonId === r.id && reason?.id !== r.id && <span className="ps-verbal-report__ai-tag">{t('intraopQueue.verbalReport.suggestedFromDictation')}</span>}
                </button>
              ))}
            </div>
          )}
          {reason?.id === SURGEON_UNAVAILABLE_OTHER && (
            <>
              <div className="ps-verbal-report__suggestions">
                {OTHER_NOTE_SUGGESTION_KEYS.map(k => (
                  <button key={k} type="button" className="ps-verbal-report__suggestion"
                    onClick={() => setReasonNote(t(`intraopQueue.verbalReport.otherSuggestions.${k}`))}>
                    {t(`intraopQueue.verbalReport.otherSuggestions.${k}`)}
                  </button>
                ))}
              </div>
              <input
                className="ps-conf-input" value={reasonNote} onChange={e => setReasonNote(e.target.value)}
                aria-label={t('fieldRequirements.fields.intraop.surgeonUnavailableNote')}
                placeholder={t('intraopQueue.verbalReport.otherReasonPlaceholder')}
              />
              {otherNoteShort && <p className="ps-field-still-required" role="status">{t('intraopQueue.verbalReport.otherTooShort')}</p>}
            </>
          )}
        </div>
      )}

      <input
        className="ps-conf-input" value={note} onChange={e => setNote(e.target.value)}
        placeholder={t('intraopQueue.entryCard.reportNotePlaceholder')}
        aria-label={t('fieldRequirements.fields.intraop.verbalReportNote')}
      />
      <StillRequired missing={missing} />
      {failed && <p className="ps-field-still-required" role="alert">{t('intraopQueue.verbalReport.failed')}</p>}
      <div className="ps-intraop-report-actions">
        <button className="ps-conf-btn-primary" disabled={busy || missing.length > 0} onClick={() => { void submit(); }}>{t('intraopQueue.entryCard.logNow')}</button>
        <button className="ps-conf-btn-secondary" disabled={busy} onClick={onCancel}>{t('common.cancel')}</button>
      </div>
    </div>
  );
};

export default VerbalReportForm;
