// src/components/Config/System/TumorBoardCriteriaRulesCard.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 610 (#71). The "Diagnosis and biomarker rules" card on Configuration →
// System → Tumor Board Auto-Flag Rules. An admin adds a rule made of criteria
// (diagnosis text, a biomarker result, an optional margin distance); at sign-out
// a case whose signed report matches every criterion is listed for the rule's
// board with a trigger reason. Saves go through tumorBoardCriteriaRuleService,
// which checks config:tumor-board-rules:manage. What a criterion matches is
// decided by tumorBoardRules/criteriaRuleEvaluation.ts, not here.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tumorBoardCriteriaRuleService } from '@/services';
import { TUMOR_BOARD_NAMES, type TumorBoardName } from '@/services/tumorBoard/ITumorBoardService';
import type { TumorBoardCriteriaRule, TumorBoardCriterion } from '@/services/tumorBoardRules/ITumorBoardRuleService';
import { MAX_CRITERIA_PER_RULE } from '@/services/tumorBoardRules/ITumorBoardRuleService';

interface CriterionDraft { kind: TumorBoardCriterion['kind']; a: string; b: string }
interface RuleDraft { label: string; board: TumorBoardName; criteria: CriterionDraft[] }

const emptyDraft = (): RuleDraft => ({ label: '', board: TUMOR_BOARD_NAMES[0], criteria: [{ kind: 'diagnosis', a: '', b: '' }] });

function toCriterion(d: CriterionDraft): TumorBoardCriterion {
  if (d.kind === 'diagnosis') return { kind: 'diagnosis', text: d.a };
  if (d.kind === 'biomarker') return { kind: 'biomarker', marker: d.a, result: d.b };
  return { kind: 'margin', belowMm: Number(d.a) };
}

interface Props {
  rules: TumorBoardCriteriaRule[];
  /** Called after any change so the screen reloads (and the facility override list sees the new rules). */
  onChanged: () => Promise<void>;
  onError: (error: string | null) => void;
  /** Reports an unsaved rule form to the screen's unsaved-changes guard. */
  onDirtyChange: (dirty: boolean) => void;
}

const TumorBoardCriteriaRulesCard: React.FC<Props> = ({ rules, onChanged, onError, onDirtyChange }) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<RuleDraft | null>(null);

  const open = (next: RuleDraft | null) => { setDraft(next); onDirtyChange(next !== null); };

  const describe = (c: TumorBoardCriterion) =>
    c.kind === 'diagnosis' ? t('tumorBoardRulesSection.criteria.summaryDiagnosis', { text: c.text })
      : c.kind === 'biomarker' ? t('tumorBoardRulesSection.criteria.summaryBiomarker', { marker: c.marker, result: c.result })
        : t('tumorBoardRulesSection.criteria.summaryMargin', { mm: c.belowMm });

  const report = async (res: { ok: boolean; error?: string }) => {
    onError(res.ok ? null : t(`tumorBoardRulesSection.errors.${res.error}`, { defaultValue: t('tumorBoardRulesSection.errors.saveFailed') }));
    if (res.ok) await onChanged();
    return res.ok;
  };

  const save = async () => {
    if (!draft) return;
    const res = await tumorBoardCriteriaRuleService.create({ label: draft.label, board: draft.board, criteria: draft.criteria.map(toCriterion) });
    if (await report(res)) open(null);
  };

  const setCriterion = (index: number, patch: Partial<CriterionDraft>) =>
    draft && open({ ...draft, criteria: draft.criteria.map((c, i) => (i === index ? { ...c, ...patch } : c)) });

  return (
    <div className="ps-conf-card ps-conf-card--spaced" data-testid="tbr-criteria-card">
      <div className="ps-conf-row">
        <div className="ps-conf-card-title">{t('tumorBoardRulesSection.criteria.title')}</div>
        {!draft && <button className="ps-conf-btn-secondary" onClick={() => open(emptyDraft())}>{t('tumorBoardRulesSection.criteria.addRule')}</button>}
      </div>
      <p className="ps-conf-section-subtitle">{t('tumorBoardRulesSection.criteria.subtitle')}</p>

      {rules.map(rule => (
        <div key={rule.id} className="ps-conf-row">
          <span className="ps-conf-value">
            {t(`tumorBoard.boards.${rule.board}`)} — {rule.label}: {rule.criteria.map(describe).join('; ')}
          </span>
          <div className="ps-conf-row-actions">
            <label className="ps-conf-label" htmlFor={`tbr-crit-active-${rule.id}`}>{t('tumorBoardRulesSection.activeLabel')}</label>
            <input
              id={`tbr-crit-active-${rule.id}`}
              type="checkbox"
              checked={rule.active}
              onChange={e => { void tumorBoardCriteriaRuleService.update(rule.id, { active: e.target.checked }).then(report); }}
            />
            <button className="ps-conf-btn-secondary" onClick={() => { void tumorBoardCriteriaRuleService.remove(rule.id).then(report); }}>{t('common.remove')}</button>
          </div>
        </div>
      ))}
      {rules.length === 0 && !draft && <div className="ps-conf-empty-row">{t('tumorBoardRulesSection.criteria.empty')}</div>}

      {draft && (
        <div>
          <div className="ps-conf-row">
            <label className="ps-conf-label" htmlFor="tbr-crit-label">{t('tumorBoardRulesSection.criteria.ruleLabel')}</label>
            <input id="tbr-crit-label" className="ps-conf-input" value={draft.label} onChange={e => open({ ...draft, label: e.target.value })} />
            <label className="ps-conf-label" htmlFor="tbr-crit-board">{t('tumorBoardRulesSection.criteria.board')}</label>
            <select id="tbr-crit-board" className="ps-conf-select" value={draft.board} onChange={e => open({ ...draft, board: e.target.value as TumorBoardName })}>
              {TUMOR_BOARD_NAMES.map(b => <option key={b} value={b}>{t(`tumorBoard.boards.${b}`)}</option>)}
            </select>
          </div>
          <p className="ps-conf-section-subtitle">{t('tumorBoardRulesSection.criteria.allMustMatch')}</p>
          {draft.criteria.map((c, i) => (
            <div key={i} className="ps-conf-row">
              <select
                className="ps-conf-select"
                aria-label={t('tumorBoardRulesSection.criteria.kindLabel', { n: i + 1 })}
                value={c.kind}
                onChange={e => setCriterion(i, { kind: e.target.value as CriterionDraft['kind'], a: '', b: '' })}
              >
                <option value="diagnosis">{t('tumorBoardRulesSection.criteria.kind.diagnosis')}</option>
                <option value="biomarker">{t('tumorBoardRulesSection.criteria.kind.biomarker')}</option>
                <option value="margin">{t('tumorBoardRulesSection.criteria.kind.margin')}</option>
              </select>
              <input
                className="ps-conf-input"
                aria-label={t(c.kind === 'diagnosis' ? 'tumorBoardRulesSection.criteria.diagnosisText' : c.kind === 'biomarker' ? 'tumorBoardRulesSection.criteria.markerLabel' : 'tumorBoardRulesSection.thresholdLabel', { n: i + 1 })}
                inputMode={c.kind === 'margin' ? 'decimal' : 'text'}
                value={c.a}
                onChange={e => setCriterion(i, { a: e.target.value })}
              />
              {c.kind === 'biomarker' && (
                <input
                  className="ps-conf-input"
                  aria-label={t('tumorBoardRulesSection.criteria.resultLabel', { n: i + 1 })}
                  value={c.b}
                  onChange={e => setCriterion(i, { b: e.target.value })}
                />
              )}
              {draft.criteria.length > 1 && (
                <button className="ps-conf-btn-secondary" onClick={() => open({ ...draft, criteria: draft.criteria.filter((_, k) => k !== i) })}>
                  {t('tumorBoardRulesSection.criteria.removeCriterion')}
                </button>
              )}
            </div>
          ))}
          <div className="ps-conf-row-actions">
            {draft.criteria.length < MAX_CRITERIA_PER_RULE && (
              <button className="ps-conf-btn-secondary" onClick={() => open({ ...draft, criteria: [...draft.criteria, { kind: 'biomarker', a: '', b: '' }] })}>
                {t('tumorBoardRulesSection.criteria.addCriterion')}
              </button>
            )}
            <button className="ps-conf-btn-primary" onClick={() => void save()}>{t('common.save')}</button>
            <button className="ps-conf-btn-secondary" onClick={() => { open(null); onError(null); }}>{t('common.cancel')}</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TumorBoardCriteriaRulesCard;
