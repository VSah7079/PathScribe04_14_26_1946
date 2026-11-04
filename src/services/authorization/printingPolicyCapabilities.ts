// src/services/authorization/printingPolicyCapabilities.ts
// Batch 734 (Pete, Oct 30, 2026; Lab Workflow spec Decision 6): turning direct browser-to-printer printing on or off
// for a facility (Facility editor, Printing tab). Checked in services/facilities/mockFacilityService.ts
// (guardConfigWrites). A configuration capability: Admin and Lab Director start with it (capabilitySeeds.ts
// CONFIG_SECTIONS). Kept in its own file so capabilityCatalog.ts stays under 1,000 lines.
import type { CapabilityDefinition } from './capabilityCatalog';

export const PRINTING_POLICY_CAPABILITIES = [
  { key: 'config:direct-device-printing:manage', labelId: 'configDirectDevicePrintingManage', group: 'configOperations', risk: 'high', requires: [] },
] as const satisfies readonly CapabilityDefinition[];
