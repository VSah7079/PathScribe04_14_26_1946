import { describe, it, expect, vi } from 'vitest';
import type { RegistryAckDeps, RegistryQueueEntryView } from './recordRegistryAcknowledgement';
import { buildSimulatedAnswerBody, listSimulatableSubmissions, simulateRegistryAcknowledgement } from './simulateRegistryAcknowledgement';

const G1 = 'aaaaaaaa-0000-8000-8000-000000000001';
function setup() {
  const entries: RegistryQueueEntryView[] = [
    { id: 'c1', caseId: 'C1', registryId: 'csms_uk', status: 'SENT', registryStatus: 'awaitingAck', queuedAt: '2026-10-01T09:00:00Z', sentAt: '2026-10-01T09:00:00Z', maxRetriesExceeded: false, submission: { submissionGuid: G1 } } as any,
    { id: 'c2', caseId: 'C2', registryId: 'csms_uk', status: 'QUEUED', queuedAt: '2026-10-01T09:00:00Z', maxRetriesExceeded: false } as any,
  ];
  const q = { getAll: async () => ({ ok: true as const, data: entries }), setRegistryStatus: vi.fn(async (id: string, status: any) => { (entries.find(e => e.id === id) as any).registryStatus = status; }), markFailed: vi.fn() };
  const empty = { getAll: async () => ({ ok: true as const, data: [] }), setRegistryStatus: vi.fn(), markFailed: vi.fn() };
  const audits: any[] = [];
  const deps: RegistryAckDeps = { queues: { cytology: q as any, cancer: empty as any }, logAudit: e => audits.push(e), now: () => new Date('2026-10-01T12:00:00Z') };
  return { deps, audits, entries };
}

describe('simulated registry acknowledgement', () => {
  it('lists only submissions that were sent with a submission id', async () => {
    const { deps } = setup();
    expect(await listSimulatableSubmissions(deps)).toEqual([expect.objectContaining({ entryId: 'c1', submissionGuid: G1, queue: 'cytology' })]);
  });
  it.each([['accepted', 'accepted'], ['warnings', 'acceptedWithWarnings'], ['rejectedRecoverable', 'rejectedRecoverable'], ['rejectedFatal', 'rejectedFatal']] as const)('%s moves the status to %s and is audited as simulated', async (answer, status) => {
    const { deps, audits } = setup();
    const r = await simulateRegistryAcknowledgement(G1, answer, deps, 'T');
    expect(r).toMatchObject({ outcome: 'applied', registryStatus: status });
    expect(audits.some(a => a.event === 'Simulated Registry Answer' && a.detail.startsWith('SIMULATED'))).toBe(true);
  });
  it('silence changes nothing', async () => {
    const { deps, entries } = setup();
    expect((await simulateRegistryAcknowledgement(G1, 'silent', deps)).outcome).toBe('silent');
    expect((entries[0] as any).registryStatus).toBe('awaitingAck');
  });
  it('the body carries findings for warnings and rejections only', () => {
    expect(JSON.parse(buildSimulatedAnswerBody(G1, 'accepted')).findings).toEqual([]);
    expect(JSON.parse(buildSimulatedAnswerBody(G1, 'rejectedFatal')).findings[0].severity).toBe('FATAL');
  });
});
