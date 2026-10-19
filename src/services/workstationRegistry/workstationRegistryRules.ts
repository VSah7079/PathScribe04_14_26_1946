// src/services/workstationRegistry/workstationRegistryRules.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 612: the workstation registry's rules. Pure; the service keeps the data.
//
// A registered workstation is one named computer at a performing-lab facility
// (for example "Grossing Station A"), with the context it works in (room,
// discipline, functional area, point of care) and, optionally, the printers
// bound to it. Two jobs follow from that:
//
//   • Identity. The workstation's agent presents a long-lived token. Only the
//     SHA-256 hash is stored; the token itself is shown once, at registration
//     or rotation, and cannot be shown again. A token can be revoked at once.
//     After a rotation the previous token keeps working for a short grace
//     period so the agent can be updated without an outage.
//   • Print routing. The registered id is the "workstation" tier of the print
//     routing rules (printRouting/resolvePrintDestination.ts), the most
//     specific tier, and the facility and point of care come from the binding.
//
// The agent program and the server's token check belong to the backend team;
// the browser's check-in below is a Simulated route that behaves the same way.
// ─────────────────────────────────────────────────────────────────────────────
import {
  FUNCTIONAL_AREAS_BY_DISCIPLINE, WORKSTATION_DISCIPLINES, type WorkstationDiscipline,
} from '../workstationGroups/IWorkstationGroupService';
import type { AgentRevokeReason } from '../siteAgent/siteAgentAdmin';
import type { PrintDestinationResolutionInput } from '../printRouting/resolvePrintDestination';

export const WORKSTATION_TOKEN_PREFIX = 'pswt_';
/** A token lasts this long unless rotated first ("long-lived"). */
export const WORKSTATION_TOKEN_LIFETIME_DAYS = 365;
/** From this many days before expiry a workstation is shown as "expiring soon". */
export const WORKSTATION_TOKEN_WARN_DAYS = 30;
/** After a rotation the previous token keeps working this long. */
export const WORKSTATION_PREVIOUS_TOKEN_GRACE_HOURS = 24;
export const WORKSTATION_NAME_MAX = 60;
export const WORKSTATION_ROOM_MAX = 60;
export const WORKSTATION_POINT_OF_CARE_MAX = 60;

export type WorkstationStatus = 'active' | 'revoked';

export interface WorkstationRecord {
  id: string;
  name: string;
  /** The performing-lab facility the workstation belongs to. */
  facilityId: string;
  roomLabel?: string;
  discipline?: WorkstationDiscipline;
  functionalArea?: string;
  /** Matches Location.pointOfCare in the print routing rules. */
  pointOfCare?: string;
  /** Destination ids from the site's agent printers. */
  reportPrinterId?: string;
  labelPrinterId?: string;
  status: WorkstationStatus;
  createdAt: string;
  createdBy: string;
  /** SHA-256 of the token, lower-case hex. The token itself is never kept. */
  tokenHash: string;
  /** The last four characters of the token, to tell tokens apart on screen. */
  tokenHint: string;
  tokenIssuedAt: string;
  tokenExpiresAt: string;
  previousTokenHash?: string;
  previousValidUntil?: string;
  lastSeenAt?: string;
  revokedAt?: string;
  revokedBy?: string;
  revokedReason?: AgentRevokeReason;
}

/** What the screen receives: the record without any token hash. */
export type WorkstationSummary = Omit<WorkstationRecord, 'tokenHash' | 'previousTokenHash'>;

export interface WorkstationDraft {
  name: string;
  facilityId: string;
  roomLabel?: string;
  discipline?: WorkstationDiscipline;
  functionalArea?: string;
  pointOfCare?: string;
  reportPrinterId?: string;
  labelPrinterId?: string;
}

export type WorkstationDraftError =
  | 'NAME_REQUIRED' | 'NAME_TOO_LONG' | 'NAME_TAKEN' | 'FACILITY_REQUIRED'
  | 'ROOM_TOO_LONG' | 'POINT_OF_CARE_TOO_LONG' | 'DISCIPLINE_UNKNOWN' | 'AREA_NOT_IN_DISCIPLINE';

const clean = (s: string | undefined): string => (s ?? '').trim().replace(/\s+/g, ' ');

/** Trims the free-text fields and drops the blank optional ones (pure). */
export function normaliseWorkstationDraft(d: WorkstationDraft): WorkstationDraft {
  const opt = (s: string | undefined) => { const v = clean(s); return v ? v : undefined; };
  return {
    name: clean(d.name),
    facilityId: d.facilityId,
    roomLabel: opt(d.roomLabel),
    discipline: d.discipline,
    functionalArea: opt(d.functionalArea),
    pointOfCare: opt(d.pointOfCare),
    reportPrinterId: opt(d.reportPrinterId),
    labelPrinterId: opt(d.labelPrinterId),
  };
}

/**
 * What is wrong with a draft, in the order it would be fixed (pure). A name is
 * unique within its facility among active workstations (revoked ones are kept
 * for the record and do not block a new one with the same name).
 */
export function checkWorkstationDraft(
  raw: WorkstationDraft,
  existing: readonly Pick<WorkstationRecord, 'id' | 'name' | 'facilityId' | 'status'>[],
  editingId?: string,
): WorkstationDraftError[] {
  const d = normaliseWorkstationDraft(raw);
  const errors: WorkstationDraftError[] = [];
  if (!d.name) errors.push('NAME_REQUIRED');
  else if (d.name.length > WORKSTATION_NAME_MAX) errors.push('NAME_TOO_LONG');
  else if (existing.some(w => w.id !== editingId && w.status === 'active' && w.facilityId === d.facilityId
    && w.name.toLocaleLowerCase() === d.name.toLocaleLowerCase())) errors.push('NAME_TAKEN');
  if (!d.facilityId) errors.push('FACILITY_REQUIRED');
  if ((d.roomLabel ?? '').length > WORKSTATION_ROOM_MAX) errors.push('ROOM_TOO_LONG');
  if ((d.pointOfCare ?? '').length > WORKSTATION_POINT_OF_CARE_MAX) errors.push('POINT_OF_CARE_TOO_LONG');
  if (d.discipline && !(WORKSTATION_DISCIPLINES as readonly string[]).includes(d.discipline)) errors.push('DISCIPLINE_UNKNOWN');
  else if (d.functionalArea && (!d.discipline || !FUNCTIONAL_AREAS_BY_DISCIPLINE[d.discipline].includes(d.functionalArea))) {
    errors.push('AREA_NOT_IN_DISCIPLINE');
  }
  return errors;
}

// ── Tokens ──────────────────────────────────────────────────────────────────

/** A new token: the prefix and 192 random bits as hex (pure given the random source). */
export function newWorkstationToken(random: (n: number) => Uint8Array): string {
  const bytes = random(24);
  return WORKSTATION_TOKEN_PREFIX + Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export const tokenHintOf = (token: string): string => token.slice(-4);

/** SHA-256 of the token as lower-case hex. */
export async function hashWorkstationToken(token: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

/** Whether a string has the shape of a workstation token (pure). The check-in refuses anything else before hashing. */
export function looksLikeWorkstationToken(s: string): boolean {
  return /^pswt_[0-9a-f]{48}$/.test(s.trim());
}

export const addDays = (iso: string, days: number): string => new Date(new Date(iso).getTime() + days * 86_400_000).toISOString();
export const addHours = (iso: string, hours: number): string => new Date(new Date(iso).getTime() + hours * 3_600_000).toISOString();

export type TokenCheck = 'ok' | 'unknown' | 'revoked' | 'expired';

/**
 * Whether a presented token's hash is accepted for this workstation (pure).
 * The current token works until it expires; after a rotation the previous one
 * works until its grace period ends. A revoked workstation accepts nothing.
 */
export function checkPresentedToken(ws: WorkstationRecord, presentedHash: string, now: string): TokenCheck {
  const isCurrent = presentedHash === ws.tokenHash;
  const isPrevious = !!ws.previousTokenHash && presentedHash === ws.previousTokenHash
    && !!ws.previousValidUntil && now <= ws.previousValidUntil;
  if (!isCurrent && !isPrevious) return 'unknown';
  if (ws.status === 'revoked') return 'revoked';
  if (isCurrent && now > ws.tokenExpiresAt) return 'expired';
  return 'ok';
}

// ── Display state ───────────────────────────────────────────────────────────

export type WorkstationState = 'active' | 'expiringSoon' | 'expired' | 'revoked';

export function workstationState(ws: Pick<WorkstationRecord, 'status' | 'tokenExpiresAt'>, now: string): WorkstationState {
  if (ws.status === 'revoked') return 'revoked';
  if (now > ws.tokenExpiresAt) return 'expired';
  if (now > addDays(ws.tokenExpiresAt, -WORKSTATION_TOKEN_WARN_DAYS)) return 'expiringSoon';
  return 'active';
}

/** Active ones first, then by facility and name; revoked ones last (pure). */
export function sortWorkstations<T extends Pick<WorkstationRecord, 'name' | 'facilityId' | 'status'>>(list: readonly T[]): T[] {
  return [...list].sort((a, b) =>
    (a.status === 'revoked' ? 1 : 0) - (b.status === 'revoked' ? 1 : 0)
    || a.facilityId.localeCompare(b.facilityId)
    || a.name.localeCompare(b.name));
}

// ── Print routing ───────────────────────────────────────────────────────────

export type WorkstationRoutingInput = Pick<PrintDestinationResolutionInput, 'workstationId' | 'facilityId' | 'pointOfCare'>;

/**
 * The part of a print routing request that comes from a registered workstation
 * (pure): its id for the workstation tier, its facility, and its point of care.
 * A revoked workstation contributes nothing.
 */
export function printRoutingInputFor(
  ws: Pick<WorkstationRecord, 'id' | 'facilityId' | 'pointOfCare' | 'status'> | undefined,
): WorkstationRoutingInput {
  if (!ws || ws.status !== 'active') return {};
  return { workstationId: ws.id, facilityId: ws.facilityId, pointOfCare: ws.pointOfCare };
}

/** The printer a workstation has bound for a purpose, if any (pure). */
export function boundPrinterFor(
  ws: Pick<WorkstationRecord, 'status' | 'reportPrinterId' | 'labelPrinterId'> | undefined,
  purpose: 'report' | 'label',
): string | undefined {
  if (!ws || ws.status !== 'active') return undefined;
  return purpose === 'report' ? ws.reportPrinterId : ws.labelPrinterId;
}

/** The per-computer setting that says which registered workstation this browser is. */
export const BOUND_WORKSTATION_SETTING = 'pathscribe_registered_workstation_id';
