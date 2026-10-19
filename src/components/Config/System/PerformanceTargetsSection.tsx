// src/components/Config/System/PerformanceTargetsSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 610 (#87): Configuration → System → Performance Targets. What a
// pathologist is expected to sign out per period (cases, RVUs), and the other
// targets the lab tracks. The Productivity dashboard measures a person's actual
// cases and RVUs against Cases per Month and Monthly RVUs. Changing a target
// needs config:tat-targets:manage (checked by the service, audited, numbers
// only). The rules are in services/performanceTargets/performanceTargetRules.ts.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { performanceTargetService, type PerformanceTarget, type TargetPeriod, type TargetUnit } from '@/services';
import { TARGET_PERIODS, TARGET_UNITS } from '@/services/performanceTargets/performanceTargetRules';
import '@/pathscribe.css';

const K = 'performanceTargetsSection';
const unitKey = (u: TargetUnit) => (u === '%' ? 'percent' : u);

const PerformanceTargetsSection: React.FC = () => {
  const { t } = useTranslation();
  const [targets, setTargets] = useState<PerformanceTarget[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [adding, setAdding] = useState({ label: '', value: '', unit: 'cases' as TargetUnit, period: 'monthly' as TargetPeriod });

  const load = useCallback(async () => {
    const res = await performanceTargetService.getAll();
    if (res.ok) setTargets(res.data);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const finish = (res: { ok: boolean; error?: string }) => {
    if (res.ok) { setProblem(null); setSaved(true); setTimeout(() => setSaved(false), 2000); void load(); }
    else setProblem(res.error ?? 'valueInvalid');
    return res.ok;
  };

  const change = async (id: string, changes: Partial<PerformanceTarget>) => {
    const ok = finish(await performanceTargetService.update(id, changes));
    if (ok) setDrafts(d => { const { [id]: _gone, ...rest } = d; return rest; });
  };

  const commitValue = (target: PerformanceTarget) => {
    const raw = drafts[target.id];
    if (raw === undefined || Number(raw) === target.value) return;
    void change(target.id, { value: Number(raw) });
  };

  const add = async () => {
    const ok = finish(await performanceTargetService.add({
      key: '', label: adding.label, description: '', value: Number(adding.value), unit: adding.unit, period: adding.period, system: false,
    }));
    if (ok) setAdding(a => ({ ...a, label: '', value: '' }));
  };

  if (!targets) return null;

  return (
    <div>
      <div className="ps-rbuf-header">
        <h2 className="ps-rbuf-title">{t(`${K}.title`)}</h2>
        <p className="ps-rbuf-subtitle">{t(`${K}.subtitle`)}</p>
      </div>

      <div className="ps-conf-card ps-conf-card--spaced">
        <p className="ps-conf-card-description--tight">{t(`${K}.howItWorks`)}</p>
        {problem && <p className="ps-conf-error-text" role="alert">{t(`${K}.problems.${problem}`, { defaultValue: t(`${K}.problems.valueInvalid`) })}</p>}
        {saved && <p className="ps-conf-field-hint" role="status">{t(`${K}.saved`)}</p>}
        <div className="ps-conf-table-wrap">
          <table className="ps-conf-table">
            <thead>
              <tr>
                <th className="ps-conf-th">{t(`${K}.columns.target`)}</th>
                <th className="ps-conf-th">{t(`${K}.columns.value`)}</th>
                <th className="ps-conf-th">{t(`${K}.columns.unit`)}</th>
                <th className="ps-conf-th">{t(`${K}.columns.period`)}</th>
                <th className="ps-conf-th"><span className="ps-sr-only">{t(`${K}.columns.actions`)}</span></th>
              </tr>
            </thead>
            <tbody>
              {targets.map(target => (
                <tr key={target.id} className="ps-conf-tr">
                  <td className="ps-conf-td">
                    {target.label}
                    {target.system && <span className="ps-conf-badge">{t(`${K}.systemBadge`)}</span>}
                    {target.description && <div className="ps-conf-field-hint">{target.description}</div>}
                  </td>
                  <td className="ps-conf-td">
                    <input type="number" min={0} step="any" className="ps-conf-input ps-perf-target-value"
                      aria-label={t(`${K}.valueAria`, { target: target.label })}
                      value={drafts[target.id] ?? String(target.value)}
                      onChange={e => setDrafts(d => ({ ...d, [target.id]: e.target.value }))}
                      onBlur={() => commitValue(target)}
                      onKeyDown={e => { if (e.key === 'Enter') commitValue(target); }} />
                  </td>
                  <td className="ps-conf-td">
                    <select className="ps-conf-select" aria-label={t(`${K}.unitAria`, { target: target.label })} value={target.unit}
                      onChange={e => { void change(target.id, { unit: e.target.value as TargetUnit }); }}>
                      {TARGET_UNITS.map(u => <option key={u} value={u}>{t(`${K}.units.${unitKey(u)}`)}</option>)}
                    </select>
                  </td>
                  <td className="ps-conf-td">
                    <select className="ps-conf-select" aria-label={t(`${K}.periodAria`, { target: target.label })} value={target.period}
                      onChange={e => { void change(target.id, { period: e.target.value as TargetPeriod }); }}>
                      {TARGET_PERIODS.map(p => <option key={p} value={p}>{t(`${K}.periods.${p}`)}</option>)}
                    </select>
                  </td>
                  <td className="ps-conf-td">
                    <button type="button" className="ps-conf-btn-secondary" disabled={target.system}
                      title={target.system ? t(`${K}.systemCannotRemove`) : undefined}
                      aria-label={t(`${K}.removeAria`, { target: target.label })}
                      onClick={() => { void performanceTargetService.delete(target.id).then(finish); }}>
                      {t(`${K}.remove`)}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="ps-conf-card ps-conf-card--spaced">
        <div className="ps-conf-card-title">{t(`${K}.add.title`)}</div>
        <div className="ps-perf-target-add">
          <input className="ps-conf-input" aria-label={t(`${K}.add.label`)} placeholder={t(`${K}.add.label`)}
            value={adding.label} onChange={e => setAdding(a => ({ ...a, label: e.target.value }))} />
          <input type="number" min={0} step="any" className="ps-conf-input ps-perf-target-value" aria-label={t(`${K}.add.value`)} placeholder={t(`${K}.add.value`)}
            value={adding.value} onChange={e => setAdding(a => ({ ...a, value: e.target.value }))} />
          <select className="ps-conf-select" aria-label={t(`${K}.columns.unit`)} value={adding.unit}
            onChange={e => setAdding(a => ({ ...a, unit: e.target.value as TargetUnit }))}>
            {TARGET_UNITS.map(u => <option key={u} value={u}>{t(`${K}.units.${unitKey(u)}`)}</option>)}
          </select>
          <select className="ps-conf-select" aria-label={t(`${K}.columns.period`)} value={adding.period}
            onChange={e => setAdding(a => ({ ...a, period: e.target.value as TargetPeriod }))}>
            {TARGET_PERIODS.map(p => <option key={p} value={p}>{t(`${K}.periods.${p}`)}</option>)}
          </select>
          <button type="button" className="ps-conf-btn-primary" onClick={() => { void add(); }}>{t(`${K}.add.button`)}</button>
        </div>
        <p className="ps-conf-field-hint">{t(`${K}.dashboardNote`)}</p>
      </div>
    </div>
  );
};

export default PerformanceTargetsSection;
