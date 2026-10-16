// Batch 549 (PS-539): the services refuse a logo or imaging address that isn't an https link,
// not only the editors (an import or any other caller goes through the service).
import { describe, it, expect, vi } from 'vitest';

vi.mock('../authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async () => ({ allowed: true }) },
}));

import { mockDepartmentService } from '../departments/mockDepartmentService';
import { mockGrossImagingVendorService } from '../imageAssociation/mockGrossImagingVendorService';
import { mockFacilityService } from '../facilities/mockFacilityService';

const refused = (r: { ok: boolean; error?: unknown }) => !r.ok && String(r.error).startsWith('invalidLink');

describe('link fields are checked in the services (Batch 549)', () => {
  it('departments: an http logo is refused on add and update', async () => {
    expect(refused(await mockDepartmentService.add({ name: 'X', status: 'Active', headerLogoUrl: 'http://x.example/l.png' } as never))).toBe(true);
    const all = await mockDepartmentService.getAll();
    const id = all.ok ? all.data[0].id : '';
    expect(refused(await mockDepartmentService.update(id, { headerLogoUrl: 'data:image/png;base64,AA' }))).toBe(true);
    expect((await mockDepartmentService.update(id, { headerLogoUrl: 'https://x.example/l.png' })).ok).toBe(true);
  });
  it('gross imaging vendors: an http address is refused on add and update', async () => {
    expect(refused(await mockGrossImagingVendorService.add({ name: 'V', baseUrl: 'http://v.example', active: true } as never))).toBe(true);
    const all = await mockGrossImagingVendorService.getAll();
    const id = all.ok ? all.data[0].id : '';
    expect(refused(await mockGrossImagingVendorService.update(id, { baseUrl: 'http://v.example' }))).toBe(true);
    expect((await mockGrossImagingVendorService.update(id, { baseUrl: '' })).ok).toBe(true);
  });
  it('facilities: an http letterhead logo is refused on add and update', async () => {
    expect(refused(await mockFacilityService.add({ name: 'F', headerLogoUrl: 'http://f.example/l.png' } as never))).toBe(true);
    const all = await mockFacilityService.getAll();
    const id = all.ok ? all.data[0].id : '';
    expect(refused(await mockFacilityService.update(id, { headerLogoUrl: 'http://f.example/l.png' } as never))).toBe(true);
  });
});
