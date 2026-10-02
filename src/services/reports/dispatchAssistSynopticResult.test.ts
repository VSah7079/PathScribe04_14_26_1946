// src/services/reports/dispatchAssistSynopticResult.test.ts
import { describe, it, expect, vi } from 'vitest';
import { dispatchAssistSynopticResult, dispatchAssistCaseRelease, prepareAssistSynopticMessage, embeddedLisHeader, rebuildAssistSynopticMessage, type AssistSynopticDeps } from './dispatchAssistSynopticResult';
import { workupChanges, buildWorkupRenderPayload, buildCombinedRenderPayload, renderWorkupPdf } from './workupPdf';

function setup(opts: { pdf?: boolean; send?: boolean; mode?: string; combined?: boolean } = {}) {
  const c: any = {
    id: 'S26-1', reportingMode: opts.mode ?? 'assist', accession: { fullAccession: 'S26-0001' },
    patient: { id: 'P1', mrn: 'MRN-9', firstName: 'Jane', lastName: 'Doe', dateOfBirth: '1960-01-01' },
    order: { placerOrderNumber: 'ORD-1', fillerOrderNumber: 'LIS-1' },
    specimens: [{ id: 'sp1', label: 'A', description: 'Colon' }],
    synopticReports: [
      { instanceId: 'i1', specimenId: 'sp1', templateId: 't', templateName: 'Colon', status: 'finalized', answers: { size: '3.0' } },
      { instanceId: 'i2', specimenId: 'sp1', templateId: 't', templateName: 'Colon', status: 'draft', answers: {} },
    ],
  };
  const entries: any[] = [];
  const renders: any[] = [];
  const sent: any[] = [];
  const deps: AssistSynopticDeps = {
    getCase: async () => c,
    getTemplate: async () => ({ id: 't', name: 'Colon Resection', version: '4.2', sections: [{ fields: [{ id: 'size', label: 'Tumor size', type: 'numeric', unit: 'cm' }] }] }),
    getNpi: async () => '1234567890',
    organisationIdForPatient: async () => 'ORG-1',
    queue: {
      getByCaseId: async () => ({ ok: true as const, data: entries }),
      enqueue: async e => { const x = { ...e, id: `Q${entries.length + 1}`, status: 'QUEUED' as const, queuedAt: 'now', retryCount: 0, maxRetriesExceeded: false }; entries.push(x); return { ok: true as const, data: x }; },
      markSent: async id => { entries.find(e => e.id === id).status = 'SENT'; },
      markFailed: async (id, f) => { Object.assign(entries.find(e => e.id === id), { status: 'FAILED', ...f }); },
    },
    dispatch: vi.fn(async (_id, payload) => { sent.push(payload); return opts.send === false ? { ok: false, errorCode: 'DISPATCH_UNREACHABLE', error: 'engine down' } : { ok: true }; }),
    renderPdf: async p => { renders.push(p); return opts.pdf === false ? { generationError: 'renderer offline' } : { pdfBase64: 'JVBERi0=' }; },
    reportLanguage: async () => ({ language: 'en', formatDate: (s: string) => `D(${s})`, formatDob: (s?: string) => `B(${s})` }),
    codeVersions: () => ({}),
    now: () => '2026-10-01T18:00:00.000Z',
    consolidatePdfs: async () => !!opts.combined,
  };
  return { c, deps, entries, renders, sent };
}
const signer = { id: 'u1', name: 'Dr A' };

describe('Assist synoptic dispatch (Batch 426)', () => {
  it('Finalize: the finalized workup goes to the LIS with its structured result, its own PDF and the text block; once only', async () => {
    const { deps, entries, sent, renders } = setup();
    expect(await dispatchAssistCaseRelease('S26-1', signer, deps)).toEqual([{ instanceId: 'i1', outcome: 'sent' }]);
    expect(entries).toEqual([expect.objectContaining({ kind: 'final', instanceId: 'i1', organisationId: 'ORG-1', workupVersion: 1, status: 'SENT', signer: { ...signer, signedAt: '2026-10-01T18:00:00.000Z' } })]);
    const msg = sent[0];
    expect(msg).toMatchObject({ kind: 'final', transactionStatusFlag: 'A', workupPdf: { documentId: 'PSR-S26-1-i1-V1', contentType: 'application/pdf', base64: 'JVBERi0=' } });
    expect(msg.synopticResult.header).toMatchObject({ workup_status: 'FINAL', workup_version: 1, placer_order_number: 'ORD-1', specimen_ids: ['A'] });
    expect(msg.fullPayloadText).toBe('--- SYNOPTIC REPORT: COLON (Transmitted: 2026-10-01 18:00 UTC) ---\n\nTumor size: 3.0 cm');
    expect(renders[0]).toMatchObject({ caseHeader: { accession: 'S26-0001', patient: 'Doe, Jane', mrn: 'MRN-9', dob: 'B(1960-01-01)' }, workup: { parts: ['A'], status: 'FINAL', version: 1, signedBy: 'Dr A', documentId: 'PSR-S26-1-i1-V1' } });
    expect(await dispatchAssistCaseRelease('S26-1', signer, deps)).toEqual([{ instanceId: 'i1', outcome: 'alreadySent' }]);
  });
  it('a correction is version 2 and says what changed, in the text and the PDF', async () => {
    const { c, deps, entries, sent, renders } = setup();
    await dispatchAssistSynopticResult({ caseId: 'S26-1', instanceId: 'i1', kind: 'final', signer }, deps);
    c.synopticReports[0].answers = { size: '3.5' };
    expect(await dispatchAssistSynopticResult({ caseId: 'S26-1', instanceId: 'i1', kind: 'corrected', signer }, deps)).toMatchObject({ outcome: 'sent', version: 2 });
    expect(entries[1]).toMatchObject({ kind: 'corrected', workupVersion: 2 });
    expect(sent[1].synopticResult.header).toMatchObject({ workup_status: 'CORRECTED', pdf_document_id: 'PSR-S26-1-i1-V2' });
    expect(sent[1].fullPayloadText).toContain('Changed in this version:\nTumor size: 3.0 cm → 3.5 cm');
    expect(renders[1].workup.changes).toEqual([{ label: 'Tumor size', from: '3.0 cm', to: '3.5 cm' }]);
  });
  it('no PDF: queued and held, not sent (Batch 392 rule); the dead-letter retry rebuilds it', async () => {
    const { deps, entries } = setup({ pdf: false });
    const r = await dispatchAssistSynopticResult({ caseId: 'S26-1', instanceId: 'i1', kind: 'final', signer }, deps);
    expect(r.outcome).toBe('held');
    expect(entries[0]).toMatchObject({ status: 'FAILED', maxRetriesExceeded: false });
    expect(entries[0].errorMessage).toContain('renderer offline');
    expect(deps.dispatch).not.toHaveBeenCalled();
    deps.renderPdf = async () => ({ pdfBase64: 'AA==' });
    const again = await prepareAssistSynopticMessage({ caseId: 'S26-1', instanceId: 'i1', kind: 'final', version: 1, signer: { ...signer, signedAt: 'x' } }, deps);
    expect(again.ok).toBe(true);
  });
  it('undelivered: FAILED with the engine\'s reason; not an Assist case: nothing', async () => {
    const failing = setup({ send: false });
    expect((await dispatchAssistSynopticResult({ caseId: 'S26-1', instanceId: 'i1', kind: 'final', signer }, failing.deps)).outcome).toBe('failed');
    expect(failing.entries[0]).toMatchObject({ status: 'FAILED', errorCode: 'DISPATCH_UNREACHABLE', errorMessage: 'engine down' });
    const orch = setup({ mode: 'orchestrator' });
    expect((await dispatchAssistSynopticResult({ caseId: 'S26-1', instanceId: 'i1', kind: 'final', signer }, orch.deps)).outcome).toBe('notAssist');
    expect(await dispatchAssistCaseRelease('S26-1', signer, orch.deps)).toEqual([]);
  });
  it('Batch 427, one PDF per case: workups carry no PDF of their own and name the case PDF, sent once per release', async () => {
    const { c, deps, entries, sent, renders } = setup({ combined: true });
    c.synopticReports[1].status = 'finalized';
    c.synopticReports[1].answers = { size: '1.2' };
    expect(await dispatchAssistCaseRelease('S26-1', signer, deps)).toEqual([
      { instanceId: 'i1', outcome: 'sent' }, { instanceId: 'i2', outcome: 'sent' }, { instanceId: '', outcome: 'sent' },
    ]);
    expect(sent.slice(0, 2).every(m => !m.workupPdf && m.synopticResult.header.pdf_document_id === 'PSR-S26-1-CASE-V1')).toBe(true);
    expect(sent[2]).toMatchObject({ kind: 'case_pdf', casePdf: { documentId: 'PSR-S26-1-CASE-V1', base64: 'JVBERi0=' }, workups: [{ pathscribe_report_id: 'PSR-S26-1-i1', workup_version: 1 }, { pathscribe_report_id: 'PSR-S26-1-i2', workup_version: 1 }] });
    expect(renders).toHaveLength(1);
    expect(renders[0].workups.map((w: any) => w.synopticAnswers[0].displayValue)).toEqual(['3.0 cm', '1.2 cm']);
    expect(entries.map(e => [e.kind, e.workupVersion])).toEqual([['final', 1], ['final', 1], ['case_pdf', 1]]);
    // A correction to one part: its structured result, then the whole case PDF again as version 2, with what changed.
    c.synopticReports[0].answers = { size: '3.5' };
    await dispatchAssistSynopticResult({ caseId: 'S26-1', instanceId: 'i1', kind: 'corrected', signer }, deps);
    expect(sent[3].synopticResult.header).toMatchObject({ workup_status: 'CORRECTED', workup_version: 2, pdf_document_id: 'PSR-S26-1-CASE-V2' });
    expect(sent[4]).toMatchObject({ kind: 'case_pdf', casePdf: { documentId: 'PSR-S26-1-CASE-V2' } });
    expect(renders[1].workups[0]).toMatchObject({ status: 'CORRECTED', version: 2, changes: [{ label: 'Tumor size', from: '3.0 cm', to: '3.5 cm' }] });
    // The dead-letter retry rebuilds a case PDF message.
    expect(await rebuildAssistSynopticMessage(entries[2], deps)).toMatchObject({ kind: 'case_pdf', casePdf: { documentId: 'PSR-S26-1-CASE-V1' } });
  });
  it('Batch 427: no combined PDF means the case PDF is held, while the structured results still go', async () => {
    const { deps, entries } = setup({ combined: true, pdf: false });
    await dispatchAssistCaseRelease('S26-1', signer, deps);
    expect(entries.map(e => [e.kind, e.status])).toEqual([['final', 'SENT'], ['case_pdf', 'FAILED']]);
    expect(entries[1].errorMessage).toContain('renderer offline');
  });

  it('the text header per kind', () => {
    expect(embeddedLisHeader('new_instance', '2026-10-01T18:00:00Z', 2, 'Lung')).toBe('--- ADDENDUM 2: LUNG (Transmitted: 2026-10-01 18:00 UTC) ---');
    expect(embeddedLisHeader('corrected', '2026-10-01T18:00:00Z')).toBe('[AMENDED REPORT — CORRECTED: 2026-10-01 18:00 UTC]');
  });
});

describe('one PDF per workup (Batch 426)', () => {
  it('workupChanges lists changed, added and removed answers', () => {
    const o = (field_id: string, value: string, unit: string | null = null) => ({ field_id, label: field_id, value, unit, block_id: null, snomed: null, overridden: false, ai_suggested: false });
    expect(workupChanges([o('a', '1', 'cm'), o('b', 'x')], [o('a', '2', 'cm'), o('c', 'y')])).toEqual([
      { label: 'a', from: '1 cm', to: '2 cm' }, { label: 'b', from: 'x', to: '' }, { label: 'c', from: '', to: 'y' },
    ]);
    expect(workupChanges(undefined, [o('a', '1')])).toEqual([]);
  });
  it('the render request: answers with units, the workup block', () => {
    const result: any = { header: { template: { id: 't', name: 'Colon', version: '4.2' }, specimen_ids: ['A'], workup_status: 'CORRECTED', workup_version: 2, pdf_document_id: 'D' }, synoptic_observations: [{ field_id: 's', label: 'Size', value: '3', unit: 'cm' }] };
    const r = buildWorkupRenderPayload({ result, caseHeader: { accession: 'S', patient: 'P', mrn: 'M', dob: '' }, signerName: 'Dr A', signedAtDisplay: 'then', changes: [] });
    expect(r.synopticAnswers).toEqual([{ fieldId: 's', fieldLabel: 'Size', displayValue: '3 cm' }]);
    expect(r.workup).toMatchObject({ parts: ['A'], protocol: 'Colon', protocolVersion: '4.2', status: 'CORRECTED', version: 2, documentId: 'D' });
  });
  it('Batch 427: the combined render request lists every workup under one document id', () => {
    const result: any = { header: { template: { id: 't', name: 'Colon' }, specimen_ids: ['A'], workup_status: 'FINAL', workup_version: 1, pdf_document_id: 'X' }, synoptic_observations: [] };
    const r = buildCombinedRenderPayload({ workups: [{ result, signerName: 'A', signedAtDisplay: 'n', changes: [] }, { result, signerName: 'B', signedAtDisplay: 'n', changes: [] }], caseHeader: { accession: 'S', patient: 'P', mrn: 'M', dob: '' }, documentId: 'CASE-V1' });
    expect(r.workups.map(w => [w.signedBy, w.documentId])).toEqual([['A', 'CASE-V1'], ['B', 'CASE-V1']]);
  });
  it('renderWorkupPdf never throws', async () => {
    expect(await renderWorkupPdf({}, { post: async () => ({ ok: true, pdfBase64: 'AA==' }) })).toEqual({ pdfBase64: 'AA==' });
    expect(await renderWorkupPdf({}, { post: async () => ({ ok: false, status: 500 }) })).toEqual({ generationError: 'Workup PDF generation failed (500)' });
    expect((await renderWorkupPdf({}, { post: async () => { throw new Error('offline'); } })).generationError).toBe('offline');
  });
});
