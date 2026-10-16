// src/services/cytology/cytologyRenderPayload.test.ts
// Batch 539 (PS-539 D2): the cytology report as the report renderer draws it,
// and the browser's request to the renderer.
import { describe, it, expect, vi } from 'vitest';
import type { CytologyReportContent } from '@/types/cytology/CytologyReportContent';
import { ENGLISH_CYTOLOGY_PDF_LABELS, buildCytologyPdfLabels } from './cytologyPdfLabels';
import { buildCytologyReportRenderPayload, cytologyReportDocument } from './cytologyRenderPayload';
import { CYTOLOGY_TEMPLATE_MISSING, cytologyPrintFailureKey, hasCytologyTemplateMarker, renderCytologyReportPdf } from './renderCytologyPdf';
import { buildCytologyCaseRenderPayload } from './cytologyRenderPayload';

const content = (over: Partial<CytologyReportContent> = {}): CytologyReportContent => ({
  patientName: 'Jane Doe', patientDateOfBirth: '1960-02-01', patientMrn: 'M-1', accessionNumber: 'C26-00042', orderingProvider: 'Dr Who',
  specimenCollectedAt: '2026-10-10T09:30:00Z', specimenTypeDescription: 'Cervical Pap', preparationMethod: 'Liquid-Based',
  specimenAdequacy: ['Satisfactory for evaluation.'], generalCategorization: 'Negative for intraepithelial lesion or malignancy',
  primaryInterpretation: 'NILM', additionalInterpretations: ['Candida present'], requiresPathologistReview: false,
  hpvResult: 'Positive (HPV 16)', computerAssistedScreening: { used: true, system: 'ThinPrep Imaging' },
  recommendations: ['Repeat in 12 months'], screenedBy: { name: 'CT One' },
  signedBy: { name: 'Dr A', isPathologist: true }, signedAt: '2026-10-12T15:00:00Z', language: 'en', locale: 'en-US',
  ...over,
});
const L = ENGLISH_CYTOLOGY_PDF_LABELS;
const MARKED = new TextEncoder().encode('%PDF-1.4 /Keywords (pathscribe-template:cytology)');

describe('cytologyReportDocument: the lines of one report, in order', () => {
  it('title, barcode, every section in the browser renderer\'s order, and the continuation identity', () => {
    const d = cytologyReportDocument(content(), L);
    expect(d.title).toBe(L.title);
    expect(d.barcode).toBe('C26-00042');
    expect(d.banner).toBeUndefined();
    expect(d.sections.map(s => s.heading)).toEqual([L.patient, L.specimenType, L.specimenAdequacy, L.generalCategorization, L.interpretation, L.adjunctive, L.recommendations, L.signOff]);
    const patient = d.sections[0].lines.map(l => l.text);
    expect(patient[0]).toMatch(/^Jane Doe · DOB .+ · MRN M-1$/);
    expect(patient[1]).toBe('Accession: C26-00042 · Ordering Provider: Dr Who');
    expect(patient[2]).toMatch(/^Collected: /);
    expect(d.sections[1].lines[0].text).toBe('Cervical Pap (Liquid-Based)');
    expect(d.sections[4].lines.map(l => l.text)).toEqual(['NILM', '• Candida present']);
    expect(d.sections[5].lines.map(l => l.text)).toEqual(['HPV: Positive (HPV 16)', 'Computer-Assisted Screening: Yes (ThinPrep Imaging)']);
    expect(d.sections[7].lines[0].text).toBe('Screened by: CT One');
    expect(d.sections[7].lines[1].text).toMatch(/^Signed by: Dr A, Pathologist — /);
    expect(d.continuation).toBe('Jane Doe · MRN M-1 · Accession: C26-00042');
  });

  it('a correction, an addendum and a preliminary say so under the title; an addendum can start its own page', () => {
    const corrected = cytologyReportDocument(content({ revision: { kind: 'correction', reason: 'Wrong site', previouslyReportedAs: 'LSIL' } }), L);
    expect(corrected.banner).toEqual([
      { text: 'CORRECTED REPORT', bold: true, size: 12 }, { text: 'Reason: Wrong site', size: 9 }, { text: 'Previously reported as: LSIL', size: 9 },
    ]);
    const addendum = cytologyReportDocument(content({ revision: { kind: 'addendum', reason: 'HPV result' }, addendumText: 'HPV 16 detected.', forceAddendumOnDedicatedPage: true }), L);
    expect(addendum.banner?.[0].text).toBe('ADDENDUM');
    expect(addendum.sections.find(s => s.heading === L.addendum)).toEqual({ heading: L.addendum, lines: [{ text: 'HPV 16 detected.' }], newPage: true });
    const prelim = cytologyReportDocument(content({ preliminary: { reason: 'criticalFinding', note: 'Call placed' } }), L);
    expect(prelim.banner?.map(b => b.text)).toEqual(['PRELIMINARY REPORT', L.preliminaryNotice, 'Reason: Critical finding', 'Note: Call placed']);
    expect(prelim.sections.slice(-1)[0].lines.slice(-1)[0].text).toMatch(/^Preliminary released by: Dr A, Pathologist, /);
  });

  it('the letterhead: name, address, director and CLIA, and the logo when it was fetched', () => {
    const branded = content({ printBranding: { facilityName: 'Desert Lab', address: '1 Main St', city: 'Tucson', state: 'AZ', directorName: 'Dr D', cliaOrIsoNumber: '03D0000000', headerLogoUrl: 'https://x/logo.png' } });
    expect(cytologyReportDocument(branded, L).branding).toEqual({ lines: [
      { text: 'Desert Lab', bold: true }, { text: '1 Main St, Tucson, AZ', size: 8 }, { text: 'Director: Dr D   CLIA/ISO: 03D0000000', size: 8 },
    ] });
    expect(cytologyReportDocument(branded, L, { 'https://x/logo.png': 'UE5H' }).branding?.logoBase64).toBe('UE5H');
  });

  it('the wording follows the report\'s labels (another language)', () => {
    const labels = buildCytologyPdfLabels((key, opts) => `FR:${key}` + (Object.keys(opts).filter(k => k !== 'interpolation').map(k => ` {{${k}}}`).join('')));
    const d = cytologyReportDocument(content(), labels);
    expect(d.title).toBe('FR:cytologyPdf.title');
    expect(d.sections[0].heading).toBe('FR:cytologyPdf.patient');
  });
});

describe('buildCytologyReportRenderPayload', () => {
  it('one document, the page label, metadata from the signing, and a preview\'s watermark only when asked', () => {
    const p = buildCytologyReportRenderPayload(content(), L);
    expect(p).toMatchObject({ template: 'cytology', outputFormat: 'pdf', language: 'en', pageLabel: 'Page {{page}} of {{total}}' });
    expect(p.metadata).toEqual({ title: 'Cytology Report — C26-00042', author: 'Dr A', subject: 'Cytology Report', timestamp: '2026-10-12T15:00:00Z' });
    expect(p.watermarkText).toBeUndefined();
    expect(buildCytologyReportRenderPayload(content(), L, { watermarkText: 'PRELIMINARY — SUBJECT TO CHANGE' }).watermarkText).toBe('PRELIMINARY — SUBJECT TO CHANGE');
  });

  it('preview and release send the same lines; only the watermark differs', () => {
    const release = buildCytologyReportRenderPayload(content(), L);
    const { watermarkText, ...preview } = buildCytologyReportRenderPayload(content(), L, { watermarkText: 'W' });
    expect(watermarkText).toBe('W');
    expect(preview).toEqual(release);
  });
});

describe('renderCytologyReportPdf (the request to the report renderer)', () => {
  it('sends the payload, returns the marked bytes, and passes the preview watermark', async () => {
    const post = vi.fn(async (_body: object) => MARKED);
    expect(await renderCytologyReportPdf(content(), { watermarkText: 'W' }, { post })).toBe(MARKED);
    expect(post.mock.calls[0][0]).toMatchObject({ template: 'cytology', watermarkText: 'W' });
  });

  it('a PDF without the cytology mark (a renderer from before Batch 539) is refused', async () => {
    await expect(renderCytologyReportPdf(content(), {}, { post: async () => new TextEncoder().encode('%PDF-1.4 blank surgical') })).rejects.toThrow(CYTOLOGY_TEMPLATE_MISSING);
    expect(hasCytologyTemplateMarker(MARKED)).toBe(true);
    expect(hasCytologyTemplateMarker(new Uint8Array([1, 2, 3]))).toBe(false);
  });

  it('fetches the letterhead logo once; one that can\'t be fetched leaves it out, never stops the report', async () => {
    const branded = content({ printBranding: { facilityName: 'Desert Lab', address: '1 Main St', headerLogoUrl: 'https://x/logo.png' } });
    const post = vi.fn(async (_body: object) => MARKED);
    const fetchLogo = vi.fn(async () => 'UE5H');
    await renderCytologyReportPdf(branded, {}, { post, fetchLogo });
    expect(fetchLogo).toHaveBeenCalledWith('https://x/logo.png');
    expect((post.mock.calls[0][0] as any).documents[0].branding.logoBase64).toBe('UE5H');
    await renderCytologyReportPdf(branded, {}, { post, fetchLogo: async () => undefined });
    expect((post.mock.calls[1][0] as any).documents[0].branding.logoBase64).toBeUndefined();
  });
});

describe('Batch 539 review fixes', () => {
  it('each document carries its own language and page label (a case report can mix languages)', () => {
    const labelsFor = (lang: string | undefined) => (lang === 'ko' ? { ...L, continuationPage: '{{total}}쪽 중 {{page}}쪽' } : L);
    const rec = (id: string, c: CytologyReportContent) => ({ id, caseId: 'C1', specimenId: id, reviewRecordId: id, signedAt: c.signedAt, signedBy: { userId: 'u', userName: 'Dr A', isPathologist: true }, reportContent: c }) as any;
    const p = buildCytologyCaseRenderPayload({ caseId: 'C1', accessionNumber: 'C26-1', language: 'en', complete: true, specimens: [
      { specimenId: 'A', label: 'A', record: rec('A', content()) },
      { specimenId: 'B', label: 'B', record: rec('B', content({ language: 'ko' })) },
    ] }, labelsFor);
    expect(p.documents.map(d => [d.language, d.pageLabel])).toEqual([['en', L.continuationPage], ['en', L.continuationPage], ['ko', '{{total}}쪽 중 {{page}}쪽']]);
  });

  it('an outdated renderer gets its own message; any other failure the general one', () => {
    expect(cytologyPrintFailureKey(new Error(CYTOLOGY_TEMPLATE_MISSING))).toBe('cytologyScreening.printRendererOutdated');
    expect(cytologyPrintFailureKey(new Error('The report renderer refused the request (500)'))).toBe('cytologyScreening.printFailed');
  });
});

describe('the browser and the renderer agree on the request (Batch 539)', () => {
  it('every field the payload builder sends is one functions/cytology_report.py reads', async () => {
    const { readFileSync } = await import('node:fs');
    const python = readFileSync('functions/cytology_report.py', 'utf8');
    const fields = ['documents', 'pageLabel', 'watermarkText', 'metadata', 'timestamp', 'title', 'barcode', 'banner', 'branding', 'logoBase64', 'lines', 'sections', 'heading', 'newPage', 'continuation', 'language', 'text', 'bold', 'size'];
    for (const f of fields) expect(python, f).toContain(`'${f}'`);
    expect(python).toContain(`CYTOLOGY_TEMPLATE_MARKER = '${'pathscribe-template:cytology'}'`);
  });
});
