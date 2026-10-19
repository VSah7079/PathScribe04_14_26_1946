// src/components/Config/System/CodeSystemsSection.tsx
// ─────────────────────────────────────────────────────────────────────
// Batch 595: Configuration → System → Code Systems. For each jurisdiction the
// laboratory serves: which code systems (ICD-10, ICD-11, ICD-O, SNOMED CT ...)
// are off, optional or required, and from what date, so a move from ICD-10 to
// ICD-11 is a setting, not a software change. Changing a policy needs
// config:code-systems:manage, checked and audited by codeSystemPolicyService;
// the decisions are in services/coding/. Nothing reads the policy yet (the Add
// Code window and sign-out will; Planned).
// ─────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  codeSystemPolicyService, defaultCodePolicy, KNOWN_CODE_SYSTEMS,
  type CodeSystemPolicy, type CodeSystemRole, type CodeSystemRule, type CodeSystemPolicyRecord,
} from '@/services';
import { policyStatuses } from '@/services/coding/codeSystemPolicy';
import type { Jurisdiction } from '@/types/systemConfig';
import { formatDate } from '@/utils/formatDate';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import '@/pathscribe.css';

const K = 'codeSystemsSection';
const ROLES: readonly CodeSystemRole[] = ['off', 'optional', 'required'];

interface Row { system: string; role: CodeSystemRole; from: string }
interface Editing { jurisdiction: Jurisdiction; rows: Row[] }

const toRows = (rules: readonly CodeSystemRule[]): Row[] => rules.map(r => ({ system: r.system, role: r.role, from: r.from ?? '' }));

const CodeSystemsSection: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [records, setRecords] = useState<CodeSystemPolicyRecord[]>([]);
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([]);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    const [res, served] = await Promise.all([codeSystemPolicyService.list(), codeSystemPolicyService.served()]);
    if (res.ok) setRecords(res.data);
    setJurisdictions(served);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const today = new Date().toISOString().slice(0, 10);
  const recordFor = (j: Jurisdiction) => records.find(r => r.jurisdiction === j) ?? null;
  const policyOf = (j: Jurisdiction): CodeSystemPolicy => recordFor(j) ?? defaultCodePolicy(j);
  const systemName = (id: string) => t(`addCodeModal.systemLabel.${id}`, { defaultValue: id });
  const roleName = (r: CodeSystemRole) => t(`${K}.role.${r}`);

  const done = (res: { ok: boolean; data?: CodeSystemPolicyRecord[]; error?: string }) => {
    if (res.ok && res.data) {
      setRecords(res.data); setEditing(null); setProblem(null);
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } else setProblem(res.error ?? 'error');
  };

  const save = async () => {
    if (!editing) return;
    done(await codeSystemPolicyService.save({
      jurisdiction: editing.jurisdiction,
      rules: editing.rows.map(r => ({ system: r.system, role: r.role, ...(r.from ? { from: r.from } : {}) })),
    }));
  };

  const setRow = (i: number, patch: Partial<Row>) =>
    setEditing(e => e && ({ ...e, rows: e.rows.map((r, n) => (n === i ? { ...r, ...patch } : r)) }));

  return (
    <div className="ps-conf-card ps-conf-card--spaced">
      <div className="ps-conf-card-title">{t(`${K}.title`)}</div>
      <p className="ps-conf-card-description--tight">{t(`${K}.description`)}</p>
      <p className="ps-conf-field-hint">{t(`${K}.notYetUsed`)}</p>

      <div className="ps-conf-table-wrap">
        <table className="ps-conf-table">
          <thead>
            <tr>
              <th className="ps-conf-th">{t(`${K}.columns.where`)}</th>
              <th className="ps-conf-th">{t(`${K}.columns.today`)}</th>
              <th className="ps-conf-th">{t(`${K}.columns.source`)}</th>
              <th className="ps-conf-th"><span className="ps-sr-only">{t(`${K}.columns.actions`)}</span></th>
            </tr>
          </thead>
          <tbody>
            {jurisdictions.map(j => {
              const rec = recordFor(j);
              const statuses = policyStatuses(policyOf(j), today).filter(s => s.role !== 'off' || s.next);
              return (
                <tr key={j} className="ps-conf-tr">
                  <td className="ps-conf-td">{t(`jurisdictionNames.${j}`)}</td>
                  <td className="ps-conf-td">
                    {statuses.length === 0 && t(`${K}.noneInUse`)}
                    {statuses.map(s => (
                      <div key={s.system}>
                        {t(`${K}.summary`, { system: systemName(s.system), role: roleName(s.role) })}
                        {s.next && <span className="ps-conf-field-hint"> {t(`${K}.summaryNext`, { role: roleName(s.next.role), date: formatDate(s.next.from, i18n.language) })}</span>}
                      </div>
                    ))}
                  </td>
                  <td className="ps-conf-td">{rec ? t(`${K}.source.custom`) : t(`${K}.source.default`)}</td>
                  <td className="ps-conf-td">
                    <CapabilityButton capability="config:code-systems:manage" className="ps-conf-btn-secondary"
                      onClick={() => { setProblem(null); setEditing({ jurisdiction: j, rows: toRows(policyOf(j).rules) }); }}>
                      {t(`${K}.edit`)}
                    </CapabilityButton>
                    {rec && (
                      <CapabilityButton capability="config:code-systems:manage" className="ps-conf-btn-secondary"
                        onClick={() => { void codeSystemPolicyService.reset(j).then(done); }}>
                        {t(`${K}.reset`)}
                      </CapabilityButton>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="ps-aivendor-editor">
          <div className="ps-conf-card-title">{t(`${K}.editing`, { where: t(`jurisdictionNames.${editing.jurisdiction}`) })}</div>
          <p className="ps-conf-field-hint">{t(`${K}.rulesHint`)}</p>
          {editing.rows.map((r, i) => (
            <div key={i} className="ps-aivendor-service">
              <input type="text" list="ps-code-system-ids" className="ps-conf-input" aria-label={t(`${K}.systemLabel`)}
                value={r.system} onChange={e => setRow(i, { system: e.target.value })} />
              <select className="ps-conf-select" aria-label={t(`${K}.roleLabel`)} value={r.role}
                onChange={e => setRow(i, { role: e.target.value as CodeSystemRole })}>
                {ROLES.map(x => <option key={x} value={x}>{roleName(x)}</option>)}
              </select>
              <input type="date" className="ps-conf-input" aria-label={t(`${K}.fromLabel`)} value={r.from}
                onChange={e => setRow(i, { from: e.target.value })} />
              <button type="button" className="ps-conf-btn-secondary" data-config-nav
                onClick={() => setEditing(e => e && ({ ...e, rows: e.rows.filter((_, n) => n !== i) }))}>
                {t(`${K}.removeRule`)}
              </button>
            </div>
          ))}
          <datalist id="ps-code-system-ids">
            {KNOWN_CODE_SYSTEMS.map(id => <option key={id} value={id}>{systemName(id)}</option>)}
          </datalist>
          <p className="ps-conf-field-hint">{t(`${K}.fromHint`)}</p>
          <div className="ps-mmrules-add">
            <button type="button" className="ps-conf-btn-secondary" data-config-nav
              onClick={() => setEditing(e => e && ({ ...e, rows: [...e.rows, { system: '', role: 'optional', from: '' }] }))}>
              {t(`${K}.addRule`)}
            </button>
          </div>
          <div className="ps-aiinstr-actions">
            <CapabilityButton capability="config:code-systems:manage" className="ps-conf-btn-primary" onClick={() => { void save(); }}>{t(`${K}.save`)}</CapabilityButton>
            <button type="button" className="ps-conf-btn-secondary" data-config-nav onClick={() => { setEditing(null); setProblem(null); }}>{t('common.cancel')}</button>
          </div>
        </div>
      )}

      {problem && <p className="ps-mmrules-problem" role="alert">{t(`${K}.problems.${problem}`, { defaultValue: t(`${K}.problems.error`) })}</p>}
      {saved && <div className="ps-concordance__saved">✓ {t(`${K}.saved`)}</div>}
    </div>
  );
};

export default CodeSystemsSection;
