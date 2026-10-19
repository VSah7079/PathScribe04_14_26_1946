// @vitest-environment happy-dom
// Batch 610 (#17, #123): Configuration → System → Cold chain: storage units, condition types, smart containers.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

const svc = vi.hoisted(() => ({
  units: { getAll: vi.fn(), add: vi.fn(), update: vi.fn(), deactivate: vi.fn() },
  types: { getAll: vi.fn(), add: vi.fn(), update: vi.fn(), deactivate: vi.fn(), reactivate: vi.fn(), remove: vi.fn() },
  containers: { getAll: vi.fn() },
}));
vi.mock('@/services', () => ({ storageUnitService: svc.units, storageConditionTypeService: svc.types, hardwareContainerRegistryService: svc.containers }));
vi.mock('@/components/ColdChain/AssetReadingsPanel', () => ({ AssetReadingsPanel: ({ assetId }: { assetId: string }) => <div data-testid={`readings-${assetId}`} /> }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o ? `${k}:${JSON.stringify(o)}` : k) }) }));

import ColdChainSection from './ColdChainSection';
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const types = [
  { id: 'sct-frozen-tissue', name: 'Frozen tissue', maxTemperatureCelsius: -20, active: true, system: true },
  { id: 'sct-x', name: 'Cold room', maxTemperatureCelsius: 8, minTemperatureCelsius: 2, active: true },
];
const units = [{ id: 'su1', name: 'Freezer 1', storageConditionTypeId: 'sct-frozen-tissue', active: true }];

function seed() {
  svc.units.getAll.mockResolvedValue({ ok: true, data: units });
  svc.types.getAll.mockResolvedValue({ ok: true, data: types });
  svc.containers.getAll.mockResolvedValue({ ok: true, data: [{ id: 'hc1', rackId: 'R-1', isSmartContainer: true, storageConditionTypeId: 'sct-x' }, { id: 'hc2', rackId: 'R-2', isSmartContainer: false }] });
}

describe('ColdChainSection', () => {
  it('lists storage units with their condition type and shows the Simulated note', async () => {
    seed();
    render(<ColdChainSection />);
    await waitFor(() => expect(screen.getByText('Freezer 1')).toBeTruthy());
    expect(screen.getByText('Frozen tissue')).toBeTruthy();
    expect(screen.getByText('coldChain.simulated')).toBeTruthy();
  });

  it('adds a storage unit with a name and condition type', async () => {
    seed();
    svc.units.add.mockResolvedValue({ ok: true, data: {} });
    render(<ColdChainSection />);
    await waitFor(() => expect(screen.getByText('Freezer 1')).toBeTruthy());
    fireEvent.click(screen.getByText('+ coldChain.section.units.add'));
    fireEvent.change(screen.getByLabelText(/coldChain.section.units.name/), { target: { value: 'Freezer 2' } });
    fireEvent.click(screen.getByText('common.save'));
    await waitFor(() => expect(svc.units.add).toHaveBeenCalledWith({ name: 'Freezer 2', storageConditionTypeId: 'sct-frozen-tissue', active: true }));
  });

  it('shows condition types with their range, and only lists smart containers on the containers tab', async () => {
    seed();
    render(<ColdChainSection />);
    await waitFor(() => expect(screen.getByText('Freezer 1')).toBeTruthy());
    fireEvent.click(screen.getByText('coldChain.section.tabs.types'));
    expect(screen.getByText('coldChain.section.types.rangeMaxOnly:{"max":-20}')).toBeTruthy();
    expect(screen.getByText('coldChain.section.types.rangeBoth:{"min":2,"max":8}')).toBeTruthy();
    fireEvent.click(screen.getByText('coldChain.section.tabs.containers'));
    expect(screen.getByText('R-1')).toBeTruthy();
    expect(screen.queryByText('R-2')).toBeNull();
  });
});
