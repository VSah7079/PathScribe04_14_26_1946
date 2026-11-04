// src/hooks/useDeliveryBackgroundWork.ts
// Batch 521 (PS-281): while PathScribe is open, failed automatic deliveries are retried on the lab's
// schedule and fax transmission reports are applied (services/delivery/deliveryRetryDeps.ts).
// Mounted once, by the app shell. The decisions are in the service.
import { useEffect } from 'react';
import { browserRunsServerJob } from '@/services/serverJobs/browserStandIns';

export function useDeliveryBackgroundWork(enabled: boolean): void {
  useEffect(() => {
    // Batch 555: once the API server runs this job (VITE_SERVER_JOBS), never the browser too.
    if (!enabled || !browserRunsServerJob('delivery.retrySweep')) return;
    let stop = () => {};
    let cancelled = false;
    void import('@/services/delivery/deliveryRetryDeps').then(m => {
      if (!cancelled) stop = m.startDeliveryBackgroundWork();
    });
    return () => { cancelled = true; stop(); };
  }, [enabled]);
}
