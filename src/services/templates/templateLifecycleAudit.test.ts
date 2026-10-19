// Batch 609 (#39): every template lifecycle step writes an Audit Log entry (it used to go to the console only).
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { templateLifecycleAuditEntry, TEMPLATE_LIFECYCLE_EVENTS } from './templateLifecycleAudit';

describe('templateLifecycleAuditEntry (pure)', () => {
  it('names the template, version and status change, with no case', () => {
    const e = templateLifecycleAuditEntry('TEMPLATE_SUBMITTED', { id: 't1', name: 'Breast Invasive', version: '1.2.0', from: 'draft', to: 'in_review' }, 'Dr Author');
    expect(e).toMatchObject({ type: 'user', event: 'TEMPLATE_SUBMITTED', user: 'Dr Author', caseId: null, confidence: null });
    expect(e.detail).toBe('Template Breast Invasive v1.2.0 (t1): submitted for review. Status draft → in_review.');
  });
  it('an approval records the count; a note is flagged but never copied', () => {
    const e = templateLifecycleAuditEntry('TEMPLATE_APPROVED', { id: 't1', name: 'X', version: '1.0.0', from: 'in_review', to: 'approved', approvals: 2, noted: true }, 'A');
    expect(e.detail).toContain('Approvals: 2.');
    expect(e.detail).toContain('A reviewer note was recorded.');
  });
  it('a step with no status change, and a template with no name, still read clearly', () => {
    expect(templateLifecycleAuditEntry('TEMPLATE_DRAFT_DELETED', { id: 't9', from: 'draft' }, 'A').detail).toBe('Template Untitled (t9): draft deleted.');
    expect(templateLifecycleAuditEntry('TEMPLATE_DRAFT_SAVED', { id: 't2', name: 'N', to: 'draft' }, 'A').detail).toBe('Template N (t2): draft saved. Status draft.');
  });
  it('has wording for every event', () => {
    for (const ev of TEMPLATE_LIFECYCLE_EVENTS) expect(templateLifecycleAuditEntry(ev, { id: 'x' }, 'A').detail).toMatch(/^Template Untitled \(x\): [a-z]/);
  });
});

// ── end to end through templateService and the real audit log ──
const store: Record<string, string> = {};
beforeAll(() => {
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; },
  };
});
beforeEach(() => { for (const k of Object.keys(store)) delete store[k]; });
const signIn = (id: string, role = 'pathologist') => localStorage.setItem('pathscribe-user', JSON.stringify({ id, role, firstName: id, lastName: 'Test' }));
async function giveRoles(id: string, roles: string[]) { const { mockUserService } = await import('../users/mockUserService'); await mockUserService.update(id, { roles }); }
const sections = [{ id: 's1', title: 'S', fields: Array.from({ length: 5 }, (_, i) => ({ id: `f${i}`, label: `F${i}`, type: 'text', required: false, options: [], icd: '', snomed: `sct${i}` })) }] as never;

describe('templateService writes the Audit Log', () => {
  const auditFor = async (id: string) => {
    const { mockAuditService } = await import('../auditlog/mockAuditService');
    const res = await mockAuditService.getAuditLogs();
    return (res.ok ? res.data : []).filter(l => l.detail.includes(`(${id})`)).map(l => l.event);
  };

  it('draft, submit, request changes, resubmit, approve, publish, archive and restore each leave an entry', async () => {
    const svc = await import('./templateService');
    await giveRoles('1', ['Template Author']);
    await giveRoles('2', ['Template Approver']);
    await giveRoles('3', ['Template Approver', 'Template Author']);
    signIn('1');
    await svc.saveDraft({ id: 'aud-1', name: 'Audit one', source: 'Custom', version: '1.0.0', category: 'BREAST', sections });
    await svc.submitForReview('aud-1', 'please review');
    signIn('2');
    await svc.requestChanges('aud-1', 'fix the margins');
    signIn('1');
    await svc.resubmitForReview('aud-1');
    signIn('2');
    await svc.approveTemplate('aud-1');
    await svc.publishTemplate('aud-1');
    await svc.archiveTemplate('aud-1');
    await svc.restoreTemplate('aud-1');
    expect(await auditFor('aud-1')).toEqual(expect.arrayContaining([
      'TEMPLATE_DRAFT_SAVED', 'TEMPLATE_SUBMITTED', 'TEMPLATE_CHANGES_REQUESTED', 'TEMPLATE_RESUBMITTED',
      'TEMPLATE_APPROVED', 'TEMPLATE_PUBLISHED', 'TEMPLATE_ARCHIVED', 'TEMPLATE_RESTORED',
    ]));
    const { mockAuditService } = await import('../auditlog/mockAuditService');
    const logs = await mockAuditService.getAuditLogs();
    const all = logs.ok ? logs.data : [];
    // the reviewer's note text is never copied into the log
    expect(all.some(l => l.detail.includes('fix the margins') || l.detail.includes('please review'))).toBe(false);
    expect(all.find(l => l.event === 'TEMPLATE_APPROVED')?.detail).toContain('Status in_review → approved.');
  });

  it('publishing a New Version records the older version as superseded; deleting a draft and resetting to draft are recorded', async () => {
    const svc = await import('./templateService');
    await giveRoles('1', ['Template Author']);
    await giveRoles('2', ['Template Approver']);
    signIn('1');
    await svc.saveDraft({ id: 'aud-old', name: 'Audit versions', source: 'Custom', version: '1.0.0', category: 'BREAST', sections });
    await svc.submitForReview('aud-old');
    signIn('2');
    await svc.approveTemplate('aud-old');
    await svc.publishTemplate('aud-old');
    signIn('1');
    await svc.saveDraft({ id: 'aud-new', name: 'Audit versions', source: 'Custom', version: '1.1.0', category: 'BREAST', sections, supersedesId: 'aud-old' });
    await svc.submitForReview('aud-new');
    signIn('2');
    await svc.approveTemplate('aud-new');
    await svc.publishTemplate('aud-new');
    expect(await auditFor('aud-old')).toContain('TEMPLATE_SUPERSEDED');

    signIn('1');
    await svc.saveDraft({ id: 'aud-del', name: 'Audit delete', source: 'Custom', version: '1.0.0', category: 'BREAST', sections });
    await svc.deleteTemplate('aud-del');
    expect(await auditFor('aud-del')).toContain('TEMPLATE_DRAFT_DELETED');

    await svc.saveDraft({ id: 'aud-reset', name: 'Audit reset', source: 'Custom', version: '1.0.0', category: 'BREAST', sections });
    await svc.submitForReview('aud-reset');
    signIn('2');
    await svc.resetToDraft('aud-reset');
    expect(await auditFor('aud-reset')).toContain('TEMPLATE_RESET_TO_DRAFT');
  });

  it('a refused step (no permission) writes nothing', async () => {
    const svc = await import('./templateService');
    await giveRoles('1', ['Template Author']);
    signIn('1');
    await svc.saveDraft({ id: 'aud-no', name: 'Audit refused', source: 'Custom', version: '1.0.0', category: 'BREAST', sections });
    await svc.submitForReview('aud-no');
    await expect(svc.approveTemplate('aud-no')).rejects.toMatchObject({ code: 'NOT_APPROVER' });
    expect(await auditFor('aud-no')).not.toContain('TEMPLATE_APPROVED');
  });
});
