// The enhancement request destination is configuration, never code: no web address is written in the
// files that route feedback (the deployment's config.json or the administrator supplies it).
// Test files are exempt (fixtures). Locale strings carry no web address either.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const FILES = [
  'src/services/enhancementRequestService.ts',
  'src/services/feedback/enhancementDestination.ts',
  'src/services/feedback/validationRouting.ts',
  'src/services/feedback/feedbackSettingsRules.ts',
  'src/services/feedback/mockFeedbackSettingsService.ts',
  'src/services/feedback/httpFeedbackSettingsService.ts',
  'src/components/EnhancementRequest/EnhancementRequestModal.tsx',
  'src/components/Config/System/FeedbackSection.tsx',
  'src/services/communications/emailTemplates/enhancementEmailTemplates.ts',
];
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');

describe('no web address is hard-coded in the feedback routing', () => {
  it.each(FILES)('%s has no http(s) address literal', f => {
    const text = strip(readFileSync(resolve(process.cwd(), f), 'utf8'));
    expect(text.match(/https?:\/\/[^\s'"`)]+/g) ?? []).toEqual([]);
  });
  it('the new locale strings carry no web address', () => {
    for (const l of ['en', 'fr', 'de', 'nl', 'ko', 'es']) {
      const d = JSON.parse(readFileSync(resolve(process.cwd(), `src/i18n/locales/${l}.json`), 'utf8'));
      const text = JSON.stringify([d.feedbackSection, d.enhancementRequestModal]);
      expect(text, l).not.toMatch(/https?:\/\//);
    }
  });
});
