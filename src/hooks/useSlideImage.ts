// src/hooks/useSlideImage.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 750 (Pete, Oct 31, 2026, S10): what a slide's reference preview shows, and opening the slide in the
// laboratory's own digital pathology application. Orchestration only; the decisions are in
// services/digitalPathology/slideImages.ts (state, addresses, thumbnail) and slideImageOpen.ts (permission, address,
// audit). Loads the case's facility (for a facility's own addresses), the preview the interface delivered, and the WSI
// Viewers list (the older place a viewer address was set). The window is the remembered "slide image" window
// (useCompanionWindow), kept open when the screen that opened it closes: it belongs to the other application.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSystemConfig } from '@/contexts/SystemConfigContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanionWindow } from './useCompanionWindow';
import { auditService, authorizationService, caseService, slidePreviewService, wsiViewerVendorService } from '@/services';
import {
  SLIDE_IMAGE_WINDOW_NAME, effectiveAddresses, listedViewerTemplate, slideImageView, stateHasImage,
  type SlidePreview, type SlideScanFields,
} from '@/services/digitalPathology/slideImages';
import { hostOf, prepareSlideImageOpen, recordSlideImageOpened } from '@/services/digitalPathology/slideImageOpen';

export type SlideImageMessage = 'noAddress' | 'notPermitted' | 'blocked' | null;

export interface UseSlideImageInput {
  slideDisplayId: string;
  caseId: string;
  accession: string;
  scan: SlideScanFields;
}

// One look-up per case while the page is open: a block editor lists many slides of the same case.
const facilityOfCase = new Map<string, Promise<string | undefined>>();
function caseFacility(caseId: string): Promise<string | undefined> {
  let p = facilityOfCase.get(caseId);
  if (!p) {
    p = caseService.getCase(caseId).then(c => c?.order?.facilityId ?? undefined).catch(() => undefined);
    facilityOfCase.set(caseId, p);
  }
  return p;
}

export function useSlideImage({ slideDisplayId, caseId, accession, scan }: UseSlideImageInput) {
  const { enterpriseConfig } = useSystemConfig();
  const { user } = useAuth();
  const { openCompanion } = useCompanionWindow({ windowName: SLIDE_IMAGE_WINDOW_NAME, preferredWidth: 1400, preferredHeight: 900, closeOnUnmount: false });
  const [loaded, setLoaded] = useState<{ facilityId?: string; delivered: SlidePreview | null; listedViewer: string } | null>(null);
  const [message, setMessage] = useState<SlideImageMessage>(null);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);

  useEffect(() => {
    let live = true;
    setLoaded(null);
    setThumbnailFailed(false);
    void Promise.all([
      caseFacility(caseId),
      slidePreviewService.getForSlide(slideDisplayId).then(r => (r.ok ? r.data : null)).catch(() => null),
      wsiViewerVendorService.getActive().then(r => (r.ok ? listedViewerTemplate(r.data) : '')).catch(() => ''),
    ]).then(([facilityId, delivered, listedViewer]) => { if (live) setLoaded({ facilityId, delivered, listedViewer }); });
    return () => { live = false; };
  }, [caseId, slideDisplayId]);

  const settings = enterpriseConfig.slideImages;
  const view = useMemo(() => {
    if (!loaded) return null;
    const addresses = effectiveAddresses(settings, loaded.facilityId, undefined, loaded.listedViewer);
    return slideImageView(scan, loaded.delivered, addresses, { slideId: slideDisplayId, accession });
  }, [loaded, settings, scan, slideDisplayId, accession]);

  /** Call straight from the click: the browser allows a new window only while the click is fresh. */
  const open = useCallback(async () => {
    if (!loaded) return;
    setMessage(null);
    const prepared = await prepareSlideImageOpen(
      { slideDisplayId, accession, caseId, facilityId: loaded.facilityId, settings, listedViewerTemplate: loaded.listedViewer },
      { authorization: authorizationService },
    );
    if (!prepared.ok) { setMessage(prepared.reason); return; }
    const result = await openCompanion(prepared.url);
    if (result === 'blocked') { setMessage('blocked'); return; }
    recordSlideImageOpened({ slideDisplayId, caseId, user: user?.id ?? 'unknown', host: hostOf(prepared.url) }, { audit: auditService });
  }, [loaded, slideDisplayId, accession, caseId, settings, openCompanion, user?.id]);

  return {
    loading: !loaded,
    view,
    canOpen: !!view && stateHasImage(view.state),
    showThumbnail: !!view?.thumbnailUrl && !thumbnailFailed,
    onThumbnailError: () => setThumbnailFailed(true),
    message,
    open,
  };
}
