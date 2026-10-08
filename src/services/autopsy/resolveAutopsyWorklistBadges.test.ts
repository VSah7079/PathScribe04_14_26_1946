// src/services/autopsy/resolveAutopsyWorklistBadges.test.ts
import { describe, it, expect } from 'vitest';
import { resolveAutopsyWorklistBadges, resolveAutopsySlaHint } from './resolveAutopsyWorklistBadges';
import type { AutopsyCaseDetails } from '@/types/autopsy/AutopsyCaseDetails';

const BASE: AutopsyCaseDetails = {
  jurisdiction: 'US',
  caseAuthority: 'statutory_judicial',
  scope: 'full',
  addenda: [],
  ancillaryHold: { active: false },
};

describe('resolveAutopsyWorklistBadges', () => {
  it('always includes the case-authority badge, keyed to the right label path', () => {
    const forensic = resolveAutopsyWorklistBadges(BASE);
    expect(forensic).toEqual([{ kind: 'caseAuthority', labelKey: 'autopsyIntake.caseAuthority.statutory_judicial' }]);

    const consented = resolveAutopsyWorklistBadges({ ...BASE, caseAuthority: 'hospital_consented' });
    expect(consented).toEqual([{ kind: 'caseAuthority', labelKey: 'autopsyIntake.caseAuthority.hospital_consented' }]);
  });

  it('adds an ancillary-hold badge only while the hold is active', () => {
    const noHold = resolveAutopsyWorklistBadges(BASE);
    expect(noHold.some(b => b.kind === 'ancillaryHold')).toBe(false);

    const active = resolveAutopsyWorklistBadges({ ...BASE, ancillaryHold: { active: true, reason: 'Awaiting toxicology' } });
    expect(active).toContainEqual({ kind: 'ancillaryHold', labelKey: 'searchPage.holdType.autopsyAncillary' });

    const endedHold = resolveAutopsyWorklistBadges({ ...BASE, ancillaryHold: { active: false, startedAt: '2026-01-01', endedAt: '2026-01-05' } });
    expect(endedHold.some(b => b.kind === 'ancillaryHold')).toBe(false);
  });

  it('adds PAD and FAD badges independently, based on whether each snapshot exists', () => {
    const neither = resolveAutopsyWorklistBadges(BASE);
    expect(neither.some(b => b.kind === 'padSigned' || b.kind === 'fadSigned')).toBe(false);

    const padOnly = resolveAutopsyWorklistBadges({
      ...BASE,
      padSnapshot: { tier: 'PAD', frozenPayload: {}, signedBy: { name: 'Dr. Lane', isPathologist: true }, signedAt: '2026-01-01T00:00:00Z' },
    });
    expect(padOnly).toContainEqual({ kind: 'padSigned', labelKey: 'searchPage.autopsyReport.pad' });
    expect(padOnly.some(b => b.kind === 'fadSigned')).toBe(false);

    const both = resolveAutopsyWorklistBadges({
      ...BASE,
      padSnapshot: { tier: 'PAD', frozenPayload: {}, signedBy: { name: 'Dr. Lane', isPathologist: true }, signedAt: '2026-01-01T00:00:00Z' },
      fadSnapshot: { tier: 'FAD', frozenPayload: {}, signedBy: { name: 'Dr. Lane', isPathologist: true }, signedAt: '2026-02-01T00:00:00Z' },
    });
    expect(both).toContainEqual({ kind: 'padSigned', labelKey: 'searchPage.autopsyReport.pad' });
    expect(both).toContainEqual({ kind: 'fadSigned', labelKey: 'searchPage.autopsyReport.fad' });
  });

  it('orders badges case-authority, ancillary-hold, pad, fad', () => {
    const all = resolveAutopsyWorklistBadges({
      ...BASE,
      ancillaryHold: { active: true, reason: 'Awaiting toxicology' },
      padSnapshot: { tier: 'PAD', frozenPayload: {}, signedBy: { name: 'Dr. Lane', isPathologist: true }, signedAt: '2026-01-01T00:00:00Z' },
      fadSnapshot: { tier: 'FAD', frozenPayload: {}, signedBy: { name: 'Dr. Lane', isPathologist: true }, signedAt: '2026-02-01T00:00:00Z' },
    });
    expect(all.map(b => b.kind)).toEqual(['caseAuthority', 'ancillaryHold', 'padSigned', 'fadSigned']);
  });
});

describe('resolveAutopsySlaHint', () => {
  it('reuses the jurisdiction TAT/SLA matrix and summary formatter verbatim', () => {
    const hint = resolveAutopsySlaHint(BASE);
    expect(hint).toContain('TAT: PAD within');
    expect(hint).toContain('CAP / CLIA');
  });

  it('varies by jurisdiction', () => {
    const us = resolveAutopsySlaHint(BASE);
    const uk = resolveAutopsySlaHint({ ...BASE, jurisdiction: 'GB_EW' });
    expect(us).not.toEqual(uk);
    expect(uk).toContain('RCPath / HTA');
  });
});
