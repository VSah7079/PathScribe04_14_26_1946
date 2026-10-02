// @vitest-environment happy-dom
// Batch 429: a Configuration section shown view only.
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

let held: string[] = [];
vi.mock('@/hooks/useCapabilities', () => ({ useCapabilities: () => ({ loading: false, has: (c: string) => held.includes(c), decide: () => null }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o ? `${k}:${JSON.stringify(o)}` : k) }) }));

import ConfigSectionGate from './ConfigSectionGate';

afterEach(() => { cleanup(); held = []; });

const Section = ({ onAction, onTab }: { onAction: () => void; onTab: () => void }) => (
  <div>
    <button className="ps-tab-btn" onClick={onTab}>Tab</button>
    <button className="ps-conf-btn-primary" onClick={onAction}>Add</button>
    <button data-config-nav className="ps-conf-btn-row" onClick={onTab}>Show older</button>
  </div>
);

describe('ConfigSectionGate (Batch 429)', () => {
  it('without the section\'s capability: a note, actions do nothing, navigation still works', () => {
    const onAction = vi.fn(), onTab = vi.fn();
    render(<ConfigSectionGate section="clients"><Section onAction={onAction} onTab={onTab} /></ConfigSectionGate>);
    expect(screen.getByRole('note').textContent).toContain('configViewOnly.message');
    fireEvent.click(screen.getByText('Add'));
    fireEvent.click(screen.getByText('Tab'));
    fireEvent.click(screen.getByText('Show older'));
    expect(onAction).not.toHaveBeenCalled();
    expect(onTab).toHaveBeenCalledTimes(2);
  });
  it('Batch 430: without it, a dropdown that saves on change doesn\'t fire; a filter still does', () => {
    const onSave = vi.fn(), onFilter = vi.fn();
    render(
      <ConfigSectionGate section="clients">
        <select aria-label="setting" className="ps-conf-select" value="a" onChange={onSave}><option value="a">A</option><option value="b">B</option></select>
        <select aria-label="filter" data-config-nav className="ps-conf-select" value="a" onChange={onFilter}><option value="a">A</option><option value="b">B</option></select>
      </ConfigSectionGate>,
    );
    fireEvent.change(screen.getByLabelText('setting'), { target: { value: 'b' } });
    fireEvent.change(screen.getByLabelText('filter'), { target: { value: 'b' } });
    expect(onSave).not.toHaveBeenCalled();
    expect(onFilter).toHaveBeenCalled();
  });
  it('with it: the section as usual', () => {
    held = ['config:facilities:manage'];
    const onAction = vi.fn();
    render(<ConfigSectionGate section="clients"><Section onAction={onAction} onTab={vi.fn()} /></ConfigSectionGate>);
    expect(screen.queryByRole('note')).toBeNull();
    fireEvent.click(screen.getByText('Add'));
    expect(onAction).toHaveBeenCalled();
  });
});
