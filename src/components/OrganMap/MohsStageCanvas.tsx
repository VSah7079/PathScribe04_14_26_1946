// src/components/OrganMap/MohsStageCanvas.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 463: the Mohs stage canvas (spec SPATIAL_STAGE_CANVAS). One stage's
// margin: 12 peripheral clock sectors around the deep margin. It holds no
// state (spec "Zero Map-Local State"): it draws the stage it is given and
// emits onSectorToggle; the synoptic answers change, and the canvas is drawn
// again from them. Drawn with the shared OrganMapSvg, so positive sectors carry
// the site's "residual tumour" colour and pattern (FR-03), perineural
// invasion its outline, and every sector is a labelled toggle (aria-pressed).
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useTranslation } from 'react-i18next';
import { OrganMapSvg } from './OrganMapSvg';
import { mohsSingleStage } from '@/services/organMapping/mohsGeometry';
import { mohsStagePayload } from '@/services/organMapping/resolveMohsMap';
import { organMapLabelsFor, organMapSectorSummary } from '@/services/organMapping/organMapLabels';
import type { OrganMapScheme } from '@/services/organMapping/organMapTypes';
import { mohsSectorToggleEvent, mohsShapePositive, type MohsSectorToggleEvent, type MohsStage } from '@/services/templates/mohsStages';

export type SectorToggleEvent = MohsSectorToggleEvent;

export interface MohsSpatialCanvasProps {
  stageNumber: number;
  stageData: MohsStage;
  scheme: OrganMapScheme;
  /** The Mohs question's id (the stage's sectors answer to it). */
  fieldId: string;
  readOnly?: boolean;
  onSectorToggle: (event: SectorToggleEvent) => void;
}

export const MohsStageCanvas: React.FC<MohsSpatialCanvasProps> = ({ stageNumber, stageData, scheme, fieldId, readOnly, onSectorToggle }) => {
  const { t } = useTranslation();
  const payload = mohsStagePayload(stageData, scheme, fieldId);
  return (
    <div className="ps-mohs-canvas">
      <OrganMapSvg
        payload={payload}
        scheme={scheme}
        layout={{ ...mohsSingleStage(stageNumber), textSize: 10 }}
        labels={organMapLabelsFor(t, payload, scheme)}
        summaryOf={s => organMapSectorSummary(t, 'mohsStages', s, scheme)}
        pressedOf={s => mohsShapePositive(stageData, s.id)}
        onSectorClick={readOnly ? undefined : target => {
          const event = mohsSectorToggleEvent(stageData, target.id);
          if (event) onSectorToggle(event);
        }}
      />
    </div>
  );
};
