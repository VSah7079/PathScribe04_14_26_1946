// src/services/registrySubmission/registrySubmissionHeader.test.ts
import { describe, it, expect } from 'vitest';
import { sha256Hex } from './sha256';
import { buildRegistrySubmissionHeader, registryContentHash, registryMasterTransactionId, registrySubmissionGuid, retryRegistrySubmissionHeader } from './registrySubmissionHeader';

describe('sha256Hex (FIPS 180-4 test vectors)', () => {
  it('matches the standard vectors', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe('248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1');
    expect(sha256Hex('a'.repeat(1000))).toBe('41edece42d63e8d9bf515a9ba6932e1c20cbc9f5a5d134645adb5db1b9737ea3');
  });
});

const base = { facilityId: 'F1', caseId: 'C1', specimenId: 'SP1', registryId: 'csms_uk', signOutTimestamp: '2026-09-30T10:00:00.000Z' };

describe('registry submission header (Batch 419, SRS FR-008.4/5/8)', () => {
  it('ids are deterministic and GUID-shaped', () => {
    const g = registrySubmissionGuid({ ...base, submissionVersion: 1 });
    expect(g).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(registrySubmissionGuid({ ...base, submissionVersion: 1 })).toBe(g);
    expect(registrySubmissionGuid({ ...base, submissionVersion: 2 })).not.toBe(g);
    expect(registryMasterTransactionId(base)).toBe(registryMasterTransactionId({ ...base }));
    expect(registryMasterTransactionId(base)).not.toBe(registryMasterTransactionId({ ...base, specimenId: 'SP2' }));
  });

  it('the first submission is NEW, version 1, test by default', () => {
    const h = buildRegistrySubmissionHeader({ ...base, kind: 'signOut' }, []);
    expect(h).toMatchObject({ submissionVersion: 1, messageType: 'NEW', environment: 'test', isDuplicateRetry: false, specimenId: 'SP1' });
    expect(h.previousSubmissionGuid).toBeUndefined();
  });

  it('a correction after a sent result is CORRECTION, next version, same master, linked to the previous', () => {
    const first = buildRegistrySubmissionHeader({ ...base, kind: 'signOut', environment: 'production' }, []);
    const prior = [{ registryId: 'csms_uk', status: 'SENT', submission: first }];
    const second = buildRegistrySubmissionHeader({ ...base, kind: 'correction', signOutTimestamp: '2026-10-01T09:00:00.000Z', environment: 'production' }, prior);
    expect(second).toMatchObject({ submissionVersion: 2, messageType: 'CORRECTION', masterTransactionId: first.masterTransactionId, previousSubmissionGuid: first.submissionGuid, environment: 'production' });
    expect(second.submissionGuid).not.toBe(first.submissionGuid);
    const third = buildRegistrySubmissionHeader({ ...base, kind: 'addendum', signOutTimestamp: '2026-10-02T09:00:00.000Z' }, [...prior, { registryId: 'csms_uk', status: 'SENT', submission: second }]);
    expect(third).toMatchObject({ submissionVersion: 3, messageType: 'AMENDMENT', previousSubmissionGuid: second.submissionGuid });
  });

  it('Batch 421: a fixed resend after the registry rejected the only version is NEW; after an accepted one it is CORRECTION', () => {
    const v1 = buildRegistrySubmissionHeader({ ...base, kind: 'signOut' }, []);
    expect(buildRegistrySubmissionHeader({ ...base, kind: 'signOut' }, [{ registryId: 'csms_uk', status: 'SENT', registryStatus: 'rejectedRecoverable', submission: v1 }]))
      .toMatchObject({ submissionVersion: 2, messageType: 'NEW', kind: 'signOut' });
    expect(buildRegistrySubmissionHeader({ ...base, kind: 'signOut' }, [{ registryId: 'csms_uk', status: 'SENT', registryStatus: 'accepted', submission: v1 }]).messageType).toBe('CORRECTION');
  });

  it('a correction of a result the registry never received is NEW', () => {
    const held = buildRegistrySubmissionHeader({ ...base, kind: 'signOut' }, []);
    const h = buildRegistrySubmissionHeader({ ...base, kind: 'correction' }, [{ registryId: 'csms_uk', status: 'FAILED', submission: held }]);
    expect(h).toMatchObject({ submissionVersion: 2, messageType: 'NEW' });
  });

  it('another specimen or registry does not count', () => {
    const other = buildRegistrySubmissionHeader({ ...base, specimenId: 'SP2', kind: 'signOut' }, []);
    const otherReg = buildRegistrySubmissionHeader({ ...base, registryId: 'ncsr_australia', kind: 'signOut' }, []);
    const h = buildRegistrySubmissionHeader({ ...base, kind: 'signOut' }, [
      { registryId: 'csms_uk', status: 'SENT', submission: other }, { registryId: 'ncsr_australia', status: 'SENT', submission: otherReg },
      { registryId: 'csms_uk', status: 'FAILED' }, // an exclusion: no header
    ]);
    expect(h).toMatchObject({ submissionVersion: 1, messageType: 'NEW' });
  });

  it('a retry keeps the id and marks the duplicate', () => {
    const h = buildRegistrySubmissionHeader({ ...base, kind: 'signOut' }, []);
    expect(retryRegistrySubmissionHeader(h)).toEqual({ ...h, isDuplicateRetry: true });
  });
});

describe('registryContentHash (Batch 421)', () => {
  it('ignores message id, timestamp, header and key order; sees any real change', () => {
    const a = { messageId: 'm1', timestamp: 't1', patient: { name: 'A', mrn: '1' }, result: 'NILM', submission: { v: 1 } };
    const b = { result: 'NILM', patient: { mrn: '1', name: 'A' }, messageId: 'm2', timestamp: 't2', submission: { v: 2 } };
    expect(registryContentHash(a)).toBe(registryContentHash(b));
    expect(registryContentHash({ ...a, result: 'HSIL' })).not.toBe(registryContentHash(a));
    expect(registryContentHash({ ...a, extra: undefined })).toBe(registryContentHash(a));
  });
});
