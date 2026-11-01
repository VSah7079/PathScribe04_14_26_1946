// @vitest-environment jsdom
// Batch 737 (Lab Workflow & Batch spec §11.1): a staining rack's "takes large-format slides" is an equipment setting,
// so changing it needs config:equipment:manage; the demo ships one large-format rack.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const enforce = vi.fn();
vi.mock('../authorization/defaultAuthorizationService', () => ({ authorizationService: { enforce: (k: string) => enforce(k) } }));

import { mockHardwareContainerRegistryService as racks } from './mockHardwareContainerRegistryService';

describe('staining racks for large-format slides (Batch 737)', () => {
  beforeEach(() => { localStorage.clear(); enforce.mockReset(); });

  it('ships RACK-STAIN-LF-01 as a large-format staining rack', async () => {
    const r = await racks.getByRackId('rack-stain-lf-01');
    expect(r.ok && r.data.supportsLargeFormat).toBe(true);
  });

  it('changes the setting only with config:equipment:manage', async () => {
    const rack = await racks.getByRackId('RACK-STAIN-04');
    if (!rack.ok) throw new Error('seed rack missing');
    enforce.mockResolvedValue({ allowed: false });
    expect(await racks.update(rack.data.id, { supportsLargeFormat: true })).toEqual({ ok: false, error: 'CONFIG_NOT_PERMITTED' });
    expect(enforce).toHaveBeenCalledWith('config:equipment:manage');
    enforce.mockResolvedValue({ allowed: true });
    const ok = await racks.update(rack.data.id, { supportsLargeFormat: true });
    expect(ok.ok && ok.data.supportsLargeFormat).toBe(true);
  });
});
