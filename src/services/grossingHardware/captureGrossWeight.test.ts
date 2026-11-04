import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./mockGrossingHardwareProfileService', () => ({ mockGrossingHardwareProfileService: { getAll: vi.fn() } }));
vi.mock('./resolveScaleWeightCapture', () => ({ resolveScaleWeightCapture: vi.fn() }));
vi.mock('../auditlog/mockAuditService', () => ({ mockAuditService: { logEvent: vi.fn().mockResolvedValue({ ok: true }) } }));

import { mockGrossingHardwareProfileService } from './mockGrossingHardwareProfileService';
import { resolveScaleWeightCapture } from './resolveScaleWeightCapture';
import { mockAuditService } from '../auditlog/mockAuditService';
import { captureGrossWeight, simulatedScaleGrams } from './captureGrossWeight';
import { setDataMayPersistInBrowserForTests } from '../browserData/browserDataPolicy';

const scale = { id: 's1', kind: 'scale', isActive: true, bridgeType: 'pathscribe_agent', agentBaseUrl: 'https://127.0.0.1:9100', label: 'S', createdAt: '', updatedAt: '' };

describe('captureGrossWeight (Batch 606, PS-13)', () => {
  beforeEach(() => {
    vi.mocked(mockGrossingHardwareProfileService.getAll).mockReset().mockResolvedValue({ ok: true, data: [] } as never);
    vi.mocked(resolveScaleWeightCapture).mockReset();
    vi.mocked(mockAuditService.logEvent).mockClear();
    setDataMayPersistInBrowserForTests(true);
  });
  afterEach(() => setDataMayPersistInBrowserForTests(null));

  it('uses a simulated scale reading in the demo with no scale, and audits it', async () => {
    const res = await captureGrossWeight(undefined, 'u1', () => 0.5);
    expect(res).toEqual({ ok: true, grams: 45, source: 'simulated_scale' });
    expect(mockAuditService.logEvent).toHaveBeenCalledWith(expect.objectContaining({ event: 'Gross Weight Captured', detail: expect.stringContaining('Simulated scale') }));
  });

  it('does not simulate when an API server is configured', async () => {
    setDataMayPersistInBrowserForTests(false);
    expect(await captureGrossWeight()).toEqual({ ok: false, reason: 'no_scale' });
  });

  it('returns the real scale reading when the agent answers', async () => {
    vi.mocked(mockGrossingHardwareProfileService.getAll).mockResolvedValue({ ok: true, data: [scale] } as never);
    vi.mocked(resolveScaleWeightCapture).mockResolvedValue({ ok: true, grams: 12.4 });
    expect(await captureGrossWeight()).toEqual({ ok: true, grams: 12.4, source: 'scale' });
  });

  it('falls back to simulation when the agent is unreachable (demo), but never over an unstable reading', async () => {
    vi.mocked(mockGrossingHardwareProfileService.getAll).mockResolvedValue({ ok: true, data: [scale] } as never);
    vi.mocked(resolveScaleWeightCapture).mockResolvedValue({ ok: false, reason: 'unreachable' });
    expect((await captureGrossWeight()) .ok).toBe(true);
    vi.mocked(resolveScaleWeightCapture).mockResolvedValue({ ok: false, reason: 'unstable_reading' });
    expect(await captureGrossWeight()).toEqual({ ok: false, reason: 'unstable_reading' });
  });

  it('simulated readings stay between 5 and 85 g', () => {
    expect(simulatedScaleGrams(() => 0)).toBe(5);
    expect(simulatedScaleGrams(() => 0.9999)).toBeLessThanOrEqual(85);
  });
});
