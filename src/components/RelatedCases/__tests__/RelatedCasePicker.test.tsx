// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { RelatedCaseSnapshot } from '@/services/relatedCases/relatedCaseTypes';

const snap = (id: string, releasedAt: string): RelatedCaseSnapshot => ({
  sourceCaseId: id, accession: `S26-${id}`, releasedAt, sourceVersion: 1, specimens: ['A: Skin'], diagnosis: `Dx ${id}`,
  orderingPhysician: 'Dr. Ng', copyToPhysicians: ['Dr. Oh'],
});
const candidates = [snap('a', '2026-01-01T00:00:00Z'), snap('b', '2026-02-01T00:00:00Z')];

vi.mock('@/hooks/useRelatedCaseCandidates', () => ({ useRelatedCaseCandidates: () => ({ candidates, loading: false }) }));

import { RelatedCasePicker } from '../RelatedCasePicker';
import { RelatedCaseList } from '../RelatedCaseList';

afterEach(cleanup);

describe('RelatedCasePicker', () => {
  it('starts with nothing ticked and shows the ordering and copy-to physicians', () => {
    render(<RelatedCasePicker patientId="P1" chosen={[]} onChange={() => {}} hint="hint" />);
    const boxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    expect(boxes).toHaveLength(2);
    expect(boxes.every(b => !b.checked)).toBe(true);
    expect(document.querySelectorAll('.ps-related-picker__people')).toHaveLength(2);
  });
  it('reports the pathologist\'s choice', () => {
    const onChange = vi.fn();
    render(<RelatedCasePicker patientId="P1" chosen={[]} onChange={onChange} hint="hint" />);
    fireEvent.click(screen.getAllByRole('checkbox')[1]);
    expect(onChange).toHaveBeenCalledWith([candidates[1]]);
  });
  it('offers Select all only where asked', () => {
    const { rerender } = render(<RelatedCasePicker patientId="P1" chosen={[]} onChange={() => {}} hint="h" />);
    expect(screen.queryByRole('button')).toBeNull();
    const onChange = vi.fn();
    rerender(<RelatedCasePicker patientId="P1" chosen={[]} onChange={onChange} hint="h" allowSelectAll />);
    fireEvent.click(screen.getByRole('button'));
    expect(onChange).toHaveBeenCalledWith(candidates);
  });
});

describe('RelatedCaseList', () => {
  it('shows each chosen case in full, including the intraoperative diagnosis', () => {
    render(<RelatedCaseList cases={[{ ...candidates[0], intraoperativeDiagnosis: 'A: Malignant' }]} />);
    expect(screen.getByText('S26-a')).toBeTruthy();
    expect(screen.getByText('A: Malignant')).toBeTruthy();
    expect(screen.getByText('Dx a')).toBeTruthy();
  });
});
