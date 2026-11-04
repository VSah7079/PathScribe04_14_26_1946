// src/services/grossing/routeCaseAfterGrossing.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 652: pool routing after the FIRST genuine completion of grossing. It used to run only from the case report
// page's Gross Complete (useGrossingCompletion); completing grossing on the Grossing screen (completeGrossing) never
// routed, so a case grossed there stayed out of the pools. Both screens now make this one call.
//
// A STAT case goes through routeStatCase (the "STAT routes immediately" setting), others through routeCase. Never
// throws: routing is a follow-up and must not undo a completed grossing.
// ─────────────────────────────────────────────────────────────────────────────
import type { Case } from '@/types/case/Case';
import { routeCase, routeStatCase, type RoutingResult } from '../cases/casePoolAssignmentService';

export interface RoutedAfterGrossing {
  routed: boolean;
  poolName?: string;
  result?: RoutingResult;
  error?: unknown;
}

export async function routeCaseAfterGrossing(
  caseAfterGrossing: Case,
  route: { routeCase: typeof routeCase; routeStatCase: typeof routeStatCase } = { routeCase, routeStatCase },
): Promise<RoutedAfterGrossing> {
  try {
    const result = caseAfterGrossing.order?.priority === 'STAT'
      ? await route.routeStatCase(caseAfterGrossing)
      : await route.routeCase(caseAfterGrossing);
    const routed = result.outcome === 'routed_to_pool' || result.outcome === 'routed_to_fallback';
    return { routed, poolName: routed ? result.poolName : undefined, result };
  } catch (error) {
    return { routed: false, error };
  }
}
