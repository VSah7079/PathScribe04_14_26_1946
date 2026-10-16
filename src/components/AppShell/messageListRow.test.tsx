// @vitest-environment happy-dom
// src/components/AppShell/messageListRow.test.tsx
// Batch 567 (WCAG 4.1.2, axe nested-interactive): a message row holds buttons (delete, restore), so it isn't a
// button itself. The sender's name is the button that opens the message (or, editing, ticks it); clicking
// elsewhere on the row still does the same; focus inside the row shows its actions, as hover does.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
  Trans: ({ i18nKey }: { i18nKey: string }) => <span>{i18nKey}</span>,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', name: 'Dr. A' } }) }));
vi.mock('@/hooks/useCapabilities', () => ({ useCapabilities: () => ({ loading: false, has: () => true, decide: () => ({ allowed: true }) }) }));
vi.mock('@/services', () => ({ actionRegistryService: { setCurrentContext: vi.fn(), onAction: () => () => {} }, messageService: {}, caseService: {} }));

import { MessageListPanel } from './AppShell';

const MSG = { id: 'm1', senderName: 'Lab Manager', subject: 'Block recut', body: 'Please recut A1', timestamp: new Date().toISOString(), isRead: false, isUrgent: false };
const noop = () => {};
function panel(over: Record<string, unknown> = {}) {
  const props = {
    messages: [MSG], selectedMsgId: null, hoveredMsgId: null, isEditing: false, selectedIds: [], filterType: 'all' as const,
    loading: false, isComposing: false, searchText: '',
    onHover: vi.fn(), onSelect: vi.fn(), onToggleCheck: vi.fn(), onSoftDelete: vi.fn(), onRestore: vi.fn(), onPermanentDelete: vi.fn(),
    onSearchChange: noop, onBulkMarkRead: noop, onBulkDelete: noop, onEmptyDeleted: noop, onCompose: noop, onSecureEmail: noop,
    ...over,
  };
  render(<MessageListPanel {...props} />);
  return props;
}
afterEach(cleanup);

describe('message list row (Batch 567)', () => {
  it("the sender's name is a button that opens the message once; the row has no role or tab stop", () => {
    const p = panel();
    const open = screen.getByRole('button', { name: 'Lab Manager' });
    expect(open.getAttribute('aria-describedby')).toBe('ps-msg-subject-m1');
    const row = open.closest('.ps-msg-row') as HTMLElement;
    expect(row.getAttribute('role')).toBeNull();
    expect(row.getAttribute('tabindex')).toBeNull();
    fireEvent.click(open);
    expect(p.onSelect).toHaveBeenCalledTimes(1);
    expect(p.onSelect).toHaveBeenCalledWith('m1');
  });
  it('clicking elsewhere on the row still opens it, once', () => {
    const p = panel();
    fireEvent.click(screen.getByText('Block recut'));
    expect(p.onSelect).toHaveBeenCalledTimes(1);
    expect(p.onSelect).toHaveBeenCalledWith('m1');
  });
  it('editing: the name button ticks the message and says whether it is ticked', () => {
    const p = panel({ isEditing: true, selectedIds: ['m1'] });
    const b = screen.getByRole('button', { name: 'Lab Manager' });
    expect(b.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(b);
    expect(p.onToggleCheck).toHaveBeenCalledTimes(1);
    expect(p.onSelect).not.toHaveBeenCalled();
  });
  it('focus in the row shows its actions (without hover); they stay while focus moves among them and go when it leaves', () => {
    const p = panel();
    const del = () => screen.queryByRole('button', { name: 'appShell.messageList.deleteButton' });
    expect(del()).toBeNull();
    const open = screen.getByRole('button', { name: 'Lab Manager' });
    fireEvent.focus(open);
    expect(del()).not.toBeNull();
    // Focus moving from the name to the delete button stays inside the row.
    fireEvent.blur(open, { relatedTarget: del() });
    expect(del()).not.toBeNull();
    // Leaving the row hides them again.
    fireEvent.blur(del()!, { relatedTarget: document.body });
    expect(del()).toBeNull();
    expect(p.onHover).not.toHaveBeenCalled();
  });
  it('the delete button has a name and does only its own job', () => {
    const p = panel({ hoveredMsgId: 'm1' });
    fireEvent.click(screen.getByRole('button', { name: 'appShell.messageList.deleteButton' }));
    expect(p.onSoftDelete).toHaveBeenCalledWith('m1');
    expect(p.onSelect).not.toHaveBeenCalled();
  });

  it('Batch 569: deleting with the keyboard moves focus to the next message, or to the list when none is left', () => {
    const M2 = { ...MSG, id: 'm2', senderName: 'Histology', subject: 'Stain ready' };
    const props = {
      messages: [MSG, M2], selectedMsgId: null, hoveredMsgId: null, isEditing: false, selectedIds: [], filterType: 'all' as const,
      loading: false, isComposing: false, searchText: '',
      onHover: vi.fn(), onSelect: vi.fn(), onToggleCheck: vi.fn(), onSoftDelete: vi.fn(), onRestore: vi.fn(), onPermanentDelete: vi.fn(),
      onSearchChange: noop, onBulkMarkRead: noop, onBulkDelete: noop, onEmptyDeleted: noop, onCompose: noop, onSecureEmail: noop,
    };
    const { rerender } = render(<MessageListPanel {...props} />);
    fireEvent.focus(screen.getByRole('button', { name: 'Lab Manager' }));
    const del = screen.getByRole('button', { name: 'appShell.messageList.deleteButton' });
    del.focus();
    fireEvent.click(del);
    expect(props.onSoftDelete).toHaveBeenCalledWith('m1');
    rerender(<MessageListPanel {...props} messages={[M2]} />);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Histology' }));
    // The last one: focus goes to the list.
    fireEvent.focus(screen.getByRole('button', { name: 'Histology' }));
    const del2 = screen.getByRole('button', { name: 'appShell.messageList.deleteButton' });
    del2.focus();
    fireEvent.click(del2);
    rerender(<MessageListPanel {...props} messages={[]} />);
    expect(document.activeElement?.getAttribute('role')).toBe('region');
  });

  it('Batch 569: a mouse delete leaves focus alone; a delete that never happens never pulls focus later', () => {
    const M2 = { ...MSG, id: 'm2', senderName: 'Histology', subject: 'Stain ready' };
    const props = {
      messages: [MSG, M2], selectedMsgId: null, hoveredMsgId: 'm1', isEditing: false, selectedIds: [], filterType: 'all' as const,
      loading: false, isComposing: false, searchText: '',
      onHover: vi.fn(), onSelect: vi.fn(), onToggleCheck: vi.fn(), onSoftDelete: vi.fn(), onRestore: vi.fn(), onPermanentDelete: vi.fn(),
      onSearchChange: noop, onBulkMarkRead: noop, onBulkDelete: noop, onEmptyDeleted: noop, onCompose: noop, onSecureEmail: noop,
    };
    const { rerender } = render(<MessageListPanel {...props} />);
    const outside = document.createElement('input');
    document.body.appendChild(outside);
    // A mouse click (detail 1): the row goes, focus is not moved.
    fireEvent.click(screen.getByRole('button', { name: 'appShell.messageList.deleteButton' }), { detail: 1 });
    outside.focus();
    rerender(<MessageListPanel {...props} messages={[M2]} />);
    expect(document.activeElement).toBe(outside);
    // A keyboard delete that was cancelled; later the user types a search that hides the message: focus stays in the box.
    rerender(<MessageListPanel {...props} messages={[M2]} hoveredMsgId="m2" />);
    fireEvent.click(screen.getByRole('button', { name: 'appShell.messageList.deleteButton' }));
    outside.focus();
    rerender(<MessageListPanel {...props} messages={[M2]} hoveredMsgId="m2" searchText="zz" />);
    rerender(<MessageListPanel {...props} messages={[]} hoveredMsgId="m2" searchText="zz" />);
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });
});
