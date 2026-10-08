// src/components/OrganMap/OrganMapPanel.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 461: the anatomical map companion, a collapsible panel above the
// synoptic on the report page (Pete's "Opt-In Companion").
// • The map is drawn from the synoptic answers and has no Save of its own.
// • Clicking a sector jumps to (and highlights) its synoptic question.
// • "Insert into report" is optional, per case: a snapshot in print colours.
//   The panel says when the report's image is out of date or locked.
// • An empty presence slot at the top is kept for the live "who else is here"
//   banner (PS-71 presence, later batch).
// Rendering only: what the map shows, the figure's state and the colours all
// come from services/organMapping via hooks/useOrganMap.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useTranslation } from 'react-i18next';
import '../../pathscribe.css';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { organMapLabelsFor, organMapLegendLabel, organMapSectorSummary } from '@/services/organMapping/organMapLabels';
import { organMapSchemeVars } from '@/services/organMapping/organMapScheme';
import { usesPatternFill } from '@/services/organMapping/organMapDrawing';
import type { OrganMapContext } from '@/services/organMapping/organMapLive';
import type { OrganMapReportState } from '@/services/organMapping/organMapFigures';
import type { OrganMapPayload } from '@/services/organMapping/organMapTypes';
import { OrganMapSvg } from './OrganMapSvg';

interface Props {
  context: OrganMapContext | null;
  loading: boolean;
  payload: OrganMapPayload | null;
  figureState: OrganMapReportState;
  busy: boolean;
  caseId?: string;
  facilityId?: string | null;
  onSectorClick: (target: { id: string; jumpFieldId?: string }) => void;
  onInsert: () => void;
  onRemove: () => void;
}

export const OrganMapPanel: React.FC<Props> = ({ context, loading, payload, figureState, busy, caseId, facilityId, onSectorClick, onInsert, onRemove }) => {
  const { t } = useTranslation();
  const scheme = context?.scheme.scheme;
  const capContext = { caseId: caseId ?? null, facilityId: facilityId ?? null };
  return (
    <section
      className="ps-organmap-panel"
      aria-label={t('organMap.panel.title')}
      style={scheme ? (organMapSchemeVars(scheme) as React.CSSProperties) : undefined}
    >
      <div className="ps-organmap-presence" aria-hidden="true" />
      {loading && !context ? null : !context?.binding ? (
        <p className="ps-organmap-note">{t('organMap.panel.noBinding')}</p>
      ) : payload && scheme ? (
        <>
          <p className="ps-organmap-note">{t('organMap.panel.source')}</p>
          {!payload.hasData && <p className="ps-organmap-note ps-organmap-note--empty">{t('organMap.panel.empty')}</p>}
          <OrganMapSvg
            payload={payload}
            scheme={scheme}
            labels={organMapLabelsFor(t, payload, scheme)}
            summaryOf={s => organMapSectorSummary(t, payload.mapType, s, scheme, payload.side)}
            onSectorClick={onSectorClick}
          />
          <p className="ps-organmap-hint">{t('organMap.panel.sectorHint')}</p>
          {payload.legend.length > 0 && (
            <ul className="ps-organmap-legend">
              {payload.legend.map(l => (
                <li key={l.key} className="ps-organmap-legend-item">
                  <svg className="ps-organmap-legend-swatch" viewBox="0 0 16 12" aria-hidden="true">
                    <rect width="16" height="12" className={l.kind === 'overlay' ? `ps-organmap-legend-overlay ps-organmap-stroke--${l.key}` : `ps-organmap-fill--${l.key}`} />
                    {usesPatternFill(l.pattern) && <path d="M 0 12 L 12 0 M 4 12 L 16 0" className={l.kind === 'overlay' ? `ps-organmap-overlay-ink ps-organmap-stroke--${l.key}` : 'ps-organmap-ink'} />}
                  </svg>
                  {organMapLegendLabel(t, scheme, l.key, payload.mapType)}
                </li>
              ))}
            </ul>
          )}
          <div className="ps-organmap-actions">
            {figureState !== 'none' && (
              <span className={`ps-organmap-state ps-organmap-state--${figureState}`} role="status">
                {t(`organMap.panel.state.${figureState}`)}
              </span>
            )}
            {figureState !== 'locked' && figureState !== 'auto' && figureState !== 'autoEmpty' && (
              <>
                <CapabilityButton
                  capability="report:organ-map:insert"
                  context={capContext}
                  className="ps-btn-primary ps-syn-toolbtn-sm"
                  title={t('organMap.panel.insertTitle')}
                  disabled={busy || !payload.hasData}
                  disabledTitle={payload.hasData ? undefined : t('organMap.panel.empty')}
                  onClick={onInsert}
                >{t(figureState === 'none' ? 'organMap.panel.insert' : 'organMap.panel.update')}</CapabilityButton>
                {figureState !== 'none' && (
                  <CapabilityButton capability="report:organ-map:insert" context={capContext} className="ps-btn-ghost-dark ps-syn-toolbtn-sm" disabled={busy} onClick={onRemove}>
                    {t('organMap.panel.remove')}
                  </CapabilityButton>
                )}
              </>
            )}
          </div>
        </>
      ) : null}
    </section>
  );
};
