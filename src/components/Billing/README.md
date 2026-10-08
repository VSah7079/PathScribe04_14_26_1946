# components/Billing

Billing modals on the case report page.

- **`PostSignoutBillingChangeModal`:** after a case has signed out, a change to billing asks for a reason (from the reason dictionary) and a comment. Both are locked Field Requirements (`billingChangeMissing`). Voice: "confirm billing change" (`POST_SIGNOUT_BILLING_CONFIRM`).
- **`CorrectAppliedCodeModal`:** replaces an applied, already-charged billing code with a corrected one; the original is credited and the new code billed. The corrected code is a locked Field Requirement (`correctedCodeCheck`, and it must differ from the original). It needs `billing:applied-code:correct` (`CapabilityButton`; checked again in `services/billing/correctServiceCharge.ts`). Voice: "correct billing code" (`CORRECT_CODE_CONFIRM`).

Neither modal decides anything itself: the checks are in `services/fieldRequirements/reportPageChecks.ts`, and they reach services only through `@/services`.

Batch 382 (PS-359). Tests sit beside the modals.

## Batch 433

| File | What it is |
|---|---|
| `BillingCorrectionDialog.tsx` | The billing correction dialog (Quality Assurance → Financials). Without a deficiency ("Start correction") it finds the case by case id or accession number; from a deficiency it opens on that case and charge. Kinds: change the CPT code, change the modifier, reverse, add a missing charge (specimen, optional block, billing code). Reason (post-sign-out billing reasons) and comment required. The work is `services/billing/billingCorrection.ts`. |
| `ChargeApprovalQueue.tsx` | Charges awaiting approval: Approve, Reject (with a reason), Hold, Release, each a `CapabilityButton` for `billing:charge:approve` with the charge's lab as context. Your own drafts show why you can't approve them. Rules in `services/billing/chargeApproval.ts`. |

## Batch 434

`ChargeApprovalQueue.tsx`: the performing lab now shows for cases with a legacy tenant id. When it can't be worked out, the row says "Lab not known", and approving says why.

## Batch 460

**`CaseBillingReview.tsx`** renders the billing review panel together with the post-sign-out reason and code-correction prompts, driven by `useCaseBillingReview`. It's used by the Cytology Workspace's Billing drawer and Microtomy's full review.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*
*When this folder's contents change meaningfully, update THIS file.*
