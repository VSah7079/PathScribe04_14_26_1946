// src/services/authorization/stainQcCapabilities.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 763 (Pete: "a Post-Stain / Pre-Distribution QC checkpoint … configurable per instrument", stainers and
// scanners): one capability per action, each checked in services/stainQc/stainQcService.ts (authorizationService.enforce).
//
//   stain:qc:sign-off         sign off a staining run in PathScribe (Option B): every slide passes, or a failed slide is
//                             marked for re-stain or re-cut with a reason. Audited (Stain QC Passed / Failed).
//   stain:qc:override         sign off a run that waits for its stainer's own sign-off (Option A), when the instrument's
//                             result does not come. Audited, naming the override.
//   scan:image-qc:sign-off    release a scanned image to the pathologist, or send it back to be scanned again. Audited.
//   config:stain-qc:manage    the QC defaults for stainers and scanners (each instrument's own mode is on the Equipment
//                             screen, under config:equipment:manage). Audited (Stain QC Settings Saved).
//
// Seeds (capabilitySeeds.ts): the roles that open Slide Distribution get the two sign-offs; Lab Director the override;
// Admin and Lab Director the configuration with the other configuration sections. Superadmin holds everything.
// Kept in its own file so capabilityCatalog.ts stays under 1,000 lines.
// ─────────────────────────────────────────────────────────────────────────────
import type { CapabilityDefinition } from './capabilityCatalog';

export const STAIN_QC_CAPABILITIES = [
  { key: 'stain:qc:sign-off', labelId: 'stainQcSignOff', group: 'casework', risk: 'high', requires: [] },
  { key: 'stain:qc:override', labelId: 'stainQcOverride', group: 'casework', risk: 'high', requires: ['stain:qc:sign-off'] },
  { key: 'scan:image-qc:sign-off', labelId: 'scanImageQcSignOff', group: 'casework', risk: 'high', requires: [] },
  { key: 'config:stain-qc:manage', labelId: 'configStainQcManage', group: 'configLab', risk: 'high', requires: [] },
] as const satisfies readonly CapabilityDefinition[];
