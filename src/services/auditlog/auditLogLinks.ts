// src/services/auditlog/auditLogLinks.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 499: deep links into the Audit Log page.
//
// The QA page's "Failed Dispatches" tile navigated to
// /configuration?tab=system&section=outbound_charge_dlq, a section that no
// longer exists: the charge dead-letter queue (OutboundDlqSection) moved from
// Configuration → System to Audit Log → Financial, and the link was never
// updated, so the tile opened Configuration on nothing. It now opens the
// Financial tab on its "Outbound DLQ" view.
// ─────────────────────────────────────────────────────────────────────────────

export type FinancialAuditView = 'billing_logs' | 'outbound_dlq';

/** Audit Log → Financial → failed outbound charge dispatches. */
export const FAILED_CHARGE_DISPATCHES_LINK = '/audit?tab=financial&view=outbound_dlq';

/** The Financial tab's view named in the address (`view=`), or null for the default. */
export function financialAuditViewFromParams(params: Pick<URLSearchParams, 'get'>): FinancialAuditView | null {
  if (params.get('tab') !== 'financial') return null;
  const view = params.get('view');
  return view === 'outbound_dlq' || view === 'billing_logs' ? view : null;
}
