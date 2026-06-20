// src/services/routingRules/mockRoutingRuleService.ts
import type { IRoutingRuleService, RoutingRule, RoutingRuleType } from './IRoutingRuleService';
import type { ServiceResult, ID } from '../types';
import { storageGet, storageSet } from '../mockStorage';

const KEY     = 'pathscribe_routing_rules_v1';
const VERSION = 'routing_rules_v1';

function load(): RoutingRule[] {
  return storageGet<RoutingRule[]>(KEY) ?? [];
}
function save(rules: RoutingRule[]): void {
  storageSet(KEY, rules);
}
function genId(): string {
  return `rr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
function ok<T>(data: T): ServiceResult<T> {
  return { ok: true, data } as any;
}
function err(msg: string): ServiceResult<never> {
  return { ok: false, error: msg } as any;
}

export const mockRoutingRuleService: IRoutingRuleService = {
  async getAll() {
    return ok(load());
  },
  async getByType(type: RoutingRuleType) {
    return ok(load().filter(r => r.type === type));
  },
  async getById(id: ID) {
    const r = load().find(r => r.id === id);
    return r ? ok(r) : err(`Routing rule ${id} not found`);
  },
  async add(rule) {
    const rules = load();
    const now   = new Date().toISOString();
    const newRule: RoutingRule = {
      ...rule,
      id:        genId(),
      createdAt: now,
      updatedAt: now,
    };
    save([...rules, newRule]);
    return ok(newRule);
  },
  async update(id, changes) {
    const rules = load();
    const idx   = rules.findIndex(r => r.id === id);
    if (idx < 0) return err(`Routing rule ${id} not found`);
    const updated = { ...rules[idx], ...changes, updatedAt: new Date().toISOString() };
    rules[idx] = updated;
    save(rules);
    return ok(updated);
  },
  async remove(id) {
    save(load().filter(r => r.id !== id));
    return ok(undefined as void);
  },
  async getClientMap() {
    const rules = load().filter(r => r.type === 'client' && r.active);
    const map: Record<string, string> = {};
    rules.forEach(r => { map[r.entityId] = r.templateId; });
    return ok(map);
  },
  async getPhysicianMap() {
    const rules = load().filter(r => r.type === 'physician' && r.active);
    const map: Record<string, string> = {};
    rules.forEach(r => { map[r.entityId] = r.templateId; });
    return ok(map);
  },
};
