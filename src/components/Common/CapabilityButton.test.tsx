// @vitest-environment happy-dom
//
// Batch 451 (PS-355): an action the signed-in user isn't allowed stays
// visible but greyed out, with a tooltip saying why, and clicking it does
// nothing. The decision itself comes from evaluateCapability (tested in
// services/authorization/authorization.test.ts); here it is stubbed.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, o?: Record<string, unknown>) => (o ? `${key} ${JSON.stringify(o)}` : key) }),
}));
vi.mock('@/services', async () => ({ ...(await import('@/services/authorization/capabilityCatalog')) }));

const caps = vi.hoisted(() => ({ decision: null as unknown, loading: false, decide: vi.fn() }));
vi.mock('@/hooks/useCapabilities', () => ({
  useCapabilities: () => ({ loading: caps.loading, has: () => false, decide: (...a: unknown[]) => { caps.decide(...a); return caps.decision; } }),
}));

import { CapabilityButton } from './CapabilityButton';
import { capabilityDefinition, capabilityLabelKey } from '@/services/authorization/capabilityCatalog';

afterEach(() => { cleanup(); vi.clearAllMocks(); caps.decision = null; caps.loading = false; });

const BINDER = 'qa:inspection-evidence:export';
const DASHBOARD = 'qa:activity-dashboard:export';
const label = (key: string) => capabilityLabelKey(capabilityDefinition(key)!);

describe('CapabilityButton (PS-355)', () => {
  it('a capability the user holds: enabled, and the click runs', () => {
    caps.decision = { allowed: true };
    const onClick = vi.fn();
    render(<CapabilityButton capability={BINDER} className="ps-conf-btn-secondary" onClick={onClick} title="tip">Export</CapabilityButton>);
    const btn = screen.getByText('Export');
    expect(btn.getAttribute('aria-disabled')).toBe('false');
    expect(btn.className).toBe('ps-conf-btn-secondary');
    expect(btn.getAttribute('title')).toBe('tip');
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('a capability the user lacks: greyed out, tooltip names the capability, the click does nothing', () => {
    caps.decision = { allowed: false, reason: 'notGranted' };
    const onClick = vi.fn();
    render(<CapabilityButton capability={BINDER} className="ps-conf-btn-secondary" onClick={onClick}>Export</CapabilityButton>);
    const btn = screen.getByText('Export');
    expect(btn.getAttribute('aria-disabled')).toBe('true');
    expect(btn.classList.contains('ps-cap-btn--denied')).toBe(true);
    expect(btn.getAttribute('data-capability')).toBe(BINDER);
    expect(btn.getAttribute('title')).toBe(`capabilities.notGranted ${JSON.stringify({ capability: label(BINDER) })}`);
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('a held capability whose requirement is missing: the tooltip names the requirement', () => {
    caps.decision = { allowed: false, reason: 'requirementNotGranted', missingRequirements: [DASHBOARD] };
    render(<CapabilityButton capability={BINDER} className="b" onClick={vi.fn()}>Export</CapabilityButton>);
    expect(screen.getByText('Export').getAttribute('title'))
      .toBe(`capabilities.requirementMissing ${JSON.stringify({ capability: label(BINDER), required: label(DASHBOARD) })}`);
  });

  it('outside the user\'s facilities: the tooltip says so', () => {
    caps.decision = { allowed: false, reason: 'outOfScope' };
    render(<CapabilityButton capability={BINDER} className="b" onClick={vi.fn()} context={{ facilityIds: ['F9'] }}>Export</CapabilityButton>);
    expect(screen.getByText('Export').getAttribute('title')).toBe(`capabilities.outOfScope ${JSON.stringify({ capability: label(BINDER) })}`);
    expect(caps.decide).toHaveBeenCalledWith(BINDER, { facilityIds: ['F9'] });
  });

  it('while the decision is loading the button is greyed out and the click does nothing', () => {
    caps.loading = true;
    caps.decision = null;
    const onClick = vi.fn();
    render(<CapabilityButton capability={BINDER} className="b" onClick={onClick}>Export</CapabilityButton>);
    const btn = screen.getByText('Export');
    expect(btn.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });
});
