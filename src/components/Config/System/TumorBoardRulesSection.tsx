// src/components/Config/System/TumorBoardRulesSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 491 (PS-359 follow-up). Configuration → System → Tumor Board
// Auto-Flag Rules — the enterprise baseline (one margin-distance threshold
// per board, admin-editable) and each facility's own override, per Pete's
// confirmed Hybrid Inheritance Model (Oct 8). Checked against
// config:tumor-board-rules:manage (guardConfigWrites, in
// tumorBoardRules/mockTumorBoardRuleService.ts). No business logic here
// (CLAUDE.md rule 2) — resolving what a facility's override actually does
// is tumorBoardRules/tumorBoardRuleEvaluation.ts's own job; this screen
// only edits the stored rows.
//
// Batch 494 (PS-359 follow-up — MDT Self-Service Assignment & Batching
// redesign, Pete, Oct 8): the admin-editable half of "A system rule should
// lock the batch at a set interval before the meeting time (e.g., 2 days
// prior)" — the Batching Cut-Off card below edits
// tumorBoardBatchSettingsService's one enterprise-wide cutoffHours value
// (tumorBoardBatchLock.ts's own header explains why this is a single
// number rather than a per-facility override like the rules above).
// Checked against the same config:tumor-board-rules:manage capability.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../../pathscribe.css';
import { tumorBoardRuleService, facilityTumorBoardRuleOverrideService, facilityService, tumorBoardBatchSettingsService, tumorBoardCriteriaRuleService } from '@/services';
import { TUMOR_BOARD_NAMES, type TumorBoardName } from '@/services/tumorBoard/ITumorBoardService';
import type { TumorBoardAutoFlagRule, FacilityTumorBoardRuleOverride, TumorBoardCriteriaRule } from '@/services/tumorBoardRules/ITumorBoardRuleService';
import TumorBoardCriteriaRulesCard from './TumorBoardCriteriaRulesCard';
import { DEFAULT_TUMOR_BOARD_BATCH_SETTINGS } from '@/services/tumorBoardRules/ITumorBoardRuleService';
import type { Facility } from '@/services/facilities/IFacilityService';
import { useReportConfigDirty } from '../configDirtyGuardContext';

interface Draft { marginThresholdMm: string; active: boolean; }
/** Batch 610 (#71): '' keeps the rule's own board. */
type RouteDraft = TumorBoardName | '';
const draftOf = (r: Pick<TumorBoardAutoFlagRule, 'marginThresholdMm' | 'active'>): Draft => ({ marginThresholdMm: String(r.marginThresholdMm), active: r.active });
const isDraftDirty = (draft: Draft, saved: Pick<TumorBoardAutoFlagRule, 'marginThresholdMm' | 'active'>) =>
  draft.marginThresholdMm !== String(saved.marginThresholdMm) || draft.active !== saved.active;

const TumorBoardRulesSection: React.FC = () => {
  const { t } = useTranslation();
  const [rules, setRules] = useState<TumorBoardAutoFlagRule[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [overrides, setOverrides] = useState<FacilityTumorBoardRuleOverride[]>([]);
  const [addingFacility, setAddingFacility] = useState<{ facilityId: string; ruleId: string; draft: Draft; route: RouteDraft } | null>(null);
  const [criteriaRules, setCriteriaRules] = useState<TumorBoardCriteriaRule[]>([]);
  const [criteriaFormOpen, setCriteriaFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Batch 494: the batching cut-off's own draft/saved pair, same
  // string-while-editing pattern as marginThresholdMm above.
  const [cutoffHours, setCutoffHours] = useState(DEFAULT_TUMOR_BOARD_BATCH_SETTINGS.cutoffHours);
  const [cutoffDraft, setCutoffDraft] = useState(String(DEFAULT_TUMOR_BOARD_BATCH_SETTINGS.cutoffHours));

  const anyDirty = rules.some(r => drafts[r.id] && isDraftDirty(drafts[r.id], r));
  const cutoffDirty = cutoffDraft !== String(cutoffHours);
  useReportConfigDirty(anyDirty || cutoffDirty || addingFacility !== null || criteriaFormOpen);

  const refresh = async () => {
    const [r, f, o, c, cr] = await Promise.all([
      tumorBoardRuleService.getAll(), facilityService.getAll(), facilityTumorBoardRuleOverrideService.getAll(), tumorBoardBatchSettingsService.get(), tumorBoardCriteriaRuleService.getAll(),
    ]);
    if (cr.ok) setCriteriaRules(cr.data);
    if (r.ok) { setRules(r.data); setDrafts(Object.fromEntries(r.data.map(rule => [rule.id, draftOf(rule)]))); }
    if (f.ok) setFacilities(f.data);
    if (o.ok) setOverrides(o.data);
    if (c.ok) { setCutoffHours(c.data.cutoffHours); setCutoffDraft(String(c.data.cutoffHours)); }
  };
  useEffect(() => { void refresh(); }, []);

  const showResult = async (res: { ok: boolean; error?: string }) => {
    setError(res.ok ? null : t(`tumorBoardRulesSection.errors.${res.error}`, { defaultValue: t('tumorBoardRulesSection.errors.saveFailed') }));
    if (res.ok) await refresh();
    return res.ok;
  };

  const saveRule = async (rule: TumorBoardAutoFlagRule) => {
    const draft = drafts[rule.id];
    const marginThresholdMm = Number(draft.marginThresholdMm);
    if (!Number.isFinite(marginThresholdMm) || marginThresholdMm <= 0) {
      setError(t('tumorBoardRulesSection.errors.marginThresholdMmInvalid'));
      return;
    }
    await showResult(await tumorBoardRuleService.update(rule.id, { marginThresholdMm, active: draft.active }));
  };

  const isCriteriaRuleId = (id: string) => criteriaRules.some(r => r.id === id);

  const saveFacilityOverride = async () => {
    if (!addingFacility) return;
    const forCriteria = isCriteriaRuleId(addingFacility.ruleId);
    const marginThresholdMm = Number(addingFacility.draft.marginThresholdMm);
    if (!addingFacility.facilityId || (!forCriteria && (!Number.isFinite(marginThresholdMm) || marginThresholdMm <= 0))) {
      setError(t('tumorBoardRulesSection.errors.marginThresholdMmInvalid'));
      return;
    }
    const changes = {
      ...(forCriteria ? {} : { marginThresholdMm }),
      active: addingFacility.draft.active,
      ...(addingFacility.route ? { board: addingFacility.route } : {}),
    };
    if (await showResult(await facilityTumorBoardRuleOverrideService.set(addingFacility.facilityId, addingFacility.ruleId, changes))) {
      setAddingFacility(null);
    }
  };

  const saveCutoff = async () => {
    const cutoffHoursValue = Number(cutoffDraft);
    if (!Number.isFinite(cutoffHoursValue) || cutoffHoursValue < 0) {
      setError(t('tumorBoardRulesSection.errors.cutoffHoursInvalid'));
      return;
    }
    await showResult(await tumorBoardBatchSettingsService.update({ cutoffHours: cutoffHoursValue }));
  };

  const facilityName = (id: string) => facilities.find(f => f.id === id)?.name ?? id;
  const ruleLabel = (id: string) => rules.find(r => r.id === id)?.label ?? criteriaRules.find(r => r.id === id)?.label ?? id;
  const boardOf = (id: string) => rules.find(r => r.id === id)?.board ?? criteriaRules.find(r => r.id === id)?.board ?? id;

  return (
    <div className="ps-conf-page">
      <h2 className="ps-conf-section-title">{t('tumorBoardRulesSection.title')}</h2>
      <p className="ps-conf-section-subtitle ps-conf-section-subtitle--spaced">{t('tumorBoardRulesSection.subtitle')}</p>
      {error && <p className="ps-field-still-required" role="alert">{error}</p>}

      <div className="ps-conf-card ps-conf-card--spaced">
        <div className="ps-conf-card-title">{t('tumorBoardRulesSection.enterpriseTitle')}</div>
        {rules.map(rule => {
          const draft = drafts[rule.id] ?? draftOf(rule);
          const dirty = isDraftDirty(draft, rule);
          return (
            <div key={rule.id} className="ps-conf-row">
              <span className="ps-conf-value">{t(`tumorBoard.boards.${rule.board}`)} — {rule.label}</span>
              <div className="ps-conf-row-actions">
                <label className="ps-conf-label" htmlFor={`tbr-threshold-${rule.id}`}>{t('tumorBoardRulesSection.thresholdLabel')}</label>
                <input
                  id={`tbr-threshold-${rule.id}`}
                  className="ps-conf-input ps-corr-days"
                  inputMode="decimal"
                  value={draft.marginThresholdMm}
                  onChange={e => setDrafts({ ...drafts, [rule.id]: { ...draft, marginThresholdMm: e.target.value } })}
                />
                <label className="ps-conf-label" htmlFor={`tbr-active-${rule.id}`}>{t('tumorBoardRulesSection.activeLabel')}</label>
                <input
                  id={`tbr-active-${rule.id}`}
                  type="checkbox"
                  checked={draft.active}
                  onChange={e => setDrafts({ ...drafts, [rule.id]: { ...draft, active: e.target.checked } })}
                />
                <button className="ps-conf-btn-primary" disabled={!dirty} onClick={() => void saveRule(rule)}>{t('common.save')}</button>
              </div>
            </div>
          );
        })}
      </div>

      <TumorBoardCriteriaRulesCard rules={criteriaRules} onChanged={refresh} onError={setError} onDirtyChange={setCriteriaFormOpen} />

      <div className="ps-conf-card ps-conf-card--spaced">
        <div className="ps-conf-card-title">{t('tumorBoardRulesSection.batchCutoffTitle')}</div>
        <p className="ps-conf-section-subtitle">{t('tumorBoardRulesSection.batchCutoffSubtitle')}</p>
        <div className="ps-conf-row">
          <label className="ps-conf-label" htmlFor="tbr-cutoff-hours">{t('tumorBoardRulesSection.cutoffHoursLabel')}</label>
          <div className="ps-conf-row-actions">
            <input
              id="tbr-cutoff-hours"
              className="ps-conf-input ps-corr-days"
              inputMode="numeric"
              value={cutoffDraft}
              onChange={e => setCutoffDraft(e.target.value)}
            />
            <button className="ps-conf-btn-primary" disabled={!cutoffDirty} onClick={() => void saveCutoff()}>{t('common.save')}</button>
          </div>
        </div>
      </div>

      <div className="ps-conf-card ps-conf-card--spaced">
        <div className="ps-conf-row">
          <div className="ps-conf-card-title">{t('tumorBoardRulesSection.facilityTitle')}</div>
          {!addingFacility && rules.length > 0 && (
            <button className="ps-conf-btn-secondary" onClick={() => setAddingFacility({ facilityId: facilities[0]?.id ?? '', ruleId: rules[0].id, draft: draftOf(rules[0]), route: '' })}>
              {t('tumorBoardRulesSection.addOverride')}
            </button>
          )}
        </div>
        {overrides.map(o => (
          <div key={o.id} className="ps-conf-row">
            <span className="ps-conf-value">{facilityName(o.facilityId)} — {t(`tumorBoard.boards.${boardOf(o.ruleId)}`)} ({ruleLabel(o.ruleId)})</span>
            <div className="ps-conf-row-actions">
              <span className="ps-conf-value">
                {o.marginThresholdMm !== undefined ? t('tumorBoardRulesSection.ruleSummary', { mm: o.marginThresholdMm }) : ''}
                {o.board ? ` ${t('tumorBoardRulesSection.routedTo', { board: t(`tumorBoard.boards.${o.board}`) })}` : ''}
                {o.active === false ? ` (${t('tumorBoardRulesSection.disabled')})` : ''}
              </span>
              <button className="ps-conf-btn-secondary" onClick={async () => { await showResult(await facilityTumorBoardRuleOverrideService.remove(o.facilityId, o.ruleId)); }}>{t('common.remove')}</button>
            </div>
          </div>
        ))}
        {overrides.length === 0 && !addingFacility && <div className="ps-conf-empty-row">{t('tumorBoardRulesSection.facilityEmpty')}</div>}
        {addingFacility && (
          <div className="ps-conf-row">
            <select className="ps-conf-select" aria-label={t('tumorBoardRulesSection.facilityTitle')} value={addingFacility.facilityId} onChange={e => setAddingFacility({ ...addingFacility, facilityId: e.target.value })}>
              {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <select
              className="ps-conf-select"
              aria-label={t('tumorBoardRulesSection.enterpriseTitle')}
              value={addingFacility.ruleId}
              onChange={e => {
                const rule = rules.find(r => r.id === e.target.value);
                setAddingFacility({ ...addingFacility, ruleId: e.target.value, draft: rule ? draftOf(rule) : { ...addingFacility.draft, marginThresholdMm: '' } });
              }}
            >
              {rules.map(r => <option key={r.id} value={r.id}>{t(`tumorBoard.boards.${r.board}`)}</option>)}
              {criteriaRules.map(r => <option key={r.id} value={r.id}>{t(`tumorBoard.boards.${r.board}`)} — {r.label}</option>)}
            </select>
            <label className="ps-conf-label" htmlFor="tbr-facility-route">{t('tumorBoardRulesSection.routeLabel')}</label>
            <select
              id="tbr-facility-route"
              className="ps-conf-select"
              value={addingFacility.route}
              onChange={e => setAddingFacility({ ...addingFacility, route: e.target.value as RouteDraft })}
            >
              <option value="">{t('tumorBoardRulesSection.routeDefault')}</option>
              {TUMOR_BOARD_NAMES.map(b => <option key={b} value={b}>{t(`tumorBoard.boards.${b}`)}</option>)}
            </select>
            {!isCriteriaRuleId(addingFacility.ruleId) && (
              <>
                <label className="ps-conf-label" htmlFor="tbr-facility-threshold">{t('tumorBoardRulesSection.thresholdLabel')}</label>
                <input
                  id="tbr-facility-threshold"
                  className="ps-conf-input ps-corr-days"
                  inputMode="decimal"
                  value={addingFacility.draft.marginThresholdMm}
                  onChange={e => setAddingFacility({ ...addingFacility, draft: { ...addingFacility.draft, marginThresholdMm: e.target.value } })}
                />
              </>
            )}
            <label className="ps-conf-label" htmlFor="tbr-facility-active">{t('tumorBoardRulesSection.activeLabel')}</label>
            <input
              id="tbr-facility-active"
              type="checkbox"
              checked={addingFacility.draft.active}
              onChange={e => setAddingFacility({ ...addingFacility, draft: { ...addingFacility.draft, active: e.target.checked } })}
            />
            <div className="ps-conf-row-actions">
              <button className="ps-conf-btn-primary" onClick={() => void saveFacilityOverride()}>{t('common.save')}</button>
              <button className="ps-conf-btn-secondary" onClick={() => setAddingFacility(null)}>{t('common.cancel')}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TumorBoardRulesSection;
