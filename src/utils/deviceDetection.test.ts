// src/utils/deviceDetection.test.ts
import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  isConstrainedMobileDevice,
  hasDesktopViewOverride,
  setDesktopViewOverride,
  shouldRestrictToMobileWorkflow,
} from './deviceDetection';

// Real mocks, not jsdom (not installed in this project) - a minimal fake
// window/sessionStorage giving direct, explicit control over exactly the
// two signals this logic actually depends on, per scenario.
function mockWindow(innerWidth: number, pointerCoarse: boolean) {
  vi.stubGlobal('window', {
    innerWidth,
    matchMedia: (query: string) => ({
      matches: query === '(pointer: coarse)' ? pointerCoarse : false,
    }),
  });
}

function mockSessionStorage(initial: Record<string, string> = {}) {
  const store = { ...initial };
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
  });
  return store;
}

describe('isConstrainedMobileDevice — real device signal, not viewport width alone', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('a real phone (narrow + coarse pointer) is correctly detected', () => {
    mockWindow(390, true);
    expect(isConstrainedMobileDevice()).toBe(true);
  });

  it('a resized desktop browser (narrow width, but a real mouse/trackpad) is NOT treated as mobile — the whole point of combining both signals', () => {
    mockWindow(400, false);
    expect(isConstrainedMobileDevice()).toBe(false);
  });

  it('a wide window with a touch pointer (e.g. a large tablet in landscape) does not trigger the restriction — width still matters, not pointer type alone', () => {
    mockWindow(1024, true);
    expect(isConstrainedMobileDevice()).toBe(false);
  });

  it('a normal desktop (wide, fine pointer) is correctly not restricted', () => {
    mockWindow(1440, false);
    expect(isConstrainedMobileDevice()).toBe(false);
  });

  it('no window at all (SSR/non-browser context) degrades safely to false, not a crash', () => {
    vi.stubGlobal('window', undefined);
    expect(isConstrainedMobileDevice()).toBe(false);
  });
});

describe('desktop view override — the real escape hatch for when the heuristic gets it wrong', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('is false with no prior override set', () => {
    mockSessionStorage();
    expect(hasDesktopViewOverride()).toBe(false);
  });

  it('setDesktopViewOverride() genuinely persists for the rest of the session', () => {
    mockSessionStorage();
    expect(hasDesktopViewOverride()).toBe(false);
    setDesktopViewOverride();
    expect(hasDesktopViewOverride()).toBe(true);
  });

  it('a sessionStorage failure (e.g. private browsing edge cases) degrades to "no override" rather than throwing', () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
    });
    expect(() => hasDesktopViewOverride()).not.toThrow();
    expect(hasDesktopViewOverride()).toBe(false);
    expect(() => setDesktopViewOverride()).not.toThrow();
  });
});

describe('shouldRestrictToMobileWorkflow — the real, combined check the route guard actually uses', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('restricts a real phone with no override', () => {
    mockWindow(390, true);
    mockSessionStorage();
    expect(shouldRestrictToMobileWorkflow()).toBe(true);
  });

  it('a real phone with the override set is NOT restricted — the override genuinely wins', () => {
    mockWindow(390, true);
    mockSessionStorage();
    setDesktopViewOverride();
    expect(shouldRestrictToMobileWorkflow()).toBe(false);
  });

  it('a resized desktop window is never restricted, override or not — confirms the pointer check alone already rules it out', () => {
    mockWindow(400, false);
    mockSessionStorage();
    expect(shouldRestrictToMobileWorkflow()).toBe(false);
  });
});
