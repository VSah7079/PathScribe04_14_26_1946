// @vitest-environment happy-dom
//
// src/components/Config/System/OrganMapsSection.guard.test.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 499 (PS-479): switching level, template, map type or tab in
// Configuration → Organ maps starts a new draft, so each switch goes through
// the Configuration page's navigation guard (ConfigurationPage asks "Discard
// changes?" when anything is unsaved). Before this, the switch ran at once
// and unsaved edits were dropped silently.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, render, screen, cleanup, fireEvent } from '@testing-library/react';
import { ConfigDirtyGuardContext } from '../configDirtyGuardContext';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', name: 'Tester' } }) }));
vi.mock('@/components/Common/CapabilityButton', () => ({
  CapabilityButton: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) =>
    <button type="button" onClick={onClick} disabled={disabled}>{children}</button>,
}));
vi.mock('@/hooks/useOrganMapConfig', () => ({
  useOrganMapConfig: () => ({
    layers: {}, bindings: {}, loaded: true,
    facilities: [{ id: 'f1', name: 'Facility One', jurisdiction: 'US' }],
    templates: [{ id: 't1', name: 'Template One' }],
    // Batch 516: a minimal template, so the Bindings tab shows its map-type picker.
    saveLayer: vi.fn(), saveBinding: vi.fn(), loadTemplate: vi.fn(async () => ({ id: 't1', name: 'Template One', sections: [] })),
  }),
}));

import OrganMapsSection from './OrganMapsSection';

afterEach(cleanup);

/** A guard that holds the action, as ConfigurationPage does while its "Discard changes?" dialog is open. */
function mount() {
  const pending: Array<() => void> = [];
  const reports = new Map<string, boolean>();
  const guard = vi.fn((action: () => void) => { pending.push(action); });
  render(
    <ConfigDirtyGuardContext.Provider value={{ setDirty: () => {}, report: (id, d) => { reports.set(id, d); }, guard }}>
      <OrganMapsSection />
    </ConfigDirtyGuardContext.Provider>,
  );
  return { guard, pending, anyDirty: () => [...reports.values()].some(Boolean) };
}

const scopeSelect = () => document.getElementById('organmap-scope') as HTMLSelectElement;

describe('OrganMapsSection — switches ask before dropping unsaved edits (PS-479)', () => {
  it('changing level waits for the guard: cancelled, the level and the edit stay', () => {
    const { guard, pending, anyDirty } = mount();
    fireEvent.click(screen.getAllByText('organMapsSection.scheme.override')[0]);
    expect(anyDirty()).toBe(true);

    fireEvent.change(scopeSelect(), { target: { value: 'jurisdiction' } });
    expect(guard).toHaveBeenCalledTimes(1);
    expect(scopeSelect().value).toBe('enterprise');
    expect(anyDirty()).toBe(true);
    expect(pending).toHaveLength(1);
  });

  it('changing level goes ahead once the guard runs the action (Discard)', () => {
    const { pending } = mount();
    fireEvent.change(scopeSelect(), { target: { value: 'facility' } });
    act(() => { pending.forEach(a => a()); });
    expect(scopeSelect().value).toBe('facility');
  });

  it('switching tab and picking a template also go through the guard', () => {
    const { guard, pending } = mount();
    const tabs = screen.getAllByRole('tab');
    fireEvent.click(tabs[1]);
    expect(guard).toHaveBeenCalledTimes(1);
    expect(tabs[1].getAttribute('aria-selected')).toBe('false');
    act(() => { pending.splice(0).forEach(a => a()); });
    expect(screen.getAllByRole('tab')[1].getAttribute('aria-selected')).toBe('true');

    const templateSelect = document.getElementById('organmap-template') as HTMLSelectElement;
    fireEvent.change(templateSelect, { target: { value: 't1' } });
    expect(guard).toHaveBeenCalledTimes(2);
    expect(templateSelect.value).toBe('');
  });
});

// Batch 516: the two gaps noted in the Oct 10 audit — a map-type switch, and a
// clean switch going straight through (ConfigurationPage runs the action at
// once when nothing is unsaved; the guard below mirrors that).
describe('OrganMapsSection — map type, and clean switches (PS-479, Batch 516)', () => {
  function mountLikeConfigurationPage() {
    const reports = new Map<string, boolean>();
    const pending: Array<() => void> = [];
    const guard = vi.fn((action: () => void) => { if ([...reports.values()].some(Boolean)) pending.push(action); else action(); });
    render(
      <ConfigDirtyGuardContext.Provider value={{ setDirty: () => {}, report: (id, d) => { reports.set(id, d); }, guard }}>
        <OrganMapsSection />
      </ConfigDirtyGuardContext.Provider>,
    );
    return { guard, pending };
  }

  it('with nothing unsaved, changing level applies at once (no prompt)', () => {
    const { guard, pending } = mountLikeConfigurationPage();
    fireEvent.change(scopeSelect(), { target: { value: 'facility' } });
    expect(guard).toHaveBeenCalledTimes(1);
    expect(pending).toHaveLength(0);
    expect(scopeSelect().value).toBe('facility');
  });

  it('switching map type on the Bindings tab goes through the guard', async () => {
    const { guard } = mountLikeConfigurationPage();
    fireEvent.click(screen.getAllByRole('tab')[1]);
    fireEvent.change(document.getElementById('organmap-template') as HTMLSelectElement, { target: { value: 't1' } });
    const mapType = await screen.findByLabelText('organMapsSection.bindings.mapType') as HTMLSelectElement;
    const before = guard.mock.calls.length;
    const other = [...mapType.options].map(o => o.value).find(v => v !== mapType.value)!;
    fireEvent.change(mapType, { target: { value: other } });
    expect(guard.mock.calls.length).toBe(before + 1);
    expect((document.getElementById('organmap-maptype') as HTMLSelectElement).value).toBe(other);
  });
});
