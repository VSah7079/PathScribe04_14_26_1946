// src/services/reportRelease/heldPrintPolicy.ts
// Batch 654: the Release Hold Print Policy: what happens when someone prints a report that is
// still in its post-sign-out release delay (status 'pending-release'). Pure decisions here;
// the setting lives on the System > Release Buffer screen (ReportReleaseOrgConfig).
//
//   allow       print at once (the copy still carries the pending-release watermark)
//   warn        warn, ask to confirm, then print with the watermark (the default; the earlier behaviour)
//   supervisor  only a person holding `print:release-hold:override` may print, and says why
//   block       no printing until the report is released

export type ReleaseHoldPrintPolicy = 'allow' | 'warn' | 'supervisor' | 'block';

export const RELEASE_HOLD_PRINT_POLICIES: readonly ReleaseHoldPrintPolicy[] = ['allow', 'warn', 'supervisor', 'block'];
export const DEFAULT_RELEASE_HOLD_PRINT_POLICY: ReleaseHoldPrintPolicy = 'warn';
export const RELEASE_HOLD_OVERRIDE_CAPABILITY = 'print:release-hold:override';

export function isReleaseHoldPrintPolicy(v: unknown): v is ReleaseHoldPrintPolicy {
  return typeof v === 'string' && (RELEASE_HOLD_PRINT_POLICIES as readonly string[]).includes(v);
}

/** The policy for a stored config: the new value, else the old on/off switch (on = warn, off = allow), else the default. */
export function releaseHoldPrintPolicyOf(stored: { releaseHoldPrintPolicy?: unknown; restrictHardcopyPrinting?: unknown } | null | undefined): ReleaseHoldPrintPolicy {
  if (isReleaseHoldPrintPolicy(stored?.releaseHoldPrintPolicy)) return stored!.releaseHoldPrintPolicy as ReleaseHoldPrintPolicy;
  if (stored?.restrictHardcopyPrinting === false) return 'allow';
  return DEFAULT_RELEASE_HOLD_PRINT_POLICY;
}

export interface HeldPrintOutcome {
  /** Printing is not allowed now (policy block, or supervisor policy without the capability). */
  blocked: boolean;
  /** Tell the person the copy carries the watermark and ask them to confirm. */
  warn: boolean;
  /** A reason is required (a supervisor overriding the hold). */
  askOverrideReason: boolean;
}

/** What the policy asks for when a held report is printed (pure). `policy` null = the report is not on hold. */
export function heldPrintOutcome(policy: ReleaseHoldPrintPolicy | null, canOverride: boolean): HeldPrintOutcome {
  switch (policy) {
    case 'warn': return { blocked: false, warn: true, askOverrideReason: false };
    case 'block': return { blocked: true, warn: false, askOverrideReason: false };
    case 'supervisor': return canOverride
      ? { blocked: false, warn: true, askOverrideReason: true }
      : { blocked: true, warn: false, askOverrideReason: false };
    default: return { blocked: false, warn: false, askOverrideReason: false };
  }
}

/** The policy that applies to a case now: null unless the report is Pending Release (read from the org setting). */
export async function releaseHoldPolicyForCase(
  caseRecord: { status?: string | null } | null | undefined,
  deps: { getOrgDefault: () => Promise<{ ok: boolean; data?: { releaseHoldPrintPolicy?: unknown; restrictHardcopyPrinting?: unknown } }> },
): Promise<ReleaseHoldPrintPolicy | null> {
  if (caseRecord?.status !== 'pending-release') return null;
  try {
    const res = await deps.getOrgDefault();
    return releaseHoldPrintPolicyOf(res.ok ? res.data : null);
  } catch {
    return DEFAULT_RELEASE_HOLD_PRINT_POLICY;   // fail toward asking, never toward printing freely
  }
}
