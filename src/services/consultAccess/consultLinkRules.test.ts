// Batch 522 (PS-290): the rules behind an outside consult link.
import { describe, it, expect } from 'vitest';
import type { Case } from '@/types/case/Case';
import type { ConsultToken } from './IConsultTokenService';
import {
  buildConsultCaseView, consultLinkUrl, consultOpinionProblem, consultTokenFromLocation, consultLinksShown,
  looksLikeConsultToken, newestConsultLinksFirst, consultSubmitConfirmationKey, unrecordedExpiries,
} from './consultLinkRules';
import { generateConsultToken, hashConsultToken, CONSULT_TOKEN_PATTERN } from './consultTokenCrypto';

const CASE = {
  id: 'S26-1', accession: { accessionNumber: 'S26-0001' },
  patient: { firstName: 'Ana', lastName: 'Ruiz', dateOfBirth: '1970-01-02', mrn: 'MRN-SECRET' },
  specimens: [
    { id: 'sp-a', label: 'A', description: 'Skin, left arm', blocks: [{ label: '1', stains: [{ id: 'st-a1', stainName: 'H&E' }, { id: 'st-a2', stainName: 'SOX10' }] }] },
    { id: 'sp-b', label: 'B', description: 'Skin, back', blocks: [{ label: '1', stains: [{ id: 'st-b1', stainName: 'H&E' }] }] },
  ],
  diagnostic: { primaryDiagnosis: 'not for the consultant' },
} as unknown as Case;

const link = (over: Partial<ConsultToken> = {}): ConsultToken => ({
  id: 'l1', tokenHash: 'h', scope: { caseId: 'S26-1', caseAccessionNumber: 'S26-0001' },
  issuedByUserId: 'u1', issuedByName: 'Dr. A', issuedAt: '2026-10-10T10:00:00Z', expiresAt: '2099-01-01T00:00:00Z',
  isActive: true, consultantIdentifier: 'Dr. Outside', accessCount: 0, ...over,
});

describe('the consult link address', () => {
  it('carries the token after #, so no server sees it', () => {
    expect(consultLinkUrl('https://lab.example', 'ct_abc')).toBe('https://lab.example/consult#ct_abc');
  });
  it('reads the token from after #, or from the path for links issued before', () => {
    expect(consultTokenFromLocation(undefined, '#ct_abc')).toBe('ct_abc');
    expect(consultTokenFromLocation('ct_old', '')).toBe('ct_old');
    expect(consultTokenFromLocation(undefined, '')).toBeNull();
  });
});

describe('the token', () => {
  it('is 256 random bits, base64url, and its fingerprint is SHA-256', async () => {
    const t = generateConsultToken();
    expect(t).toMatch(CONSULT_TOKEN_PATTERN);
    expect(looksLikeConsultToken(t)).toBe(true);
    expect(new Set(Array.from({ length: 50 }, generateConsultToken)).size).toBe(50);
    expect(await hashConsultToken('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});

describe('what the consultant sees', () => {
  it('a whole-case link: the accession, the patient, every specimen and slide, and nothing else', () => {
    const v = buildConsultCaseView(CASE, link(), []);
    expect(v).toEqual({
      linkId: 'l1', accessionNumber: 'S26-0001',
      patient: { identity: 'masked', maskedName: 'A** R***', birthYearMasked: '**-***-1970' },
      specimens: [{ id: 'sp-a', label: 'A', description: 'Skin, left arm' }, { id: 'sp-b', label: 'B', description: 'Skin, back' }],
      slides: [{ id: 'st-a1', label: 'A-1 · H&E' }, { id: 'st-a2', label: 'A-1 · SOX10' }, { id: 'st-b1', label: 'B-1 · H&E' }],
      scopedSlideCount: 0, expiresAt: '2099-01-01T00:00:00Z', opinionSigned: false, lifetime: null,
    });
    expect(JSON.stringify(v)).not.toContain('MRN-SECRET');
    // Batch 669 (access-11): masked by default, so the surname and the full date never reach the page.
    expect(JSON.stringify(v)).not.toContain('Ruiz');
    expect(JSON.stringify(v)).not.toContain('Ana');
    expect(JSON.stringify(v)).not.toContain('1970-01-02');
    expect(JSON.stringify(v)).not.toContain('not for the consultant');
  });
  it('a link issued with the identity opt-in shows the full name and date of birth (Batch 669)', () => {
    const v = buildConsultCaseView(CASE, link({ revealIdentity: true }), []);
    expect(v.patient).toEqual({ identity: 'full', lastName: 'Ruiz', firstName: 'Ana', dateOfBirth: '02-JAN-1970' });
  });
  it('a slide-scoped link: only those slides, and only the specimens they come from', () => {
    const v = buildConsultCaseView(CASE, link({ scope: { caseId: 'S26-1', caseAccessionNumber: 'S26-0001', slideIds: ['st-a2'] } }), []);
    expect(v.slides).toEqual([{ id: 'st-a2', label: 'A-1 · SOX10' }]);
    expect(v.specimens.map(s => s.id)).toEqual(['sp-a']);
    expect(v.scopedSlideCount).toBe(1);
  });
  it('says when a signed opinion is already in on this link', () => {
    const v = buildConsultCaseView(CASE, link(), [{ tokenId: 'l1', signedStatus: 'Signed' } as never]);
    expect(v.opinionSigned).toBe(true);
  });
});

describe('opinions', () => {
  it('a blank opinion is refused; after a signed one, nothing more', () => {
    expect(consultOpinionProblem({ opinionText: ' ', signedStatus: 'Draft' }, [])).toBe('OPINION_REQUIRED');
    expect(consultOpinionProblem({ opinionText: 'ok', signedStatus: 'Draft' }, [{ signedStatus: 'Draft' }])).toBeNull();
    expect(consultOpinionProblem({ opinionText: 'ok', signedStatus: 'Signed' }, [{ signedStatus: 'Signed' }])).toBe('OPINION_ALREADY_SIGNED');
  });
});

describe('expiry and the cross-case list', () => {
  const now = new Date('2026-10-11T00:00:00Z');
  it('an active link past its expiry is recorded once; a revoked one is not', () => {
    const past = '2026-10-10T00:00:00Z';
    const links = [link({ id: 'a', expiresAt: past }), link({ id: 'b', expiresAt: past, expiryRecordedAt: past }), link({ id: 'c', expiresAt: past, isActive: false }), link({ id: 'd' })];
    expect(unrecordedExpiries(links, now).map(l => l.id)).toEqual(['a']);
  });
  it('active only, or all; newest first', () => {
    const links = [link({ id: 'old', issuedAt: '2026-10-01T00:00:00Z' }), link({ id: 'new', issuedAt: '2026-10-09T00:00:00Z' }), link({ id: 'gone', isActive: false })];
    expect(consultLinksShown(links, true).map(l => l.id)).toEqual(['old', 'new']);
    expect(consultLinksShown(links, false)).toHaveLength(3);
    expect(newestConsultLinksFirst(links).map(l => l.id)[0]).toBe('gone');
  });
});

describe('consultSubmitConfirmationKey (Batch 669, access-11)', () => {
  it('a signed opinion is recorded and returned; a draft is only saved', () => {
    expect(consultSubmitConfirmationKey('Signed')).toBe('externalConsultViewPage.opinionSubmittedConfirmation');
    expect(consultSubmitConfirmationKey('Draft')).toBe('externalConsultViewPage.draftSavedConfirmation');
  });
});
