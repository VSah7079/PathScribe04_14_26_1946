import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../facilities/mockFacilityService', () => ({ mockFacilityService: { getById: vi.fn() } }));
import { mockFacilityService } from '../facilities/mockFacilityService';
import { resolveCytologyReportLanguage, resolveCytologyReportLocale, resolvePerformingLabFacility } from './resolveCytologyReportLanguage';

const fac = (o: any) => ({ id: 'F', roles: [], jurisdiction: 'US', ...o });
function stores(map: Record<string, any>) {
  vi.mocked(mockFacilityService.getById).mockImplementation(async (id: string) => (map[id] ? { ok: true, data: map[id] } : { ok: false, error: 'nf' }) as any);
}
beforeEach(() => vi.mocked(mockFacilityService.getById).mockReset());

describe('resolveCytologyReportLanguage (Batch 391)', () => {
  it('a performing lab reports in its own language setting', async () => {
    stores({ LAB: fac({ id: 'LAB', roles: ['performing_lab'], jurisdiction: 'BE', reportLanguage: 'fr-BE' }) });
    expect(await resolveCytologyReportLanguage('LAB')).toBe('fr-BE');
  });
  it('without a setting, the lab\'s jurisdiction decides', async () => {
    stores({ LAB: fac({ id: 'LAB', roles: ['performing_lab'], jurisdiction: 'NL' }) });
    expect(await resolveCytologyReportLanguage('LAB')).toBe('nl');
  });
  it('an ordering facility reports in the language of the lab that performs its work, not its own jurisdiction', async () => {
    stores({
      CLIENT: fac({ id: 'CLIENT', jurisdiction: 'US', performingLabFacilityId: 'LAB' }),
      LAB: fac({ id: 'LAB', roles: ['performing_lab'], jurisdiction: 'DE' }),
    });
    expect(await resolveCytologyReportLanguage('CLIENT')).toBe('de');
    expect((await resolvePerformingLabFacility('CLIENT'))?.id).toBe('LAB');
  });
  it('no facility, an unknown facility, or no performing lab is English', async () => {
    stores({ CLIENT: fac({ id: 'CLIENT', jurisdiction: 'DE' }) });
    expect(await resolveCytologyReportLanguage(undefined)).toBe('en');
    expect(await resolveCytologyReportLanguage('MISSING')).toBe('en');
    expect(await resolveCytologyReportLanguage('CLIENT')).toBe('en');
  });
  it('a performing lab that cannot be loaded is English', async () => {
    stores({ CLIENT: fac({ id: 'CLIENT', performingLabFacilityId: 'GONE' }) });
    expect(await resolveCytologyReportLanguage('CLIENT')).toBe('en');
  });
  it('returns the date format with the language: a French-speaking Belgian lab writes Belgian dates', async () => {
    stores({ LAB: fac({ id: 'LAB', roles: ['performing_lab'], jurisdiction: 'BE', reportLanguage: 'fr-BE' }) });
    expect(await resolveCytologyReportLocale('LAB')).toEqual({ language: 'fr-BE', locale: 'nl-BE' });
    stores({ LAB: fac({ id: 'LAB', roles: ['performing_lab'], jurisdiction: 'GB_EW' }) });
    expect(await resolveCytologyReportLocale('LAB')).toEqual({ language: 'en', locale: 'en-GB' });
  });
});
