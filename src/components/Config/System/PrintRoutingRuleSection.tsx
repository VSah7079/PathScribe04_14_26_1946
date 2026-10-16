// src/components/Config/System/PrintRoutingRuleSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real, per PS-278/279 gap-closing follow-up ("PrintRoutingRule admin
// UI") — also closes PS-337's own tracked recurring gap for this one
// specific engine (Delivery Rules/Print Routing/Print Queue each
// lacked an admin UI; this closes the Print Routing one). Mirrors
// DeliveryRulesSection.tsx's own proven three-part shape (rule table,
// add/edit modal, a live test panel) rather than inventing a new
// admin-UI pattern — same real reasoning: an admin needs to see what's
// configured, change it safely, and verify a real job would resolve
// the way they expect before trusting it. Reuses every one of that
// component's own `.ps-rr-*`/`.ps-conf-*`/`.ps-modal-dark`/`.ps-overlay`
// CSS classes verbatim — confirmed directly against pathscribe.css
// before writing this that none of them are Delivery-Rules-specific in
// their actual styling (only naming), so this needs zero new CSS.
//
// Real, deliberate difference from DeliveryRulesSection.tsx:
// PrintRoutingRule has an outer SCOPE TIER (workstation → location →
// clientAccount → facility, §2.1.2's own strict precedence — see
// resolvePrintDestination.ts's own header) that DeliveryRule has no
// analog for at all, plus a real PrintDestination sub-object (network
// protocol/address) instead of a simple enum action. The scope-tier
// picker drives which real reference-data field appears for scopeId:
//   - 'workstation' → free-text. Confirmed directly before building
//     this: this app has no real workstation/scan-station dictionary
//     service (only ad hoc, per-mock-data IDs like
//     'ws-fgh-theatre2-01' — see printRoutingRuleService.ts's own
//     seed data) to populate a dropdown from, so forcing a `<select>`
//     here would mean inventing a fake, closed list — a free-text
//     field is the honest choice, not a fallback shortcut.
//   - 'location' → the same real, distinct `pointOfCare` list
//     DeliveryRulesSection.tsx already loads via locationService.
//   - 'clientAccount'/'facility' → the same real Facility list
//     (facilityService) — both are real Facility ids per
//     PrintRoutingRule.ts's own header (ordering vs. performing lab
//     respectively); this app has one real Facility entity, not two
//     separate dictionaries, so both tiers share the same list.
// Batch 553 (SITE_AGENT_API.md §3): the destination is a site agent's printer,
// chosen from the site's list (the site is the rule's facility on the facility
// tier, otherwise chosen), or a printer address. PrintDestinationFields edits
// it; printDestinationRules.ts holds the rules.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import '../../../pathscribe.css';

import { resolvePrintDestination } from '../../../services/printRouting/resolvePrintDestination';

import type {
  PrintRoutingRule, PrintDestinationScopeType, SpecimenCaseType, EventTriggerType,
} from '../../../types/printRouting/PrintRoutingRule';
import type { PrintDestination } from '../../../types/printRouting/PrintDestination';
import {
  performingLabSites, printDestinationDraft, printDestinationDraftProblem, printDestinationFromDraft, printDestinationSiteId, printDestinationText, routingRuleErrorKey,
  routingRuleSite, withSite, type PrintDestinationDraft,
} from '../../../services/printRouting/printDestinationRules';
import { PrintDestinationFields } from '@/components/Printing/PrintDestinationFields';
import type { Facility } from '../../../services/facilities/IFacilityService';
import { printRoutingRuleService, facilityService, locationService } from '@/services';
import { LoadingState } from '@/components/Common/LoadingState';

const SCOPE_TYPE_LABEL_KEY: Record<PrintDestinationScopeType, string> = {
  workstation: 'printRoutingRulesSection.scopeTypeLabels.workstation',
  location: 'printRoutingRulesSection.scopeTypeLabels.location',
  clientAccount: 'printRoutingRulesSection.scopeTypeLabels.clientAccount',
  facility: 'printRoutingRulesSection.scopeTypeLabels.facility',
};
const SPECIMEN_CASE_TYPE_LABEL_KEY: Record<SpecimenCaseType, string> = {
  FROZEN_SECTION: 'printRoutingRulesSection.specimenCaseTypeLabels.frozenSection',
  ROUTINE_SURGICAL: 'printRoutingRulesSection.specimenCaseTypeLabels.routineSurgical',
  CYTOLOGY: 'printRoutingRulesSection.specimenCaseTypeLabels.cytology',
};
const EVENT_TRIGGER_TYPE_LABEL_KEY: Record<EventTriggerType, string> = {
  INITIAL_SIGNOUT: 'printRoutingRulesSection.eventTriggerTypeLabels.initialSignout',
  PRELIMINARY: 'printRoutingRulesSection.eventTriggerTypeLabels.preliminary',
  AMENDED_SIGNOUT: 'printRoutingRulesSection.eventTriggerTypeLabels.amendedSignout',
};
// ── Add/Edit Rule Modal ──────────────────────────────────────────────────────

const RuleModal: React.FC<{
  rule?: PrintRoutingRule;
  facilities: Facility[];
  pointsOfCare: string[];
  onSave: (rule: Partial<PrintRoutingRule>) => void;
  onClose: () => void;
  /** Batch 553: why the last save was refused (a message key); the window stays open. */
  saveError?: string | null;
}> = ({ rule, facilities, pointsOfCare, onSave, onClose, saveError }) => {
  const { t } = useTranslation();
  const [scopeType, setScopeType] = useState<PrintDestinationScopeType>(rule?.scopeType ?? 'workstation');
  const [scopeId, setScopeId] = useState(rule?.scopeId ?? '');
  const [specimenCaseType, setSpecimenCaseType] = useState<SpecimenCaseType | ''>(rule?.specimenCaseType ?? '');
  const [eventTriggerType, setEventTriggerType] = useState<EventTriggerType | ''>(rule?.eventTriggerType ?? '');
  const [note, setNote] = useState(rule?.note ?? '');
  const [destination, setDestination] = useState<PrintDestinationDraft>(() => printDestinationDraft(rule?.printDestination, routingRuleSite(rule?.scopeType ?? 'workstation', rule?.scopeId ?? '') ?? ''));

  const scopeIdMissing = !scopeId.trim();
  // Batch 553: a site agent printer, or a printer address (printDestinationRules.ts).
  const destinationProblem = printDestinationDraftProblem(destination);
  const lockedSite = routingRuleSite(scopeType, scopeId);
  const siteChoices = performingLabSites(facilities.map(f => ({ id: f.id as string, name: f.name, roles: f.roles })));

  const handleScopeTypeChange = (next: PrintDestinationScopeType) => {
    setScopeType(next);
    setScopeId(''); // real, deliberate reset — a scopeId value from one tier's own vocabulary (a pointOfCare string, say) is never a valid value for another tier
    if (next === 'facility') setDestination(d => withSite(d, ''));
  };
  // A facility-tier rule prints at that facility: its agent printers are the facility's own.
  const handleScopeIdChange = (next: string) => {
    setScopeId(next);
    const site = routingRuleSite(scopeType, next);
    if (site !== null) setDestination(d => withSite(d, site));
  };

  return (
    <div className="ps-overlay" onClick={onClose}>
      <div className="ps-modal-dark ps-modal-dark--narrow" onClick={e => e.stopPropagation()}>
        <div className="ps-modal-dark-header">
          <span className="ps-modal-dark-title">{rule ? t('printRoutingRulesSection.modal.editTitle') : t('printRoutingRulesSection.modal.addTitle')}</span>
          <button className="ps-research-close" onClick={onClose}>✕</button>
        </div>

        <div className="ps-modal-dark-body ps-rr-modal-body">
          <p className="ps-rr-modal-hint">{t('printRoutingRulesSection.modal.hint')}</p>

          <div>
            <div className="ps-conf-label">{t('printRoutingRulesSection.fields.scopeType')}</div>
            <select
              className="ps-conf-select"
              aria-label={t('printRoutingRulesSection.fields.scopeType')}
              value={scopeType}
              onChange={e => handleScopeTypeChange(e.target.value as PrintDestinationScopeType)}
            >
              {(Object.keys(SCOPE_TYPE_LABEL_KEY) as PrintDestinationScopeType[]).map(st => (
                <option key={st} value={st}>{t(SCOPE_TYPE_LABEL_KEY[st])}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="ps-conf-label">{t('printRoutingRulesSection.fields.scopeId')}</div>
            {scopeType === 'workstation' && (
              <input
                className="ps-conf-input"
                aria-label={t('printRoutingRulesSection.fields.scopeId')}
                placeholder={t('printRoutingRulesSection.modal.workstationIdPlaceholder')}
                value={scopeId}
                onChange={e => setScopeId(e.target.value)}
              />
            )}
            {scopeType === 'location' && (
              <select className="ps-conf-select" aria-label={t('printRoutingRulesSection.fields.scopeId')} value={scopeId} onChange={e => setScopeId(e.target.value)}>
                <option value="">{t('printRoutingRulesSection.modal.locationPlaceholder')}</option>
                {pointsOfCare.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            )}
            {(scopeType === 'clientAccount' || scopeType === 'facility') && (
              <select className="ps-conf-select" aria-label={t('printRoutingRulesSection.fields.scopeId')} value={scopeId} onChange={e => handleScopeIdChange(e.target.value)}>
                <option value="">{t('printRoutingRulesSection.modal.facilityPlaceholder')}</option>
                {facilities.map(f => <option key={f.id as string} value={f.id as string}>{f.name}</option>)}
              </select>
            )}
            {scopeIdMissing && <p className="ps-rr-modal-warn">{t('printRoutingRulesSection.modal.missingScopeIdWarning')}</p>}
          </div>

          <div>
            <div className="ps-conf-label">{t('printRoutingRulesSection.fields.specimenCaseType')}</div>
            <select
              className="ps-conf-select"
              aria-label={t('printRoutingRulesSection.fields.specimenCaseType')}
              value={specimenCaseType}
              onChange={e => setSpecimenCaseType(e.target.value as SpecimenCaseType | '')}
            >
              <option value="">{t('printRoutingRulesSection.modal.specimenCaseTypePlaceholder')}</option>
              {(Object.keys(SPECIMEN_CASE_TYPE_LABEL_KEY) as SpecimenCaseType[]).map(sc => (
                <option key={sc} value={sc}>{t(SPECIMEN_CASE_TYPE_LABEL_KEY[sc])}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="ps-conf-label">{t('printRoutingRulesSection.fields.eventTriggerType')}</div>
            <select
              className="ps-conf-select"
              aria-label={t('printRoutingRulesSection.fields.eventTriggerType')}
              value={eventTriggerType}
              onChange={e => setEventTriggerType(e.target.value as EventTriggerType | '')}
            >
              <option value="">{t('printRoutingRulesSection.modal.eventTriggerTypePlaceholder')}</option>
              {(Object.keys(EVENT_TRIGGER_TYPE_LABEL_KEY) as EventTriggerType[]).map(et => (
                <option key={et} value={et}>{t(EVENT_TRIGGER_TYPE_LABEL_KEY[et])}</option>
              ))}
            </select>
          </div>

          <div className="ps-rr-section-title">{t('printRoutingRulesSection.modal.destinationSectionTitle')}</div>

          <PrintDestinationFields draft={destination} onChange={setDestination} purpose="routing" sites={siteChoices} siteLocked={lockedSite !== null} />

          {destinationProblem && <p className="ps-rr-modal-warn">{t(`printDestination.problems.${destinationProblem}`)}</p>}

          <div>
            <div className="ps-conf-label">{t('printRoutingRulesSection.modal.noteLabel')}</div>
            <input aria-label={t('printRoutingRulesSection.modal.noteLabel')} className="ps-conf-input" placeholder={t('printRoutingRulesSection.modal.notePlaceholder')} value={note} onChange={e => setNote(e.target.value)} />
          </div>
        </div>

        <div className="ps-modal-dark-footer">
          {saveError && <p className="ps-rr-modal-warn" role="alert">{t(saveError)}</p>}
          <button className="ps-conf-btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
          <button
            className="ps-conf-btn-primary"
            disabled={scopeIdMissing || !!destinationProblem}
            onClick={() => onSave({
              scopeType,
              scopeId: scopeId.trim(),
              specimenCaseType: specimenCaseType || undefined,
              eventTriggerType: eventTriggerType || undefined,
              printDestination: printDestinationFromDraft(destination),
              note: note.trim() || undefined,
              active: rule?.active ?? true,
            })}
          >
            {rule ? t('printRoutingRulesSection.modal.saveChangesButton') : t('printRoutingRulesSection.modal.addRuleButton')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Test Panel ────────────────────────────────────────────────────────────────

const TestPanel: React.FC<{ rules: PrintRoutingRule[]; facilities: Facility[]; pointsOfCare: string[] }> =
  ({ rules, facilities, pointsOfCare }) => {
  const { t } = useTranslation();
  const [workstationId, setWorkstationId] = useState('');
  const [pointOfCare, setPointOfCare] = useState('');
  const [orderingFacilityId, setOrderingFacilityId] = useState('');
  const [facilityId, setFacilityId] = useState('');
  const [specimenCaseType, setSpecimenCaseType] = useState<SpecimenCaseType | ''>('');
  const [eventTriggerType, setEventTriggerType] = useState<EventTriggerType | ''>('');
  const [result, setResult] = useState<{ destination?: PrintDestination; matchedRuleId?: string; matchedScopeType?: PrintDestinationScopeType } | null>(null);

  const test = () => {
    const activeRules = rules.filter(r => r.active);
    const resolved = resolvePrintDestination(activeRules, {
      workstationId: workstationId || undefined,
      pointOfCare: pointOfCare || undefined,
      orderingFacilityId: orderingFacilityId || undefined,
      facilityId: facilityId || undefined,
      specimenCaseType: specimenCaseType || undefined,
      eventTriggerType: eventTriggerType || undefined,
    });
    setResult(resolved);
  };

  const matchedRule = result?.matchedRuleId ? rules.find(r => r.id === result.matchedRuleId) : undefined;

  return (
    <div className="ps-rr-test">
      <div className="ps-rr-test-title">{t('printRoutingRulesSection.testPanel.title')}</div>
      <div className="ps-rr-test-subtitle">{t('printRoutingRulesSection.testPanel.subtitle')}</div>

      <div className="ps-conf-label">{t('printRoutingRulesSection.testPanel.workstationIdLabel')}</div>
      <input aria-label={t('printRoutingRulesSection.testPanel.workstationIdLabel')} className="ps-conf-input" placeholder={t('printRoutingRulesSection.testPanel.anyPlaceholder')} value={workstationId} onChange={e => setWorkstationId(e.target.value)} />

      <div className="ps-conf-label">{t('printRoutingRulesSection.scopeTypeLabels.location')}</div>
      <select aria-label={t('printRoutingRulesSection.scopeTypeLabels.location')} className="ps-conf-select" value={pointOfCare} onChange={e => setPointOfCare(e.target.value)}>
        <option value="">{t('printRoutingRulesSection.testPanel.anyPlaceholder')}</option>
        {pointsOfCare.map(p => <option key={p} value={p}>{p}</option>)}
      </select>

      <div className="ps-conf-label">{t('printRoutingRulesSection.scopeTypeLabels.clientAccount')}</div>
      <select aria-label={t('printRoutingRulesSection.scopeTypeLabels.clientAccount')} className="ps-conf-select" value={orderingFacilityId} onChange={e => setOrderingFacilityId(e.target.value)}>
        <option value="">{t('printRoutingRulesSection.testPanel.anyPlaceholder')}</option>
        {facilities.map(f => <option key={f.id as string} value={f.id as string}>{f.name}</option>)}
      </select>

      <div className="ps-conf-label">{t('printRoutingRulesSection.scopeTypeLabels.facility')}</div>
      <select aria-label={t('printRoutingRulesSection.scopeTypeLabels.facility')} className="ps-conf-select" value={facilityId} onChange={e => setFacilityId(e.target.value)}>
        <option value="">{t('printRoutingRulesSection.testPanel.anyPlaceholder')}</option>
        {facilities.map(f => <option key={f.id as string} value={f.id as string}>{f.name}</option>)}
      </select>

      <div className="ps-conf-label">{t('printRoutingRulesSection.fields.specimenCaseType')}</div>
      <select aria-label={t('printRoutingRulesSection.fields.specimenCaseType')} className="ps-conf-select" value={specimenCaseType} onChange={e => setSpecimenCaseType(e.target.value as SpecimenCaseType | '')}>
        <option value="">{t('printRoutingRulesSection.testPanel.anyPlaceholder')}</option>
        {(Object.keys(SPECIMEN_CASE_TYPE_LABEL_KEY) as SpecimenCaseType[]).map(sc => <option key={sc} value={sc}>{t(SPECIMEN_CASE_TYPE_LABEL_KEY[sc])}</option>)}
      </select>

      <div className="ps-conf-label">{t('printRoutingRulesSection.fields.eventTriggerType')}</div>
      <select aria-label={t('printRoutingRulesSection.fields.eventTriggerType')} className="ps-conf-select" value={eventTriggerType} onChange={e => setEventTriggerType(e.target.value as EventTriggerType | '')}>
        <option value="">{t('printRoutingRulesSection.testPanel.anyPlaceholder')}</option>
        {(Object.keys(EVENT_TRIGGER_TYPE_LABEL_KEY) as EventTriggerType[]).map(et => <option key={et} value={et}>{t(EVENT_TRIGGER_TYPE_LABEL_KEY[et])}</option>)}
      </select>

      <button className="ps-conf-btn-primary ps-mt-12" onClick={test}>{t('printRoutingRulesSection.testPanel.resolveButton')}</button>

      {result && (
        <div className="ps-rr-test-result-box">
          <div className="ps-rr-test-result-label">{t('printRoutingRulesSection.testPanel.resolvedDestinationLabel')}</div>
          <div className="ps-rr-test-result-value">{printDestinationText(result.destination) || '—'}</div>
          <div className="ps-rr-test-result-matched">
            {matchedRule && result.matchedScopeType
              ? t('printRoutingRulesSection.testPanel.matchedRule', { tier: t(SCOPE_TYPE_LABEL_KEY[result.matchedScopeType]), note: matchedRule.note || matchedRule.id })
              : t('printRoutingRulesSection.testPanel.noRuleMatched')}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main Component ───────────────────────────────────────────────────────────

const PrintRoutingRuleSection: React.FC = () => {
  const { t } = useTranslation();
  const [rules, setRules] = useState<PrintRoutingRule[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [pointsOfCare, setPointsOfCare] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ rule?: PrintRoutingRule } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [rulesRes, facilitiesRes, locationsRes] = await Promise.all([
      printRoutingRuleService.getAll(),
      facilityService.getAll(),
      locationService.getAll(),
    ]);
    if (rulesRes.ok) setRules(rulesRes.data);
    if (facilitiesRes.ok) setFacilities((facilitiesRes.data as Facility[]).filter(f => f.status === 'Active'));
    if (locationsRes.ok) {
      const distinct = Array.from(new Set(locationsRes.data.map(l => l.pointOfCare).filter(Boolean)));
      setPointsOfCare(distinct.sort());
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Batch 553: a refused save keeps the window open with the reason, instead of closing and losing the rule.
  const handleSave = async (data: Partial<PrintRoutingRule>) => {
    const res = modal?.rule
      ? await printRoutingRuleService.update(modal.rule.id, data)
      : await printRoutingRuleService.create(data as Omit<PrintRoutingRule, 'id' | 'createdAt' | 'updatedAt'>);
    if (res && res.ok === false) { setSaveError(routingRuleErrorKey(res.error)); return; }
    setSaveError(null);
    setModal(null);
    load();
  };
  const openModal = (next: { rule?: PrintRoutingRule } | null) => { setSaveError(null); setModal(next); };

  const handleDelete = async (id: string) => {
    await printRoutingRuleService.remove(id);
    load();
  };

  const handleToggle = async (rule: PrintRoutingRule) => {
    const res = await printRoutingRuleService.update(rule.id, { active: !rule.active });
    setListError(res && res.ok === false ? routingRuleErrorKey(res.error) : null);
    load();
  };

  const describeCriteria = (rule: PrintRoutingRule): string => {
    const parts: string[] = [];
    if (rule.specimenCaseType) parts.push(t('printRoutingRulesSection.criteriaDescription.specimenCaseType', { type: t(SPECIMEN_CASE_TYPE_LABEL_KEY[rule.specimenCaseType]) }));
    if (rule.eventTriggerType) parts.push(t('printRoutingRulesSection.criteriaDescription.eventTriggerType', { type: t(EVENT_TRIGGER_TYPE_LABEL_KEY[rule.eventTriggerType]) }));
    if (parts.length === 2) return t('printRoutingRulesSection.criteriaDescription.both', { first: parts[0], second: parts[1] });
    return parts.length ? parts[0] : t('printRoutingRulesSection.criteriaDescription.matchesEvery');
  };

  const describeScope = (rule: PrintRoutingRule): string => t('printRoutingRulesSection.scopeDescription', { tier: t(SCOPE_TYPE_LABEL_KEY[rule.scopeType]), id: rule.scopeId });
  // Batch 553: an agent printer is named with its site, except on a facility-tier rule (the scope already names it).
  const describeDestination = (rule: PrintRoutingRule): string => {
    const text = printDestinationText(rule.printDestination);
    const site = printDestinationSiteId(rule.printDestination);
    if (!site || rule.scopeType === 'facility') return text;
    return t('printDestination.atSite', { printer: text, site: facilities.find(f => f.id === site)?.name ?? site });
  };

  if (loading) return <LoadingState label={t('printRoutingRulesSection.loading')} />;

  return (
    <div className="ps-rr-root">
      <div className="ps-rr-header">
        <div>
          <h2 className="tmpl-list-title">{t('printRoutingRulesSection.title')}</h2>
          <p className="tmpl-list-subtitle">{t('printRoutingRulesSection.subtitle')}</p>
        </div>
        <button className="ps-conf-btn-primary" onClick={() => openModal({})}>{t('printRoutingRulesSection.addRuleButton')}</button>
      </div>
      {listError && <p className="ps-rr-modal-warn" role="alert">{t(listError)}</p>}

      <div className="ps-rr-layout">
        <div className="ps-rr-tables">
          <table className="ps-conf-table">
            <thead>
              <tr>
                <th>{t('printRoutingRulesSection.table.headers.scope')}</th>
                <th>{t('printRoutingRulesSection.table.headers.criteria')}</th>
                <th>{t('printRoutingRulesSection.table.headers.destination')}</th>
                <th>{t('printRoutingRulesSection.table.headers.note')}</th>
                <th>{t('common.active')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rules.length === 0 && (
                <tr><td colSpan={6} className="ps-rr-empty-row">{t('printRoutingRulesSection.table.emptyState')}</td></tr>
              )}
              {rules.map(rule => (
                <tr key={rule.id} className={rule.active ? undefined : 'ps-rr-row--inactive'}>
                  <td>{describeScope(rule)}</td>
                  <td>{describeCriteria(rule)}</td>
                  <td><span className="ps-rr-action-label">{describeDestination(rule)}</span></td>
                  <td>{rule.note ?? '—'}</td>
                  <td>
                    <button className="ps-rr-btn" onClick={() => handleToggle(rule)}>{rule.active ? t('common.active') : t('common.inactive')}</button>
                  </td>
                  <td>
                    <button className="ps-rr-btn" onClick={() => openModal({ rule })}>{t('common.edit')}</button>
                    <button className="ps-rr-btn ps-rr-btn--danger" onClick={() => handleDelete(rule.id)}>{t('common.delete')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <TestPanel rules={rules} facilities={facilities} pointsOfCare={pointsOfCare} />
      </div>

      {modal && (
        <RuleModal
          rule={modal.rule}
          facilities={facilities}
          pointsOfCare={pointsOfCare}
          onSave={handleSave}
          onClose={() => openModal(null)}
          saveError={saveError}
        />
      )}
    </div>
  );
};

export default PrintRoutingRuleSection;
