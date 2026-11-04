// src/utils/a11y/pressable.test.ts
// Batch 566: pressable / clickableContainer, tested directly.
import { describe, it, expect, vi } from 'vitest';
import { clickableContainer, pressable } from './pressable';

describe('pressable', () => {
  it('gives a button role, a tab stop and Enter/Space; nothing without a handler', () => {
    const go = vi.fn();
    const p = pressable(go) as any;
    expect(p.role).toBe('button');
    expect(p.tabIndex).toBe(0);
    const target = {};
    p.onKeyDown({ key: 'Enter', target, currentTarget: target, preventDefault: () => {} });
    expect(go).toHaveBeenCalledTimes(1);
    expect(pressable(undefined)).toEqual({});
  });
});

describe('clickableContainer (Batch 566)', () => {
  it('is a mouse shortcut only: a click handler, no role, no tab stop, no keys', () => {
    const go = vi.fn();
    const p = clickableContainer(go) as Record<string, unknown>;
    expect(Object.keys(p)).toEqual(['onClick']);
    expect(p.onClick).toBe(go);
  });
  it('adds nothing when the row is not clickable in this state', () => {
    expect(clickableContainer(undefined)).toEqual({});
  });
});
