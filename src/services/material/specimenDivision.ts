// src/services/material/specimenDivision.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 741 (Pete, fluid decisions 2 and 3, Oct 30, 2026).
//
// Decision 2, "Divide specimen": at Grossing or the Cytology Preparation bench a specimen is split into aliquots, one
// per destination (cytology, molecular, flow cytometry, microbiology). Pete's condition: "capture initial specimen
// volume alongside the split aliquots. Total volume accountability is a key audit metric." So a division records the
// starting volume and each aliquot's volume; the split may not exceed the start, and what remains is kept on the
// record. A specimen's protocol pre-fills the rows (its aliquot tracks).
//
// Decision 3, destination and status, not results: each aliquot carries where it goes (an in-house department or a
// reference laboratory) and a forward-only status, Not sent → Sent → Received → Result back. Pete's condition: the
// receiving department's accession number is required when the status becomes Result back. Results stay in the flow
// or microbiology system. An aliquot leaving the building rides an External Referral batch, as any other material.
//
// Both need a permission (`material:specimen:divide`, `material:aliquot-status:update`) and are audited. Pure rules
// here; the hook saves through the versioned case update.
// ─────────────────────────────────────────────────────────────────────────────

import { ALIQUOT_STATUSES, type AliquotDestination, type AliquotPurpose, type AliquotStatus, type Decant, type SpecimenDivision } from '@/types/case/Material';

export { ALIQUOT_STATUSES };
export type { AliquotDestination, AliquotStatus, SpecimenDivision };

export interface DivisionRow { purpose: AliquotPurpose; volumeMl: number; destination: AliquotDestination }

export type DivisionProblem = 'noStartingVolume' | 'noRows' | 'rowVolume' | 'rowDestination' | 'overStartingVolume' | 'alreadyDivided';

const round = (n: number) => Math.round(n * 100) / 100;

/** The volume accounted for: the split, and what remains (never negative). Pure. */
export function divisionTotals(startingVolumeMl: number, rows: readonly Pick<DivisionRow, 'volumeMl'>[]): { splitMl: number; remainingMl: number } {
  const splitMl = round(rows.reduce((n, r) => n + (Number.isFinite(r.volumeMl) ? r.volumeMl : 0), 0));
  return { splitMl, remainingMl: round(Math.max(0, startingVolumeMl - splitMl)) };
}

/** What is wrong with a division, or null. Pure. */
export function divisionProblem(startingVolumeMl: number | undefined, rows: readonly DivisionRow[], already = false): DivisionProblem | null {
  if (already) return 'alreadyDivided';
  if (!startingVolumeMl || !(startingVolumeMl > 0)) return 'noStartingVolume';
  if (rows.length === 0) return 'noRows';
  if (rows.some(r => !(r.volumeMl > 0))) return 'rowVolume';
  if (rows.some(r => !r.destination?.name?.trim())) return 'rowDestination';
  if (divisionTotals(startingVolumeMl, rows).splitMl > startingVolumeMl + 1e-9) return 'overStartingVolume';
  return null;
}

/** The rows a protocol pre-fills: one per suggested purpose, with its default destination. Pure. */
export function prefillRows(purposes: readonly AliquotPurpose[] | undefined, defaultDestination: (purpose: AliquotPurpose) => AliquotDestination): DivisionRow[] {
  return (purposes ?? []).map(p => ({ purpose: p, volumeMl: 0, destination: defaultDestination(p) }));
}

/** The in-house department an aliquot of this purpose goes to by default. Pure; the lab can change it. */
export function defaultDestinationFor(purpose: AliquotPurpose): AliquotDestination {
  const names: Record<AliquotPurpose, string> = {
    hpv: 'Molecular', molecular: 'Molecular', flow_cytometry: 'Flow Cytometry', microbiology: 'Microbiology', other: 'Laboratory',
  };
  return { kind: 'department', name: names[purpose] };
}

/** The aliquot decants a division makes, labelled after the specimen's last decant. Pure. */
export function aliquotsFor(
  specimen: { id: string; label: string; decants?: readonly Pick<Decant, 'label'>[] },
  fullAccession: string,
  rows: readonly DivisionRow[],
  ctx: { stamp: string; now: string; byName: string },
): Decant[] {
  const start = (specimen.decants ?? []).reduce((m, d) => Math.max(m, Number(/^D(\d+)$/.exec(d.label)?.[1] ?? 0)), 0);
  return rows.map((r, i) => {
    const label = `D${start + i + 1}`;
    return {
      id: `dcnt-${specimen.id}-${ctx.stamp}-${i + 1}`, label, decantType: 'aliquot', aliquotPurpose: r.purpose,
      volumeMl: r.volumeMl, destination: { ...r.destination, name: r.destination.name.trim() },
      aliquotStatus: 'not_sent', aliquotStatusHistory: [{ status: 'not_sent', at: ctx.now, byName: ctx.byName }],
      displayId: `${fullAccession}-${specimen.label}${label}`, createdAt: ctx.now, createdBy: ctx.byName, stains: [],
    } as Decant;
  });
}

export type StatusProblem = 'notAliquot' | 'notForward' | 'receivingAccessionRequired';

/** The next status an aliquot may move to (forward only, one step or more). Pure. */
export function statusChangeProblem(d: Pick<Decant, 'decantType' | 'aliquotStatus'>, next: AliquotStatus, receivingAccession?: string): StatusProblem | null {
  if (d.decantType !== 'aliquot') return 'notAliquot';
  const from = ALIQUOT_STATUSES.indexOf((d.aliquotStatus ?? 'not_sent') as AliquotStatus);
  if (ALIQUOT_STATUSES.indexOf(next) <= from) return 'notForward';
  if (next === 'result_back' && !receivingAccession?.trim()) return 'receivingAccessionRequired';
  return null;
}

/** The aliquot after a status change (with its history and, at Result back, the receiving accession). Pure. */
export function withStatus(d: Decant, next: AliquotStatus, ctx: { now: string; byName: string; receivingAccession?: string }): Decant {
  return {
    ...d, aliquotStatus: next,
    aliquotStatusHistory: [...(d.aliquotStatusHistory ?? []), { status: next, at: ctx.now, byName: ctx.byName }],
    ...(next === 'result_back' ? { receivingAccession: ctx.receivingAccession!.trim() } : {}),
  };
}

interface SpecimenLike { id: string; label: string; decants?: Decant[]; division?: SpecimenDivision }

export interface DivisionDeps {
  enforce: (key: 'material:specimen:divide' | 'material:aliquot-status:update', ctx: { caseId: string }) => Promise<{ allowed: boolean }>;
  /** Applies `change` to the case's current specimens and saves it (versioned); false when it was refused or not saved. */
  updateSpecimens: (caseId: string, change: (specimens: SpecimenLike[]) => SpecimenLike[] | null) => Promise<boolean>;
  audit: (entry: { event: string; detail: string; user: string; caseId: string }) => void;
  now: () => Date;
}

/** Divides a specimen into aliquots (decision 2): permission, the volume check, one save, one audit entry. */
export async function divideSpecimen(
  input: { caseId: string; accession: string; specimenId: string; startingVolumeMl: number; rows: DivisionRow[]; actor: { name: string } },
  deps: DivisionDeps,
): Promise<{ ok: true; aliquotLabels: string[]; remainingMl: number } | { ok: false; problem: DivisionProblem | 'notPermitted' | 'notSaved' }> {
  if (!(await deps.enforce('material:specimen:divide', { caseId: input.caseId })).allowed) return { ok: false, problem: 'notPermitted' };
  let problem: DivisionProblem | null = null;
  let made: Decant[] = [];
  let totals = { splitMl: 0, remainingMl: 0 };
  const now = deps.now().toISOString();
  const saved = await deps.updateSpecimens(input.caseId, specimens => {
    const sp = specimens.find(s => s.id === input.specimenId);
    if (!sp) return null;
    problem = divisionProblem(input.startingVolumeMl, input.rows, !!sp.division);
    if (problem) return null;
    made = aliquotsFor(sp, input.accession, input.rows, { stamp: String(deps.now().getTime()), now, byName: input.actor.name });
    totals = divisionTotals(input.startingVolumeMl, input.rows);
    const division: SpecimenDivision = { startingVolumeMl: input.startingVolumeMl, dividedAt: now, dividedByName: input.actor.name, aliquotIds: made.map(d => d.id), ...totals };
    return specimens.map(s => (s.id === sp.id ? { ...s, decants: [...(s.decants ?? []), ...made], division } : s));
  });
  if (problem) return { ok: false, problem };
  if (!saved) return { ok: false, problem: 'notSaved' };
  const sp = input.rows.map((r, i) => `${made[i]?.label} ${r.purpose} ${r.volumeMl} mL → ${r.destination.name}`).join('; ');
  deps.audit({ event: 'Specimen Divided', detail: `Specimen divided: starting volume ${input.startingVolumeMl} mL; ${sp}; ${totals.remainingMl} mL remaining.`, user: input.actor.name, caseId: input.accession });
  return { ok: true, aliquotLabels: made.map(d => d.label), remainingMl: totals.remainingMl };
}

/** Moves an aliquot forward (decision 3): permission, the forward-only rule, the receiving accession at Result back. */
export async function changeAliquotStatus(
  input: { caseId: string; accession: string; aliquotId: string; next: AliquotStatus; receivingAccession?: string; actor: { name: string } },
  deps: DivisionDeps,
): Promise<{ ok: true } | { ok: false; problem: StatusProblem | 'notPermitted' | 'notSaved' | 'notFound' }> {
  if (!(await deps.enforce('material:aliquot-status:update', { caseId: input.caseId })).allowed) return { ok: false, problem: 'notPermitted' };
  let problem: StatusProblem | 'notFound' | null = null;
  let label = '';
  const now = deps.now().toISOString();
  const saved = await deps.updateSpecimens(input.caseId, specimens => {
    const sp = specimens.find(s => (s.decants ?? []).some(d => d.id === input.aliquotId));
    const d = sp?.decants?.find(x => x.id === input.aliquotId);
    if (!sp || !d) { problem = 'notFound'; return null; }
    problem = statusChangeProblem(d, input.next, input.receivingAccession);
    if (problem) return null;
    label = d.displayId ?? d.label;
    return specimens.map(s => (s.id !== sp.id ? s : { ...s, decants: (s.decants ?? []).map(x => (x.id === d.id ? withStatus(x, input.next, { now, byName: input.actor.name, receivingAccession: input.receivingAccession }) : x)) }));
  });
  if (problem) return { ok: false, problem };
  if (!saved) return { ok: false, problem: 'notSaved' };
  deps.audit({ event: 'Aliquot Status Changed', detail: `Aliquot ${label}: ${input.next}${input.next === 'result_back' ? ` (receiving accession ${input.receivingAccession!.trim()})` : ''}.`, user: input.actor.name, caseId: input.accession });
  return { ok: true };
}
