// src/components/SlideImage/SlideImagePreview.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 750 (Pete, Oct 31, 2026, S10): a slide's reference preview. PathScribe has no slide viewer: this shows the small
// image the laboratory's scanner or image system made for the slide, unchanged, labelled "Reference preview. Not for
// diagnosis.", and selecting it opens the slide in the laboratory's own digital pathology application, in a separate
// window that remembers where it was put. Without an image it says where the slide is: No image yet, Queued, Scanning,
// Scan failed, or Failed image quality. Replaces WsiViewerLaunchButton (the launch button with the WSI Viewers list).
// Render only: hooks/useSlideImage.ts and services/digitalPathology/slideImages.ts decide.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useTranslation } from 'react-i18next';
import { LoadingState } from '@/components/Common/LoadingState';
import { useSlideImage } from '@/hooks/useSlideImage';
import { accessionOfSlideId, type SlideScanFields } from '@/services/digitalPathology/slideImages';
import './SlideImagePreview.css';

interface SlideImagePreviewProps {
  slideDisplayId?: string;
  /** The slide's scanner status (a stain row carries it). */
  scan: SlideScanFields;
  /** The case and its accession; taken from the slide identifier when not given. */
  caseId?: string;
  accession?: string;
}

export const SlideImagePreview: React.FC<SlideImagePreviewProps> = ({ slideDisplayId, ...rest }) =>
  slideDisplayId ? <SlideImagePreviewBody slideDisplayId={slideDisplayId} {...rest} /> : null;

const SlideImagePreviewBody: React.FC<SlideImagePreviewProps & { slideDisplayId: string }> = ({ slideDisplayId, scan, caseId, accession }) => {
  const { t } = useTranslation();
  const acc = accession ?? accessionOfSlideId(slideDisplayId);
  const { loading, view, canOpen, showThumbnail, onThumbnailError, message, open } = useSlideImage({
    slideDisplayId, caseId: caseId ?? acc, accession: acc, scan,
  });

  if (loading || !view) return <LoadingState variant="inline" label={t('slideImage.loading')} />;

  const openTitle = t('slideImage.openTitle', { slide: slideDisplayId });
  return (
    <span className="ps-slide-image" data-phi="slide-image">
      {showThumbnail && canOpen && (
        <button type="button" className="ps-slide-image__thumb-btn" onClick={() => { void open(); }} title={openTitle} aria-label={openTitle}>
          <img className="ps-slide-image__thumb" src={view.thumbnailUrl} alt={t('slideImage.thumbAlt', { slide: slideDisplayId })}
            referrerPolicy="no-referrer" loading="lazy" onError={onThumbnailError} />
        </button>
      )}
      {!showThumbnail && canOpen && (
        <button type="button" className="ps-slide-image__open-btn" onClick={() => { void open(); }} title={openTitle}>
          {t('slideImage.openLabel')}
        </button>
      )}
      {(view.state !== 'available') && (
        <span className={`ps-slide-image__state${view.failedQuality || view.state === 'scanFailed' ? ' ps-slide-image__state--warn' : ''}`}>
          {t(`slideImage.state.${view.state}`)}
        </span>
      )}
      {showThumbnail && canOpen && <span className="ps-slide-image__note">{t('slideImage.referenceNote')}</span>}
      {message && <span className="ps-slide-image__message" role="alert">{t(`slideImage.message.${message}`)}</span>}
    </span>
  );
};

export default SlideImagePreview;
