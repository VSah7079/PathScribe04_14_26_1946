// @vitest-environment happy-dom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

const executeAction = vi.fn();
const ACTIONS = [
  { id: 'OPEN_CONFIGURATION', category: 'NAVIGATION', label: 'Open Configuration', shortcut: 'Alt+C', isActive: true },
  { id: 'COMP_ORDER_PLACE', category: 'SYNOPTIC', label: 'Place Computational Orders', shortcut: 'Alt+C', isActive: true },
];
vi.mock('@/services', () => ({
  actionRegistryService: {
    getEligibleActions: () => ACTIONS,
    getActionById: (id: string) => ACTIONS.find(a => a.id === id),
    executeAction: (a: unknown) => executeAction(a),
  },
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

import { GoToPrefix } from './GoToPrefix';

const press = (init: KeyboardEventInit) => act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })); });
const prefix = () => press({ key: 'j', code: 'KeyJ', altKey: true });

describe('GoToPrefix', () => {
  beforeEach(() => { vi.useFakeTimers(); executeAction.mockClear(); });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it('shows nothing until Alt+J, then lists the always-on commands only', () => {
    render(<GoToPrefix />);
    expect(screen.queryByRole('status')).toBeNull();
    prefix();
    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.getByText('Open Configuration')).toBeTruthy();
    expect(screen.queryByText('Place Computational Orders')).toBeNull();
  });
  it('runs the always-on command on its key and closes, running nothing on the screen', () => {
    render(<GoToPrefix />);
    prefix();
    press({ key: 'c', code: 'KeyC' });
    expect(executeAction).toHaveBeenCalledTimes(1);
    expect(executeAction.mock.calls[0][0]).toMatchObject({ id: 'OPEN_CONFIGURATION' });
    expect(screen.queryByRole('status')).toBeNull();
  });
  it('Escape closes it and runs nothing', () => {
    render(<GoToPrefix />);
    prefix();
    press({ key: 'Escape', code: 'Escape' });
    expect(screen.queryByRole('status')).toBeNull();
    expect(executeAction).not.toHaveBeenCalled();
  });
  it('a key that is not on the list closes it and runs nothing', () => {
    render(<GoToPrefix />);
    prefix();
    press({ key: 'z', code: 'KeyZ' });
    expect(screen.queryByRole('status')).toBeNull();
    expect(executeAction).not.toHaveBeenCalled();
  });
  it('a click away closes it and runs nothing', () => {
    render(<GoToPrefix />);
    prefix();
    fireEvent.mouseDown(screen.getByTestId('goto-backdrop'));
    expect(screen.queryByRole('status')).toBeNull();
    expect(executeAction).not.toHaveBeenCalled();
  });
  it('closes by itself after three seconds', () => {
    render(<GoToPrefix />);
    prefix();
    act(() => { vi.advanceTimersByTime(2900); });
    expect(screen.getByRole('status')).toBeTruthy();
    act(() => { vi.advanceTimersByTime(200); });
    expect(screen.queryByRole('status')).toBeNull();
    expect(executeAction).not.toHaveBeenCalled();
  });
  it('a modifier on its own keeps it open', () => {
    render(<GoToPrefix />);
    prefix();
    press({ key: 'Shift', code: 'ShiftLeft', shiftKey: true });
    expect(screen.getByRole('status')).toBeTruthy();
  });
  it('a key pressed after it closed does nothing', () => {
    render(<GoToPrefix />);
    prefix();
    press({ key: 'Escape' });
    press({ key: 'c', code: 'KeyC' });
    expect(executeAction).not.toHaveBeenCalled();
  });
});
