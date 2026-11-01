// src/services/reports/dispatchAssistOrganMap.test.ts
// Batch 751 (Pete, Oct 31, 2026, spec section 12.3): the organ map delivered with an Assist case's result.
import { describe, it, expect, vi } from 'vitest';
import { dispatchAssistCaseRelease, dispatchAssistSynopticResult, rebuildAssistSynopticMessage, type AssistSynopticDeps } from './dispatchAssistSynopticResult';
import type { OrganMapDeliverySettings, OrganMapForDelivery } from '../organMapping/organMapDelivery';

const FILE = { fileName: 'S26-0001_rectalResection_20261001T180000Z.png', contentType: 'image/png' as const, base64: 'iVBORw0KGgo=', sha256: 'abc123def4567890' };

function setup(opts: { settings?: Partial<OrganMapDeliverySettings>; draw?: boolean; send?: (payload: any) => boolean; noMap?: boolean } = {}) {
  const c: any = {
    id: 'S26-1', reportingMode: 'assist', accession: { fullAccession: 'S26-0001' },
    patient: { id: 'P1', mrn: 'MRN-9', firstName: 'Jane', lastName: 'Doe', dateOfBirth: '1960-01-01' },
    order: {}, specimens: [{ id: 'sp1', label: 'A' }],
    synopticReports: [{ instanceId: 'i1', specimenId: 'sp1', templateId: 't', templateName: 'Colon', status: 'finalized', answers: { size: '3.0' } }],
  };
  const entries: any[] = [];
  const sent: any[] = [];
  const audit = vi.fn();
  const settings: OrganMapDeliverySettings = { mode: 'textAndFile', fileFormat: 'png', destination: 'sftp://files.lab.example/organ-maps', ...opts.settings };
  const build = vi.fn(async (_c: unknown, _i: unknown, s: OrganMapDeliverySettings): Promise<OrganMapForDelivery | null> => {
    if (opts.noMap) return null;
    const base = { mapType: 'rectalResection' as const, fingerprint: 'fp-0123456789abcdef', lines: ['Anterior: tumour', 'Circumferential margin: 6 mm'] };
    if (s.mode !== 'textAndFile') return base;
    return opts.draw === false ? { ...base, fileProblem: 'no canvas here' } : { ...base, file: FILE };
  });
  const deps: AssistSynopticDeps = {
    getCase: async () => c,
    getTemplate: async () => ({ id: 't', name: 'Colon', version: '1', sections: [{ fields: [{ id: 'size', label: 'Tumor size', type: 'numeric', unit: 'cm' }] }] }),
    getNpi: async () => undefined,
    organisationIdForPatient: async () => 'ORG-1',
    queue: {
      getByCaseId: async () => ({ ok: true as const, data: entries }),
      enqueue: async e => { const x = { ...e, id: `Q${entries.length + 1}`, status: 'QUEUED' as const, queuedAt: `t${entries.length}`, retryCount: 0, maxRetriesExceeded: false }; entries.push(x); return { ok: true as const, data: x }; },
      markSent: async id => { entries.find(e => e.id === id).status = 'SENT'; },
      markFailed: async (id, f) => { Object.assign(entries.find(e => e.id === id), { status: 'FAILED', ...f }); },
    },
    dispatch: vi.fn(async (_id, payload) => { sent.push(payload); return (opts.send ?? (() => true))(payload) ? { ok: true } : { ok: false, errorCode: 'DISPATCH_UNREACHABLE', error: 'folder offline' }; }),
    renderPdf: async () => ({ pdfBase64: 'JVBERi0=' }),
    reportLanguage: async () => ({ language: 'en', formatDate: (s: string) => s, formatDob: (s?: string) => s ?? '' }),
    codeVersions: () => ({}),
    now: () => '2026-10-01T18:00:00.000Z',
    consolidatePdfs: async () => false,
    organMap: { settings: async () => settings, build, audit },
  };
  return { c, deps, entries, sent, audit, build };
}
const signer = { id: 'u1', name: 'Dr A' };

describe('organ map delivery with an Assist result (Batch 751)', () => {
  it('Text and image file: the result carries the lines and names the file; the file follows to the destination; audited', async () => {
    const { deps, entries, sent, audit } = setup();
    expect(await dispatchAssistCaseRelease('S26-1', signer, deps)).toEqual([{ instanceId: 'i1', outcome: 'sent' }]);
    const [result, file] = sent;
    expect(result.kind).toBe('final');
    expect(result.organMap).toEqual({ generatedFrom: 'synoptic answers', mapType: 'rectalResection', lines: ['Anterior: tumour', 'Circumferential margin: 6 mm'], file: { fileName: FILE.fileName, contentType: 'image/png', sha256: FILE.sha256 } });
    expect(result.fullPayloadText).toContain('\n\n--- ORGAN MAP (generated from the synoptic answers) ---\nAnterior: tumour\nCircumferential margin: 6 mm');
    expect(file).toMatchObject({ kind: 'organ_map', caseId: 'S26-1', instanceId: 'i1', destination: 'sftp://files.lab.example/organ-maps', organMapFile: { ...FILE, mapType: 'rectalResection', fingerprint: 'fp-0123456789abcdef', generatedFrom: 'synoptic answers' } });
    expect(entries.map(e => [e.kind, e.status])).toEqual([['final', 'SENT'], ['organ_map', 'SENT']]);
    expect(entries[1].organMapFile).toEqual({ fileName: FILE.fileName, sha256: FILE.sha256, fingerprint: 'fp-0123456789abcdef', mapType: 'rectalResection', destination: 'sftp://files.lab.example/organ-maps' });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ event: 'Organ Map File Sent', caseId: 'S26-1' }));
    expect(JSON.stringify(audit.mock.calls)).not.toContain('Doe');
  });

  it('a map file never makes the workup a later version, and the workup is still sent once', async () => {
    const { deps, entries } = setup();
    await dispatchAssistCaseRelease('S26-1', signer, deps);
    expect(await dispatchAssistCaseRelease('S26-1', signer, deps)).toEqual([{ instanceId: 'i1', outcome: 'alreadySent' }]);
    expect(await dispatchAssistSynopticResult({ caseId: 'S26-1', instanceId: 'i1', kind: 'corrected', signer }, deps)).toMatchObject({ outcome: 'sent', version: 2 });
    expect(entries.filter(e => e.kind === 'organ_map')).toHaveLength(2);
  });

  it('Text only: lines in the result, no file; Off or no map: nothing added', async () => {
    const text = setup({ settings: { mode: 'text' } });
    await dispatchAssistCaseRelease('S26-1', signer, text.deps);
    expect(text.sent).toHaveLength(1);
    expect(text.sent[0].organMap).toEqual({ generatedFrom: 'synoptic answers', mapType: 'rectalResection', lines: ['Anterior: tumour', 'Circumferential margin: 6 mm'] });
    const off = setup({ settings: { mode: 'off' } });
    await dispatchAssistCaseRelease('S26-1', signer, off.deps);
    expect(off.sent[0].organMap).toBeUndefined();
    expect(off.build).not.toHaveBeenCalled();
    const none = setup({ noMap: true });
    await dispatchAssistCaseRelease('S26-1', signer, none.deps);
    expect(none.sent).toHaveLength(1);
    expect(none.sent[0].fullPayloadText).not.toContain('ORGAN MAP');
  });

  it('a failed file delivery leaves the result sent, is audited, and the retry draws it again under the same name', async () => {
    const { deps, entries, audit, sent } = setup({ send: p => p.kind !== 'organ_map' });
    expect(await dispatchAssistCaseRelease('S26-1', signer, deps)).toEqual([{ instanceId: 'i1', outcome: 'sent' }]);
    expect(entries.map(e => [e.kind, e.status])).toEqual([['final', 'SENT'], ['organ_map', 'FAILED']]);
    expect(entries[1]).toMatchObject({ errorCode: 'DISPATCH_UNREACHABLE', errorMessage: 'folder offline', maxRetriesExceeded: false });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ event: 'Organ Map File Delivery Failed' }));
    const rebuilt: any = await rebuildAssistSynopticMessage(entries[1], deps);
    expect(rebuilt).toMatchObject({ kind: 'organ_map', instanceId: 'i1', organMapFile: { fileName: FILE.fileName } });
    expect(sent).toHaveLength(2);
  });

  it('a file that can’t be drawn is held for retry (the result still goes, its lines included)', async () => {
    const { deps, entries, sent, audit } = setup({ draw: false });
    await dispatchAssistCaseRelease('S26-1', signer, deps);
    expect(sent).toHaveLength(1);
    expect(sent[0].organMap.lines).toHaveLength(2);
    expect(sent[0].organMap.file).toBeUndefined();
    expect(entries[1]).toMatchObject({ kind: 'organ_map', status: 'FAILED' });
    expect(entries[1].errorMessage).toContain('no canvas here');
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ event: 'Organ Map File Delivery Failed' }));
    expect(await rebuildAssistSynopticMessage(entries[1], deps)).toEqual({ held: expect.stringContaining('no canvas here') });
  });
});
