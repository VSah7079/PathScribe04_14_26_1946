// src/services/cosd/cosdDestination.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 620 (part C, PS-800): where a UK cancer registry submission goes and how long a rejected one may take to correct.
// Held for the ENTERPRISE, and a performing facility may have its own (Pete, Oct 19 2026: same pattern as delivery schedules
// and billing release). PathScribe holds the destination configuration and the status; the transport itself (REST with mutual
// TLS, SFTP, a portal) is the interface engine's, and credentials and endpoints are never held here. Pure.
// Contract: docs/architecture/UK_COSD_API.md
// ─────────────────────────────────────────────────────────────────────────────
import type { ID } from '../types';
import { OUTBOUND_TRANSPORTS, type OutboundTransport } from '../outboundQueue/outboundQueueTypes';
import { COSD_DEFAULT_CORRECTION_WORKING_DAYS } from './cosdModel';
import { isIsoDate } from './workingDays';

/** The transports a UK destination can be labelled with: the same fixed ids the Outbound Queue screen translates. */
export const COSD_TRANSPORTS = OUTBOUND_TRANSPORTS;

export interface CosdDestinationSettings {
  transport: OutboundTransport;
  /** Working days (Monday to Friday, not in nonWorkingDates) a rejected submission may take to be corrected, counted from the rejection. */
  correctionWorkingDays: number;
  /** Local dates (YYYY-MM-DD) that are not working days, kept by the lab (bank holidays). */
  nonWorkingDates: string[];
}

/** One stored destination: the enterprise's (facilityId null) or one performing facility's own. */
export interface CosdDestination extends CosdDestinationSettings {
  id: ID;
  facilityId: ID | null;
  updatedAt: string;
}

export type CosdDestinationInput = CosdDestinationSettings & { facilityId: ID | null };

export const DEFAULT_COSD_DESTINATION: CosdDestinationSettings = {
  transport: 'restMtls', correctionWorkingDays: COSD_DEFAULT_CORRECTION_WORKING_DAYS, nonWorkingDates: [],
};

export type CosdDestinationProblem = 'transportInvalid' | 'daysInvalid' | 'dateInvalid';

export const MAX_CORRECTION_WORKING_DAYS = 30;

/** Every reason a destination can't be saved (empty when it can). */
export function validateDestination(input: CosdDestinationSettings): CosdDestinationProblem[] {
  const problems: CosdDestinationProblem[] = [];
  if (!(COSD_TRANSPORTS as readonly string[]).includes(input.transport)) problems.push('transportInvalid');
  if (!Number.isInteger(input.correctionWorkingDays) || input.correctionWorkingDays < 1 || input.correctionWorkingDays > MAX_CORRECTION_WORKING_DAYS) problems.push('daysInvalid');
  if (!Array.isArray(input.nonWorkingDates) || input.nonWorkingDates.some(d => typeof d !== 'string' || !isIsoDate(d))) problems.push('dateInvalid');
  return problems;
}

export interface ResolvedCosdDestination extends CosdDestinationSettings {
  /** Where it came from: the facility's own, the enterprise's, or the built-in default when none is stored. */
  source: 'facility' | 'enterprise' | 'default';
}

/** The destination that applies to a performing facility: its own, else the enterprise's, else the default. */
export function resolveCosdDestination(entries: readonly CosdDestination[], facilityId: ID | null | undefined): ResolvedCosdDestination {
  const own = facilityId ? entries.find(e => e.facilityId === facilityId) : undefined;
  const hit = own ?? entries.find(e => e.facilityId === null);
  if (!hit) return { ...DEFAULT_COSD_DESTINATION, source: 'default' };
  return { transport: hit.transport, correctionWorkingDays: hit.correctionWorkingDays, nonWorkingDates: [...hit.nonWorkingDates], source: own ? 'facility' : 'enterprise' };
}
