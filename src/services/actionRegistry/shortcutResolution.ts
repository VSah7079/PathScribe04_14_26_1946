// src/services/actionRegistry/shortcutResolution.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 602 (Pete, Oct 17, 2026): which command a hotkey runs when more than one is active.
//
// The rule: THE SCREEN IN FOCUS WINS.
//   • Commands in the SYSTEM and NAVIGATION categories are active on every screen. Commands in a screen's own
//     category are active only on that screen. When a key matches both, the screen's command runs.
//   • So the always-on command a screen shadows is still reachable: press the "Go to" key (Alt+J), then the
//     always-on command's own key (for Configuration, which is Alt+C, press C). The prefix works the same on
//     every screen and runs nothing until the second key.
//   • Two always-on commands can't share a key (context can't tell them apart), and neither can two commands of
//     the same screen. A test enforces both (actionRegistry/actionsCoverage.guard.test.ts).
//
// Layout independence: the prefix is recognised by the physical key (event.code KeyJ), because on a Mac Option+J
// types a different character and event.key would not say "j". The second key is matched by what is printed on the
// key (event.key), the same letters the hint panel shows, so it is right on QWERTY, AZERTY and QWERTZ alike.
//
// Pure: no clock, storage or DOM.
// ─────────────────────────────────────────────────────────────────────────────

/** Categories whose commands are active on every screen. */
export const GLOBAL_CATEGORIES: ReadonlySet<string> = new Set(['SYSTEM', 'NAVIGATION']);

/** How long the "Go to" prefix waits for its second key before it gives up. */
export const LEADER_TIMEOUT_MS = 3000;

/** The physical key of the "Go to" prefix, pressed with Alt. */
export const LEADER_CODE = 'KeyJ';

export const isGlobalCategory = (category: string): boolean => GLOBAL_CATEGORIES.has(category);

/** The fields of a keyboard event this module reads. */
export interface KeyPress {
  key: string;
  code?: string;
  altKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
  /** The browser's own modifier query; AltGr is reported through it ('AltGraph'). Optional so tests can omit it. */
  getModifierState?(name: string): boolean;
}

// ── Mac Option and AltGr (Batch 614) ─────────────────────────────────────────────────────────────────────────
// On a Mac, Option+S types a different character, and on a European keyboard AltGr (reported as Ctrl+Alt) does
// too, so matching Alt shortcuts on the typed character (event.key) misses them. Two rules fix it:
//   1. AltGr is treated as the Alt key it is. Windows reports the right Alt as Ctrl+Alt; when the browser says
//      AltGraph is down, Ctrl is not counted. (A Ctrl+Alt shortcut is then pressed with the left Ctrl and Alt.)
//   2. With Alt down, a letter, digit or , . / key is read from the physical key (event.code) when the typed
//      character is not the same kind of character. On Windows and Linux, where Alt+S still types "s", the
//      typed character is used, so AZERTY and QWERTZ keep matching what is printed on the key.

/** What a physical key is, for the keys shortcuts use: KeyS -> "s", Digit4 -> "4", Comma -> ",". */
export function keyFromCode(code: string | undefined): string | null {
  if (!code) return null;
  const letter = /^Key([A-Z])$/.exec(code);
  if (letter) return letter[1].toLowerCase();
  const digit = /^Digit([0-9])$/.exec(code);
  if (digit) return digit[1];
  return ({ Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Quote: "'", BracketLeft: '[', BracketRight: ']', Minus: '-', Equal: '=' } as Record<string, string>)[code] ?? null;
}

const SHORTCUT_PUNCTUATION = new Set([',', '.', '/', ';', "'", '[', ']', '-', '=']);

export interface EffectiveKey {
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
  /** Lower-case key name as shortcuts spell it: "s", "4", ",", "arrowleft", "enter". */
  key: string;
  /** True when Option or AltGr made the key type a different character: in a text field that is typing, not a hotkey. */
  producedText: boolean;
}

/** The modifiers and key a press means for shortcut matching, with the Mac Option and AltGr rules applied. */
export function effectiveKey(e: KeyPress): EffectiveKey {
  const altGr = !!e.getModifierState?.('AltGraph');
  const alt = e.altKey || altGr;
  const ctrl = altGr ? false : e.ctrlKey;
  let key = e.key.toLowerCase();
  let producedText = false;
  if (alt) {
    const typedIsPlain = key.length === 1 && (/^[a-z0-9]$/.test(key) || SHORTCUT_PUNCTUATION.has(key));
    const physical = keyFromCode(e.code);
    producedText = !typedIsPlain && (key.length === 1 || key === 'dead') && !!physical;
    if (!typedIsPlain && physical) key = physical;
  }
  return { ctrl, alt, shift: e.shiftKey, meta: e.metaKey, key, producedText };
}

/** A key that cannot be typing even without a modifier: a function key (F1 to F24). Batch 658: View Help is F1. */
export function isFunctionKeyPress(e: Pick<KeyPress, 'key'>): boolean {
  return /^F([1-9]|1\d|2[0-4])$/.test(e.key);
}

/** Does this key press match a shortcut written like "Ctrl+Alt+Shift+S" or "Alt+ArrowLeft"? */
export function matchesShortcut(e: KeyPress, shortcut: string): boolean {
  if (!shortcut) return false;
  const parts = shortcut.split('+').map(p => p.trim().toLowerCase());
  const want = parts.find(p => !['ctrl', 'shift', 'alt', 'meta'].includes(p)) ?? '';
  const got = effectiveKey(e);
  return got.ctrl === parts.includes('ctrl') && got.shift === parts.includes('shift') && got.alt === parts.includes('alt')
    && got.meta === parts.includes('meta') && got.key === want;
}

/** A recorded key press written as a shortcut ("Alt+S"), using the same rules, so what is recorded is what matches. */
export function shortcutFromPress(e: KeyPress): string | null {
  if (['Control', 'Alt', 'Shift', 'Meta', 'AltGraph'].includes(e.key)) return null;
  const k = effectiveKey(e);
  const names: Record<string, string> = { ' ': 'Space' };
  const printed = k.key === ' ' ? 'Space' : names[k.key] ?? (k.key.length === 1 ? k.key.toUpperCase() : e.key);
  return [k.ctrl && 'Ctrl', k.alt && 'Alt', k.shift && 'Shift', k.meta && 'Meta', printed].filter(Boolean).join('+');
}

/** A command as far as hotkeys are concerned. */
export interface ShortcutCommand {
  id: string;
  category: string;
  label: string;
  shortcut: string;
}

/** Among commands that all match the pressed key, the screen's own command beats an always-on one. */
export function pickShortcutMatch<T extends { category: string }>(matches: readonly T[]): T | undefined {
  return matches.find(a => !isGlobalCategory(a.category)) ?? matches[0];
}

/** The screen's own commands first, then the always-on ones, each in their existing order. Used for voice matching. */
export function screenFirst<T extends { category: string }>(commands: readonly T[]): T[] {
  return [...commands.filter(a => !isGlobalCategory(a.category)), ...commands.filter(a => isGlobalCategory(a.category))];
}

/** Alt+J, with no other modifier. */
export function isLeaderPress(e: KeyPress): boolean {
  const k = effectiveKey(e);
  return k.alt && !k.ctrl && !k.meta && !k.shift && (e.code === LEADER_CODE || (e.code === undefined && e.key.toLowerCase() === 'j'));
}

/** The key that follows the prefix for a command: its shortcut's last key, with Shift kept. "Alt+Shift+L" -> shift+l. */
export function leaderKeyOf(shortcut: string): string {
  const parts = shortcut.split('+').map(p => p.trim().toLowerCase()).filter(Boolean);
  const key = parts.find(p => !['ctrl', 'alt', 'shift', 'meta'].includes(p)) ?? '';
  return (parts.includes('shift') ? 'shift+' : '') + key;
}

/** The key as the hint panel and the cheat sheet show it after Alt+J: "C", "Shift+L", "ArrowLeft". */
export function leaderDisplayOf(shortcut: string): string {
  const parts = shortcut.split('+').map(x => x.trim()).filter(Boolean);
  const shift = parts.some(x => x.toLowerCase() === 'shift');
  const token = parts.find(x => !['ctrl', 'alt', 'shift', 'meta'].includes(x.toLowerCase())) ?? '';
  const shown = token.length === 1 ? token.toUpperCase() : token;
  return shift ? `Shift+${shown}` : shown;
}

/** The "Go to" route to an always-on command ("C" for Alt+J, then C), or null for a screen command. */
export function goToRouteOf(command: { category: string; shortcut: string }): string | null {
  return isGlobalCategory(command.category) && command.shortcut ? leaderDisplayOf(command.shortcut) : null;
}

/** What a key press means after the prefix, as a lookup key. */
function pressedLeaderKey(e: KeyPress): string {
  return (e.shiftKey ? 'shift+' : '') + effectiveKey(e).key;
}

const MODIFIER_KEYS = new Set(['Alt', 'Control', 'Shift', 'Meta', 'AltGraph', 'CapsLock']);

export interface LeaderEntry {
  /** What the hint panel shows: "C", "Shift+L", "ArrowLeft". */
  display: string;
  leaderKey: string;
  command: ShortcutCommand;
}

/** The always-on commands the prefix reaches, in a stable order. */
export function leaderEntries(commands: readonly ShortcutCommand[]): LeaderEntry[] {
  const out: LeaderEntry[] = [];
  const seen = new Set<string>();
  for (const command of commands) {
    if (!isGlobalCategory(command.category) || !command.shortcut) continue;
    const leaderKey = leaderKeyOf(command.shortcut);
    if (!leaderKey || seen.has(leaderKey)) continue;
    seen.add(leaderKey);
    out.push({ display: leaderDisplayOf(command.shortcut), leaderKey, command });
  }
  return out.sort((a, b) => a.command.label.localeCompare(b.command.label));
}

export type LeaderResult =
  | { kind: 'ignore' }                       // a modifier on its own: keep waiting
  | { kind: 'cancel' }                       // Escape, or a key that is not on the list
  | { kind: 'run'; command: ShortcutCommand };

/** Resolves the key pressed after the prefix. Alt may still be held; Ctrl or Meta cancel. */
export function resolveLeaderPress(commands: readonly ShortcutCommand[], e: KeyPress): LeaderResult {
  if (MODIFIER_KEYS.has(e.key)) return { kind: 'ignore' };
  if (e.key === 'Escape' || e.ctrlKey || e.metaKey) return { kind: 'cancel' };
  const hit = leaderEntries(commands).find(entry => entry.leaderKey === pressedLeaderKey(e));
  return hit ? { kind: 'run', command: hit.command } : { kind: 'cancel' };
}
