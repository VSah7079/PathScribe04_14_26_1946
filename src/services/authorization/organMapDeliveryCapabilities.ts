// src/services/authorization/organMapDeliveryCapabilities.ts
// Batch 751 (Pete, Oct 31, 2026, Lab Workflow spec section 12.3): setting a performing lab's organ map delivery to its
// laboratory system (Facility editor, LIS Integration tab). Checked in services/facilities/mockFacilityService.ts
// (guardConfigWrites). A configuration capability: Admin and Lab Director start with it (capabilitySeeds.ts
// CONFIG_SECTIONS). Kept in its own file so capabilityCatalog.ts stays under 1,000 lines.
import type { CapabilityDefinition } from './capabilityCatalog';

export const ORGAN_MAP_DELIVERY_CAPABILITIES = [
  { key: 'config:organ-map-delivery:manage', labelId: 'configOrganMapDeliveryManage', group: 'configOperations', risk: 'high', requires: [] },
] as const satisfies readonly CapabilityDefinition[];
