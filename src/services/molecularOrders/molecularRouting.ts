// src/services/molecularOrders/molecularRouting.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 467 (Pete: "per test and facility: run in-house or send to a
// reference lab, chosen when the order is placed"). A molecular test lists the
// labs that run it in-house (StainType.inHouseFacilityIds, set in the Stain
// Dictionary). At an order for a performing lab that runs it, in-house is
// offered and starts selected; send-out is always offered. The engine checks
// the choice again when the order arrives. Pure.
// ─────────────────────────────────────────────────────────────────────────────

import type { StainType } from '../stains/IStainService';
import type { ExecutionRouting } from './molecularOrderTypes';

/** The routings an order for this test at this performing lab may take, and the one it starts with. */
export function molecularRoutingChoices(
  stainType: Pick<StainType, 'category' | 'inHouseFacilityIds'>,
  performingLabFacilityId: string | undefined,
): { choices: ExecutionRouting[]; defaultRouting: ExecutionRouting } {
  const inHouse = stainType.category === 'Molecular' && !!performingLabFacilityId
    && (stainType.inHouseFacilityIds ?? []).includes(performingLabFacilityId);
  return inHouse ? { choices: ['IN_HOUSE', 'SEND_OUT'], defaultRouting: 'IN_HOUSE' } : { choices: ['SEND_OUT'], defaultRouting: 'SEND_OUT' };
}

/** The routing an order takes: the one asked for when allowed, else none (refused); nothing asked: the default. */
export function resolveMolecularRouting(
  stainType: Pick<StainType, 'category' | 'inHouseFacilityIds'>,
  performingLabFacilityId: string | undefined,
  requested: ExecutionRouting | undefined,
): ExecutionRouting | undefined {
  const { choices, defaultRouting } = molecularRoutingChoices(stainType, performingLabFacilityId);
  if (!requested) return defaultRouting;
  return choices.includes(requested) ? requested : undefined;
}
