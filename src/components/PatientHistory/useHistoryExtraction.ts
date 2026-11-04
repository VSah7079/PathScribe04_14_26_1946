// src/components/PatientHistory/useHistoryExtraction.ts
// Batch 621: starts (or reuses) the AI extraction for the historical case on screen, in the background. The history is already
// shown; this never delays it, and a failure here is a recorded state, not an error. Advisory only (services/historyExtraction).
import { useCallback, useEffect, useRef, useState } from 'react';
import { loadStoredHistoryExtraction, startHistoryExtraction } from '@/services/historyExtraction/historyExtractionRuntime';
import type { HistoryExtraction } from '@/services/historyExtraction/historyExtraction';

export interface HistoryExtractionCase { id: string; diagnosis: string; microscopic: string; facilityId?: string }
export type HistoryExtractionView =
  | { state: 'hidden' }
  | { state: 'working'; extraction: HistoryExtraction | null }
  | { state: 'ready'; extraction: HistoryExtraction };

export function useHistoryExtraction(item: HistoryExtractionCase, userName: string): { view: HistoryExtractionView; refresh: () => void } {
  const [view, setView] = useState<HistoryExtractionView>({ state: 'hidden' });
  const run = useRef(0);
  const { id, diagnosis, microscopic, facilityId } = item;

  const start = useCallback(() => {
    const mine = ++run.current;
    const input = { sourceCaseId: id, facilityId, text: { diagnosis, microscopic } };
    const live = (fn: () => void) => { if (mine === run.current) fn(); };
    void (async () => {
      const stored = await loadStoredHistoryExtraction(input);
      if (stored.state === 'off' || stored.state === 'notPermitted') return live(() => setView({ state: 'hidden' }));
      live(() => setView({ state: 'working', extraction: stored.state === 'ready' ? stored.extraction : null }));
      const result = await startHistoryExtraction(input, userName);
      live(() => setView(result.state === 'ready' ? { state: 'ready', extraction: result.extraction } : { state: 'hidden' }));
    })();
  }, [id, diagnosis, microscopic, facilityId, userName]);

  useEffect(() => { start(); return () => { run.current++; }; }, [start]);
  return { view, refresh: start };
}
