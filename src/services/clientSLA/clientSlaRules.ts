// src/services/clientSLA/clientSlaRules.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 610 (#87, #164): the rules for client service-level targets (hours to
// first touch and hours to the signed report, with optional STAT variants) and
// for judging cases against them. Pure: the clock is passed in.
//
// A case is measured from the time it was received. It breaches the first-touch
// target when it was first opened later than the target, or has not been
// opened and has already waited longer. It breaches the total target in the
// same way against the signed-out time. STAT cases use the STAT variant when
// the client has one.
// ─────────────────────────────────────────────────────────────────────────────
import type { ClientSLA } from './IClientSLAService';

export type ClientSlaProblem =
  | 'authorityRequired' | 'clientNameRequired' | 'duplicateAuthority'
  | 'targetInvalid' | 'firstTouchExceedsTotal' | 'statTargetInvalid';

export type ClientSlaMetric = 'firstTouch' | 'total';
export type ClientSlaState = 'met' | 'missed' | 'noCases';

export const HOURS_PER_MS = 1 / (1000 * 60 * 60);

const positive = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;

export function validateClientSla(draft: Omit<ClientSLA, 'id'> & { id?: string }, existing: readonly ClientSLA[]): ClientSlaProblem | null {
  if (!draft.assigningAuthority.trim()) return 'authorityRequired';
  if (!draft.clientName.trim()) return 'clientNameRequired';
  const authority = draft.assigningAuthority.trim().toLowerCase();
  if (existing.some(s => s.id !== draft.id && s.assigningAuthority.trim().toLowerCase() === authority)) return 'duplicateAuthority';
  if (!positive(draft.firstTouchTargetHrs) || !positive(draft.totalTatTargetHrs)) return 'targetInvalid';
  if (draft.firstTouchTargetHrs > draft.totalTatTargetHrs) return 'firstTouchExceedsTotal';
  const sf = draft.statFirstTouchTargetHrs;
  const st = draft.statTotalTatTargetHrs;
  if ((sf !== undefined && !positive(sf)) || (st !== undefined && !positive(st))) return 'statTargetInvalid';
  if (sf !== undefined && st !== undefined && sf > st) return 'firstTouchExceedsTotal';
  return null;
}

/** The target hours that apply to a case: the STAT variant for a STAT case when the client has one. */
export function slaTargetHours(sla: ClientSLA, metric: ClientSlaMetric, stat: boolean): number {
  if (metric === 'firstTouch') return stat && sla.statFirstTouchTargetHrs ? sla.statFirstTouchTargetHrs : sla.firstTouchTargetHrs;
  return stat && sla.statTotalTatTargetHrs ? sla.statTotalTatTargetHrs : sla.totalTatTargetHrs;
}

/** The slice of a case the SLA check reads. */
export interface CaseForSla {
  id: string;
  order?: { facilityId?: string; receivedDate?: string; priority?: string };
  firstOpenedAt?: string;
  diagnostic?: { issuedDate?: string };
  status?: string;
}

export interface CaseSlaResult {
  /** Hours the case took (or has waited so far); null when it was not received. */
  firstTouchHrs: number | null;
  totalHrs: number | null;
  firstTouchBreach: boolean;
  totalBreach: boolean;
  /** True when the breach is still running (the case is open and past its target). */
  firstTouchRunning: boolean;
  totalRunning: boolean;
}

/** How one case stands against its client's SLA. Null when the case has no received time. */
export function evaluateCaseSla(c: CaseForSla, sla: ClientSLA, now: Date): CaseSlaResult | null {
  const received = c.order?.receivedDate ? new Date(c.order.receivedDate).getTime() : NaN;
  if (isNaN(received)) return null;
  const stat = c.order?.priority === 'STAT';

  const measure = (endIso: string | undefined, target: number) => {
    const end = endIso ? new Date(endIso).getTime() : NaN;
    const done = !isNaN(end);
    const hrs = ((done ? end : now.getTime()) - received) * HOURS_PER_MS;
    if (hrs < 0) return { hrs: null as number | null, breach: false, running: false };
    return { hrs: Math.round(hrs * 10) / 10, breach: hrs > target, running: !done && hrs > target };
  };

  const ft = measure(c.firstOpenedAt, slaTargetHours(sla, 'firstTouch', stat));
  const tt = measure(c.diagnostic?.issuedDate, slaTargetHours(sla, 'total', stat));
  return {
    firstTouchHrs: ft.hrs, totalHrs: tt.hrs,
    firstTouchBreach: ft.breach, totalBreach: tt.breach,
    firstTouchRunning: ft.running, totalRunning: tt.running,
  };
}

export interface SlaFacilityRef { id: string; name: string; assigningAuthority: string }

export interface ClientSlaRow {
  slaId: string;
  assigningAuthority: string;
  clientName: string;
  caseCount: number;
  firstTouch: { within: number; breached: number; running: number; avgHrs: number | null; state: ClientSlaState };
  total: { within: number; breached: number; running: number; avgHrs: number | null; state: ClientSlaState };
  state: ClientSlaState;
}

const stateOf = (within: number, breached: number): ClientSlaState => (within + breached === 0 ? 'noCases' : breached > 0 ? 'missed' : 'met');

/** One row per active SLA: how its client's cases did. Cases with no matching SLA are not counted. */
export function buildClientSlaRows(
  cases: readonly CaseForSla[],
  slas: readonly ClientSLA[],
  facilities: readonly SlaFacilityRef[],
  now: Date,
): ClientSlaRow[] {
  const authorityByFacility = new Map(facilities.map(f => [f.id, f.assigningAuthority.trim().toLowerCase()]));
  const rows: ClientSlaRow[] = [];
  for (const sla of slas) {
    if (!sla.active) continue;
    const authority = sla.assigningAuthority.trim().toLowerCase();
    const mine = cases.filter(c => c.order?.facilityId && authorityByFacility.get(c.order.facilityId) === authority);
    const acc = {
      firstTouch: { within: 0, breached: 0, running: 0, sum: 0, n: 0 },
      total: { within: 0, breached: 0, running: 0, sum: 0, n: 0 },
    };
    let counted = 0;
    for (const c of mine) {
      const r = evaluateCaseSla(c, sla, now);
      if (!r) continue;
      counted += 1;
      const add = (k: 'firstTouch' | 'total', hrs: number | null, breach: boolean, running: boolean, finished: boolean) => {
        if (hrs === null) return;
        if (breach) acc[k].breached += 1; else if (finished) acc[k].within += 1;
        if (running) acc[k].running += 1;
        if (finished) { acc[k].sum += hrs; acc[k].n += 1; }
      };
      add('firstTouch', r.firstTouchHrs, r.firstTouchBreach, r.firstTouchRunning, !!c.firstOpenedAt);
      add('total', r.totalHrs, r.totalBreach, r.totalRunning, !!c.diagnostic?.issuedDate);
    }
    const part = (k: 'firstTouch' | 'total') => ({
      within: acc[k].within, breached: acc[k].breached, running: acc[k].running,
      avgHrs: acc[k].n > 0 ? Math.round((acc[k].sum / acc[k].n) * 10) / 10 : null,
      state: stateOf(acc[k].within, acc[k].breached),
    });
    const firstTouch = part('firstTouch');
    const total = part('total');
    rows.push({
      slaId: sla.id, assigningAuthority: sla.assigningAuthority, clientName: sla.clientName,
      caseCount: counted, firstTouch, total,
      state: counted === 0 ? 'noCases' : (firstTouch.state === 'missed' || total.state === 'missed') ? 'missed' : 'met',
    });
  }
  return rows.sort((a, b) => a.clientName.localeCompare(b.clientName));
}

export type SlaBreachKind = 'firstTouch' | 'total';

/**
 * Open cases that are past a client SLA target right now, by case id (for the
 * worklist badge). A signed-out case is not listed: a breach that is over is
 * shown in the TAT views, not on the worklist.
 */
export function openCaseSlaBreaches(
  cases: readonly CaseForSla[],
  slas: readonly ClientSLA[],
  facilities: readonly SlaFacilityRef[],
  now: Date,
): Map<string, SlaBreachKind> {
  const authorityByFacility = new Map(facilities.map(f => [f.id, f.assigningAuthority.trim().toLowerCase()]));
  const slaByAuthority = new Map(slas.filter(s => s.active).map(s => [s.assigningAuthority.trim().toLowerCase(), s]));
  const out = new Map<string, SlaBreachKind>();
  for (const c of cases) {
    if (c.diagnostic?.issuedDate) continue;
    const authority = c.order?.facilityId ? authorityByFacility.get(c.order.facilityId) : undefined;
    const sla = authority ? slaByAuthority.get(authority) : undefined;
    if (!sla) continue;
    const r = evaluateCaseSla(c, sla, now);
    if (!r) continue;
    if (r.totalRunning) out.set(c.id, 'total');
    else if (r.firstTouchRunning) out.set(c.id, 'firstTouch');
  }
  return out;
}

/** The audit entry for a change to a client SLA (hours only: a client, not a patient). */
export function clientSlaAudit(action: 'added' | 'changed' | 'removed', sla: ClientSLA, actorName: string) {
  const stat = sla.statFirstTouchTargetHrs || sla.statTotalTatTargetHrs
    ? `; STAT ${sla.statFirstTouchTargetHrs ?? sla.firstTouchTargetHrs} h / ${sla.statTotalTatTargetHrs ?? sla.totalTatTargetHrs} h` : '';
  return {
    type: 'user' as const, event: 'CLIENT_SLA_CHANGED', caseId: null, user: actorName, confidence: null,
    detail: `Client SLA for ${sla.assigningAuthority} ${action} (first touch ${sla.firstTouchTargetHrs} h, total ${sla.totalTatTargetHrs} h${stat}${sla.active ? '' : '; inactive'}).`,
  };
}
