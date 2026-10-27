// src/services/surgicalSignOut/completeAssistFinalize.test.ts
// Batch 649 follow-up: the Assist Finalize signature is recorded after the version, linked to it.
import { describe, it, expect, vi } from 'vitest';
import type { ReportVersionRecord } from '@/types/reports/ReportVersionRecord';
import { completeAssistFinalize } from './completeAssistFinalize';

const version = { id: 'V1', versionNumber: 3, pdfSha256: 'abc' } as unknown as ReportVersionRecord;
const make = (o: Partial<Parameters<typeof completeAssistFinalize>[0]> = {}) => ({
  finalize: vi.fn(async () => true),
  release: vi.fn(async (onVersion: (v: ReportVersionRecord) => void) => { onVersion(version); }),
  commitSignature: vi.fn(async () => ({ id: 'S1' }) as never),
  ...o,
});

describe('completeAssistFinalize', () => {
  it('records the signature after the version, linked to its id, number and hash', async () => {
    const d = make();
    expect(await completeAssistFinalize(d)).toBe(true);
    expect(d.commitSignature).toHaveBeenCalledWith({ kind: 'report-version', id: 'V1', versionNumber: 3, pdfSha256: 'abc' });
    expect(vi.mocked(d.release).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(d.commitSignature).mock.invocationCallOrder[0]);
  });

  it('a case that was not finalized records nothing', async () => {
    const d = make({ finalize: vi.fn(async () => false) });
    expect(await completeAssistFinalize(d)).toBe(false);
    expect(d.release).not.toHaveBeenCalled();
    expect(d.commitSignature).not.toHaveBeenCalled();
  });

  it('with no version written, the signature is still recorded, unlinked', async () => {
    const d = make({ release: vi.fn(async () => undefined) });
    expect(await completeAssistFinalize(d)).toBe(true);
    expect(d.commitSignature).toHaveBeenCalledWith(undefined);
  });

  it('a release step that throws still records the signature, unlinked', async () => {
    const d = make({ release: vi.fn(async () => { throw new Error('boom'); }) });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await completeAssistFinalize(d)).toBe(true);
    expect(d.commitSignature).toHaveBeenCalledWith(undefined);
  });
});
