// src/services/molecular/mockMolecularAssayControlRuleService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per the given specification's own §3.2 "Dynamic Control
// Rules" / "Position Enforcements" — see
// IMolecularAssayControlRuleService.ts's own header for the full
// account of why this exists.
// ─────────────────────────────────────────────────────────────────────────────

import { storageGet, storageSet } from '../mockStorage';
import { withSeedFieldBackfill } from '../mockSeedMerge';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import type {
  IMolecularAssayControlRuleService, MolecularAssayControlRule, NewMolecularAssayControlRule,
} from './IMolecularAssayControlRuleService';
import { MOLECULAR_CONTROL_RULE_NOT_PERMITTED, MOLECULAR_CONTROL_RULE_DUPLICATE, MOLECULAR_CONTROL_RULE_NOT_FOUND } from './IMolecularAssayControlRuleService';
import { normaliseDeckSlotId } from '../equipment/equipmentRules';

const STORE_KEY = 'molecular_assay_control_rules';
const ok = <T>(data: T) => ({ ok: true as const, data });
const err = (message: string) => ({ ok: false as const, error: message });
const delay = () => new Promise(res => setTimeout(res, 30));

// Real, seeded rule — matches the given specification's own §4.1
// worked example exactly (assay HPV_HR_PCR, an NTC fixed at A01 and a
// PTC_HIGH fixed at A02), so the seeded batch already satisfies a
// real rule out of the box rather than immediately failing one no
// rule previously existed to enforce.
const SEED: MolecularAssayControlRule[] = [
  {
    id: 'rule-001',
    // Real, per direct follow-up ("wouldn't we use the existing
    // process catalog to define the assays?") — same real fix as
    // mockMolecularBatchService.ts's own seed data: a real reference
    // to StainType.id, not a disconnected, free-typed string.
    assayCode: 'st-hpv-highrisk-screen',
    requiredControls: [
      { sampleType: 'CONTROL_NTC', positionMode: 'fixed', fixedWellPosition: 'A01' },
      { sampleType: 'CONTROL_PTC_HIGH', positionMode: 'fixed', fixedWellPosition: 'A02' },
    ],
    // Batch 406 (Pete's example): this assay's sample rack goes in Slot A1 or A2.
    allowedSampleRackSlotIds: ['SLOT_A1', 'SLOT_A2'],
    createdAt: '2026-09-06T15:00:00.000Z',
  },
];

// Batch 406: the seeded rule's allowed deck slots reach browsers that stored it earlier.
const load = (): MolecularAssayControlRule[] => {
  const stored = storageGet(STORE_KEY, SEED);
  const { records, filled } = withSeedFieldBackfill(stored, SEED, 'allowedSampleRackSlotIds');
  if (filled > 0) storageSet(STORE_KEY, records);
  return records;
};

/** Batch 406 (Pete): changing, adding or deleting a rule needs config:molecular-control-rules:manage. */
async function permitted(): Promise<boolean> {
  return (await authorizationService.enforce('config:molecular-control-rules:manage')).allowed;
}
/** Slot ids as the equipment stores them (upper case, no blanks or repeats). */
function tidySlots<T extends { allowedSampleRackSlotIds?: string[] }>(rule: T): T {
  if (!rule.allowedSampleRackSlotIds) return rule;
  const ids = rule.allowedSampleRackSlotIds.map(normaliseDeckSlotId).filter(Boolean);
  return { ...rule, allowedSampleRackSlotIds: [...new Set(ids)] };
}
const persist = (data: MolecularAssayControlRule[]) => storageSet(STORE_KEY, data);

export const mockMolecularAssayControlRuleService: IMolecularAssayControlRuleService = {
  async getAll() {
    await delay();
    return ok(load());
  },

  async getByAssayCode(assayCode) {
    await delay();
    return ok(load().find(r => r.assayCode === assayCode) ?? null);
  },

  async create(rule: NewMolecularAssayControlRule) {
    await delay();
    if (!(await permitted())) return err(MOLECULAR_CONTROL_RULE_NOT_PERMITTED);
    const all = load();
    if (all.some(r => r.assayCode === rule.assayCode)) {
      return err(MOLECULAR_CONTROL_RULE_DUPLICATE);
    }
    const created: MolecularAssayControlRule = { ...tidySlots(rule), id: 'rule-' + Date.now(), createdAt: new Date().toISOString() };
    persist([...all, created]);
    return ok(created);
  },

  async update(id, patch) {
    await delay();
    if (!(await permitted())) return err(MOLECULAR_CONTROL_RULE_NOT_PERMITTED);
    const all = load();
    const idx = all.findIndex(r => r.id === id);
    if (idx === -1) return err(MOLECULAR_CONTROL_RULE_NOT_FOUND);
    const updated: MolecularAssayControlRule = { ...all[idx], ...tidySlots(patch) };
    const next = [...all];
    next[idx] = updated;
    persist(next);
    return ok(updated);
  },

  async delete(id) {
    await delay();
    if (!(await permitted())) return err(MOLECULAR_CONTROL_RULE_NOT_PERMITTED);
    const all = load();
    if (!all.some(r => r.id === id)) return err(MOLECULAR_CONTROL_RULE_NOT_FOUND);
    persist(all.filter(r => r.id !== id));
    return ok(undefined);
  },
};
