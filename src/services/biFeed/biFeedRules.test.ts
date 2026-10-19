import { describe, expect, it } from 'vitest';
import {
  BI_RATE_LIMIT_PER_MINUTE, biTokenState, checkBiApproval, checkBiSettings, checkBiTokenDraft, decideBiPull,
  fieldsReturned, looksLikeBiToken, newBiToken, simulatedRowCount, sortBiTokens, tokenIsIdentifiedFor,
  type BiFeedSettings, type BiTokenRecord,
} from './biFeedRules';
import { BI_DATASETS, BI_DATASET_IDS } from './biFeedCatalog';

const settings: BiFeedSettings = { enabled: true, datasetIds: ['cases', 'workload'], facilityIds: ['f1', 'f2'] };
const token = (o: Partial<BiTokenRecord> = {}): BiTokenRecord => ({
  id: 't1', name: 'Quality', datasetIds: ['cases'], facilityIds: [], identified: false, status: 'active',
  createdAt: '2026-06-01T00:00:00.000Z', createdBy: 'Admin', tokenHash: 'h1', tokenHint: 'abcd',
  tokenIssuedAt: '2026-06-01T00:00:00.000Z', tokenExpiresAt: '2027-06-01T00:00:00.000Z', ...o,
});
const NOW = '2026-07-01T00:00:00.000Z';

describe('catalogue', () => {
  it('has every dataset id once, with unique field ids', () => {
    expect(BI_DATASETS.map(d => d.id).sort()).toEqual([...BI_DATASET_IDS].sort());
    for (const d of BI_DATASETS) expect(new Set(d.fields.map(x => x.id)).size).toBe(d.fields.length);
  });
  it('removes direct identifiers when de-identified and keeps everything when identified', () => {
    const de = fieldsReturned('cases', false).map(x => x.id);
    for (const gone of ['patient_name', 'mrn', 'date_of_birth', 'diagnosis_text']) expect(de).not.toContain(gone);
    expect(fieldsReturned('cases', true).map(x => x.id)).toContain('patient_name');
  });
  it('never changes datasets that cannot identify a patient', () => {
    expect(fieldsReturned('workload', false)).toEqual(fieldsReturned('workload', true));
    expect(fieldsReturned('audit', false)).toEqual(fieldsReturned('audit', true));
  });
});

describe('settings and approval checks', () => {
  it('lets an off feed save with nothing chosen but needs choices when on', () => {
    expect(checkBiSettings({ enabled: false, datasetIds: [], facilityIds: [] })).toEqual([]);
    expect(checkBiSettings({ enabled: true, datasetIds: [], facilityIds: [] })).toEqual(['DATASETS_REQUIRED', 'FACILITIES_REQUIRED']);
  });
  it('refuses an unknown dataset', () => {
    expect(checkBiSettings({ enabled: false, datasetIds: ['nope' as never], facilityIds: [] })).toContain('DATASET_UNKNOWN');
  });
  it('needs a named approver and a reason', () => {
    expect(checkBiApproval({ approverName: ' ', reason: '' })).toEqual(['APPROVER_REQUIRED', 'REASON_REQUIRED']);
    expect(checkBiApproval({ approverName: 'x'.repeat(81), reason: 'y'.repeat(501) })).toEqual(['APPROVER_TOO_LONG', 'REASON_TOO_LONG']);
    expect(checkBiApproval({ approverName: 'Dr Lee', reason: 'Quality review' })).toEqual([]);
  });
});

describe('token draft checks', () => {
  const ok = { name: 'Quality', datasetIds: ['cases' as const], facilityIds: ['f1'], identified: false };
  it('accepts a good draft', () => expect(checkBiTokenDraft(ok, settings, [])).toEqual([]));
  it('refuses when the feed is off, a name is taken, or choices exceed the feed', () => {
    expect(checkBiTokenDraft(ok, { ...settings, enabled: false }, [])).toContain('FEED_OFF');
    expect(checkBiTokenDraft(ok, settings, [{ name: 'quality', status: 'active' }])).toContain('NAME_TAKEN');
    expect(checkBiTokenDraft(ok, settings, [{ name: 'quality', status: 'revoked' }])).toEqual([]);
    expect(checkBiTokenDraft({ ...ok, datasetIds: ['billing'] }, settings, [])).toContain('DATASET_NOT_IN_FEED');
    expect(checkBiTokenDraft({ ...ok, facilityIds: ['f9'] }, settings, [])).toContain('FACILITY_NOT_IN_FEED');
  });
  it('needs an approval, and an identifiable dataset, for identified', () => {
    expect(checkBiTokenDraft({ ...ok, identified: true }, settings, [])).toContain('IDENTIFIED_NOT_APPROVED');
    const approved = { ...settings, identifiedApproval: { approverName: 'Dr Lee', reason: 'r', approvedAt: NOW, recordedBy: 'Admin' } };
    expect(checkBiTokenDraft({ ...ok, identified: true }, approved, [])).toEqual([]);
    expect(checkBiTokenDraft({ ...ok, datasetIds: ['workload'], identified: true }, approved, [])).toContain('IDENTIFIED_NEEDS_IDENTIFIABLE_DATASET');
  });
});

describe('tokens', () => {
  it('has a recognisable shape', () => {
    const t = newBiToken(n => Uint8Array.from({ length: n }, (_, i) => i));
    expect(looksLikeBiToken(t)).toBe(true);
    expect(looksLikeBiToken('psbi_short')).toBe(false);
    expect(looksLikeBiToken('pswt_' + 'a'.repeat(48))).toBe(false);
  });
  it('reports its state', () => {
    expect(biTokenState(token(), NOW)).toBe('active');
    expect(biTokenState(token({ tokenExpiresAt: '2026-07-15T00:00:00.000Z' }), NOW)).toBe('expiringSoon');
    expect(biTokenState(token({ tokenExpiresAt: '2026-06-15T00:00:00.000Z' }), NOW)).toBe('expired');
    expect(biTokenState(token({ status: 'revoked' }), NOW)).toBe('revoked');
  });
  it('lists active tokens before revoked ones', () => {
    const l = sortBiTokens([token({ name: 'B', status: 'revoked' }), token({ name: 'C' }), token({ name: 'A' })]);
    expect(l.map(t => t.name)).toEqual(['A', 'C', 'B']);
  });
  it('gives identifying fields only with the token flag, an approval and an identifiable dataset', () => {
    const approved = { identifiedApproval: { approverName: 'a', reason: 'r', approvedAt: NOW, recordedBy: 'x' } };
    expect(tokenIsIdentifiedFor({ identified: true }, 'cases', approved)).toBe(true);
    expect(tokenIsIdentifiedFor({ identified: true }, 'cases', {})).toBe(false);
    expect(tokenIsIdentifiedFor({ identified: true }, 'workload', approved)).toBe(false);
    expect(tokenIsIdentifiedFor({ identified: false }, 'cases', approved)).toBe(false);
  });
});

describe('decideBiPull', () => {
  it('accepts a current token for an allowed dataset', () => expect(decideBiPull(token(), 'h1', 'cases', settings, NOW)).toBe('ok'));
  it('refuses an unknown or missing token', () => {
    expect(decideBiPull(undefined, 'x', 'cases', settings, NOW)).toBe('unknown');
    expect(decideBiPull(token(), 'zzz', 'cases', settings, NOW)).toBe('unknown');
  });
  it('honours the previous token only inside its grace period', () => {
    const t = token({ previousTokenHash: 'old', previousValidUntil: '2026-07-02T00:00:00.000Z' });
    expect(decideBiPull(t, 'old', 'cases', settings, NOW)).toBe('ok');
    expect(decideBiPull(t, 'old', 'cases', settings, '2026-07-03T00:00:00.000Z')).toBe('unknown');
  });
  it('refuses revoked, expired, feed off, other datasets, and unapproved identified', () => {
    expect(decideBiPull(token({ status: 'revoked' }), 'h1', 'cases', settings, NOW)).toBe('revoked');
    expect(decideBiPull(token({ tokenExpiresAt: '2026-06-15T00:00:00.000Z' }), 'h1', 'cases', settings, NOW)).toBe('expired');
    expect(decideBiPull(token(), 'h1', 'cases', { ...settings, enabled: false }, NOW)).toBe('feedOff');
    expect(decideBiPull(token(), 'h1', 'workload', settings, NOW)).toBe('datasetNotAllowed');
    expect(decideBiPull(token({ datasetIds: ['billing'] }), 'h1', 'billing', settings, NOW)).toBe('datasetNotAllowed');
    expect(decideBiPull(token({ identified: true }), 'h1', 'cases', settings, NOW)).toBe('identifiedNotApproved');
  });
  it('rate limits a busy token', () => {
    const recent = Array.from({ length: BI_RATE_LIMIT_PER_MINUTE }, () => '2026-06-30T23:59:50.000Z');
    expect(decideBiPull(token({ recentPulls: recent }), 'h1', 'cases', settings, NOW)).toBe('rateLimited');
  });
  it('gives steady row counts', () => {
    expect(simulatedRowCount('cases', 2)).toBe(simulatedRowCount('cases', 2));
    expect(simulatedRowCount('cases', 0)).toBe(simulatedRowCount('cases', 1));
  });
});
