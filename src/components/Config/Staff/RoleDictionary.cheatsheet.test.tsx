// @vitest-environment happy-dom
//
// Batch 614: the action reference (cheat sheet) lists the always-on commands too, each with the Alt+J route that
// reaches it even when a screen uses the same key. Before, only Worklist and Synoptic Report commands were listed.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

vi.mock('react-i18next', async (orig) => ({
  ...(await orig<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (key: string, o?: Record<string, unknown>) => (o ? `${key} ${JSON.stringify(o)}` : key), i18n: { language: 'en' } }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', role: 'admin', capabilities: ['*'] }, hasCapability: () => true }) }));

import RoleDictionary from './RoleDictionary';

afterEach(() => cleanup());

describe('RoleDictionary action reference', () => {
  it('lists an always-on command with its Alt+J route and a screen command without one', async () => {
    render(<RoleDictionary />);
    fireEvent.click((await screen.findAllByText('common.edit'))[0]);
    fireEvent.click(await screen.findByText('roleDictionary.tabs.actionReference'));
    const routes = await waitFor(() => {
      const found = screen.getAllByTestId('cheat-goto-route');
      expect(found.length).toBeGreaterThan(10);
      return found;
    });
    expect(routes.some(r => r.textContent?.includes('"key":"C"'))).toBe(true);
    // Every route row belongs to an always-on command; a screen command (Bold) has none.
    const bold = screen.getByText('Bold').closest('.ps-rd-cheat-item') as HTMLElement;
    expect(bold.querySelector('[data-testid="cheat-goto-route"]')).toBeNull();
    expect(bold.textContent).toContain('Ctrl+Alt+1');
  });
});
