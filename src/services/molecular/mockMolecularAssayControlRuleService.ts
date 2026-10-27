// src/services/molecular/mockMolecularAssayControlRuleService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per the given specification's own §3.2 "Dynamic Control
// Rules" / "Position Enforcements" — see
// IMolecularAssayControlRuleService.ts's own header for the full
// account of why this exists.
// ─────────────────────────────────────────────────────────────────────────────

import { storageGet, storageSet } from '../mockStorage';
import { withMissingSeedRecords, withSeedFieldBackfill } from '../mockSeedMerge';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import type {
  IMolecularAssayControlRuleService, MolecularAssayControlRule, NewMolecularAssayControlRule,
} from './IMolecularAssayControlRuleService';
import { MOLECULAR_CONTROL_RULE_NOT_PERMITTED, MOLECULAR_CONTROL_RULE_DUPLICATE, MOLECULAR_CONTROL_RULE_NOT_FOUND, MOLECULAR_CONTROL_RULE_REASON_REQUIRED, MOLECULAR_CONTROL_RULE_NO_CONTROLS } from './IMolecularAssayControlRuleService';
import { mockAuditService } from '../auditlog/mockAuditService';
import { getSessionUser } from '../auth/caseAccessControl';
import { normaliseDeckSlotId } from '../equipment/equipmentRules';

const STORE_KEY = 'molecular_assay_control_rules';
const LATE_SEED_KEY = 'molecular_assay_control_rules_seed_467';
const LATE_SEED_IDS = ['rule-467-egfr'];
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
  {
    // Batch 467: the in-house EGFR mutation PCR — a no-template control and a mutation-positive control, fixed.
    id: 'rule-467-egfr',
    assayCode: 'st-egfr-pcr',
    requiredControls: [
      { sampleType: 'CONTROL_NTC', positionMode: 'fixed', fixedWellPosition: 'A01' },
      { sampleType: 'CONTROL_PTC_HIGH', positionMode: 'fixed', fixedWellPosition: 'A02' },
    ],
    createdAt: '2026-10-06T15:00:00.000Z',
  },
];

// Batch 406: the seeded rule's allowed deck slots reach browsers that stored it earlier.
const load = (): MolecularAssayControlRule[] => {
  const stored = storageGet(STORE_KEY, SEED);
  // Batch 467: a rule seeded later (the EGFR PCR one) reaches browsers that stored the rules earlier — once, so a
  // rule an admin deletes afterwards stays deleted.
  const late = storageGet<boolean>(LATE_SEED_KEY, false) ? { records: stored, added: 0 } : withMissingSeedRecords(stored, SEED.filter(r => LATE_SEED_IDS.includes(r.id)));
  if (!storageGet<boolean>(LATE_SEED_KEY, false)) storageSet(LATE_SEED_KEY, true);
  const { records, filled } = withSeedFieldBackfill(late.records, SEED, 'allowedSampleRackSlotIds');
  if (filled > 0 || late.added > 0) storageSet(STORE_KEY, records);
  return records;
};

/** Batch 406 (Pete): changing, adding or deleting a rule needs config:molecular-control-rules:manage. */
async function permitted(): Promise<boolean> {
  return (await authorizationService.enforce('config:molecular-control-rules:manage')).allowed;
}
/** Batch 669 (ctl): reading the rules on the Control Rules page needs config:molecular-control-rules:view (or manage, which needs view). */
async function mayRead(): Promise<boolean> {
  if ((await authorizationService.enforce('config:molecular-control-rules:view')).allowed) return true;
  return (await authorizationService.evaluate('config:molecular-control-rules:manage')).allowed;
}
/** Slot ids as the equipment stores them (upper case, no blanks or repeats). */
function tidySlots<T extends { allowedSampleRackSlotIds?: string[] }>(rule: T): T {
  if (!rule.allowedSampleRackSlotIds) return rule;
  const ids = rule.allowedSampleRackSlotIds.map(normaliseDeckSlotId).filter(Boolean);
  return { ...rule, allowedSampleRackSlotIds: [...new Set(ids)] };
}
const persist = (data: MolecularAssayControlRule[]) => storageSet(STORE_KEY, data);

/** Batch 669 (mol-14): who changed a rule and why, in the audit log (the detail is literal English, as audit text is). */
function recordChange(event: string, rule: Pick<MolecularAssayControlRule, 'assayCode' | 'requiredControls'>, reason: string): void {
  const u = getSessionUser();
  const user = u ? [u.firstName, u.lastName].filter(Boolean).join(' ') || u.id : 'Unknown user';
  const controls = rule.requiredControls.map(c => `${c.sampleType} ${c.positionMode === 'fixed' ? `fixed at ${c.fixedWellPosition ?? '?'}` : 'random'}`).join(', ');
  mockAuditService.logEvent({
    type: 'user', event, detail: `Molecular control rule for assay ${rule.assayCode} (${controls || 'no controls'}). Reason: ${reason.trim()}`,
    user, caseId: null, confidence: null,
  }).catch(() => {});
}

export const mockMolecularAssayControlRuleService: IMolecularAssayControlRuleService = {
  async getAll() {
    await delay();
    return ok(load());
  },

  async listForReview() {
    await delay();
    if (!(await mayRead())) return err(MOLECULAR_CONTROL_RULE_NOT_PERMITTED);
    return ok(load());
  },

  async getByAssayCode(assayCode) {
    await delay();
    return ok(load().find(r => r.assayCode === assayCode) ?? null);
  },

  async create(rule: NewMolecularAssayControlRule, reason: string) {
    await delay();
    if (!(await permitted())) return err(MOLECULAR_CONTROL_RULE_NOT_PERMITTED);
    if (!reason?.trim()) return err(MOLECULAR_CONTROL_RULE_REASON_REQUIRED);
    if (!rule.requiredControls?.length) return err(MOLECULAR_CONTROL_RULE_NO_CONTROLS);
    const all = load();
    if (all.some(r => r.assayCode === rule.assayCode)) {
      return err(MOLECULAR_CONTROL_RULE_DUPLICATE);
    }
    const created: MolecularAssayControlRule = { ...tidySlots(rule), id: 'rule-' + Date.now(), createdAt: new Date().toISOString() };
    persist([...all, created]);
    recordChange('Molecular Control Rule Created', created, reason);
    return ok(created);
  },

  async update(id, patch, reason: string) {
    await delay();
    if (!(await permitted())) return err(MOLECULAR_CONTROL_RULE_NOT_PERMITTED);
    if (!reason?.trim()) return err(MOLECULAR_CONTROL_RULE_REASON_REQUIRED);
    const all = load();
    const idx = all.findIndex(r => r.id === id);
    if (idx === -1) return err(MOLECULAR_CONTROL_RULE_NOT_FOUND);
    // Batch 669 (mol-14): the same two checks create makes. Moving a rule onto another rule's assay is a duplicate; a rule
    // keeps at least one control.
    if (patch.assayCode !== undefined && all.some(r => r.id !== id && r.assayCode === patch.assayCode)) return err(MOLECULAR_CONTROL_RULE_DUPLICATE);
    if (patch.requiredControls !== undefined && !patch.requiredControls.length) return err(MOLECULAR_CONTROL_RULE_NO_CONTROLS);
    const updated: MolecularAssayControlRule = { ...all[idx], ...tidySlots(patch) };
    const next = [...all];
    next[idx] = updated;
    persist(next);
    recordChange('Molecular Control Rule Updated', updated, reason);
    return ok(updated);
  },

  async delete(id, reason: string) {
    await delay();
    if (!(await permitted())) return err(MOLECULAR_CONTROL_RULE_NOT_PERMITTED);
    if (!reason?.trim()) return err(MOLECULAR_CONTROL_RULE_REASON_REQUIRED);
    const all = load();
    const gone = all.find(r => r.id === id);
    if (!gone) return err(MOLECULAR_CONTROL_RULE_NOT_FOUND);
    persist(all.filter(r => r.id !== id));
    recordChange('Molecular Control Rule Deleted', gone, reason);
    return ok(undefined);
  },
};
