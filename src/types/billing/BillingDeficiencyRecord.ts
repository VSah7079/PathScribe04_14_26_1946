// src/types/billing/BillingDeficiencyRecord.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct guidance: a billing deficiency represents a
// compliance/financial risk flag attached to a case and (optionally) a
// specific ServiceChargeRecord - deliberately NOT a hard gate on
// sign-out. Per direct, explicit confirmation: "alert the Pathologist
// with a warning message, but not block. Those cases would be routed
// to QA" - this is a real, visible flag, not something that stops a
// pathologist's actual signature. Field names use this codebase's own
// camelCase convention throughout, adapted from the original schema
// discussion's DB-style snake_case naming for consistency with every
// other real type in this app.
// ─────────────────────────────────────────────────────────────────────────────

export type BillingDeficiencyType =
  | 'UNSUPPORTED_CPT_LEVEL'       // Specimen gross description does not support the level billed
  | 'MISSING_DIAGNOSTIC_ICD10'    // CPT generated without required cross-mapped ICD-10
  | 'NCCI_BUNDLING_VIOLATION'     // e.g. mutually exclusive stain combinations
  | 'UNATTACHED_ANCILLARY_ORDER'  // Special stain executed without an accompanying order/sign-off
  | 'MODIFIER_MISMATCH'           // Professional -26 or Technical -TC component omitted or inverted
  | 'ZERO_FEE_MAPPING_ERROR'      // Active code mapped to $0.00 fee schedule line without explicit override
  | 'MISSING_CHARGE'              // Batch 433: a billable item has no charge (found in a billing audit)
  | 'POST_SIGNOUT_CORRECTION'     // Batch 433: a correction started without a prior finding (payer denial, tariff rejection…)
  | 'BLOCK_DELETED';              // Batch 588: a block was deleted; billing decides whether a credit is due

export type BillingDeficiencySeverity = 'CRITICAL_REJECTION_RISK' | 'COMPLIANCE_WARNING' | 'REVENUE_LEAKAGE';

export type BillingDeficiencyStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'OVERRIDDEN_WITH_JUSTIFICATION';

export type BillingDeficiencyTrigger = 'AUTO_NCCI_CHECK' | 'AUTO_CROSSWALK_CHECK' | 'MANUAL_BILLING_AUDIT' | 'MANUAL_BILLING_CORRECTION' | 'BLOCK_DELETION';

export type BillingDeficiencyResolutionReason =
  | 'CODE_CORRECTED' | 'CHARGE_REVERSED' | 'APPROVED_BY_BILLING_ADMIN' | 'PHYSICIAN_ADDENDUM_ADDED';

/**
 * Batch 588 (Pete, Oct 16 2026): what a 'BLOCK_DELETED' deficiency is about. The block stays on the
 * case (soft delete), so these ids always resolve. Resolve it as Charge reversed (the credit) or
 * Approved by billing admin (no credit due), with the existing Resolve dialog.
 */
export interface BlockDeletedDetail {
  blockId: string;
  specimenId: string;
  specimenLabel: string;
  blockLabel: string;
  reasonCode: string;
  /** The billing codes that had been applied to the block and were released: the billing impact. */
  releasedCodes: string[];
  deletedBy: string;
  deletedByName: string;
  deletedAt: string;
}

export interface BillingDeficiencyRecord {
  id: string;
  caseId: string;
  /** Nullable, per direct guidance - undefined when the deficiency is
   *  systemic to the whole case rather than tied to one specific
   *  ServiceChargeRecord (e.g. a case-wide missing-ICD10 flag). */
  chargeRecordId?: string;
  /** Batch 433: the finding is a charge that's missing (no chargeRecordId to
   *  point at); resolving it adds the charge. */
  missingCharge?: boolean;
  deficiencyType: BillingDeficiencyType;
  severity: BillingDeficiencySeverity;
  status: BillingDeficiencyStatus;
  raisedByTrigger: BillingDeficiencyTrigger;
  resolutionReasonCode?: BillingDeficiencyResolutionReason;
  /** Real, human-readable detail on what was actually detected - e.g.
   *  "88307 billed; specimen dictionary default for this type is
   *  88305" - not a placeholder, the actual real basis for the flag. */
  auditorNotes: string;
  /** Batch 588: set when deficiencyType is 'BLOCK_DELETED'. */
  blockDeleted?: BlockDeletedDetail;
  createdAt: string;
  resolvedAt?: string;
  createdBy: string;
  resolvedBy?: string;
}
