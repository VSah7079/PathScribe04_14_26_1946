// src/services/reportEditing/reportSequence.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 579 (carried from 575): the Sequencer's reorder of a case's specimens
// and of the synoptic reports within each, moved out of the report page.
//
//   - Specimens follow the chosen order; one the order leaves out keeps its
//     place at the end (it used to be dropped from the case).
//   - Synoptic reports follow their specimen's order, then the chosen order
//     within it; a report the order leaves out stays, after its specimen's
//     listed ones (it used to be dropped too).
//
// The page saves the specimen order at once; the reports' order is part of
// the draft (Save Draft), so `reportsChanged` says whether it changed.
// ─────────────────────────────────────────────────────────────────────────────

export interface SequencedCase<S extends { id: string }, R extends { instanceId: string; specimenId: string }> {
  specimens: S[];
  synopticReports: R[];
  specimensChanged: boolean;
  reportsChanged: boolean;
}

export function sequenceCaseReports<S extends { id: string }, R extends { instanceId: string; specimenId: string }>(
  specimens: readonly S[],
  synopticReports: readonly R[],
  specimenOrder: readonly string[],
  synopticOrders: Readonly<Record<string, readonly string[]>>,
): SequencedCase<S, R> {
  const byId = new Map(specimens.map(s => [s.id, s]));
  const listed = specimenOrder.filter((id, i) => byId.has(id) && specimenOrder.indexOf(id) === i);
  const nextSpecimens = [...listed.map(id => byId.get(id)!), ...specimens.filter(s => !listed.includes(s.id))];

  const reportsBySpecimen = new Map<string, R[]>();
  for (const r of synopticReports) reportsBySpecimen.set(r.specimenId, [...(reportsBySpecimen.get(r.specimenId) ?? []), r]);
  const nextReports: R[] = [];
  const placed = new Set<string>();
  for (const s of nextSpecimens) {
    const own = reportsBySpecimen.get(s.id) ?? [];
    const order = synopticOrders[s.id] ?? [];
    for (const id of order) {
      const r = own.find(x => x.instanceId === id);
      if (r && !placed.has(r.instanceId)) { nextReports.push(r); placed.add(r.instanceId); }
    }
    for (const r of own) if (!placed.has(r.instanceId)) { nextReports.push(r); placed.add(r.instanceId); }
  }
  // Reports whose specimen isn't on the case keep their place at the end.
  for (const r of synopticReports) if (!placed.has(r.instanceId)) { nextReports.push(r); placed.add(r.instanceId); }

  const same = <T>(a: readonly T[], b: readonly T[]) => a.length === b.length && a.every((x, i) => x === b[i]);
  return {
    specimens: nextSpecimens,
    synopticReports: nextReports,
    specimensChanged: !same(specimens, nextSpecimens),
    reportsChanged: !same(synopticReports, nextReports),
  };
}
