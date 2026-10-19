// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

afterEach(cleanup);
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string, o?: { name?: string }) => (o?.name ? `${k}:${o.name}` : k) }) }));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const getForSpecimen = vi.fn();
const getForCase = vi.fn();
vi.mock('@/services', () => ({ countersignService: { getForSpecimen: (...a: unknown[]) => getForSpecimen(...a), getForCase: (...a: unknown[]) => getForCase(...a) } }));
const ret = vi.fn();
vi.mock('@/services/cases/returnCaseToTrainee', () => ({ returnCaseToTrainee: (...a: unknown[]) => ret(...a) }));
vi.mock('@/services/cases/returnCaseToTraineeDeps', () => ({ returnCaseToTraineeDeps: {} }));

import { ReturnToTraineeBar } from './ReturnToTraineeBar';

const pending = { status: 'pending', residentId: 'RES', residentName: 'Resident' };
beforeEach(() => { getForSpecimen.mockReset(); getForCase.mockReset(); ret.mockReset(); });

describe('ReturnToTraineeBar (Batch 608)', () => {
  it('without a specimen (an autopsy report) it reads the case’s own record and returns with no specimen', async () => {
    getForCase.mockResolvedValue({ ok: true, data: pending });
    ret.mockResolvedValue({ outcome: 'returned', record: { residentName: 'Resident' } });
    render(<ReturnToTraineeBar caseId="A1" user={{ id: 'ATT', name: 'Attending' }} onReturned={vi.fn()} />);
    fireEvent.change(await screen.findByLabelText('cytologyReturn.feedbackLabel'), { target: { value: 'Revise the cause of death.' } });
    fireEvent.click(screen.getByText('cytologyReturn.button'));
    await waitFor(() => expect(ret).toHaveBeenCalled());
    expect(getForSpecimen).not.toHaveBeenCalled();
    expect(ret.mock.calls[0][0]).toMatchObject({ caseId: 'A1', specimenId: undefined, feedback: 'Revise the cause of death.' });
  });
  it('shows nothing to the trainee who released it', async () => {
    getForSpecimen.mockResolvedValue({ ok: true, data: pending });
    const { container } = render(<ReturnToTraineeBar caseId="C1" specimenId="S1" requireSpecimen user={{ id: 'RES', name: 'Resident' }} onReturned={vi.fn()} />);
    await waitFor(() => expect(getForSpecimen).toHaveBeenCalled());
    expect(container.textContent).toBe('');
  });
  it('asks for feedback before returning', async () => {
    getForSpecimen.mockResolvedValue({ ok: true, data: pending });
    render(<ReturnToTraineeBar caseId="C1" specimenId="S1" requireSpecimen user={{ id: 'ATT', name: 'Attending' }} onReturned={vi.fn()} />);
    fireEvent.click(await screen.findByText('cytologyReturn.button'));
    expect(screen.getByText('cytologyReturn.feedbackRequired')).toBeTruthy();
    expect(ret).not.toHaveBeenCalled();
  });
  it('returns with the feedback and reloads the case', async () => {
    getForSpecimen.mockResolvedValue({ ok: true, data: pending });
    ret.mockResolvedValue({ outcome: 'returned', record: { residentName: 'Resident' } });
    const onReturned = vi.fn();
    render(<ReturnToTraineeBar caseId="C1" specimenId="S1" requireSpecimen user={{ id: 'ATT', name: 'Attending' }} onReturned={onReturned} />);
    fireEvent.change(await screen.findByLabelText('cytologyReturn.feedbackLabel'), { target: { value: 'Re-screen.' } });
    fireEvent.click(screen.getByText('cytologyReturn.button'));
    await waitFor(() => expect(onReturned).toHaveBeenCalled());
    expect(ret).toHaveBeenCalledWith(expect.objectContaining({ caseId: 'C1', specimenId: 'S1', feedback: 'Re-screen.' }), {});
  });
  it('shows the trainee the attending’s feedback once returned', async () => {
    getForSpecimen.mockResolvedValue({ ok: true, data: { status: 'returned', residentId: 'RES', attendingName: 'Dr A', attendingFeedback: 'Look again at the cluster.' } });
    render(<ReturnToTraineeBar caseId="C1" specimenId="S1" requireSpecimen user={{ id: 'RES', name: 'Resident' }} onReturned={vi.fn()} />);
    expect(await screen.findByText('Look again at the cluster.')).toBeTruthy();
  });
});
