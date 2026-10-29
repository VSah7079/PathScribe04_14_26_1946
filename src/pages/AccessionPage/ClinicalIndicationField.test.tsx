// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React, { useState } from 'react';
import ClinicalIndicationField from './ClinicalIndicationField';
import { importedClinicalIndication, type ImportedClinicalIndication } from '@/services/orderIntake/clinicalIndicationProvenance';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key) }),
}));
afterEach(cleanup);

const Harness: React.FC<{ imported: ImportedClinicalIndication | null; start: string }> = ({ imported, start }) => {
  const [v, setV] = useState(start);
  return <ClinicalIndicationField value={v} onChange={setV} imported={imported} />;
};
const box = () => screen.getByRole('textbox') as HTMLTextAreaElement;

describe('ClinicalIndicationField (Batch 714)', () => {
  const imported = importedClinicalIndication({ clinicalIndication: 'Lump right breast', clinicalIndicationSource: 'obr31' });
  it('shows where an imported indication came from', () => {
    render(<Harness imported={imported} start="Lump right breast" />);
    expect(box().value).toBe('Lump right breast');
    expect(screen.getByTestId('clinical-indication-note').textContent).toContain('note.fromOrder');
    expect(screen.getByTestId('clinical-indication-note').textContent).toContain('sources.obr31');
  });
  it('an edit changes the note to "edited from the order" and keeps the order text visible', () => {
    render(<Harness imported={imported} start="Lump right breast" />);
    fireEvent.change(box(), { target: { value: 'Lump right breast, 2 cm' } });
    const note = screen.getByTestId('clinical-indication-note').textContent!;
    expect(note).toContain('note.edited');
    expect(note).toContain('Lump right breast');
    expect(note).not.toContain('note.fromOrder"');
  });
  it('no note for a manual accession, typed or blank', () => {
    render(<Harness imported={null} start="" />);
    fireEvent.change(box(), { target: { value: 'Query melanoma' } });
    expect(screen.queryByTestId('clinical-indication-note')).toBeNull();
  });
  it('an order that did not name its field gets the plain note', () => {
    render(<Harness imported={importedClinicalIndication({ clinicalIndication: 'X' })} start="X" />);
    expect(screen.getByTestId('clinical-indication-note').textContent).toBe('accessionPage.clinicalIndication.note.fromOrderUnspecified');
  });
});
