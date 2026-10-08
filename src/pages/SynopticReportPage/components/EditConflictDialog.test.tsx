// @vitest-environment happy-dom
// Batch 458 (PS-71): the Edit Conflict dialog.
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }) }));
vi.mock('@/components/Common/CapabilityButton', () => ({
  CapabilityButton: ({ children, onClick, capability }: { children: React.ReactNode; onClick: () => void; capability: string }) =>
    <button type="button" data-capability={capability} onClick={onClick}>{children}</button>,
}));
import { EditConflictDialog } from './EditConflictDialog';

afterEach(cleanup);
const K = 'synopticReportPage.concurrency.';
const handlers = () => ({ onKeepWorking: vi.fn(), onViewChanges: vi.fn(), onReload: vi.fn(), onSaveMine: vi.fn() });

describe('EditConflictDialog', () => {
  it('offers keep working, view changes, reload, and Save mine anyway behind its capability', () => {
    const h = handlers();
    render(<EditConflictDialog actualVersion={6} blockOverride={false} rows={null} {...h} />);
    fireEvent.click(screen.getByText(`${K}viewChanges`));
    fireEvent.click(screen.getByText(`${K}reload`));
    const mine = screen.getByText(`${K}saveMine`);
    expect(mine.getAttribute('data-capability')).toBe('case:edit-conflict:override');
    fireEvent.click(mine);
    expect(h.onViewChanges).toHaveBeenCalled();
    expect(h.onReload).toHaveBeenCalled();
    expect(h.onSaveMine).toHaveBeenCalled();
  });

  it('a change to the finalized report allows only reloading', () => {
    render(<EditConflictDialog actualVersion={6} blockOverride rows={null} {...handlers()} />);
    expect(screen.queryByText(`${K}saveMine`)).toBeNull();
    expect(screen.getByText(new RegExp(`${K}finalizedBlocked`))).toBeTruthy();
  });

  it('View changes lists each differing part and whether saving yours replaces it', () => {
    render(<EditConflictDialog actualVersion={6} blockOverride={false} rows={[{ field: 'synopticReports', overwritten: true }, { field: 'participants', overwritten: false }]} {...handlers()} />);
    expect(screen.queryByText(`${K}viewChanges`)).toBeNull();
    const rows = screen.getAllByRole('row').slice(1).map(r => r.textContent);
    expect(rows).toEqual([`${K}parts.synopticReports${K}replacedByYours`, `${K}parts.participants${K}keptAsSaved`]);
  });
});
