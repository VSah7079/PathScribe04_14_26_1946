// src/services/interfaceMonitoring/interfaceMonitoringContract.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 554 (PS-539 phase 2d; readiness review §9 item 4; INTERFACE_ENGINE_EDGE.md
// §9a): interface monitoring. Each hospital's interface engine (BridgeLink,
// hosted or on site) posts a heartbeat every minute with its listeners and
// channels (engineEdgeContract.ts). The API keeps the last one per engine and
// returns them here, with its own time, so staff see in the Interfaces view
// whether each listener is up and how much is waiting. No patient data.
// Pure: the wire types and the rules the screen uses.
// ─────────────────────────────────────────────────────────────────────────────
import { ENGINE_HEALTH_LIMITS, engineStatus, type EngineChannelStatus, type EngineHeartbeat, type EngineHosting, type EngineStatus } from '../interfaceEngine/engineEdgeContract';

/** One engine as `GET /api/interface/engines` returns it. */
export interface InterfaceEngineSummary {
  engineInstanceId: string;
  /** The hospital or site it serves, as named in its registration (data, not translated). */
  displayName?: string;
  hosting: EngineHosting;
  /** On-site engines: the performing lab (site) whose network it runs in. */
  siteId?: string;
  /** The last heartbeat and when the server received it; missing if it never checked in. */
  lastHeartbeat?: { heartbeat: EngineHeartbeat; receivedAt: string };
  /** Worked out by the server's clock (preferred); the browser works it out only when missing. */
  status?: EngineStatus;
}

/** `GET /api/interface/engines`. */
export interface InterfaceEnginesResponse {
  /** The server's time, so "offline" never depends on the workstation's clock. */
  serverTime: string;
  engines: InterfaceEngineSummary[];
}

export type InterfaceMonitoringError = 'NOT_PERMITTED' | 'UNAVAILABLE' | 'SIGNED_OUT';

/** Why a channel needs looking at, most serious first; null when it's fine. */
export type ChannelProblem = 'error' | 'stopped' | 'paused' | 'backlog' | 'deadLetters';

const STATUS_ORDER: Record<EngineStatus, number> = { offline: 0, degraded: 1, attention: 2, online: 3 };
const PROBLEM_ORDER: Record<ChannelProblem, number> = { error: 0, stopped: 1, paused: 2, backlog: 3, deadLetters: 4 };

export function channelProblem(c: EngineChannelStatus): ChannelProblem | null {
  if (c.state === 'error') return 'error';
  if (c.state === 'stopped') return 'stopped';
  if (c.state === 'paused') return 'paused';
  if ((c.oldestQueuedAgeSeconds ?? 0) > ENGINE_HEALTH_LIMITS.maxQueuedAgeMinutes * 60) return 'backlog';
  if (c.deadLetters > 0) return 'deadLetters';
  return null;
}

/** An engine's status: the server's, else worked out from its heartbeat against the server's time. */
export function interfaceEngineStatus(e: InterfaceEngineSummary, serverTime: string): EngineStatus {
  if (e.status && Object.prototype.hasOwnProperty.call(STATUS_ORDER, e.status)) return e.status;
  return engineStatus(e.lastHeartbeat, new Date(serverTime));
}

export interface EngineView {
  engine: InterfaceEngineSummary;
  status: EngineStatus;
  /** Channels with problems first, then inbound before outbound, then by id. */
  channels: (EngineChannelStatus & { problem: ChannelProblem | null })[];
  queued: number;
  deadLetters: number;
  /** Listeners (inbound channels) not started. */
  listenersDown: number;
}

/** The engines to show, the worst first. */
export function engineViews(res: InterfaceEnginesResponse): EngineView[] {
  return res.engines.map(engine => {
    const channels = (engine.lastHeartbeat?.heartbeat.channels ?? [])
      .map(c => ({ ...c, problem: channelProblem(c) }))
      .sort((a, b) => (a.problem ? PROBLEM_ORDER[a.problem] : 9) - (b.problem ? PROBLEM_ORDER[b.problem] : 9)
        || (a.direction === b.direction ? 0 : a.direction === 'inbound' ? -1 : 1)
        || a.channelId.localeCompare(b.channelId));
    return {
      engine,
      status: interfaceEngineStatus(engine, res.serverTime),
      channels,
      queued: channels.reduce((n, c) => n + Math.max(0, c.queued || 0), 0),
      deadLetters: channels.reduce((n, c) => n + Math.max(0, c.deadLetters || 0), 0),
      listenersDown: channels.filter(c => c.direction === 'inbound' && c.state !== 'started').length,
    };
  }).sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || (a.engine.displayName ?? a.engine.engineInstanceId).localeCompare(b.engine.displayName ?? b.engine.engineInstanceId));
}

/** The Interfaces view's line: engines by status, and what waits across them. */
export type EngineCounts = Record<EngineStatus, number> & { queued: number; deadLetters: number; listenersDown: number };

export function engineCounts(views: readonly EngineView[]): EngineCounts {
  const out = { online: 0, attention: 0, degraded: 0, offline: 0, queued: 0, deadLetters: 0, listenersDown: 0 };
  for (const v of views) { out[v.status] += 1; out.queued += v.queued; out.deadLetters += v.deadLetters; out.listenersDown += v.listenersDown; }
  return out;
}

/** The line's pieces, worst first, leaving out what is zero (each is shown with its own plural). */
export function engineLineParts(c: EngineCounts): { key: 'offline' | 'degraded' | 'listenersDown' | 'attention' | 'online' | 'queued'; count: number }[] {
  return (['offline', 'degraded', 'listenersDown', 'attention', 'online', 'queued'] as const)
    .map(key => ({ key, count: c[key] }))
    .filter(p => p.count > 0);
}

/** Whether the line should look like a problem: an engine offline or degraded, or a listener down. */
export function engineLineIsProblem(c: EngineCounts): boolean {
  return c.offline + c.degraded + c.listenersDown > 0;
}

/** Whether a response looks like this contract (a newer server's extra fields are fine). */
export function isEnginesResponse(x: unknown): x is InterfaceEnginesResponse {
  return !!x && typeof x === 'object' && typeof (x as InterfaceEnginesResponse).serverTime === 'string' && Array.isArray((x as InterfaceEnginesResponse).engines);
}

const count = (n: unknown): number => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);
const CHANNEL_STATES = ['started', 'stopped', 'paused', 'error'] as const;

/**
 * A response made safe to show: engines without an id and channels without an
 * id are dropped, counts that aren't numbers are 0, an unknown channel state
 * is 'error' (look at it), and a heartbeat without channels has none. One bad
 * row never stops the rest from showing.
 */
export function normaliseEnginesResponse(res: InterfaceEnginesResponse): InterfaceEnginesResponse {
  const engines: InterfaceEngineSummary[] = [];
  for (const raw of res.engines as unknown[]) {
    if (!raw || typeof raw !== 'object') continue;
    const e = raw as InterfaceEngineSummary;
    if (typeof e.engineInstanceId !== 'string' || !e.engineInstanceId) continue;
    const hb = e.lastHeartbeat?.heartbeat;
    const lastHeartbeat = hb && typeof hb === 'object' && typeof e.lastHeartbeat?.receivedAt === 'string' ? {
      receivedAt: e.lastHeartbeat.receivedAt,
      heartbeat: {
        ...hb,
        apiReachable: hb.apiReachable === true,
        diskFreePercent: typeof hb.diskFreePercent === 'number' && Number.isFinite(hb.diskFreePercent) ? hb.diskFreePercent : 0,
        channels: (Array.isArray(hb.channels) ? hb.channels : [])
          .filter((c): c is EngineChannelStatus => !!c && typeof c === 'object' && typeof c.channelId === 'string' && !!c.channelId)
          .map(c => ({
            ...c,
            direction: c.direction === 'outbound' ? 'outbound' as const : 'inbound' as const,
            state: (CHANNEL_STATES as readonly string[]).includes(c.state) ? c.state : 'error' as const,
            queued: count(c.queued),
            deadLetters: count(c.deadLetters),
            ...(c.oldestQueuedAgeSeconds !== undefined ? { oldestQueuedAgeSeconds: count(c.oldestQueuedAgeSeconds) } : {}),
          })),
      },
    } : undefined;
    engines.push({ ...e, hosting: e.hosting === 'onsite' ? 'onsite' : 'cloud', lastHeartbeat });
  }
  return { serverTime: res.serverTime, engines };
}
