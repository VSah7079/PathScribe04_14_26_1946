// src/services/molecular/cloneWellsForSupersede.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 669 (mol-9): the wells a Clone & Supersede carries onto the new plate. Pure.
//   - control and calibrator wells keep their control information (reagent-lot metadata, not a scan);
//   - a patient well bound to an in-house order (Order Queue → Assign to plate) keeps its order, accession and
//     specimen while the old plate is still an undispatched draft, so the order can move with it. Before this the
//     clone cleared every patient well, the orders stayed pointing at the superseded plate, and Take off plate was
//     refused there, leaving only Cancel;
//   - every other patient well is cleared, and no well keeps its movement history: a past scan is a fact about the
//     old plate's run, so each specimen must be scanned again.
// ─────────────────────────────────────────────────────────────────────────────

import type { MolecularBatch, MolecularWell } from './IMolecularBatchService';

export function cloneWellsForSupersede(original: Pick<MolecularBatch, 'wells' | 'status' | 'worklistDispatchedAt'>): MolecularWell[] {
  const orderBound = original.status === 'draft' && !original.worklistDispatchedAt;
  return original.wells.map(w => {
    const isControl = w.sampleType && w.sampleType !== 'PATIENT_SPECIMEN';
    if (!isControl && orderBound && w.sampleType === 'PATIENT_SPECIMEN' && w.orderId) {
      return { wellPosition: w.wellPosition, sampleType: w.sampleType, orderId: w.orderId, accessionNumber: w.accessionNumber, specimenUuid: w.specimenUuid };
    }
    return { wellPosition: w.wellPosition, sampleType: isControl ? w.sampleType : undefined, controlInfo: isControl ? w.controlInfo : undefined };
  });
}
