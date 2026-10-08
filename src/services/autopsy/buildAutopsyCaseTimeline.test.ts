// src/services/autopsy/buildAutopsyCaseTimeline.test.ts
import { describe, it, expect } from 'vitest';
import { buildAutopsyCaseTimeline } from './buildAutopsyCaseTimeline';
import type { AutopsyCaseDetails } from '@/types/autopsy/AutopsyCaseDetails';

const BASE: AutopsyCaseDetails = {
  jurisdiction: 'US',
  caseAuthority: 'statutory_judicial',
  scope: 'full',
  addenda: [],
  ancillaryHold: { active: false },
};

describe('buildAutopsyCaseTimeline', () => {
  it('returns an empty list when there are no autopsy details', () => {
    expect(buildAutopsyCaseTimeline(undefined)).toEqual([]);
  });

  it('returns an empty list for a bare case with no recorded events yet', () => {
    expect(buildAutopsyCaseTimeline(BASE)).toEqual([]);
  });

  it('includes a forensic verbal and written order as two separate entries', () => {
    const details: AutopsyCaseDetails = {
      ...BASE,
      forensicAuthorization: {
        authorityType: 'Medical Examiner',
        verbalOrderReceivedAt: '2026-01-01T08:00:00Z',
        verbalOrderReceivedFrom: 'Dr. Lane',
        orderReference: 'ME-2026-004',
        orderDate: '2026-01-01T14:00:00Z',
      },
    };
    const entries = buildAutopsyCaseTimeline(details);
    expect(entries.map(e => e.kind)).toEqual(['forensic_written_order', 'forensic_verbal_order']);
    expect(entries[1].actorName).toBe('Dr. Lane');
    expect(entries[0].itemDescription).toBe('ME-2026-004');
  });

  it('includes hospital consent given and a later status change', () => {
    const details: AutopsyCaseDetails = {
      ...BASE,
      caseAuthority: 'hospital_consented',
      hospitalConsent: {
        consentingRelativeName: 'A. Doe',
        consentingRelativeRelationship: 'Spouse',
        consentGivenAt: '2026-02-01T09:00:00Z',
        status: 'narrowed',
        consentScope: ['diagnostic tissue only'],
        excludedOrgans: [],
        retentionPermitted: false,
        statusChangedAt: '2026-02-03T10:00:00Z',
        revocationNote: 'Family declined retention.',
      },
    };
    const entries = buildAutopsyCaseTimeline(details);
    expect(entries.map(e => e.kind)).toEqual(['hospital_consent_status_change', 'hospital_consent_given']);
    expect(entries[0].consentStatus).toBe('narrowed');
    expect(entries[0].note).toBe('Family declined retention.');
    expect(entries[1].actorName).toBe('A. Doe');
  });

  it('omits a status-change entry when consent is still active and unchanged', () => {
    const details: AutopsyCaseDetails = {
      ...BASE,
      caseAuthority: 'hospital_consented',
      hospitalConsent: {
        consentingRelativeName: 'A. Doe',
        consentingRelativeRelationship: 'Spouse',
        consentGivenAt: '2026-02-01T09:00:00Z',
        status: 'active',
        consentScope: [],
        excludedOrgans: [],
        retentionPermitted: true,
      },
    };
    const entries = buildAutopsyCaseTimeline(details);
    expect(entries).toHaveLength(1);
    expect(entries[0].kind).toBe('hospital_consent_given');
  });

  it('includes every custody transfer', () => {
    const details: AutopsyCaseDetails = {
      ...BASE,
      custodyLog: [
        { id: 'c1', occurredAt: '2026-03-01T00:00:00Z', itemDescription: 'Body', fromCustodianType: 'pathology_department', fromCustodianName: 'Morgue', toCustodianType: 'funeral_home', toCustodianName: 'Rest Haven', releasedByName: 'T. Reyes' },
        { id: 'c2', occurredAt: '2026-03-05T00:00:00Z', itemDescription: 'Personal effects', fromCustodianType: 'pathology_department', fromCustodianName: 'Morgue', toCustodianType: 'family', toCustodianName: 'A. Doe', releasedByName: 'T. Reyes' },
      ],
    };
    const entries = buildAutopsyCaseTimeline(details);
    expect(entries.map(e => e.id)).toEqual(['custody-c2', 'custody-c1']);
    expect(entries[0].kind).toBe('custody_transfer');
    expect(entries[0].toCustodianName).toBe('A. Doe');
  });

  it('includes an ordered, resulted, and cancelled toxicology order as separate entries', () => {
    const detailsResulted: AutopsyCaseDetails = {
      ...BASE,
      toxicologyOrders: [
        { id: 't1', orderedAt: '2026-04-01T00:00:00Z', orderedByName: 'Dr. Lane', specimenDescription: 'Blood', specimenBarcode: 'TOX-001', analytesRequested: 'Ethanol', labName: 'State Lab', status: 'resulted', resultedAt: '2026-04-10T00:00:00Z', resultSummary: 'Negative' },
      ],
    };
    const resultedEntries = buildAutopsyCaseTimeline(detailsResulted);
    expect(resultedEntries.map(e => e.kind)).toEqual(['toxicology_resulted', 'toxicology_ordered']);
    expect(resultedEntries[0].note).toBe('Negative');
    expect(resultedEntries[1].itemDescription).toBe('TOX-001');

    const detailsCancelled: AutopsyCaseDetails = {
      ...BASE,
      toxicologyOrders: [
        { id: 't2', orderedAt: '2026-04-01T00:00:00Z', orderedByName: 'Dr. Lane', specimenDescription: 'Blood', specimenBarcode: 'TOX-002', analytesRequested: 'Ethanol', labName: 'State Lab', status: 'cancelled', cancelledAt: '2026-04-02T00:00:00Z', cancelReason: 'Specimen lost' },
      ],
    };
    const cancelledEntries = buildAutopsyCaseTimeline(detailsCancelled);
    expect(cancelledEntries.map(e => e.kind)).toEqual(['toxicology_cancelled', 'toxicology_ordered']);
    expect(cancelledEntries[0].reason).toBe('Specimen lost');
  });

  it('includes organ retention detail and disposal', () => {
    const details: AutopsyCaseDetails = {
      ...BASE,
      organRetentionDetail: { recipientName: 'Neuropath Lab', location: 'Fixed Brain Storage', recordedAt: '2026-05-01T00:00:00Z', recordedByName: 'Dr. Lane' },
      organRetentionDisposal: { disposalMethod: 'cremation', disposalTimestamp: '2026-06-01T00:00:00Z', certificateReference: 'CERT-99', recordedByName: 'Dr. Lane' },
    };
    const entries = buildAutopsyCaseTimeline(details);
    expect(entries.map(e => e.kind)).toEqual(['organ_retention_disposal', 'organ_retention_detail_recorded']);
    expect(entries[0].disposalMethod).toBe('cremation');
    expect(entries[0].itemDescription).toBe('CERT-99');
    expect(entries[1].itemDescription).toBe('Neuropath Lab');
  });

  it('includes ancillary hold start and end as separate entries', () => {
    const details: AutopsyCaseDetails = {
      ...BASE,
      ancillaryHold: { active: false, reason: 'Awaiting toxicology', startedAt: '2026-07-01T00:00:00Z', endedAt: '2026-07-10T00:00:00Z' },
    };
    const entries = buildAutopsyCaseTimeline(details);
    expect(entries.map(e => e.kind)).toEqual(['ancillary_hold_ended', 'ancillary_hold_started']);
    expect(entries[1].reason).toBe('Awaiting toxicology');
  });

  it('includes PAD and FAD signing, and addenda', () => {
    const details: AutopsyCaseDetails = {
      ...BASE,
      padSnapshot: { tier: 'PAD', frozenPayload: {}, signedBy: { name: 'Dr. Lane', isPathologist: true }, signedAt: '2026-08-01T00:00:00Z' },
      fadSnapshot: { tier: 'FAD', frozenPayload: {}, signedBy: { name: 'Dr. Lane', isPathologist: true }, signedAt: '2026-08-10T00:00:00Z' },
      addenda: [{ id: 'a1', content: 'Correction', reason: 'Lab re-run', addedBy: { name: 'Dr. Lane', isPathologist: true }, addedAt: '2026-08-15T00:00:00Z' }],
    };
    const entries = buildAutopsyCaseTimeline(details);
    expect(entries.map(e => e.kind)).toEqual(['addendum_added', 'report_signed', 'report_signed']);
    expect(entries[1].reportTier).toBe('FAD');
    expect(entries[2].reportTier).toBe('PAD');
    expect(entries[0].reason).toBe('Lab re-run');
  });

  it('includes every organ tag recorded (Batch 478)', () => {
    const details: AutopsyCaseDetails = {
      ...BASE,
      organTags: [
        { id: 't1', organCode: 'heart', status: 'abnormal', finding: 'LAD 90% stenosed', recordedAt: '2026-04-01T00:00:00Z', recordedByName: 'Dr. Lane' },
        { id: 't2', organCode: 'left_lung', status: 'normal', recordedAt: '2026-04-02T00:00:00Z', recordedByName: 'Dr. Lane' },
      ],
    };
    const entries = buildAutopsyCaseTimeline(details);
    expect(entries.map(e => e.kind)).toEqual(['organ_tag_recorded', 'organ_tag_recorded']);
    expect(entries[0].organCode).toBe('left_lung');
    expect(entries[0].organTagStatus).toBe('normal');
    expect(entries[1].organCode).toBe('heart');
    expect(entries[1].note).toBe('LAD 90% stenosed');
  });

  it('includes a gate override, with its tier, reason, and who did it (Batch 478)', () => {
    const details: AutopsyCaseDetails = {
      ...BASE,
      gateOverrides: [{ id: 'o1', occurredAt: '2026-04-05T00:00:00Z', tier: 'PAD', blockedReasons: ['x'], reason: 'Verbal order confirmed', overriddenByName: 'Dr. Lane' }],
    };
    const entries = buildAutopsyCaseTimeline(details);
    expect(entries).toEqual([expect.objectContaining({
      kind: 'gate_overridden', reportTier: 'PAD', reason: 'Verbal order confirmed', actorName: 'Dr. Lane',
    })]);
  });

  it('sorts a mix of every event kind into a single newest-first timeline', () => {
    const details: AutopsyCaseDetails = {
      ...BASE,
      forensicAuthorization: { authorityType: 'Medical Examiner', orderReference: 'ME-1', orderDate: '2026-01-01T00:00:00Z' },
      custodyLog: [{ id: 'c1', occurredAt: '2026-03-01T00:00:00Z', itemDescription: 'Body', fromCustodianType: 'pathology_department', fromCustodianName: 'Morgue', toCustodianType: 'funeral_home', toCustodianName: 'Rest Haven', releasedByName: 'T. Reyes' }],
      fadSnapshot: { tier: 'FAD', frozenPayload: {}, signedBy: { name: 'Dr. Lane', isPathologist: true }, signedAt: '2026-09-01T00:00:00Z' },
    };
    const entries = buildAutopsyCaseTimeline(details);
    expect(entries.map(e => e.kind)).toEqual(['report_signed', 'custody_transfer', 'forensic_written_order']);
    for (let i = 1; i < entries.length; i++) {
      expect(new Date(entries[i - 1].occurredAt).getTime()).toBeGreaterThanOrEqual(new Date(entries[i].occurredAt).getTime());
    }
  });
});
