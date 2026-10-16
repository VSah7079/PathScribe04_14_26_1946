// @vitest-environment happy-dom
// Batch 502 (PS-472): a render error never blanks the app.
import React, { useState } from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string, v?: Record<string, string>) => (v?.reference ? `${k}:${v.reference}` : k) }) }));
vi.mock('@/services/errorReporting/clientErrorReporterInstance', () => ({ clientErrorReporter: { report: vi.fn(() => 'ERR-TEST') } }));

import { ErrorBoundary } from './ErrorBoundary';
import { DirtyStateContext } from '@/contexts/DirtyStateContext';

let consoleError: ReturnType<typeof vi.spyOn>;
beforeEach(() => { consoleError = vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => { cleanup(); consoleError.mockRestore(); });

const Bomb: React.FC<{ explode: boolean; text?: string }> = ({ explode, text = 'fine' }) => {
  if (explode) throw new Error('boom for patient Jane Doe');
  return <div>{text}</div>;
};

describe('ErrorBoundary', () => {
  it('shows the recovery screen with the reference, not the error text', () => {
    const report = vi.fn(() => 'ERR-1');
    render(<ErrorBoundary scope="route" name="route" report={report}><Bomb explode /></ErrorBoundary>);
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('errorBoundary.title')).toBeTruthy();
    expect(screen.getByText('errorBoundary.reference:ERR-1')).toBeTruthy();
    expect(screen.getByText('errorBoundary.tryAgain')).toBeTruthy();
    expect(screen.getByText('errorBoundary.backToWorklist')).toBeTruthy();
    expect(document.body.textContent).not.toContain('Jane Doe');
    expect(report).toHaveBeenCalledWith(expect.any(Error), 'route');
  });

  it('never claims nothing was lost; says so firmly when there were unsaved changes', () => {
    render(<ErrorBoundary scope="route" name="route" report={() => 'R'}><Bomb explode /></ErrorBoundary>);
    expect(screen.getByText('errorBoundary.unsavedMaybeLost')).toBeTruthy();
    cleanup();
    render(
      <DirtyStateContext.Provider value={{ isDirty: true } as never}>
        <ErrorBoundary scope="route" name="route" report={() => 'R'}><Bomb explode /></ErrorBoundary>
      </DirtyStateContext.Provider>,
    );
    expect(screen.getByText('errorBoundary.unsavedLost')).toBeTruthy();
  });

  it('Try again renders the content again once it no longer throws', () => {
    const Harness = () => {
      const [explode, setExplode] = useState(true);
      return (
        <>
          <button onClick={() => setExplode(false)}>fix</button>
          <ErrorBoundary scope="route" name="route" report={() => 'R'}><Bomb explode={explode} /></ErrorBoundary>
        </>
      );
    };
    render(<Harness />);
    fireEvent.click(screen.getByText('fix'));
    fireEvent.click(screen.getByText('errorBoundary.tryAgain'));
    expect(screen.getByText('fine')).toBeTruthy();
  });

  it('a new address (resetKey) clears the error', () => {
    const { rerender } = render(<ErrorBoundary scope="route" name="route" resetKey="/a" report={() => 'R'}><Bomb explode /></ErrorBoundary>);
    rerender(<ErrorBoundary scope="route" name="route" resetKey="/b" report={() => 'R'}><Bomb explode={false} text="page b" /></ErrorBoundary>);
    expect(screen.getByText('page b')).toBeTruthy();
  });

  it('a panel crash stays in the panel: the rest of the page keeps rendering', () => {
    render(
      <div>
        <div>report text</div>
        <ErrorBoundary scope="panel" name="panel:organ-map" report={() => 'R'}><Bomb explode /></ErrorBoundary>
        <ErrorBoundary scope="panel" name="panel:synoptic" report={() => 'R'}><Bomb explode={false} text="synoptic ok" /></ErrorBoundary>
      </div>,
    );
    expect(screen.getByText('report text')).toBeTruthy();
    expect(screen.getByText('synoptic ok')).toBeTruthy();
    expect(screen.getByText('errorBoundary.panel.title')).toBeTruthy();
    expect(screen.queryByText('errorBoundary.backToWorklist')).toBeNull();
  });

  it('by default the crash goes to the app reporter', async () => {
    const { clientErrorReporter } = await import('@/services/errorReporting/clientErrorReporterInstance');
    render(<ErrorBoundary scope="app" name="app"><Bomb explode /></ErrorBoundary>);
    expect(clientErrorReporter.report).toHaveBeenCalledWith(expect.any(Error), 'render', 'app');
    expect(screen.getByText('errorBoundary.reference:ERR-TEST')).toBeTruthy();
  });
});
