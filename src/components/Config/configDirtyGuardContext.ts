// src/components/Config/configDirtyGuardContext.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-128: how a Configuration editor tells ConfigurationPage it has unsaved
// changes, and how a section's own navigation asks before leaving them.
//
// Batch 309 started this with one `setDirty(boolean)` for the Macros tab, and
// only switching Configuration tabs checked it. Batch 437 made it cover the
// whole page (services/configDirty/configDirtyRegistry.ts):
//   • `useReportConfigDirty(dirty)`: an inline form that keeps a draft beside
//     the saved value reports whether they differ (exact). Several can report
//     at once; each clears its report when it unmounts.
//   • Editor dialogs don't report: the page watches for edits inside open
//     dialogs (hooks/useConfigEditTracking.ts).
//   • `useConfigNavigationGuard()`: a section's own sub-tabs and section list
//     run their change through `guard(...)`, which asks first when anything
//     is unsaved.
//   • The page tells the app-wide guard (contexts/DirtyStateContext), so the
//     logo, breadcrumbs, nav bar, header search and Sign Out ask too.
//
// Outside ConfigurationPage (a unit test mounting one section) the context is
// a harmless no-op: reports go nowhere and `guard` runs the action at once.
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useContext, useEffect, useId } from 'react';

export interface ConfigDirtyGuardContextValue {
  /** Batch 309's single flag (Macros, Assist LIS polling); same as report('legacy', dirty). */
  setDirty: (dirty: boolean) => void;
  /** An editor with exact draft-vs-saved state says whether it has unsaved changes. */
  report: (sourceId: string, dirty: boolean) => void;
  /** Runs a section's own navigation now, or after "Discard changes" when anything is unsaved. */
  guard: (action: () => void) => void;
}

const noopContextValue: ConfigDirtyGuardContextValue = {
  setDirty: () => {},
  report: () => {},
  guard: (action) => action(),
};

export const ConfigDirtyGuardContext = createContext<ConfigDirtyGuardContextValue>(noopContextValue);

export function useConfigDirtyGuard(): ConfigDirtyGuardContextValue {
  return useContext(ConfigDirtyGuardContext);
}

/** Reports this editor's unsaved state while it is mounted. */
export function useReportConfigDirty(dirty: boolean): void {
  const { report } = useContext(ConfigDirtyGuardContext);
  const id = useId();
  useEffect(() => { report(id, dirty); }, [report, id, dirty]);
  useEffect(() => () => report(id, false), [report, id]);
}

/** A section's own navigation (sub-tabs, section list), guarded. */
export function useConfigNavigationGuard(): (action: () => void) => void {
  return useContext(ConfigDirtyGuardContext).guard;
}
