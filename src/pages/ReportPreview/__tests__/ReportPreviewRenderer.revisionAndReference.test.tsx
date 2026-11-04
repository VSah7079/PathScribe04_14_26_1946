// @vitest-environment jsdom
//
// Batch 495 (PS-283 §4.2.2, §4.2.3): the revision header and the
// scan-and-correlate footer are part of the rendered document itself, so they
// print from every path that prints this page (preview window, HTML fallback).

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ReportPreviewRenderer from '../ReportPreviewRenderer';
import type { Case } from '@/types/case/Case';

const caseWithAccession = { id: 'case-1', status: 'finalized', version: 4, accession: { fullAccession: 'S26-1234' } } as unknown as Case;

describe('ReportPreviewRenderer — revision header and document reference', () => {
  it('shows no revision banner for an unrevised report', () => {
    const { container } = render(<ReportPreviewRenderer sections={[]} caseData={caseWithAccession} />);
    expect(container.querySelector('.rp-revision-banner')).toBeNull();
  });

  it('shows the revision banner with the original sign-out and latest revision dates', () => {
    const { container } = render(
      <ReportPreviewRenderer
        sections={[]}
        caseData={caseWithAccession}
        revisionStatus={{ latestType: 'amendment', revisionCount: 2, originalSignOutAt: '2026-10-01T10:00:00Z', latestRevisionAt: '2026-10-05T09:00:00Z' }}
      />
    );
    const banner = container.querySelector('.rp-revision-banner');
    expect(banner).not.toBeNull();
    expect(banner!.querySelector('.rp-revision-flag')).not.toBeNull();
    expect(banner!.querySelector('.rp-revision-count')).not.toBeNull();
    expect(banner!.querySelector('.rp-revision-dates')!.textContent).toBeTruthy();
  });

  it('prints a Code 128 barcode of the accession in the footer, tagged as PHI', () => {
    const { container } = render(<ReportPreviewRenderer sections={[]} caseData={caseWithAccession} />);
    const ref = container.querySelector('.rp-doc-reference');
    expect(ref).not.toBeNull();
    expect(ref!.querySelector('.rp-doc-reference-barcode svg')).not.toBeNull();
    expect(ref!.querySelector('.rp-doc-reference-barcode')!.getAttribute('data-phi')).toBe('accession');
    expect(ref!.querySelector('.rp-doc-reference-text')!.getAttribute('data-phi')).toBe('accession');
  });

  it('has no document reference without an accession (template previews)', () => {
    const { container } = render(<ReportPreviewRenderer sections={[]} caseData={{ id: 'x', status: 'accessioned' } as unknown as Case} />);
    expect(container.querySelector('.rp-doc-reference')).toBeNull();
  });
});
