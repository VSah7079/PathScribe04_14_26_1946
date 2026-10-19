// src/services/clientSLA/mockClientSLAService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 610 (#164): client service-level targets are kept in the browser
// through mockStorage under 'client_sla_v1' (cleared by Demo Reset). Nothing is
// stored to begin with: a client has no SLA until an administrator sets one.
// Every change needs the TAT-and-targets capability and is written to the
// audit log (hours only).
// ─────────────────────────────────────────────────────────────────────────────
import type { ClientSLA, IClientSLAService } from './IClientSLAService';
import type { ServiceResult } from '../types';
import { storageGet, storageSet } from '../mockStorage';
import { guardConfigWrites } from '../authorization/guardConfigWrites';
import { mockAuditService } from '../auditlog/mockAuditService';
import { readSessionProfile } from '../auth/sessionProfile';
import { clientSlaAudit, validateClientSla } from './clientSlaRules';

export const CLIENT_SLA_STORAGE_KEY = 'client_sla_v1';
export const CLIENT_SLA_MANAGE = 'config:tat-targets:manage';

const ok  = <T>(d: T): ServiceResult<T>     => ({ ok: true,  data: d });
const err = <T>(m: string): ServiceResult<T> => ({ ok: false, error: m });

const load = (): ClientSLA[] => storageGet<ClientSLA[]>(CLIENT_SLA_STORAGE_KEY, []).map(s => ({ ...s }));
const save = (slas: ClientSLA[]) => storageSet(CLIENT_SLA_STORAGE_KEY, slas);
const actor = () => { const p = readSessionProfile(); return p?.name || p?.id || 'unknown'; };
const record = (entry: ReturnType<typeof clientSlaAudit>) => mockAuditService.logEvent(entry).catch(() => {});

const unchecked: IClientSLAService = {
  async getAll()    { return ok(load()); },
  async getById(id) { return ok(load().find(s => s.id === id) ?? null); },
  async getByAssigningAuthority(assigningAuthority) {
    const wanted = assigningAuthority.trim().toLowerCase();
    return ok(load().find(s => s.assigningAuthority.trim().toLowerCase() === wanted) ?? null);
  },

  async add(sla) {
    const all = load();
    const problem = validateClientSla(sla, all);
    if (problem) return err(problem);
    const created: ClientSLA = { ...sla, assigningAuthority: sla.assigningAuthority.trim(), clientName: sla.clientName.trim(), id: `sla-${Date.now().toString(36)}` };
    save([...all, created]);
    await record(clientSlaAudit('added', created, actor()));
    return ok(created);
  },

  async update(id, changes) {
    const all = load();
    const i = all.findIndex(s => s.id === id);
    if (i < 0) return err('NOT_FOUND');
    const merged: ClientSLA = { ...all[i], ...changes, id: all[i].id };
    const problem = validateClientSla(merged, all);
    if (problem) return err(problem);
    all[i] = merged;
    save(all);
    await record(clientSlaAudit('changed', merged, actor()));
    return ok(merged);
  },

  async delete(id) {
    const all = load();
    const sla = all.find(s => s.id === id);
    if (!sla) return err('NOT_FOUND');
    save(all.filter(s => s.id !== id));
    await record(clientSlaAudit('removed', sla, actor()));
    return ok(undefined);
  },
};

/** Every change needs the TAT-and-targets capability (guardConfigWrites). */
export const mockClientSLAService: IClientSLAService = guardConfigWrites(unchecked, [
  [CLIENT_SLA_MANAGE, ['add', 'update', 'delete']],
]);
