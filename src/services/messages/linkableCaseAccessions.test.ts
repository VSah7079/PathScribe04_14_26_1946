import { describe, it, expect } from 'vitest';
import { selectLinkableAccessions } from './linkableCaseAccessions';

const facilities = [
  { id: 'F-A', name: 'A', isEnterprise: true, legacyTenantIds: ['ORG-A'] },
  { id: 'F-B', name: 'B', isEnterprise: true, legacyTenantIds: ['ORG-B'] },
] as any[];

const c = (accession: string, extra: Record<string, unknown> = {}) => ({ accession: { fullAccession: accession }, originHospitalId: 'ORG-A', reportingMode: 'assist', order: {}, patient: {}, ...extra });

describe('selectLinkableAccessions (Batch 396, privacy model rule 4)', () => {
  const pathologist = { id: 'P1', role: 'pathologist', organisationId: 'ORG-A' } as any;

  it('links the cases the reader can open', () => {
    expect(selectLinkableAccessions(pathologist, [c('S26-1'), c('S26-2')], facilities, new Map())).toEqual(['S26-1', 'S26-2']);
  });

  it('never links with nobody signed in', () => {
    expect(selectLinkableAccessions(null, [c('S26-1')], facilities, new Map())).toEqual([]);
  });

  it('support (superadmin) gets no links to another organisation’s cases', () => {
    const support = { id: 'PATH-001', role: 'superadmin', organisationId: 'ORG-A' } as any;
    expect(selectLinkableAccessions(support, [c('S26-1'), c('MFT26-8809-POOL', { originHospitalId: 'ORG-B' })], facilities, new Map())).toEqual(['S26-1']);
  });

  it('an Orchestration case needs canViewOrchestration to be linked', () => {
    const orch = c('O26-1', { reportingMode: 'orchestrator' });
    expect(selectLinkableAccessions(pathologist, [orch], facilities, new Map())).toEqual([]);
    expect(selectLinkableAccessions({ ...pathologist, canViewOrchestration: true }, [orch], facilities, new Map())).toEqual(['O26-1']);
  });

  it('a pediatric case the reader is not authorised for is not linked', () => {
    const dob = new Date(Date.now() - 5 * 365.25 * 864e5).toISOString();
    const ped = c('S26-9', { order: { facilityId: 'F1' }, patient: { dateOfBirth: dob } });
    const fac = new Map([['F1', { pediatricAgeThreshold: 18, authorizedPediatricPathologistIds: ['P1'] } as any]]);
    expect(selectLinkableAccessions(pathologist, [ped], facilities, fac)).toEqual([]);
    expect(selectLinkableAccessions({ ...pathologist, canViewPediatric: true }, [ped], facilities, fac)).toEqual(['S26-9']);
  });
});
