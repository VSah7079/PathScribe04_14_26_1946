// PS-355 (Batch 451): what ticking or unticking a capability does in the
// Role Dictionary's Capabilities tab, against the real catalog
// (qa:inspection-evidence:export requires qa:activity-dashboard:export).
import { describe, it, expect } from 'vitest';
import {
  capabilityGroupState, planCapabilityToggle, planCapabilityClick, planCapabilityGroupClick,
} from './capabilityToggle';
import { capabilitiesByGroup } from './capabilityCatalog';
import { dependentsOf } from './capabilityDependencies';

const BINDER = 'qa:inspection-evidence:export';
const DASHBOARD = 'qa:activity-dashboard:export';

describe('capability toggles in the Role Dictionary (PS-355)', () => {
  it('a group shows ticked when all of it is held, part-ticked for some, empty for none', () => {
    expect(capabilityGroupState(['a', 'b'], ['a', 'b', 'c'])).toBe('all');
    expect(capabilityGroupState(['a', 'b'], new Set(['b']))).toBe('some');
    expect(capabilityGroupState(['a', 'b'], [])).toBe('none');
  });

  it('turning on a capability whose requirement the role lacks asks first, offering the requirement', () => {
    expect(planCapabilityClick([], BINDER)).toEqual({ kind: 'confirm', direction: 'grant', others: [DASHBOARD], next: expect.arrayContaining([BINDER, DASHBOARD]) });
  });

  it('turning on a capability whose requirement is already held applies at once', () => {
    const outcome = planCapabilityClick([DASHBOARD], BINDER);
    expect(outcome.kind).toBe('apply');
    expect(outcome.kind === 'apply' && [...outcome.next].sort()).toEqual([DASHBOARD, BINDER].sort());
  });

  it('turning off a capability others on the role need asks first, naming the ones that go too', () => {
    const outcome = planCapabilityClick([DASHBOARD, BINDER], DASHBOARD);
    expect(outcome).toEqual({ kind: 'confirm', direction: 'revoke', others: [BINDER], next: [] });
  });

  it('turning off a capability nothing held depends on applies at once', () => {
    expect(planCapabilityClick([DASHBOARD, BINDER], BINDER)).toEqual({ kind: 'apply', next: [DASHBOARD] });
  });

  it('asking for what is already the case changes nothing', () => {
    expect(planCapabilityToggle([DASHBOARD], [DASHBOARD], true)).toEqual({ kind: 'none' });
    expect(planCapabilityToggle([], [DASHBOARD], false)).toEqual({ kind: 'none' });
  });

  it('a group checkbox turns the whole group on unless all of it is held, then off', () => {
    const qa = capabilitiesByGroup().find(g => g.capabilities.some(c => c.key === BINDER))!;
    const keys = qa.capabilities.map(c => c.key);
    // Some held: the click turns the rest on. Everything in the group comes
    // with its own requirements, so only requirements outside it are offered.
    const on = planCapabilityGroupClick([DASHBOARD], keys);
    expect(on.kind === 'none').toBe(false);
    const next = on.kind === 'none' ? [] : on.next;
    expect(next).toEqual(expect.arrayContaining(keys));
    // All held: the click turns the group off (asking only if something outside the group needs it).
    const off = planCapabilityGroupClick(next, keys);
    const remaining = off.kind === 'none' ? next : off.next;
    for (const k of keys) expect(remaining).not.toContain(k);
    const outsideDependents = keys.flatMap(k => dependentsOf(k)).filter(d => !keys.includes(d) && next.includes(d));
    expect(off.kind).toBe(outsideDependents.length ? 'confirm' : 'apply');
  });
});
