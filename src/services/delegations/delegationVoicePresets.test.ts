import { describe, it, expect } from 'vitest';
import { delegationTypeForVoiceAction, presetAvailable } from './delegationVoicePresets';

describe('delegationVoicePresets', () => {
  it('maps the three spoken actions to delegation types', () => {
    expect(delegationTypeForVoiceAction('DELEGATE_PEER_REVIEW')).toBe('CASUAL_REVIEW');
    expect(delegationTypeForVoiceAction('DELEGATE_FORMAL_CONSULT')).toBe('SECOND_OPINION');
    expect(delegationTypeForVoiceAction('DELEGATE_FULL_TRANSFER')).toBe('REASSIGN');
  });
  it('returns undefined for other actions', () => {
    expect(delegationTypeForVoiceAction('OPEN_DELEGATE_MODAL')).toBeUndefined();
  });
  it('checks the type is among the active ones', () => {
    expect(presetAvailable([{ id: 'REASSIGN' }], 'REASSIGN')).toBe(true);
    expect(presetAvailable([{ id: 'REASSIGN' }], 'CASUAL_REVIEW')).toBe(false);
  });
});
