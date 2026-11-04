// src/services/authorization/benchReasonCapabilities.ts
// Batch 736 (Pete, Oct 30, 2026): rewording, adding, ordering and retiring the bench's tap-to-pick reasons
// (Configuration → System → Bench Reasons). Checked in services/reasons/mockReasonDictionaryService.ts for the bench
// categories. A configuration capability: Admin and Lab Director start with it (capabilitySeeds.ts CONFIG_SECTIONS).
// Kept in its own file so capabilityCatalog.ts stays under 1,000 lines.
import type { CapabilityDefinition } from './capabilityCatalog';

export const BENCH_REASON_CAPABILITIES = [
  { key: 'config:bench-reasons:manage', labelId: 'configBenchReasonsManage', group: 'configOperations', risk: 'high', requires: [] },
] as const satisfies readonly CapabilityDefinition[];
