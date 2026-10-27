// src/services/help/helpTargets.test.ts — Batch 668: which guide pages the top-bar Help buttons open.
import { describe, it, expect } from 'vitest';
import { isPlainLeftClick, resolveHelpTargets } from './helpTargets';

describe('resolveHelpTargets', () => {
  it('a screen with only a User Guide article has no Administrator Guide button', () => {
    const t = resolveHelpTargets('/worklist', '', '/');
    expect(t.userSlug).toBe('worklist');
    expect(t.userUrl).toBe('/help/worklist');
    expect(t.adminUrl).toBeNull();
  });
  it('a screen with both guides gets both, and the Administrator Guide opens in the interface language', () => {
    const t = resolveHelpTargets('/lockbox-drop-off', '', '/', 'fr');
    expect(t.userSlug).toBe('lockbox-drop-off');
    expect(t.adminAnchor).toBe('screen-lockbox-drop-off');
    expect(t.adminUrl).toContain('/fr/');
  });
  it('follows the Audit Log tab for the Administrator Guide', () => {
    expect(resolveHelpTargets('/audit', '?tab=financial', '/').adminAnchor).toBe('screen-audit-financial');
  });
  it('a screen with no article shows no User Guide button, but F1 still has the contents page to open', () => {
    const t = resolveHelpTargets('/configuration', '', '/');
    expect(t.userSlug).toBeNull();
    expect(t.userUrl).toBe('/help');
  });
});

describe('isPlainLeftClick', () => {
  it('only a plain left click opens the remembered window', () => {
    const e = { metaKey: false, ctrlKey: false, shiftKey: false, button: 0 };
    expect(isPlainLeftClick(e)).toBe(true);
    expect(isPlainLeftClick({ ...e, ctrlKey: true })).toBe(false);
    expect(isPlainLeftClick({ ...e, button: 1 })).toBe(false);
  });
});
