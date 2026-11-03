// src/hooks/useQcCheckpoint.ts
// Batch 763: the Slide Distribution QC checkpoint's state: the staining runs and scanned images waiting for QC, the
// sign-off being filled in (every slide passes unless marked failed), and the stainers to pick from when the run's is
// not known. Decisions and capability checks: services/stainQc/stainQcService.ts.
import { useCallback, useEffect, useState } from 'react';
import { equipmentService, stainQcService, type ImageQcFailReason, type QcCheckpoint, type SlideQcOutcome, type StainRunQc } from '@/services';
import { signOffProblems } from '@/services/stainQc/stainQcRules';

export function useQcCheckpoint(refreshKey: unknown, service = stainQcService) {
  const [checkpoint, setCheckpoint] = useState<QcCheckpoint>({ runs: [], images: [] });
  const [stainers, setStainers] = useState<{ id: string; name: string }[]>([]);
  const [openRunId, setOpenRunId] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<Record<string, SlideQcOutcome[]>>({});
  const [stainerFor, setStainerFor] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const r = await service.getCheckpoint();
    if (!r.ok) return;
    setCheckpoint(r.data);
    setOpenRunId(id => id ?? r.data.runs[0]?.batchId ?? null);
  }, [service]);
  useEffect(() => { void reload(); }, [reload, refreshKey]);
  useEffect(() => {
    void equipmentService.getActive('stainer').then(r => setStainers(r.ok ? r.data.map(e => ({ id: e.id, name: e.name })) : [])).catch(() => undefined);
  }, []);

  const outcomesOf = useCallback((run: StainRunQc): SlideQcOutcome[] =>
    outcomes[run.batchId] ?? run.slides.map(s => ({ ...s, outcome: 'pass' })), [outcomes]);

  const setSlide = useCallback((run: StainRunQc, slideId: string, change: Partial<SlideQcOutcome>) => {
    setProblem(null);
    setOutcomes(all => {
      const cur = all[run.batchId] ?? run.slides.map(s => ({ ...s, outcome: 'pass' as const }));
      return { ...all, [run.batchId]: cur.map(o => (o.slideId === slideId ? { ...o, ...change, ...(change.outcome === 'pass' ? { action: undefined, reason: undefined } : {}) } : o)) };
    });
  }, []);

  const signOff = useCallback(async (run: StainRunQc) => {
    const r = await service.signOffRun(run.batchId, outcomesOf(run), stainerFor[run.batchId] ?? undefined);
    if (!r.ok) { setProblem(r.error); return r; }
    setOpenRunId(null);
    await reload();
    return r;
  }, [service, outcomesOf, stainerFor, reload]);

  const decideImage = useCallback(async (stainId: string, outcome: 'pass' | 'fail', reason?: ImageQcFailReason) => {
    const r = await service.decideImage(stainId, outcome, reason);
    if (!r.ok) setProblem(r.error); else await reload();
    return r;
  }, [service, reload]);

  return {
    checkpoint, stainers, openRunId, setOpenRunId, outcomesOf, setSlide, problem,
    stainerFor: (id: string) => stainerFor[id] ?? '', setStainer: (id: string, eq: string) => setStainerFor(m => ({ ...m, [id]: eq })),
    canSign: (run: StainRunQc) => signOffProblems(run.slides, outcomesOf(run)).length === 0,
    signOff, decideImage, reload,
  };
}
