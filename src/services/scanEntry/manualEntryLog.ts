// src/services/scanEntry/manualEntryLog.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 759 (Patient Verification, Outside Case Tracking and Audit Logging spec, §2.2, Pete, Nov 2, 2026): an id typed
// (or searched) instead of scanned is let through at once, with no confirmation, PIN or second click, and a discreet
// Manual Entry flag is written:
//   - on the audit trail, linked to the case, with the time, the workstation, the user (name and id) and the module;
//   - on the station scan log as the action `typed` (when there is a station and the entry named an item), so the
//     case's scan history shows it.
// The case record itself is not written (Pete, Nov 2, 2026): a write on every typed lookup would compete with the
// bench's own saves of the case.
// ─────────────────────────────────────────────────────────────────────────────
import type { NewAuditLog } from '@/services/auditlog/IAuditService';
import type { NewStationScanEvent, StationScanMaterial } from '@/services/stationScans/IStationScanEventService';

/** The Pathology Workspace modules the flag covers (spec §2.2), from the screen's address. */
export const WORKSPACE_MODULES = [
  'grossing', 'embedding', 'microtome', 'cytologyPrep', 'slideDistribution', 'addOnOrders', 'marginExceptionReview',
  'cytology', 'molecular', 'batchManagement', 'caseScreens', 'other',
] as const;
export type WorkspaceModule = typeof WORKSPACE_MODULES[number];

const MODULE_PATHS: [string, WorkspaceModule][] = [
  ['/workstations/grossing', 'grossing'], ['/workstations/embedding', 'embedding'], ['/workstations/microtomy', 'microtome'],
  ['/workstations/cytology-prep', 'cytologyPrep'], ['/workstations/slide-distribution', 'slideDistribution'],
  ['/add-on-orders', 'addOnOrders'], ['/margin-exception-review', 'marginExceptionReview'],
  ['/cytology', 'cytology'], ['/molecular', 'molecular'], ['/batch-management', 'batchManagement'],
  ['/case/', 'caseScreens'], ['/report/', 'caseScreens'], ['/worklist', 'caseScreens'],
];

export function workspaceModuleOf(pathname: string): WorkspaceModule {
  return MODULE_PATHS.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? 'other';
}

/** English names for the audit detail (audit records stay literal English). */
const MODULE_NAMES: Record<WorkspaceModule, string> = {
  grossing: 'Grossing', embedding: 'Embedding', microtome: 'Microtome', cytologyPrep: 'Cytology Preparation',
  slideDistribution: 'Slide Distribution', addOnOrders: 'Add-On Order Builder', marginExceptionReview: 'Margin Exception Review',
  cytology: 'Cytology', molecular: 'Molecular', batchManagement: 'Batch Management', caseScreens: 'Case screens', other: 'Other screen',
};

export interface ManualEntry {
  /** What was typed. */
  value: string;
  module: WorkspaceModule;
  /** The case, when the entry resolved to one. */
  caseAccession?: string;
  /** What it resolved to: the item's id and kind. */
  itemId?: string;
  materialType?: StationScanMaterial;
  stationId: string | null;
  userId: string;
  userName: string;
  /** Where it was typed: the scan field of a bench, or the header search. */
  via: 'scanField' | 'search';
}

export interface ManualEntryDeps {
  audit: (entry: NewAuditLog) => Promise<unknown>;
  station: (events: NewStationScanEvent[]) => Promise<unknown>;
}

/** The audit entry for a manual entry. Pure. */
export function manualEntryAudit(e: ManualEntry): NewAuditLog {
  const where = e.via === 'search' ? 'search' : 'scan field';
  return {
    type: 'user', event: 'Manual Entry',
    detail: `Typed, not scanned, in the ${MODULE_NAMES[e.module]} ${where}: "${e.value}". User ${e.userName} (${e.userId}); workstation ${e.stationId ?? 'not set'}.`,
    user: e.userName, caseId: e.caseAccession ?? null, confidence: null, stationId: e.stationId,
  };
}

/** Writes the flag; never throws and never holds up the work (fire and forget). Station log only with a station. */
export async function recordManualEntry(e: ManualEntry, deps: ManualEntryDeps): Promise<void> {
  await Promise.allSettled([
    deps.audit(manualEntryAudit(e)),
    // On the station log only when the entry named an item there (a typed carrier barcode or a miss stays audit-only).
    e.stationId && e.itemId
      ? deps.station([{
          itemId: e.itemId, materialType: e.materialType ?? 'unknown', caseAccession: e.caseAccession,
          stationId: e.stationId, userId: e.userId, userName: e.userName, action: 'typed', result: 'ok',
          note: `Manual entry (${MODULE_NAMES[e.module]})`,
        }])
      : Promise.resolve(),
  ]);
}
