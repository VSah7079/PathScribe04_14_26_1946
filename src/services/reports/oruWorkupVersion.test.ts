// src/services/reports/oruWorkupVersion.test.ts (Batch 559)
// A result's workup version is the number of signed versions for its workup. With the API server, a list of
// versions that couldn't all be read would number it too low, so the message is held instead.
import { describe, it, expect, vi } from 'vitest';

vi.mock('../cases/CaseRouter', () => ({ caseRouter: { getCase: vi.fn() } }));
vi.mock('../templates/templateService', () => ({ getTemplate: vi.fn().mockResolvedValue({ template: { sections: [] } }) }));
vi.mock('../reportTemplates/resolveFinalDiagnosisText', () => ({ resolveFinalDiagnosisText: vi.fn() }));
const versions = vi.hoisted(() => ({ getByCaseId: vi.fn() }));
vi.mock('./reportVersionInstance', () => ({ reportVersionService: versions }));

import { caseRouter } from '../cases/CaseRouter';
import { buildOruR01Payload } from './buildOruR01Payload';
import { workupVersionUnknown } from './oruWorkupVersion';

const theCase = {
  id: 'CASE-559', reportingMode: 'orchestrator',
  patient: { mrn: 'MRN-1', firstName: 'Jane', lastName: 'Doe', dateOfBirth: '1980-01-01' },
  synopticReports: [{ instanceId: 'INST-1', specimenId: 'SPEC-1', templateId: 'tpl-1', templateName: 'Template', status: 'finalized', answers: {} }],
};

describe('the workup version when the server\'s report versions can\'t all be read (Batch 559)', () => {
  it('flags the payload (never in what is sent) when the list was read only in part, or not at all', async () => {
    for (const res of [{ ok: true, data: [], meta: { partial: true } }, { ok: false, error: 'unavailable' }]) {
      vi.mocked(caseRouter.getCase).mockResolvedValueOnce(theCase as never);
      versions.getByCaseId.mockResolvedValueOnce(res);
      const payload = await buildOruR01Payload('CASE-559', 'INST-1', 'FINAL');
      expect(payload && workupVersionUnknown(payload)).toBe(true);
      expect(payload?.synopticResult).toBeUndefined();
      expect(JSON.stringify(payload)).not.toContain('workupVersionUnknown');
    }
  });

  it('does not flag a complete list', async () => {
    vi.mocked(caseRouter.getCase).mockResolvedValueOnce(theCase as never);
    versions.getByCaseId.mockResolvedValueOnce({ ok: true, data: [] });
    const payload = await buildOruR01Payload('CASE-559', 'INST-1', 'FINAL');
    expect(payload && workupVersionUnknown(payload)).toBe(false);
  });

  it('a preliminary has no workup, so it is never held for this', async () => {
    vi.mocked(caseRouter.getCase).mockResolvedValueOnce(theCase as never);
    versions.getByCaseId.mockResolvedValue({ ok: false, error: 'unavailable' });
    const payload = await buildOruR01Payload('CASE-559', 'INST-1', 'PRELIMINARY');
    expect(payload && workupVersionUnknown(payload)).toBe(false);
  });
});
