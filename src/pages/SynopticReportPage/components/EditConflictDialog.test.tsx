// @vitest-environment happy-dom
// Batch 458 (PS-71): the Edit Conflict dialog.
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }) }));
vi.mock('@/components/Common/CapabilityButton', () => ({
  CapabilityButton: ({ children, onClick, capability, disabled }: { children: React.ReactNode; onClick: () => void; capability: string; disabled?: boolean }) =>
    <button type="button" data-capability={capability} onClick={onClick} disabled={disabled}>{children}</button>,
}));
import { EditConflictDialog } from './EditConflictDialog';

afterEach(cleanup);
const K = 'synopticReportPage.concurrency.';
const handlers = () => ({ onKeepWorking: vi.fn(), onViewChanges: vi.fn(), onUseTheirs: vi.fn(), onSaveMine: vi.fn() });

describe('EditConflictDialog', () => {
  it('offers keep working, view changes, use their version, and Save mine anyway behind its capability', () => {
    const h = handlers();
    render(<EditConflictDialog actualVersion={6} blockOverride={false} rows={null} {...h} />);
    fireEvent.click(screen.getByText(`${K}viewChanges`));
    fireEvent.click(screen.getByText(`${K}useTheirs`));
    const mine = screen.getByText(`${K}saveMine`);
    expect(mine.getAttribute('data-capability')).toBe('case:edit-conflict:override');
    fireEvent.click(mine);
    expect(h.onViewChanges).toHaveBeenCalled();
    expect(h.onUseTheirs).toHaveBeenCalled();
    expect(h.onSaveMine).toHaveBeenCalled();
  });

  it('a change to the finalized report allows only using their version', () => {
    render(<EditConflictDialog actualVersion={6} blockOverride rows={null} {...handlers()} />);
    expect(screen.queryByText(`${K}saveMine`)).toBeNull();
    expect(screen.getByText(`${K}useTheirs`)).toBeTruthy();
    expect(screen.getByText(new RegExp(`${K}finalizedBlocked`))).toBeTruthy();
  });

  it('View changes lists each differing part and whether saving yours replaces it', () => {
    render(<EditConflictDialog actualVersion={6} blockOverride={false} rows={[{ field: 'synopticReports', overwritten: true }, { field: 'participants', overwritten: false }]} {...handlers()} />);
    expect(screen.queryByText(`${K}viewChanges`)).toBeNull();
    const rows = screen.getAllByRole('row').slice(1).map(r => r.textContent);
    expect(rows).toEqual([`${K}parts.synopticReports${K}replacedByYours`, `${K}parts.participants${K}keptAsSaved`]);
  });

  it('Batch 577: every choice is disabled while their version is being read', () => {
    const h = handlers();
    render(<EditConflictDialog actualVersion={6} blockOverride={false} rows={null} busy {...h} />);
    const btn = screen.getByText(`${K}useTheirs`) as HTMLButtonElement;
    expect(btn.getAttribute('aria-busy')).toBe('true');
    for (const k of ['keepWorking', 'viewChanges', 'useTheirs', 'saveMine']) {
      const b = screen.getByText(`${K}${k}`) as HTMLButtonElement;
      expect(b.disabled, k).toBe(true);
      fireEvent.click(b);
    }
    expect(h.onUseTheirs).not.toHaveBeenCalled();
    expect(h.onKeepWorking).not.toHaveBeenCalled();
    expect(h.onSaveMine).not.toHaveBeenCalled();
  });
});
