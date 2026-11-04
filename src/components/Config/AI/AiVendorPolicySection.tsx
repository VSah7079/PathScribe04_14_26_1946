// src/components/Config/AI/AiVendorPolicySection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 536 (PS-558): Configuration → AI Behavior → AI vendor policy. For each
// jurisdiction the laboratory serves (and any facility given a rule of its
// own): which AI services, and which hosting regions, are allowed, and
// whether the service in use is allowed there. No rule means every service is
// allowed. Changing a rule needs config:ai-vendor-policy:manage, checked and
// audited by aiVendorPolicyService; the decisions are in aiVendorPolicy.ts.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  aiVendorPolicyService, aiVendorScopeStatuses, parseRegionList, AI_POLICY_SERVICES,
  type AiPolicyService, type AiVendorRule, type AiVendorRuleScope, type ServedFacility,
} from '@/services';
import type { Jurisdiction } from '@/types/systemConfig';
import { aiHostingRegion, aiProviderLabel, resolveAiConfig } from './aiProviderConfig';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import '@/pathscribe.css';

const K = 'aiVendorPolicySection';

interface Editing {
  scope: AiVendorRuleScope;
  all: boolean;
  services: AiPolicyService[];
  regions: Partial<Record<AiPolicyService, string>>;
}

const editingFrom = (scope: AiVendorRuleScope, rule: AiVendorRule | null): Editing => ({
  scope,
  all: !rule?.allowedServices,
  services: rule?.allowedServices ?? [...AI_POLICY_SERVICES],
  regions: Object.fromEntries(Object.entries(rule?.allowedRegions ?? {}).map(([k, v]) => [k, (v ?? []).join(', ')])),
});

const AiVendorPolicySection: React.FC = () => {
  const { t } = useTranslation();
  const [rules, setRules] = useState<AiVendorRule[]>([]);
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([]);
  const [facilities, setFacilities] = useState<ServedFacility[]>([]);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [newFacility, setNewFacility] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    const [res, served] = await Promise.all([aiVendorPolicyService.list(), aiVendorPolicyService.served()]);
    if (res.ok) setRules(res.data);
    setJurisdictions(served.jurisdictions);
    setFacilities(served.facilities);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const config = resolveAiConfig();
  const call = { providerId: config.providerId, region: aiHostingRegion(config) };
  const statuses = aiVendorScopeStatuses(rules, jurisdictions, call);
  const facilityName = (id?: string) => facilities.find(f => f.id === id)?.name ?? id ?? '';
  const scopeName = (s: AiVendorRuleScope) => s.facilityId
    ? t(`${K}.facilityScope`, { facility: facilityName(s.facilityId), jurisdiction: t(`jurisdictionNames.${s.jurisdiction}`) })
    : t(`jurisdictionNames.${s.jurisdiction}`);

  const done = (res: { ok: boolean; data?: AiVendorRule[]; error?: string }) => {
    if (res.ok && res.data) {
      setRules(res.data); setEditing(null); setProblem(null);
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } else setProblem(res.error ?? 'error');
  };

  const save = async () => {
    if (!editing) return;
    const allowedRegions: AiVendorRule['allowedRegions'] = {};
    for (const s of AI_POLICY_SERVICES) {
      const list = parseRegionList(editing.regions[s] ?? '');
      if (list.length && (editing.all || editing.services.includes(s))) allowedRegions[s] = list;
    }
    done(await aiVendorPolicyService.save({ scope: editing.scope, allowedServices: editing.all ? null : editing.services, allowedRegions }));
  };

  const toggleService = (s: AiPolicyService, on: boolean) => setEditing(e => e && ({
    ...e, services: on ? [...new Set([...e.services, s])] : e.services.filter(x => x !== s),
  }));

  return (
    <div className="ps-conf-card ps-conf-card--spaced">
      <div className="ps-conf-card-title">{t(`${K}.title`)}</div>
      <p className="ps-conf-card-description--tight">{t(`${K}.description`)}</p>
      <p className="ps-conf-field-hint">
        {t(`${K}.inUse`, { service: aiProviderLabel(config.providerId, t), model: config.modelId, region: call.region ?? t(`${K}.regionNotRecorded`) })}
      </p>

      <div className="ps-conf-table-wrap">
        <table className="ps-conf-table">
          <thead>
            <tr>
              <th className="ps-conf-th">{t(`${K}.columns.where`)}</th>
              <th className="ps-conf-th">{t(`${K}.columns.allowed`)}</th>
              <th className="ps-conf-th">{t(`${K}.columns.inUse`)}</th>
              <th className="ps-conf-th"><span className="ps-sr-only">{t(`${K}.columns.actions`)}</span></th>
            </tr>
          </thead>
          <tbody>
            {statuses.map(st => (
              <tr key={`${st.scope.jurisdiction}|${st.scope.facilityId ?? ''}`} className="ps-conf-tr">
                <td className="ps-conf-td">{scopeName(st.scope)}</td>
                <td className="ps-conf-td">
                  {!st.rule ? t(`${K}.noRule`) : !st.rule.allowedServices
                    ? t(`${K}.allServices`)
                    : st.rule.allowedServices.map(s => aiProviderLabel(s, t)).join(', ')}
                  {st.rule && Object.entries(st.rule.allowedRegions).map(([s, r]) => (
                    <div key={s} className="ps-conf-field-hint">{t(`${K}.regionsFor`, { service: aiProviderLabel(s as AiPolicyService, t), regions: (r ?? []).join(', ') })}</div>
                  ))}
                </td>
                <td className={`ps-conf-td ${st.decision.allowed ? 'ps-aivendor-ok' : 'ps-aivendor-refused'}`} role="status">
                  {st.decision.allowed ? t(`${K}.status.allowed`) : t(`${K}.status.${st.decision.refusal}`)}
                </td>
                <td className="ps-conf-td">
                  <CapabilityButton capability="config:ai-vendor-policy:manage" className="ps-conf-btn-secondary" onClick={() => setEditing(editingFrom(st.scope, st.rule))}>
                    {t(`${K}.edit`)}
                  </CapabilityButton>
                  {st.rule && (
                    <CapabilityButton capability="config:ai-vendor-policy:manage" className="ps-conf-btn-secondary" onClick={() => { void aiVendorPolicyService.remove(st.scope).then(done); }}>
                      {t(`${K}.remove`)}
                    </CapabilityButton>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ps-mmrules-add">
        <select className="ps-conf-select" aria-label={t(`${K}.addFacility`)} value={newFacility} onChange={e => setNewFacility(e.target.value)}>
          <option value="">{t(`${K}.chooseFacility`)}</option>
          {facilities.filter(f => !rules.some(r => r.scope.facilityId === f.id)).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <CapabilityButton capability="config:ai-vendor-policy:manage" className="ps-conf-btn-secondary" disabled={!newFacility}
          onClick={() => {
            const f = facilities.find(x => x.id === newFacility);
            if (f) setEditing(editingFrom({ jurisdiction: f.jurisdiction, facilityId: f.id }, null));
            setNewFacility('');
          }}>
          {t(`${K}.addFacility`)}
        </CapabilityButton>
      </div>

      {editing && (
        <div className="ps-aivendor-editor">
          <div className="ps-conf-card-title">{t(`${K}.editing`, { where: scopeName(editing.scope) })}</div>
          {editing.scope.facilityId && <p className="ps-conf-field-hint">{t(`${K}.facilityNarrows`)}</p>}
          <label className="ps-conf-toggle-label-row">
            <input type="checkbox" checked={editing.all} onChange={e => setEditing({ ...editing, all: e.target.checked })} />
            <span className="ps-conf-option-text">{t(`${K}.allowAll`)}</span>
          </label>
          {AI_POLICY_SERVICES.map(s => (
            <div key={s} className="ps-aivendor-service">
              <label className="ps-conf-toggle-label-row">
                <input type="checkbox" disabled={editing.all} checked={editing.all || editing.services.includes(s)} onChange={e => toggleService(s, e.target.checked)} />
                <span className="ps-conf-option-text">{aiProviderLabel(s, t)}</span>
              </label>
              <input type="text" className="ps-conf-input ps-aivendor-regions" aria-label={t(`${K}.regionsLabel`, { service: aiProviderLabel(s, t) })}
                placeholder={t(`${K}.anyRegion`)} disabled={!editing.all && !editing.services.includes(s)}
                value={editing.regions[s] ?? ''} onChange={e => setEditing({ ...editing, regions: { ...editing.regions, [s]: e.target.value } })} />
            </div>
          ))}
          <p className="ps-conf-field-hint">{t(`${K}.regionsHint`)}</p>
          <div className="ps-aiinstr-actions">
            <CapabilityButton capability="config:ai-vendor-policy:manage" className="ps-conf-btn-primary" onClick={() => { void save(); }}>{t(`${K}.save`)}</CapabilityButton>
            <button type="button" className="ps-conf-btn-secondary" data-config-nav onClick={() => { setEditing(null); setProblem(null); }}>{t('common.cancel')}</button>
          </div>
        </div>
      )}

      {problem && <p className="ps-mmrules-problem" role="alert">{t(`${K}.problems.${problem}`, { defaultValue: t(`${K}.problems.error`) })}</p>}
      {saved && <div className="ps-concordance__saved">✓ {t(`${K}.saved`)}</div>}
    </div>
  );
};

export default AiVendorPolicySection;
