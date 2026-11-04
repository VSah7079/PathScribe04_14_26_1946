// src/services/reports/resolveReportWatermark.test.ts
import { describe, it, expect, vi } from 'vitest';
import { reportWatermarkKind, resolveReportWatermarkText, PRELIMINARY_WATERMARK_KEY } from './resolveReportWatermark';
import en from '@/i18n/locales/en.json';

describe('report watermark (Batch 516, PS-283)', () => {
  it('a print before sign-out is preliminary; after, none; in the release buffer, the buffer mark', () => {
    for (const s of ['draft', 'in-progress', 'pathologist-review', 'pending-countersign', 'finalizing', undefined]) {
      expect(reportWatermarkKind(s, 'print'), String(s)).toBe('preliminary');
    }
    expect(reportWatermarkKind('finalized', 'print')).toBeNull();
    expect(reportWatermarkKind('closed', 'print')).toBeNull();
    expect(reportWatermarkKind('pending-release', 'print')).toBe('release-buffer');
  });

  it('the final snapshot made at sign-out is never marked preliminary', () => {
    expect(reportWatermarkKind('in-progress', 'final-snapshot')).toBeNull();
  });

  it('Batch 540: a released PDF never carries the release-delay mark, even made during the delay (it is what goes out)', () => {
    expect(reportWatermarkKind('pending-release', 'final-snapshot')).toBeNull();
    expect(reportWatermarkKind('pending-release', 'print')).toBe('release-buffer');
  });

  it('resolves the text: Pete\'s wording, or the organisation\'s buffer text (fetched only when needed)', async () => {
    const releaseBufferText = vi.fn(async () => '  PENDING FINAL RELEASE  ');
    const t = (k: string) => (k === PRELIMINARY_WATERMARK_KEY ? en.reportWatermark.preliminary : k);
    expect(await resolveReportWatermarkText({ status: 'in-progress', purpose: 'print' }, { releaseBufferText, t })).toBe('PRELIMINARY — SUBJECT TO CHANGE');
    expect(releaseBufferText).not.toHaveBeenCalled();
    expect(await resolveReportWatermarkText({ status: 'pending-release', purpose: 'print' }, { releaseBufferText, t })).toBe('PENDING FINAL RELEASE');
    expect(await resolveReportWatermarkText({ status: 'finalized', purpose: 'print' }, { releaseBufferText, t })).toBeUndefined();
  });
});
