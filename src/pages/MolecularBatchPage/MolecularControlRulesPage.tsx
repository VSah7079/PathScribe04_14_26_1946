// src/pages/MolecularBatchPage/MolecularControlRulesPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real, per the given specification's own §3.2 "Dynamic Control
// Rules"/"Position Enforcements" — the real, missing admin UI this
// module's own validation (resolveMolecularControlRequirementValidation.ts)
// and service (mockMolecularAssayControlRuleService.ts) needed: a real
// place for an admin to actually define which controls a given assay
// requires, and whether each one is fixed to a specific real well or
// allowed anywhere (per the spec's own "prevent cross-contamination
// patterns" reasoning for the random-position case).
//
// Batch 406:
//   - Adding, changing and deleting a rule needs
//     config:molecular-control-rules:manage (Pete: "default to admin but it
//     remains an assignable permission"). The buttons are greyed without it;
//     the service checks again.
//   - Deleting asks first.
//   - A rule can name the deck slots its assay's sample rack may go in (Pete:
//     "Sample Rack 1 must be in Slot A1 or Slot A2"); Rack Loading offers
//     only those.
//   - Services from @/services (off the deployment baseline); checks moved to
//     services/molecular/controlRuleDraft.ts; refusals translated; control
//     types shown by name.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { useNavigate } from 'react-router';
import '../../pathscribe.css';
import {
  molecularAssayControlRuleService, stainTypeService, equipmentService, molecularAssayTypes,
  controlRuleDraftProblem, sampleRackSlotChoices, withControlPatch,
  type Equipment, type MolecularAssayControlRule, type MolecularRequiredControl,
} from '@/services';
import type { StainType } from '@/services/stains/IStainService';
import type { MolecularSampleType } from '@/services/molecular/IMolecularBatchService';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { formatList } from '@/utils/formatList';
import { LoadingState } from '@/components/Common/LoadingState';

const MANAGE = 'config:molecular-control-rules:manage';

// Real, per this file's own header — a rule's own required controls
// are real controls/calibrators, never a real patient specimen.
const CONTROL_TYPES_FOR_RULES: MolecularSampleType[] = ['CONTROL_NTC', 'CONTROL_PTC_HIGH', 'CONTROL_PTC_LOW', 'CALIBRATOR'];

const emptyRequiredControl = (): MolecularRequiredControl => ({ sampleType: 'CONTROL_NTC', positionMode: 'fixed', fixedWellPosition: 'A01' });

const MolecularControlRulesPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  // Batch 495: this page never registered a breadcrumb (same gap fixed on
  // TumorBoardWorkspacePage/MarginExceptionReviewPage in Batch 492) — AppShell
  // only shows the breadcrumb bar once crumbs.length > 1.
  const { pushCrumb } = useBreadcrumb();
  useEffect(() => { pushCrumb(t('molecularControlRulesPage.title'), '/molecular-control-rules'); }, [pushCrumb, t]);
  const navigate = useNavigate();
  const [rules, setRules] = useState<MolecularAssayControlRule[]>([]);
  // Real, per direct follow-up ("wouldn't we use the existing process
  // catalog to define the assays?") — the real, existing Diagnostic
  // Catalog's own Molecular-category entries, fetched fresh.
  const [assays, setAssays] = useState<StainType[]>([]);
  const [instruments, setInstruments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [draftAssayCode, setDraftAssayCode] = useState('');
  const [draftControls, setDraftControls] = useState<MolecularRequiredControl[]>([emptyRequiredControl()]);
  const [draftSlots, setDraftSlots] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<MolecularAssayControlRule | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const load = () => {
    molecularAssayControlRuleService.getAll().then(res => {
      if (res.ok) setRules(res.data);
      setLoading(false);
    });
    stainTypeService.getAll().then(res => { if (res.ok) setAssays(molecularAssayTypes(res.data)); });
    equipmentService.getActive('analyser').then(res => { if (res.ok) setInstruments(res.data); });
  };
  useEffect(load, []);

  const assayName = (code: string) => assays.find(a => a.id === code)?.name ?? code;
  const errorText = (code: string) => t(`molecularControlRulesPage.errors.${code}`, { defaultValue: t('molecularControlRulesPage.genericSaveError') });
  const slotChoices = sampleRackSlotChoices(instruments, draftSlots);

  const startNew = () => {
    setEditingId('new');
    setDraftAssayCode('');
    setDraftControls([emptyRequiredControl()]);
    setDraftSlots([]);
    setSaveError(null);
  };

  const startEdit = (rule: MolecularAssayControlRule) => {
    setEditingId(rule.id);
    setDraftAssayCode(rule.assayCode);
    setDraftControls(rule.requiredControls.map(c => ({ ...c })));
    setDraftSlots([...(rule.allowedSampleRackSlotIds ?? [])]);
    setSaveError(null);
  };

  const handleSave = async () => {
    setSaveError(null);
    const payload = { assayCode: draftAssayCode.trim(), requiredControls: draftControls, allowedSampleRackSlotIds: draftSlots };
    const problem = controlRuleDraftProblem(payload);
    if (problem) {
      setSaveError(problem.code === 'assayRequired'
        ? t('molecularControlRulesPage.assayCodeRequired')
        : t('molecularControlRulesPage.fixedPositionMissingWell', { sampleType: t(`molecularPlateBuilderPage.sampleType.${problem.sampleType}`) }));
      return;
    }
    setSaving(true);
    try {
      const res = editingId === 'new'
        ? await molecularAssayControlRuleService.create(payload)
        : await molecularAssayControlRuleService.update(editingId!, payload);
      if (!res.ok) { setSaveError(errorText('error' in res ? res.error : 'generic')); return; }
      setEditingId(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const res = await molecularAssayControlRuleService.delete(confirmDelete.id);
    setConfirmDelete(null);
    setListError(res.ok ? null : errorText('error' in res ? res.error : 'generic'));
    load();
  };

  const updateDraftControl = (index: number, patch: Partial<MolecularRequiredControl>) => {
    setDraftControls(prev => prev.map((c, i) => (i === index ? withControlPatch(c, patch) : c)));
  };
  const toggleSlot = (id: string) => setDraftSlots(prev => (prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]));

  return (
    <div className="ps-app-root ps-page-container ps-page-container--narrow">
      <button className="ps-btn-small ps-back-btn" onClick={() => navigate('/molecular')}>{t('molecularControlRulesPage.backToBatches')}</button>
      <div className="ps-page-header-row">
        <div>
          <h1 className="ps-page-title">{t('molecularControlRulesPage.title')}</h1>
          <p className="ps-page-subtitle">
            {t('molecularControlRulesPage.subtitle')}
          </p>
        </div>
        {editingId === null && <CapabilityButton capability={MANAGE} className="ps-conf-btn-secondary" onClick={startNew}>{t('molecularControlRulesPage.newRule')}</CapabilityButton>}
      </div>

      {loading && <LoadingState label={t('molecularControlRulesPage.loading')} />}
      {listError && <div className="ps-error-text" role="alert">{listError}</div>}

      {confirmDelete && (
        <div className="ps-panel-box ps-mb-16" role="alertdialog" aria-labelledby="rule-delete-title">
          <h3 id="rule-delete-title" className="ps-panel-title">{t('molecularControlRulesPage.deleteConfirmTitle')}</h3>
          <p className="ps-helper-text">{t('molecularControlRulesPage.deleteConfirmText', { assay: assayName(confirmDelete.assayCode) })}</p>
          <div className="ps-flex-row-gap-8">
            <CapabilityButton capability={MANAGE} className="ps-conf-btn-secondary" onClick={() => void handleDelete()}>{t('molecularControlRulesPage.delete')}</CapabilityButton>
            <button className="ps-btn-small" onClick={() => setConfirmDelete(null)}>{t('molecularControlRulesPage.cancel')}</button>
          </div>
        </div>
      )}

      {!loading && editingId === null && (
        <div className="ps-conf-table-wrap">
          <div className="ps-conf-table-scroll">
            <table className="ps-conf-table">
              <thead className="ps-conf-thead-sticky">
                <tr>
                  <th className="ps-conf-th">{t('molecularControlRulesPage.colAssayCode')}</th>
                  <th className="ps-conf-th">{t('molecularControlRulesPage.colRequiredControls')}</th>
                  <th className="ps-conf-th">{t('molecularControlRulesPage.colRackSlots')}</th>
                  <th className="ps-conf-th">{t('molecularControlRulesPage.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {rules.length === 0 && (<tr><td className="ps-conf-empty-row" colSpan={4}>{t('molecularControlRulesPage.emptyRules')}</td></tr>)}
                {rules.map(rule => (
                  <tr key={rule.id} className="ps-conf-tr">
                    <td className="ps-conf-td">{assayName(rule.assayCode)}</td>
                    <td className="ps-conf-td">
                      {rule.requiredControls.map((c, i) => (
                        <div key={i}>{t('molecularControlRulesPage.controlLine', {
                          sampleType: t(`molecularPlateBuilderPage.sampleType.${c.sampleType}`),
                          position: c.positionMode === 'fixed' ? t('molecularControlRulesPage.fixedAt', { position: c.fixedWellPosition }) : t('molecularControlRulesPage.randomPosition'),
                        })}</div>
                      ))}
                    </td>
                    <td className="ps-conf-td">
                      {rule.allowedSampleRackSlotIds?.length ? formatList(rule.allowedSampleRackSlotIds, i18n.language) : t('molecularControlRulesPage.anySampleRackSlot')}
                    </td>
                    <td className="ps-conf-td">
                      <CapabilityButton capability={MANAGE} className="ps-btn-small ps-mr-8" onClick={() => startEdit(rule)}>{t('molecularControlRulesPage.edit')}</CapabilityButton>
                      <CapabilityButton capability={MANAGE} className="ps-btn-small" onClick={() => setConfirmDelete(rule)}>{t('molecularControlRulesPage.delete')}</CapabilityButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editingId !== null && (
        <div className="ps-panel-box">
          <h3 className="ps-panel-title">{editingId === 'new' ? t('molecularControlRulesPage.newRuleTitle') : t('molecularControlRulesPage.editRuleTitle')}</h3>
          <label className="ps-label" htmlFor="rule-assay-code">{t('molecularControlRulesPage.assayLabel')}<span className="ps-conf-required"> *</span></label>
          <select id="rule-assay-code" className="ps-input-dark ps-w-full ps-mb-16" value={draftAssayCode} onChange={e => setDraftAssayCode(e.target.value)}>
            <option value="">{t('molecularControlRulesPage.selectAssayOption')}</option>
            {assays.map(at => <option key={at.id} value={at.id}>{at.name}</option>)}
          </select>

          <label className="ps-label">{t('molecularControlRulesPage.colRequiredControls')}</label>
          {draftControls.map((c, i) => (
            <div key={i} className="ps-control-row">
              <select className="ps-input-dark" aria-label={t('molecularPlateBuilderPage.sampleTypeLabel')} value={c.sampleType} onChange={e => updateDraftControl(i, { sampleType: e.target.value as MolecularSampleType })}>
                {CONTROL_TYPES_FOR_RULES.map(ct => <option key={ct} value={ct}>{t(`molecularPlateBuilderPage.sampleType.${ct}`)}</option>)}
              </select>
              <select className="ps-input-dark" aria-label={t('molecularControlRulesPage.positionModeLabel')} value={c.positionMode} onChange={e => updateDraftControl(i, { positionMode: e.target.value as 'fixed' | 'random' })}>
                <option value="fixed">{t('molecularControlRulesPage.fixedPositionOption')}</option>
                <option value="random">{t('molecularControlRulesPage.randomPositionOption')}</option>
              </select>
              {c.positionMode === 'fixed' && (
                <input className="ps-input-dark ps-input-well-position" aria-label={t('molecularControlRulesPage.wellLabel')} value={c.fixedWellPosition ?? ''} onChange={e => updateDraftControl(i, { fixedWellPosition: e.target.value })} placeholder={t('molecularControlRulesPage.wellPlaceholder')} />
              )}
              <button className="ps-btn-small" onClick={() => setDraftControls(prev => prev.filter((_, idx) => idx !== i))}>{t('molecularControlRulesPage.removeButton')}</button>
            </div>
          ))}
          <button className="ps-btn-small ps-mb-16" onClick={() => setDraftControls(prev => [...prev, emptyRequiredControl()])}>{t('molecularControlRulesPage.addRequiredControl')}</button>

          <fieldset className="ps-rule-slots ps-mb-16">
            <legend className="ps-label">{t('molecularControlRulesPage.rackSlotsLabel')}</legend>
            <p className="mb-field-hint">{t('molecularControlRulesPage.rackSlotsHint')}</p>
            {slotChoices.length === 0 && <p className="mb-field-hint">{t('molecularControlRulesPage.noDeckSlots')}</p>}
            <div className="ps-rule-slot-list">
              {slotChoices.map(id => (
                <label key={id} className="ps-rule-slot">
                  <input type="checkbox" checked={draftSlots.includes(id)} onChange={() => toggleSlot(id)} /> {id}
                </label>
              ))}
            </div>
          </fieldset>

          {saveError && <div className="ps-error-text" role="alert">{saveError}</div>}
          <div className="ps-flex-row-gap-8">
            <CapabilityButton capability={MANAGE} className="ps-conf-btn-secondary" disabled={saving} onClick={() => void handleSave()}>{saving ? t('molecularControlRulesPage.saving') : t('molecularControlRulesPage.saveRule')}</CapabilityButton>
            <button className="ps-btn-small" onClick={() => setEditingId(null)}>{t('molecularControlRulesPage.cancel')}</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MolecularControlRulesPage;
