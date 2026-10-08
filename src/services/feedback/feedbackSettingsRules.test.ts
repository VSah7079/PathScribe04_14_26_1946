import { describe, it, expect } from 'vitest';
import { qaButtonShown, feedbackSettingsProblem, feedbackSettingsChange, parseEmailList, DEFAULT_FEEDBACK_SETTINGS as D } from './feedbackSettingsRules';

describe('QA feedback button (Batch 447)', () => {
  it('by default follows the instance: shown in validation, hidden in production', () => {
    expect(qaButtonShown(D, 'validation')).toBe(true);
    expect(qaButtonShown(D, 'production')).toBe(false);
  });
  it('"on" and "off" override the instance', () => {
    expect(qaButtonShown({ ...D, qaButton: 'on' }, 'production')).toBe(true);
    expect(qaButtonShown({ ...D, qaButton: 'off' }, 'validation')).toBe(false);
  });
});

describe('feedbackSettingsProblem', () => {
  const ok = { ...D, qaRecipients: ['qa@formedrix.ai'] };
  it('accepts valid settings', () => { expect(feedbackSettingsProblem(ok, 'validation')).toBeNull(); });
  it('needs a recipient whenever the button shows, not otherwise', () => {
    expect(feedbackSettingsProblem(D, 'validation')).toBe('noRecipients');
    expect(feedbackSettingsProblem(D, 'production')).toBeNull();
    expect(feedbackSettingsProblem({ ...D, qaButton: 'on' }, 'production')).toBe('noRecipients');
  });
  it('refuses a malformed address', () => {
    expect(feedbackSettingsProblem({ ...ok, qaRecipients: ['not-an-email'] }, 'validation')).toBe('invalidRecipient');
    expect(feedbackSettingsProblem({ ...ok, qaAdminCc: ['x@'] }, 'validation')).toBe('invalidCc');
  });
});

describe('parseEmailList and the audit text', () => {
  it('splits on commas, semicolons and spaces, dropping blanks and repeats', () => {
    expect(parseEmailList(' a@x.org, b@y.org;a@x.org  ')).toEqual(['a@x.org', 'b@y.org']);
  });
  it('describes only what changed', () => {
    expect(feedbackSettingsChange(D, D)).toBeNull();
    expect(feedbackSettingsChange(D, { ...D, qaButton: 'on', qaRecipients: ['qa@x.org'] }))
      .toBe('Feedback settings changed. QA feedback button: default → on; QA recipients: (none) → qa@x.org.');
  });
});
