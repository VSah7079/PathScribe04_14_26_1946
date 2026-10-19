import { describe, expect, it } from 'vitest';
import { LEADER_CODE, isGlobalCategory, isLeaderPress, leaderEntries, leaderKeyOf, pickShortcutMatch, resolveLeaderPress, type KeyPress, type ShortcutCommand } from './shortcutResolution';

const key = (over: Partial<KeyPress>): KeyPress => ({ key: 'c', code: 'KeyC', altKey: false, ctrlKey: false, shiftKey: false, metaKey: false, ...over });
const cmd = (id: string, category: string, shortcut: string, label = id): ShortcutCommand => ({ id, category, label, shortcut });
const COMMANDS = [
  cmd('OPEN_CONFIGURATION', 'NAVIGATION', 'Alt+C', 'Open Configuration'),
  cmd('FROZEN', 'NAVIGATION', 'Alt+Shift+L', 'Frozen Section Cut'),
  cmd('GO_BACK', 'SYSTEM', 'Alt+ArrowLeft', 'Go Back'),
  cmd('COMP_ORDER_PLACE', 'SYNOPTIC', 'Alt+C', 'Place Computational Orders'),
];

describe('screen wins', () => {
  it('prefers the screen’s own command to an always-on one, in either order', () => {
    const screen = COMMANDS[3], global = COMMANDS[0];
    expect(pickShortcutMatch([global, screen])).toBe(screen);
    expect(pickShortcutMatch([screen, global])).toBe(screen);
  });
  it('runs the always-on command when nothing on the screen uses the key', () => {
    expect(pickShortcutMatch([COMMANDS[0]])).toBe(COMMANDS[0]);
    expect(pickShortcutMatch([])).toBeUndefined();
  });
  it('knows which categories are always on', () => {
    expect(isGlobalCategory('SYSTEM')).toBe(true);
    expect(isGlobalCategory('NAVIGATION')).toBe(true);
    expect(isGlobalCategory('SYNOPTIC')).toBe(false);
  });
});

describe('the Go to prefix key', () => {
  it('is Alt+J by physical key, whatever character the layout types', () => {
    expect(isLeaderPress(key({ altKey: true, key: 'j', code: LEADER_CODE }))).toBe(true);
    expect(isLeaderPress(key({ altKey: true, key: '∆', code: LEADER_CODE }))).toBe(true); // Mac Option+J
    expect(isLeaderPress(key({ altKey: true, key: 'j', code: 'KeyK' }))).toBe(false);
  });
  it('needs Alt and nothing else', () => {
    expect(isLeaderPress(key({ key: 'j', code: LEADER_CODE }))).toBe(false);
    expect(isLeaderPress(key({ altKey: true, ctrlKey: true, key: 'j', code: LEADER_CODE }))).toBe(false);
    expect(isLeaderPress(key({ altKey: true, shiftKey: true, key: 'J', code: LEADER_CODE }))).toBe(false);
    expect(isLeaderPress(key({ altKey: true, metaKey: true, key: 'j', code: LEADER_CODE }))).toBe(false);
  });
});

describe('the keys after the prefix', () => {
  it('takes the last key of the shortcut and keeps Shift', () => {
    expect(leaderKeyOf('Alt+C')).toBe('c');
    expect(leaderKeyOf('Alt+Shift+L')).toBe('shift+l');
    expect(leaderKeyOf('Alt+ArrowLeft')).toBe('arrowleft');
    expect(leaderKeyOf('Ctrl+Alt+Shift+A')).toBe('shift+a');
  });
  it('lists only always-on commands, once per key, with the key as printed', () => {
    const entries = leaderEntries(COMMANDS);
    expect(entries.map(e => e.display).sort()).toEqual(['ArrowLeft', 'C', 'Shift+L']);
    expect(entries.map(e => e.command.id)).not.toContain('COMP_ORDER_PLACE');
  });
  it('runs the command whose key is pressed, with Alt still held or not', () => {
    for (const altKey of [true, false]) {
      expect(resolveLeaderPress(COMMANDS, key({ key: 'c', altKey }))).toEqual({ kind: 'run', command: COMMANDS[0] });
    }
    expect(resolveLeaderPress(COMMANDS, key({ key: 'L', shiftKey: true }))).toEqual({ kind: 'run', command: COMMANDS[1] });
    expect(resolveLeaderPress(COMMANDS, key({ key: 'ArrowLeft' }))).toEqual({ kind: 'run', command: COMMANDS[2] });
  });
  it('matches the character printed on the key, so AZERTY and QWERTZ users press the letter they see', () => {
    expect(resolveLeaderPress(COMMANDS, key({ key: 'c', code: 'KeyC' })).kind).toBe('run');
    expect(resolveLeaderPress(COMMANDS, key({ key: 'c', code: 'KeyX' })).kind).toBe('run'); // a layout where C sits elsewhere
  });
  it('cancels on Escape, an unknown key, Ctrl or Meta, and never runs a screen command', () => {
    expect(resolveLeaderPress(COMMANDS, key({ key: 'Escape' }))).toEqual({ kind: 'cancel' });
    expect(resolveLeaderPress(COMMANDS, key({ key: 'z' }))).toEqual({ kind: 'cancel' });
    expect(resolveLeaderPress(COMMANDS, key({ key: 'c', ctrlKey: true }))).toEqual({ kind: 'cancel' });
    expect(resolveLeaderPress(COMMANDS, key({ key: 'c', metaKey: true }))).toEqual({ kind: 'cancel' });
  });
  it('keeps waiting when only a modifier is pressed', () => {
    for (const k of ['Alt', 'Shift', 'Control', 'Meta', 'AltGraph']) expect(resolveLeaderPress(COMMANDS, key({ key: k }))).toEqual({ kind: 'ignore' });
  });
});

// ── Batch 614: Mac Option and AltGr ──────────────────────────────────────────────────────────────────────────
import { effectiveKey, goToRouteOf, keyFromCode, leaderDisplayOf, matchesShortcut, shortcutFromPress } from './shortcutResolution';

describe('Mac Option and AltGr', () => {
  const altGr = (over: Partial<KeyPress>): KeyPress => key({ altKey: true, ctrlKey: true, getModifierState: n => n === 'AltGraph', ...over });

  it('reads a key from the physical key when Option changed the character (Mac Option+S types ß)', () => {
    const press = key({ key: 'ß', code: 'KeyS', altKey: true });
    expect(matchesShortcut(press, 'Alt+S')).toBe(true);
    expect(effectiveKey(press).producedText).toBe(true);
  });
  it('keeps the typed character on Windows and Linux, where Alt+S still types s (AZERTY keeps what is printed)', () => {
    const azertyA = key({ key: 'a', code: 'KeyQ', altKey: true });
    expect(matchesShortcut(azertyA, 'Alt+A')).toBe(true);
    expect(matchesShortcut(azertyA, 'Alt+Q')).toBe(false);
    expect(effectiveKey(azertyA).producedText).toBe(false);
  });
  it('reads digits and , . / from the physical key too (Option+1 types ¡, Option+. types ≥)', () => {
    expect(matchesShortcut(key({ key: '¡', code: 'Digit1', altKey: true }), 'Alt+1')).toBe(true);
    expect(matchesShortcut(key({ key: '≥', code: 'Period', altKey: true }), 'Alt+.')).toBe(true);
    expect(matchesShortcut(key({ key: '≤', code: 'Comma', altKey: true }), 'Alt+,')).toBe(true);
  });
  it('a Mac dead key (Option+E) is text, not a hotkey in a field, and still names the physical key', () => {
    const dead = key({ key: 'Dead', code: 'KeyE', altKey: true });
    expect(effectiveKey(dead)).toMatchObject({ key: 'e', alt: true, producedText: true });
  });
  it('AltGr (reported as Ctrl+Alt) counts as Alt, so it never fires a Ctrl+Alt shortcut by accident', () => {
    const press = altGr({ key: '@', code: 'KeyQ' });
    expect(matchesShortcut(press, 'Alt+Q')).toBe(true);
    expect(matchesShortcut(press, 'Ctrl+Alt+Q')).toBe(false);
    expect(effectiveKey(press).producedText).toBe(true);
  });
  it('a real left Ctrl+Alt still matches a Ctrl+Alt shortcut', () => {
    expect(matchesShortcut(key({ key: '1', code: 'Digit1', altKey: true, ctrlKey: true }), 'Ctrl+Alt+1')).toBe(true);
    expect(matchesShortcut(key({ key: '1', code: 'Digit1', altKey: true, ctrlKey: true }), 'Alt+1')).toBe(false);
  });
  it('named keys and modifiers are unchanged', () => {
    expect(matchesShortcut(key({ key: 'ArrowLeft', code: 'ArrowLeft', altKey: true }), 'Alt+ArrowLeft')).toBe(true);
    expect(matchesShortcut(key({ key: 'S', code: 'KeyS', altKey: true, shiftKey: true }), 'Alt+Shift+S')).toBe(true);
    expect(matchesShortcut(key({ key: 's', code: 'KeyS' }), 'Alt+S')).toBe(false);
    expect(matchesShortcut(key({ key: 's' }), '')).toBe(false);
  });
  it('the Go to prefix works on a Mac and on AltGr keyboards, and its second key too', () => {
    expect(isLeaderPress(key({ key: '∆', code: 'KeyJ', altKey: true }))).toBe(true);
    expect(isLeaderPress(altGr({ key: 'j', code: 'KeyJ' }))).toBe(true);
    const cfg = [cmd('OPEN_CONFIGURATION', 'NAVIGATION', 'Alt+C')];
    expect(resolveLeaderPress(cfg, key({ key: 'ç', code: 'KeyC', altKey: true })).kind).toBe('run');
  });
  it('recording a shortcut writes what the matcher reads', () => {
    expect(shortcutFromPress(key({ key: 'ß', code: 'KeyS', altKey: true }))).toBe('Alt+S');
    expect(shortcutFromPress(altGr({ key: '@', code: 'KeyQ' }))).toBe('Alt+Q');
    expect(shortcutFromPress(key({ key: '1', code: 'Digit1', altKey: true, ctrlKey: true }))).toBe('Ctrl+Alt+1');
    expect(shortcutFromPress(key({ key: ' ', code: 'Space', altKey: true }))).toBe('Alt+Space');
    expect(shortcutFromPress(key({ key: 'F5', code: 'F5', altKey: true, shiftKey: true }))).toBe('Alt+Shift+F5');
    expect(shortcutFromPress(key({ key: 'Alt', code: 'AltLeft', altKey: true }))).toBeNull();
  });
  it('maps physical keys', () => {
    expect(keyFromCode('KeyA')).toBe('a');
    expect(keyFromCode('Digit0')).toBe('0');
    expect(keyFromCode('BracketLeft')).toBe('[');
    expect(keyFromCode('F5')).toBeNull();
    expect(keyFromCode(undefined)).toBeNull();
  });
});

describe('the Go to route shown beside a command (cheat sheet and Actions tab)', () => {
  it('is the key after Alt+J for an always-on command, and nothing for a screen command', () => {
    expect(goToRouteOf({ category: 'NAVIGATION', shortcut: 'Alt+C' })).toBe('C');
    expect(goToRouteOf({ category: 'SYSTEM', shortcut: 'Alt+Shift+L' })).toBe('Shift+L');
    expect(goToRouteOf({ category: 'SYSTEM', shortcut: 'Alt+ArrowLeft' })).toBe('ArrowLeft');
    expect(goToRouteOf({ category: 'SYNOPTIC', shortcut: 'Alt+C' })).toBeNull();
    expect(goToRouteOf({ category: 'SYSTEM', shortcut: '' })).toBeNull();
    expect(leaderDisplayOf('Ctrl+Alt+Shift+Q')).toBe('Shift+Q');
  });
});
