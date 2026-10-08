// @vitest-environment happy-dom
// src/components/OrganMap/OrganMapPanel.test.tsx
// Batch 461: the anatomical map companion — a sector click asks to jump to its
// synoptic question; the report image's state and actions follow the figure.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import radical from '@/data/templates/generic/prostate_radical_prostatectomy.json';

let held = ['report:organ-map:insert'];
vi.mock('@/hooks/useCapabilities', () => ({
  useCapabilities: () => ({ loading: false, has: (c: string) => held.includes(c), decide: (c: string) => ({ allowed: held.includes(c), reason: 'notGranted', missingRequirements: [] }) }),
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }), initReactI18next: { type: '3rdParty', init: () => {} } }));

import { OrganMapPanel } from './OrganMapPanel';
import { BUILT_IN_ORGAN_MAP_SCHEME, BUILT_IN_ORGAN_MAP_THRESHOLDS } from '@/services/organMapping/organMapScheme';
import { pathScribeDefaultBinding } from '@/services/organMapping/organMapBindings';
import { resolveProstateMap } from '@/services/organMapping/resolveProstateMap';
import type { OrganMapContext } from '@/services/organMapping/organMapLive';

const binding = pathScribeDefaultBinding(radical as never)!;
const context: OrganMapContext = { template: radical as never, binding, scheme: { scheme: BUILT_IN_ORGAN_MAP_SCHEME, sources: {} as never, thresholds: { ...BUILT_IN_ORGAN_MAP_THRESHOLDS, breastCloseMarginMm: 2 }, thresholdSources: {} as never } };
const payload = (answers: Record<string, string | string[]>) =>
  resolveProstateMap({ binding, answers, scheme: BUILT_IN_ORGAN_MAP_SCHEME, templateId: radical.id, instanceId: 'i1' });

afterEach(() => { cleanup(); held = ['report:organ-map:insert']; });

describe('OrganMapPanel', () => {
  const props = { context, loading: false, busy: false, caseId: 'C1', facilityId: 'F1', onSectorClick: vi.fn(), onInsert: vi.fn(), onRemove: vi.fn() };

  it('draws the map with colours as custom properties; a sector click or Enter jumps to its question', () => {
    const onSectorClick = vi.fn();
    const { container } = render(<OrganMapPanel {...props} onSectorClick={onSectorClick} figureState="none" payload={payload({ psmap_tumour_sectors: ['psmap_sector_r_mid_pzpl'], psmap_margin_sectors: ['psmap_sector_r_mid_pzpl'] })} />);
    const panel = container.querySelector('.ps-organmap-panel') as HTMLElement;
    expect(panel.style.getPropertyValue('--organmap-tumour')).toBe(BUILT_IN_ORGAN_MAP_SCHEME.tumour.colour);
    const sectors = container.querySelectorAll('.ps-organmap-sector');
    expect(sectors).toHaveLength(41);
    const target = Array.from(sectors).find(s => s.querySelector('text')?.textContent === 'organMap.prostate.short.zone.PZpl' && s.querySelector('.ps-organmap-overlay'))!;
    fireEvent.click(target);
    expect(onSectorClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'r_mid_pzpl', jumpFieldId: 'psmap_margin_sectors' }));
    fireEvent.keyDown(target, { key: 'Enter' });
    expect(onSectorClick).toHaveBeenCalledTimes(2);
    expect(screen.getByText('organMap.panel.insert')).toBeTruthy();
    // every sector here has a question to jump to, so each is a button
    expect(container.querySelectorAll('[role="button"].ps-organmap-sector')).toHaveLength(41);
  });

  it('with nothing answered: says so, and Insert is unavailable', () => {
    render(<OrganMapPanel {...props} figureState="none" payload={payload({})} />);
    expect(screen.getByText('organMap.panel.empty')).toBeTruthy();
    expect((screen.getByText('organMap.panel.insert') as HTMLButtonElement).disabled).toBe(true);
  });

  it('stale: says the report image is out of date, offers Insert again and Remove', () => {
    const onInsert = vi.fn(); const onRemove = vi.fn();
    render(<OrganMapPanel {...props} onInsert={onInsert} onRemove={onRemove} figureState="stale" payload={payload({ psmap_tumour_sectors: ['psmap_sector_r_mid_pzpl'] })} />);
    expect(screen.getByRole('status').textContent).toBe('organMap.panel.state.stale');
    fireEvent.click(screen.getByText('organMap.panel.update'));
    fireEvent.click(screen.getByText('organMap.panel.remove'));
    expect(onInsert).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('locked after sign-out: no actions; without the capability the buttons do nothing', () => {
    render(<OrganMapPanel {...props} figureState="locked" payload={payload({ psmap_tumour_sectors: ['psmap_sector_r_mid_pzpl'] })} />);
    expect(screen.getByRole('status').textContent).toBe('organMap.panel.state.locked');
    expect(screen.queryByText('organMap.panel.update')).toBeNull();
    cleanup();
    held = [];
    const onInsert = vi.fn();
    render(<OrganMapPanel {...props} onInsert={onInsert} figureState="none" payload={payload({ psmap_tumour_sectors: ['psmap_sector_r_mid_pzpl'] })} />);
    fireEvent.click(screen.getByText('organMap.panel.insert'));
    expect(onInsert).not.toHaveBeenCalled();
  });

  it('a synoptic without map questions says how to bind them', () => {
    render(<OrganMapPanel {...props} context={{ ...context, binding: null }} figureState="none" payload={null} />);
    expect(screen.getByText('organMap.panel.noBinding')).toBeTruthy();
  });
});

describe('OrganMapSvg without a jump target', () => {
  it('draws labelled pictures, not tab stops, when a click would do nothing', async () => {
    const { OrganMapSvg } = await import('./OrganMapSvg');
    const { organMapSchemePreview } = await import('@/services/organMapping/organMapConfigDraft');
    const { organMapDrawingLabels } = await import('@/services/organMapping/organMapLabels');
    const p = organMapSchemePreview(BUILT_IN_ORGAN_MAP_SCHEME);
    const { container } = render(<OrganMapSvg payload={p} scheme={BUILT_IN_ORGAN_MAP_SCHEME} labels={organMapDrawingLabels(k => k, p.mapType, BUILT_IN_ORGAN_MAP_SCHEME)} summaryOf={s => s.id} />);
    expect(container.querySelectorAll('[role="button"]')).toHaveLength(0);
    expect(container.querySelectorAll('[tabindex]')).toHaveLength(0);
    expect(container.querySelectorAll('[role="img"]')).toHaveLength(41);
  });
});
