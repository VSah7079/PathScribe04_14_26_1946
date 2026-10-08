// @vitest-environment happy-dom
// Batch 368 (PS-353): every case write lands in the change log, attributed.
import { beforeEach, describe, expect, it } from 'vitest';
import { mockCaseService } from '../cases/mockCaseService';
import { mockReportChangeLogService } from './mockReportChangeLogService';
import { SESSION_PROFILE_STORAGE_KEY } from '../auth/sessionProfile';

describe('recording case saves', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(SESSION_PROFILE_STORAGE_KEY, JSON.stringify({ id: 'PATH-001', name: 'Dr Sarah Chen', role: 'pathologist' }));
  });

  it('writes one entry per save with who, when and what changed', async () => {
    const res = await mockCaseService.getAll();
    const target = (res.ok ? res.data : [])[0] as any;
    expect(target).toBeDefined();
    await mockCaseService.updateCase(target.id, { status: target.status === 'pending-review' ? 'in-progress' : 'pending-review' } as any);
    await new Promise(r => setTimeout(r, 0));
    const log = await mockReportChangeLogService.listForCase(target.id);
    expect(log.ok && log.data.length).toBe(1);
    const [entry] = log.ok ? log.data : [];
    expect(entry).toMatchObject({ caseId: target.id, userId: 'PATH-001', userName: 'Dr Sarah Chen' });
    expect(entry.changes).toEqual([expect.objectContaining({ area: 'case', path: ['status'] })]);
  });

  it('writes nothing when a save changes nothing', async () => {
    const res = await mockCaseService.getAll();
    const target = (res.ok ? res.data : [])[0] as any;
    await mockCaseService.updateCase(target.id, { status: target.status } as any);
    await new Promise(r => setTimeout(r, 0));
    const log = await mockReportChangeLogService.listForCase(target.id);
    expect(log.ok && log.data).toEqual([]);
  });

  it('PS-353: each entry records the workstation the save came from and the time of the save', async () => {
    localStorage.setItem('pathscribe_current_scan_station_id', 'WS-GROSS-02');
    const res = await mockCaseService.getAll();
    const target = (res.ok ? res.data : [])[1] as any;
    const before = Date.now();
    await mockCaseService.updateCase(target.id, { status: target.status === 'pending-review' ? 'in-progress' : 'pending-review' } as any);
    await new Promise(r => setTimeout(r, 0));
    const after = Date.now();
    const log = await mockReportChangeLogService.listForCase(target.id);
    const [entry] = log.ok ? log.data : [];
    expect(entry.stationId).toBe('WS-GROSS-02');
    // An ISO-8601 UTC instant taken at save time.
    expect(entry.at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    const at = Date.parse(entry.at);
    expect(at).toBeGreaterThanOrEqual(before);
    expect(at).toBeLessThanOrEqual(after);
  });

  it('PS-353: with no workstation lock, the signed-in user\'s home station is recorded; with neither, the station is null', async () => {
    localStorage.setItem(SESSION_PROFILE_STORAGE_KEY, JSON.stringify({ id: 'PATH-001', name: 'Dr Sarah Chen', role: 'pathologist', defaultScanStationId: 'WS-HOME-07' }));
    const res = await mockCaseService.getAll();
    const [a, b] = [(res.ok ? res.data : [])[2] as any, (res.ok ? res.data : [])[3] as any];
    await mockCaseService.updateCase(a.id, { status: a.status === 'pending-review' ? 'in-progress' : 'pending-review' } as any);
    await new Promise(r => setTimeout(r, 0));
    const logA = await mockReportChangeLogService.listForCase(a.id);
    expect(logA.ok && logA.data[0].stationId).toBe('WS-HOME-07');

    localStorage.setItem(SESSION_PROFILE_STORAGE_KEY, JSON.stringify({ id: 'PATH-001', name: 'Dr Sarah Chen', role: 'pathologist' }));
    await mockCaseService.updateCase(b.id, { status: b.status === 'pending-review' ? 'in-progress' : 'pending-review' } as any);
    await new Promise(r => setTimeout(r, 0));
    const logB = await mockReportChangeLogService.listForCase(b.id);
    expect(logB.ok && logB.data[0].stationId).toBeNull();
  });
});
