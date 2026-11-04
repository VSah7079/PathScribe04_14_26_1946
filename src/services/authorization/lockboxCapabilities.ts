// src/services/authorization/lockboxCapabilities.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 645: the capabilities of Lockbox Drop-Off (after-hours specimens left in the lockbox; the morning team's
// Overnight folder). Kept in their own file, spread into CAPABILITY_CATALOG, so capabilityCatalog.ts (999 lines)
// does not pass 1,000 lines (CLAUDE.md rule 10). Each is checked in services/lockbox/lockboxService.ts
// (authorizationService.enforce) and the screen capability by the route (services/screens/screenAccess.ts).
//
//   screen:lockbox-drop-off:open   see the Lockbox Drop-Off tile and screen (the kiosk). Opening is not audited.
//   lockbox:specimen:receive       scan a container and write its immutable "Received in Lockbox" receipt, or a
//                                  placeholder receipt when no order matches. Audited (no patient data).
//   lockbox:folder:review          the Overnight folder: the receipts not yet accessioned, the time-to-receipt
//                                  summary, and marking a receipt accessioned. Audited.
//   lockbox:placeholder:resolve    attach the real order or accession number to a placeholder receipt. Audited.
//
// Seeds (capabilitySeeds.ts): Accessioner all four, Admin the screen and the folder (oversight); Pathologist none.
// ─────────────────────────────────────────────────────────────────────────────
import type { CapabilityDefinition } from './capabilityCatalog';

export const LOCKBOX_CAPABILITIES = [
  { key: 'screen:lockbox-drop-off:open', labelId: 'screenLockboxDropOffOpen', group: 'screens', risk: 'standard', requires: [] },
  { key: 'lockbox:specimen:receive', labelId: 'lockboxSpecimenReceive', group: 'casework', risk: 'high', requires: ['screen:lockbox-drop-off:open'] },
  { key: 'lockbox:folder:review', labelId: 'lockboxFolderReview', group: 'casework', risk: 'high', requires: ['screen:lockbox-drop-off:open'] },
  { key: 'lockbox:placeholder:resolve', labelId: 'lockboxPlaceholderResolve', group: 'casework', risk: 'high', requires: ['lockbox:folder:review'] },
] as const satisfies readonly CapabilityDefinition[];
