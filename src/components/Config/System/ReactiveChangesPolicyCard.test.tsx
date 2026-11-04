// @vitest-environment happy-dom
import '@/i18n/config';
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import type { CytologyCategoryEntry } from '@/services/cytology/ICytologyCategoryService';

const update = vi.fn();
vi.mock('@/services', () => ({ cytologyCategoryService: { update: (...a: unknown[]) => update(...a) } }));
vi.mock('@/components/Common/CapabilityButton', () => ({
  CapabilityButton: ({ children, onClick, className }: { children: React.ReactNode; onClick: () => void; className: string }) =>
    <button className={className} onClick={onClick}>{children}</button>,
}));

import ReactiveChangesPolicyCard from './ReactiveChangesPolicyCard';

const cat = (id: string, requiresPathologistReview: boolean) =>
  ({ id, section: 'interpretation_result', requiresPathologistReview }) as CytologyCategoryEntry;
const entries = (on: boolean) => [
  cat('cyto-nonneo-reactive-inflammation', on), cat('cyto-nonneo-reactive-radiation', on), cat('cyto-nonneo-reactive-iud', on), cat('cyto-hsil', true),
];

beforeEach(() => { update.mockReset(); update.mockResolvedValue({ ok: true, data: {} }); });
afterEach(cleanup);

describe('ReactiveChangesPolicyCard (PS-163)', () => {
  it('says a cytotechnologist may sign out by default and offers the other choice only', () => {
    render(<ReactiveChangesPolicyCard entries={entries(false)} onChanged={() => {}} />);
    expect(screen.getByRole('status').textContent).toMatch(/cytotechnologist may sign/);
    expect(screen.queryByText('Let a cytotechnologist sign out')).toBeNull();
    expect(screen.getByText('Require a pathologist')).toBeTruthy();
  });

  it('requiring a pathologist updates the three reactive categories and nothing else, then refreshes', async () => {
    const onChanged = vi.fn();
    render(<ReactiveChangesPolicyCard entries={entries(false)} onChanged={onChanged} />);
    fireEvent.click(screen.getByText('Require a pathologist'));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(update.mock.calls.map(c => c[0]).sort()).toEqual(
      ['cyto-nonneo-reactive-inflammation', 'cyto-nonneo-reactive-iud', 'cyto-nonneo-reactive-radiation']);
    expect(update.mock.calls.every(c => c[1].requiresPathologistReview === true)).toBe(true);
  });

  it('shows a message when a change is refused', async () => {
    update.mockResolvedValue({ ok: false, error: 'refused' });
    render(<ReactiveChangesPolicyCard entries={entries(true)} onChanged={() => {}} />);
    fireEvent.click(screen.getByText('Let a cytotechnologist sign out'));
    expect((await screen.findByRole('alert')).textContent).toMatch(/could not be changed/);
  });

  it('shows nothing when the lab has no reactive-change categories', () => {
    const { container } = render(<ReactiveChangesPolicyCard entries={[cat('cyto-hsil', true)]} onChanged={() => {}} />);
    expect(container.textContent).toBe('');
  });
});
