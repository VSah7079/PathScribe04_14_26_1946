// @vitest-environment happy-dom
// Batch 443 (Pete): the demo Lab Director, added to stored staff lists that lack her.
import { describe, it, expect } from 'vitest';
import { LATER_SEED_USERS } from './mockUserService';
import { withMissingSeedRecords } from '../mockSeedMerge';

describe('demo Lab Director (LD-001)', () => {
  it('is a Lab Director at Desert Valley, with no other role', () => {
    const ld = LATER_SEED_USERS.find(u => u.id === 'LD-001');
    expect(ld).toMatchObject({ firstName: 'Rachel', lastName: 'Okafor', roles: ['Lab Director'], organisationId: 'ORG-DVMC', status: 'Active' });
  });
  it('joins a stored staff list without replacing anyone in it', () => {
    const stored = [{ id: 'CT-001', phone: 'edited' }] as never[];
    const { records, added } = withMissingSeedRecords(stored, LATER_SEED_USERS);
    // Batch 455: and the other later demo staff (fellow, second cytotech, template author/approver, QA reviewer).
    expect(added).toBe(LATER_SEED_USERS.length);
    expect(records.map((r: { id: string }) => r.id)).toEqual(['CT-001', 'LD-001', 'FEL-001', 'CT-002', 'TA-001', 'TAP-001', 'QA-001', 'DOC-001', 'DOC-002']);
    expect(withMissingSeedRecords(records, LATER_SEED_USERS).added).toBe(0);
  });
});
