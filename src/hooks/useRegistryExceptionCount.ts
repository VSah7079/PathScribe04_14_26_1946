// src/hooks/useRegistryExceptionCount.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 425 (Pete and his developer: "live exception badge"). How many registry
// submissions on the Registry Exceptions worklist need a person, for the
// signed-in user's own organisation (countRegistryExceptionsForUser). Shown on
// the top nav and the Quality & Compliance tiles to anyone who can open the
// worklist (screen:registry-exceptions:open); null otherwise, so no badge.
//
// Read on mount and when the window regains focus. Batch 560: with the API
// server's live-update hub, re-read when it says the count changed (topic
// `registryExceptions`, LIVE_UPDATES_SIGNALR.md §14), with a minute's safety
// poll; without a live connection, every minute as before (hooks/useLiveData.ts).
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from 'react';
import { useCapabilities } from './useCapabilities';
import { useLiveData } from './useLiveData';
import { countRegistryExceptionsForUser } from '@/services/registrySubmission/registryExceptionsService';
import { registryExceptionsLoadDeps } from '@/services/registrySubmission/registryExceptionsDeps';

export const REGISTRY_EXCEPTION_POLL_MS = 60_000;

export function useRegistryExceptionCount(): number | null {
  const capabilities = useCapabilities();
  const allowed = capabilities.has('screen:registry-exceptions:open');
  const [count, setCount] = useState<number | null>(null);
  // A read started before the capability went away (or the screen closed) is ignored.
  const generation = useRef(0);

  const read = useCallback(() => {
    if (!allowed) return;
    const mine = generation.current;
    countRegistryExceptionsForUser(registryExceptionsLoadDeps).then(n => { if (mine === generation.current) setCount(n); }).catch(() => {});
  }, [allowed]);

  useEffect(() => {
    if (!allowed) { setCount(null); return; }
    read();
    window.addEventListener('focus', read);
    return () => { generation.current += 1; window.removeEventListener('focus', read); };
  }, [allowed, read]);

  useLiveData(read, { topic: 'registryExceptions', pollMs: REGISTRY_EXCEPTION_POLL_MS, enabled: allowed });

  return count;
}
