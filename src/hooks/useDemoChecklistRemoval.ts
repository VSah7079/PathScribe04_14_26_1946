// src/hooks/useDemoChecklistRemoval.ts
// Batch 754: the Synoptic Library's "Demonstration checklists" card: what is in the library now, a dry run, and the
// removal (services/templates/demoChecklistRemoval.ts decides; this only holds the screen's state).
import { useCallback, useMemo, useState } from 'react';
import { planDemoChecklistRemoval, type LibraryEntry } from '@/services/templates/demoChecklists';
import { removeDemoChecklistsHere } from '@/services/templates/demoChecklistRemovalDeps';
import type { DemoChecklistRemovalResult } from '@/services/templates/demoChecklistRemoval';

export function useDemoChecklistRemoval(library: readonly LibraryEntry[]) {
  const plan = useMemo(() => planDemoChecklistRemoval(library), [library]);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<DemoChecklistRemovalResult | null>(null);

  const run = useCallback(async (dryRun: boolean) => {
    setBusy(true); setConfirming(false); setResult(null);
    try { setResult(await removeDemoChecklistsHere({ dryRun })); }
    finally { setBusy(false); setConfirming(false); }
  }, []);

  return {
    plan, confirming, busy, result,
    askToConfirm: () => { setResult(null); setConfirming(true); },
    cancel: () => setConfirming(false),
    check: () => run(true),
    remove: () => run(false),
  };
}
