// src/services/interfaceMonitoring/simulatedInterfaceMonitoringApi.ts
// ─────────────────────────────────────────────────
// Batch 605: with no API server (the demo) there is no engine and no
// GET /api/interface/engines. This supplies four sample engines, one in each
// status (online, attention, degraded, offline), with channels and heartbeats
// timed from now. The screens label them Simulated. With an API server this
// is not used.
// ─────────────────────────────────────────────────
import type { EngineHeartbeat } from '../interfaceEngine/engineEdgeContract';
import type { IInterfaceMonitoringApi } from './interfaceMonitoringService';
import type { InterfaceEngineSummary } from './interfaceMonitoringContract';

const iso = (ms: number) => new Date(ms).toISOString();

function hb(id: string, hosting: 'cloud' | 'onsite', over: Partial<EngineHeartbeat>): EngineHeartbeat {
  return { v: 1, engineInstanceId: id, hosting, imageVersion: 'sim-1.0.0', apiReachable: true, diskFreePercent: 62, channels: [], ...over };
}

/** The sample engines, with heartbeats relative to `now`. Pure. */
export function sampleEngines(now: number): InterfaceEngineSummary[] {
  const ok = (channelId: string, direction: 'inbound' | 'outbound') => ({ channelId, direction, state: 'started' as const, queued: 0, deadLetters: 0 });
  const mk = (id: string, name: string, hosting: 'cloud' | 'onsite', ageSec: number, over: Partial<EngineHeartbeat>): InterfaceEngineSummary => ({
    engineInstanceId: id, displayName: name, hosting, lastHeartbeat: { heartbeat: hb(id, hosting, over), receivedAt: iso(now - ageSec * 1000) },
  });
  return [
    mk('sim-engine-cloud-1', 'Simulated cloud engine (online)', 'cloud', 20, { channels: [ok('adt-in', 'inbound'), ok('orders-in', 'inbound'), ok('results-out', 'outbound')] }),
    mk('sim-engine-onsite-1', 'Simulated on-site engine (attention)', 'onsite', 35, { channels: [ok('adt-in', 'inbound'), { ...ok('results-out', 'outbound'), deadLetters: 2 }] }),
    mk('sim-engine-onsite-2', 'Simulated on-site engine (degraded)', 'onsite', 40, { apiReachable: false, diskFreePercent: 9, channels: [ok('adt-in', 'inbound'), { channelId: 'orders-out', direction: 'outbound', state: 'error', queued: 14, oldestQueuedAgeSeconds: 2400, deadLetters: 0 }] }),
    mk('sim-engine-cloud-2', 'Simulated cloud engine (offline)', 'cloud', 900, { channels: [ok('adt-in', 'inbound')] }),
  ];
}

export const simulatedInterfaceMonitoringApi: IInterfaceMonitoringApi = {
  async engines() {
    const now = Date.now();
    return { ok: true, data: { serverTime: iso(now), engines: sampleEngines(now) } };
  },
};
