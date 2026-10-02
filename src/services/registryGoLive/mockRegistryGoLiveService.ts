// src/services/registryGoLive/mockRegistryGoLiveService.ts
// Batch 423: browser storage for go-live records and settings. The permission
// checks are in registryGoLive.ts, the only path that writes here. The SQL
// Server table should be append-only for everything but status, approvals and
// the closing fields (see docs/architecture/REGISTRY_GO_LIVE_API.md).
import type { IRegistryGoLiveService } from './IRegistryGoLiveService';
import type { RegistryGoLiveRecord } from './registryGoLiveRules';
import type { RegistryAgreement, StoredValidationRecord } from './IRegistryGoLiveService';
import type { RegistryAdapterRule } from './registryOverlay';
import { normalizeRegistryGoLiveGovernance } from './registryGoLiveRules';
import { storageGet, storageSet } from '../mockStorage';

const RECORDS_KEY = 'registryGoLiveRecords';
const GOVERNANCE_KEY = 'registryGoLiveGovernance';
// Batch 424
const AGREEMENTS_KEY = 'registryAgreements';
const ADAPTER_RULES_KEY = 'registryAdapterRules';
const VALIDATION_KEY = 'registryValidationRecords';
const load = () => storageGet<RegistryGoLiveRecord[]>(RECORDS_KEY, []);
const save = (records: RegistryGoLiveRecord[]) => storageSet(RECORDS_KEY, records);

function change(id: string, from: RegistryGoLiveRecord['status'][], apply: (r: RegistryGoLiveRecord) => RegistryGoLiveRecord) {
  const records = load();
  const i = records.findIndex(r => r.id === id);
  if (i < 0) return { ok: false as const, error: `Go-live record ${id} not found` };
  if (!from.includes(records[i].status)) return { ok: false as const, error: `Go-live record ${id} is ${records[i].status}` };
  records[i] = apply(records[i]);
  save(records);
  return { ok: true as const, data: records[i] };
}

export const mockRegistryGoLiveService: IRegistryGoLiveService = {
  async list(domain, registryId) {
    return { ok: true, data: load().filter(r => r.domain === domain && r.registryId === registryId).sort((a, b) => b.preparedAt.localeCompare(a.preparedAt)) };
  },
  async get(id) {
    return { ok: true, data: load().find(r => r.id === id) };
  },
  async create(record) {
    save([...load(), record]);
    return { ok: true, data: record };
  },
  async addApproval(id, approval) {
    return change(id, ['inReview'], r => ({ ...r, approvals: [...r.approvals, approval] }));
  },
  async markLive(id, live) {
    return change(id, ['inReview'], r => ({ ...r, ...live, status: 'live' }));
  },
  async close(id, closed) {
    return change(id, ['inReview', 'live'], r => ({ ...r, ...closed, status: r.status === 'live' ? 'ended' : 'withdrawn' }));
  },
  async getGovernance() {
    return { ok: true, data: normalizeRegistryGoLiveGovernance(storageGet(GOVERNANCE_KEY, null)) };
  },
  async saveGovernance(next) {
    const saved = normalizeRegistryGoLiveGovernance(next);
    storageSet(GOVERNANCE_KEY, saved);
    return { ok: true, data: saved };
  },
  async getAgreement(domain, registryId) {
    const all = storageGet<RegistryAgreement[]>(AGREEMENTS_KEY, []).filter(a => a.domain === domain && a.registryId === registryId);
    return { ok: true, data: all[all.length - 1] };
  },
  async recordAgreement(agreement) {
    storageSet(AGREEMENTS_KEY, [...storageGet<RegistryAgreement[]>(AGREEMENTS_KEY, []), agreement]);
    return { ok: true, data: agreement };
  },
  async listAdapterRules(domain, registryId) {
    return { ok: true, data: storageGet<RegistryAdapterRule[]>(ADAPTER_RULES_KEY, []).filter(r => r.domain === domain && r.registryId === registryId) };
  },
  async saveAdapterRule(rule) {
    storageSet(ADAPTER_RULES_KEY, [...storageGet<RegistryAdapterRule[]>(ADAPTER_RULES_KEY, []).filter(r => r.id !== rule.id), rule]);
    return { ok: true, data: rule };
  },
  async removeAdapterRule(id) {
    storageSet(ADAPTER_RULES_KEY, storageGet<RegistryAdapterRule[]>(ADAPTER_RULES_KEY, []).filter(r => r.id !== id));
    return { ok: true, data: undefined };
  },
  async listValidationRecords(domain, registryId) {
    return { ok: true, data: storageGet<StoredValidationRecord[]>(VALIDATION_KEY, []).filter(v => v.record.domain === domain && v.record.registryId === registryId).sort((a, b) => b.storedAt.localeCompare(a.storedAt)) };
  },
  async saveValidationRecord(stored) {
    storageSet(VALIDATION_KEY, [...storageGet<StoredValidationRecord[]>(VALIDATION_KEY, []), stored]);
    return { ok: true, data: stored };
  },
};
