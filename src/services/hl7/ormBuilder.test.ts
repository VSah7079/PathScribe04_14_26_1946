import { describe, it, expect } from 'vitest';
import { buildOrmO01ForBlock } from './ormBuilder';

const ctx = { sendingApplication: 'PS', sendingFacility: 'LAB', receivingApplication: 'ENG', receivingFacility: 'HOSP', processingId: 'T' as const };
const caseData = { id: 'C-1', patient: { mrn: 'M1', firstName: 'Ann', lastName: 'Test', dateOfBirth: '1980-01-02', sex: 'F' } } as any;
const specimen = { id: 'SP-1', label: 'A', collection: { bodySite: 'Colon', collectedAt: '2026-01-01T10:00:00Z' }, container: { type: 'Formalin' } } as any;
const block = (stains: any[]) => ({ id: 'B-1', label: '1', status: 'Embedded', stains } as any);
const segs = (m: string) => m.split('\r');

describe('buildOrmO01ForBlock', () => {
  it('builds MSH, PID, PV1, ORC, two SPM and a collection NTE for a block with no stains', () => {
    const { message } = buildOrmO01ForBlock(ctx, caseData, specimen, block([]), 'UTC');
    const names = segs(message).map(s => s.slice(0, 3));
    expect(names).toEqual(['MSH', 'PID', 'PV1', 'ORC', 'SPM', 'NTE', 'SPM']);
    expect(message.includes('\n')).toBe(false);
  });
  it('adds one OBR per stain, in order, with the stain name', () => {
    const { message } = buildOrmO01ForBlock(ctx, caseData, specimen, block([{ id: 'S1', stainName: 'H&E' }, { id: 'S2', stainName: 'CK7' }]), 'UTC');
    const obrs = segs(message).filter(s => s.startsWith('OBR'));
    expect(obrs).toHaveLength(2);
    expect(obrs[0]).toContain('S1');
    expect(obrs[1]).toContain('S2');
  });
  it('uses the case, specimen and block in the placer order number and a fresh control id each time', () => {
    const a = buildOrmO01ForBlock(ctx, caseData, specimen, block([]), 'UTC');
    const b = buildOrmO01ForBlock(ctx, caseData, specimen, block([]), 'UTC');
    expect(a.messageControlId).not.toBe(b.messageControlId);
    expect(a.message).toContain('C-1-A1');
    expect(a.message).toContain(a.messageControlId);
  });
  it('omits the collection note when there is no collection time', () => {
    const { message } = buildOrmO01ForBlock(ctx, caseData, { ...specimen, collection: {} }, block([]), 'UTC');
    expect(segs(message).some(s => s.startsWith('NTE'))).toBe(false);
  });
  it('carries the sending and receiving applications in MSH', () => {
    const { message } = buildOrmO01ForBlock(ctx, caseData, specimen, block([]), 'UTC');
    expect(segs(message)[0]).toContain('PS');
    expect(segs(message)[0]).toContain('ENG');
  });
});
