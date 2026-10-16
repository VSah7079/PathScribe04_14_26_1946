// src/services/cytology/generateCytologyReportPdfSnapshot.test.ts
// Batch 539: one cytology report's PDF, made by the report renderer, as { pdfBase64 } or { generationError }.
import { describe, it, expect, vi } from 'vitest';
import { generateCytologyReportPdfSnapshot } from './generateCytologyReportPdfSnapshot';
import type { CytologyReportContent } from '@/types/cytology/CytologyReportContent';

const content = {
  patientName: 'Jane Doe', accessionNumber: 'C26-1', specimenTypeDescription: 'Pap', specimenAdequacy: [], primaryInterpretation: 'NILM',
  additionalInterpretations: [], recommendations: [], requiresPathologistReview: false,
  signedBy: { name: 'Dr A', isPathologist: true }, signedAt: '2026-10-12T15:00:00Z',
} as CytologyReportContent;
const marked = (extra = '') => new TextEncoder().encode(`%PDF-1.4 ${extra}/Keywords (pathscribe-template:cytology)`);

describe('generateCytologyReportPdfSnapshot (Batch 539: the report renderer)', () => {
  it('posts the cytology payload and returns the bytes as base64', async () => {
    const post = vi.fn(async () => marked());
    const result = await generateCytologyReportPdfSnapshot(content, { post });
    expect(result).toEqual({ pdfBase64: Buffer.from(marked()).toString('base64') });
    expect(post).toHaveBeenCalledWith(expect.objectContaining({ template: 'cytology', metadata: expect.objectContaining({ timestamp: '2026-10-12T15:00:00Z' }) }));
  });

  it('a large PDF converts in chunks, unchanged', async () => {
    const big = new Uint8Array(200_000).fill(65);
    big.set(marked(), 0);
    const result = await generateCytologyReportPdfSnapshot(content, { post: async () => big });
    expect(Buffer.from(result.pdfBase64!, 'base64').equals(Buffer.from(big))).toBe(true);
  });

  it('a refusal, or a renderer without the cytology template, is an error, never a blank report', async () => {
    expect(await generateCytologyReportPdfSnapshot(content, { post: async () => { throw new Error('The report renderer refused the request (503)'); } }))
      .toEqual({ generationError: 'The report renderer refused the request (503)' });
    const old = await generateCytologyReportPdfSnapshot(content, { post: async () => new TextEncoder().encode('%PDF-1.4 surgical page') });
    expect(old.pdfBase64).toBeUndefined();
    expect(old.generationError).toContain('functions/ deployment needs updating');
  });
});
