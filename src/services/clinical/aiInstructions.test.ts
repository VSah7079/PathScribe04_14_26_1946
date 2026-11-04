// Batch 536 (PS-554, Pete's decisions of Oct 11, 2026): governed AI instructions for the mismatch check.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/aiIntegration/aiProviderService', () => ({ callAi: vi.fn() }));

import { callAi } from '@/services/aiIntegration/aiProviderService';
import { AiNotAvailableError } from '@/services/aiIntegration/aiCallPolicy';
import {
  aiInstructionAudit, aiInstructionDecisionRefusal, aiInstructionDraftProblem, applyApproval, applyRejection, approvedInstruction,
  BUILT_IN_AI_INSTRUCTIONS, instructionHistory, MAX_AI_INSTRUCTION_LENGTH, newInstructionVersion, pendingInstruction, type AiInstructionVersion,
} from './aiInstructions';
import { createAiInstructionService, type AiInstructionDeps } from './aiInstructionService';
import { detectClinicalPathologicMismatch, mismatchPrompt } from './detectClinicalPathologicMismatch';

const ann = { userId: 'U-ANN', userName: 'Ann Editor' };
const bob = { userId: 'U-BOB', userName: 'Dr Bob Director' };
const NOW = '2026-10-12T10:00:00.000Z';

describe('the rules (pure)', () => {
  it('with nothing stored, the check uses PathScribe\'s own text, version 0, approved with the release', () => {
    const v = approvedInstruction([], 'surgical');
    expect(v).toMatchObject({ version: 0, status: 'approved', text: BUILT_IN_AI_INSTRUCTIONS.surgical });
    expect(pendingInstruction([], 'surgical')).toBeNull();
  });

  it('an edit is a new version, pending; the check keeps using the approved one (the edited text is never used unapproved)', () => {
    const { version } = newInstructionVersion([], 'surgical', '  New text  ', ann, NOW, 'v1');
    expect(version).toMatchObject({ version: 1, status: 'pending', text: 'New text', editors: ['U-ANN'] });
    expect(approvedInstruction([version], 'surgical').version).toBe(0);
    expect(pendingInstruction([version], 'surgical')?.id).toBe('v1');
  });

  it('a second edit replaces the pending version (withdrawn) and keeps everyone who edited since the last approval', () => {
    const first = newInstructionVersion([], 'cytology', 'A', ann, NOW, 'v1').version;
    const { version, withdrawn } = newInstructionVersion([first], 'cytology', 'B', bob, NOW, 'v2');
    expect(withdrawn).toMatchObject({ id: 'v1', status: 'withdrawn' });
    expect(version).toMatchObject({ version: 2, editors: ['U-ANN', 'U-BOB'] });
  });

  it('nobody who edited the text can approve it (SELF_APPROVAL); someone else can; rejecting needs a reason', () => {
    const v = newInstructionVersion([], 'surgical', 'A', ann, NOW, 'v1').version;
    expect(aiInstructionDecisionRefusal(v, ann, 'approve')).toBe('SELF_APPROVAL');
    expect(aiInstructionDecisionRefusal(v, bob, 'approve')).toBeNull();
    expect(aiInstructionDecisionRefusal(v, bob, 'reject', '  ')).toBe('reasonRequired');
    expect(aiInstructionDecisionRefusal(v, ann, 'reject', 'Too broad')).toBeNull();
    expect(aiInstructionDecisionRefusal({ ...v, status: 'approved' }, bob, 'approve')).toBe('notPending');
    expect(aiInstructionDecisionRefusal(undefined, bob, 'approve')).toBe('notFound');
  });

  it('approving puts it in use and supersedes the one in use before; rejecting leaves the approved one in use', () => {
    const v1 = newInstructionVersion([], 'autopsy', 'A', ann, NOW, 'v1').version;
    let stored: AiInstructionVersion[] = applyApproval([v1], 'v1', bob, NOW);
    expect(approvedInstruction(stored, 'autopsy')).toMatchObject({ id: 'v1', approvedBy: bob });
    expect(instructionHistory(stored, 'autopsy')[0]).toMatchObject({ version: 0, status: 'superseded' });
    const v2 = newInstructionVersion(stored, 'autopsy', 'B', ann, NOW, 'v2').version;
    stored = applyApproval([...stored, v2], 'v2', bob, NOW);
    expect(stored.find(v => v.id === 'v1')?.status).toBe('superseded');
    const v3 = newInstructionVersion(stored, 'autopsy', 'C', ann, NOW, 'v3').version;
    stored = applyRejection([...stored, v3], 'v3', bob, ' Unclear ', NOW);
    expect(stored.find(v => v.id === 'v3')).toMatchObject({ status: 'rejected', rejectionReason: 'Unclear' });
    expect(approvedInstruction(stored, 'autopsy').id).toBe('v2');
  });

  it('a draft must say something, fit the budget, and differ from the current text', () => {
    expect(aiInstructionDraftProblem([], 'surgical', '   ')).toBe('empty');
    expect(aiInstructionDraftProblem([], 'surgical', 'x'.repeat(MAX_AI_INSTRUCTION_LENGTH + 1))).toBe('tooLong');
    expect(aiInstructionDraftProblem([], 'surgical', BUILT_IN_AI_INSTRUCTIONS.surgical)).toBe('unchanged');
    expect(aiInstructionDraftProblem([], 'surgical', 'Different')).toBeNull();
  });

  it('audit entries name the discipline and version (literal English)', () => {
    const v = newInstructionVersion([], 'cytology', 'New', ann, NOW, 'v1').version;
    expect(aiInstructionAudit('edited', v, 'Ann Editor', { previousText: 'Old' })).toMatchObject({ event: 'AI_PROMPT_EDITED', user: 'Ann Editor' });
    expect(aiInstructionAudit('edited', v, 'Ann Editor', { previousText: 'Old' }).detail).toContain('cytology mismatch check, version 1');
    expect(aiInstructionAudit('approved', v, 'Bob', { supersededVersion: 0 }).event).toBe('AI_PROMPT_APPROVED');
    expect(aiInstructionAudit('rejected', v, 'Bob', { reason: 'Unclear' }).detail).toContain('rejected: Unclear');
  });
});

function harness(over: Partial<AiInstructionDeps> = {}) {
  let store: AiInstructionVersion[] | null = null;
  let who = ann;
  const audits: { event: string }[] = [];
  const granted = new Set(['config:ai-prompt:view', 'config:ai-prompt:edit', 'config:ai-prompt:approve']);
  const refused: string[] = [];
  let n = 0;
  const svc = createAiInstructionService({
    read: () => store, write: v => { store = v; },
    enforce: async c => ({ allowed: granted.has(c) }),
    audit: async e => { audits.push(e); },
    actor: () => who, now: () => new Date(NOW), newId: () => `id${++n}`,
    runCheck: vi.fn(async () => null), notAllowed: e => e instanceof AiNotAvailableError,
    refused: c => { refused.push(c); },
    ...over,
  });
  return { svc, audits, granted, refused, as: (u: typeof ann) => { who = u; }, stored: () => store };
}

describe('aiInstructionService', () => {
  it('reading, editing and approving each need their capability (nothing written when refused)', async () => {
    const h = harness();
    h.granted.clear();
    expect(await h.svc.list()).toEqual({ ok: false, error: 'CONFIG_NOT_PERMITTED' });
    expect(await h.svc.saveDraft('surgical', 'New')).toEqual({ ok: false, error: 'CONFIG_NOT_PERMITTED' });
    expect(await h.svc.approve('x')).toEqual({ ok: false, error: 'CONFIG_NOT_PERMITTED' });
    expect(h.refused).toEqual(['config:ai-prompt:view', 'config:ai-prompt:edit', 'config:ai-prompt:approve']);
    expect(h.stored()).toBeNull();
  });

  it('edit → audited, pending; the editor can\'t approve; another approver can, and the check then uses it', async () => {
    const h = harness();
    const saved = await h.svc.saveDraft('surgical', 'Flag only unexpected malignancy.');
    expect(saved.ok).toBe(true);
    const pending = saved.ok ? saved.data.find(v => v.discipline === 'surgical')!.pending! : null;
    expect(h.audits.map(a => a.event)).toEqual(['AI_PROMPT_EDITED']);
    expect(await h.svc.instructionsForCheck('surgical')).toEqual({ text: BUILT_IN_AI_INSTRUCTIONS.surgical, version: 0 });

    expect(await h.svc.approve(pending!.id)).toEqual({ ok: false, error: 'SELF_APPROVAL' });
    h.as(bob);
    const approved = await h.svc.approve(pending!.id);
    expect(approved.ok).toBe(true);
    expect(await h.svc.instructionsForCheck('surgical')).toEqual({ text: 'Flag only unexpected malignancy.', version: 1 });
    expect(h.audits.map(a => a.event)).toEqual(['AI_PROMPT_EDITED', 'AI_PROMPT_APPROVED']);
  });

  it('a rejection needs a reason, is audited, and the approved text stays in use', async () => {
    const h = harness();
    const saved = await h.svc.saveDraft('autopsy', 'Changed');
    const id = saved.ok ? saved.data.find(v => v.discipline === 'autopsy')!.pending!.id : '';
    h.as(bob);
    expect(await h.svc.reject(id, '')).toEqual({ ok: false, error: 'reasonRequired' });
    expect((await h.svc.reject(id, 'Drops the Goldman classes')).ok).toBe(true);
    expect(h.audits.slice(-1)[0]?.event).toBe('AI_PROMPT_REJECTED');
    expect((await h.svc.instructionsForCheck('autopsy')).version).toBe(0);
  });

  it('the Test panel runs the draft on the sample (never stored) and reports a refusal by the AI vendor policy as such', async () => {
    const runCheck = vi.fn(async () => ({ kind: 'unexpected-malignancy' as const, confidence: 80, source: 'ai' as const }));
    const h = harness({ runCheck });
    const sample = { clinicalIndication: 'Routine', clinicalHistory: '', microscopic: 'Carcinoma', diagnosis: 'Carcinoma', malignantNow: true };
    expect(await h.svc.test('surgical', 'Draft', sample)).toEqual({ ok: true, data: { outcome: 'mismatch', suggestion: expect.objectContaining({ confidence: 80 }) } });
    expect(runCheck).toHaveBeenCalledWith(expect.objectContaining({ discipline: 'surgical' }), { text: 'Draft', version: -1 });
    expect(h.stored()).toBeNull();
    runCheck.mockRejectedValueOnce(new AiNotAvailableError('serviceNotAllowed', { jurisdiction: 'DE' }));
    expect(await h.svc.test('surgical', 'Draft', sample)).toEqual({ ok: true, data: { outcome: 'notAllowed' } });
    runCheck.mockRejectedValueOnce(new Error('proxy down'));
    expect(await h.svc.test('surgical', 'Draft', sample)).toEqual({ ok: true, data: { outcome: 'unavailable', message: 'proxy down' } });
  });

  it('an approver without the edit capability can still test', async () => {
    const h = harness();
    h.granted.delete('config:ai-prompt:edit');
    expect((await h.svc.test('cytology', 'Draft', { clinicalIndication: 'x', clinicalHistory: '', microscopic: 'y', diagnosis: 'z', malignantNow: false })).ok).toBe(true);
    h.granted.delete('config:ai-prompt:approve');
    expect(await h.svc.test('cytology', 'Draft', { clinicalIndication: 'x', clinicalHistory: '', microscopic: 'y', diagnosis: 'z', malignantNow: false })).toEqual({ ok: false, error: 'CONFIG_NOT_PERMITTED' });
  });
});

describe('the mismatch check uses only approved instructions (Batch 536)', () => {
  const input = { clinicalIndication: 'Routine polyp', clinicalHistory: '', microscopic: 'Invasive adenocarcinoma', diagnosis: 'Adenocarcinoma', malignantNow: true };
  beforeEach(() => vi.mocked(callAi).mockReset());

  it('the prompt carries the approved text; the case data and answer format stay fixed', () => {
    const prompt = mismatchPrompt(input, 'GOVERNED TEXT');
    expect(prompt).toContain('GOVERNED TEXT');
    expect(prompt).toContain('CLINICAL INDICATION: Routine polyp');
    expect(prompt).toContain('Return JSON: { "mismatch": true | false');
    expect(mismatchPrompt(input)).toContain(BUILT_IN_AI_INSTRUCTIONS.surgical);
  });

  it('asks with the approved version and records it on the suggestion; the call carries the case for the vendor policy', async () => {
    vi.mocked(callAi).mockResolvedValueOnce({ text: JSON.stringify({ mismatch: true, kind: 'other', confidence: 70 }), provider: 'structured_messages', model: 'm' });
    const res = await detectClinicalPathologicMismatch(input, { caseId: 'C-1', approvedInstructions: async () => ({ text: 'APPROVED V3', version: 3 }) });
    expect(res).toEqual({ ok: true, data: { kind: 'other', confidence: 70, source: 'ai', instructionVersion: 3 } });
    const call = vi.mocked(callAi).mock.calls[0][0];
    expect(call.prompt).toContain('APPROVED V3');
    expect(call.context).toEqual({ feature: 'clinical-mismatch', caseId: 'C-1', facilityId: undefined });
    expect(call.prompt).not.toContain('C-1');
  });

  it('PS-558: AI not allowed for the jurisdiction → the rule-based check, saying why', async () => {
    vi.mocked(callAi).mockRejectedValueOnce(new AiNotAvailableError('serviceNotAllowed', { jurisdiction: 'DE' }));
    const res = await detectClinicalPathologicMismatch(input, { approvedInstructions: async () => ({ text: 'T', version: 1 }) });
    expect(res).toEqual({ ok: true, data: expect.objectContaining({ source: 'rule', aiNotAvailable: 'jurisdiction' }) });
  });

  it('instructions that can\'t be read → PathScribe\'s own, never an unapproved draft', async () => {
    vi.mocked(callAi).mockResolvedValueOnce({ text: JSON.stringify({ mismatch: false }), provider: 'structured_messages', model: 'm' });
    await detectClinicalPathologicMismatch(input, { approvedInstructions: async () => { throw new Error('storage'); } });
    expect(vi.mocked(callAi).mock.calls[0][0].prompt).toContain(BUILT_IN_AI_INSTRUCTIONS.surgical);
  });
});
