// @vitest-environment happy-dom
// Batch 639: Discard Unsaved Changes asks first; only a yes goes ahead.
import { describe, it, expect, vi } from 'vitest';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { useDiscardChangesConfirm } from './useDiscardChangesConfirm';

let ask!: () => Promise<boolean>;
const Host: React.FC = () => { const d = useDiscardChangesConfirm(); ask = d.ask; return <>{d.modal}</>; };

describe('useDiscardChangesConfirm', () => {
  it('shows nothing until asked, resolves true on Discard Changes and false on Keep Editing', async () => {
    render(<Host />);
    expect(screen.queryByRole('button')).toBeNull();
    let result: Promise<boolean>;
    act(() => { result = ask(); });
    const discard = await screen.findByText(/discardButton/);
    await act(async () => { discard.click(); });
    expect(await result!).toBe(true);
    expect(screen.queryByText(/discardButton/)).toBeNull();
    act(() => { result = ask(); });
    const keep = await screen.findByText(/keepEditingButton/);
    await act(async () => { keep.click(); });
    expect(await result!).toBe(false);
  });
});
