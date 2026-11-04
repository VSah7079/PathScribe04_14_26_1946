// src/services/authorization/batchCarrierCapabilities.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 726: Batch Management's overrides (Batch 404) and the carrier actions at the workstations (Batch 726), kept
// in their own file and spread into CAPABILITY_CATALOG so capabilityCatalog.ts stays under 1,000 lines (CLAUDE.md
// rule 10). Seeds: capabilitySeeds.ts (BATCH_OVERRIDE_ACTIONS, STATION_CARRIER_ACTIONS).
// ─────────────────────────────────────────────────────────────────────────────
import type { CapabilityDefinition } from './capabilityCatalog';

export const BATCH_CARRIER_CAPABILITIES = [
  // Batch 404 (Pete: "3 permissions, keep users"): Batch Management's three
  // chain-of-custody overrides. Completing a reconciliation with items
  // missing or unexpected, aborting a batch, and acknowledging a cold-chain
  // temperature excursion. Checked in services/batches/mockBatchService.ts;
  // seeded to every role with the Batch Management screen.
  { key: 'batch:reconciliation:override',          labelId: 'batchReconciliationOverride',        group: 'casework', risk: 'high', requires: [] },
  { key: 'batch:run:abort',                        labelId: 'batchRunAbort',                      group: 'casework', risk: 'high', requires: [] },
  { key: 'batch:cold-chain-excursion:acknowledge', labelId: 'batchColdChainExcursionAcknowledge', group: 'casework', risk: 'high', requires: [] },
  // Batch 726 (Lab Workflow & Batch spec, Decision 1, §2, §7): carriers at the workstations. Sealing a manifest and
  // moving a carrier to its next step (batches/mockBatchService.ts), opening a carrier at a station for another step
  // after the warning (recordCarrierScan), and reading the station scan trail (stationScans/). Seeded to every role
  // with Batch Management or a bench workstation (Embedding, Microtome, Slide Distribution).
  { key: 'batch:manifest:seal',            labelId: 'batchManifestSeal',          group: 'casework', risk: 'standard', requires: [] },
  { key: 'batch:carrier:advance',          labelId: 'batchCarrierAdvance',        group: 'casework', risk: 'standard', requires: [] },
  { key: 'station:scan-mismatch:continue', labelId: 'stationScanMismatchContinue', group: 'casework', risk: 'standard', requires: [] },
  { key: 'station:scan-history:view',      labelId: 'stationScanHistoryView',     group: 'casework', risk: 'standard', requires: [] },
] as const satisfies readonly CapabilityDefinition[];
