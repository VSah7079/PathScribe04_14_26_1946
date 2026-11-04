// src/services/authorization/slideImageCapabilities.ts
// Batch 750 (Pete, Oct 31, 2026): opening a slide in the laboratory's own digital pathology application from its
// reference preview (services/digitalPathology/slideImageOpen.ts). Audited with who, which slide and when.
// Seeds (capabilitySeeds.ts): the roles with case access, as for the case's attachments.
// Kept in its own file so capabilityCatalog.ts stays under 1,000 lines.
import type { CapabilityDefinition } from './capabilityCatalog';

export const SLIDE_IMAGE_CAPABILITIES = [
  { key: 'case:slide-image:open', labelId: 'caseSlideImageOpen', group: 'casework', risk: 'standard', requires: [] },
] as const satisfies readonly CapabilityDefinition[];
