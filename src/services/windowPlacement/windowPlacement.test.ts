// src/services/windowPlacement/windowPlacement.test.ts — Batch 750 (S10 item 5): where a remembered window reopens.
import { describe, expect, it } from 'vitest';
import { geometryUsable, isWindowPositionTarget, placeOnScreens, screenOf } from './windowPlacement';

const PRIMARY = { left: 0, top: 0, width: 1920, height: 1040, isPrimary: true };
const RIGHT = { left: 1920, top: 0, width: 2560, height: 1400, isPrimary: false };

describe('placeOnScreens', () => {
  it('keeps a window on a screen that is still there', () => {
    const g = { left: 2100, top: 60, width: 1400, height: 900 };
    expect(screenOf(g, [PRIMARY, RIGHT])).toBe(RIGHT);
    expect(placeOnScreens(g, [PRIMARY, RIGHT])).toEqual(g);
  });
  it('moves a window whose screen has gone to the primary screen, centred and no larger than it', () => {
    expect(placeOnScreens({ left: 2100, top: 60, width: 2400, height: 900 }, [PRIMARY])).toEqual({ left: 0, top: 70, width: 1920, height: 900 });
  });
  it('uses the first screen when none is marked primary, and keeps the saved place when the screens are not known', () => {
    const only = { ...RIGHT, isPrimary: false };
    expect(placeOnScreens({ left: -3000, top: 0, width: 1000, height: 800 }, [only])).toEqual({ left: 1920 + 780, top: 300, width: 1000, height: 800 });
    const g = { left: 5000, top: 5000, width: 1000, height: 800 };
    expect(placeOnScreens(g, [])).toBe(g);
  });
  it('trims a window larger than its own screen', () => {
    expect(placeOnScreens({ left: 10, top: 10, width: 4000, height: 3000 }, [PRIMARY])).toEqual({ left: 10, top: 10, width: 1920, height: 1040 });
  });
});

describe('saved geometry and targets', () => {
  it('accepts numbers and a usable size only', () => {
    expect(geometryUsable({ left: 0, top: 0, width: 800, height: 600 })).toBe(true);
    expect(geometryUsable({ left: 0, top: 0, width: 50, height: 600 })).toBe(false);
    expect(geometryUsable({ left: '0', top: 0, width: 800, height: 600 })).toBe(false);
    expect(geometryUsable(null)).toBe(false);
  });
  it('only listed windows can be set up', () => {
    expect(isWindowPositionTarget('PathScribeSlideImage')).toBe(true);
    expect(isWindowPositionTarget('PathScribeEmr')).toBe(false);
    expect(isWindowPositionTarget('toString')).toBe(false);
    expect(isWindowPositionTarget(null)).toBe(false);
  });
});
