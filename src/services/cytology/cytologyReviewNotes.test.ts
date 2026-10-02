// Batch 412 (Pete): notes on part of someone's review; "Requires revision" stops a cytotechnologist, never a pathologist.
import { describe, it, expect, vi } from 'vitest';
import { acknowledgeCytologyReviewNote, addCytologyReviewNote, hasPendingAuthorRevision, reviewNotesAfterSave } from './cytologyReviewNotes';
import { makeWorkspaceDeps } from './cytologyWorkspaceTestDeps';
import { resolveCytologySignOutGate } from './resolveCytologySignOutGate';
import { resolveCanSignOutCytology } from './resolveCanSignOutCytology';
import type { CytologyReviewNote } from '@/types/cytology/CytologyReviewRecord';

const ctReview = { id: 'rv-ct', recordedBy: { userId: 'CT1', userName: 'CT One' } } as never;
const note = (over: Partial<CytologyReviewNote> = {}): CytologyReviewNote => ({
  id: 'rn-1', reviewId: 'rv-ct', reviewAuthorId: 'CT1', section: 'adequacy', text: 'Obscuring blood?', requiresRevision: true,
  by: { userId: 'P1', userName: 'Dr P' }, at: '2026-09-30T10:00:00Z', status: 'open', ...over,
});
const specimenWith = (notes: CytologyReviewNote[]) => ({ id: 'SP1', cytologyScreening: { reviewNotes: notes } });
const caseData = { id: 'C1', accession: { fullAccession: 'S26-1' }, specimens: [specimenWith([])] } as never;

describe('addCytologyReviewNote', () => {
  const base = { caseData, specimenId: 'SP1', specimen: specimenWith([]), review: ctReview, section: 'primary' as const, text: 'Consider LSIL', requiresRevision: false, user: { id: 'P1', name: 'Dr P' } };
  it('a plain note needs no permission and never blocks', async () => {
    const { deps, updates } = makeWorkspaceDeps({ enforce: vi.fn(async () => ({ allowed: false })) });
    expect(await addCytologyReviewNote(base, deps)).toBe('added');
    const saved = updates[0].patch.specimens[0].cytologyScreening.reviewNotes;
    expect(saved[0]).toMatchObject({ reviewId: 'rv-ct', reviewAuthorId: 'CT1', section: 'primary', status: 'open', requiresRevision: false });
    expect(hasPendingAuthorRevision({ cytologyScreening: { reviewNotes: saved } })).toBe(false);
  });
  it('"Requires revision" needs cytology:revision:request, and is audited', async () => {
    const refused = makeWorkspaceDeps({ enforce: vi.fn(async () => ({ allowed: false })) });
    expect(await addCytologyReviewNote({ ...base, requiresRevision: true }, refused.deps)).toBe('notPermitted');
    expect(refused.deps.enforce).toHaveBeenCalledWith('cytology:revision:request', { caseId: 'C1' });
    const { deps, audit } = makeWorkspaceDeps();
    expect(await addCytologyReviewNote({ ...base, requiresRevision: true }, deps)).toBe('added');
    expect(audit[0].event).toBe('Cytology review revision requested');
  });
  it('not on your own review, and not empty', async () => {
    const { deps } = makeWorkspaceDeps();
    expect(await addCytologyReviewNote({ ...base, user: { id: 'CT1', name: 'CT One' } }, deps)).toBe('ownReview');
    expect(await addCytologyReviewNote({ ...base, text: '  ' }, deps)).toBe('textRequired');
  });
});

describe('acknowledging and closing', () => {
  it('only the review\'s author acknowledges', async () => {
    const { deps, updates } = makeWorkspaceDeps();
    const specimen = specimenWith([note()]);
    expect(await acknowledgeCytologyReviewNote({ caseData, specimenId: 'SP1', specimen, noteId: 'rn-1', user: { id: 'P1' } }, deps)).toBe('notAuthor');
    expect(await acknowledgeCytologyReviewNote({ caseData, specimenId: 'SP1', specimen, noteId: 'rn-1', user: { id: 'CT1' } }, deps)).toBe('acknowledged');
    expect(updates[0].patch.specimens[0].cytologyScreening.reviewNotes[0]).toMatchObject({ status: 'acknowledged', acknowledgedAt: '2026-09-30T18:00:00.000Z' });
  });
  it('the author saving after acknowledging revises it; an unacknowledged note stays open', () => {
    const specimen = specimenWith([note({ status: 'acknowledged' }), note({ id: 'rn-2' })]);
    const after = reviewNotesAfterSave(specimen, { reviewId: 'rv-ct', byUserId: 'CT1', byUserName: 'CT One', isPathologistReview: false }, 'T')!;
    expect(after.map(n => n.status)).toEqual(['revised', 'open']);
  });
  it('a pathologist\'s own review resolves every open revision request', () => {
    const specimen = specimenWith([note(), note({ id: 'rn-2', status: 'acknowledged' }), note({ id: 'rn-3', requiresRevision: false })]);
    const after = reviewNotesAfterSave(specimen, { reviewId: 'rv-path', byUserId: 'P1', byUserName: 'Dr P', isPathologistReview: true }, 'T')!;
    expect(after.map(n => n.status)).toEqual(['resolvedByPathologist', 'resolvedByPathologist', 'open']);
    expect(after[0]).toMatchObject({ resolvedByReviewId: 'rv-path', resolvedBy: { userName: 'Dr P' } });
    expect(hasPendingAuthorRevision({ cytologyScreening: { reviewNotes: after } })).toBe(false);
  });
  it('nothing to settle: null', () => {
    expect(reviewNotesAfterSave(specimenWith([]), { reviewId: 'x', byUserId: 'U', byUserName: 'U', isPathologistReview: true }, 'T')).toBeNull();
  });
});

describe('the sign-out gate (Pete: blocks CT only)', () => {
  it('an open revision request stops a cytotechnologist, never a pathologist', () => {
    const gate = resolveCytologySignOutGate({ requiresPathologistReview: false }, true, false, [], 'US', [], undefined, undefined, true);
    expect(gate.blockedReasons).toEqual(['pending_author_revision']);
    expect(resolveCanSignOutCytology(false, gate)).toBe(false);
    expect(resolveCanSignOutCytology(true, gate)).toBe(true);
  });
});
