// src/services/billing/materialChargePreview.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 460 (Pete): what a histotech sees at the Microtomy bench by default —
// the codes the scanned block's (or decant's, or matrix block's) slides
// generate, read-only. Approving or changing them stays with the billing
// review (the report page, or Microtomy's full review for people with
// billing:applied-code:review).
//
// Built from the same coding summary the billing panel uses
// (billingSummaryForMaterial), so the two never disagree.
//
// • rows: one per slide (block or decant), with its codes and their state:
//   applied, pending review, declined, or no billing code for that stain.
//   A matrix block has one row per participating specimen (its cores are
//   billed per specimen, PS-93).
// • charge status from the ledger, for applied codes: charged, waiting for
//   billing approval, approved, exported, on hold, rejected.
// • warnings: a billable matrix-block slide whose evaluated cores the
//   pathologist hasn't confirmed yet (nothing is billed until then); an
//   applied code waiting for billing approval.
// ─────────────────────────────────────────────────────────────────────────────

import type { ServiceChargeRecord } from '@/types/billing/ServiceChargeRecord';
import type { StainType } from '../stains/IStainService';
import { billingSummaryForMaterial } from '../material/billableMaterial';
import { computeMatrixStainBillingUnits } from './codeMapTable';

/* eslint-disable @typescript-eslint/no-explicit-any */

export type MaterialChargeState = 'applied' | 'pending' | 'declined' | 'noCode';
export type MaterialChargeLedgerStatus = 'charged' | 'awaitingApproval' | 'approved' | 'exported' | 'held' | 'rejected';

export interface MaterialChargeRow {
  /** The slide (block or decant), or the participating specimen (matrix block). */
  key: string;
  label: string;
  codes: string[];
  state: MaterialChargeState;
  ledger?: MaterialChargeLedgerStatus;
}

export type MaterialChargeWarning =
  | { kind: 'coresNotEvaluated'; slideLabel: string }
  | { kind: 'awaitingApproval'; count: number };

export interface MaterialChargePreview { rows: MaterialChargeRow[]; warnings: MaterialChargeWarning[] }

export type MaterialChargeTarget = { kind: 'unit'; specimenId: string; unitId: string } | { kind: 'matrix'; matrixBlockId: string };

function ledgerStatusOf(charge: ServiceChargeRecord | undefined): MaterialChargeLedgerStatus | undefined {
  if (!charge) return undefined;
  switch (charge.approvalStatus) {
    case 'PENDING_APPROVAL': case 'DRAFT': return 'awaitingApproval';
    case 'APPROVED': return 'approved';
    case 'EXPORTED': return 'exported';
    case 'HOLD': return 'held';
    case 'REJECTED': return 'rejected';
    default: return 'charged';
  }
}

/** The newest un-reversed charge for a code on this source (the same rule
 *  as IServiceChargeService.findActiveChargeForSource). A matrix-block
 *  code is charged at specimen level (no block id). */
function activeChargeFor(charges: readonly ServiceChargeRecord[], specimenId: string, blockId: string | undefined, code: string): ServiceChargeRecord | undefined {
  const reversed = new Set(charges.filter(c => c.transactionType === 'credit' && c.reversesTransactionId).map(c => c.reversesTransactionId));
  return charges
    .filter(c => c.transactionType === 'charge' && c.specimenId === specimenId && c.blockId === blockId && c.billingCode === code && !reversed.has(c.id))
    .sort((a, b) => b.resolvedAt.localeCompare(a.resolvedAt))[0];
}

export function materialChargePreview(input: {
  caseData: { specimens?: any[]; matrixBlocks?: any[] };
  target: MaterialChargeTarget;
  stainTypes: StainType[];
  charges?: readonly ServiceChargeRecord[];
}): MaterialChargePreview {
  const { caseData, target, stainTypes } = input;
  const charges = input.charges ?? [];
  const summary = billingSummaryForMaterial(caseData.specimens ?? [], stainTypes, caseData.matrixBlocks ?? []);
  const rows: MaterialChargeRow[] = [];
  const warnings: MaterialChargeWarning[] = [];

  if (target.kind === 'unit') {
    const sp = summary.find(s => s.specimenId === target.specimenId);
    const unit = sp?.blocks.find(b => b.blockId === target.unitId);
    for (const st of unit?.stainCodingStatus ?? []) {
      const codes = st.allAppliedCodes.length ? st.allAppliedCodes : st.suggestedCode ? [st.suggestedCode] : [];
      const state: MaterialChargeState = st.status === 'applied' ? 'applied' : st.status === 'pending' ? 'pending' : st.status === 'rejected' ? 'declined' : 'noCode';
      const ledger = state === 'applied' && codes[0] ? ledgerStatusOf(activeChargeFor(charges, target.specimenId, target.unitId, codes[0])) : undefined;
      rows.push({ key: st.stainOrderId, label: st.stainName, codes, state, ...(ledger ? { ledger } : {}) });
    }
  } else {
    const mb = (caseData.matrixBlocks ?? []).find(m => m.id === target.matrixBlockId);
    for (const p of mb?.participants ?? []) {
      const sp = summary.find(s => s.specimenId === p.specimenId);
      const contribution = sp?.matrixBlockContributions.find(c => c.matrixBlockId === target.matrixBlockId);
      const applied = (contribution?.appliedAncillaryCodes ?? []).map(c => c.code);
      const pending = contribution?.unappliedSuggestions ?? [];
      const state: MaterialChargeState = pending.length ? 'pending' : applied.length ? 'applied' : 'noCode';
      const codes = [...applied, ...pending];
      const ledger = state === 'applied' && applied[0] ? ledgerStatusOf(activeChargeFor(charges, p.specimenId, undefined, applied[0])) : undefined;
      rows.push({ key: p.specimenId, label: sp?.specimenLabel ?? p.specimenId, codes, state, ...(ledger ? { ledger } : {}) });
    }
    for (const slide of mb?.slides ?? []) {
      if ((slide.evaluatedSpecimenIds ?? []).length > 0) continue;
      const everyone = slide.targetSpecimenIds?.length ? slide.targetSpecimenIds : (mb?.participants ?? []).map((p: any) => p.specimenId);
      const billable = computeMatrixStainBillingUnits({ ...slide, evaluatedSpecimenIds: everyone }, stainTypes).length > 0;
      if (billable) warnings.push({ kind: 'coresNotEvaluated', slideLabel: slide.stainName });
    }
  }

  const waiting = rows.filter(r => r.ledger === 'awaitingApproval').length;
  if (waiting > 0) warnings.push({ kind: 'awaitingApproval', count: waiting });
  return { rows, warnings };
}
