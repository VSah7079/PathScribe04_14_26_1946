// src/services/cytology/saveCytologyComplianceFeatures.ts
// Batch 415: switching the cytology compliance features (CLIA workload cap,
// CAP 5-year lookback) for the enterprise or a facility. Needs
// config:cytology-compliance:manage, and is audited.
import type { CytologyComplianceSettings } from './cytologyComplianceFeatures';

export interface CytologyComplianceSaveDeps {
  enforce: (capability: string, context?: Record<string, unknown>) => Promise<{ allowed: boolean }>;
  setEnterprise: (settings: CytologyComplianceSettings) => Promise<unknown>;
  setFacility: (facilityId: string, settings: CytologyComplianceSettings | null) => Promise<unknown>;
  logAudit: (event: any) => unknown;
}

const describe = (s: CytologyComplianceSettings | null) =>
  s ? `workload cap ${s.workloadCap ?? 'auto'}, 5-year lookback ${s.fiveYearLookback ?? 'auto'}, preliminary signature ${s.preliminarySignature ?? 'auto'}` : 'follows the enterprise';

/** facilityId null: the enterprise setting. settings null (a facility only): remove its own setting. */
export async function saveCytologyComplianceFeatures(
  facilityId: string | null, settings: CytologyComplianceSettings | null, user: { id: string; name: string }, deps: CytologyComplianceSaveDeps,
): Promise<'notPermitted' | 'saved'> {
  const decision = await deps.enforce('config:cytology-compliance:manage', facilityId ? { facilityId } : undefined);
  if (!decision.allowed) return 'notPermitted';
  if (facilityId) await deps.setFacility(facilityId, settings);
  else await deps.setEnterprise(settings ?? {});
  deps.logAudit({
    type: 'user', event: 'Cytology compliance features changed',
    detail: `${facilityId ? `Facility ${facilityId}` : 'Enterprise'}: ${describe(settings)}`,
    user: user.name || user.id, caseId: null, confidence: null,
  });
  return 'saved';
}
