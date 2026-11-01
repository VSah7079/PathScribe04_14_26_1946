// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { touchLayoutActive, parseTouchLayoutMode, readTouchLayoutMode, writeTouchLayoutMode } from './touchLayout';

describe('touch layout activation (touch spec §5)', () => {
  beforeEach(() => writeTouchLayoutMode('auto'));
  it('Auto follows the device: on for a coarse (finger) pointer, off for a mouse', () => {
    expect(touchLayoutActive('auto', true)).toBe(true);
    expect(touchLayoutActive('auto', false)).toBe(false);
  });
  it('the per-workstation override wins either way (a touch laptop, or a desktop at a bench)', () => {
    expect(touchLayoutActive('on', false)).toBe(true);
    expect(touchLayoutActive('off', true)).toBe(false);
  });
  it('is stored per workstation, Auto by default, and an unknown value reads as Auto', () => {
    expect(readTouchLayoutMode()).toBe('auto');
    writeTouchLayoutMode('off');
    expect(readTouchLayoutMode()).toBe('off');
    writeTouchLayoutMode('on');
    expect(readTouchLayoutMode()).toBe('on');
    expect(parseTouchLayoutMode('sideways')).toBe('auto');
  });
});
