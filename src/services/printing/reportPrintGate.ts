// src/services/printing/reportPrintGate.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 495 (PS-283 §4.2.4, "RBAC governing access to physical print
// commands"): before a case report is printed, reprinted, printed from the
// preview window, or a stored version's PDF is opened, check
// `report:case-report:print` for that case. Before this, any of those four
// paths printed for anyone who could open the report.
// Batch 497: the preview window was retired, so three paths remain — the
// report page (orchestration print), the CoPilot report view, and opening a
// stored version's PDF.
//
// Same shape as exportGate.ts's beginExport(): one service function every
// entry point calls, a refusal means no document is produced, and the check
// itself is audited by the authorization service. Screens grey their Print
// buttons with CapabilityButton; that is presentation only.
//
// Batch 516 (PS-283, Pete): restricted cases. A case carrying an active
// case-level flag marked "restricts printing" (VIP, confidential consultation;
// Flag.restrictsPrinting, set in Configuration → Case Flags) also needs
// `report:restricted-case:print`. The lab chooses which flags restrict.
// ─────────────────────────────────────────────────────────────────────────────

import type { CapabilityContext } from '../authorization/evaluateCapability';

type Decision = Promise<{ allowed: boolean }>;

export type ReportPrintCheck = 'allowed' | 'notPermitted' | 'restrictedCase';

export interface ReportPrintGateDeps {
  check: (context: CapabilityContext) => Decision;
  /** Batch 516: the restricted-case permission. */
  checkRestricted: (context: CapabilityContext) => Decision;
  /** Batch 516: whether the case carries an active flag that restricts printing. */
  isRestrictedCase: (caseId: string) => Promise<boolean>;
}

/** Whether active case flags include one that restricts printing (pure). */
export function hasPrintRestrictingFlag(
  caseFlags: ReadonlyArray<{ flagDefinitionId?: string; deletedAt?: string | null }> | undefined,
  flags: ReadonlyArray<{ id: string; restrictsPrinting?: boolean; status?: string }>,
): boolean {
  const restricting = new Set(flags.filter(f => f.restrictsPrinting && f.status !== 'Inactive').map(f => f.id));
  return (caseFlags ?? []).some(cf => !!cf.flagDefinitionId && !cf.deletedAt && restricting.has(cf.flagDefinitionId));
}

const defaultDeps: ReportPrintGateDeps = {
  check: async (context) => {
    const { authorizationService } = await import('../authorization/defaultAuthorizationService');
    return authorizationService.enforce('report:case-report:print', context);
  },
  checkRestricted: async (context) => {
    const { authorizationService } = await import('../authorization/defaultAuthorizationService');
    return authorizationService.enforce('report:restricted-case:print', context);
  },
  isRestrictedCase: async (caseId) => {
    const [{ mockCaseService }, { mockFlagService }] = await Promise.all([
      import('../cases/mockCaseService'), import('../flags/mockFlagService'),
    ]);
    const [c, flags] = await Promise.all([mockCaseService.getCase(caseId), mockFlagService.getAll()]);
    return hasPrintRestrictingFlag(c?.caseFlags, flags.ok ? flags.data : []);
  },
};

/** May this person print this case's report? 'restrictedCase': it carries a print-restricting flag they may not override. */
export async function checkReportPrint(
  context: { caseId: string | null; facilityId?: string | null },
  deps: ReportPrintGateDeps = defaultDeps,
): Promise<ReportPrintCheck> {
  const capabilityContext = { caseId: context.caseId, facilityId: context.facilityId ?? null };
  if (!(await deps.check(capabilityContext)).allowed) return 'notPermitted';
  if (context.caseId && await deps.isRestrictedCase(context.caseId)) {
    if (!(await deps.checkRestricted(capabilityContext)).allowed) return 'restrictedCase';
  }
  return 'allowed';
}

/** True: go ahead and print. False: refused — produce no document. */
export async function beginReportPrint(
  context: { caseId: string | null; facilityId?: string | null },
  deps: ReportPrintGateDeps = defaultDeps,
): Promise<boolean> {
  return (await checkReportPrint(context, deps)) === 'allowed';
}
