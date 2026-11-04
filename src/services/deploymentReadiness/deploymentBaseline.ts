// src/services/deploymentReadiness/deploymentBaseline.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 330: the UI files that break the deployment-readiness rules today,
// recorded when the guard was added (see deploymentReadiness.guard.test.ts).
//
// Batch 506 (PS-477): all three lists are EMPTY. Every screen reaches its
// services through `@/services` (or takes them as a dependency), keeps display
// preferences in utils/uiPreferences.ts and workstation settings in
// utils/workstationSettings.ts, and imports no database SDK. The guard now
// also fails if anything is added back.
//
// These lists may only SHRINK. When you clean a file up, remove it here:
// the guard fails if a listed file no longer needs its entry, so the list
// can't go stale. A file not listed here may not break the rules at all.
//
// Paths are relative to src/.
// ─────────────────────────────────────────────────────────────────────────────

/** UI files that import a specific mock service (…/mockXxx) instead of the
 *  services index (`@/services`) or an injected dependency. */
export const MOCK_IMPORT_BASELINE: readonly string[] = [];

/** UI files that use localStorage/sessionStorage directly. Display
 *  preferences belong in utils/uiPreferences.ts; data belongs in a service. */
export const BROWSER_STORAGE_BASELINE: readonly string[] = [];

/** UI files that import the Firebase SDK directly instead of going through a
 *  service. */
export const FIREBASE_IMPORT_BASELINE: readonly string[] = [];
