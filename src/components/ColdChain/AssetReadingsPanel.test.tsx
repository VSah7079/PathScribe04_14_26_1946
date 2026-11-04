// @vitest-environment happy-dom
// Batch 610 (#17, #123): the readings and excursion status of a storage unit, and the labelled Simulated control.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

const svc = vi.hoisted(() => ({ getByAsset: vi.fn(), post: vi.fn() }));
vi.mock('@/services', async () => {
  const pure = await vi.importActual<typeof import('@/services/coldChain/coldChainStatus')>('@/services/coldChain/coldChainStatus');
  return { ...pure, telemetryReadingService: { getByAsset: svc.getByAsset }, postSimulatedTelemetryReading: svc.post };
});
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o ? `${k}:${JSON.stringify(o)}` : k), i18n: { language: 'en' } }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', name: 'Histo One' } }) }));
vi.mock('@/components/Common/CapabilityButton', () => ({
  CapabilityButton: ({ children, onClick, disabled, capability }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; capability: string }) =>
    <button data-capability={capability} disabled={disabled} onClick={onClick}>{children}</button>,
}));

import { AssetReadingsPanel } from './AssetReadingsPanel';
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const reading = (id: string, t: number, ex: boolean, at: string, simulated = true) => ({ id, assetType: 'storage_unit', assetId: 'su1', temperatureCelsius: t, isExcursion: ex, recordedAt: at, simulated });

describe('AssetReadingsPanel', () => {
  it('shows "no readings" and a Simulated-labelled control gated on its capability', async () => {
    svc.getByAsset.mockResolvedValue({ ok: true, data: [] });
    render(<AssetReadingsPanel assetType="storage_unit" assetId="su1" assetLabel="Freezer 1" />);
    await waitFor(() => expect(screen.getByTestId('coldchain-status').textContent).toBe('coldChain.status.none'));
    expect(screen.getAllByText('coldChain.simulated').length).toBeGreaterThan(0);
    const post = screen.getByText('coldChain.sim.post') as HTMLButtonElement;
    expect(post.getAttribute('data-capability')).toBe('batch:cold-chain-reading:simulate');
    expect(post.disabled).toBe(true); // no temperature typed yet
  });

  it('shows the latest reading as an excursion with its Simulated label', async () => {
    svc.getByAsset.mockResolvedValue({ ok: true, data: [reading('r1', -25, false, '2026-10-18T08:00:00Z'), reading('r2', -5, true, '2026-10-18T09:00:00Z')] });
    render(<AssetReadingsPanel assetType="storage_unit" assetId="su1" assetLabel="Freezer 1" />);
    await waitFor(() => expect(screen.getByTestId('coldchain-status').textContent).toBe('coldChain.status.excursion'));
    expect(screen.getByTestId('coldchain-readings').textContent).toContain('coldChain.readings.excursion');
    expect(screen.getByTestId('coldchain-readings').textContent).toContain('coldChain.readings.withinRange');
  });

  it('posts the typed temperature, says what happened (excursion, batch held, CAPA) and reloads', async () => {
    svc.getByAsset.mockResolvedValue({ ok: true, data: [] });
    svc.post.mockResolvedValue({ ok: true, readingId: 'r9', excursion: true, heldBatchId: 'b1', deficienciesRaised: 2 });
    const onPosted = vi.fn();
    render(<AssetReadingsPanel assetType="storage_unit" assetId="su1" assetLabel="Freezer 1" onPosted={onPosted} />);
    await waitFor(() => expect(svc.getByAsset).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByLabelText('coldChain.sim.temperatureLabel'), { target: { value: '-5' } });
    fireEvent.click(screen.getByText('coldChain.sim.post'));
    await waitFor(() => expect(screen.getByTestId('coldchain-message')).toBeTruthy());
    expect(svc.post).toHaveBeenCalledWith({ assetType: 'storage_unit', assetId: 'su1', assetLabel: 'Freezer 1', temperatureCelsius: -5, user: 'Histo One' });
    const text = screen.getByTestId('coldchain-message').textContent!;
    expect(text).toContain('coldChain.sim.result.excursion');
    expect(text).toContain('coldChain.sim.result.batchHeld');
    expect(text).toContain('coldChain.sim.result.capaRaised');
    expect(onPosted).toHaveBeenCalled();
    expect(svc.getByAsset).toHaveBeenCalledTimes(2);
  });

  it('says so when the reading is refused', async () => {
    svc.getByAsset.mockResolvedValue({ ok: true, data: [] });
    svc.post.mockResolvedValue({ ok: false, error: 'notPermitted' });
    render(<AssetReadingsPanel assetType="storage_unit" assetId="su1" assetLabel="Freezer 1" />);
    await waitFor(() => expect(svc.getByAsset).toHaveBeenCalled());
    fireEvent.change(screen.getByLabelText('coldChain.sim.temperatureLabel'), { target: { value: '4' } });
    fireEvent.click(screen.getByText('coldChain.sim.post'));
    await waitFor(() => expect(screen.getByTestId('coldchain-message').textContent).toBe('coldChain.sim.errors.notPermitted'));
  });
});
