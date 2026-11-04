// src/services/workstationRegistry/workstationRegistryService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 612: the workstation registry service. Dependencies are passed in so it
// is tested without the browser; workstationRegistryServices.ts wires the
// browser demo's pieces and adds the capability checks. With the API server
// this is replaced by HTTP calls; the screens and the rules do not change.
//
// Every change is audited and PHI-free. A token is returned once, by register
// and rotateToken, and only its hash is kept.
// ─────────────────────────────────────────────────────────────────────────────
import type { ServiceResult } from '../types';
import type { NewAuditLog } from '../auditlog/IAuditService';
import type { AgentRevokeReason } from '../siteAgent/siteAgentAdmin';
import { revokeReasonValid } from '../siteAgent/siteAgentAdmin';
import {
  WORKSTATION_PREVIOUS_TOKEN_GRACE_HOURS, WORKSTATION_TOKEN_LIFETIME_DAYS,
  addDays, addHours, checkPresentedToken, checkWorkstationDraft, looksLikeWorkstationToken,
  newWorkstationToken, normaliseWorkstationDraft, printRoutingInputFor, sortWorkstations, tokenHintOf,
  type TokenCheck, type WorkstationDraft, type WorkstationRoutingInput, type WorkstationRecord, type WorkstationSummary,
} from './workstationRegistryRules';

export const WORKSTATION_REGISTRY_KEY = 'workstationRegistry';

export interface WorkstationRegistryDeps {
  load: <T>(key: string, fallback: T) => T;
  save: (key: string, value: unknown) => void;
  audit: (e: NewAuditLog) => Promise<unknown>;
  actor: () => { name: string };
  now: () => string;
  random: (n: number) => Uint8Array;
  hash: (token: string) => Promise<string>;
}

export type WorkstationRegistryError =
  | 'NOT_FOUND' | 'ALREADY_REVOKED' | 'REVOKE_REASON_INVALID'
  | ReturnType<typeof checkWorkstationDraft>[number];

/** The answer to a Simulated check-in. */
export interface WorkstationCheckIn {
  result: TokenCheck | 'malformed';
  /** Always true in the browser: the real check is the API server's. */
  simulated: true;
  workstation?: WorkstationSummary;
}

const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const fail = (error: WorkstationRegistryError): ServiceResult<never> => ({ ok: false, error });

export function toSummary(r: WorkstationRecord): WorkstationSummary {
  const { tokenHash: _h, previousTokenHash: _p, ...rest } = r;
  void _h; void _p;
  return rest;
}

const audit = (event: string, detail: string, user: string): NewAuditLog =>
  ({ type: 'user', event, detail, user, caseId: null, confidence: null });

export function createWorkstationRegistryService(d: WorkstationRegistryDeps) {
  const read = (): WorkstationRecord[] => d.load<WorkstationRecord[]>(WORKSTATION_REGISTRY_KEY, []);
  const write = (list: WorkstationRecord[]) => d.save(WORKSTATION_REGISTRY_KEY, list);
  const log = (e: NewAuditLog) => { void d.audit(e).catch(() => undefined); };
  const newId = () => 'ws-' + Array.from(d.random(6), b => b.toString(16).padStart(2, '0')).join('');

  /** Issues a token and the fields that record it. */
  async function issue(now: string) {
    const token = newWorkstationToken(d.random);
    return {
      token,
      fields: {
        tokenHash: await d.hash(token),
        tokenHint: tokenHintOf(token),
        tokenIssuedAt: now,
        tokenExpiresAt: addDays(now, WORKSTATION_TOKEN_LIFETIME_DAYS),
      },
    };
  }

  return {
    async list(): Promise<ServiceResult<WorkstationSummary[]>> {
      return ok(sortWorkstations(read()).map(toSummary));
    },

    async get(id: string): Promise<ServiceResult<WorkstationSummary>> {
      const w = read().find(x => x.id === id);
      return w ? ok(toSummary(w)) : fail('NOT_FOUND');
    },

    /** Registers a workstation. The token is in the answer once and cannot be read again. */
    async register(raw: WorkstationDraft): Promise<ServiceResult<{ workstation: WorkstationSummary; token: string }>> {
      const list = read();
      const problems = checkWorkstationDraft(raw, list);
      if (problems.length) return fail(problems[0]);
      const draft = normaliseWorkstationDraft(raw);
      const now = d.now();
      const { token, fields } = await issue(now);
      const rec: WorkstationRecord = { ...draft, id: newId(), status: 'active', createdAt: now, createdBy: d.actor().name, ...fields };
      write([...list, rec]);
      log(audit('Workstation Registered', `Workstation "${rec.name}" registered at facility ${rec.facilityId}; token ending ${rec.tokenHint} issued, expires ${rec.tokenExpiresAt.slice(0, 10)}.`, rec.createdBy));
      return ok({ workstation: toSummary(rec), token });
    },

    /** Changes the name, facility and context binding. The token is untouched. */
    async update(id: string, raw: WorkstationDraft): Promise<ServiceResult<WorkstationSummary>> {
      const list = read();
      const current = list.find(w => w.id === id);
      if (!current) return fail('NOT_FOUND');
      if (current.status === 'revoked') return fail('ALREADY_REVOKED');
      const problems = checkWorkstationDraft(raw, list, id);
      if (problems.length) return fail(problems[0]);
      const draft = normaliseWorkstationDraft(raw);
      const next: WorkstationRecord = { ...current, ...draft };
      write(list.map(w => (w.id === id ? next : w)));
      log(audit('Workstation Changed', `Workstation "${next.name}" changed (facility ${next.facilityId}, room ${next.roomLabel ?? 'none'}, area ${next.functionalArea ?? 'none'}, report printer ${next.reportPrinterId ?? 'none'}, label printer ${next.labelPrinterId ?? 'none'}).`, d.actor().name));
      return ok(toSummary(next));
    },

    /** A new token. The previous one keeps working for the grace period. */
    async rotateToken(id: string): Promise<ServiceResult<{ workstation: WorkstationSummary; token: string }>> {
      const list = read();
      const current = list.find(w => w.id === id);
      if (!current) return fail('NOT_FOUND');
      if (current.status === 'revoked') return fail('ALREADY_REVOKED');
      const now = d.now();
      const { token, fields } = await issue(now);
      const next: WorkstationRecord = {
        ...current, ...fields,
        previousTokenHash: current.tokenHash,
        previousValidUntil: addHours(now, WORKSTATION_PREVIOUS_TOKEN_GRACE_HOURS),
      };
      write(list.map(w => (w.id === id ? next : w)));
      log(audit('Workstation Token Rotated', `Token for "${next.name}" replaced (ending ${current.tokenHint} to ${next.tokenHint}); the old token works until ${next.previousValidUntil}.`, d.actor().name));
      return ok({ workstation: toSummary(next), token });
    },

    /** Cuts the workstation off at once. A revoked workstation is kept for the record and cannot be restored. */
    async revoke(id: string, reason: AgentRevokeReason): Promise<ServiceResult<WorkstationSummary>> {
      if (!revokeReasonValid(reason)) return fail('REVOKE_REASON_INVALID');
      const list = read();
      const current = list.find(w => w.id === id);
      if (!current) return fail('NOT_FOUND');
      if (current.status === 'revoked') return fail('ALREADY_REVOKED');
      const now = d.now();
      const note = (reason.note ?? '').trim();
      const next: WorkstationRecord = {
        ...current, status: 'revoked', revokedAt: now, revokedBy: d.actor().name,
        revokedReason: note ? { code: reason.code, note } : { code: reason.code },
        previousTokenHash: undefined, previousValidUntil: undefined,
      };
      write(list.map(w => (w.id === id ? next : w)));
      log(audit('Workstation Revoked', `Workstation "${next.name}" revoked (${reason.code}); its token no longer works.`, next.revokedBy as string));
      return ok(toSummary(next));
    },

    /**
     * The Simulated check-in: what the API server does when a workstation's agent
     * presents its token. Records the time last seen on success; refusals are audited.
     */
    async checkIn(token: string): Promise<ServiceResult<WorkstationCheckIn>> {
      const presented = token.trim();
      if (!looksLikeWorkstationToken(presented)) return ok({ result: 'malformed', simulated: true });
      const hash = await d.hash(presented);
      const list = read();
      const now = d.now();
      const match = list.find(w => w.tokenHash === hash || w.previousTokenHash === hash);
      if (!match) {
        log(audit('Workstation Check-In Refused', 'A token that matches no registered workstation was presented (Simulated check-in).', d.actor().name));
        return ok({ result: 'unknown', simulated: true });
      }
      const result = checkPresentedToken(match, hash, now);
      if (result !== 'ok') {
        log(audit('Workstation Check-In Refused', `Token for "${match.name}" refused: ${result} (Simulated check-in).`, d.actor().name));
        return ok({ result, simulated: true, workstation: toSummary(match) });
      }
      const next = { ...match, lastSeenAt: now };
      write(list.map(w => (w.id === match.id ? next : w)));
      return ok({ result, simulated: true, workstation: toSummary(next) });
    },

    /** The print routing input that comes from a registered workstation (empty when unknown or revoked). */
    async printRoutingInput(id: string | null | undefined): Promise<WorkstationRoutingInput> {
      if (!id) return {};
      return printRoutingInputFor(read().find(w => w.id === id));
    },
  };
}

export type WorkstationRegistryService = ReturnType<typeof createWorkstationRegistryService>;
