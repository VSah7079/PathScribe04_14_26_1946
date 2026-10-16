// src/components/Config/System/DeliveryRulesSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 520 (PS-280): a rule now sets its channels by role (primary,
// secondary, fallback) over electronic, print, e-fax and file drop, with a fax
// number and a file-drop target where those are used. The logic is in
// services/delivery/deliveryPlan.ts.
//
// Real, per direct follow-up ("Let's create the UI now") — the real
// admin surface for Component C, the Delivery Configuration Rules
// Engine (services/delivery/). Mirrors RoutingRulesTab.tsx's own,
// proven three-part shape (rule table, add/edit modal, a live test
// panel) rather than inventing a new admin-UI pattern — the same real
// reasoning that shape already earned there applies here: an admin
// needs to see what's configured, change it safely, and verify a real
// case would resolve the way they expect before trusting it.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import '../../../pathscribe.css';

import { resolveDeliveryAction } from '../../../services/delivery/resolveDeliveryAction';
import {
  CHANNEL_ROLES, channelRole, deliveryPlanProblem, planFromAction, planSummary, rulePlan, ruleDeliveryFields, withChannelRole,
  type ChannelRole,
} from '../../../services/delivery/deliveryPlan';

import { DELIVERY_CHANNELS, type DeliveryRule, type DeliveryAction, type DeliveryChannelPlan } from '../../../types/delivery/DeliveryRule';
import type { Facility } from '../../../services/facilities/IFacilityService';
import type { Physician } from '../../../services/physicians/IPhysicianService';
import { deliveryRuleService, facilityService, physicianService, locationService, deliveryRetrySettingsService, parseRetryDelays, retrySettingsProblem } from '@/services';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { LoadingState } from '@/components/Common/LoadingState';

// Real i18n key-maps, not raw strings — ACTION_COLORS stays a plain
// constant (hex codes aren't translatable content).
const ACTION_LABEL_KEY: Record<DeliveryAction, string> = {
  ELECTRONIC_ONLY: 'deliveryRulesSection.actionLabels.electronicOnly',
  PRINT_ONLY: 'deliveryRulesSection.actionLabels.printOnly',
  DUAL: 'deliveryRulesSection.actionLabels.dual',
  SUPPRESS: 'deliveryRulesSection.actionLabels.suppress',
};
const ACTION_COLORS: Record<DeliveryAction, string> = {
  ELECTRONIC_ONLY: '#0891B2',
  PRINT_ONLY: '#c026d3',
  DUAL: '#059669',
  SUPPRESS: '#dc2626',
};
const REPORT_TYPE_LABEL_KEY: Record<string, string> = {
  PRELIMINARY: 'deliveryRulesSection.reportTypeLabels.preliminary',
  FINAL: 'deliveryRulesSection.reportTypeLabels.final',
  CORRECTED: 'deliveryRulesSection.reportTypeLabels.corrected',
  ADDENDUM: 'deliveryRulesSection.reportTypeLabels.addendum',
};

// Batch 520 (PS-280): a rule's channels by role, e.g. "Primary: Electronic · Fallback: Print".
const PlanSummary: React.FC<{ plan: DeliveryChannelPlan }> = ({ plan }) => {
  const { t } = useTranslation();
  const parts = planSummary(plan);
  if (parts.length === 0) return <span className="ps-rr-plan-summary ps-rr-plan-summary--none">{t('deliveryRulesSection.summary.none')}</span>;
  return (
    <span className="ps-rr-plan-summary">
      {parts.map(p => (
        <span key={p.role} className={`ps-rr-plan-role ps-rr-plan-role--${p.role}`}>
          {t('deliveryRulesSection.summary.role', { role: t(`deliveryRulesSection.roles.${p.role}`), channels: p.channels.map(c => t(`deliveryRulesSection.channelNames.${c}`)).join(', ') })}
        </span>
      ))}
    </span>
  );
};

// ── Add/Edit Rule Modal ──────────────────────────────────────────────────────

const RuleModal: React.FC<{
  rule?: DeliveryRule;
  facilities: Facility[];
  physicians: Physician[];
  pointsOfCare: string[];
  onSave: (rule: Partial<DeliveryRule>) => void;
  onClose: () => void;
}> = ({ rule, facilities, physicians, pointsOfCare, onSave, onClose }) => {
  const { t } = useTranslation();
  const [providerId, setProviderId] = useState(rule?.providerId ?? '');
  const [orderingFacilityId, setOrderingFacilityId] = useState(rule?.orderingFacilityId ?? '');
  const [pointOfCare, setPointOfCare] = useState(rule?.pointOfCare ?? '');
  const [reportType, setReportType] = useState(rule?.reportType ?? '');
  // Batch 520 (PS-280): the channels by role replace the single action.
  const [plan, setPlan] = useState<DeliveryChannelPlan>(rule ? rulePlan(rule) : planFromAction('ELECTRONIC_ONLY'));
  const [faxNumber, setFaxNumber] = useState(rule?.faxNumber ?? '');
  const [fileDropTargetId, setFileDropTargetId] = useState(rule?.fileDropTargetId ?? '');
  const [note, setNote] = useState(rule?.note ?? '');

  const hasAnyCriterion = !!(providerId || orderingFacilityId || pointOfCare || reportType);
  const problem = deliveryPlanProblem(plan, { faxNumber, fileDropTargetId });

  return (
    <div className="ps-overlay" onClick={onClose}>
      <div className="ps-modal-dark ps-modal-dark--narrow" onClick={e => e.stopPropagation()}>
        <div className="ps-modal-dark-header">
          <span className="ps-modal-dark-title">{rule ? t('deliveryRulesSection.modal.editTitle') : t('deliveryRulesSection.modal.addTitle')}</span>
          <button className="ps-research-close" onClick={onClose}>✕</button>
        </div>

        <div className="ps-modal-dark-body ps-rr-modal-body">
          <p className="ps-rr-modal-hint">
            {t('deliveryRulesSection.modal.hint')}
          </p>

          <div>
            <div className="ps-conf-label">{t('deliveryRulesSection.fields.provider')}</div>
            <select className="ps-conf-select" aria-label={t('deliveryRulesSection.fields.provider')} value={providerId} onChange={e => setProviderId(e.target.value)}>
              <option value="">{t('deliveryRulesSection.modal.providerPlaceholder')}</option>
              {physicians.map(p => <option key={p.id as string} value={p.id as string}>{p.lastName}, {p.firstName} — {p.specialty}</option>)}
            </select>
          </div>

          <div>
            <div className="ps-conf-label">{t('deliveryRulesSection.fields.orderingFacility')}</div>
            <select className="ps-conf-select" aria-label={t('deliveryRulesSection.fields.orderingFacility')} value={orderingFacilityId} onChange={e => setOrderingFacilityId(e.target.value)}>
              <option value="">{t('deliveryRulesSection.modal.facilityPlaceholder')}</option>
              {facilities.map(f => <option key={f.id as string} value={f.id as string}>{f.name} ({f.assigningAuthority})</option>)}
            </select>
          </div>

          <div>
            <div className="ps-conf-label">{t('deliveryRulesSection.modal.locationLabel')}</div>
            <select className="ps-conf-select" aria-label={t('deliveryRulesSection.fields.patientLocation')} value={pointOfCare} onChange={e => setPointOfCare(e.target.value)}>
              <option value="">{t('deliveryRulesSection.modal.locationPlaceholder')}</option>
              {pointsOfCare.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div>
            <div className="ps-conf-label">{t('deliveryRulesSection.fields.reportType')}</div>
            <select className="ps-conf-select" aria-label={t('deliveryRulesSection.fields.reportType')} value={reportType} onChange={e => setReportType(e.target.value)}>
              <option value="">{t('deliveryRulesSection.modal.reportTypePlaceholder')}</option>
              {Object.entries(REPORT_TYPE_LABEL_KEY).map(([value, key]) => <option key={value} value={value}>{t(key)}</option>)}
            </select>
          </div>

          <fieldset className="ps-rr-channels">
            <legend className="ps-conf-label">{t('deliveryRulesSection.channels.title')}</legend>
            <p className="ps-rr-modal-hint">{t('deliveryRulesSection.channels.hint')}</p>
            {DELIVERY_CHANNELS.map(channel => (
              <div key={channel} className="ps-rr-channel-row">
                <label className="ps-rr-channel-name" htmlFor={`dr-channel-${channel}`}>{t(`deliveryRulesSection.channelNames.${channel}`)}</label>
                <select id={`dr-channel-${channel}`} className="ps-conf-select" value={channelRole(plan, channel)}
                  onChange={e => setPlan(withChannelRole(plan, channel, e.target.value as ChannelRole | 'off'))}>
                  <option value="off">{t('deliveryRulesSection.roles.off')}</option>
                  {CHANNEL_ROLES.map(r => <option key={r} value={r}>{t(`deliveryRulesSection.roles.${r}`)}</option>)}
                </select>
              </div>
            ))}
            {channelRole(plan, 'FAX') !== 'off' && (
              <div>
                <label className="ps-conf-label" htmlFor="dr-fax-number">{t('deliveryRulesSection.fields.faxNumber')}</label>
                <input id="dr-fax-number" className="ps-conf-input" value={faxNumber} onChange={e => setFaxNumber(e.target.value)} placeholder={t('deliveryRulesSection.fields.faxNumberPlaceholder')} />
                <p className="ps-rr-modal-hint">{t('deliveryRulesSection.fields.faxNumberHint')}</p>
              </div>
            )}
            {channelRole(plan, 'FILE_DROP') !== 'off' && (
              <div>
                <label className="ps-conf-label" htmlFor="dr-file-drop-target">{t('deliveryRulesSection.fields.fileDropTarget')}</label>
                <input id="dr-file-drop-target" className="ps-conf-input" value={fileDropTargetId} onChange={e => setFileDropTargetId(e.target.value)} placeholder={t('deliveryRulesSection.fields.fileDropTargetPlaceholder')} />
                <p className="ps-rr-modal-hint">{t('deliveryRulesSection.fields.fileDropTargetHint')}</p>
              </div>
            )}
            {problem && <p className="ps-rr-modal-warn" role="alert">{t(`deliveryRulesSection.problems.${problem}`)}</p>}
          </fieldset>

          <div>
            <div className="ps-conf-label">{t('deliveryRulesSection.modal.noteLabel')}</div>
            <input aria-label={t('deliveryRulesSection.modal.noteLabel')} className="ps-conf-input" placeholder={t('deliveryRulesSection.modal.notePlaceholder')} value={note} onChange={e => setNote(e.target.value)} />
          </div>

          {!hasAnyCriterion && (
            <p className="ps-rr-modal-warn">
              {t('deliveryRulesSection.modal.noCriteriaWarning')}
            </p>
          )}
        </div>

        <div className="ps-modal-dark-footer">
          <button className="ps-conf-btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
          <button
            className="ps-conf-btn-primary"
            disabled={!!problem}
            onClick={() => onSave({
              providerId: providerId || undefined,
              orderingFacilityId: orderingFacilityId || undefined,
              pointOfCare: pointOfCare || undefined,
              reportType: (reportType || undefined) as DeliveryRule['reportType'],
              ...ruleDeliveryFields(plan, faxNumber, fileDropTargetId),
              note: note || undefined,
              active: rule?.active ?? true,
            })}
          >
            {rule ? t('deliveryRulesSection.modal.saveChangesButton') : t('deliveryRulesSection.modal.addRuleButton')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Test Panel ────────────────────────────────────────────────────────────────

const TestPanel: React.FC<{ rules: DeliveryRule[]; facilities: Facility[]; physicians: Physician[]; pointsOfCare: string[] }> =
  ({ rules, facilities, physicians, pointsOfCare }) => {
  const { t } = useTranslation();
  const [providerId, setProviderId] = useState('');
  const [orderingFacilityId, setOrderingFacilityId] = useState('');
  const [pointOfCare, setPointOfCare] = useState('');
  const [reportType, setReportType] = useState('');
  const [result, setResult] = useState<{ action: DeliveryAction; matchedRuleId?: string; plan?: DeliveryChannelPlan } | null>(null);

  const test = () => {
    const activeRules = rules.filter(r => r.active);
    const resolved = resolveDeliveryAction({
      providerId: providerId || undefined,
      orderingFacilityId: orderingFacilityId || undefined,
      pointOfCare: pointOfCare || undefined,
      reportType: (reportType || undefined) as any,
    }, activeRules);
    setResult(resolved);
  };

  const matchedRule = result?.matchedRuleId ? rules.find(r => r.id === result.matchedRuleId) : undefined;

  return (
    <div className="ps-rr-test">
      <div className="ps-rr-test-title">{t('deliveryRulesSection.testPanel.title')}</div>
      <div className="ps-rr-test-subtitle">{t('deliveryRulesSection.testPanel.subtitle')}</div>

      <div className="ps-conf-label">{t('deliveryRulesSection.fields.provider')}</div>
      <select aria-label={t('deliveryRulesSection.fields.provider')} className="ps-conf-select" value={providerId} onChange={e => setProviderId(e.target.value)}>
        <option value="">{t('deliveryRulesSection.testPanel.anyPlaceholder')}</option>
        {physicians.map(p => <option key={p.id as string} value={p.id as string}>{p.lastName}, {p.firstName}</option>)}
      </select>

      <div className="ps-conf-label">{t('deliveryRulesSection.fields.orderingFacility')}</div>
      <select aria-label={t('deliveryRulesSection.fields.orderingFacility')} className="ps-conf-select" value={orderingFacilityId} onChange={e => setOrderingFacilityId(e.target.value)}>
        <option value="">{t('deliveryRulesSection.testPanel.anyPlaceholder')}</option>
        {facilities.map(f => <option key={f.id as string} value={f.id as string}>{f.name}</option>)}
      </select>

      <div className="ps-conf-label">{t('deliveryRulesSection.fields.patientLocation')}</div>
      <select aria-label={t('deliveryRulesSection.fields.patientLocation')} className="ps-conf-select" value={pointOfCare} onChange={e => setPointOfCare(e.target.value)}>
        <option value="">{t('deliveryRulesSection.testPanel.anyPlaceholder')}</option>
        {pointsOfCare.map(p => <option key={p} value={p}>{p}</option>)}
      </select>

      <div className="ps-conf-label">{t('deliveryRulesSection.fields.reportType')}</div>
      <select aria-label={t('deliveryRulesSection.fields.reportType')} className="ps-conf-select" value={reportType} onChange={e => setReportType(e.target.value)}>
        <option value="">{t('deliveryRulesSection.testPanel.anyPlaceholder')}</option>
        {Object.entries(REPORT_TYPE_LABEL_KEY).map(([value, key]) => <option key={value} value={value}>{t(key)}</option>)}
      </select>

      <button className="ps-conf-btn-primary ps-mt-12" onClick={test}>{t('deliveryRulesSection.testPanel.resolveButton')}</button>

      {result && (
        <div className="ps-rr-test-result-box">
          <div className="ps-rr-test-result-label">{t('deliveryRulesSection.testPanel.resolvedActionLabel')}</div>
          <div className="ps-rr-test-result-value ps-hue-text" style={{ '--ps-hue': ACTION_COLORS[result.action] } as React.CSSProperties}>{t(ACTION_LABEL_KEY[result.action])}</div>
          <div className="ps-rr-test-result-label">{t('deliveryRulesSection.testPanel.resolvedPlanLabel')}</div>
          <PlanSummary plan={result.plan ?? planFromAction(result.action)} />
          <div className="ps-rr-test-result-matched">
            {matchedRule
              ? t('deliveryRulesSection.testPanel.matchedRule', { note: matchedRule.note || matchedRule.id })
              : t('deliveryRulesSection.testPanel.noRuleMatched')}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Retries (Batch 521, PS-281) ──────────────────────────────────────────────
// The waits before each automatic retry of a failed print, fax or file drop
// (services/delivery/deliveryRetryPolicy.ts). Saving needs
// config:delivery-rules:manage, checked in the service.
const RetrySettings: React.FC = () => {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'saved' | 'refused' | null>(null);
  useEffect(() => {
    void deliveryRetrySettingsService.get().then(r => { if (r.ok) setText(r.data.delaysMinutes.join(', ')); });
  }, []);
  const delays = parseRetryDelays(text);
  const problem = retrySettingsProblem(delays);
  const save = async () => {
    const r = await deliveryRetrySettingsService.save({ delaysMinutes: delays });
    setStatus(r.ok ? 'saved' : 'refused');
  };
  return (
    <div className="ps-rr-retries">
      <div className="ps-rr-retries-field">
        <label className="ps-conf-label" htmlFor="dr-retry-delays">{t('deliveryRulesSection.retries.label')}</label>
        <input id="dr-retry-delays" className="ps-conf-input" value={text} placeholder={t('deliveryRulesSection.retries.placeholder')}
          onChange={e => { setText(e.target.value); setStatus(null); }} />
      </div>
      <CapabilityButton capability="config:delivery-rules:manage" className="ps-conf-btn-secondary" disabled={!!problem} onClick={() => { void save(); }}>
        {t('deliveryRulesSection.retries.save')}
      </CapabilityButton>
      <p className="ps-rr-modal-hint">{delays.length === 0 ? t('deliveryRulesSection.retries.none') : t('deliveryRulesSection.retries.hint')}</p>
      {problem && <p className="ps-rr-modal-warn" role="alert">{t(`deliveryRulesSection.retries.problems.${problem}`)}</p>}
      {status && <p className="ps-conf-hint" role="status">{t(`deliveryRulesSection.retries.${status}`)}</p>}
    </div>
  );
};

// ── Main Component ───────────────────────────────────────────────────────────

const DeliveryRulesSection: React.FC = () => {
  const { t } = useTranslation();
  const [rules, setRules] = useState<DeliveryRule[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [physicians, setPhysicians] = useState<Physician[]>([]);
  const [pointsOfCare, setPointsOfCare] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ rule?: DeliveryRule } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [rulesRes, facilitiesRes, physiciansRes, locationsRes] = await Promise.all([
      deliveryRuleService.getAll(),
      facilityService.getAll(),
      physicianService.getAll(),
      locationService.getAll(),
    ]);
    if (rulesRes.ok) setRules(rulesRes.data);
    if (facilitiesRes.ok) setFacilities((facilitiesRes.data as Facility[]).filter(f => f.status === 'Active'));
    if (physiciansRes.ok) setPhysicians((physiciansRes.data as Physician[]).filter(p => p.status === 'Active'));
    if (locationsRes.ok) {
      const distinct = Array.from(new Set(locationsRes.data.map(l => l.pointOfCare).filter(Boolean)));
      setPointsOfCare(distinct.sort());
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (data: Partial<DeliveryRule>) => {
    if (modal?.rule) {
      await deliveryRuleService.update(modal.rule.id, data);
    } else {
      await deliveryRuleService.create(data as Omit<DeliveryRule, 'id' | 'createdAt' | 'updatedAt'>);
    }
    setModal(null);
    load();
  };

  const handleDelete = async (id: string) => {
    await deliveryRuleService.remove(id);
    load();
  };

  const handleToggle = async (rule: DeliveryRule) => {
    await deliveryRuleService.update(rule.id, { active: !rule.active });
    load();
  };

  const describeCriteria = (rule: DeliveryRule): string => {
    const parts: string[] = [];
    if (rule.providerId) parts.push(t('deliveryRulesSection.criteriaDescription.provider', { name: physicians.find(p => p.id === rule.providerId)?.lastName ?? rule.providerId }));
    if (rule.orderingFacilityId) parts.push(t('deliveryRulesSection.criteriaDescription.facility', { name: facilities.find(f => f.id === rule.orderingFacilityId)?.name ?? rule.orderingFacilityId }));
    if (rule.pointOfCare) parts.push(t('deliveryRulesSection.criteriaDescription.location', { location: rule.pointOfCare }));
    if (rule.reportType) parts.push(t('deliveryRulesSection.criteriaDescription.report', { type: t(REPORT_TYPE_LABEL_KEY[rule.reportType]) }));
    return parts.length ? parts.join(' · ') : t('deliveryRulesSection.criteriaDescription.matchesEvery');
  };

  if (loading) return <LoadingState label={t('deliveryRulesSection.loading')} />;

  return (
    <div className="ps-rr-root">
      <div className="ps-rr-header">
        <div>
          <h2 className="tmpl-list-title">{t('deliveryRulesSection.title')}</h2>
          <p className="tmpl-list-subtitle">
            {t('deliveryRulesSection.subtitle')}
          </p>
        </div>
        <button className="ps-conf-btn-primary" onClick={() => setModal({})}>{t('deliveryRulesSection.addRuleButton')}</button>
      </div>

      <RetrySettings />

      <div className="ps-rr-layout">
        <div className="ps-rr-tables">
          <table className="ps-conf-table">
            <thead>
              <tr>
                <th>{t('deliveryRulesSection.table.headers.criteria')}</th>
                <th>{t('deliveryRulesSection.table.headers.channels')}</th>
                <th>{t('deliveryRulesSection.table.headers.note')}</th>
                <th>{t('common.active')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rules.length === 0 && (
                <tr><td colSpan={5} className="ps-rr-empty-row">{t('deliveryRulesSection.table.emptyState')}</td></tr>
              )}
              {rules.map(rule => (
                <tr key={rule.id} className={rule.active ? undefined : 'ps-rr-delivery-row--inactive'}>
                  <td>{describeCriteria(rule)}</td>
                  <td><PlanSummary plan={rulePlan(rule)} /></td>
                  <td>{rule.note ?? '—'}</td>
                  <td>
                    <button className="ps-rr-btn" onClick={() => handleToggle(rule)}>{rule.active ? t('common.active') : t('common.inactive')}</button>
                  </td>
                  <td>
                    <button className="ps-rr-btn" onClick={() => setModal({ rule })}>{t('common.edit')}</button>
                    <button className="ps-rr-btn ps-rr-btn--danger" onClick={() => handleDelete(rule.id)}>{t('common.delete')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <TestPanel rules={rules} facilities={facilities} physicians={physicians} pointsOfCare={pointsOfCare} />
      </div>

      {modal && (
        <RuleModal
          rule={modal.rule}
          facilities={facilities}
          physicians={physicians}
          pointsOfCare={pointsOfCare}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
};

export default DeliveryRulesSection;
