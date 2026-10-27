// src/pages/LockboxDropOffPage/hooks/useLockboxFolder.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 645: the Overnight folder's data. One read, and the two actions (each adds an entry; the receipts are never edited).
// Ordering, waiting time and the QA figures all come from the service (services/lockbox/lockboxRules).
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useState } from 'react';
import { lockboxService } from '@/services';
import type { LockboxFolder } from '@/services';

export function useLockboxFolder(enabled: boolean) {
  const [folder, setFolder] = useState<LockboxFolder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const r = await lockboxService.getFolder();
    if (r.ok === true) { setFolder(r.data); setError(null); } else setError(r.error);
    setLoading(false);
  }, []);

  useEffect(() => { if (enabled) void refresh(); }, [enabled, refresh]);

  const run = useCallback(async (call: () => Promise<{ ok: boolean; error?: string }>): Promise<boolean> => {
    const r = await call();
    if (r.ok) await refresh(); else setError(r.error ?? 'UNKNOWN');
    return r.ok;
  }, [refresh]);

  return {
    folder, loading, error, refresh,
    markAccessioned: (receiptId: string) => run(() => lockboxService.markAccessioned(receiptId)),
    resolvePlaceholder: (receiptId: string, accessionNumber: string) => run(() => lockboxService.resolvePlaceholder(receiptId, accessionNumber)),
  };
}
