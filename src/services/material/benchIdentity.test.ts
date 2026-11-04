// Batch 759 (Patient Verification spec §2.1, §2.3): the Foreign Identifier and the specimen source at the bench.
import { describe, it, expect } from 'vitest';
import { foreignIdentifiersOf, specimenOfInstance, specimenSources } from './benchIdentity';
import { originatingCaseOf } from '@/services/cases/originatingCase';

describe('benchIdentity (Batch 759)', () => {
  it('an outside case shows its originating case number, then the outside number of the item being worked', () => {
    const order = { originatingCase: { caseNumber: 'S-24-9842', institution: 'Mercy General' } };
    expect(foreignIdentifiersOf(order, [{ externalId: 'MG-A1' }, { externalId: 'MG-SPEC-1', externalIdSource: 'Mercy General' }])).toEqual([
      { value: 'S-24-9842', source: 'Mercy General', scope: 'case' }, { value: 'MG-A1', source: undefined, scope: 'item' },
    ]);
    // A block with no number of its own falls back to its specimen's.
    expect(foreignIdentifiersOf(undefined, [{}, { externalId: 'MG-SPEC-1', externalIdSource: 'Mercy General' }])).toEqual([{ value: 'MG-SPEC-1', source: 'Mercy General', scope: 'item' }]);
    // The same number twice is shown once; nothing for an in-house case.
    expect(foreignIdentifiersOf(order, [{ externalId: 's-24-9842' }])).toHaveLength(1);
    expect(foreignIdentifiersOf({}, [null, undefined])).toEqual([]);
  });

  it('the specimen source: of every part, and of the part a report field belongs to', () => {
    expect(specimenSources([{ label: 'A', description: 'Colon, segmental resection' }, { label: 'B' }])).toEqual([
      { label: 'A', description: 'Colon, segmental resection' }, { label: 'B', description: '—' },
    ]);
    const c = { synopticReports: [{ instanceId: 'i1', specimenId: 'sp2' }], specimens: [{ id: 'sp1', label: 'A' }, { id: 'sp2', label: 'B', description: 'Lymph nodes' }] };
    expect(specimenOfInstance(c, 'i1')).toEqual({ label: 'B', description: 'Lymph nodes' });
    expect(specimenOfInstance(c, 'gone')).toBeNull();
    expect(specimenOfInstance(null, 'i1')).toBeNull();
  });

  it('the originating case typed at Accession is saved only with a case number', () => {
    expect(originatingCaseOf({ caseNumber: ' S-24-9842 ', institution: ' Mercy General ' })).toEqual({ caseNumber: 'S-24-9842', institution: 'Mercy General' });
    expect(originatingCaseOf({ caseNumber: 'S-24-9842', institution: ' ' })).toEqual({ caseNumber: 'S-24-9842' });
    expect(originatingCaseOf({ caseNumber: '  ', institution: 'Mercy General' })).toBeUndefined();
    expect(originatingCaseOf(null)).toBeUndefined();
  });
});
