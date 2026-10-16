// @vitest-environment happy-dom
// src/components/Printing/PrintDestinationFields.test.tsx (Batch 553)
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('react-router', () => ({ Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));
const hook = vi.hoisted(() => ({ useAgentPrinters: vi.fn() }));
vi.mock('@/hooks/useAgentPrinters', () => hook);

import { PrintDestinationFields } from './PrintDestinationFields';
import { printDestinationDraft } from '@/services/printRouting/printDestinationRules';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('PrintDestinationFields', () => {
  it('a printer no longer on the site\'s list is still shown, with a warning', () => {
    hook.useAgentPrinters.mockReturnValue({ printers: [{ destinationId: 'rep-1', label: 'Front desk' }], loading: false, error: null });
    const draft = printDestinationDraft({ agentPrinter: { siteId: 'S1', destinationId: 'gone' }, displayName: 'Old desk' });
    render(<PrintDestinationFields draft={draft} onChange={() => undefined} purpose="routing" siteLocked />);
    expect((screen.getByLabelText('printDestination.printer') as HTMLSelectElement).value).toBe('gone');
    expect(screen.getByText('Old desk')).toBeTruthy();
    expect(screen.getByText('printDestination.printerNotListed')).toBeTruthy();
  });

  it('says when the person may not see the site\'s printers', () => {
    hook.useAgentPrinters.mockReturnValue({ printers: [], loading: false, error: 'NOT_PERMITTED' });
    render(<PrintDestinationFields draft={printDestinationDraft(undefined, 'S1')} onChange={() => undefined} purpose="redirect" siteLocked />);
    expect(screen.getByText('printDestination.printersNotPermitted')).toBeTruthy();
    expect(screen.queryByText('printDestination.noPrinters')).toBeNull();
  });

  it('with jobs from several labs, only a printer address is offered', () => {
    hook.useAgentPrinters.mockReturnValue({ printers: [], loading: false, error: null });
    render(<PrintDestinationFields draft={printDestinationDraft(undefined, '')} onChange={() => undefined} purpose="redirect" siteLocked agentAllowed={false} />);
    expect(screen.getByText('printDestination.agentNeedsOneSite')).toBeTruthy();
    expect(screen.queryByLabelText('printDestination.kind')).toBeNull();
    expect(screen.getByLabelText('printDestination.address')).toBeTruthy();
    expect(hook.useAgentPrinters).toHaveBeenCalledWith(null, 'redirect');
  });
});
