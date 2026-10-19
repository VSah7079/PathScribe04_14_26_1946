// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, o?: { systems?: string; count?: number; defaultValue?: string }) => (k === 'codeSystemsPolicy.offNote' ? `off:${o?.count}:${o?.systems}` : (o?.defaultValue ?? k)) }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

import { CodeSystemOffNote } from './CodeSystemOffNote';

afterEach(cleanup);

describe('CodeSystemOffNote', () => {
  it('says which systems the Code Systems setting has switched off', () => {
    render(<CodeSystemOffNote systems={['SNOMED', 'CPT']} />);
    expect(screen.getByTestId('code-system-off-note').textContent).toBe('off:2:SNOMED, CPT');
  });
  it('shows nothing when no system is off', () => {
    render(<CodeSystemOffNote systems={[]} />);
    expect(screen.queryByTestId('code-system-off-note')).toBeNull();
  });
});
