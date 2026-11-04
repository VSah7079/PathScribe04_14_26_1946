// @vitest-environment happy-dom
// Batch 610 (#163): the Jurisdiction overview is read-only: one table per
// country with a Change link to each setting's own screen.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
vi.mock('react-i18next', () => ({ initReactI18next: { type: '3rdParty', init: () => {} }, useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }) }));
import JurisdictionOverviewSection from './JurisdictionOverviewSection';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('JurisdictionOverviewSection (#163)', () => {
  it('shows each setting row with a Change link and edits nothing itself', async () => {
    const { container } = render(<MemoryRouter><JurisdictionOverviewSection /></MemoryRouter>);
    expect(await screen.findAllByText('jurisdictionOverviewSection.rows.signing')).not.toHaveLength(0);
    expect(screen.getByText('jurisdictionOverviewSection.readOnly')).toBeTruthy();
    expect(container.querySelectorAll('a').length).toBeGreaterThan(0);
    expect(container.querySelector('input, select, button')).toBeNull();
  });
});
