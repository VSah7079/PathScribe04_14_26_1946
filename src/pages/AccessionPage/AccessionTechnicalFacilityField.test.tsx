// @vitest-environment happy-dom
import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import AccessionTechnicalFacilityField from './AccessionTechnicalFacilityField';
import type { Facility } from '@/services/facilities/IFacilityService';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const fac = (id: string, over: Partial<Facility> = {}): Facility => ({ id, name: `Lab ${id}`, roles: ['performing_lab'], status: 'Active', ...over } as Facility);

afterEach(cleanup);

describe('AccessionTechnicalFacilityField (Batch 618, PS-336)', () => {
  it('lists performing labs only, with a none choice', () => {
    render(<AccessionTechnicalFacilityField facilities={[fac('a'), fac('b', { roles: ['client'] as never })]} value="" onChange={() => {}} intakeType="outside" />);
    expect(screen.getByRole('option', { name: 'Lab a' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: 'Lab b' })).toBeNull();
    expect(screen.getByRole('option', { name: 'accessionPage.technicalFacility.none' })).toBeTruthy();
  });
  it('reports the chosen lab', () => {
    const onChange = vi.fn();
    render(<AccessionTechnicalFacilityField facilities={[fac('a')]} value="" onChange={onChange} intakeType="outside" />);
    fireEvent.change(screen.getByLabelText('accessionPage.technicalFacility.label'), { target: { value: 'a' } });
    expect(onChange).toHaveBeenCalledWith('a');
  });
  it('shows nothing for an ordinary surgical case, and shows for a consultation', () => {
    const { container, rerender } = render(<AccessionTechnicalFacilityField facilities={[fac('a')]} value="" onChange={() => {}} intakeType="standard" departmentName="Surgical Tissue" />);
    expect(container.innerHTML).toBe('');
    rerender(<AccessionTechnicalFacilityField facilities={[fac('a')]} value="" onChange={() => {}} intakeType="standard" departmentName="Histology-Only / Consultation" />);
    expect(screen.getByLabelText('accessionPage.technicalFacility.label')).toBeTruthy();
  });
});
