// src/components/Config/Cytology/RecallWindowsCard.tsx
// Batch 632 (Pete: "the target windows should be configurable"), per country with editable wording since Batch 640 (Pete: "have the
// user configure the wording and select the jurisdiction from a dropdown"). A lab administrator picks Australia or New Zealand,
// sets that country's target weeks and, if the programme words it differently, the recall text per language. Empty wording means
// the built-in text. Saved inside the cytology screening strategy settings, so the same permission applies. Rules and the save
// (with its audit entry) are in services/cytology (recallWindows.ts, recallWording.ts, saveRecallSettings.ts).
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { auditService, cytologyScreeningStrategyService } from '@/services';
import { useAuth } from '@/contexts/AuthContext';
import { RECALL_WINDOW_KEYS, parseWindowInput, resolveRecallWindowsFor, type RecallWindowKey, type RecallWindows } from '@/services/cytology/recallWindows';
import { recallWordingProblem, withRecallWording, type RecallWordingConfig } from '@/services/cytology/recallWording';
import { saveRecallSettings, type RecallJurisdictionCode } from '@/services/cytology/saveRecallSettings';
import type { RecallKind } from '@/services/cytology/selfCollectedRecall';
import { useReportConfigDirty } from '../configDirtyGuardContext';
import './RecallWindowsCard.css';

type Draft = Record<RecallWindowKey, { from: string; to: string }>;
const K = 'cytologyScreeningStrategySection.recallWindows';
const JURISDICTIONS: readonly RecallJurisdictionCode[] = ['AU', 'NZ'];
/** The braces shown literally in the help text (i18next does not fill a value that itself holds braces). */
const TOKENS = { type: '{{type}}', next: '{{next}}' };
const LANGUAGES = ['en', 'fr', 'de', 'nl', 'ko', 'es'] as const;
const KINDS: readonly RecallKind[] = ['clinician_lbc', 'repeat_collection'];
/** The repeat-collection window each country uses; the other country's is not shown. */
const REPEAT_KEY: Record<RecallJurisdictionCode, RecallWindowKey> = { AU: 'repeatAU', NZ: 'repeatNZ' };

const toDraft = (w: RecallWindows): Draft => Object.fromEntries(RECALL_WINDOW_KEYS.map(k => [k, { from: w[k] ? String(w[k]!.min) : '', to: w[k] ? String(w[k]!.max) : '' }])) as Draft;

const RecallWindowsCard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [jurisdiction, setJurisdiction] = useState<RecallJurisdictionCode>('AU');
  const [language, setLanguage] = useState<(typeof LANGUAGES)[number]>('en');
  const [savedByJ, setSavedByJ] = useState<Record<RecallJurisdictionCode, Draft>>({ AU: toDraft(resolveRecallWindowsFor('AU', undefined, undefined)), NZ: toDraft(resolveRecallWindowsFor('NZ', undefined, undefined)) });
  const [savedWording, setSavedWording] = useState<RecallWordingConfig>({});
  const [draft, setDraft] = useState<Draft>(savedByJ.AU);
  const [wording, setWording] = useState<RecallWordingConfig>({});
  const [message, setMessage] = useState<'saved' | 'failed' | null>(null);
  // Settings that arrive after the person has started typing must not overwrite what they typed.
  const touched = useRef(false);

  const saved = savedByJ[jurisdiction];
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved) || JSON.stringify(wording[jurisdiction] ?? {}) !== JSON.stringify(savedWording[jurisdiction] ?? {});
  useReportConfigDirty(dirty);

  useEffect(() => {
    cytologyScreeningStrategyService.get().then(r => {
      if (!r.ok) return;
      const byJ = Object.fromEntries(JURISDICTIONS.map(j => [j, toDraft(resolveRecallWindowsFor(j, r.data.selfCollectedRecallWindowsByJurisdiction, r.data.selfCollectedRecallWindows))])) as Record<RecallJurisdictionCode, Draft>;
      setSavedByJ(byJ); setSavedWording(r.data.selfCollectedRecallWording ?? {});
      if (touched.current) return;
      setDraft(byJ.AU); setWording(r.data.selfCollectedRecallWording ?? {});
    });
  }, []);

  const parsed = RECALL_WINDOW_KEYS.map(k => ({ key: k, ...parseWindowInput(draft[k].from, draft[k].to) }));
  const shown = parsed.filter(p => p.key === 'urgent' || p.key === 'routine' || p.key === REPEAT_KEY[jurisdiction]);
  const text = (kind: RecallKind) => wording[jurisdiction]?.[kind]?.[language] ?? '';
  const wordingProblems = KINDS.map(kind => ({ kind, problem: recallWordingProblem(text(kind), kind) }));
  const invalid = shown.some(p => p.problem) || wordingProblems.some(p => p.problem);

  const choose = (j: RecallJurisdictionCode) => { setJurisdiction(j); setDraft(savedByJ[j]); setMessage(null); };
  const discard = () => { setDraft(saved); setWording({ ...wording, [jurisdiction]: savedWording[jurisdiction] }); setMessage(null); };
  const save = async () => {
    const windows = Object.fromEntries(parsed.map(p => [p.key, p.window])) as unknown as RecallWindows;
    const outcome = await saveRecallSettings({ jurisdiction, windows, wording }, { name: user?.name ?? 'unknown' }, { strategy: cytologyScreeningStrategyService, logAudit: e => auditService.logEvent(e) });
    if (outcome === 'saved') { setSavedByJ({ ...savedByJ, [jurisdiction]: draft }); setSavedWording({ ...savedWording, [jurisdiction]: wording[jurisdiction] }); setMessage('saved'); }
    else setMessage('failed');
  };
  const restore = () => { setDraft(toDraft(resolveRecallWindowsFor(jurisdiction, undefined, undefined))); setMessage(null); };
  const set = (k: RecallWindowKey, side: 'from' | 'to', v: string) => { touched.current = true; setDraft({ ...draft, [k]: { ...draft[k], [side]: v } }); };
  const setText = (kind: RecallKind, v: string) => { touched.current = true; setWording(withRecallWording(wording, jurisdiction, kind, language, v)); };

  return (
    <div className="ps-conf-card ps-conf-card--spaced">
      <div className="ps-conf-card-title">{t(`${K}.title`)}</div>
      <p className="ps-conf-section-subtitle">{t(`${K}.help`)}</p>
      <label className="ps-conf-label" htmlFor="ps-recall-jurisdiction">{t(`${K}.jurisdiction`)}</label>
      <select id="ps-recall-jurisdiction" className="ps-conf-select" value={jurisdiction} disabled={dirty} onChange={e => choose(e.target.value as RecallJurisdictionCode)}>
        {JURISDICTIONS.map(j => <option key={j} value={j}>{t(`jurisdictionNames.${j}`)}</option>)}
      </select>
      {dirty && <p className="ps-conf-section-subtitle" role="note">{t(`${K}.switchHint`)}</p>}
      <div className="ps-recallwin-grid">
        {shown.map(p => (
          <React.Fragment key={p.key}>
            <span className="ps-conf-value">{t(`${K}.${p.key}`)}</span>
            <input className="ps-conf-input ps-recallwin-input" type="number" min={1} max={52} aria-label={`${t(`${K}.${p.key}`)} ${t(`${K}.from`)}`} placeholder={t(`${K}.from`)} value={draft[p.key].from} onChange={e => set(p.key, 'from', e.target.value)} />
            <input className="ps-conf-input ps-recallwin-input" type="number" min={1} max={52} aria-label={`${t(`${K}.${p.key}`)} ${t(`${K}.to`)}`} placeholder={t(`${K}.to`)} value={draft[p.key].to} onChange={e => set(p.key, 'to', e.target.value)} />
            {p.problem && <span className="ps-recallwin-problem" role="alert">{t(`${K}.problem.${p.problem}`)}</span>}
          </React.Fragment>
        ))}
      </div>
      <div className="ps-conf-card-title">{t(`${K}.wordingTitle`)}</div>
      <p className="ps-conf-section-subtitle">{t(`${K}.wordingHelp`)}</p>
      <label className="ps-conf-label" htmlFor="ps-recall-language">{t(`${K}.language`)}</label>
      <select id="ps-recall-language" className="ps-conf-select" value={language} onChange={e => setLanguage(e.target.value as (typeof LANGUAGES)[number])}>
        {LANGUAGES.map(l => <option key={l} value={l}>{t(`language.${l}`)}</option>)}
      </select>
      {KINDS.map(kind => {
        const problem = wordingProblems.find(p => p.kind === kind)?.problem;
        return (
          <div key={kind} className="ps-recallwin-wording">
            <label className="ps-conf-label" htmlFor={`ps-recall-text-${kind}`}>{t(`${K}.kind.${kind}`)}</label>
            <textarea id={`ps-recall-text-${kind}`} className="ps-conf-input ps-recallwin-text" rows={4} lang={language} value={text(kind)}
              placeholder={t(`cytologyWorklist.recall.wording.${jurisdiction}.${kind}`, { lng: language, interpolation: { skipOnVariables: true }, type: '{{type}}', next: '{{next}}' })}
              onChange={e => setText(kind, e.target.value)} />
            {kind === 'clinician_lbc' && <span className="ps-conf-section-subtitle">{t(`${K}.placeholders`, TOKENS)}</span>}
            {problem && <span className="ps-recallwin-problem" role="alert">{t(`${K}.wordingProblem.${problem}`, TOKENS)}</span>}
          </div>
        );
      })}
      <div className="ps-conf-row-actions">
        <button className="ps-conf-btn-primary" onClick={save} disabled={!dirty || invalid}>{t('common.save')}</button>
        <button className="ps-conf-btn-secondary" onClick={discard} disabled={!dirty}>{t(`${K}.discard`)}</button>
        <button className="ps-conf-btn-secondary" onClick={restore}>{t(`${K}.reset`)}</button>
      </div>
      {message && <p className="ps-conf-section-subtitle" role="status">{t(`${K}.${message === 'saved' ? 'savedNote' : 'failedNote'}`)}</p>}
    </div>
  );
};

export default RecallWindowsCard;
