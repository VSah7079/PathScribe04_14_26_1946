import { describe, it, expect } from 'vitest';
import type { CaseParticipant } from '@/types/case/Case';
import { collaboratorNotice, fold, spokenName, matchCollaborator, withCollaborator, collaboratorCommandAllowed, type CollaboratorCandidate } from './collaboratorCommand';

const s = (id: string, firstName: string, lastName: string, status: 'Active' | 'Inactive' = 'Active', over: Partial<CollaboratorCandidate> = {}): CollaboratorCandidate => ({ id, firstName, lastName, status, ...over });
const staff = [s('1', 'Paul', 'Carter'), s('2', 'Maria', 'García-López'), s('3', 'Paul', 'Nguyen'), s('4', 'Ann', 'Carter', 'Inactive'), s('5', 'Zoë', 'Müller', 'Active', { gmcNumber: '7001' })];
const PHRASES = ['add collaborator', 'ajouter collaborateur'];

describe('spokenName', () => {
  it('drops the command words and titles', () => {
    expect(spokenName('add collaborator Dr. Carter', PHRASES)).toBe('carter');
    expect(spokenName('Add Collaborator doctor Paul Nguyen', PHRASES)).toBe('paul nguyen');
    expect(spokenName('add collaborator', PHRASES)).toBe('');
  });
  it('folds accents and punctuation', () => {
    expect(fold('García-López')).toBe('garcia lopez');
    expect(spokenName('ajouter collaborateur Zoë Müller', PHRASES)).toBe('zoe muller');
  });
});

describe('matchCollaborator', () => {
  it('matches one active person by last name, first name or both', () => {
    expect(matchCollaborator('nguyen', staff)).toMatchObject({ kind: 'match', staff: { id: '3' } });
    expect(matchCollaborator('maria', staff)).toMatchObject({ kind: 'match', staff: { id: '2' } });
    expect(matchCollaborator('paul carter', staff)).toMatchObject({ kind: 'match', staff: { id: '1' } });
    expect(matchCollaborator('garcia lopez', staff)).toMatchObject({ kind: 'match', staff: { id: '2' } });
    expect(matchCollaborator('zoe muller', staff)).toMatchObject({ kind: 'match', staff: { id: '5' } });
  });
  it('adds nobody when the name is empty, unknown or shared', () => {
    expect(matchCollaborator('', staff)).toEqual({ kind: 'noName' });
    expect(matchCollaborator('smith', staff)).toEqual({ kind: 'none', spoken: 'smith' });
    expect(matchCollaborator('paul', staff)).toEqual({ kind: 'ambiguous', spoken: 'paul', count: 2 });
  });
  it('never offers an inactive person', () => {
    expect(matchCollaborator('ann', staff)).toEqual({ kind: 'none', spoken: 'ann' });
    expect(matchCollaborator('carter', staff)).toMatchObject({ kind: 'match', staff: { id: '1' } });
  });
});

describe('withCollaborator', () => {
  const lead: CaseParticipant = { staffId: '9', staffName: 'Lead Path', source: 'system', participationTypeIds: ['primary'], addedBy: 'system', addedAt: 't0', status: 'active' };
  it('adds the person as a consultant, with their GMC number when they have one', () => {
    const r = withCollaborator([lead], staff[4], 'me', 't1');
    expect(r.kind).toBe('added');
    if (r.kind === 'added') expect(r.participants[1]).toEqual({ staffId: '5', staffName: 'Zoë Müller', externalId: '7001', externalIdType: 'GMC', source: 'manual', participationTypeIds: ['consultant'], addedBy: 'me', addedAt: 't1', status: 'active' });
  });
  it('does not add someone already on the team', () => {
    expect(withCollaborator([lead], s('9', 'Lead', 'Path'), 'me', 't1')).toEqual({ kind: 'already' });
  });
  it('brings back someone removed earlier as one record, as consultant', () => {
    const removed: CaseParticipant = { ...lead, staffId: '1', staffName: 'Paul Carter', participationTypeIds: ['resident'], status: 'removed' };
    const r = withCollaborator([lead, removed], staff[0], 'me', 't2');
    expect(r.kind === 'added' && r.participants.filter(p => p.staffId === '1')).toEqual([expect.objectContaining({ status: 'active', participationTypeIds: ['consultant'] })]);
  });
});

describe('collaboratorCommandAllowed', () => {
  it('needs an open case and no window in front', () => {
    expect(collaboratorCommandAllowed({ caseLoaded: true, modalOpen: false })).toBe(true);
    expect(collaboratorCommandAllowed({ caseLoaded: false, modalOpen: false })).toBe(false);
    expect(collaboratorCommandAllowed({ caseLoaded: true, modalOpen: true })).toBe(false);
  });
});

describe('collaboratorNotice', () => {
  it('tells the new collaborator who added them to which case, with the case link field', () => {
    const n = collaboratorNotice({ caseId: 'case-9', caseLabel: 'S26-1001', from: { id: 'u1', name: 'Dr. Carter' }, to: { id: 'u2', name: 'Paul Nguyen' }, at: new Date('2026-10-23T12:00:00Z') });
    expect(n).toMatchObject({ senderId: 'u1', recipientId: 'u2', recipientName: 'Paul Nguyen', caseNumber: 'case-9', isUrgent: false, subject: 'Consultation requested — S26-1001' });
    expect(n.body).toContain('Dr. Carter added you to the case team for case S26-1001 as a Consultant.');
  });
  it('falls back to the case id when there is no label', () => {
    expect(collaboratorNotice({ caseId: 'case-9', from: { id: 'a', name: 'A' }, to: { id: 'b', name: 'B' }, at: new Date(0) }).subject).toBe('Consultation requested — case-9');
  });
});
