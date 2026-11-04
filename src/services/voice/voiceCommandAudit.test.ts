// Batch 650, item 7: the audit entry builder is PHI-free by construction.
import { describe, it, expect } from 'vitest';
import { buildVoiceCommandAuditEntry, VOICE_COMMAND_EXECUTED_EVENT, VOICE_COMMAND_REFUSED_EVENT } from './voiceCommandAudit';

describe('buildVoiceCommandAuditEntry', () => {
  it('executed', () => {
    const e = buildVoiceCommandAuditEntry({ actionId: 'SAVE_REPORT_DRAFT', screen: 'SYNOPTIC', user: 'Dr. Test' });
    expect(e).toEqual({ type: 'user', event: VOICE_COMMAND_EXECUTED_EVENT, detail: 'Voice command executed: action SAVE_REPORT_DRAFT on screen SYNOPTIC', user: 'Dr. Test', caseId: null, confidence: null });
  });
  it('each refusal reason has its own wording', () => {
    const texts = (['notEligible', 'confirmationDeclined', 'confirmationTimedOut'] as const)
      .map(refusal => buildVoiceCommandAuditEntry({ actionId: 'A', screen: 'S', user: 'U', refusal }));
    expect(texts.every(t => t.event === VOICE_COMMAND_REFUSED_EVENT)).toBe(true);
    expect(new Set(texts.map(t => t.detail)).size).toBe(3);
  });
  it('has no field that could hold speech or a case', () => {
    const e = buildVoiceCommandAuditEntry({ actionId: 'A', screen: 'S', user: 'U' });
    expect(Object.keys(e).sort()).toEqual(['caseId', 'confidence', 'detail', 'event', 'type', 'user']);
    expect(e.caseId).toBeNull();
  });
});
