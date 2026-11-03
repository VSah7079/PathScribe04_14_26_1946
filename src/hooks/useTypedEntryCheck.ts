// src/hooks/useTypedEntryCheck.ts
// Batch 759 (spec §3, "Manual Keyboard Entry: … displays multi-identifier confirmation view"): true while the last id
// entered at this screen was typed (not scanned) and named this case, so the screen shows the identifiers to check
// against the container (components/Workstation/TypedEntryCheck.tsx). It goes away with the next scan.
import { useSyncExternalStore } from 'react';
import { lastEntry, subscribeToEntries, typedEntryNamesCase } from '@/services/scanEntry/lastEntry';

export function useTypedEntryCheck(ids: readonly (string | undefined)[]): boolean {
  const entry = useSyncExternalStore(subscribeToEntries, lastEntry, lastEntry);
  return typedEntryNamesCase(entry, ids);
}
