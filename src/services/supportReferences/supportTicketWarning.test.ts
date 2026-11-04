// src/services/supportReferences/supportTicketWarning.test.ts
// Batch 450 (PS-349): before a support ticket is sent, the user is warned
// about case numbers / MRNs they typed and can replace case numbers with
// support references, keep editing, or send anyway.
import { describe, it, expect, vi } from 'vitest';
import { identifierWarningOnSend, canReplaceCaseNumbers, caseNumbersIn } from './supportTicketRules';
import { replaceCaseNumbersWithReferences } from '../enhancementRequestService';

describe('PS-349 support ticket warning step', () => {
  it('Send stops at the warning when the title or description holds a case number or MRN', () => {
    expect(identifierWarningOnSend({ title: 'Report froze on S26-4403', description: 'It hung.', sendAnyway: false }))
      .toEqual([{ text: 'S26-4403', kind: 'accession' }]);
    expect(identifierWarningOnSend({ title: 'Froze', description: 'Patient MRN 1234567 was open.', sendAnyway: false }))
      .toEqual(expect.arrayContaining([{ text: '1234567', kind: 'mrn' }]));
  });

  it('Send goes straight through when nothing identifying was typed (support references are fine)', () => {
    expect(identifierWarningOnSend({ title: 'Page froze', description: 'See SR-7K2Q-9MXD at 3pm.', sendAnyway: false })).toBeNull();
  });

  it('"Send anyway" skips the check, even with a case number in the text', () => {
    const find = vi.fn(() => [{ text: 'S26-4403', kind: 'accession' as const }]);
    expect(identifierWarningOnSend({ title: 'S26-4403', description: '', sendAnyway: true }, find)).toBeNull();
    expect(find).not.toHaveBeenCalled();
  });

  it('offers "replace case numbers" only when a case number was found', () => {
    expect(canReplaceCaseNumbers([{ text: 'S26-4403', kind: 'accession' }, { text: '1234567', kind: 'mrn' }])).toBe(true);
    expect(canReplaceCaseNumbers([{ text: '1234567', kind: 'mrn' }])).toBe(false);
    expect(caseNumbersIn([{ text: 'S26-4403', kind: 'accession' }, { text: '1234567', kind: 'mrn' }])).toEqual(['S26-4403']);
  });

  it('replace swaps each case number PathScribe holds for its support reference; an MRN left behind keeps the warning up', async () => {
    const caseService = { getCase: vi.fn(async (id: string) => (id === 'S26-4403' ? ({ id: 'S26-4403' } as any) : undefined)) };
    const supportReferenceService = { forRecord: vi.fn(async (_k: string, id: string) => ({ ok: true as const, data: { ref: id === 'S26-4403' ? 'SR-7K2Q-9MXD' : 'x' } })) } as any;
    const found = [{ text: 'S26-4403', kind: 'accession' as const }, { text: '1234567', kind: 'mrn' as const }];
    const out = await replaceCaseNumbersWithReferences(
      { title: 'S26-4403 froze', description: 'Case s26-4403, MRN 1234567.', found },
      { caseService, supportReferenceService },
    );
    expect(out.title).toBe('SR-7K2Q-9MXD froze');
    expect(out.description).toBe('Case SR-7K2Q-9MXD, MRN 1234567.');
    expect(out.replacedCount).toBe(1);
    expect(out.remaining).toEqual([{ text: '1234567', kind: 'mrn' }]);
    expect(caseService.getCase).toHaveBeenCalledTimes(1); // the MRN is never looked up as a case
  });

  it('once every identifier is replaced the warning clears, so the next Send goes through', async () => {
    const out = await replaceCaseNumbersWithReferences(
      { title: 'Report S26-4403 froze', description: 'Nothing else.', found: [{ text: 'S26-4403', kind: 'accession' }] },
      { caseService: { getCase: async () => ({ id: 'S26-4403' } as any) }, supportReferenceService: { forRecord: async () => ({ ok: true, data: { ref: 'SR-7K2Q-9MXD' } }) } as any },
    );
    expect(out.remaining).toBeNull();
    expect(identifierWarningOnSend({ title: out.title, description: out.description, sendAnyway: false })).toBeNull();
  });

  it('a case number PathScribe does not hold is left as typed and still warned about', async () => {
    const out = await replaceCaseNumbersWithReferences(
      { title: 'S26-9999 froze', description: '', found: [{ text: 'S26-9999', kind: 'accession' }] },
      { caseService: { getCase: async () => undefined }, supportReferenceService: { forRecord: vi.fn() } as any },
    );
    expect(out.title).toBe('S26-9999 froze');
    expect(out.replacedCount).toBe(0);
    expect(out.remaining).toEqual([{ text: 'S26-9999', kind: 'accession' }]);
  });
});
