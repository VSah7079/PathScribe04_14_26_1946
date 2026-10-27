// @vitest-environment happy-dom
// src/components/Help/TopBarHelpButtons.test.tsx — Batch 668
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import TopBarHelpButtons from './TopBarHelpButtons';
import { OPEN_USER_GUIDE_EVENT } from '@/services/help/helpTargets';

import { usePublishHelpAnchor } from '@/hooks/usePublishHelpAnchor';
const Publisher = () => { usePublishHelpAnchor('screen-printer_profiles'); return null; };
const at = (url: string) => render(<MemoryRouter initialEntries={[url]}><TopBarHelpButtons /></MemoryRouter>);

describe('TopBarHelpButtons', () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('shows the User Guide button alone on a screen that has only an article', () => {
    at('/worklist');
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('data-guide-slug')).toBe('worklist');
  });
  it('shows both buttons on a screen with an Administrator Guide section too', () => {
    at('/lockbox-drop-off');
    expect(screen.getAllByRole('link')).toHaveLength(2);
    expect(document.querySelector('[data-guide-anchor="screen-lockbox-drop-off"]')).not.toBeNull();
  });
  it('shows the User Guide contents button on a screen with no article, so Help is always there', () => {
    at('/some-screen-without-an-article');
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe('/help');
  });
  it('on Configuration the book opens the Administrator Guide at the section the page published', () => {
    const { unmount } = render(<MemoryRouter initialEntries={['/configuration?tab=system']}><Publisher /><TopBarHelpButtons /></MemoryRouter>);
    expect(document.querySelector('[data-guide-anchor="screen-printer_profiles"]')).not.toBeNull();
    expect(screen.getAllByRole('link')).toHaveLength(2);
    unmount();
    at('/worklist');
    expect(document.querySelector('[data-guide-anchor]')).toBeNull();
  });
  it('a plain click opens the guide in a named window, not a tab', async () => {
    const win = { closed: false, focus: vi.fn(), screenX: 0, screenY: 0, outerWidth: 1000, outerHeight: 800 } as unknown as Window;
    const open = vi.spyOn(window, 'open').mockReturnValue(win);
    at('/worklist');
    fireEvent.click(screen.getByRole('link'));
    await waitFor(() => expect(open).toHaveBeenCalled());
    expect(open.mock.calls[0][0]).toBe('/help/worklist');
    expect(open.mock.calls[0][1]).toBe('PathScribeUserGuide');
  });
  it('falls back to a new tab when the window is refused', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValueOnce(null).mockReturnValue(null);
    at('/worklist');
    fireEvent.click(screen.getByRole('link'));
    await waitFor(() => expect(open).toHaveBeenCalledTimes(2));
    expect(open.mock.calls[1][1]).toBe('_blank');
  });
  it('the F1 action opens the User Guide the same way', async () => {
    const win = { closed: false, focus: vi.fn(), screenX: 0, screenY: 0, outerWidth: 1000, outerHeight: 800 } as unknown as Window;
    const open = vi.spyOn(window, 'open').mockReturnValue(win);
    at('/worklist');
    window.dispatchEvent(new CustomEvent(OPEN_USER_GUIDE_EVENT));
    await waitFor(() => expect(open).toHaveBeenCalled());
    expect(open.mock.calls[0][0]).toBe('/help/worklist');
  });
});
