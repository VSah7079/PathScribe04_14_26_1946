// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { useFillViewportHeight } from './useFillViewportHeight';

let top = 600;
function Panel() {
  const { ref, height } = useFillViewportHeight<HTMLDivElement>();
  return <div ref={el => { (ref as any).current = el; if (el) el.getBoundingClientRect = () => ({ top } as DOMRect); }} data-h={height} />;
}
afterEach(() => { cleanup(); vi.useRealTimers(); });
const flush = () => act(async () => { await new Promise(r => setTimeout(r, 30)); });

describe('useFillViewportHeight (Batch 395)', () => {
  it('fills to the bottom of the window, and grows when the content above shrinks', async () => {
    Object.defineProperty(window, 'innerHeight', { value: 1032, configurable: true });
    const { container } = render(<Panel />);
    await flush();
    expect(container.firstElementChild!.getAttribute('data-h')).toBe(String(1032 - 600 - 16));
    top = 400; // the banners above finished loading and got shorter
    window.dispatchEvent(new Event('resize'));
    await flush();
    expect(container.firstElementChild!.getAttribute('data-h')).toBe(String(1032 - 400 - 16));
  });
});
