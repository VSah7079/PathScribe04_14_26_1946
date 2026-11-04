// src/services/liveUpdates/casePresence.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 573 (Pete, Oct 14, 2026: a live topic for an open case, "including
// presence"): who else has a case report open, and whether they are editing
// (have unsaved changes). The contract (LIVE_UPDATES_SIGNALR.md §15) and the
// rules the screen uses, kept pure so both transports and the hook share them.
//
//   - A case is named by its support reference (`SR-XXXX-XXXX`), never its
//     case number, as for the `caseReport` topic (§14).
//   - Each open report is one presence, with a random id made by the browser
//     (one per window and case). The hub sends the whole list of presences
//     for the case each time it changes; the browser leaves its own out.
//   - With the hub, a presence lasts as long as its connection: the server
//     removes it when the connection drops, and the browser joins again after
//     every reconnection. Without the hub (the demo), this browser's windows
//     tell each other through a BroadcastChannel, with a heartbeat.
//   - Staff names and work contact details are not patient data (Pete's
//     decision); no patient identifier is ever sent.
// ─────────────────────────────────────────────────────────────────────────────

export const CASE_PRESENCE_CONTRACT_VERSION = 1;
/** client → server: `JoinCasePresence(CasePresenceJoin)` → `CasePresenceJoinResult`. */
export const HUB_JOIN_CASE_PRESENCE = 'JoinCasePresence';
/** client → server: `SetCasePresenceEditing(ref, presenceId, editing)`. */
export const HUB_SET_CASE_PRESENCE_EDITING = 'SetCasePresenceEditing';
/** client → server: `LeaveCasePresence(ref, presenceId)`. */
export const HUB_LEAVE_CASE_PRESENCE = 'LeaveCasePresence';
/** server → client: `CasePresenceChanged(CasePresenceChangedEvent)`. */
export const HUB_CASE_PRESENCE_CHANGED = 'CasePresenceChanged';

/** At most this many presences in one list (the server sends no more; the browser ignores the rest). */
export const CASE_PRESENCE_MAX_VIEWERS = 50;
const MAX_TEXT = 200;

export interface CasePresenceViewer {
  /** The browser window's own random id for this open case. */
  presenceId: string;
  userId: string;
  /** The person's display name (staff names are not patient data). */
  name: string;
  /** True while they have unsaved changes on the case. */
  editing: boolean;
  /** When they opened it (the server's clock). */
  since: string;
  /** Work email and phone from the staff directory, when the lab has them. */
  email?: string;
  phone?: string;
}

export interface CasePresenceJoin {
  /** The case's support reference. */
  ref: string;
  presenceId: string;
  editing: boolean;
}

export interface CasePresenceJoinResult {
  /** False for a reference that doesn't exist and for a case the user may not open, alike. */
  accepted: boolean;
  /**
   * The id the server lists this presence under (its own, unique per connection, so nobody can take
   * another's id); the browser recognises itself by it. Absent: the id the browser sent.
   */
  presenceId?: string;
  viewers?: CasePresenceViewer[];
}

export interface CasePresenceChangedEvent {
  v: number;
  ref: string;
  viewers: CasePresenceViewer[];
}

/** Who this window is: the hub knows it from the token; the demo's windows have to say it themselves. */
export interface CasePresenceSelf {
  userId: string;
  name: string;
  email?: string;
  phone?: string;
}

/** Who this window is, from the signed-in user (null when nobody is signed in: then no presence). */
export function casePresenceSelf(user: { id?: string; name?: string; email?: string } | null | undefined): CasePresenceSelf | null {
  if (!user?.id || !user.name) return null;
  return { userId: user.id, name: user.name, ...(user.email ? { email: user.email } : {}) };
}

/**
 * What a transport tells the hook: everyone with the case open, this window included, and the id this
 * window is listed under. An empty list means not connected (or refused): this window is always in a
 * list it is part of.
 */
export type CasePresenceListener = (viewers: CasePresenceViewer[], ownPresenceId: string) => void;

export interface CasePresenceHandle {
  setEditing(editing: boolean): void;
  leave(): void;
}

const text = (v: unknown, max = MAX_TEXT): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
/** A plain address only (nothing that could add `?cc=` or `&body=` to a mailto: link). */
const EMAIL = /^[^\s@?&#%<>"'\\]+@[^\s@?&#%<>"'\\]+\.[^\s@?&#%<>"'\\]+$/;
/** Digits and the usual separators, with an optional extension ("x123", "ext. 123"). */
const PHONE = /^\+?[0-9 ()./-]{3,30}(?:\s*(?:x|ext\.?)\s*[0-9]{1,6})?$/i;

export function parseCasePresenceViewer(raw: unknown): CasePresenceViewer | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (!text(r.presenceId) || !text(r.userId) || !text(r.name) || typeof r.editing !== 'boolean' || !text(r.since)) return null;
  return {
    presenceId: r.presenceId, userId: r.userId, name: r.name.trim(), editing: r.editing, since: r.since,
    ...(text(r.email) && EMAIL.test(r.email.trim()) ? { email: r.email.trim() } : {}),
    ...(text(r.phone, 40) && PHONE.test(r.phone.trim()) ? { phone: r.phone.trim() } : {}),
  };
}

/** The viewers in a list from the hub (or another window); bad entries are left out, one per presence. */
export function parseCasePresenceViewers(raw: unknown): CasePresenceViewer[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: CasePresenceViewer[] = [];
  for (const item of raw.slice(0, CASE_PRESENCE_MAX_VIEWERS)) {
    const v = parseCasePresenceViewer(item);
    if (!v || seen.has(v.presenceId)) continue;
    seen.add(v.presenceId);
    out.push(v);
  }
  return out;
}

export function parseCasePresenceChangedEvent(raw: unknown): CasePresenceChangedEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (r.v !== CASE_PRESENCE_CONTRACT_VERSION || !text(r.ref) || !Array.isArray(r.viewers)) return null;
  return { v: CASE_PRESENCE_CONTRACT_VERSION, ref: r.ref, viewers: parseCasePresenceViewers(r.viewers) };
}

export function newPresenceId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  return c?.randomUUID ? c.randomUUID() : `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export type CasePresenceOther = CasePresenceViewer & {
  /** The signed-in user in another window of their own ("You, in another window"; no contact links). */
  self: boolean;
};

/**
 * Everyone else with the case open, from this window's point of view: its own presence left out; those
 * editing first, then the earliest to open it. The same person in another window of their own is kept
 * (opening a case twice is a common way to get a refused save), marked `self`.
 */
export function otherViewers(viewers: readonly CasePresenceViewer[], ownPresenceId: string, ownUserId: string | null): CasePresenceOther[] {
  return viewers
    .filter(v => v.presenceId !== ownPresenceId)
    .map(v => ({ ...v, self: !!ownUserId && v.userId === ownUserId }))
    .sort((a, b) => (a.editing === b.editing ? a.since.localeCompare(b.since) || a.presenceId.localeCompare(b.presenceId) : a.editing ? -1 : 1));
}

export type CasePresenceChangeKind = 'joined' | 'editing' | 'left';
export interface CasePresenceChange { kind: CasePresenceChangeKind; name: string; self: boolean }

/**
 * What to tell a screen-reader user about a change in who has the case open (one message, the most
 * useful): someone starting to edit, else someone opening it, else someone closing it. Null when nothing
 * worth saying changed (a heartbeat, or someone stopping editing).
 */
export function casePresenceChange(before: readonly CasePresenceViewer[] | null, after: readonly CasePresenceViewer[], ownUserId: string | null): CasePresenceChange | null {
  // The first list after joining (or after a reconnection) is the starting point, not news: people already
  // there didn't just open the case.
  if (before === null) return null;
  const was = new Map(before.map(v => [v.presenceId, v]));
  const now = new Set(after.map(v => v.presenceId));
  const make = (kind: CasePresenceChangeKind, v: CasePresenceViewer): CasePresenceChange => ({ kind, name: v.name, self: !!ownUserId && v.userId === ownUserId });
  const startedEditing = after.find(v => v.editing && (!was.get(v.presenceId) || !was.get(v.presenceId)!.editing));
  if (startedEditing) return make('editing', startedEditing);
  const joined = after.find(v => !was.has(v.presenceId));
  if (joined) return make('joined', joined);
  const left = before.find(v => !now.has(v.presenceId));
  if (left) return make('left', left);
  return null;
}

// ── The demo's stand-in (no hub): this browser's windows, through a BroadcastChannel ──

export const LOCAL_PRESENCE_CHANNEL = 'pathscribe-case-presence';
/** Each window says it is still there this often… */
export const LOCAL_PRESENCE_HEARTBEAT_MS = 10_000;
/**
 * …and is dropped after this long without a word (a window closed without saying goodbye). Longer than
 * the once-a-minute timers a browser allows a tab hidden for a while, so a background window doesn't
 * come and go; a window also speaks up as soon as it is shown again.
 */
export const LOCAL_PRESENCE_EXPIRE_MS = 150_000;

export type LocalPresenceMessage =
  | { kind: 'casePresence'; op: 'here'; ref: string; viewer: CasePresenceViewer; ask?: boolean }
  | { kind: 'casePresence'; op: 'leave'; ref: string; presenceId: string };

export function parseLocalPresenceMessage(raw: unknown): LocalPresenceMessage | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (r.kind !== 'casePresence' || !text(r.ref)) return null;
  if (r.op === 'leave') return text(r.presenceId) ? { kind: 'casePresence', op: 'leave', ref: r.ref, presenceId: r.presenceId } : null;
  if (r.op !== 'here') return null;
  const viewer = parseCasePresenceViewer(r.viewer);
  return viewer ? { kind: 'casePresence', op: 'here', ref: r.ref, viewer, ...(r.ask === true ? { ask: true } : {}) } : null;
}

/** The presences still alive at `now` (heard from within the expiry). */
export function liveLocalViewers(heard: ReadonlyMap<string, { viewer: CasePresenceViewer; at: number }>, now: number): CasePresenceViewer[] {
  return [...heard.values()].filter(h => now - h.at <= LOCAL_PRESENCE_EXPIRE_MS).map(h => h.viewer);
}
