// src/components/CaseAttachments/PlacedImages.tsx
// Batch 742: the images and documents placed in one part of the report, as the in-app report preview shows them
// (the PDF draws the same under the same section: functions/main.py, section_image_flows). An image that can't be
// reached shows the Image Unavailable line, a document is named, as on paper.
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { CaseReportImage } from '@/services/imageAssociation/caseReportImages';
import { usePlacementLinks } from '@/hooks/useReportPlacements';
import './CaseAttachmentsModal.css';

export const PlacedImages: React.FC<{ placements: readonly CaseReportImage[]; heading?: boolean }> = ({ placements, heading }) => {
  const { t } = useTranslation();
  const links = usePlacementLinks(placements);
  if (!placements.length) return null;
  return (
    <div className="ps-placed">
      {heading && <div className="rp-section-heading">{t('surgicalReportPdf.imagesTitle')}</div>}
      {placements.map(p => {
        if (p.mimeType === 'application/pdf') {
          return <p key={p.id} className="ps-placed-caption" data-phi="true">{p.caption ? t('surgicalReportPdf.documentAttached', { caption: p.caption }) : t('surgicalReportPdf.documentAttachedNoCaption')}</p>;
        }
        const url = links[p.id];
        return (
          <figure key={p.id} className="ps-placed-figure">
            {url ? <img className="ps-placed-img" src={url} alt={p.caption || t('surgicalReportPdf.imagesTitle')} /> : url === null && <p className="ps-placed-missing">{t('surgicalReportPdf.imageUnavailable')}</p>}
            {p.caption && <figcaption className="ps-placed-caption" data-phi="true">{p.caption}</figcaption>}
          </figure>
        );
      })}
    </div>
  );
};
