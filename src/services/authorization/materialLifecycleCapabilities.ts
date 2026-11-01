// src/services/authorization/materialLifecycleCapabilities.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 731 (Lab Workflow & Batch spec §10.5, §10.6): an item's end state and
// re-embedding an exhausted block. One capability per action (PS-355):
//   material:end-state:record   recording an item's end state by hand (the
//                               Microtome, Slide Distribution); checked in
//                               services/itemEndStates/. The system's own records
//                               (disposal, referral, a confirmed exhaustion) ride
//                               on the permission of the action that makes them.
//   material:reembed:request    asking for an exhausted block's remnant or wet
//                               tissue to be re-embedded, from the Add-On Order
//                               builder or in answer to a "Block exhausted" flag;
//                               checked in services/addOnOrders/addOnOrderActions.ts.
//   material:reembed:complete   marking the block re-embedded at the Embedding
//                               Station, which releases the orders waiting for it;
//                               checked in the same file.
// Kept in its own file so capabilityCatalog.ts stays under 1,000 lines (CLAUDE.md
// rule 10). Seeds: capabilitySeeds.ts (MATERIAL_END_STATE, REEMBED_REQUEST,
// REEMBED_COMPLETE).
// ─────────────────────────────────────────────────────────────────────────────
import type { CapabilityDefinition } from './capabilityCatalog';

export const MATERIAL_LIFECYCLE_CAPABILITIES = [
  { key: 'material:end-state:record',  labelId: 'materialEndStateRecord',  group: 'casework', risk: 'high', requires: [] },
  { key: 'material:reembed:request',   labelId: 'materialReembedRequest',  group: 'casework', risk: 'high', requires: [] },
  { key: 'material:reembed:complete',  labelId: 'materialReembedComplete', group: 'casework', risk: 'high', requires: [] },
] as const satisfies readonly CapabilityDefinition[];
