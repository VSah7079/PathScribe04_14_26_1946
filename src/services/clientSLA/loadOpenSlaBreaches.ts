// src/services/clientSLA/loadOpenSlaBreaches.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 610 (#164): which open cases on the worklist are past a client SLA
// target right now, by case id. Reads the SLAs and the facilities (a case's
// client) and applies clientSlaRules.openCaseSlaBreaches. Read-only.
// ─────────────────────────────────────────────────────────────────────────────
import { clientSlaService } from './clientSlaServiceInstance';
import { mockFacilityService } from '../facilities/mockFacilityService';
import { openCaseSlaBreaches, type CaseForSla, type SlaBreachKind } from './clientSlaRules';

export async function loadOpenSlaBreaches(cases: readonly CaseForSla[], now: Date = new Date()): Promise<Map<string, SlaBreachKind>> {
  const [slas, facilities] = await Promise.all([clientSlaService.getAll(), mockFacilityService.getAll()]);
  if (!slas.ok || slas.data.length === 0 || !facilities.ok) return new Map();
  return openCaseSlaBreaches(cases, slas.data, facilities.data, now);
}
