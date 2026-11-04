// src/services/authorization/demoChecklistCapabilities.ts
// Batch 754 (Pete, Oct 31, 2026): removing the 19 demonstration checklists from a customer organisation's synoptic
// library. ForMedrixAI support only (platformOnly); checked in services/templates/demoChecklistRemoval.ts. Each
// checklist is archived through templateService.archiveTemplate, so it also needs config:protocol:retire. Kept in its
// own file so capabilityCatalog.ts stays under 1,000 lines.
import type { CapabilityDefinition } from './capabilityCatalog';

export const DEMO_CHECKLIST_CAPABILITIES = [
  { key: 'platform:demo-checklists:remove', labelId: 'platformDemoChecklistsRemove', group: 'platform', risk: 'high', requires: ['config:protocol:retire'], platformOnly: true },
] as const satisfies readonly CapabilityDefinition[];
