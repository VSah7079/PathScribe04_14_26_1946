// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }), initReactI18next: { type: '3rdParty', init: () => {} } }));
import { Opcs4Notice } from './Opcs4Notice';
import { CaseCodingDisplay } from './CaseCodingDisplay';

afterEach(cleanup);

describe('Opcs4Notice', () => {
  it('shows the licence notice and a labelled read-only sample', () => {
    render(<Opcs4Notice />);
    expect(screen.getByText('opcs4Notice.title')).toBeTruthy();
    expect(screen.getByText('opcs4Notice.simulated')).toBeTruthy();
    expect(screen.getByTestId('opcs4-sample').querySelectorAll('li').length).toBeGreaterThan(0);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});

describe('CaseCodingDisplay', () => {
  it('shows system, release, source, AI detail and the labelled simulated map', () => {
    render(<CaseCodingDisplay entries={[
      { system: 'ICD10', release: 'ICD-10-CM', code: 'C50.9', source: 'ai', ai: { model: 'm', confidence: 0.8 } },
    ]} />);
    expect(screen.getAllByText('C50.9').length).toBe(2);
    expect(screen.getByText('caseCoding.source.ai')).toBeTruthy();
    expect(screen.getByText('caseCoding.sideBySide.simulated')).toBeTruthy();
    expect(screen.getByText('caseCoding.sideBySide.suggested')).toBeTruthy();
  });
});
