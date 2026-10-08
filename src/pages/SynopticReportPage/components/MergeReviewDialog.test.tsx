// @vitest-environment happy-dom
// Batch 458 (PS-71): the review dialog when someone else saved other parts.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }) }));
import { MergeReviewDialog } from './MergeReviewDialog';

afterEach(cleanup);
const K = 'synopticReportPage.mergeReview.';

describe('MergeReviewDialog', () => {
  it('names what they changed and what you are saving; Save and Not yet each decide', () => {
    const onSave = vi.fn(); const onNotYet = vi.fn();
    render(<MergeReviewDialog theirsChanged={['participants', 'specimens']} mineChanged={['synopticReports']} busy={false} onSave={onSave} onNotYet={onNotYet} />);
    const cells = screen.getAllByRole('cell').map(c => c.textContent);
    expect(cells[0]).toContain('synopticReportPage.concurrency.parts.participants');
    expect(cells[0]).toContain('synopticReportPage.concurrency.parts.specimens');
    expect(cells[1]).toContain('synopticReportPage.concurrency.parts.synopticReports');
    fireEvent.click(screen.getByText(`${K}notYet`));
    fireEvent.click(screen.getByText(`${K}save`));
    expect(onNotYet).toHaveBeenCalled();
    expect(onSave).toHaveBeenCalled();
  });
  it('both buttons wait while the save is running', () => {
    render(<MergeReviewDialog theirsChanged={[]} mineChanged={[]} busy onSave={vi.fn()} onNotYet={vi.fn()} />);
    expect((screen.getByText(`${K}save`) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByText(`${K}notYet`) as HTMLButtonElement).disabled).toBe(true);
  });
});
