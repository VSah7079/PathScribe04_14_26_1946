// src/services/liveUpdates/dataTopics.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 559 (PS-539 phase 2d; readiness review §5, "Push, not polling"): one
// hub event for the screens that today re-read on a timer. The server sends
// `DataChanged { topic, key }` after a committed write that changes what a
// topic's screen shows; the screen re-reads through its normal (authorised)
// service call, so the event carries ids only and never grants access.
//
// A connection says which topics (and, for keyed topics, which keys) it wants
// with `SetDataTopics`, which replaces the connection's whole data scope like
// SetIntraopScope does. The server checks each against the signed-in user and
// answers with what it accepted and refused.
//
// The rules here are pure and tested directly; the wire constants are in
// liveUpdateContract.ts (HUB_SET_DATA_TOPICS, HUB_DATA_CHANGED).
//
// Decided (Pete, Oct 14, 2026; Batch 571): this one event, on the one hub
// (/hubs/live), in place of ReceiveExceptionCountUpdate and a separate
// /hubs/quality-metrics. A screen that needs live updates in future gets a
// topic here, not an event of its own.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The topics, the screen each serves, and what its key is.
 *   registryExceptions  the registry exceptions badge; the user's organisation (no key)
 *   messages            the signed-in user's inbox (no key: the server sends to that user only)
 *   facilityOps         Facility Ops; key: facility id
 *   heldReleases        a case's reports waiting out the release delay (no key: a case id can be an
 *                       accession number, which hub messages never carry; the server sends it to the
 *                       organisation's users who can see held reports, and the report page re-reads its case)
 *   engravers           the Engraver Monitor (no key: it lists the organisation's engravers)
 *   siteAgents          Site agents and the Print Queue's agent line; key: site (facility) id
 *   interfaceEngines    Interfaces → Engines and the Interfaces line (no key)
 *   molecularQueue      Batch 562: the Molecular Workcenter's Order Queue (no key; proposed as
 *                       `molecularQueueChanged` in MOLECULAR_ORDERS_API.md §6)
 *   caseReport          Batch 572 (Pete, Oct 14, 2026): an open case report; key: the case's support
 *                       reference (SR-XXXX-XXXX: random, never derived from the case number, so no case
 *                       number travels on the hub). Sent after every committed write to the case,
 *                       organ-map figures included (in place of ORGAN_MAPPING_API.md's organMapFigureChanged)
 */
export const DATA_TOPICS = ['registryExceptions', 'messages', 'facilityOps', 'heldReleases', 'engravers', 'siteAgents', 'interfaceEngines', 'molecularQueue', 'caseReport'] as const;
export type DataTopic = typeof DATA_TOPICS[number];

/** Topics whose events name a key, and whose subscriptions must list the keys they want. */
export const KEYED_DATA_TOPICS: readonly DataTopic[] = ['facilityOps', 'siteAgents', 'caseReport'];

/** Limits on what a connection asks for; the server refuses larger scopes. */
export const DATA_KEY_MAX_LENGTH = 200;
export const DATA_KEYS_PER_TOPIC_MAX = 100;

export const isDataTopic = (x: unknown): x is DataTopic => typeof x === 'string' && (DATA_TOPICS as readonly string[]).includes(x);
export const isKeyedDataTopic = (t: DataTopic) => KEYED_DATA_TOPICS.includes(t);

/** One subscription: a topic and, for a keyed topic, the keys wanted (none: nothing arrives). */
export interface DataTopicSubscription { topic: DataTopic; keys?: readonly string[] }

/** What a connection asks the hub for: each topic once, with the union of its keys, sorted. */
export interface DataTopicScope { topics: { topic: DataTopic; keys: string[] }[] }

/** The hub's answer to SetDataTopics. */
export interface SetDataTopicsResult {
  accepted: { topic: DataTopic; keys: string[] }[];
  rejected: { topic: DataTopic; keys: string[] }[];
}

export interface DataChangedEvent {
  type: 'DataChanged';
  v: number;
  eventId: string;
  topic: DataTopic;
  /**
   * The facility or site for a keyed topic, or the case's support reference for `caseReport` (Batch 572);
   * absent otherwise. Never a patient identifier.
   */
  key?: string;
  occurredAt: string;
}

const cleanKeys = (keys: readonly string[] | undefined) =>
  [...new Set((keys ?? []).map(k => k.trim()).filter(k => k && k.length <= DATA_KEY_MAX_LENGTH))].sort();

/** The single data scope a connection sends: the union of its subscribers', in a stable order. */
export function combineDataScopes(subs: readonly DataTopicSubscription[]): DataTopicScope {
  const byTopic = new Map<DataTopic, Set<string>>();
  for (const s of subs) {
    if (!isDataTopic(s.topic)) continue;
    const keys = byTopic.get(s.topic) ?? new Set<string>();
    if (isKeyedDataTopic(s.topic)) for (const k of cleanKeys(s.keys)) keys.add(k);
    byTopic.set(s.topic, keys);
  }
  return {
    topics: DATA_TOPICS.filter(t => byTopic.has(t))
      // A keyed topic with no keys asks for nothing, so it isn't sent.
      .filter(t => !isKeyedDataTopic(t) || byTopic.get(t)!.size > 0)
      .map(t => ({ topic: t, keys: [...byTopic.get(t)!].sort().slice(0, DATA_KEYS_PER_TOPIC_MAX) })),
  };
}

/** A stable text for a data scope, to tell whether it changed. */
export function dataScopeKey(scope: DataTopicScope): string {
  return scope.topics.length ? JSON.stringify(scope.topics) : '';
}

/** Whether an event is one a subscription asked for. */
export function dataEventMatches(event: DataChangedEvent, sub: DataTopicSubscription): boolean {
  if (event.topic !== sub.topic) return false;
  if (!isKeyedDataTopic(sub.topic)) return true;
  return !!event.key && cleanKeys(sub.keys).includes(event.key);
}

/**
 * How often a screen still re-reads on its own: its usual interval without a
 * live connection (the local transport, or the hub unreachable), and only as a
 * safety net while live: at least `safetyMs`, never more often than it did.
 */
export function dataPollIntervalMs(live: boolean, screenPollMs: number, safetyMs: number): number {
  return live ? Math.max(screenPollMs, safetyMs) : screenPollMs;
}

/**
 * Batch 560: whether the hub's answer to SetDataTopics took this subscription: its topic accepted and, for a
 * keyed topic, every key it asked for. An answer that can't be read counts as not taken (the screen keeps
 * polling at its own interval).
 */
export function dataSubscriptionAccepted(result: unknown, sub: DataTopicSubscription): boolean {
  const accepted = result && typeof result === 'object' && Array.isArray((result as SetDataTopicsResult).accepted) ? (result as SetDataTopicsResult).accepted : null;
  if (!accepted) return false;
  const entry = accepted.find(a => a && a.topic === sub.topic);
  if (!entry) return false;
  if (!isKeyedDataTopic(sub.topic)) return true;
  const keys = Array.isArray(entry.keys) ? entry.keys : [];
  const wanted = cleanKeys(sub.keys);
  return wanted.length > 0 && wanted.every(k => keys.includes(k));
}

/** Batch 560: a screen re-reads at most once a second, plus up to a second at random so a whole organisation's
 *  screens don't all read at the same instant after one event. */
export const DATA_READ_MIN_GAP_MS = 1_000;
export const DATA_READ_JITTER_MS = 1_000;

/** How long to wait before an event-driven re-read, given how long ago the last read started. */
export function dataReadDelayMs(sinceLastReadMs: number, coalesceMs: number, random: () => number = Math.random): number {
  return Math.max(coalesceMs, DATA_READ_MIN_GAP_MS - sinceLastReadMs) + Math.round(random() * DATA_READ_JITTER_MS);
}

/**
 * Batch 560: how long a screen that shows "out of date" may go without a successful read: two of its
 * current read intervals. While live, a quiet minute is normal, so the allowance is the safety poll's.
 */
export function dataStaleAfterMs(live: boolean, screenPollMs: number, safetyMs: number): number {
  return 2 * dataPollIntervalMs(live, screenPollMs, safetyMs);
}
