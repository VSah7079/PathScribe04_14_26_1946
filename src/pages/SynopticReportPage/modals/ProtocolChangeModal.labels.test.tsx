// @vitest-environment happy-dom
// src/pages/SynopticReportPage/modals/ProtocolChangeModal.labels.test.tsx
// Batch 567 (WCAG 4.1.2, axe nested-interactive): each proposed change, and "Select all", was a button holding a
// checkbox. Each is now its checkbox's label: clicking anywhere on it ticks the box, and there is one control.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key), i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

import { ProtocolChangeModal } from './ProtocolChangeModal';

const change = (id: string, label: string) => ({
  id, specimenId: `sp-${id}`, specimenLabel: label, specimenDesc: 'Colon biopsy', action: 'replace' as const,
  currentTemplateName: 'Colon resection', proposedTemplateName: 'Colon biopsy', reason: 'Biopsy, not resection', confidence: 90,
});
afterEach(cleanup);

describe('ProtocolChangeModal (Batch 567)', () => {
  it('a change row is the label of its checkbox: clicking its text ticks and unticks it; nothing is a button around it', () => {
    const onCommit = vi.fn();
    render(<ProtocolChangeModal show changes={[change('c1', 'A'), change('c2', 'B')] as any} onCommit={onCommit} onCancel={() => {}} />);
    const boxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    expect(boxes).toHaveLength(3); // Select all + two changes
    expect(boxes.every(b => !b.closest('[role="button"]'))).toBe(true);
    expect(boxes.every(b => b.closest('label'))).toBe(true);
    expect(boxes[1].checked).toBe(true);
    fireEvent.click(screen.getByText('A'));
    expect(boxes[1].checked).toBe(false);
    fireEvent.click(screen.getByText('A'));
    expect(boxes[1].checked).toBe(true);
    // Named by the specimen and the proposed template, described by the reason.
    expect(boxes[1].getAttribute('aria-labelledby')).toBe('ps-proto-c1-specimen ps-proto-c1-proposed');
    expect(document.getElementById('ps-proto-c1-proposed')?.textContent).toBe('Colon biopsy');
    expect(document.getElementById(boxes[1].getAttribute('aria-describedby')!)?.textContent).toContain('Biopsy, not resection');
    // Only phrasing content inside the label.
    expect(boxes[1].closest('label')!.querySelector('div, p')).toBeNull();
  });
  it('"Select all" is the label of its checkbox', () => {
    render(<ProtocolChangeModal show changes={[change('c1', 'A')] as any} onCommit={() => {}} onCancel={() => {}} />);
    const boxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    fireEvent.click(screen.getByText('protocolChangeModal.deselectAll'));
    expect(boxes.every(b => !b.checked)).toBe(true);
    expect(screen.getByRole('button', { name: 'common.close' })).toBeTruthy();
  });
});
