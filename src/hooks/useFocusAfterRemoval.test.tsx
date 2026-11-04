// @vitest-environment happy-dom
// src/hooks/useFocusAfterRemoval.test.tsx — Batch 570.
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { useRef, useState } from 'react';
import { useFocusAfterRemoval } from './useFocusAfterRemoval';

function List({ initial, view = '' }: { initial: string[]; view?: string }) {
  const [items, setItems] = useState(initial);
  const ref = useRef<HTMLDivElement>(null);
  const remember = useFocusAfterRemoval(items, ref, 'data-open', [view], () => ref.current?.querySelector<HTMLElement>('.fallback'));
  return (
    <div ref={ref} tabIndex={-1}>
      {items.map(id => (
        <span key={id}>
          <button data-open={id}>{id}</button>
          <button aria-label={`delete ${id}`} onClick={e => { remember(e, id); setItems(p => p.filter(x => x !== id)); }}>×</button>
        </span>
      ))}
      <button className="fallback">save</button>
    </div>
  );
}
afterEach(cleanup);

describe('useFocusAfterRemoval', () => {
  it('keyboard removal: focus to the next item, then the one before, then the fallback', () => {
    render(<List initial={['a', 'b', 'c']} />);
    const del = (id: string) => { const b = screen.getByRole('button', { name: `delete ${id}` }); b.focus(); fireEvent.click(b, { detail: 0 }); };
    del('b');
    expect(document.activeElement?.getAttribute('data-open')).toBe('c');
    del('c');
    expect(document.activeElement?.getAttribute('data-open')).toBe('a');
    del('a');
    expect(document.activeElement?.className).toBe('fallback');
  });
  it('mouse removal leaves focus where it is (the page, once the button is gone)', () => {
    render(<List initial={['a', 'b']} />);
    const b = screen.getByRole('button', { name: 'delete a' });
    b.focus();
    fireEvent.click(b, { detail: 1 });
    expect(document.activeElement).toBe(document.body);
  });
  it('a removal that lands after the user has moved on never pulls focus back', () => {
    function Slow() {
      const [items, setItems] = useState(['a', 'b']);
      const ref = useRef<HTMLDivElement>(null);
      const remember = useFocusAfterRemoval(items, ref, 'data-open');
      return (
        <div ref={ref}>
          {items.map(id => <span key={id}><button data-open={id}>{id}</button><button aria-label={`delete ${id}`} onClick={e => remember(e, id)}>×</button></span>)}
          <input aria-label="elsewhere" />
          <button onClick={() => setItems(['b'])}>land</button>
        </div>
      );
    }
    render(<Slow />);
    const del = screen.getByRole('button', { name: 'delete a' });
    del.focus();
    fireEvent.click(del, { detail: 0 });
    screen.getByRole('textbox', { name: 'elsewhere' }).focus();
    fireEvent.click(screen.getByRole('button', { name: 'land' }), { detail: 1 });
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'elsewhere' }));
  });
});
