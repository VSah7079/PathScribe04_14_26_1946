// Batch 612: every refusal, problem and status code the Interface Dictionary can produce has its text in all five languages.
import { describe, expect, it } from 'vitest';
import en from '@/i18n/locales/en.json';
import fr from '@/i18n/locales/fr.json';
import de from '@/i18n/locales/de.json';
import nl from '@/i18n/locales/nl.json';
import ko from '@/i18n/locales/ko.json';
import { codeKey } from './interfaceDictionaryText';
import { SCOPE_HANDLED_BY_MAPPER, SCOPE_NEEDS_CODE_RELEASE } from './scopeGuard';
import { MAPPING_DATA_TYPES, MAPPING_TRANSFORMS, VENDOR_MESSAGE_FORMATS } from './interfaceDictionaryTypes';

const REFUSALS = ['NOT_FOUND', 'NAME_REQUIRED', 'DUPLICATE_NAME', 'BAD_MESSAGE_TYPE', 'DRAFT_EXISTS', 'NOT_A_DRAFT', 'NO_MAPPINGS', 'MAPPING_PROBLEM',
  'NOT_TESTED', 'TEST_STALE', 'NOTHING_TO_ROLL_BACK_TO', 'NOT_PUBLISHED', 'EMPTY_MESSAGE', 'BAD_MESSAGE', 'WRONG_MESSAGE_TYPE', 'CASE_REQUIRED',
  'NO_PUBLISHED_VERSION', 'CONFIG_NOT_PERMITTED'];
const DEFINITION = ['SOURCE_EMPTY', 'SOURCE_SYNTAX', 'TARGET_EMPTY', 'TARGET_CORE_STRUCTURE', 'TARGET_NOT_AN_EXTENSION', 'TARGET_BAD_NAME', 'LABEL_REQUIRED',
  'TARGET_DUPLICATE', 'TRANSFORM_TYPE', 'DEFAULT_TYPE', 'VALUEMAP_BAD'];
const APPLY = ['DEFINITION', 'WRONG_RESOURCE', 'WRONG_FORMAT', 'NOT_A_VALUE', 'BAD_NUMBER', 'BAD_BOOLEAN', 'BAD_DATE', 'BAD_DATETIME', 'UNMAPPED_CODE'];

const get = (o: unknown, path: string): unknown => path.split('.').reduce<unknown>((c, k) => (c && typeof c === 'object' ? (c as Record<string, unknown>)[k] : undefined), o);

describe('Interface Dictionary text', () => {
  const keys = [
    ...REFUSALS.map(c => `interfaceDictionary.refusal.${codeKey(c)}`),
    ...DEFINITION.map(c => `interfaceDictionary.problem.${codeKey(c)}`),
    ...APPLY.map(c => `interfaceDictionary.test.problemDetail.${codeKey(c)}`),
    ...['draft', 'tested', 'published', 'superseded', 'retired'].map(s => `interfaceDictionary.status.${s}`),
    ...['mapped', 'default', 'missing', 'missingRequired', 'problem'].map(s => `interfaceDictionary.test.status.${s}`),
    ...VENDOR_MESSAGE_FORMATS.map(f => `interfaceDictionary.format.${f}`),
    ...MAPPING_DATA_TYPES.map(f => `interfaceDictionary.type.${f}`),
    ...MAPPING_TRANSFORMS.map(f => `interfaceDictionary.transform.${f}`),
    ...SCOPE_HANDLED_BY_MAPPER.map(f => `interfaceDictionary.scope.handled.${f}`),
    ...SCOPE_NEEDS_CODE_RELEASE.map(f => `interfaceDictionary.scope.release.${f}`),
    ...['blocked.notADraft', 'blocked.noMappings', 'blocked.mappingProblem', 'blocked.notTested', 'blocked.testStale'].map(s => `interfaceDictionary.publish.${s}`),
  ];
  for (const [name, locale] of Object.entries({ en, fr, de, nl, ko })) {
    it(`${name} has every code`, () => {
      const missing = keys.filter(k => typeof get(locale, k) !== 'string' || get(locale, k) === '');
      expect(missing).toEqual([]);
    });
  }
});
