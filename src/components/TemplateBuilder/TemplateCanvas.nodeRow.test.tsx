// @vitest-environment happy-dom
// src/components/TemplateBuilder/TemplateCanvas.nodeRow.test.tsx
// Batch 570 (covers Batch 568's change; WCAG 4.1.2): a template field's row holds buttons (show contents, remove),
// so it isn't a button itself. Its name is the button that selects it; clicking elsewhere on the row still does;
// keyboard focus shows Remove, named with the field; Remove and "show contents" do only their own jobs.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key), i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

import { NodeCard } from './TemplateCanvas';

const SECTION = { id: 'n1', type: 'section', label: 'Margins', children: [] } as any;
afterEach(cleanup);
function card(over: Record<string, unknown> = {}) {
  const props = { node: SECTION, depth: 0, selectedId: null, isDragging: false, onSelect: vi.fn(), onDrop: vi.fn(), onDelete: vi.fn(), ...over };
  render(<NodeCard {...(props as any)} />);
  return props;
}

describe('NodeCard (Batch 568 / 570)', () => {
  it("the field's name is the button that selects it, once; the row has no role or tab stop", () => {
    const p = card();
    const name = screen.getByRole('button', { name: 'Margins' });
    const row = name.closest('.ps-tc-node-row') as HTMLElement;
    expect(row.getAttribute('role')).toBeNull();
    expect(row.getAttribute('tabindex')).toBeNull();
    fireEvent.click(name);
    expect(p.onSelect).toHaveBeenCalledTimes(1);
    expect(p.onSelect).toHaveBeenCalledWith('n1');
  });
  it('clicking elsewhere on the row still selects it; selected is marked current', () => {
    const p = card({ selectedId: 'n1' });
    expect(screen.getByRole('button', { name: 'Margins' }).getAttribute('aria-current')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Margins' }).closest('.ps-tc-node-row')!);
    expect(p.onSelect).toHaveBeenCalledTimes(1);
  });
  it('"show contents" says whether it is open and does only its own job', () => {
    const p = card();
    const toggle = screen.getByRole('button', { name: 'templateCanvas.childrenToggle' });
    const was = toggle.getAttribute('aria-expanded');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).not.toBe(was);
    expect(p.onSelect).not.toHaveBeenCalled();
  });
  it('Remove appears on hover, is named with the field, and does only its own job', () => {
    const p = card();
    expect(screen.queryByRole('button', { name: /removeNamed/ })).toBeNull();
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Margins' }).closest('.ps-tc-node-row')!);
    const remove = screen.getByRole('button', { name: 'templateCanvas.removeNamed:{"label":"Margins"}' });
    fireEvent.click(remove);
    expect(p.onDelete).toHaveBeenCalledWith('n1');
    expect(p.onSelect).not.toHaveBeenCalled();
  });
});
