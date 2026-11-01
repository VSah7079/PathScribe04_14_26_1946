// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { keyboardScrollPlan, raisesKeyboard, findSaveButton, visibleWithin } from './keyboardVisibility';

const v = { top: 0, bottom: 420 }; // an iPad Air in landscape with the keyboard up

describe('keyboard up: the field and its Save button stay visible (touch spec T6)', () => {
  it('does nothing when both are already visible', () => {
    expect(keyboardScrollPlan({ top: 100, bottom: 140 }, { top: 200, bottom: 248 }, v)).toBe('none');
  });
  it('brings both into view when they fit together above the keyboard', () => {
    expect(keyboardScrollPlan({ top: 300, bottom: 340 }, { top: 500, bottom: 548 }, v)).toBe('both');
    expect(keyboardScrollPlan({ top: 600, bottom: 640 }, null, v)).toBe('fieldOnly');
  });
  it('keeps the field when they cannot both fit', () => {
    expect(keyboardScrollPlan({ top: 100, bottom: 140 }, { top: 700, bottom: 748 }, v)).toBe('fieldOnly');
  });
  it('counts only the part of the screen inside the page\'s scroll area (below the header)', () => {
    expect(visibleWithin({ top: 0, bottom: 420 }, { top: 124, bottom: 768 })).toEqual({ top: 124, bottom: 420 });
    expect(visibleWithin({ top: 0, bottom: 420 }, { top: 500, bottom: 768 })).toEqual({ top: 0, bottom: 420 });
  });
  it('a scan field (inputmode none), a checkbox or a button raises no keyboard', () => {
    const d = document.createElement('div');
    d.innerHTML = '<input id="a"><input id="b" inputmode="none"><input id="c" type="checkbox"><textarea id="d"></textarea><input id="e" type="number">';
    expect(['a', 'b', 'c', 'd', 'e'].map(id => raisesKeyboard(d.querySelector(`#${id}`)))).toEqual([true, false, false, true, true]);
  });
  it('finds the Save button after the field in its window', () => {
    const d = document.createElement('div');
    d.innerHTML = '<div role="dialog"><button class="ps-btn-primary" id="before">x</button><textarea id="f"></textarea><button class="ps-btn-secondary">Cancel</button><button class="ps-btn-primary" id="save">Save</button></div>';
    document.body.appendChild(d);
    expect(findSaveButton(d.querySelector('#f')!)?.id).toBe('save');
    d.remove();
  });
});
