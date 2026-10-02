import { describe, it, expect } from 'vitest';
import { resolveFieldRequirements } from './fieldRequirementRules';
import { newMessageMissing, secureEmailMissing, replyMissing, messagingFieldRequired } from './messagingChecks';

const defaults = resolveFieldRequirements('messaging');

describe('Messaging (Batch 384)', () => {
  it('a new message needs a recipient, a subject and text, as the drawer always required', () => {
    expect(newMessageMissing(0, '', '', defaults)).toEqual(['messageRecipient', 'messageSubject', 'messageBody']);
    expect(newMessageMissing(1, '  ', 'Hello', defaults)).toEqual(['messageSubject']);
    expect(newMessageMissing(2, 'Case A26-1', ' Please review ', defaults)).toEqual([]);
  });
  it('an organisation can allow messages without a subject; the recipient and text stay required', () => {
    const noSubject = resolveFieldRequirements('messaging', { messageSubject: false, messageRecipient: false, messageBody: false });
    expect(newMessageMissing(1, '', 'Hello', noSubject)).toEqual([]);
    expect(newMessageMissing(0, '', '', noSubject)).toEqual(['messageRecipient', 'messageBody']);
    expect(messagingFieldRequired(noSubject, 'messageSubject')).toBe(false);
    expect(messagingFieldRequired(noSubject, 'messageBody')).toBe(true);
  });
  it('a secure email needs an address with an @, a subject and text', () => {
    expect(secureEmailMissing('', '', '', defaults)).toEqual(['secureEmailTo', 'secureEmailSubject', 'secureEmailBody']);
    expect(secureEmailMissing('not-an-address', 'S', 'B', defaults)).toEqual(['secureEmailTo']);
    expect(secureEmailMissing('dr@example.org', 'S', 'B', defaults)).toEqual([]);
    const noSubject = resolveFieldRequirements('messaging', { secureEmailSubject: false });
    expect(secureEmailMissing('dr@example.org', '', 'B', noSubject)).toEqual([]);
  });
  it('a reply needs text', () => {
    expect(replyMissing('  ', defaults)).toEqual(['messageReply']);
    expect(replyMissing('Thanks', defaults)).toEqual([]);
    expect(replyMissing('', resolveFieldRequirements('messaging', { messageReply: false }))).toEqual(['messageReply']);
  });
});
