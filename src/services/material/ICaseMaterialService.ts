// src/services/material/ICaseMaterialService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 618 (PS-482): the one call that saves a change to a case's material
// (a decant added, changed or deleted), as an interface so the demo and the
// API server each have a version. The change comes back as a complete,
// updated material tree plus the billing lines it affected (Batch 452).
//
// What stays in the browser: the optimistic store (`caseMaterialStore.ts`) that
// shows a change at once and rolls it back; selection and expansion state. They
// call this service to save and never decide the outcome themselves.
// Contract: docs/architecture/CASE_MATERIAL_API.md.
// ─────────────────────────────────────────────────────────────────────────────
import type { DecantChange } from './materialTree';
import type { DecantSaveResult } from './caseMaterialService';

export interface ICaseMaterialService {
  /** One atomic change on the case's current version; nothing is written on a refusal or a stale version. */
  applyDecantChange(caseId: string, change: DecantChange, expectedVersion: number): Promise<DecantSaveResult>;
}
