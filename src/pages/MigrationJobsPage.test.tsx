// @vitest-environment happy-dom
// Batch 611 (#132, #166): Migration Jobs: Import legacy file, the Simulated tag, and the job's per-record results.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

const h = vi.hoisted(() => ({ jobs: vi.fn(), results: vi.fn() }));
vi.mock('@/services', () => ({
  migrationJobService: { getAll: h.jobs },
  migrationRecordResultService: { getByJobId: h.results },
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o ? `${k}:${JSON.stringify(o)}` : k), i18n: { language: 'en' } }) }));
vi.mock('@/contexts/BreadcrumbContext', () => ({ useBreadcrumb: () => ({ pushCrumb: vi.fn() }) }));
vi.mock('@/components/Common/CapabilityButton', () => ({
  CapabilityButton: ({ children, onClick, capability }: { children: React.ReactNode; onClick: () => void; capability: string }) =>
    <button data-capability={capability} onClick={onClick}>{children}</button>,
}));
vi.mock('@/components/Migration/LegacyImportModal', () => ({
  LegacyImportModal: ({ onClose, onOpenJob }: { onClose: () => void; onOpenJob: (j: unknown) => void }) => (
    <div role="dialog"><button onClick={onClose}>close-import</button><button onClick={() => onOpenJob(JOB)}>open-job</button></div>
  ),
}));

import MigrationJobsPage from './MigrationJobsPage';
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const JOB = { id: 'migjob-1', sourceSystemName: 'LegacyLIS', status: 'completed_with_errors', totalRecordsProcessed: 3, succeededCount: 1, failedCount: 1, needsReviewCount: 1, createdByUserId: 'u1', createdByUserName: 'A', createdAt: '2026-10-18T00:00:00Z', simulated: true };
const RESULTS = [
  { id: 'r1', migrationJobId: 'migjob-1', sourceRecordId: 'LEG-1', outcome: 'succeeded', targetCaseId: 'MIG-1-1', unmappedSourceFields: [], processedAt: 'x' },
  { id: 'r2', migrationJobId: 'migjob-1', sourceRecordId: 'LEG-2', outcome: 'failed', errorMessage: 'Missing patient name.', unmappedSourceFields: [], processedAt: 'x' },
  { id: 'r3', migrationJobId: 'migjob-1', sourceRecordId: 'LEG-3', outcome: 'needs_review', unmappedSourceFields: [], processedAt: 'x' },
];

describe('MigrationJobsPage (Batch 611)', () => {
  it('tags a job the file import ran as Simulated', async () => {
    h.jobs.mockResolvedValue({ ok: true, data: [JOB, { ...JOB, id: 'j2', simulated: undefined }] });
    render(<MigrationJobsPage />);
    await waitFor(() => expect(screen.getAllByText('LegacyLIS').length).toBe(2));
    expect(screen.getAllByText('migrationJobs.simulatedTag')).toHaveLength(1);
  });

  it('Import legacy file needs the migration capability and opens the import window', async () => {
    h.jobs.mockResolvedValue({ ok: true, data: [] });
    render(<MigrationJobsPage />);
    const btn = screen.getByText('migrationJobs.importButton');
    expect(btn.getAttribute('data-capability')).toBe('config:migration-mappings:manage');
    fireEvent.click(btn);
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.click(screen.getByText('close-import'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('"View job" from the import window opens the job with every record, its outcome and its draft case', async () => {
    h.jobs.mockResolvedValue({ ok: true, data: [JOB] });
    h.results.mockResolvedValue({ ok: true, data: RESULTS });
    render(<MigrationJobsPage />);
    fireEvent.click(screen.getByText('migrationJobs.importButton'));
    fireEvent.click(screen.getByText('open-job'));
    await waitFor(() => expect(screen.getByText('migrationJobs.allRecords')).toBeTruthy());
    expect(screen.getByText('migrationJobs.simulatedBanner')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    const list = document.querySelector('.ps-migration-records') as HTMLElement;
    expect(list.textContent).toContain('migrationJobs.recordOutcome.succeeded');
    expect(list.textContent).toContain('migrationJobs.recordOutcome.failed');
    expect(list.textContent).toContain('migrationJobs.recordOutcome.needs_review');
    expect(list.textContent).toContain('"id":"MIG-1-1"');
    for (const id of ['LEG-1', 'LEG-2', 'LEG-3']) expect(list.querySelector(`[data-phi="accession"]`)).toBeTruthy(), expect(list.textContent).toContain(id);
    expect(screen.getAllByText('Missing patient name.').length).toBeGreaterThan(0);
  });
});
