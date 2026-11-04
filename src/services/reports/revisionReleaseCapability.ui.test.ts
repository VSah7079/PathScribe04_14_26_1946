// Batch 649: which revision kinds a person may release decides what the Amendment window, its entry buttons and its
// primary button offer (presentation only: mockAmendmentService.release still enforces).
import { describe, it, expect } from 'vitest';
import i18n from '@/i18n/config';
import {
  REVISION_RELEASE_CAPABILITY, resolveRevisionKind, revisionEntryDisabledTitle, revisionKindDisabledTitle,
  revisionReleaseAvailability, revisionReleaseRefusal,
} from './revisionReleaseCapability';

const holding = (...caps: string[]) => revisionReleaseAvailability(c => caps.includes(c));
const ALL = Object.values(REVISION_RELEASE_CAPABILITY);

describe('revisionReleaseAvailability', () => {
  it('maps each kind to its own capability', () => {
    expect(holding(REVISION_RELEASE_CAPABILITY.correction).allowed).toEqual({ amendment: false, correction: true, addendum: false });
    expect(holding(...ALL).any).toBe(true);
    expect(holding().any).toBe(false);
  });
});

describe('resolveRevisionKind', () => {
  it('keeps the current kind when permitted', () => {
    expect(resolveRevisionKind('addendum', holding(...ALL))).toBe('addendum');
  });
  it('moves to the first permitted kind (amendment, correction, addendum) when the current one is not', () => {
    expect(resolveRevisionKind('amendment', holding(REVISION_RELEASE_CAPABILITY.addendum, REVISION_RELEASE_CAPABILITY.correction))).toBe('correction');
    expect(resolveRevisionKind('amendment', holding(REVISION_RELEASE_CAPABILITY.addendum))).toBe('addendum');
  });
  it('stays on the current kind when none is permitted', () => {
    expect(resolveRevisionKind('amendment', holding())).toBe('amendment');
  });
});

describe('disabled titles', () => {
  it('names the refusal for a kind the person cannot release, and nothing for one they can', () => {
    const a = holding(REVISION_RELEASE_CAPABILITY.correction);
    expect(revisionKindDisabledTitle('amendment', a)).toBe(revisionReleaseRefusal('amendment'));
    expect(revisionKindDisabledTitle('addendum', a)).toBe(i18n.t('caseActionPermissions.addendumRelease'));
    expect(revisionKindDisabledTitle('correction', a)).toBeUndefined();
  });
  it('the entry buttons are explained only when the person holds none of the three', () => {
    expect(revisionEntryDisabledTitle(holding(REVISION_RELEASE_CAPABILITY.addendum))).toBeUndefined();
    expect(revisionEntryDisabledTitle(holding())).toBe(i18n.t('caseActionPermissions.revisionNone'));
    expect(i18n.t('caseActionPermissions.revisionNone')).not.toBe('caseActionPermissions.revisionNone');
  });
});
