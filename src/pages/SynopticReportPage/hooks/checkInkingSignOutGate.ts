// src/pages/SynopticReportPage/hooks/checkInkingSignOutGate.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 484 (Structured Inking Sign-Out & Grossing Gate Logic Engine;
// PS-519 follow-up). The async "gather the real data" half of Gate B,
// mirroring checkStainQcGate.ts's own real, established shape exactly — a
// case in, either null (nothing to show) or the real evaluateInkingGate.ts
// result out. The pure "decide" half lives there, not here.
//
// Deliberately returns null for anything that doesn't need to interrupt
// Sign-Out: a clean case, or one with only Severity 2 issues — Gate B
// never hard-blocks on Severity 2 (advisory only, per the spec), and this
// app doesn't have a separate always-on inline advisory surface at
// Sign-Out the way the Grossing screen does for Gate A, so there is
// nothing additional for this gate to show in that case. Only BLOCK,
// OVERRIDE_REQUIRED and PALETTE_UNAVAILABLE are real interruptions.
// ─────────────────────────────────────────────────────────────────────────────

import { inkColorService, facilityService } from '@/services';
import { getInkingValidationMode } from '@/services/grossing/inkingSiteSettings';
import { evaluateInkingGate, gateSpecimensOf, type InkingGateResult } from '@/services/grossing/evaluateInkingGate';
import type { Case } from '@/types/case/Case';

export async function checkInkingSignOutGate(caseData: Case, userRoles: readonly string[]): Promise<InkingGateResult | null> {
  const facilityId = caseData.order?.facilityId ?? '';
  const mode = getInkingValidationMode(facilityId);

  const [colorsRes, facilityRes] = await Promise.all([
    inkColorService.getAll().catch(() => ({ ok: false as const })),
    facilityId ? facilityService.getById(facilityId).catch(() => ({ ok: false as const })) : Promise.resolve({ ok: false as const }),
  ]);

  const activeInkColorCodes = colorsRes.ok ? new Set(colorsRes.data.filter(c => c.active).map(c => c.code.trim().toUpperCase())) : undefined;
  const jurisdiction = facilityRes.ok ? facilityRes.data.jurisdiction : undefined;

  const result = evaluateInkingGate({
    caseId: caseData.id, facilityId, actionContext: 'SIGN_OUT',
    specimens: gateSpecimensOf(caseData), mode, jurisdiction, userRoles,
    activeInkColorCodes, paletteAvailable: colorsRes.ok,
  });

  return result.mode === 'WARN' ? null : result;
}
