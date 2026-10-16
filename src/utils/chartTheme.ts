// src/utils/chartTheme.ts
// Batch 565 (WCAG 2.1 AA): the colours charts draw their own text in (axis ticks, labels). SVG text isn't
// covered by the stylesheet, and the old grey (#64748b) was about 3.7:1 on the dark cards; this one is the
// stylesheet's --ps-text-dim, 4.8:1 or better on every dark surface.
export const CHART_TICK_COLOR = '#8794a8';
