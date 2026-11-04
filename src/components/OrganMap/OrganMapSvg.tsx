// src/components/OrganMap/OrganMapSvg.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 461: the on-screen drawing of an organ map. Draws only: the shapes
// come from services/organMapping (organMapLayout), what each sector shows
// from the resolved payload, and the colours from the site's scheme as CSS
// custom properties set on the panel (organMapSchemeVars → --organmap-<key>),
// read by the ps-organmap-* classes in pathscribe.css. Every colour is paired
// with a pattern, so the map reads in greyscale and for colour-blind users.
//
// A sector with a question to jump to is a button: clicking it (or Enter /
// Space) asks the page to jump to that synoptic question. Elsewhere (the
// Configuration preview) sectors are labelled pictures, not tab stops.
// Batch 462: breast foci are drawn as numbered markers (also buttons), the
// quadrant lines as dashed guides.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useId } from 'react';
import {
  organMapLayout, patternId, patternMarks, usesPatternFill,
  type OrganMapDrawingLabels, type OrganMapLayout,
} from '@/services/organMapping/organMapDrawing';
import type { MapStyleKey, OrganMapMarker, OrganMapPayload, OrganMapScheme, OrganMapSector } from '@/services/organMapping/organMapTypes';
import { MAP_OVERLAYS } from '@/services/organMapping/organMapTypes';

interface Props {
  payload: OrganMapPayload;
  scheme: OrganMapScheme;
  labels: OrganMapDrawingLabels;
  /** The accessible name and tooltip of a sector or a breast focus marker. */
  summaryOf: (sector: OrganMapSector | OrganMapMarker) => string;
  onSectorClick?: (target: { id: string; jumpFieldId?: string }) => void;
  /** Batch 463: draw with this layout instead of the map type's (one Mohs stage on its own). */
  layout?: OrganMapLayout;
  /** Batch 463: sectors are toggles (the Mohs canvas): aria-pressed says whether each is positive. */
  pressedOf?: (sector: OrganMapSector) => boolean;
}

/** Click, Enter or Space; only where it does something. */
function interactiveProps(clickable: boolean, activate: () => void, summary: string) {
  return {
    role: clickable ? 'button' : 'img',
    tabIndex: clickable ? 0 : undefined,
    'aria-label': summary,
    onClick: clickable ? activate : undefined,
    onKeyDown: clickable ? (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } } : undefined,
  } as const;
}

const isOverlay = (key: MapStyleKey) => (MAP_OVERLAYS as readonly string[]).includes(key);

export const OrganMapSvg: React.FC<Props> = ({ payload, scheme, labels, summaryOf, onSectorClick, layout: layoutOverride, pressedOf }) => {
  const prefix = `omscreen${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const layout = layoutOverride ?? organMapLayout(payload.mapType, payload.side, payload.mohsStages?.length ?? 0, payload.variant);
  const byId = new Map(payload.sectors.map(s => [s.id, s]));
  const markers = payload.markers ?? [];
  const patternKeys = [...new Set<MapStyleKey>([
    ...payload.sectors.flatMap(s => [...(usesPatternFill(s.pattern) ? [s.category] : []), ...s.overlays.map(o => o.key)]),
    ...markers.filter(m => usesPatternFill(m.pattern)).map(m => m.category),
  ])];
  const fillOf = (key: MapStyleKey) => (usesPatternFill(scheme[key].pattern) ? `url(#${patternId(prefix, key)})` : undefined);

  return (
    <svg
      className="ps-organmap-svg"
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      role="group"
      aria-label={labels.title}
    >
      <defs>
        {patternKeys.map(key => {
          const marks = patternMarks(scheme[key].pattern);
          const overlay = isOverlay(key);
          return (
            <pattern key={key} id={patternId(prefix, key)} width="8" height="8" patternUnits="userSpaceOnUse">
              {!overlay && <rect width="8" height="8" className={`ps-organmap-fill--${key}`} />}
              {marks.lines.map(d => <path key={d} d={d} className={overlay ? `ps-organmap-overlay-ink ps-organmap-stroke--${key}` : 'ps-organmap-ink'} />)}
              {marks.dots.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3" className="ps-organmap-ink-dot" />)}
            </pattern>
          );
        })}
      </defs>
      {layout.outline && <path d={layout.outline} className="ps-organmap-outline" />}
      {layout.shapes.map(shape => {
        const sector = byId.get(shape.id);
        if (!sector) return null;
        const summary = summaryOf(sector);
        const lines = labels.inline(sector, shape.id);
        const size = layout.textSize;
        const top = shape.labelY + 3 - ((lines.length - 1) * (size + 2)) / 2;
        // A button only where a click does something (a question to jump to); otherwise a labelled picture.
        const clickable = !!onSectorClick && !!sector.jumpFieldId;
        const activate = () => onSectorClick?.(sector);
        return (
          <g
            key={shape.id}
            className={`ps-organmap-sector${clickable ? ' ps-organmap-sector--jump' : ''}`}
            {...interactiveProps(clickable, activate, summary)}
            aria-pressed={clickable && pressedOf ? pressedOf(sector) : undefined}
          >
            <title>{summary}</title>
            {/* A patterned fill is the fill attribute (url); a CSS fill class would override it. */}
            <path d={shape.d} className={`ps-organmap-shape${fillOf(sector.category) ? '' : ` ps-organmap-fill--${sector.category}`}`} fill={fillOf(sector.category)} />
            {/* Batch 465: a white halo under the outlines keeps each one visible on any fill. */}
            {/* Batch 465b: a thin dark edge outside the halo, so it reads on light and dark backgrounds. */}
            {sector.overlays.length > 0 && ['edge', 'halo'].map(layer => (
              <path key={layer} d={shape.d} fill="none" className={`ps-organmap-overlay-${layer}${sector.overlays.length > 1 ? ` ps-organmap-overlay-${layer}--outer` : ''}${sector.overlays.some(o => o.key === 'eneMajor') ? ` ps-organmap-overlay-${layer}--heavy` : ''}`} />
            ))}
            {sector.overlays.map((o, i) => (
              <path key={o.key} d={shape.d} fill={fillOf(o.key) ?? 'none'}
                className={`ps-organmap-overlay ps-organmap-stroke--${o.key}${i < sector.overlays.length - 1 ? ' ps-organmap-overlay--outer' : ''}`} />
            ))}
            {lines.map((line, i) => (
              <text key={i} x={shape.labelX} y={top + i * (size + 2)} className={`ps-organmap-sector-text ps-organmap-sector-text--${payload.mapType}`}>{line}</text>
            ))}
          </g>
        );
      })}
      {layout.guides && <path d={layout.guides} className="ps-organmap-guides" />}
      {/* Batch 462: breast foci, a numbered marker each. */}
      {markers.map(m => {
        const summary = summaryOf(m);
        const clickable = !!onSectorClick && !!m.jumpFieldId;
        return (
          <g key={m.id} className={`ps-organmap-marker${clickable ? ' ps-organmap-sector--jump' : ''}`} {...interactiveProps(clickable, () => onSectorClick?.(m), summary)}>
            <title>{summary}</title>
            <circle cx={m.x} cy={m.y} r={m.r} className={`ps-organmap-marker-dot${fillOf(m.category) ? '' : ` ps-organmap-fill--${m.category}`}`} fill={fillOf(m.category)} />
            <text x={m.x} y={m.y + 3.5} className="ps-organmap-marker-text">{m.label}</text>
          </g>
        );
      })}
      {layout.captions.map(c => (
        <text key={`${c.key}-${c.x}-${c.y}`} x={c.x} y={c.y} className={`ps-organmap-caption ps-organmap-caption--${c.anchor ?? 'middle'}`}>{labels.captions[c.key] ?? ''}</text>
      ))}
    </svg>
  );
};
