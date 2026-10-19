// src/services/performanceTargets/mockPerformanceTargetService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 610 (#87): performance targets (cases and RVUs per period) are kept in
// the browser through mockStorage under 'performance_targets_v1' (cleared by
// Demo Reset). With nothing stored the starting targets below apply. Every
// change needs the TAT-and-targets capability and is written to the audit log
// (numbers only). The four system targets cannot be deleted.
// ─────────────────────────────────────────────────────────────────────────────
import type { PerformanceTarget, IPerformanceTargetService } from './IPerformanceTargetService';
import type { ServiceResult } from '../types';
import { storageGet, storageSet } from '../mockStorage';
import { guardConfigWrites } from '../authorization/guardConfigWrites';
import { mockAuditService } from '../auditlog/mockAuditService';
import { readSessionProfile } from '../auth/sessionProfile';
import { performanceTargetAudit, targetKeyFromLabel, validatePerformanceTarget } from './performanceTargetRules';

export const PERFORMANCE_TARGETS_STORAGE_KEY = 'performance_targets_v1';
export const PERFORMANCE_TARGETS_MANAGE = 'config:tat-targets:manage';

const ok  = <T>(d: T): ServiceResult<T>     => ({ ok: true,  data: d });
const err = <T>(m: string): ServiceResult<T> => ({ ok: false, error: m });

export const STARTING_PERFORMANCE_TARGETS: readonly PerformanceTarget[] = [
  { id:'pt-1', key:'cases_monthly', label:'Cases per Month',    description:'Total cases signed out per pathologist per month', value:120, unit:'cases', period:'monthly',   system:true  },
  { id:'pt-2', key:'tat_routine',   label:'Routine TAT',        description:'Average turnaround for routine cases',             value:48,  unit:'hours', period:'monthly',   system:true  },
  { id:'pt-3', key:'tat_stat',      label:'STAT TAT',           description:'Average turnaround for STAT cases',               value:4,   unit:'hours', period:'monthly',   system:true  },
  { id:'pt-4', key:'qc_signout',    label:'QC Sign-out Rate',   description:'Cases passing QC before finalisation',            value:98,  unit:'%',     period:'quarterly', system:true  },
  { id:'pt-5', key:'rvu_monthly',   label:'Monthly RVUs',       description:'Relative value units per pathologist per month',  value:350, unit:'RVUs',  period:'monthly',   system:false },
];

const load = (): PerformanceTarget[] => {
  const stored = storageGet<PerformanceTarget[] | null>(PERFORMANCE_TARGETS_STORAGE_KEY, null);
  return stored ? stored.map(t => ({ ...t })) : STARTING_PERFORMANCE_TARGETS.map(t => ({ ...t }));
};
const save = (targets: PerformanceTarget[]) => storageSet(PERFORMANCE_TARGETS_STORAGE_KEY, targets);

const actor = () => { const p = readSessionProfile(); return p?.name || p?.id || 'unknown'; };
const record = (entry: ReturnType<typeof performanceTargetAudit>) => mockAuditService.logEvent(entry).catch(() => {});

const unchecked: IPerformanceTargetService = {
  async getAll()       { return ok(load()); },
  async getById(id)    { return ok(load().find(x => x.id === id) ?? null); },
  async getByKey(key)  { return ok(load().find(x => x.key === key) ?? null); },

  async add(t) {
    const all = load();
    const key = t.key || targetKeyFromLabel(t.label);
    const problem = validatePerformanceTarget({ ...t, key }, all);
    if (problem) return err(problem);
    const created: PerformanceTarget = { ...t, key, label: t.label.trim(), system: false, id: `pt-${Date.now().toString(36)}` };
    save([...all, created]);
    await record(performanceTargetAudit('added', created, actor()));
    return ok(created);
  },

  async update(id, changes) {
    const all = load();
    const i = all.findIndex(x => x.id === id);
    if (i < 0) return err('NOT_FOUND');
    const before = all[i];
    // A system target keeps its key and cannot be turned into a custom one.
    const merged: PerformanceTarget = { ...before, ...changes, id: before.id, system: before.system, key: before.system ? before.key : (changes.key ?? before.key) };
    const problem = validatePerformanceTarget(merged, all);
    if (problem) return err(problem);
    all[i] = merged;
    save(all);
    await record(performanceTargetAudit('changed', merged, actor(), before));
    return ok(merged);
  },

  async delete(id) {
    const all = load();
    const target = all.find(x => x.id === id);
    if (!target) return err('NOT_FOUND');
    if (target.system) return err('SYSTEM_TARGET');
    save(all.filter(x => x.id !== id));
    await record(performanceTargetAudit('removed', target, actor()));
    return ok(undefined);
  },
};

/** Every change needs the TAT-and-targets capability (guardConfigWrites). */
export const mockPerformanceTargetService: IPerformanceTargetService = guardConfigWrites(unchecked, [
  [PERFORMANCE_TARGETS_MANAGE, ['add', 'update', 'delete']],
]);
