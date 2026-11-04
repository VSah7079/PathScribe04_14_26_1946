// @vitest-environment happy-dom
// src/components/QualityAssurance/QaActivityBoardTab.test.tsx
// Batch 518 (PS-120): QA → Activities shows a generated tile per activity and a table from its fields.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

vi.mock('@/services', () => ({
  qaActivityTypeService: { getAll: vi.fn(async () => ({ ok: true, data: [
    { id: 'custom-1', name: 'Second read', tabScope: 'custom', active: true, teachingOnboardingEnabled: false, createdAt: '', createdBy: '',
      fields: [{ id: 'agree', label: 'Agree?', type: 'radio', required: true, options: [{ id: 'y', label: 'Yes' }] }] },
  ] })) },
  qaActivityRecordService: { getAll: vi.fn(async () => ({ ok: true, data: [
    { id: 'r1', activityTypeId: 'custom-1', caseId: 'S26-4670', caseType: 'surgical', outcome: 'concordant', recordedAt: new Date().toISOString(), recordedBy: { userId: 'u', userName: 'Dr Lee' }, fieldValues: { agree: 'y' } },
  ] })) },
  countersignService: { getAll: vi.fn(async () => ({ ok: true, data: [
    { id: 'c1', caseId: 'S26-4671', residentId: 'r', residentName: 'Res', releasedAt: new Date().toISOString(), status: 'pending' },
  ] })) },
  tatTargetService: { getAll: vi.fn(async () => ({ ok: true, data: [] })) },
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }) }));

import { QaActivityBoardTab } from './QaActivityBoardTab';
afterEach(cleanup);
const K = 'qaActivityBoard';

describe('QaActivityBoardTab (Batch 518, PS-120)', () => {
  it('shows a tile per activity, the first one\'s table from its fields, and switches', async () => {
    const open = vi.fn();
    render(<QaActivityBoardTab onOpenCase={open} />);
    await waitFor(() => expect(screen.getAllByText('Second read').length).toBeGreaterThan(0));
    expect(screen.getByText('Agree?')).toBeTruthy();
    expect(screen.getByText('Yes')).toBeTruthy();
    fireEvent.click(screen.getByText('S26-4670'));
    expect(open).toHaveBeenCalledWith('S26-4670');
    fireEvent.click(screen.getAllByText(`${K}.countersign.name`)[0]);
    expect(screen.getByText(`${K}.countersign.statuses.pending`)).toBeTruthy();
    expect(screen.getByText('S26-4671').getAttribute('data-phi')).toBe('accession');
  });
});
