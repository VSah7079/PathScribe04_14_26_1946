// Batch 454: the protected follow-up actions and the clinician email.
import { describe, expect, it, vi } from 'vitest';
import { createMemoryFollowUpStore } from './followUpStore';
import { markFollowUpExpected, followUpMarkOffer, recordFollowUpDisposition, reopenFollowUp, noteFollowUpAlertSent, type FollowUpActionDeps } from './followUpActions';
import { clinicianEmailProblem, canOfferClinicianEmail, draftFollowUpClinicianEmail, emailOrderingClinician, fillFollowUpTemplate } from './followUpClinicianEmail';
import { resolveEffectiveFollowUpSettings, unknownFollowUpPlaceholders, validateFollowUpSettings, DEFAULT_FOLLOW_UP_SETTINGS } from './followUpSettings';
import type { FollowUpItem } from './followUpTypes';

const NOW = new Date('2026-10-04T12:00:00Z');
const user = { id: 'u1', name: 'Dr One' };

function deps(allowed = true, store = createMemoryFollowUpStore()) {
  const enforce = vi.fn(async () => ({ allowed }));
  const logAudit = vi.fn(async (_event: unknown) => undefined);
  const d: FollowUpActionDeps = { enforce, store, now: () => NOW, logAudit };
  return { d, enforce, logAudit, store };
}

const rule = { windowDays: 180, anchor: 'collection' as const, source: 'enterprise' as const };
const caseInfo = {
  id: 'c1', accession: 'S26-1', patientId: 'P', facilityId: 'F1',
  specimens: [
    { id: 'cyto', surgical: false, collectedAt: '2026-08-01T00:00:00Z' },
    { id: 'late', surgical: true, collectedAt: '2026-09-10T00:00:00Z' },
    { id: 'early', surgical: true, collectedAt: '2026-09-01T00:00:00Z' },
  ],
};

describe('markFollowUpExpected', () => {
  it('checks case:follow-up:expect and stores the window from the earliest surgical specimen', async () => {
    const { d, enforce, logAudit, store } = deps();
    const res = await markFollowUpExpected({ caseInfo, signedOutAt: '2026-09-20T00:00:00Z', rule, user }, d);
    expect(enforce).toHaveBeenCalledWith('case:follow-up:expect', { caseId: 'c1', facilityId: 'F1' });
    expect(res.ok).toBe(true);
    const [saved] = await store.getExpectations();
    expect(saved).toMatchObject({ caseId: 'c1', specimenId: 'early', markedBy: 'u1', window: { startsAt: '2026-09-01T00:00:00.000Z', windowDays: 180 } });
    expect((logAudit.mock.calls[0] as unknown[])[0]).toMatchObject({ event: 'followup.expected_marked', caseId: 'S26-1' });
  });
  it('refused without the capability, or with no surgical specimen; nothing stored', async () => {
    const refused = deps(false);
    expect(await markFollowUpExpected({ caseInfo, signedOutAt: '', rule, user }, refused.d)).toEqual({ ok: false, reason: 'notPermitted' });
    expect(await refused.store.getExpectations()).toEqual([]);
    const { d } = deps();
    expect(await markFollowUpExpected({ caseInfo: { ...caseInfo, specimens: [caseInfo.specimens[0]] }, signedOutAt: '', rule, user }, d)).toEqual({ ok: false, reason: 'noSurgicalSpecimen' });
  });
  it('falls back to sign-out when no specimen date exists', async () => {
    const { d } = deps();
    const res = await markFollowUpExpected({ caseInfo: { ...caseInfo, specimens: [{ id: 's', surgical: true }] }, signedOutAt: '2026-09-20T00:00:00Z', rule, user }, d);
    expect(res.ok === true && res.data.window.anchorUsed).toBe('signOut');
  });
});

describe('Batch 459: marking after sign-out', () => {
  it('flags the mark and says so in the audit detail', async () => {
    const { d, logAudit, store } = deps();
    const res = await markFollowUpExpected({ caseInfo, signedOutAt: '2026-09-20T00:00:00Z', rule, user, afterSignOut: true }, d);
    expect(res.ok === true && res.data.markedAfterSignOut).toBe(true);
    expect((await store.getExpectations())[0].markedAfterSignOut).toBe(true);
    expect(((logAudit.mock.calls[0] as unknown[])[0] as { detail: string }).detail).toMatch(/; marked after sign-out$/);
  });
  it('a mark made at sign-out is not flagged', async () => {
    const { d, logAudit } = deps();
    const res = await markFollowUpExpected({ caseInfo, signedOutAt: '2026-09-20T00:00:00Z', rule, user }, d);
    expect(res.ok === true && 'markedAfterSignOut' in res.data).toBe(false);
    expect(((logAudit.mock.calls[0] as unknown[])[0] as { detail: string }).detail).not.toMatch(/after sign-out/);
  });
  it('offers the mark only on a signed-out case with a surgical specimen, and shows an existing mark', async () => {
    expect(followUpMarkOffer({ status: 'finalized', caseInfo, expectation: null })).toEqual({ kind: 'offer' });
    expect(followUpMarkOffer({ status: 'closed', caseInfo, expectation: null })).toEqual({ kind: 'offer' });
    expect(followUpMarkOffer({ status: 'in-progress', caseInfo, expectation: null })).toEqual({ kind: 'none' });
    expect(followUpMarkOffer({ status: 'finalized', caseInfo: { ...caseInfo, specimens: [caseInfo.specimens[0]] }, expectation: null })).toEqual({ kind: 'none' });
    const { d } = deps();
    const res = await markFollowUpExpected({ caseInfo, signedOutAt: '2026-09-20T00:00:00Z', rule, user }, d);
    const expectation = res.ok === true ? res.data : null;
    expect(followUpMarkOffer({ status: 'finalized', caseInfo, expectation })).toEqual({ kind: 'marked', expectation });
  });
});

describe('dispositions', () => {
  const input = { key: 'cytology:c1:s1', caseId: 'c1', accession: 'CY-1', facilityId: 'F1', user };
  it('checks qa:follow-up:record, saves and audits; reopening removes it', async () => {
    const { d, enforce, logAudit, store } = deps();
    const res = await recordFollowUpDisposition({ ...input, value: 'receivedElsewhere', note: ' Resected at City Hospital ' }, d);
    expect(enforce).toHaveBeenCalledWith('qa:follow-up:record', { caseId: 'c1', facilityId: 'F1' });
    expect(res.ok).toBe(true);
    expect((await store.getRecords())[0].disposition).toMatchObject({ value: 'receivedElsewhere', note: 'Resected at City Hospital', recordedBy: 'u1' });
    expect((logAudit.mock.calls[0] as unknown[])[0]).toMatchObject({ event: 'followup.disposition_recorded', detail: 'Follow-up closed: receivedElsewhere' });
    await reopenFollowUp(input, d);
    expect((await store.getRecords())[0].disposition).toBeUndefined();
  });
  it('"other" needs a note; unknown values and long notes are refused', async () => {
    const { d } = deps();
    expect(await recordFollowUpDisposition({ ...input, value: 'other' }, d)).toEqual({ ok: false, reason: 'noteRequired' });
    expect(await recordFollowUpDisposition({ ...input, value: 'nope' as never }, d)).toEqual({ ok: false, reason: 'unknownDisposition' });
    expect(await recordFollowUpDisposition({ ...input, value: 'other', note: 'x'.repeat(1001) }, d)).toEqual({ ok: false, reason: 'noteTooLong' });
  });
  it('refused without the capability', async () => {
    const { d, store } = deps(false);
    expect(await recordFollowUpDisposition({ ...input, value: 'patientDeclined' }, d)).toEqual({ ok: false, reason: 'notPermitted' });
    expect(await reopenFollowUp(input, d)).toEqual({ ok: false, reason: 'notPermitted' });
    expect(await store.getRecords()).toEqual([]);
  });
  it('alert bookkeeping keeps the disposition and contacts', async () => {
    const { d, store } = deps();
    await recordFollowUpDisposition({ ...input, value: 'patientDeceased' }, d);
    await noteFollowUpAlertSent(input.key, 'overdue', NOW, store);
    expect((await store.getRecords())[0]).toMatchObject({ disposition: { value: 'patientDeceased' }, alertsSent: { overdue: NOW.toISOString() } });
  });
});

describe('settings', () => {
  it('validates the warning period, lengths and placeholders', () => {
    expect(validateFollowUpSettings(DEFAULT_FOLLOW_UP_SETTINGS)).toEqual([]);
    expect(validateFollowUpSettings({ warningDays: -1 })).toEqual(['warningDaysInvalid']);
    expect(validateFollowUpSettings({ warningDays: 1.5 })).toEqual(['warningDaysInvalid']);
    expect(validateFollowUpSettings({ emailBody: 'Dear {{clinicianName}}, about {{patientName}}' })).toEqual(['unknownPlaceholder']);
    expect(unknownFollowUpPlaceholders('{{ accession }} {{diagnosis}}')).toEqual(['diagnosis']);
  });
  it('a facility override wins where it sets a value', () => {
    const eff = resolveEffectiveFollowUpSettings({ ...DEFAULT_FOLLOW_UP_SETTINGS, warningDays: 14 }, { overrides: { clinicianEmailEnabled: true, warningDays: undefined } });
    expect(eff).toMatchObject({ warningDays: 14, clinicianEmailEnabled: true, source: 'facility' });
    expect(resolveEffectiveFollowUpSettings(null, null)).toMatchObject({ warningDays: 30, clinicianEmailEnabled: false, source: 'enterprise' });
  });
});

const item: FollowUpItem = {
  key: 'cytology:c1:s1', kind: 'cytology', caseId: 'c1', specimenId: 's1', accession: 'CY-26-9', facilityId: 'F1',
  orderingPhysicianId: 'PH', requestingProvider: 'Dr Order',
  window: { anchor: 'collection', anchorUsed: 'collection', startsAt: '2026-01-01T00:00:00Z', endsAt: '2026-06-30T00:00:00Z', windowDays: 180, ruleSource: 'enterprise' },
  dueAt: '2026-06-30T00:00:00Z', status: 'overdue', daysRemaining: null, daysOverdue: 96,
  record: { key: 'cytology:c1:s1', clinicianContacts: [], alertsSent: {} },
};

describe('clinician email', () => {
  const defaults = { subject: 'Follow-up for {{accession}}', body: 'Dear {{clinicianName}},\nPlease send the follow-up for {{accession}} (due {{dueDate}}).\n{{senderName}}, {{labName}}' };
  it('drafts from the built-in wording, or the lab template when set; the address comes from the directory', () => {
    const draft = draftFollowUpClinicianEmail({
      item, clinician: { namePrefix: 'Dr', givenNames: 'Ann', familyNames: 'Lee', email: 'ann.lee@clinic.org' },
      settings: { emailSubject: '', emailBody: '' }, defaults, labName: 'DVMC Lab', senderName: 'Pat QA', formatDate: iso => iso.slice(0, 10),
    });
    expect(draft).toEqual({
      to: 'ann.lee@clinic.org', clinicianName: 'Dr Ann Lee', subject: 'Follow-up for CY-26-9',
      body: 'Dear Dr Ann Lee,\nPlease send the follow-up for CY-26-9 (due 2026-06-30).\nPat QA, DVMC Lab',
    });
    const own = draftFollowUpClinicianEmail({ item, clinician: null, settings: { emailSubject: 'Re {{accession}}', emailBody: 'Hello {{clinicianName}}' }, defaults, labName: '', senderName: '', formatDate: s => s });
    expect(own).toMatchObject({ to: '', subject: 'Re CY-26-9', body: 'Hello Dr Order' });
  });
  it('leaves an unknown placeholder in place, and Send refuses it', () => {
    expect(fillFollowUpTemplate('{{accession}} {{x}}', { accession: 'A' })).toBe('A {{x}}');
    expect(clinicianEmailProblem({ to: 'a@b.org', subject: 's', body: 'A {{x}}' })).toBe('unfilledPlaceholder');
    expect(clinicianEmailProblem({ to: 'not-an-email', subject: 's', body: 'b' })).toBe('invalidEmail');
    expect(clinicianEmailProblem({ to: 'a@b.org, c@d.org', subject: 's', body: 'b' })).toBe('invalidEmail');
    expect(clinicianEmailProblem({ to: 'a@b.org', subject: ' ', body: 'b' })).toBe('emptyMessage');
  });
  it('offered only when the facility turned it on and the follow-up needs attention', () => {
    expect(canOfferClinicianEmail(item, { clinicianEmailEnabled: true })).toBe(true);
    expect(canOfferClinicianEmail(item, { clinicianEmailEnabled: false })).toBe(false);
    expect(canOfferClinicianEmail({ status: 'received' }, { clinicianEmailEnabled: true })).toBe(false);
  });

  function emailDeps(opts: { allowed?: boolean; enabled?: boolean; accepted?: boolean } = {}) {
    const base = deps(opts.allowed ?? true);
    const sendEmail = vi.fn(async (_p: unknown) => opts.accepted ?? true);
    return { ...base, sendEmail, ed: { ...base.d, sendEmail, getSettings: async () => ({ clinicianEmailEnabled: opts.enabled ?? true }) } };
  }
  const draft = { to: ' ann.lee@clinic.org ', subject: 'Follow-up for CY-26-9', body: 'Dear Dr Lee,\n<please> send it.' };

  it('sends only after the checks, notes the contact and audits it', async () => {
    const { ed, sendEmail, enforce, store, logAudit } = emailDeps();
    const res = await emailOrderingClinician({ item, ...draft, user }, ed);
    expect(res.ok).toBe(true);
    expect(enforce).toHaveBeenCalledWith('qa:follow-up-clinician:email', { caseId: 'c1', facilityId: 'F1' });
    expect(sendEmail).toHaveBeenCalledWith({
      to: ['ann.lee@clinic.org'], subject: 'Follow-up for CY-26-9', bodyText: draft.body,
      bodyHtml: 'Dear Dr Lee,<br>&lt;please&gt; send it.', metadata: { kind: 'follow-up-request', caseId: 'c1', followUpKey: item.key },
    });
    expect((await store.getRecords())[0].clinicianContacts).toEqual([{ sentAt: NOW.toISOString(), sentBy: 'u1', sentByName: 'Dr One', to: 'ann.lee@clinic.org' }]);
    expect((logAudit.mock.calls[0] as unknown[])[0]).toMatchObject({ event: 'followup.clinician_emailed', caseId: 'CY-26-9' });
  });
  it('a send the mail service refused is not recorded as sent', async () => {
    const { ed, store, logAudit } = emailDeps({ accepted: false });
    expect(await emailOrderingClinician({ item, ...draft, user }, ed)).toEqual({ ok: false, reason: 'sendFailed' });
    expect(await store.getRecords()).toEqual([]);
    expect((logAudit.mock.calls[0] as unknown[])[0]).toMatchObject({ event: 'followup.clinician_email_failed' });
  });
  it('sends nothing without the capability, when the facility has it off, when the follow-up is not open, or with a bad address', async () => {
    for (const [opts, it2, d, reason] of [
      [{ allowed: false }, item, draft, 'notPermitted'],
      [{ enabled: false }, item, draft, 'disabled'],
      [{}, { ...item, status: 'received' }, draft, 'notOpen'],
      [{}, item, { ...draft, to: 'nobody' }, 'invalidEmail'],
    ] as const) {
      const { ed, sendEmail, store } = emailDeps(opts);
      expect(await emailOrderingClinician({ item: it2 as FollowUpItem, ...d, user }, ed)).toEqual({ ok: false, reason });
      expect(sendEmail).not.toHaveBeenCalled();
      expect(await store.getRecords()).toEqual([]);
    }
  });
});
