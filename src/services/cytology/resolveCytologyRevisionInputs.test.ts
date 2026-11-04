import { describe, it, expect } from 'vitest';
import {
  latestCytologySignOut, correctionDraftFromReview, buildCorrectedFindings, resolveCytologyReleaseContext, EMPTY_CORRECTION_DRAFT,
} from './resolveCytologyRevisionInputs';

const categories: any[] = [
  { id: 'nilm', label: 'NILM', requiresPathologistReview: false },
  { id: 'hsil', label: 'HSIL', requiresPathologistReview: true },
];

describe('latestCytologySignOut', () => {
  it('picks the most recently signed record, whatever the order', () => {
    const recs: any[] = [{ id: 'b', signedAt: '2026-09-02T00:00:00Z' }, { id: 'c', signedAt: '2026-09-03T00:00:00Z' }, { id: 'a', signedAt: '2026-09-01T00:00:00Z' }];
    expect(latestCytologySignOut(recs)?.id).toBe('c');
  });
  it('is undefined for none', () => expect(latestCytologySignOut([])).toBeUndefined());
});

describe('correctionDraftFromReview', () => {
  it('starts from the signed review, comments included, without sharing its arrays', () => {
    const review: any = {
      generalCategorizationId: 'g1', primaryInterpretationId: 'hsil', primaryInterpretationComment: 'see slide 2',
      adequacySelections: [{ categoryId: 'ad1' }], additionalInterpretations: [{ categoryId: 'x', comment: 'c' }], recommendations: [{ categoryId: 'r1' }],
    };
    const d = correctionDraftFromReview(review);
    expect(d).toMatchObject({ generalCategorizationId: 'g1', primaryInterpretationId: 'hsil', primaryInterpretationComment: 'see slide 2' });
    expect(d.additionalInterpretations).toEqual([{ categoryId: 'x', comment: 'c' }]);
    expect(d.additionalInterpretations).not.toBe(review.additionalInterpretations);
  });
  it('is empty when there is no review', () => expect(correctionDraftFromReview(undefined)).toEqual(EMPTY_CORRECTION_DRAFT));
});

describe('buildCorrectedFindings', () => {
  it('turns empty entries into undefined and flags pathologist review from the categories', () => {
    const f = buildCorrectedFindings({ ...EMPTY_CORRECTION_DRAFT, primaryInterpretationId: 'hsil', primaryInterpretationComment: '  ' }, categories);
    expect(f).toMatchObject({ primaryInterpretationId: 'hsil', requiresPathologistReview: true });
    expect(f.generalCategorizationId).toBeUndefined();
    expect(f.adequacySelections).toBeUndefined();
    expect(f.primaryInterpretationComment).toBeUndefined();
  });
  it('a negative primary with a flagged additional interpretation still needs review', () => {
    const f = buildCorrectedFindings({ ...EMPTY_CORRECTION_DRAFT, primaryInterpretationId: 'nilm', additionalInterpretations: [{ categoryId: 'hsil' }] }, categories);
    expect(f.requiresPathologistReview).toBe(true);
  });
  it('a negative result does not', () => {
    expect(buildCorrectedFindings({ ...EMPTY_CORRECTION_DRAFT, primaryInterpretationId: 'nilm' }, categories).requiresPathologistReview).toBe(false);
  });
});

describe('resolveCytologyReleaseContext', () => {
  it('assembles patient, order and specimen as the report content wants them', () => {
    const c = resolveCytologyReleaseContext(
      { id: 'C1', patient: { firstName: 'Ann', lastName: 'Lee', mrn: 'M1', dateOfBirth: '1990-01-01' }, accession: { fullAccession: 'S26-1-CYT' }, order: { requestingProvider: 'Dr X', facilityId: 'F1' } },
      { description: 'Pap', cytologyScreening: { preparationMethod: 'Liquid-Based', hpvResult: 'Negative' } },
    );
    expect(c.patient).toMatchObject({ name: 'Ann Lee', mrn: 'M1' });
    expect(c.order).toEqual({ accessionNumber: 'S26-1-CYT', orderingProvider: 'Dr X', facilityId: 'F1' });
    expect(c.specimen).toMatchObject({ typeDescription: 'Pap', preparationMethod: 'Liquid-Based', hpvResult: 'Negative' });
  });
  it('falls back to the case id and the stored placeholders', () => {
    const c = resolveCytologyReleaseContext({ id: 'C2' }, {});
    expect(c.patient.name).toBe('Unknown Patient');
    expect(c.order.accessionNumber).toBe('C2');
    expect(c.specimen.typeDescription).toBe('Cytology specimen');
  });
});
