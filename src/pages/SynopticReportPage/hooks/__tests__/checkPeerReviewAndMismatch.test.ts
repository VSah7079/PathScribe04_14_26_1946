// Batch 523 (PS-145, decision 15): the surgical and autopsy FAD checks hand the right input to the service.
// Batch 530 (PS-554): through atSignOut, with the case's specimen types and what to log.
import { describe, it, expect, vi } from 'vitest';
import type { Case } from '@/types/case/Case';

const { atSignOut } = vi.hoisted(() => ({ atSignOut: vi.fn(async () => null) }));
vi.mock('@/services', () => ({ clinicalMismatchService: { atSignOut }, peerReviewStatusFor: vi.fn() }));

import { checkAutopsyClinicalMismatch, checkClinicalMismatch } from '../checkPeerReviewAndMismatch';

const CASE = { id: 'c1', order: { clinicalIndication: 'Clinical cause of death: MI' }, diagnostic: { primaryDiagnosis: '' } } as unknown as Case;

describe('checkPeerReviewAndMismatch', () => {
  it('surgical: once per case', async () => {
    await checkClinicalMismatch(CASE);
    expect(atSignOut).toHaveBeenLastCalledWith(expect.objectContaining({ discipline: 'surgical' }), { caseId: 'c1' }, [], expect.objectContaining({ discipline: 'surgical', clinicalIndication: 'Clinical cause of death: MI' }));
  });
  it('autopsy FAD: compares the report sections as on screen', async () => {
    await checkAutopsyClinicalMismatch(CASE, [{ label: 'Final anatomic diagnosis', text: 'Pulmonary embolus' }]);
    expect(atSignOut).toHaveBeenLastCalledWith(expect.objectContaining({ discipline: 'autopsy', diagnosis: expect.stringContaining('Pulmonary embolus') }), { caseId: 'c1' }, [], expect.objectContaining({ discipline: 'autopsy' }));
  });
});
