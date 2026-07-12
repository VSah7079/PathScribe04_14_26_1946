// src/constants/computationalActions.ts
// ─────────────────────────────────────────────────────────────────────────────
// Previously the system-action IDs, voice phrases, and audit keys for the
// full Computational Sidecar (open/close sidecar, read result aloud,
// next/prev assay, order modal, place/cancel orders, computational tab).
// All of it removed along with the Sidecar itself, the ordering apparatus,
// and the Computational tab — see IFlagService.ts's Flag.tagClass comment
// and ComputationalPanel.tsx's deletion for the full reasoning. Checked
// every event and audit key individually against the live codebase before
// removing anything here — zero remaining listeners or callers for any of
// them.
//
// What's left is real: flag creation/edit/deactivation audit logging in
// FlagConfigPage.tsx, which has nothing to do with the Sidecar and was
// never part of what got removed.
// ─────────────────────────────────────────────────────────────────────────────

export const COMP_AUDIT = {
  // Configuration — admin actions (Flag Maintenance)
  CONFIG_FLAG_CREATED:     'comp_config_flag_created',     // { flagId, flagName, lisCode }
  CONFIG_FLAG_UPDATED:     'comp_config_flag_updated',     // { flagId, changes: string[] }
  CONFIG_FLAG_DEACTIVATED: 'comp_config_flag_deactivated', // { flagId, flagName }
} as const;

export type CompAuditKey = typeof COMP_AUDIT[keyof typeof COMP_AUDIT];
