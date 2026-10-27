// src/services/billing/billingCorrectionCase.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 433: what the billing correction dialog needs about a case, so a
// billing office user can correct a charge without opening the case
// (Pete). Finding the case by its case id or accession number, its active
// charges, its specimens and blocks (for adding a missing charge), the
// billing codes that can be added, and turning the dialog's form into a
// BillingCorrection. The correction itself is billingCorrection.ts.
//
// The case is read through the case router, so the usual case access rules
// apply: a case the person can't see is "not found".
// ─────────────────────────────────────────────────────────────────────────────

import type { ServiceChargeRecord } from '@/types/billing/ServiceChargeRecord';
import type { BillingRuleVersion } from '@/types/billing/BillingRuleVersion';
import type { BillingDeficiencyRecord } from '@/types/billing/BillingDeficiencyRecord';
import { activeCharges, type BillingCorrection } from './billingCorrection';

export type BillingCorrectionKind = BillingCorrection['kind'];
export const BILLING_CORRECTION_KINDS: readonly BillingCorrectionKind[] = ['changeCode', 'changeModifier', 'reverse', 'addMissing'];

export interface CorrectionCase {
  caseId: string;
  accession: string;
  signedOut: boolean;
  specimens: { id: string; label: string; blocks: { id: string; label: string }[] }[];
  /** Charges not yet reversed. */
  charges: ServiceChargeRecord[];
  /** Billing codes from the Billing Dictionary that a missing charge can use. */
  billingCodes: { code: string; description: string }[];
}

interface CaseLike {
  id: string;
  status?: string;
  accession?: { accessionNumber?: string; fullAccession?: string };
  specimens?: { id: string; label?: string; blocks?: { id: string; label?: string }[] }[];
}

/** Whether a case is the one asked for: its case id or accession number, exactly, ignoring case (pure). */
export function caseMatchesQuery(c: CaseLike, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return [c.id, c.accession?.accessionNumber, c.accession?.fullAccession].some(v => !!v && v.toLowerCase() === q);
}

/** One entry per billing code with an active rule, sorted by code (pure). */
export function addableBillingCodes(rules: readonly BillingRuleVersion[]): { code: string; description: string }[] {
  const byCode = new Map<string, string>();
  for (const r of rules) {
    if (r.status !== 'ACTIVE' || byCode.has(r.billingCode)) continue;
    byCode.set(r.billingCode, r.description ?? r.cpt);
  }
  return [...byCode.entries()].map(([code, description]) => ({ code, description })).sort((a, b) => a.code.localeCompare(b.code));
}

/** The case's details for the dialog (pure). */
export function toCorrectionCase(c: CaseLike, charges: readonly ServiceChargeRecord[], rules: readonly BillingRuleVersion[], signedOut: boolean): CorrectionCase {
  return {
    caseId: c.id,
    accession: c.accession?.fullAccession || c.accession?.accessionNumber || c.id,
    signedOut,
    specimens: (c.specimens ?? []).map(s => ({ id: s.id, label: s.label ?? s.id, blocks: (s.blocks ?? []).map(b => ({ id: b.id, label: b.label ?? b.id })) })),
    charges: activeCharges(charges),
    billingCodes: addableBillingCodes(rules),
  };
}

/** Where the dialog starts when it resolves a billing deficiency (pure).
 *  A charge reversal reverses the deficiency's charge; a code correction
 *  changes its code, or adds the charge the deficiency says is missing. */
export function initialCorrection(deficiency: Pick<BillingDeficiencyRecord, 'chargeRecordId' | 'missingCharge' | 'deficiencyType'> | null | undefined, resolution?: 'CODE_CORRECTED' | 'CHARGE_REVERSED'): { kind: BillingCorrectionKind; chargeId: string } {
  const chargeId = deficiency?.chargeRecordId ?? '';
  if (resolution === 'CHARGE_REVERSED') return { kind: 'reverse', chargeId };
  if (deficiency?.missingCharge || deficiency?.deficiencyType === 'MISSING_CHARGE') return { kind: 'addMissing', chargeId: '' };
  if (deficiency?.deficiencyType === 'MODIFIER_MISMATCH') return { kind: 'changeModifier', chargeId };
  return { kind: 'changeCode', chargeId };
}

export interface CorrectionForm {
  kind: BillingCorrectionKind;
  chargeId: string;
  newCptCode: string;
  newModifier: string;
  specimenId: string;
  blockId: string;
  billingCode: string;
}

/** The correction the form describes, or null while something it needs is missing (pure). */
export function correctionFromForm(f: CorrectionForm): BillingCorrection | null {
  switch (f.kind) {
    case 'changeCode': return f.chargeId && f.newCptCode.trim() ? { kind: 'changeCode', chargeId: f.chargeId, newCptCode: f.newCptCode.trim() } : null;
    case 'changeModifier': return f.chargeId ? { kind: 'changeModifier', chargeId: f.chargeId, newModifier: f.newModifier.trim() } : null;
    case 'reverse': return f.chargeId ? { kind: 'reverse', chargeId: f.chargeId } : null;
    case 'addMissing': return f.specimenId && f.billingCode ? { kind: 'addMissing', specimenId: f.specimenId, blockId: f.blockId || undefined, billingCode: f.billingCode } : null;
  }
}

async function deps() {
  const [{ caseRouter }, { serviceChargeService }, { billingRuleService }, { isCaseSignedOutForBilling }] = await Promise.all([
    import('../cases/CaseRouter'),
    import('./serviceChargeServiceInstance'),
    import('./billingRuleServiceInstance'),
    import('./isCaseSignedOutForBilling'),
  ]);
  return { caseRouter, charges: serviceChargeService, rules: billingRuleService, isCaseSignedOutForBilling };
}

async function build(c: CaseLike, d: Awaited<ReturnType<typeof deps>>): Promise<CorrectionCase> {
  const [charges, rules] = await Promise.all([d.charges.getChargesForCase(c.id), d.rules.getAll()]);
  return toCorrectionCase(c, charges.ok ? charges.data : [], rules.ok ? rules.data : [], d.isCaseSignedOutForBilling(c.status as never));
}

/** The case with this id, for the dialog (null when not found or not visible to the person). */
export async function loadCaseForCorrection(caseId: string): Promise<CorrectionCase | null> {
  const d = await deps();
  const c = await d.caseRouter.getCase(caseId).catch(() => undefined);
  return c ? build(c as unknown as CaseLike, d) : null;
}

/** Finds a case by its case id or accession number (null when there's no such case the person can see). */
export async function findCaseForCorrection(query: string): Promise<CorrectionCase | null> {
  const q = query.trim();
  if (!q) return null;
  const d = await deps();
  const direct = await d.caseRouter.getCase(q).catch(() => undefined);
  if (direct) return build(direct as unknown as CaseLike, d);
  const res = await d.caseRouter.getAll({ search: q }, { includeOrchestration: true }).catch(() => undefined);
  const match = res && res.ok ? (res.data as unknown as CaseLike[]).find(c => caseMatchesQuery(c, q)) : undefined;
  return match ? build(match, d) : null;
}
