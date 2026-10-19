import { describe, it, expect } from 'vitest';
import { resolveSplitReportBranding, technicalBrandingForRender } from './resolveSplitReportBranding';
import type { Facility } from './IFacilityService';

function facility(over: Partial<Facility> = {}): Facility {
  return {
    id: 'fac-1', name: 'Reporting Lab', assigningAuthority: 'RL', address: '1 Main St',
    phone: '', fax: '', email: '', roles: ['performing_lab'], jurisdiction: 'US',
    reporting: { reportFormat: 'PDF', deliveryMethod: 'Portal', autoRelease: false, copyToReferring: false },
    status: 'Active', pediatricAgeThreshold: null, authorizedPediatricPathologistIds: [],
    tatFirstTouchHours: null, tatTotalHours: null, escalationTargets: [], escalationPriority: 'high',
    directorName: 'Dr. Reporter', cliaOrIsoNumber: 'CLIA-1',
    ...over,
  } as Facility;
}

describe('resolveSplitReportBranding (Batch 606, PS-37)', () => {
  const reporting = facility();
  const technical = facility({ id: 'fac-2', name: 'Technical Lab', address: '2 Side St', directorName: 'Dr. Tech', cliaOrIsoNumber: 'CLIA-2' });
  const all = [reporting, technical];

  it('has only the reporting lab block when no technical facility is named', () => {
    const r = resolveSplitReportBranding(reporting, undefined, all);
    expect(r.professional?.facilityName).toBe('Reporting Lab');
    expect(r.technical).toBeUndefined();
  });

  it('adds a second block for another lab, with its director and CLIA number withheld', () => {
    const r = resolveSplitReportBranding(reporting, 'fac-2', all);
    expect(r.professional?.directorName).toBe('Dr. Reporter');
    expect(r.technical?.facilityName).toBe('Technical Lab');
    expect(r.technical?.address).toBe('2 Side St');
    expect(r.technical?.directorName).toBeUndefined();
    expect(r.technical?.cliaOrIsoNumber).toBeUndefined();
  });

  it('is not a split when the same lab did both halves, or the facility is unknown', () => {
    expect(resolveSplitReportBranding(reporting, 'fac-1', all).technical).toBeUndefined();
    expect(resolveSplitReportBranding(reporting, 'missing', all).technical).toBeUndefined();
  });

  it('returns nothing without an ordering facility', () => {
    expect(resolveSplitReportBranding(undefined, 'fac-2', all)).toEqual({});
  });
});

describe('technicalBrandingForRender (Batch 618, PS-336)', () => {
  const reporting = facility();
  const technical = facility({ id: 'fac-2', name: 'Technical Lab' });
  const split = resolveSplitReportBranding(reporting, 'fac-2', [reporting, technical]);

  it('sends the technical lab block only once the case is signed out', () => {
    expect(technicalBrandingForRender(split, 'finalized')?.facilityName).toBe('Technical Lab');
    expect(technicalBrandingForRender(split, 'pending-release')?.facilityName).toBe('Technical Lab');
    expect(technicalBrandingForRender(split, 'closed')?.facilityName).toBe('Technical Lab');
  });

  it('sends nothing on a draft, or when the case is not split', () => {
    expect(technicalBrandingForRender(split, 'in-progress' as never)).toBeUndefined();
    expect(technicalBrandingForRender(split, undefined)).toBeUndefined();
    expect(technicalBrandingForRender({ professional: split.professional }, 'finalized')).toBeUndefined();
  });
});
