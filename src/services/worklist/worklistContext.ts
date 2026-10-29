// src/services/worklist/worklistContext.ts
// ─────────────────────────────────────────────────────────────────────────────
// Which Worklist context (LIS Cases or Outreach) holds a given case, and the
// address that opens the Worklist on it.
//
// Batch 703: the Accession screen saves an Orchestration case (its id starts
// "O26-"), and the Worklist keeps those under the Outreach tile, not LIS
// Cases. "Go to Worklist" used to open whichever context the session was on
// (LIS Cases unless changed), so the case just saved was not on the screen the
// button opened. The Accession screen now opens the Worklist on the context
// that holds the case.
// ─────────────────────────────────────────────────────────────────────────────

import { isOrchCaseId } from '../cases/reportingModeRouting';
import type { WorklistContextFilter } from './worklistTileCounts';

/** The Worklist context a case is listed under. */
export function worklistContextForCase(caseId: string | null | undefined): WorklistContextFilter {
  return isOrchCaseId(caseId) ? 'outreach' : 'lis';
}

/** A `?context=` value the Worklist accepts; anything else is ignored. */
export function resolveWorklistContextParam(value: string | null | undefined): WorklistContextFilter | null {
  return value === 'lis' || value === 'outreach' ? value : null;
}

/** The Worklist address that opens on the context holding `caseId`. With no case, the plain Worklist address. */
export function worklistPathForCase(caseId: string | null | undefined): string {
  return caseId ? `/worklist?context=${worklistContextForCase(caseId)}` : '/worklist';
}

/** The context the Worklist opens on: an address `?context=` wins, then the session's last context, then LIS Cases. */
export function initialWorklistContext(search: string, sessionValue: string | null | undefined): WorklistContextFilter {
  return resolveWorklistContextParam(new URLSearchParams(search).get('context')) ?? resolveWorklistContextParam(sessionValue) ?? 'lis';
}
