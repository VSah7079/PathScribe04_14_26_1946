import { describe, it, expect, beforeEach, vi } from 'vitest';

const enforce = vi.hoisted(() => vi.fn());
vi.mock('../authorization/defaultAuthorizationService', () => ({ authorizationService: { enforce } }));

beforeEach(() => {
  const store: Record<string, string> = {};
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  } as Storage;
  enforce.mockReset();
  enforce.mockResolvedValue({ allowed: true });
});

describe('postSimulatedTelemetryReading', () => {
  it('records a labelled Simulated reading for a storage unit and reports an excursion', async () => {
    const { postSimulatedTelemetryReading } = await import('./simulatedTelemetryFeed');
    const { mockTelemetryReadingService } = await import('./mockTelemetryReadingService');
    const res = await postSimulatedTelemetryReading({ assetType: 'storage_unit', assetId: 'su-freezer-01', assetLabel: 'Tissue Freezer 1', temperatureCelsius: -5, user: 'Tech A' });
    expect(res).toMatchObject({ ok: true, excursion: true, deficienciesRaised: 0 });
    const stored = await mockTelemetryReadingService.getByAsset('storage_unit', 'su-freezer-01');
    expect(stored.ok && stored.data[stored.data.length - 1]).toMatchObject({ simulated: true, isExcursion: true, temperatureCelsius: -5 });
  });

  it('records a within-range reading as not an excursion', async () => {
    const { postSimulatedTelemetryReading } = await import('./simulatedTelemetryFeed');
    const res = await postSimulatedTelemetryReading({ assetType: 'storage_unit', assetId: 'su-freezer-01', assetLabel: 'Tissue Freezer 1', temperatureCelsius: -25, user: 'Tech A' });
    expect(res).toMatchObject({ ok: true, excursion: false });
  });

  it('holds the batch and raises a deficiency when a smart container checked out to a batch goes out of range', async () => {
    const { mockHardwareContainerRegistryService } = await import('../hardwareContainers/mockHardwareContainerRegistryService');
    const { mockBatchService } = await import('../batches/mockBatchService');
    const { postSimulatedTelemetryReading } = await import('./simulatedTelemetryFeed');
    const container = await mockHardwareContainerRegistryService.create({ rackId: 'RACK-SIM-01', containerType: 'Archive Storage Tray', isSmartContainer: true, storageConditionTypeId: 'sct-frozen-tissue' });
    const batch = await mockBatchService.create({ processingNode: 'Processing', protocol: 'Sim batch', priority: 'Routine', createdByUserId: 'u1', createdByUserName: 'Tech A' });
    if (!container.ok || !batch.ok) throw new Error('setup failed');
    await mockHardwareContainerRegistryService.checkOut('RACK-SIM-01', batch.data.id);
    const res = await postSimulatedTelemetryReading({ assetType: 'hardware_container', assetId: container.data.id, assetLabel: 'RACK-SIM-01', temperatureCelsius: -10, user: 'Tech A' });
    expect(res.ok && res.excursion).toBe(true);
    expect(res.ok && res.heldBatchId).toBe(batch.data.id);
    const held = await mockBatchService.getById(batch.data.id);
    expect(held.ok && held.data.coldChainExcursion?.temperatureCelsius).toBe(-10);
  });

  it('refuses without the capability and records nothing', async () => {
    enforce.mockResolvedValue({ allowed: false });
    const { postSimulatedTelemetryReading } = await import('./simulatedTelemetryFeed');
    const { mockTelemetryReadingService } = await import('./mockTelemetryReadingService');
    const before = await mockTelemetryReadingService.getAll();
    const res = await postSimulatedTelemetryReading({ assetType: 'storage_unit', assetId: 'su-freezer-01', assetLabel: 'x', temperatureCelsius: 0, user: 'u' });
    expect(res).toEqual({ ok: false, error: 'notPermitted' });
    const after = await mockTelemetryReadingService.getAll();
    expect(after.ok && before.ok && after.data.length).toBe(before.ok ? before.data.length : -1);
  });

  it('refuses a temperature that is not a number', async () => {
    const { postSimulatedTelemetryReading } = await import('./simulatedTelemetryFeed');
    const res = await postSimulatedTelemetryReading({ assetType: 'storage_unit', assetId: 'su-freezer-01', assetLabel: 'x', temperatureCelsius: Number.NaN, user: 'u' });
    expect(res).toEqual({ ok: false, error: 'invalidTemperature' });
  });
});
