// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { isModalOpen } from './modalFocus';

describe('isModalOpen (Batch 650)', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('is false on a page with no window open', () => {
    document.body.innerHTML = '<div class="ps-bab-bar"><button class="ps-bab-action-btn">History</button></div>';
    expect(isModalOpen()).toBe(false);
  });

  it.each(['ps-overlay', 'ps-ms-overlay', 'ps-conf-backdrop', 'fm-overlay', 'ps-prefin-overlay', 'ps-overlay ps-overlay--confirm'])(
    'is true for a window wrapper (%s)', cls => {
      document.body.innerHTML = `<div class="${cls}"></div>`;
      expect(isModalOpen()).toBe(true);
    });

  it('is true for aria-modal="true"', () => {
    document.body.innerHTML = '<div role="dialog" aria-modal="true"></div>';
    expect(isModalOpen()).toBe(true);
  });

  it('ignores classes that only mention overlay inside the name of a part', () => {
    document.body.innerHTML = '<span class="ps-ose-locked-overlay-note"></span><div class="ps-delegate-drag-overlay-card"></div>';
    expect(isModalOpen()).toBe(false);
  });
});
