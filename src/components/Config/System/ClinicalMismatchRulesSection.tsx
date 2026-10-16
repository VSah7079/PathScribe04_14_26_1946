// src/components/Config/System/ClinicalMismatchRulesSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 529 (PS-554): Configuration → System → Clinical Mismatch Rules. One row
// per kind of mismatch for all specimen types, plus optional rows for one
// specimen type. Each row: the display threshold, the action threshold and the
// action (Block / Warn / Log). A threshold saves when the field is left (or on
// Enter), an action as soon as it is chosen; each change is audited by the
// service.
//
// Reading needs config:clinical-mismatch-rules:view, changing needs
// config:clinical-mismatch-rules:manage (no built-in role); both are checked
// by clinicalMismatchRuleService. Someone who can read but not change sees the
// section view only (ConfigSectionGate). How the rules are applied is in
// services/clinical/clinicalMismatchRules.ts and docs/product/CLINICAL_MISMATCH_CHECK.md.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  clinicalMismatchRuleService, specimenDictionaryService, newSpecimenRule,
  CLINICAL_MISMATCH_CATEGORIES, CLINICAL_MISMATCH_ACTION_TYPES,
  type ClinicalMismatchRule, type ClinicalMismatchActionType,
} from '@/services';
import type { ClinicalMismatchKind } from '@/services/clinical/detectClinicalPathologicMismatch';
import '@/pathscribe.css';

const K = 'clinicalMismatchRulesSection';

const ClinicalMismatchRulesSection: React.FC = () => {
  const { t } = useTranslation();
  const [rules, setRules] = useState<ClinicalMismatchRule[] | null>(null);
  const [refused, setRefused] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, { min: string; action: string }>>({});
  const [problems, setProblems] = useState<Record<string, string>>({});
  const [specimens, setSpecimens] = useState<{ id: string; name: string }[]>([]);
  const [newKind, setNewKind] = useState<ClinicalMismatchKind>('unexpected-malignancy');
  const [newSpecimen, setNewSpecimen] = useState('');
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    const res = await clinicalMismatchRuleService.list();
    if (res.ok) setRules(res.data); else setRefused(true);
  }, []);
  useEffect(() => {
    void load();
    specimenDictionaryService.getAll()
      .then(r => { if (r.ok) setSpecimens(r.data.filter(e => e.active).map(e => ({ id: e.id, name: e.name }))); })
      .catch(() => {});
  }, [load]);

  const done = (ruleId: string, res: { ok: boolean; data?: ClinicalMismatchRule[]; error?: string }) => {
    if (res.ok && res.data) {
      setRules(res.data);
      setDrafts(d => { const { [ruleId]: _gone, ...rest } = d; return rest; });
      setProblems(p => { const { [ruleId]: _gone, ...rest } = p; return rest; });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } else if (res.error) {
      setProblems(p => ({ ...p, [ruleId]: res.error! }));
    }
  };

  const save = async (rule: ClinicalMismatchRule) => done(rule.id, await clinicalMismatchRuleService.save(rule));

  const commitThresholds = (rule: ClinicalMismatchRule) => {
    const d = drafts[rule.id];
    if (!d) return;
    const min = Number(d.min);
    const action = d.action.trim() === '' ? null : Number(d.action);
    void save({ ...rule, minimumDisplayThreshold: min, actionThreshold: action });
  };

  if (refused) {
    return (
      <div>
        <div className="ps-rbuf-header">
          <h2 className="ps-rbuf-title">{t(`${K}.title`)}</h2>
        </div>
        <p className="ps-conf-field-hint" role="status">{t(`${K}.notPermitted`)}</p>
      </div>
    );
  }
  if (!rules) return null;

  const specimenName = (id: string | null) => (id === null ? t(`${K}.allSpecimenTypes`) : specimens.find(s => s.id === id)?.name ?? id);
  const draft = (r: ClinicalMismatchRule) => drafts[r.id] ?? { min: String(r.minimumDisplayThreshold), action: r.actionThreshold === null ? '' : String(r.actionThreshold) };
  const setDraft = (r: ClinicalMismatchRule, patch: Partial<{ min: string; action: string }>) =>
    setDrafts(d => ({ ...d, [r.id]: { ...draft(r), ...patch } }));
  const onEnter = (r: ClinicalMismatchRule) => (e: React.KeyboardEvent) => { if (e.key === 'Enter') commitThresholds(r); };
  const exists = rules.some(r => r.category === newKind && r.specimenTypeId === newSpecimen);

  return (
    <div>
      <div className="ps-rbuf-header">
        <h2 className="ps-rbuf-title">{t(`${K}.title`)}</h2>
        <p className="ps-rbuf-subtitle">{t(`${K}.subtitle`)}</p>
      </div>

      <div className="ps-conf-card ps-conf-card--spaced">
        <p className="ps-conf-card-description--tight">{t(`${K}.howItWorks`)}</p>
        <div className="ps-conf-table-wrap">
          <table className="ps-conf-table">
            <thead>
              <tr>
                <th className="ps-conf-th">{t(`${K}.columns.kind`)}</th>
                <th className="ps-conf-th">{t(`${K}.columns.specimenType`)}</th>
                <th className="ps-conf-th">{t(`${K}.columns.display`)}</th>
                <th className="ps-conf-th">{t(`${K}.columns.actionAt`)}</th>
                <th className="ps-conf-th">{t(`${K}.columns.action`)}</th>
                <th className="ps-conf-th"><span className="ps-sr-only">{t(`${K}.columns.remove`)}</span></th>
              </tr>
            </thead>
            <tbody>
              {rules.map(rule => {
                const d = draft(rule);
                const kind = t(`clinicalMismatch.kinds.${rule.category}`);
                const where = specimenName(rule.specimenTypeId);
                return (
                  <React.Fragment key={rule.id}>
                    <tr className="ps-conf-tr">
                      <td className="ps-conf-td">{kind}</td>
                      <td className="ps-conf-td">{where}</td>
                      <td className="ps-conf-td">
                        <input type="number" min={0} max={100} step={1} className="ps-conf-input ps-mmrules-percent"
                          aria-label={t(`${K}.displayAria`, { kind, specimen: where })}
                          value={d.min} onChange={e => setDraft(rule, { min: e.target.value })}
                          onBlur={() => commitThresholds(rule)} onKeyDown={onEnter(rule)} />
                        <span className="ps-mmrules-unit">{t(`${K}.percent`)}</span>
                      </td>
                      <td className="ps-conf-td">
                        <input type="number" min={0} max={100} step={1} className="ps-conf-input ps-mmrules-percent"
                          aria-label={t(`${K}.actionAtAria`, { kind, specimen: where })}
                          placeholder={t(`${K}.fromDisplay`)}
                          value={d.action} onChange={e => setDraft(rule, { action: e.target.value })}
                          onBlur={() => commitThresholds(rule)} onKeyDown={onEnter(rule)} />
                        <span className="ps-mmrules-unit">{t(`${K}.percent`)}</span>
                      </td>
                      <td className="ps-conf-td">
                        <select className="ps-conf-select" aria-label={t(`${K}.actionAria`, { kind, specimen: where })}
                          value={rule.actionType}
                          onChange={e => { void save({ ...rule, actionType: e.target.value as ClinicalMismatchActionType }); }}>
                          {CLINICAL_MISMATCH_ACTION_TYPES.map(a => <option key={a} value={a}>{t(`${K}.actions.${a}`)}</option>)}
                        </select>
                      </td>
                      <td className="ps-conf-td">
                        {rule.specimenTypeId !== null && (
                          <button type="button" className="ps-conf-btn-secondary"
                            aria-label={t(`${K}.removeAria`, { kind, specimen: where })}
                            onClick={async () => done(rule.id, await clinicalMismatchRuleService.remove(rule.id))}>
                            {t(`${K}.remove`)}
                          </button>
                        )}
                      </td>
                    </tr>
                    {problems[rule.id] && (
                      <tr className="ps-conf-tr">
                        <td className="ps-conf-td ps-mmrules-problem" colSpan={6} role="alert">{t(`${K}.problems.${problems[rule.id]}`)}</td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="ps-conf-card ps-conf-card--spaced">
        <div className="ps-conf-card-title">{t(`${K}.add.title`)}</div>
        <p className="ps-conf-card-description--tight">{t(`${K}.add.description`)}</p>
        <div className="ps-mmrules-add">
          <select className="ps-conf-select" aria-label={t(`${K}.columns.kind`)} value={newKind}
            onChange={e => setNewKind(e.target.value as ClinicalMismatchKind)}>
            {CLINICAL_MISMATCH_CATEGORIES.map(c => <option key={c} value={c}>{t(`clinicalMismatch.kinds.${c}`)}</option>)}
          </select>
          <select className="ps-conf-select" aria-label={t(`${K}.columns.specimenType`)} value={newSpecimen}
            onChange={e => setNewSpecimen(e.target.value)}>
            <option value="">{t(`${K}.add.chooseSpecimen`)}</option>
            {specimens.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button type="button" className="ps-conf-btn-primary" disabled={!newSpecimen || exists}
            onClick={() => { void save(newSpecimenRule(newKind, newSpecimen, rules)); setNewSpecimen(''); }}>
            {t(`${K}.add.button`)}
          </button>
        </div>
        {exists && <p className="ps-conf-field-hint">{t(`${K}.add.exists`)}</p>}
      </div>

      {saved && <div className="ps-concordance__saved">✓ {t(`${K}.saved`)}</div>}
    </div>
  );
};

export default ClinicalMismatchRulesSection;
