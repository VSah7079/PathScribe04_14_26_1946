// @vitest-environment happy-dom
// Batch 621: the panel beside a historical report: hidden when off, labelled, advisory, flaggable, fixed messages for failures.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

const rt = vi.hoisted(() => ({
  loadStoredHistoryExtraction: vi.fn(),
  startHistoryExtraction: vi.fn(),
  flagHistoryExtractionWrong: vi.fn(async () => true),
}));
vi.mock('@/services/historyExtraction/historyExtractionRuntime', () => rt);
vi.mock('@/components/Common/CapabilityButton', () => ({
  CapabilityButton: ({ children, onClick, disabled, capability }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; capability: string }) =>
    <button data-capability={capability} disabled={disabled} onClick={onClick}>{children}</button>,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o ? `${k}${JSON.stringify(o)}` : k), i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
import { HistoryExtractionPanel } from './HistoryExtractionPanel';

const item = { id: 'S26-1', diagnosis: 'Invasive ductal carcinoma', microscopic: 'Grade 2.', facilityId: 'fac-a' };
const done = {
  sourceCaseId: 'S26-1', sourceTextHash: 'h1', status: 'extracted' as const, templateId: 'breast', templateName: 'Breast invasive', templateVersion: '2.1.0',
  fields: [{ fieldId: 'grade', label: 'Grade', value: 'g2', display: 'Grade 2', confidence: 90 }], extractedAt: 't', verification: 'ai-unverified' as const,
  aiService: { provider: 'anthropic', model: 'claude-x' },
};
const S = 'historyExtraction';
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('HistoryExtractionPanel', () => {
  it('shows nothing when the setting is off or the user may not', async () => {
    rt.loadStoredHistoryExtraction.mockResolvedValue({ state: 'off' });
    render(<HistoryExtractionPanel item={item} userName="Dr A" />);
    await waitFor(() => expect(rt.loadStoredHistoryExtraction).toHaveBeenCalled());
    expect(screen.queryByTestId('history-extraction-panel')).toBeNull();
    expect(rt.startHistoryExtraction).not.toHaveBeenCalled();
  });
  it('shows the stored result at once, then the new one, always labelled AI-extracted and advisory', async () => {
    rt.loadStoredHistoryExtraction.mockResolvedValue({ state: 'ready', extraction: done, ran: false });
    rt.startHistoryExtraction.mockResolvedValue({ state: 'ready', extraction: done, ran: false });
    render(<HistoryExtractionPanel item={item} userName="Dr A" />);
    await screen.findByText(`${S}.aiLabel`);
    await screen.findByText('Grade 2');
    expect(screen.getByText(`${S}.advisory`)).toBeTruthy();
    expect(document.body.textContent).toContain(`${S}.template{"name":"Breast invasive","version":"2.1.0"}`);
    expect(document.body.textContent).toContain(`${S}.service{"provider":"anthropic","model":"claude-x"}`);
    expect(screen.getByText('Grade 2').getAttribute('data-phi')).toBe('diagnosis');
    expect(rt.startHistoryExtraction).toHaveBeenCalledWith({ sourceCaseId: 'S26-1', facilityId: 'fac-a', text: { diagnosis: item.diagnosis, microscopic: item.microscopic } }, 'Dr A');
  });
  it('flags one field, and the whole extraction, as wrong behind the flag capability', async () => {
    rt.loadStoredHistoryExtraction.mockResolvedValue({ state: 'none' });
    rt.startHistoryExtraction.mockResolvedValue({ state: 'ready', extraction: done, ran: true });
    render(<HistoryExtractionPanel item={item} userName="Dr A" />);
    const flagField = await screen.findByText(`${S}.flagField`);
    expect(flagField.getAttribute('data-capability')).toBe('ai:history-extraction:flag');
    fireEvent.click(flagField);
    await waitFor(() => expect(rt.flagHistoryExtractionWrong).toHaveBeenCalledWith({ sourceCaseId: 'S26-1', fieldId: 'grade', templateId: 'breast', sourceTextHash: 'h1', userName: 'Dr A' }));
    await screen.findAllByText(`${S}.flagged`);
    fireEvent.click(screen.getByText(`${S}.flagAll`));
    await waitFor(() => expect(rt.flagHistoryExtractionWrong).toHaveBeenLastCalledWith(expect.objectContaining({ fieldId: null })));
  });
  it('says so when a flag could not be recorded', async () => {
    rt.loadStoredHistoryExtraction.mockResolvedValue({ state: 'none' });
    rt.startHistoryExtraction.mockResolvedValue({ state: 'ready', extraction: done, ran: true });
    rt.flagHistoryExtractionWrong.mockResolvedValueOnce(false);
    render(<HistoryExtractionPanel item={item} userName="Dr A" />);
    fireEvent.click(await screen.findByText(`${S}.flagField`));
    await screen.findByText(`${S}.refused`);
  });
  it('shows the fixed message for a failure, and "check again" runs it again', async () => {
    const failed = { ...done, status: 'failed' as const, failure: 'vendorNotAllowed' as const, fields: [] };
    rt.loadStoredHistoryExtraction.mockResolvedValue({ state: 'none' });
    rt.startHistoryExtraction.mockResolvedValue({ state: 'ready', extraction: failed, ran: true });
    render(<HistoryExtractionPanel item={item} userName="Dr A" />);
    await screen.findByText(`${S}.status.failed.vendorNotAllowed`);
    fireEvent.click(screen.getByText(`${S}.refresh`));
    await waitFor(() => expect(rt.startHistoryExtraction).toHaveBeenCalledTimes(2));
  });
  it('says when no template fits or there is no text', async () => {
    rt.loadStoredHistoryExtraction.mockResolvedValue({ state: 'none' });
    rt.startHistoryExtraction.mockResolvedValue({ state: 'ready', extraction: { ...done, status: 'noTemplate', fields: [] }, ran: true });
    render(<HistoryExtractionPanel item={item} userName="Dr A" />);
    await screen.findByText(`${S}.status.noTemplate`);
  });
});
