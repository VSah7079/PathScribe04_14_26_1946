// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { tapTitleFor } from './tapTitle';

describe('a tap shows a tooltip (touch spec §2)', () => {
  it('for an information element with a title, found from a tap on its text', () => {
    const root = document.createElement('div');
    root.innerHTML = '<span title="Prints on the slide label"><b id="t">On label</b></span><button id="b" title="Print">Print</button>';
    expect(tapTitleFor(root.querySelector('#t'), root)).toBe('Prints on the slide label');
  });
  it('not for a button, which does its own job, nor outside the screen', () => {
    const root = document.createElement('div');
    root.innerHTML = '<button id="b" title="Print">Print</button><span id="n">plain</span>';
    expect(tapTitleFor(root.querySelector('#b'), root)).toBeNull();
    expect(tapTitleFor(root.querySelector('#n'), root)).toBeNull();
  });
});
