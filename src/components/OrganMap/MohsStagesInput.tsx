// src/components/OrganMap/MohsStagesInput.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 463: the Mohs stage question in the synoptic (field type
// 'spatialStageCanvas'). Per stage: the canvas (click a sector), the parallel
// checklist (FR-04: every sector a labelled checkbox, keyboard and screen
// reader friendly), the block, histology and perineural invasion of each
// positive sector, blocks cut and the excision time, "Mark stage clear"; then
// Add stage / Remove last stage. Voice: "Stage 1, positive at 12 o'clock"
// (FR-05, five languages) arrives as a pathscribe:voice-command event.
//
// Renders and dispatches only: every change is a patch from
// services/templates/mohsStages.ts applied to the synoptic answers by the
// panel (onPatch); nothing is kept here.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MohsStageCanvas } from './MohsStageCanvas';
import { organMapSchemeVars } from '@/services/organMapping/organMapScheme';
import { organMapSectorName, organMapSectorShortName } from '@/services/organMapping/organMapLabels';
import type { OrganMapScheme } from '@/services/organMapping/organMapTypes';
import {
  addMohsStage, clearMohsStage, mohsBlockOptions, mohsBlockProblems, mohsStageBlockProblem, MOHS_MAX_STAGES, MOHS_SECTORS, mohsVoicePatch, parseMohsVoiceCommand, readMohsStages, removeLastMohsStage,
  mohsVoiceOutcome, setMohsSector, setMohsSectorDetail, setMohsStageDetail, type AnswerPatchOrUpdate,
} from '@/services/templates/mohsStages';
import { MOHS_VOICE_EVENT, type MohsVoiceEventDetail } from '@/services/voice/voiceCommandEvents';

interface Props {
  fieldId: string;
  answers: Record<string, string | string[]>;
  scheme: OrganMapScheme;
  /** The tumour type answered elsewhere in the synoptic, given to a newly positive sector. */
  defaultHistology?: string;
  readOnly?: boolean;
  /** A patch, or a function of the answers as they are when it is applied
   *  (so two changes in quick succession each build on the other). */
  onPatch: (patch: AnswerPatchOrUpdate) => void;
}

export const MohsStagesInput: React.FC<Props> = ({ fieldId, answers, scheme, defaultHistology, readOnly, onPatch }) => {
  const { t } = useTranslation();
  const stages = readMohsStages(fieldId, answers);
  const problems = mohsBlockProblems(fieldId, answers);

  // Voice: the latest answers and callbacks, read when a command arrives.
  const latest = useRef({ answers, defaultHistology, onPatch, readOnly });
  latest.current = { answers, defaultHistology, onPatch, readOnly };
  useEffect(() => {
    const onCommand = (e: Event) => {
      const detail = (e as CustomEvent<MohsVoiceEventDetail>).detail;
      if (!detail || detail.handled || latest.current.readOnly) return;
      const cmd = parseMohsVoiceCommand(detail.text, detail.language);
      if (!cmd) return;
      const { defaultHistology: histology } = latest.current;
      detail.handled = true;
      detail.outcome = mohsVoiceOutcome(fieldId, latest.current.answers, cmd, histology);
      if (detail.outcome === 'applied') latest.current.onPatch(a => mohsVoicePatch(fieldId, a, cmd, histology));
    };
    window.addEventListener(MOHS_VOICE_EVENT, onCommand);
    return () => window.removeEventListener(MOHS_VOICE_EVENT, onCommand);
  }, [fieldId]);

  return (
    <div className="ps-mohs" style={organMapSchemeVars(scheme) as React.CSSProperties}>
      {stages.length === 0 && <p className="ps-mohs-empty">{t('organMap.mohs.input.noStages')}</p>}
      {stages.map(stage => (
        <section key={stage.number} className="ps-mohs-stage" aria-label={t('organMap.mohs.stageTitle', { n: stage.number })}>
          <div className="ps-mohs-stage-head">
            <span className="ps-mohs-stage-title">{t('organMap.mohs.stageTitle', { n: stage.number })}</span>
            <span className={`ps-mohs-stage-status ps-mohs-stage-status--${stage.clear ? 'clear' : 'residual'}`} role="status">
              {t(stage.clear ? 'organMap.mohs.stageClear' : 'organMap.mohs.stageResidual')}
            </span>
            <label className="ps-mohs-inline-label">
              {t('organMap.mohs.input.time')}
              <input type="time" className="ps-syn-input ps-mohs-small" value={stage.time ?? ''} disabled={readOnly}
                onChange={e => onPatch(setMohsStageDetail(fieldId, stage.number, 'time', e.target.value))} />
            </label>
            <label className="ps-mohs-inline-label">
              {t('organMap.mohs.input.blocks')}
              <input type="number" min={0} className="ps-syn-input ps-mohs-small" value={stage.blocks ?? ''} disabled={readOnly}
                onChange={e => onPatch(setMohsStageDetail(fieldId, stage.number, 'blocks', e.target.value))} />
            </label>
            {!readOnly && !stage.clear && (
              <button type="button" className="ps-btn-ghost-dark ps-syn-toolbtn-sm" onClick={() => onPatch(a => clearMohsStage(fieldId, a, stage.number))}>
                {t('organMap.mohs.input.markClear')}
              </button>
            )}
          </div>
          {mohsStageBlockProblem(problems, stage.number) && (
            <p className="ps-mohs-problem" role="alert">
              {t(`organMap.mohs.input.blockProblem.${mohsStageBlockProblem(problems, stage.number)}`, { n: stage.number })}
            </p>
          )}
          <div className="ps-mohs-stage-body">
            <MohsStageCanvas stageNumber={stage.number} stageData={stage} scheme={scheme} fieldId={fieldId} readOnly={readOnly}
              onSectorToggle={ev => onPatch(a => setMohsSector(fieldId, a, ev.stageNumber, ev.sectorId, ev.newStatus === 'POSITIVE' ? 'positive' : 'negative', defaultHistology))} />
            <table className="ps-mohs-checklist">
              <caption className="ps-mohs-checklist-caption">{t('organMap.mohs.input.checklistCaption', { n: stage.number })}</caption>
              <thead>
                <tr>
                  <th scope="col">{t('organMap.mohs.input.sector')}</th>
                  <th scope="col">{t('organMap.mohs.input.positive')}</th>
                  <th scope="col">{t('organMap.mohs.input.block')}</th>
                  <th scope="col">{t('organMap.mohs.input.histology')}</th>
                  <th scope="col">{t('organMap.mohs.input.perineural')}</th>
                </tr>
              </thead>
              <tbody>
                {MOHS_SECTORS.map(sectorId => {
                  const p = stage.positive.find(x => x.sectorId === sectorId);
                  const problem = problems.find(x => x.stage === stage.number && x.sectorId === sectorId)?.problem;
                  const name = organMapSectorName(t, 'mohsStages', `s${stage.number}_${sectorId}`);
                  return (
                    <tr key={sectorId} className={p ? `ps-mohs-row--positive${problem ? ' ps-mohs-row--problem' : ''}` : undefined}>
                      <th scope="row">{organMapSectorShortName(t, 'mohsStages', sectorId)}</th>
                      <td>
                        <input type="checkbox" checked={!!p} disabled={readOnly} aria-label={t('organMap.mohs.input.positiveFor', { name })}
                          onChange={e => { const status = e.target.checked ? 'positive' : 'negative'; onPatch(a => setMohsSector(fieldId, a, stage.number, sectorId, status, defaultHistology)); }} />
                      </td>
                      <td>
                        {p && (
                          <select className="ps-syn-input ps-mohs-block" value={p.block ?? ''} disabled={readOnly} aria-label={t('organMap.mohs.input.blockFor', { name })}
                            aria-invalid={problem ? true : undefined}
                            onChange={e => onPatch(setMohsSectorDetail(fieldId, stage.number, sectorId, 'block', e.target.value))}>
                            <option value="">{t('organMap.mohs.input.unassigned')}</option>
                            {mohsBlockOptions(stage).map(b => <option key={b} value={b}>{b}</option>)}
                          </select>
                        )}
                      </td>
                      <td>
                        {p && <input className="ps-syn-input ps-mohs-histology" value={p.histology ?? ''} disabled={readOnly} aria-label={t('organMap.mohs.input.histologyFor', { name })}
                          onChange={e => onPatch(setMohsSectorDetail(fieldId, stage.number, sectorId, 'histology', e.target.value))} />}
                      </td>
                      <td>
                        {p && <input type="checkbox" checked={p.perineural} disabled={readOnly} aria-label={t('organMap.mohs.input.perineuralFor', { name })}
                          onChange={e => onPatch(setMohsSectorDetail(fieldId, stage.number, sectorId, 'pni', e.target.checked))} />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      {!readOnly && (
        <div className="ps-mohs-actions">
          <button type="button" className="ps-btn-primary ps-syn-toolbtn-sm" disabled={stages.length >= MOHS_MAX_STAGES} onClick={() => { const now = new Date(); onPatch(a => addMohsStage(fieldId, a, now)); }}>
            {t('organMap.mohs.input.addStage', { n: stages.length + 1 })}
          </button>
          {stages.length > 0 && (
            <button type="button" className="ps-btn-ghost-dark ps-syn-toolbtn-sm" onClick={() => onPatch(a => removeLastMohsStage(fieldId, a))}>
              {t('organMap.mohs.input.removeStage', { n: stages.length })}
            </button>
          )}
          <span className="ps-mohs-voice-hint">{t('organMap.mohs.input.voiceHint')}</span>
        </div>
      )}
    </div>
  );
};
