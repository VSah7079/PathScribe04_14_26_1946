// src/hooks/useReportPlacements.ts
// Batch 742: the report's placements and the links they show from, for the in-app report preview (which shows the
// images where the PDF prints them). Imports the two services directly so the preview stays light.
import { useEffect, useMemo, useState } from 'react';
import { listCaseReportImages, subscribeCaseReportImages } from '@/services/imageAssociation/caseReportImages';
import { placementFetchUrl } from '@/services/imageAssociation/placementLinks';
/** The report's placements, kept current (the in-app report preview shows them where the PDF prints them). */
export function useReportPlacements(caseId: string | undefined, accession: string | undefined) {
  const ref = useMemo(() => ({ caseId: caseId ?? null, accession: accession ?? null }), [caseId, accession]);
  const [placements, setPlacements] = useState(() => listCaseReportImages(ref));
  useEffect(() => {
    setPlacements(listCaseReportImages(ref));
    return subscribeCaseReportImages(() => setPlacements(listCaseReportImages(ref)));
  }, [ref]);
  return placements;
}

/** The link each placement shows from (a fresh read link for a file in the hospital's storage); null when unreachable. */
export function usePlacementLinks(placements: readonly { id: string; imageUrl: string; origin?: unknown }[]) {
  const [links, setLinks] = useState<Record<string, string | null>>({});
  useEffect(() => {
    let live = true;
    void Promise.all(placements.map(async p => [p.id, await placementFetchUrl(p as never).catch(() => null)] as const))
      .then(pairs => { if (live) setLinks(Object.fromEntries(pairs)); });
    return () => { live = false; };
  }, [placements]);
  return links;
}
