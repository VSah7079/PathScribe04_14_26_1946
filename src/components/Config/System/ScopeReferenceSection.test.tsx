// @vitest-environment happy-dom
// Batch 612: Configuration → System → Scope reference.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
import ScopeReferenceSection from './ScopeReferenceSection';
import { SCOPE_REFERENCE } from '@/services/scopeReference/scopeReference';
afterEach(() => cleanup());

describe('ScopeReferenceSection', () => {
  it('lists every area with its scope and says unlisted areas are unchecked', () => {
    render(<ScopeReferenceSection />);
    for (const e of SCOPE_REFERENCE) {
      const row = screen.getByTestId(`scope-row-${e.id}`);
      expect(row.textContent).toContain(`scopeReference.scopes.${e.scope}`);
      expect(row.textContent).toContain(`scopeReference.entries.${e.id}.note`);
    }
    expect(screen.getByText('scopeReference.footer')).toBeTruthy();
  });
  it('explains enterprise, performing facility and ordering facility', () => {
    render(<ScopeReferenceSection />);
    for (const k of ['enterprise', 'facility', 'ordering']) expect(screen.getByText(`scopeReference.definitions.${k}Title`)).toBeTruthy();
  });
});
