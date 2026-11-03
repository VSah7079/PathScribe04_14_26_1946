// src/hooks/useRequisitionPreview.ts
// Batch 762: shows a requisition's pages. Asks the service for the address (checked and audited there: "Requisition
// Viewed"), reads the PDF from where it lives, and shows the page images of the requisition's range. Nothing is kept:
// the images are released when the preview closes (reference-only, spec §1).
import { useEffect, useState } from 'react';
import { requisitionService, type PageRange } from '@/services';
import { pageJpegs } from '@/services/requisitions/requisitionPages';
import { pagesInRange } from '@/services/requisitions/requisitionRules';

export type RequisitionRef = { linkId: string } | { unmatchedId: string };
export interface PreviewState { status: 'idle' | 'loading' | 'ready' | 'failed'; images: string[]; url?: string; error?: string }

export function useRequisitionPreview(target: { ref: RequisitionRef; pages: PageRange } | null, service = requisitionService): PreviewState {
  const [state, setState] = useState<PreviewState>({ status: 'idle', images: [] });
  const key = target ? JSON.stringify(target) : '';
  useEffect(() => {
    if (!target) { setState({ status: 'idle', images: [] }); return; }
    let cancelled = false;
    const made: string[] = [];
    setState({ status: 'loading', images: [] });
    (async () => {
      const opened = await service.openDocument(target.ref);
      if (!opened.ok) { if (!cancelled) setState({ status: 'failed', images: [], error: opened.error }); return; }
      try {
        const res = await fetch(opened.data.url.split('#')[0]);
        if (!res.ok) throw new Error(String(res.status));
        const pages = pagesInRange(await pageJpegs(new Uint8Array(await res.arrayBuffer())), target.pages);
        for (const p of pages) if (p) made.push(URL.createObjectURL(new Blob([p as BlobPart], { type: 'image/jpeg' })));
        if (!cancelled) setState({ status: 'ready', images: [...made], url: opened.data.url });
      } catch {
        if (!cancelled) setState({ status: 'failed', images: [], url: opened.data.url, error: 'UNREADABLE' });
      }
    })();
    return () => { cancelled = true; made.forEach(u => URL.revokeObjectURL(u)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, service]);
  return state;
}
