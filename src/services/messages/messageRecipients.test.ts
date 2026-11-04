import { describe, it, expect } from 'vitest';
import { DEMO_MESSAGE_RECIPIENTS as R, searchRecipients, findRecipientByName } from './messageRecipients';

describe('messageRecipients', () => {
  it('finds by name or role and leaves out those already chosen', () => {
    expect(searchRecipients(R, 'patho').map(u => u.id)).toEqual(['u4', 'u5', 'u8', 'u17']);
    expect(searchRecipients(R, 'patho', ['u4']).map(u => u.id)).toEqual(['u5', 'u8', 'u17']);
    expect(searchRecipients(R, 'billing').map(u => u.name)).toEqual(['Billing Dept']);
  });
  it('matches an exact typed name, ignoring case and spaces', () => {
    expect(findRecipientByName(R, '  dr. miller ')?.id).toBe('u8');
    expect(findRecipientByName(R, 'dr. miller', ['u8'])).toBeUndefined();
    expect(findRecipientByName(R, 'Miller')).toBeUndefined();
  });
  it('has unique ids', () => {
    expect(new Set(R.map(u => u.id)).size).toBe(R.length);
  });
});
