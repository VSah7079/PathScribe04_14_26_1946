// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';

afterEach(cleanup);
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
const getAll = vi.fn();
vi.mock('@/services', () => ({
  cytologyQcCaseAssignmentService: { getAll: () => getAll() },
  userService: { getAll: async () => ({ ok: true, data: [{ id: 'R1', firstName: 'Rae', lastName: 'Reviewer' }] }) },
}));
import { CytologyQcCompliancePanel } from './CytologyQcCompliancePanel';

const asg = (over: Record<string, unknown>) => ({ id: Math.random().toString(), caseId: 'c', priorityTier: 'routine_random', triggerSource: 'rule_match', slaEscalationCount: 0, badges: [], ...over });

describe('CytologyQcCompliancePanel (Batch 608, #53)', () => {
  it('shows a dash, not 0%, when nothing is resolved', async () => {
    getAll.mockResolvedValue({ ok: true, data: [asg({ state: 'QC_PENDING' })] });
    render(<CytologyQcCompliancePanel />);
    await waitFor(() => expect(getAll).toHaveBeenCalled());
    expect(screen.getByText('cytologyQcCompliance.noData')).toBeTruthy();
    expect(screen.getByText('cytologyQcCompliance.noReviewers')).toBeTruthy();
  });
  it('shows the discrepancy rate and each reviewer by name', async () => {
    getAll.mockResolvedValue({ ok: true, data: [
      asg({ state: 'FINAL_APPROVED', assignedReviewerId: 'R1' }),
      asg({ state: 'QC_DISCREPANCY_REVISE', assignedReviewerId: 'R1', discrepancy: { severity: 'major' } }),
    ] });
    render(<CytologyQcCompliancePanel />);
    expect(await screen.findByText('Rae Reviewer')).toBeTruthy();
    expect(screen.getAllByText('50.0%').length).toBeGreaterThan(0);
  });
});
