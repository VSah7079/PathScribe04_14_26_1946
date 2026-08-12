// src/services/grossingRoutingOverrides/mockGrossingRoutingOverrideService.ts

import type { ServiceResult, ID } from '../types';
import { storageGet, storageSet } from '../mockStorage';
import type {
  IGrossingRoutingOverrideService,
  GrossingRoutingOverrideEntry,
  GrossingRoutingOverrideInput,
} from './IGrossingRoutingOverrideService';

// One real seed example so the admin screen demonstrates a genuinely
// working case on first view, rather than opening empty with nothing
// to point at — this feature existed as a data contract with no way to
// populate it until now, so there's no real prior data to carry over.
// specimenType is free text, matched by exact equality against the
// real Specimen Dictionary's own type field (sp._entry?.type) in the
// actual Pass G0 matching logic — "Kidney" is the one real value
// currently seeded there. Westside Surgical Centre's local nephrology
// group prefers kidney biopsies go straight to direct triage rather
// than the standard grossing bench — a real reason an override would
// exist, not just a restatement of the category's own default.
const load = () => storageGet<GrossingRoutingOverrideEntry[]>('pathscribe_grossing_routing_overrides', [
  {
    id: 'gro-001',
    clientId: 'c-westside',
    specimenType: 'Kidney',
    grossingTemplateId: 'grossing_histology_only',
    active: true,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  },
]);

const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const err = <T>(error: string): ServiceResult<T> => ({ ok: false, error });
const delay = () => new Promise(r => setTimeout(r, 100));

export const mockGrossingRoutingOverrideService: IGrossingRoutingOverrideService = {
  async getAll() {
    await delay();
    return ok(load());
  },

  async add(entry: GrossingRoutingOverrideInput) {
    await delay();
    const all = load();
    const now = new Date().toISOString();
    const created: GrossingRoutingOverrideEntry = {
      ...entry,
      id: `gro-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    storageSet('pathscribe_grossing_routing_overrides', [...all, created]);
    return ok(created);
  },

  async update(id: ID, changes: Partial<GrossingRoutingOverrideInput>) {
    await delay();
    const all = load();
    const idx = all.findIndex(e => e.id === id);
    if (idx === -1) return err('Override not found');
    const updated: GrossingRoutingOverrideEntry = {
      ...all[idx],
      ...changes,
      updatedAt: new Date().toISOString(),
    };
    const next = [...all];
    next[idx] = updated;
    storageSet('pathscribe_grossing_routing_overrides', next);
    return ok(updated);
  },

  async remove(id: ID) {
    await delay();
    const all = load();
    storageSet('pathscribe_grossing_routing_overrides', all.filter(e => e.id !== id));
    return ok(undefined as any);
  },
};
