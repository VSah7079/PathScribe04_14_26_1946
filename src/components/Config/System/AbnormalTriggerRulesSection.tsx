// src/components/Config/System/AbnormalTriggerRulesSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// PS-129 (part of PS-105, Core Abnormal Detection Engine). Admin config
// for the AbnormalTriggerRule dictionary — same overall structure/CSS
// classes (ps-defic-*, ps-ms-*) as DeficienciesSection.tsx's own
// TypeDictionaryTab, since this is the same real pattern (an admin-
// curated, Global/scoped dictionary), just with rule-specific fields
// (fieldLabel, triggerValues, severity) rather than that component's
// generic name/level shape — not a direct reuse of that component,
// since the fields genuinely differ.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import '../../../pathscribe.css';
import { abnormalTriggerRuleService } from '../../../services';
import { useSystemConfig } from '../../../contexts/SystemConfigContext';
import type { Facility } from '../../../services/facilities/IFacilityService';
import type { AbnormalTriggerRule, AbnormalSeverity } from '../../../services/abnormalDetection/IAbnormalTriggerRuleService';
import { getActivePerformingLabs } from '../../../utils/performingLabs';
import { saveAbnormalTriggerRule, toggleAbnormalTriggerRule } from '../../../services/abnormalDetection/abnormalTriggerRuleEditing';
import { duplicateAbnormalTriggerRule } from '@/services/duplication/duplicateEntities';
import { LoadingState } from '@/components/Common/LoadingState';
import { EMPTY_RULE_CODING_DRAFT, ruleCodingDraftOf, type RuleCodingDraft } from '@/services/terminologyLicence/terminologyLicence';

const SEVERITIES: AbnormalSeverity[] = ['Abnormal', 'Critical', 'Malignant'];

const SEVERITY_LABEL_KEY: Record<AbnormalSeverity, string> = {
  Abnormal: 'abnormalTriggerRulesSection.severityLabels.abnormal',
  Critical: 'abnormalTriggerRulesSection.severityLabels.critical',
  Malignant: 'abnormalTriggerRulesSection.severityLabels.malignant',
};

const AbnormalTriggerRulesSection: React.FC = () => {
  const { t } = useTranslation();
  const { enterpriseConfig, updateEnterpriseConfig } = useSystemConfig();
  const enterpriseEnabled = enterpriseConfig.features.abnormalDetectionEnabled;
  const [items, setItems] = useState<AbnormalTriggerRule[]>([]);
  const [labs, setLabs] = useState<Facility[]>([]);
  const [labFilter, setLabFilter] = useState<'All' | 'Global' | string>('All');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; item?: AbnormalTriggerRule } | null>(null);
  const [draft, setDraft] = useState<{ fieldLabel: string; triggerValues: string; severity: AbnormalSeverity; description: string; active: boolean; performingLabFacilityId: string; coding: RuleCodingDraft }>({
    fieldLabel: '', triggerValues: '', severity: 'Abnormal', description: '', active: true, performingLabFacilityId: '', coding: EMPTY_RULE_CODING_DRAFT,
  });
  const setCoding = (patch: Partial<RuleCodingDraft>) => setDraft(d => ({ ...d, coding: { ...d.coding, ...patch } }));
  const [fieldError, setFieldError] = useState('');

  const load = () => { abnormalTriggerRuleService.getAll().then(res => { if (res.ok) setItems(res.data); setLoading(false); }); };
  useEffect(load, []);
  useEffect(() => { getActivePerformingLabs().then(setLabs); }, []);

  // Pre-fill whenever the modal carries a rule: Edit, or Duplicate (an Add
  // pre-filled from a copy). Keying this off mode === 'edit' left a
  // duplicate's form blank.
  useEffect(() => {
    if (modal?.item) {
      setDraft({
        fieldLabel: modal.item.fieldLabel, triggerValues: modal.item.triggerValues.join(', '),
        severity: modal.item.severity, description: modal.item.description ?? '',
        active: modal.item.status === 'Active', performingLabFacilityId: modal.item.performingLabFacilityId ?? '',
        coding: ruleCodingDraftOf(modal.item.licensedCoding),
      });
    } else if (modal?.mode === 'add') {
      setDraft({ fieldLabel: '', triggerValues: '', severity: 'Abnormal', description: '', active: true, performingLabFacilityId: '', coding: EMPTY_RULE_CODING_DRAFT });
    }
    setFieldError('');
  }, [modal]);

  const labName = (id?: string) => id ? (labs.find(l => l.id === id)?.name ?? id) : t('abnormalTriggerRulesSection.global');

  const filteredItems = items.filter(item =>
    labFilter === 'All' || (labFilter === 'Global' ? !item.performingLabFacilityId : item.performingLabFacilityId === labFilter)
  );

  // Batch 450 (PS-129): validation, scope-aware uniqueness and the write live in
  // services/abnormalDetection/abnormalTriggerRuleEditing.ts.
  const handleSave = async () => {
    const outcome = await saveAbnormalTriggerRule(draft, modal, items, abnormalTriggerRuleService);
    if (outcome.kind === 'invalid') {
      setFieldError(t(`abnormalTriggerRulesSection.errors.${outcome.error}`));
      return;
    }
    if (outcome.kind === 'duplicate') {
      setFieldError(outcome.scope === 'lab'
        ? t('abnormalTriggerRulesSection.errors.duplicateRuleForLab', { label: outcome.label })
        : t('abnormalTriggerRulesSection.errors.duplicateRuleGlobal', { label: outcome.label }));
      return;
    }
    const saved = outcome.rule;
    if (saved) setItems(prev => outcome.mode === 'add' ? [...prev, saved] : prev.map(i => i.id === saved.id ? saved : i));
    setModal(null);
  };

  const handleToggleActive = async (item: AbnormalTriggerRule) => {
    const saved = await toggleAbnormalTriggerRule(item, abnormalTriggerRuleService);
    if (saved) setItems(prev => prev.map(i => i.id === item.id ? saved : i));
  };

  const severityBadgeClass = (s: AbnormalSeverity) => s === 'Malignant' ? 'ps-defic-status-badge--inactive' : s === 'Critical' ? 'ps-defic-status-badge--inactive' : 'ps-defic-status-badge--active';

  if (loading) return <LoadingState label={t('abnormalTriggerRulesSection.loading')} />;

  return (
    <div className="ps-defic-section">
      <h3 className="ps-defic-title">{t('abnormalTriggerRulesSection.title')}</h3>
      <p className="ps-defic-subtitle">{t('abnormalTriggerRulesSection.subtitle')}</p>

      {/* Real, per direct guidance (PS-105): "If the enterprise level
          is disabled then the performing facility level is disabled
          and cannot be overridden." A genuine kill switch — turning
          this off here disables the entire Abnormal Detection
          capability everywhere, for every facility, regardless of any
          facility's own setting (FacilityEditorModal.tsx's own toggle
          becomes non-functional while this is off). */}
      <div className={`ps-defic-enterprise-toggle-box ${enterpriseEnabled ? '' : 'ps-defic-enterprise-toggle-box--disabled'}`}>
        <label className="ps-defic-enterprise-toggle-label">
          <input
            type="checkbox"
            checked={enterpriseEnabled}
            onChange={e => updateEnterpriseConfig({ features: { ...enterpriseConfig.features, abnormalDetectionEnabled: e.target.checked } })}
            className="ps-defic-enterprise-toggle-checkbox"
          />
          <span className="ps-defic-enterprise-toggle-text">{t('abnormalTriggerRulesSection.enterpriseToggle.label')}</span>
        </label>
        <div className={`ps-defic-enterprise-toggle-hint ${enterpriseEnabled ? '' : 'ps-defic-enterprise-toggle-hint--disabled'}`}>
          {enterpriseEnabled
            ? t('abnormalTriggerRulesSection.enterpriseToggle.enabledHint')
            : t('abnormalTriggerRulesSection.enterpriseToggle.disabledHint')}
        </div>
      </div>

      <div className="ps-defic-tab-header">
        <p className="ps-defic-tab-desc">{t('abnormalTriggerRulesSection.tabDesc')}</p>
        <button className="ps-conf-btn-primary" onClick={() => setModal({ mode: 'add' })}>{t('abnormalTriggerRulesSection.addButton')}</button>
      </div>

      {labs.length > 0 && (
        <div className="ps-conf-form-row">
          <select aria-label={t('a11y.filters.lab')} data-dirty-ignore data-config-nav value={labFilter} onChange={e => setLabFilter(e.target.value)} className="ps-conf-select">
            <option value="All">{t('abnormalTriggerRulesSection.labFilter.all')}</option>
            <option value="Global">{t('abnormalTriggerRulesSection.labFilter.globalOnly')}</option>
            {labs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
      )}

      <div className="ps-defic-table-wrap">
        <table className="ps-defic-table">
          <thead>
            <tr>
              <th>{t('abnormalTriggerRulesSection.table.headers.fieldLabel')}</th>
              <th>{t('abnormalTriggerRulesSection.table.headers.triggerValues')}</th>
              <th>{t('abnormalTriggerRulesSection.table.headers.severity')}</th>
              <th>{t('abnormalTriggerRulesSection.table.headers.description')}</th>
              {labs.length > 0 && <th>{t('abnormalTriggerRulesSection.table.headers.performingLab')}</th>}
              <th>{t('abnormalTriggerRulesSection.table.headers.status')}</th>
              <th>{t('abnormalTriggerRulesSection.table.headers.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(item => (
              <tr key={item.id}>
                <td className="ps-defic-cell-name">{item.fieldLabel}</td>
                <td>{item.triggerValues.join(', ')}</td>
                <td><span className={`ps-defic-status-badge ${severityBadgeClass(item.severity)}`}>{t(SEVERITY_LABEL_KEY[item.severity])}</span></td>
                <td className="ps-defic-cell-desc">{item.description || '—'}</td>
                {labs.length > 0 && <td>{labName(item.performingLabFacilityId)}</td>}
                <td>
                  <span className={`ps-defic-status-badge ${item.status === 'Active' ? 'ps-defic-status-badge--active' : 'ps-defic-status-badge--inactive'}`}>
                    {item.status === 'Active' ? t('common.active') : t('common.inactive')}
                  </span>
                </td>
                <td>
                  <div className="ps-defic-row-actions">
                    <button className="ps-conf-btn-row" onClick={() => setModal({ mode: 'edit', item })}>{t('common.edit')}</button>
                    {/* Duplicate (PS-73): usually a lab-scoped variant. fieldLabel is a
                        matching key, so it is not renamed; the uniqueness check forces a
                        real difference (lab or label) before save. Copy starts Inactive. */}
                    <button className="ps-conf-btn-row" onClick={() => setModal({ mode: 'add', item: duplicateAbnormalTriggerRule(item) })}>{t('common.duplicate')}</button>
                    <button className="ps-conf-btn-row" onClick={() => handleToggleActive(item)}>
                      {item.status === 'Active' ? t('abnormalTriggerRulesSection.table.deactivateButton') : t('abnormalTriggerRulesSection.table.activateButton')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredItems.length === 0 && (
              <tr><td colSpan={(labs.length > 0 ? 1 : 0) + 6} className="ps-defic-empty">{t('abnormalTriggerRulesSection.table.emptyState')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="ps-ms-overlay" onClick={() => setModal(null)}>
          <div className="ps-ms-modal" onClick={e => e.stopPropagation()}>
            <div className="ps-ms-header">{modal.mode === 'add' ? t('abnormalTriggerRulesSection.modal.addTitle') : t('abnormalTriggerRulesSection.modal.editTitle')}</div>
            <div className="ps-ms-field-group">
              <label className="ps-ms-label">{t('abnormalTriggerRulesSection.modal.fieldLabelLabel')}</label>
              <input aria-label={t('abnormalTriggerRulesSection.modal.fieldLabelLabel')} className="ps-ms-input" value={draft.fieldLabel} onChange={e => setDraft(d => ({ ...d, fieldLabel: e.target.value }))} placeholder={t('abnormalTriggerRulesSection.modal.fieldLabelPlaceholder')} />
            </div>
            <div className="ps-ms-field-group">
              <label className="ps-ms-label">{t('abnormalTriggerRulesSection.modal.triggerValuesLabel')}</label>
              <input aria-label={t('abnormalTriggerRulesSection.modal.triggerValuesLabel')} className="ps-ms-input" value={draft.triggerValues} onChange={e => setDraft(d => ({ ...d, triggerValues: e.target.value }))} placeholder={t('abnormalTriggerRulesSection.modal.triggerValuesPlaceholder')} />
              {fieldError && <span className="ps-conf-error-text">{fieldError}</span>}
            </div>
            <div className="ps-ms-field-group">
              <label className="ps-ms-label">{t('abnormalTriggerRulesSection.modal.severityLabel')}</label>
              <select aria-label={t('abnormalTriggerRulesSection.modal.severityLabel')} className="ps-ms-select" value={draft.severity} onChange={e => setDraft(d => ({ ...d, severity: e.target.value as AbnormalSeverity }))}>
                {SEVERITIES.map(s => <option key={s} value={s}>{t(SEVERITY_LABEL_KEY[s])}</option>)}
              </select>
            </div>
            <div className="ps-ms-field-group">
              <label className="ps-ms-label">{t('abnormalTriggerRulesSection.modal.descriptionLabel')}</label>
              <textarea aria-label={t('abnormalTriggerRulesSection.modal.descriptionLabel')} className="ps-ms-textarea" value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} placeholder={t('abnormalTriggerRulesSection.modal.descriptionPlaceholder')} />
            </div>
            <div className="ps-ms-field-group">
              <label className="ps-ms-label">{t('abnormalTriggerRulesSection.modal.licensedCodesLabel')}</label>
              <span className="ps-conf-field-hint">{t('abnormalTriggerRulesSection.modal.licensedCodesHint')}</span>
              <label className="ps-ms-label">{t('abnormalTriggerRulesSection.modal.snomedCodeLabel')}
                <input className="ps-ms-input" value={draft.coding.snomedCode} onChange={e => setCoding({ snomedCode: e.target.value })} />
              </label>
              <label className="ps-ms-label">{t('abnormalTriggerRulesSection.modal.snomedTermLabel')}
                <input className="ps-ms-input" value={draft.coding.snomedDisplay} onChange={e => setCoding({ snomedDisplay: e.target.value })} />
              </label>
              <label className="ps-ms-label">{t('abnormalTriggerRulesSection.modal.icdo3CodeLabel')}
                <input className="ps-ms-input" value={draft.coding.icdo3Code} onChange={e => setCoding({ icdo3Code: e.target.value })} />
              </label>
              <label className="ps-ms-label">{t('abnormalTriggerRulesSection.modal.icdo3TermLabel')}
                <input className="ps-ms-input" value={draft.coding.icdo3Display} onChange={e => setCoding({ icdo3Display: e.target.value })} />
              </label>
            </div>
            <div className="ps-ms-field-group">
              <label className="ps-ms-label">{t('abnormalTriggerRulesSection.modal.performingLabLabel')}</label>
              <select aria-label={t('abnormalTriggerRulesSection.modal.performingLabLabel')} className="ps-ms-select" value={draft.performingLabFacilityId} onChange={e => setDraft(d => ({ ...d, performingLabFacilityId: e.target.value }))}>
                <option value="">{t('abnormalTriggerRulesSection.modal.globalOption')}</option>
                {labs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="ps-ms-field-group">
              <label className="ps-ms-label">{t('abnormalTriggerRulesSection.modal.statusLabel')}</label>
              <select aria-label={t('abnormalTriggerRulesSection.modal.statusLabel')} className="ps-ms-select" value={draft.active ? 'active' : 'inactive'} onChange={e => setDraft(d => ({ ...d, active: e.target.value === 'active' }))}>
                <option value="active">{t('common.active')}</option>
                <option value="inactive">{t('common.inactive')}</option>
              </select>
            </div>
            <div className="ps-ms-footer">
              <button className="ps-ms-btn-cancel" onClick={() => setModal(null)}>{t('common.cancel')}</button>
              <button className="ps-ms-btn-apply" onClick={handleSave}>{modal.mode === 'add' ? t('abnormalTriggerRulesSection.modal.addButton') : t('abnormalTriggerRulesSection.modal.saveChangesButton')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AbnormalTriggerRulesSection;
