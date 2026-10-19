// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import ReportPreviewRenderer from '../ReportPreviewRenderer';

const related = [{
  sourceCaseId: 'a', accession: 'S26-a', releasedAt: '2026-01-01T00:00:00Z', sourceVersion: 1, specimens: [], diagnosis: 'Nevus', copyToPhysicians: [],
}];

afterEach(cleanup);

describe('ReportPreviewRenderer: intraoperative diagnosis and related cases (Batch 613)', () => {
  it('shows the intraoperative diagnosis as part of the report', () => {
    render(<ReportPreviewRenderer sections={[]} caseData={null} intraoperativeDiagnosis="A: Benign nevus" />);
    expect(screen.getByText('A: Benign nevus')).toBeTruthy();
  });
  it('shows the attached related cases after the body, and nothing when none', () => {
    const { rerender } = render(<ReportPreviewRenderer sections={[]} caseData={null} relatedCases={related} />);
    expect(screen.getByText('S26-a')).toBeTruthy();
    expect(screen.getByText('surgicalReportPdf.relatedCasesTitle')).toBeTruthy();
    rerender(<ReportPreviewRenderer sections={[]} caseData={null} />);
    expect(screen.queryByText('surgicalReportPdf.relatedCasesTitle')).toBeNull();
  });
});
