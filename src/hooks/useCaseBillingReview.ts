// src/hooks/useCaseBillingReview.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 460 (Pete): the billing review panel outside the case report page —
// the Cytology Workspace (full review in a drawer) and Microtome (full review
// behind a switch, for people with billing:applied-code:review).
//
// The hook only orchestrates. The coding changes are the pure functions in
// services/billing/caseBillingCoding.ts; the charges, credits, corrections
// and the permission check are services/billing/caseBillingCharges.ts — the
// same ones the report page uses. Each screen supplies a writer that saves
// through its own (versioned) save path.
//
// Order for every change: permission (refused → toast, nothing changes);
// on a signed-out case, the post-sign-out reason (cancelled → nothing
// changes); the coding save; then the charge or credit (only when charges
// are enabled: an Assist-mode case is billed by the LIS, as on the report page).
// Oct 15, 2026: the specimen-level changes (a base code added or removed, a
// matrix code applied) ask for the reason too; before, they charged or
// credited a signed-out case without one (services/billing/postSignoutBillingReason.ts).
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Case } from '@/types/case/Case';
import type { PostSignoutChangeContext } from '@/services/billing/resolveServiceCharge';
import {
  enforceBillingReview, recordCaseCharge, recordCaseCredit, recordCaseCodeCorrection, auditBillingSuggestionDeclined,
  codingWithApproved, codingWithRejected, codingWithOverride, codingWithoutCode, codingWithCorrection, groupApprovalsByUnit,
  specimensWithBaseCodeAdded, specimensWithBaseCodeRemoved, specimensWithBaseCodeCorrected, specimensWithMatrixCode,
  postSignoutReasonNeeded, specimenBillingChangeSummary, enforceAppliedCodeCorrection,
  type BillingApprovalItem, type UnitCoding,
} from '@/services';


export interface CaseBillingWriter {
  /** Saves one block's or decant's codes; `change` is applied to the codes as saved. Returns the new specimens. */
  saveUnitCoding: (specimenId: string, unitId: string, change: (coding: any) => UnitCoding) => Promise<any[]>;
  /** Saves a change to the specimens (base codes, matrix codes). Returns the new specimens. */
  saveSpecimens: (change: (specimens: any[]) => any[]) => Promise<any[]>;
}

export interface CaseBillingReviewOptions {
  caseData: Case | null;
  user: { id?: string; name?: string } | null | undefined;
  writer: CaseBillingWriter;
  /** The saved specimens, for the screen's state. */
  onSpecimens: (specimens: any[]) => void;
  /** False for an Assist-mode case: codes change, nothing is charged. */
  chargesEnabled: boolean;
  /** A message key to show (warning). */
  onWarning: (key: string) => void;
  /** A save that failed (the screen reports it its own way). */
  onSaveFailed: (e: unknown) => void;
  /** After a charge, credit or correction is written (to refresh a ledger view). */
  onLedgerChanged?: () => void;
}

export function useCaseBillingReview(o: CaseBillingReviewOptions) {
  const { t } = useTranslation();
  const opts = useRef(o);
  opts.current = o;
  const [postSignoutPrompt, setPostSignoutPrompt] = useState<{ summary: string } | null>(null);
  const promptRef = useRef<{ resolve: (c: PostSignoutChangeContext | null) => void } | null>(null);
  const [correctingCode, setCorrectingCode] = useState<{ specimenId: string; blockId?: string; oldCode: string; stainOrderId?: string } | null>(null);

  const allowed = useCallback(async () => {
    const { caseData, onWarning } = opts.current;
    if (!caseData) return false;
    if (await enforceBillingReview(caseData)) return true;
    onWarning('billingReview.toast.notPermitted');
    return false;
  }, []);

  /** undefined: not asked (not signed out, or not billed here); null: cancelled. As on the report page, only a billed case asks. */
  const reason = useCallback((summary: string): Promise<PostSignoutChangeContext | undefined | null> => {
    if (!postSignoutReasonNeeded({ billed: opts.current.chargesEnabled, status: opts.current.caseData?.status })) return Promise.resolve(undefined);
    return new Promise(resolve => { promptRef.current = { resolve }; setPostSignoutPrompt({ summary }); });
  }, []);
  const confirmPostSignout = useCallback((ctx: PostSignoutChangeContext) => { promptRef.current?.resolve(ctx); promptRef.current = null; setPostSignoutPrompt(null); }, []);
  const cancelPostSignout = useCallback(() => { promptRef.current?.resolve(null); promptRef.current = null; setPostSignoutPrompt(null); }, []);

  const saveUnit = useCallback(async (specimenId: string, unitId: string, change: (coding: any) => UnitCoding) => {
    try { opts.current.onSpecimens(await opts.current.writer.saveUnitCoding(specimenId, unitId, change)); return true; } catch (e) { opts.current.onSaveFailed(e); return false; }
  }, []);
  const saveSpecimens = useCallback(async (change: (specimens: any[]) => any[]) => {
    try { opts.current.onSpecimens(await opts.current.writer.saveSpecimens(change)); return true; } catch (e) { opts.current.onSaveFailed(e); return false; }
  }, []);
  const charge = async (specimenId: string, blockId: string | undefined, code: string, postSignoutContext?: PostSignoutChangeContext) => {
    const { caseData, user, chargesEnabled } = opts.current;
    if (!caseData || !chargesEnabled) return;
    await recordCaseCharge({ caseData, specimenId, blockId, code, user, postSignoutContext });
    opts.current.onLedgerChanged?.();
  };
  const credit = async (specimenId: string, blockId: string | undefined, code: string, postSignoutContext?: PostSignoutChangeContext) => {
    const { caseData, user, chargesEnabled } = opts.current;
    if (!caseData || !chargesEnabled) return;
    await recordCaseCredit({ caseData, specimenId, blockId, code, user, postSignoutContext });
    opts.current.onLedgerChanged?.();
  };

  const onApprove = async (specimenId: string, blockId: string, code: string, stainOrderId?: string) => {
    if (!(await allowed())) return;
    const ctx = await reason(`${code} approved.`);
    if (ctx === null) return;
    if (await saveUnit(specimenId, blockId, c => codingWithApproved(c, [{ code, stainOrderId }]))) await charge(specimenId, blockId, code, ctx);
  };
  const onRejectOnly = async (specimenId: string, blockId: string, code: string, stainOrderId?: string) => {
    if (!(await allowed())) return;
    const { caseData, user } = opts.current;
    if (await saveUnit(specimenId, blockId, c => codingWithRejected(c, code, stainOrderId)) && caseData) {
      void auditBillingSuggestionDeclined({ caseData, specimenId, blockId, code, stainOrderId, user });
    }
  };
  const onOverride = async (specimenId: string, blockId: string, oldCode: string, newCode: string, stainOrderId?: string) => {
    if (!(await allowed())) return;
    const ctx = await reason(`${oldCode} → ${newCode}.`);
    if (ctx === null) return;
    if (!(await saveUnit(specimenId, blockId, c => codingWithOverride(c, oldCode, newCode, stainOrderId)))) return;
    await charge(specimenId, blockId, newCode, ctx);
    const { caseData, user } = opts.current;
    if (caseData) void auditBillingSuggestionDeclined({ caseData, specimenId, blockId, code: oldCode, stainOrderId, replacedWith: newCode, user, postSignoutContext: ctx });
  };
  const onDelete = async (specimenId: string, blockId: string, code: string, stainOrderId?: string) => {
    if (!(await allowed())) return;
    if (await saveUnit(specimenId, blockId, c => codingWithoutCode(c, code, stainOrderId))) await credit(specimenId, blockId, code);
  };
  const onApproveAll = async (items: BillingApprovalItem[]) => {
    if (!(await allowed())) return;
    const ctx = items.length > 0 ? await reason(`${items.length} code${items.length === 1 ? '' : 's'} approved.`) : undefined;
    if (ctx === null) return;
    for (const { specimenId, blockId, codes } of groupApprovalsByUnit(items)) {
      if (!(await saveUnit(specimenId, blockId, c => codingWithApproved(c, codes)))) return;
      for (const c of codes) await charge(specimenId, blockId, c.code, ctx);
    }
  };
  // Specimen-level changes on a signed-out case ask for the same reason as the case-level paths, first.
  const specimenReason = (kind: 'added' | 'removed', code: string) => {
    const summary = specimenBillingChangeSummary(kind, code);
    return reason(t(summary.key, summary.values));
  };
  const onDeleteBaseCode = async (specimenId: string, code: string) => {
    if (!(await allowed())) return;
    const ctx = await specimenReason('removed', code);
    if (ctx === null) return;
    if (await saveSpecimens(sp => specimensWithBaseCodeRemoved(sp, specimenId, code))) await credit(specimenId, undefined, code, ctx);
  };
  const onAddBaseCode = async (specimenId: string, code: string) => {
    if (!(await allowed())) return;
    const ctx = await specimenReason('added', code);
    if (ctx === null) return;
    if (await saveSpecimens(sp => specimensWithBaseCodeAdded(sp, specimenId, code))) await charge(specimenId, undefined, code, ctx);
  };
  const onApplyMatrixCode = async (specimenId: string, matrixBlockId: string, code: string, stainOrderId?: string) => {
    if (!(await allowed())) return;
    const ctx = await specimenReason('added', code);
    if (ctx === null) return;
    if (await saveSpecimens(sp => specimensWithMatrixCode(sp, specimenId, matrixBlockId, code, stainOrderId, 'applied'))) await charge(specimenId, undefined, code, ctx);
  };
  const onRejectMatrixCode = async (specimenId: string, matrixBlockId: string, code: string, stainOrderId?: string) => {
    if (!(await allowed())) return;
    await saveSpecimens(sp => specimensWithMatrixCode(sp, specimenId, matrixBlockId, code, stainOrderId, 'rejected'));
  };
  const onCorrect = (specimenId: string, blockId: string, oldCode: string, stainOrderId?: string) => setCorrectingCode({ specimenId, blockId, oldCode, stainOrderId });
  const onCorrectBaseCode = (specimenId: string, oldCode: string) => setCorrectingCode({ specimenId, oldCode });
  const cancelCorrection = () => setCorrectingCode(null);
  const confirmCorrection = async (newCode: string) => {
    const pending = correctingCode;
    setCorrectingCode(null);
    const { caseData, user, chargesEnabled, onWarning } = opts.current;
    if (!pending || !caseData?.id) return;
    if (!(await enforceAppliedCodeCorrection(caseData.id))) { onWarning('synopticReportPage.toast.billingCorrectionNotPermitted'); return; }
    if (!(await allowed())) return;
    const { specimenId, blockId, oldCode, stainOrderId } = pending;
    const ctx = await reason(`${oldCode} → ${newCode}.`);
    if (ctx === null) return;
    const saved = blockId
      ? await saveUnit(specimenId, blockId, c => codingWithCorrection(c, oldCode, newCode, stainOrderId))
      : await saveSpecimens(sp => specimensWithBaseCodeCorrected(sp, specimenId, oldCode, newCode));
    if (saved && chargesEnabled) {
      await recordCaseCodeCorrection({ caseData, specimenId, blockId, oldCode, newCode, user, postSignoutContext: ctx ?? undefined });
      opts.current.onLedgerChanged?.();
    }
  };

  return {
    panelHandlers: { onApprove, onOverride, onRejectOnly, onDelete, onDeleteBaseCode, onAddBaseCode, onApproveAll, onCorrect, onCorrectBaseCode, onApplyMatrixCode, onRejectMatrixCode },
    postSignoutPrompt, confirmPostSignout, cancelPostSignout,
    correctingCode, confirmCorrection, cancelCorrection,
  };
}
