// @vitest-environment happy-dom
//
// Batch 451 (PS-355): the Role Dictionary's Capabilities tab, rendered
// against the real capability catalog. Capabilities are grouped; ticking one
// that needs another offers to add it, unticking one others need warns
// about them, and either prompt can be cancelled. What a click does is
// decided in services/authorization/capabilityToggle.ts (tested there).
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, o?: Record<string, unknown>) => (o ? `${key} ${JSON.stringify(o)}` : key) }),
}));
// Only the authorization helpers this tab uses, from their real modules.
vi.mock('@/services', async () => ({
  ...(await import('@/services/authorization/capabilityCatalog')),
  ...(await import('@/services/authorization/capabilityDependencies')),
}));

import { RoleCapabilitiesTab } from './RoleCapabilitiesTab';
import { capabilitiesByGroup, capabilityDefinition, capabilityGroupKey, capabilityLabelKey } from '@/services/authorization/capabilityCatalog';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const BINDER = 'qa:inspection-evidence:export';
const DASHBOARD = 'qa:activity-dashboard:export';
const label = (key: string) => capabilityLabelKey(capabilityDefinition(key)!);
const groupOf = (key: string) => capabilityDefinition(key)!.group;
const groupItem = (group: string) =>
  within(document.querySelector('.ps-rd-cat-panel') as HTMLElement).getByText(capabilityGroupKey(group as never)).closest('.ps-rd-cat-item') as HTMLElement;
const capItem = (key: string) => document.querySelector(`[data-capability="${key}"]`) as HTMLElement;
const openGroupOf = (key: string) => fireEvent.click(groupItem(groupOf(key)));

describe('RoleCapabilitiesTab (PS-355)', () => {
  it('lists the capability groups in catalog order, leaving out the platform group for a hospital role', () => {
    const { container } = render(<RoleCapabilitiesTab granted={[]} onChange={vi.fn()} />);
    const shown = Array.from(container.querySelectorAll('.ps-rd-cat-item .ps-rd-cat-label')).map(e => e.textContent);
    const expected = capabilitiesByGroup().filter(g => g.group !== 'platform').map(g => capabilityGroupKey(g.group));
    expect(shown).toEqual(expected);
  });

  it('lists the platform group only for the platform role', () => {
    const { container } = render(<RoleCapabilitiesTab granted={[]} onChange={vi.fn()} includePlatform readOnly />);
    const shown = Array.from(container.querySelectorAll('.ps-rd-cat-item .ps-rd-cat-label')).map(e => e.textContent);
    expect(shown).toEqual(capabilitiesByGroup().map(g => capabilityGroupKey(g.group)));
  });

  it('choosing a group shows its capabilities, and each group shows how many the role holds', () => {
    render(<RoleCapabilitiesTab granted={[DASHBOARD]} onChange={vi.fn()} />);
    openGroupOf(BINDER);
    const group = capabilitiesByGroup().find(g => g.group === groupOf(BINDER))!;
    const listed = Array.from(document.querySelectorAll('.ps-rd-action-item')).map(e => e.getAttribute('data-capability'));
    expect(listed).toEqual(group.capabilities.map(c => c.key));
    expect(within(groupItem(group.group)).getByText(`1/${group.capabilities.length}`)).toBeTruthy();
    // The requirement link is shown on the capability that has one.
    expect(within(capItem(BINDER)).getByText(`roleDictionary.capabilities.needs ${JSON.stringify({ list: label(DASHBOARD) })}`)).toBeTruthy();
  });

  it('turning on a capability that needs another offers to add it; confirming adds both', () => {
    const onChange = vi.fn();
    render(<RoleCapabilitiesTab granted={[]} onChange={onChange} />);
    openGroupOf(BINDER);
    fireEvent.click(capItem(BINDER));
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText(label(DASHBOARD))).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByText(/roleDictionary\.capabilities\.prompt\.grantConfirm/));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect([...onChange.mock.calls[0][0]].sort()).toEqual([DASHBOARD, BINDER].sort());
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('cancelling the prompt leaves the role as it was', () => {
    const onChange = vi.fn();
    render(<RoleCapabilitiesTab granted={[]} onChange={onChange} />);
    openGroupOf(BINDER);
    fireEvent.click(capItem(BINDER));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByText('common.cancel'));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('turning off a capability others need warns about them; confirming removes them too', () => {
    const onChange = vi.fn();
    render(<RoleCapabilitiesTab granted={[DASHBOARD, BINDER]} onChange={onChange} />);
    openGroupOf(DASHBOARD);
    fireEvent.click(capItem(DASHBOARD));
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText(/roleDictionary\.capabilities\.prompt\.revokeIntro/)).toBeTruthy();
    expect(within(dialog).getByText(label(BINDER))).toBeTruthy();
    fireEvent.click(within(dialog).getByText(/roleDictionary\.capabilities\.prompt\.revokeConfirm/));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('a change with no dependency applies at once, without a prompt', () => {
    const onChange = vi.fn();
    render(<RoleCapabilitiesTab granted={[DASHBOARD, BINDER]} onChange={onChange} />);
    openGroupOf(BINDER);
    fireEvent.click(capItem(BINDER));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(onChange).toHaveBeenCalledWith([DASHBOARD]);
  });

  it('a read-only role (Superadmin) cannot be changed', () => {
    const onChange = vi.fn();
    render(<RoleCapabilitiesTab granted={[]} onChange={onChange} readOnly includePlatform />);
    openGroupOf(BINDER);
    fireEvent.click(capItem(BINDER));
    fireEvent.click(document.querySelector('.ps-rd-action-header .ps-rd-cb') as HTMLElement);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });
});
