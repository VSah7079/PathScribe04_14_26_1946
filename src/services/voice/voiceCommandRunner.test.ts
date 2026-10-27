// @vitest-environment happy-dom
// Batch 650, items 5-7: confirm by repeating, the shared eligibility check, and the audit entry, through the runner
// (fake registry for the rules; the real registry for the integration cases at the bottom).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async () => ({ allowed: true }), evaluate: async () => ({ allowed: true }), grantedCapabilities: async () => new Set<string>() },
}));
import type { SystemAction } from '../actionRegistry/IActionRegistryService';
import type { NewAuditLog } from '../auditlog/IAuditService';
import { createVoiceCommandRunner, REPEAT_CONFIRMATION_WINDOW_MS, type VoiceCommandRegistryPort } from './voiceCommandRunner';
import { mockActionRegistryService } from '../actionRegistry/mockActionRegistryService';
import { CONFIRM_BY_REPEAT_ACTION_IDS } from '../actionRegistry/repeatConfirmationCommands';
import { VOICE_CONTEXT } from '../../constants/systemActions';

const action = (id: string, extra: Partial<SystemAction> = {}): SystemAction => ({
  id, label: id, category: 'SYNOPTIC', shortcut: '', internalKey: id, voiceTriggers: [id.toLowerCase()], learnedTriggers: [], requiredRole: 'All Staff', isActive: true, ...extra,
});

function setup(actions: SystemAction[], eligibleIds: string[], opts: { auditFails?: boolean } = {}) {
  let clock = 1_000_000;
  const executed: string[] = [];
  const audit: NewAuditLog[] = [];
  const registry: VoiceCommandRegistryPort = {
    findActionByTrigger: (t, _l, o) => actions.find(a => a.voiceTriggers.includes(t.toLowerCase()) && (o?.ignoreEligibility || eligibleIds.includes(a.id))),
    getEligibleActions: () => actions.filter(a => eligibleIds.includes(a.id)),
    getCurrentContext: () => 'SYNOPTIC',
    executeAction: a => { executed.push(a.id); },
  };
  const runner = createVoiceCommandRunner({
    registry, now: () => clock, getUserName: () => 'Dr. Test',
    audit: { logEvent: async e => { audit.push(e); if (opts.auditFails) throw new Error('down'); return undefined; } },
  });
  return { runner, executed, audit, advance: (ms: number) => { clock += ms; } };
}

describe('confirm by repeating the phrase', () => {
  const risky = action('RECALL_REPORT', { confirmByRepeat: true });
  it('the first hearing runs nothing and asks; the same phrase again runs it', () => {
    const s = setup([risky], ['RECALL_REPORT']);
    expect(s.runner.handle('recall_report', 'en').kind).toBe('confirmationNeeded');
    expect(s.executed).toEqual([]);
    const second = s.runner.handle('recall_report', 'en');
    expect(second).toMatchObject({ kind: 'executed', confirmed: true });
    expect(s.executed).toEqual(['RECALL_REPORT']);
    expect(s.runner.pending()).toBeNull();
  });
  it('anything else said instead rejects it; the new speech is then handled on its own', () => {
    const other = action('OTHER');
    const s = setup([risky, other], ['RECALL_REPORT', 'OTHER']);
    s.runner.handle('recall_report', 'en');
    expect(s.runner.handle('other', 'en')).toMatchObject({ kind: 'executed', confirmed: false });
    expect(s.executed).toEqual(['OTHER']);
    expect(s.audit.map(e => e.event)).toEqual(['Voice command refused', 'Voice command executed']);
    expect(s.audit[0].detail).toContain('not repeated to confirm');
    // the rejected command must be asked for afresh
    expect(s.runner.handle('recall_report', 'en').kind).toBe('confirmationNeeded');
  });
  it('silence past the window cancels it; a late repeat starts over', () => {
    const s = setup([risky], ['RECALL_REPORT']);
    s.runner.handle('recall_report', 'en');
    s.advance(REPEAT_CONFIRMATION_WINDOW_MS - 1);
    expect(s.runner.expirePending()).toBeNull();
    s.advance(2);
    expect(s.runner.expirePending()).toMatchObject({ kind: 'refused', reason: 'confirmationTimedOut' });
    expect(s.runner.pending()).toBeNull();
    expect(s.executed).toEqual([]);
    s.runner.handle('recall_report', 'en');
    s.advance(REPEAT_CONFIRMATION_WINDOW_MS + 1);
    expect(s.runner.handle('recall_report', 'en').kind).toBe('confirmationNeeded');   // late repeat is a first hearing
    expect(s.audit.filter(e => e.detail.includes('not repeated in time')).length).toBe(2);
    expect(s.executed).toEqual([]);
  });
  it('the screen changing between the two hearings refuses the repeat', () => {
    const eligible = ['RECALL_REPORT'];
    const s = setup([risky], eligible);
    s.runner.handle('recall_report', 'en');
    eligible.length = 0;                              // the person left the screen
    expect(s.runner.handle('recall_report', 'en')).toMatchObject({ kind: 'refused', reason: 'notEligible' });
    expect(s.executed).toEqual([]);
  });
  it('a command that does not declare it runs at once', () => {
    const plain = action('PLAIN');
    const s = setup([plain], ['PLAIN']);
    expect(s.runner.handle('plain', 'en')).toMatchObject({ kind: 'executed', confirmed: false });
  });
});

describe('eligibility: one check for voice', () => {
  it('a phrase that is a command on another screen is refused and audited, not treated as a miss', () => {
    const elsewhere = action('MSG_DELETE', { category: 'MESSAGES' });
    const s = setup([elsewhere], []);
    expect(s.runner.handle('msg_delete', 'en')).toMatchObject({ kind: 'refused', reason: 'notEligible' });
    expect(s.executed).toEqual([]);
    expect(s.audit[0]).toMatchObject({ event: 'Voice command refused' });
    expect(s.audit[0].detail).toContain('not available on this screen');
  });
  it('speech that is no command at all is a miss and writes no audit entry', () => {
    const s = setup([action('A')], ['A']);
    expect(s.runner.handle('nonsense words', 'en')).toEqual({ kind: 'miss' });
    expect(s.audit).toEqual([]);
  });
});

describe('audit entries', () => {
  it('each executed command writes one entry: action id, screen, person; no speech, no case', () => {
    const s = setup([action('SAVE_X')], ['SAVE_X']);
    s.runner.handle('save_x', 'en');
    expect(s.audit).toHaveLength(1);
    expect(s.audit[0]).toMatchObject({ type: 'user', event: 'Voice command executed', user: 'Dr. Test', caseId: null });
    expect(s.audit[0].detail).toBe('Voice command executed: action SAVE_X on screen SYNOPTIC');
  });
  it('the words spoken are never in the entry (a "filter physician Smith" command carries a name)', () => {
    const f = action('TABLE_FILTER_PHYSICIAN', { voiceTriggers: ['filter physician'] });
    const s = setup([f], ['TABLE_FILTER_PHYSICIAN']);
    s.runner.handle('filter physician', 'en');
    expect(JSON.stringify(s.audit)).not.toMatch(/Smith|filter physician/i);
  });
  it('a confirmed command says so; one confirmed with a key after a miss says so', () => {
    const s = setup([action('R', { confirmByRepeat: true })], ['R']);
    s.runner.handle('r', 'en'); s.runner.handle('r', 'en');
    expect(s.audit[s.audit.length - 1].detail).toContain('confirmed by repeating the phrase');
    s.runner.auditMissConfirmed(action('Q'));
    expect(s.audit[s.audit.length - 1].detail).toContain('confirmed with a key after a missed phrase');
  });
  it('a failing audit write never stops the command', async () => {
    const s = setup([action('A')], ['A'], { auditFails: true });
    expect(s.runner.handle('a', 'en').kind).toBe('executed');
    expect(s.executed).toEqual(['A']);
    await Promise.resolve();
  });
});

describe('with the real registry', () => {
  let events: string[];
  const listen = (n: string) => { const f = () => events.push(n); window.addEventListener(n, f); return () => window.removeEventListener(n, f); };
  let off: Array<() => void>;
  beforeEach(() => { events = []; off = [listen('PATHSCRIBE_MSG_DELETE'), listen('PATHSCRIBE_TABLE_NEXT')]; mockActionRegistryService.setCurrentContext(VOICE_CONTEXT.WORKLIST); });
  afterEach(() => { off.forEach(f => f()); mockActionRegistryService.setCurrentContext(VOICE_CONTEXT.WORKLIST); });
  const real = () => {
    const audit: NewAuditLog[] = [];
    const runner = createVoiceCommandRunner({ registry: mockActionRegistryService, audit: { logEvent: async e => { audit.push(e); return undefined; } }, getUserName: () => 'Dr. Test' });
    return { runner, audit };
  };

  it('every declared command exists in the registry and carries the flag', () => {
    for (const id of CONFIRM_BY_REPEAT_ACTION_IDS) expect(mockActionRegistryService.getActionById(id)?.confirmByRepeat, id).toBe(true);
    expect(mockActionRegistryService.getActionById('TABLE_NEXT')?.confirmByRepeat).toBeUndefined();
  });
  it('"delete message" on the messages screen waits for the repeat, then deletes once', () => {
    mockActionRegistryService.setCurrentContext(VOICE_CONTEXT.MESSAGES);
    const { runner, audit } = real();
    expect(runner.handle('delete message', 'en').kind).toBe('confirmationNeeded');
    expect(events).toEqual([]);
    expect(runner.handle('delete message', 'en').kind).toBe('executed');
    expect(events).toEqual(['PATHSCRIBE_MSG_DELETE']);
    expect(audit.map(a => a.detail)).toEqual(['Voice command executed: action MSG_DELETE on screen MESSAGES; confirmed by repeating the phrase']);
  });
  it('"delete message" on the report screen is refused (it is a messages command)', () => {
    mockActionRegistryService.setCurrentContext(VOICE_CONTEXT.SYNOPTIC);
    const { runner, audit } = real();
    expect(runner.handle('delete message', 'en')).toMatchObject({ kind: 'refused', reason: 'notEligible' });
    expect(events).toEqual([]);
    expect(audit[0].detail).toContain('action MSG_DELETE on screen SYNOPTIC');
  });
});
