import { describe, it, expect } from 'vitest';
import { runMatchesScope } from './mockCytologyQaReportService';

describe('runMatchesScope (Batch 608, #77)', () => {
  const run = { organisationId: 'ORG-A', facilityId: 'FAC-1' };
  it('enterprise sees every run, including lab-wide ones', () => {
    expect(runMatchesScope({}, { level: 'enterprise' })).toBe(true);
    expect(runMatchesScope(run, { level: 'enterprise' })).toBe(true);
  });
  it('an organisation sees only its own runs', () => {
    expect(runMatchesScope(run, { level: 'organisation', organisationId: 'ORG-A' })).toBe(true);
    expect(runMatchesScope(run, { level: 'organisation', organisationId: 'ORG-B' })).toBe(false);
    expect(runMatchesScope({}, { level: 'organisation', organisationId: 'ORG-A' })).toBe(false);
  });
  it('a facility sees only its own runs', () => {
    expect(runMatchesScope(run, { level: 'client', clientId: 'FAC-1' })).toBe(true);
    expect(runMatchesScope(run, { level: 'client', clientId: 'FAC-2' })).toBe(false);
  });
});
