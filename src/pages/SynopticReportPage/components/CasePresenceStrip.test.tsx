// @vitest-environment happy-dom
// src/pages/SynopticReportPage/components/CasePresenceStrip.test.tsx — Batch 573.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, o?: Record<string, unknown>) => (o ? `${key}:${JSON.stringify(o)}` : key), i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

import { CasePresenceStrip } from './CasePresenceStrip';
afterEach(cleanup);

const viewer = (over: Record<string, unknown>) => ({ presenceId: 'b', userId: 'u2', name: 'Dr Ben Ito', editing: false, since: '2026-10-15T15:00:00Z', self: false, ...over });

describe('CasePresenceStrip', () => {
  it('nobody else: only an empty polite region, no list', () => {
    render(<CasePresenceStrip presence={{ others: [], change: null }} />);
    expect(screen.getByRole('status').textContent).toBe('');
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('names, editing or viewing, contact links; the same person elsewhere as "you, in another window" without contact links', async () => {
    render(<CasePresenceStrip
      presence={{ others: [viewer({ editing: true, email: 'ben@lab.org', phone: '555-0100' }), viewer({ presenceId: 'mine2', userId: 'me', name: 'Dr Me', email: 'me@lab.org', self: true })], change: { kind: 'editing', name: 'Dr Ben Ito', self: false, seq: 1 } }}
      />);
    const items = screen.getAllByRole('listitem');
    expect(items[0].textContent).toContain('Dr Ben Ito');
    expect(items[0].textContent).toContain('synopticReportPage.presence.editing');
    expect(items[0].querySelector('a[href="mailto:ben%40lab.org"]')).toBeTruthy();
    expect(items[0].querySelector('a[href="tel:555-0100"]')).toBeTruthy();
    expect(items[1].textContent).toContain('synopticReportPage.presence.youElsewhere');
    expect(items[1].textContent).toContain('synopticReportPage.presence.viewing');
    expect(items[1].querySelector('a')).toBeNull();
    // The announcement is in the live region; the list itself is not live.
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('synopticReportPage.presence.announce.editing:{"name":"Dr Ben Ito"}'));
    expect(screen.getByRole('list').closest('[aria-live]')).toBeNull();
  });

  it('a change about the same person elsewhere uses the "you" wording', async () => {
    render(<CasePresenceStrip presence={{ others: [viewer({ userId: 'me', self: true })], change: { kind: 'joined', name: 'Dr Me', self: true, seq: 1 } }} />);
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('synopticReportPage.presence.announce.joinedSelf'));
  });

  it('the same words again (a new change) are emptied and said again', async () => {
    const p = { others: [viewer({ editing: true })], change: { kind: 'editing' as const, name: 'Dr Ben Ito', self: false, seq: 1 } };
    const { rerender } = render(<CasePresenceStrip presence={p} />);
    await waitFor(() => expect(screen.getByRole('status').textContent).not.toBe(''));
    rerender(<CasePresenceStrip presence={{ ...p, change: { ...p.change, seq: 2 } }} />);
    expect(screen.getByRole('status').textContent).toBe('');
    await waitFor(() => expect(screen.getByRole('status').textContent).not.toBe(''));
  });
});
