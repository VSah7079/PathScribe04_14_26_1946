// src/services/authorization/intraopCapabilities.ts
// Batch 669 (ops-14): capabilities for the intraoperative / OR Suite area. Kept in their own file, spread into
// CAPABILITY_CATALOG, so capabilityCatalog.ts does not grow (CLAUDE.md rule 10).
//
//   config:or-board-demo:run   Start demo and Stop demo on the OR Suite Live Board. Start adds four invented DEMO
//                              cases to the real intraoperative data and Stop removes them, so only an administrator
//                              (sales demonstrations, training) may run them. Checked in
//                              services/intraop/mockIntraoperativeService.ts (seed, advance and remove).
import type { CapabilityDefinition } from './capabilityCatalog';

export const INTRAOP_CAPABILITIES = [
  { key: 'config:or-board-demo:run', labelId: 'configOrBoardDemoRun', group: 'administration', risk: 'high', requires: [] },
] as const satisfies readonly CapabilityDefinition[];
