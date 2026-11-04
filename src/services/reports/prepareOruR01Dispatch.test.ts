import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./buildOruR01Payload', () => ({ buildOruR01Payload: vi.fn() }));
import { buildOruR01Payload } from './buildOruR01Payload';
import { markWorkupVersionUnknown } from './oruWorkupVersion';
import { createReportVersionPdfReader } from './reportVersionPdf';
import { pdfSha256 } from '../reportDocuments/reportDocuments';
import { prepareOruR01Dispatch, heldMessage } from './prepareOruR01Dispatch';

const deps = (pdf?: string) => ({
  versions: { getByCaseId: vi.fn().mockResolvedValue({ ok: true, data: [] }) },
  store: { get: vi.fn().mockResolvedValue(pdf), put: vi.fn() },
});
beforeEach(() => { vi.mocked(buildOruR01Payload).mockReset(); vi.mocked(buildOruR01Payload).mockImplementation(async (_c, _i, _s, gen) => ({ messageId: 'm', reportPdfBase64: (await gen!()).pdfBase64 } as any)); });

describe('prepareOruR01Dispatch (Batch 392)', () => {
  it('builds the message with its PDF', async () => {
    const r = await prepareOruR01Dispatch('C', 'I', 'FINAL', { previouslyReportedAs: undefined }, deps('KEPT'));
    expect(r).toEqual({ ok: true, payload: { messageId: 'm', reportPdfBase64: 'KEPT' } });
  });
  it('forwards "previously reported as" for a correction', async () => {
    await prepareOruR01Dispatch('C', 'I', 'CORRECTED', { previouslyReportedAs: 'Benign.' }, deps('KEPT'));
    expect(vi.mocked(buildOruR01Payload).mock.calls[0][5]).toBe('Benign.');
  });
  it('without a PDF it is held, and the message is never built', async () => {
    const r = await prepareOruR01Dispatch('C', 'I', 'PRELIMINARY', {}, deps(undefined));
    expect(r).toEqual({ ok: false, reason: 'pdf_unavailable', error: heldMessage('No report PDF has been made for this result.') });
    expect(buildOruR01Payload).not.toHaveBeenCalled();
    expect(heldMessage('X.')).toBe('Held: the report PDF is not available. X. The result is sent with its PDF when retried.');
  });
  it('no case or instance: nothing to send', async () => {
    vi.mocked(buildOruR01Payload).mockResolvedValue(null);
    expect(await prepareOruR01Dispatch('C', 'I', 'FINAL', {}, deps('KEPT'))).toMatchObject({ ok: false, reason: 'not_found' });
  });
});

describe('prepareOruR01Dispatch (Batch 559)', () => {
  it('holds a result whose workup version is not known (the server\'s report versions couldn\'t all be read)', async () => {
    vi.mocked(buildOruR01Payload).mockImplementation(async () => markWorkupVersionUnknown({ messageId: 'm' }) as any);
    const r = await prepareOruR01Dispatch('C', 'I', 'FINAL', {}, deps('KEPT'));
    expect(r).toMatchObject({ ok: false, reason: 'version_unknown' });
    expect(r.ok === false && r.error).toContain('workup version is not known');
  });

  it('a signed version\'s PDF carries its fingerprint, on the message and for the queue entry', async () => {
    const PDF = btoa('%PDF-1.7 signed');
    const SHA = pdfSha256(PDF);
    const d = {
      versions: { getByCaseId: vi.fn().mockResolvedValue({ ok: true, data: [{ id: 'v1', caseId: 'C', versionNumber: 1, createdAt: '', mode: 'orchestration', trigger: 'initial_signout', createdBy: { userId: 'u', userName: 'U' }, instanceId: 'I', pdfBase64: PDF, pdfSha256: SHA }] }) },
      store: { get: vi.fn().mockResolvedValue(undefined), put: vi.fn() },
      versionPdf: createReportVersionPdfReader({}),
    };
    const r = await prepareOruR01Dispatch('C', 'I', 'FINAL', {}, d as any);
    expect(r).toEqual({ ok: true, payload: { messageId: 'm', reportPdfBase64: PDF, reportPdfSha256: SHA }, pdfSha256: SHA });
  });
});
