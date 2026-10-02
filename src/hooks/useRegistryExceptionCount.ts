// src/hooks/useRegistryExceptionCount.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 425 (Pete and his developer: "live exception badge"). How many registry
// submissions on the Registry Exceptions worklist need a person, for the
// signed-in user's own organisation (countRegistryExceptionsForUser). Shown on
// the top nav and the Quality & Compliance tiles to anyone who can open the
// worklist (screen:registry-exceptions:open); null otherwise, so no badge.
//
// Today: read on mount, every minute, and when the window regains focus. With
// the API server: the server pushes the count over SignalR
// (ReceiveExceptionCountUpdate, PS-345) and this re-reads on each push, the
// same way hooks/useLiveIntraopUpdates.ts does, with the minute poll kept as
// the safety net.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { useCapabilities } from './useCapabilities';
import { countRegistryExceptionsForUser } from '@/services/registrySubmission/registryExceptionsService';
import { registryExceptionsLoadDeps } from '@/services/registrySubmission/registryExceptionsDeps';

export const REGISTRY_EXCEPTION_POLL_MS = 60_000;

export function useRegistryExceptionCount(): number | null {
  const capabilities = useCapabilities();
  const allowed = capabilities.has('screen:registry-exceptions:open');
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!allowed) { setCount(null); return; }
    let cancelled = false;
    const read = () => { countRegistryExceptionsForUser(registryExceptionsLoadDeps).then(n => { if (!cancelled) setCount(n); }).catch(() => {}); };
    read();
    const timer = setInterval(read, REGISTRY_EXCEPTION_POLL_MS);
    window.addEventListener('focus', read);
    return () => { cancelled = true; clearInterval(timer); window.removeEventListener('focus', read); };
  }, [allowed]);

  return count;
}
