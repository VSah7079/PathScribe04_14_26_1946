// Batch 400 (Pete): dictate the verbal report and have AI fill in the fields.
import { describe, it, expect, vi } from 'vitest';
import {
  parseVerbalReportByRules, parseVerbalReportDictation, redactPatientIdentifiers, saysReadBack, applyDictationProposal, validateAiProposal,
} from './parseVerbalReportDictation';

const ctx = {
  sessionSurgeon: 'Dr. Faulkner',
  patient: { patientName: 'Delacroix, Henri', mrn: 'MRN-77002', dateOfBirth: '1971-09-30' },
  reasonIds: ['SU_SCRUBBED', 'SU_DELEGATED', 'SU_EMERGENCY', 'SU_NOT_IN_ROOM', 'SU_OTHER'],
};

describe('rules (no AI)', () => {
  it('Pete\'s sentence', () => {
    expect(parseVerbalReportByRules('Called results to Dr. Faulkner, operating surgeon, at 2:07. Read back confirmed.', ctx))
      .toEqual({ engine: 'rules', receivedBy: 'Dr. Faulkner', recipientRole: 'operating_surgeon', readBackConfirmed: true });
  });
  it('a resident, with the surgeon scrubbed: the reason is only suggested', () => {
    expect(parseVerbalReportByRules('Told Dr. Patel, the surgical resident; surgeon scrubbed in. Repeated back.', ctx))
      .toEqual({ engine: 'rules', receivedBy: 'Dr. Patel', recipientRole: 'surgical_resident', readBackConfirmed: true, suggestedReasonId: 'SU_SCRUBBED' });
  });
  it('a circulating nurse, no read-back said', () => {
    expect(parseVerbalReportByRules('Gave it to Nurse Adams, circulating nurse', ctx))
      .toEqual({ engine: 'rules', receivedBy: 'Nurse Adams', recipientRole: 'or_staff' });
  });
  it('"the surgeon" resolves to the session surgeon', () => {
    expect(parseVerbalReportByRules('Spoke with the surgeon, read it back', ctx))
      .toMatchObject({ receivedBy: 'Dr. Faulkner', recipientRole: 'operating_surgeon', readBackConfirmed: true });
  });
  it('the read-back is never inferred, and a negated one doesn\'t count', () => {
    expect(saysReadBack('Called Dr. Faulkner with the result')).toBe(false);
    expect(saysReadBack('No read back, line dropped')).toBe(false);
    expect(saysReadBack('Result given; could not confirm read-back')).toBe(false);
    expect(saysReadBack('Read-back complete')).toBe(true);
  });
});

describe('AI', () => {
  it('patient identifiers are removed before the text is sent', async () => {
    const ai = vi.fn().mockResolvedValue({ text: '{"receivedBy":"Dr. Faulkner","recipientRole":"operating_surgeon","readBackStated":true}' });
    const said = 'Told Dr. Faulkner margins clear for Henri Delacroix MRN-77002, born 1971-09-30. Read back.';
    const p = await parseVerbalReportDictation(said, ctx, ai);
    const sent = ai.mock.calls[0][0].prompt as string;
    expect(sent).not.toMatch(/Henri|Delacroix|MRN-77002|1971-09-30/);
    expect(sent).toContain('[PATIENT]');
    expect(p).toEqual({ engine: 'ai', receivedBy: 'Dr. Faulkner', recipientRole: 'operating_surgeon', readBackConfirmed: true, suggestedReasonId: undefined });
  });

  it('the model can\'t add a read-back the words don\'t say, invent roles or reasons, or name the patient', async () => {
    const ai = vi.fn().mockResolvedValue({ text: '```json\n{"receivedBy":"[PATIENT]","recipientRole":"janitor","readBackStated":true,"surgeonUnavailableReason":"SU_MADE_UP"}\n```' });
    const p = await parseVerbalReportDictation('Called the resident', ctx, ai);
    expect(p).toEqual({ engine: 'ai', receivedBy: undefined, recipientRole: 'surgical_resident', suggestedReasonId: undefined });
  });

  it('falls back to the rules when the model fails or returns nonsense', async () => {
    expect(await parseVerbalReportDictation('Told Dr. Patel, resident. Read back.', ctx, vi.fn().mockRejectedValue(new Error('no provider'))))
      .toMatchObject({ engine: 'rules', receivedBy: 'Dr. Patel', recipientRole: 'surgical_resident', readBackConfirmed: true });
    expect((await parseVerbalReportDictation('Told Dr. Patel', ctx, vi.fn().mockResolvedValue({ text: 'not json' }))).engine).toBe('rules');
  });

  it('validates a reason against the active list', () => {
    expect(validateAiProposal('{"surgeonUnavailableReason":"SU_EMERGENCY"}', ctx)).toEqual({ suggestedReasonId: 'SU_EMERGENCY' });
  });
});

describe('redaction and applying', () => {
  it('redacts name parts, MRN and date of birth as whole words', () => {
    expect(redactPatientIdentifiers('Henri Delacroix (MRN-77002), Henrietta', ctx.patient)).toBe('[PATIENT] [PATIENT] ([PATIENT]), Henrietta');
  });
  it('never overwrites what the pathologist already entered', () => {
    expect(applyDictationProposal({ receivedBy: 'Dr. Owusu', recipientRole: '', readBackConfirmed: false },
      { engine: 'ai', receivedBy: 'Dr. Faulkner', recipientRole: 'operating_surgeon', readBackConfirmed: true }))
      .toEqual({ receivedBy: 'Dr. Owusu', recipientRole: 'operating_surgeon', readBackConfirmed: true, filled: ['verbalReportRole', 'verbalReportReadBack'] });
  });
});
