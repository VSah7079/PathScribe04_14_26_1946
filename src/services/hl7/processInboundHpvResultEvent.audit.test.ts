// Batch 629 (PS-174): an inbound hrHPV result is audited by its key, with no patient data, and an Invalid result is stored as Invalid.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getCase, updateCase } = vi.hoisted(() => ({ getCase: vi.fn(), updateCase: vi.fn() }));
vi.mock('@/services/cases/CaseRouter', () => ({ caseRouter: { getCase, updateCase } }));
const { logEvent } = vi.hoisted(() => ({ logEvent: vi.fn() }));
vi.mock('../auditlog/mockAuditService', () => ({ mockAuditService: { logEvent } }));

import { processInboundHpvResultEvent, _resetProcessedHpvMessageIdsForTests } from './processInboundHpvResultEvent';

const CASE = { id: 'S26-5001-CYT-001', specimens: [{ id: 'S26-5001-SP-1', label: 'A', cytologyScreening: {} }], order: { priority: 'Routine' } };
const payload = (over = {}) => ({
  messageId: 'msg-a', timestamp: '2026-10-19T00:00:00.000Z', organisationId: 'org-1',
  accessionNumber: 'S26-5001-CYT-001', specimenLetter: 'A', hrHpvResult: 'Positive' as const, abnormalFlag: 'A' as const, ...over,
});

beforeEach(() => {
  getCase.mockReset(); updateCase.mockReset(); logEvent.mockReset();
  getCase.mockResolvedValue(CASE); updateCase.mockResolvedValue(undefined); logEvent.mockResolvedValue(undefined);
  _resetProcessedHpvMessageIdsForTests();
});

describe('inbound hrHPV result audit and Invalid result (PS-174)', () => {
  it('an applied result is audited with the message key and no patient identifier', async () => {
    await processInboundHpvResultEvent(payload());
    expect(logEvent).toHaveBeenCalledTimes(1);
    const entry = logEvent.mock.calls[0][0];
    expect(entry.event).toBe('hrHPV Result Received');
    expect(entry.caseId).toBe('S26-5001-CYT-001');
    expect(entry.detail).toContain('msg-a');
    expect(entry.detail).not.toMatch(/mrn|patient/i);
  });

  it('a refused or repeated message is not audited as applied', async () => {
    await processInboundHpvResultEvent(payload({ accessionNumber: '' }));
    await processInboundHpvResultEvent(payload());
    await processInboundHpvResultEvent(payload());
    expect(logEvent).toHaveBeenCalledTimes(1);
  });

  it('an Invalid result is stored as Invalid, so the triage row can say a repeat test is needed', async () => {
    const out = await processInboundHpvResultEvent(payload({ messageId: 'msg-i', hrHpvResult: 'Invalid', abnormalFlag: undefined }));
    expect(out.outcome).toBe('applied');
    expect(updateCase.mock.calls[0][1].specimens[0].cytologyScreening.hpvResult).toBe('Invalid');
  });

  it('Batch 630: an interface result is stored as coming from the interface and replaces a manual entry still waiting for a second sign-off', async () => {
    getCase.mockResolvedValue({ ...CASE, specimens: [{ id: 'S26-5001-SP-1', label: 'A', cytologyScreening: { hpvPendingOverride: { result: 'Positive' } } }] });
    await processInboundHpvResultEvent(payload({ messageId: 'msg-src' }));
    const screening = updateCase.mock.calls[0][1].specimens[0].cytologyScreening;
    expect(screening.hpvResultSource).toBe('INTERFACE');
    expect(screening.hpvPendingOverride).toBeUndefined();
  });

  it('Batch 631: a separately reported HPV 18 keeps the 18/45 group consistent', async () => {
    await processInboundHpvResultEvent(payload({ messageId: 'msg-g', genotypeDetail: { hpv16: false, hpv18Or45: false, otherHighRisk: false, hpv18: true } }));
    expect(updateCase.mock.calls[0][1].specimens[0].cytologyScreening.hpvGenotypeDetail).toMatchObject({ hpv18: true, hpv18Or45: true });
  });
});
