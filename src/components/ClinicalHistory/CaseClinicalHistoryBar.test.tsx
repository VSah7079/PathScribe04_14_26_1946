// @vitest-environment happy-dom
// Batch 530 (Pete): the clinical history line on the report, Cytology Workspace and grossing screens.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key), i18n: { language: 'en' } }),
}));
vi.mock('@/components/Common/CapabilityButton', () => ({
  CapabilityButton: ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => <button onClick={onClick}>{children}</button>,
}));
vi.mock('@/services', () => ({
  clinicalHistoryAfterAccessionService: { record: vi.fn() },
  specimenDictionaryService: { getAll: vi.fn(async () => ({ ok: true, data: [] })) },
  caseSignedOut: (s?: string) => s === 'finalized',
}));
vi.mock('@/pages/AccessionPage/ClinicalHistory/ClinicalHistoryEntryPanel', () => ({ default: () => null }));
import { CaseClinicalHistoryBar } from './CaseClinicalHistoryBar';
import type { Case } from '@/types/case/Case';

afterEach(cleanup);
const c = (over: Record<string, unknown>) => ({ id: 'c1', status: 'gross-complete', specimens: [], order: {}, ...over }) as unknown as Case;

describe('CaseClinicalHistoryBar', () => {
  it('no clinical information: the same deferred notice for every specialty, and Add', () => {
    render(<CaseClinicalHistoryBar caseData={c({})} onSaved={vi.fn()} />);
    expect(screen.getByText('caseClinicalHistory.deferred')).toBeTruthy();
    expect(screen.getByText('caseClinicalHistory.add')).toBeTruthy();
  });
  it('coded entries: counted, and Edit', () => {
    render(<CaseClinicalHistoryBar caseData={c({ order: { clinicalHistory: [{ historyCode: 'SYM-01', categoryCode: 'SYM', metadata: {} }] } })} onSaved={vi.fn()} />);
    expect(screen.getByText('caseClinicalHistory.summary:{"count":1}')).toBeTruthy();
    expect(screen.getByText('caseClinicalHistory.edit')).toBeTruthy();
  });
  it('indication only: says so', () => {
    render(<CaseClinicalHistoryBar caseData={c({ order: { clinicalIndication: 'Polyp' } })} onSaved={vi.fn()} />);
    expect(screen.getByText('caseClinicalHistory.summaryNone')).toBeTruthy();
  });
  it('signed out: nothing (a change then needs an amendment)', () => {
    const { container } = render(<CaseClinicalHistoryBar caseData={c({ status: 'finalized' })} onSaved={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });
});
