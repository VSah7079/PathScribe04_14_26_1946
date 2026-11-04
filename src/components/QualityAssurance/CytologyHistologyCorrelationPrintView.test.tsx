// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
vi.mock('@/services', () => ({ recordDocumentOutput: vi.fn(), DOCUMENT_DESTINATION: { browserPrintDialog: 'browser-print-dialog' } }));

import { CytologyHistologyCorrelationPrintView } from './CytologyHistologyCorrelationPrintView';

const report = {
  rows: [{
    patientMrn: 'MRN-98765', cytoAccessionId: 'C-1', cytoDate: '2026-01-02', cytoDiagnosis: 'HSIL',
    histAccessionId: 'H-1', histDate: '2026-01-10', histDiagnosis: 'CIN3', daysToBiopsy: 8,
    correlationCategory: 'concordant' as const, recordedAt: '2026-01-11',
  }],
  totalCorrelated: 1, concordantCount: 1, correlationRatePercent: 100, ppvHsilPercent: 100,
};

describe('CytologyHistologyCorrelationPrintView', () => {
  it('prints accession numbers but no MRN, matching the download rule', () => {
    render(<CytologyHistologyCorrelationPrintView report={report} scopeLabel="All" onClose={() => {}} />);
    expect(screen.getByText('C-1')).toBeTruthy();
    expect(screen.queryByText('MRN-98765')).toBeNull();
    expect(screen.queryByText('cytologyQaTab.histologyTable.patientMrn')).toBeNull();
    expect(document.querySelectorAll('thead th').length).toBe(8);
  });
});
