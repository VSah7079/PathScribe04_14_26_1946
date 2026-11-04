// Batch 652: Teaching Case (and any multiAssign type) can go to several recipients.
import { describe, expect, it, vi } from 'vitest';
import { addRecipientId, delegateToRecipients, limitRecipientIds, toggleRecipientId, uniqueRecipients, type DelegateToRecipientsDeps } from './delegateToRecipients';
import type { DelegationRecord } from './IDelegationService';

const rec = (to: string): DelegationRecord => ({ id: `d-${to}`, caseId: 'C1', fromUserId: 'ME', toUserId: to, delegationType: 'TEACHING', timestamp: 't', status: 'pending' });

function deps(opts: { multi?: boolean; refuse?: Record<string, string> } = {}) {
  const delegate = vi.fn(async (r: any) => {
    const err = opts.refuse?.[r.recipient.id];
    return err ? { ok: false as const, error: err as any } : { ok: true as const, data: rec(r.recipient.id) };
  });
  const getById = vi.fn(async () => ({ ok: true as const, data: { multiAssign: !!opts.multi } as any }));
  return { d: { delegationService: { delegate }, delegationTypeService: { getById } } as DelegateToRecipientsDeps, delegate, getById };
}
const base = { caseId: 'C1', requestorId: 'ME', delegationType: 'TEACHING', note: 'for teaching' };
const users = (...ids: string[]) => ids.map(id => ({ kind: 'user' as const, id, name: id }));

describe('delegateToRecipients', () => {
  it('delegates a multiAssign type to every recipient, one delegation each, with the same request otherwise', async () => {
    const { d, delegate } = deps({ multi: true });
    const r = await delegateToRecipients({ ...base, recipients: users('R1', 'R2', 'R3') }, d);
    expect(r.ok).toBe(true);
    expect(r.delegated.map(x => x.toUserId)).toEqual(['R1', 'R2', 'R3']);
    expect(delegate).toHaveBeenCalledTimes(3);
    expect(delegate.mock.calls[1][0]).toMatchObject({ caseId: 'C1', requestorId: 'ME', delegationType: 'TEACHING', note: 'for teaching', recipient: { kind: 'user', id: 'R2' } });
    expect(delegate.mock.calls[1][0]).not.toHaveProperty('recipients');
  });

  it('a type without multiAssign refuses several recipients and delegates none', async () => {
    const { d, delegate } = deps({ multi: false });
    const r = await delegateToRecipients({ ...base, delegationType: 'CONSULT_EXT', recipients: users('R1', 'R2') }, d);
    expect(r).toMatchObject({ ok: false, error: 'multipleRecipientsNotAllowed', delegated: [] });
    expect(delegate).not.toHaveBeenCalled();
  });

  it('one recipient is always fine, whatever the type allows', async () => {
    const { d, delegate, getById } = deps({ multi: false });
    const r = await delegateToRecipients({ ...base, recipients: users('R1') }, d);
    expect(r.ok).toBe(true);
    expect(delegate).toHaveBeenCalledTimes(1);
    expect(getById).not.toHaveBeenCalled();
  });

  it('no recipients delegates nothing', async () => {
    const { d, delegate } = deps({ multi: true });
    expect(await delegateToRecipients({ ...base, recipients: [] }, d)).toMatchObject({ ok: false, error: 'noRecipient' });
    expect(delegate).not.toHaveBeenCalled();
  });

  it('pools are never combined with each other or with people', async () => {
    const { d, delegate } = deps({ multi: true });
    const r = await delegateToRecipients({ ...base, recipients: [{ kind: 'pool', id: 'P1' }, { kind: 'user', id: 'R1' }] }, d);
    expect(r.error).toBe('multipleRecipientsNotAllowed');
    expect(delegate).not.toHaveBeenCalled();
  });

  it('the same person chosen twice is delegated once', async () => {
    const { d, delegate } = deps({ multi: true });
    const r = await delegateToRecipients({ ...base, recipients: users('R1', 'R1') }, d);
    expect(r.delegated).toHaveLength(1);
    expect(delegate).toHaveBeenCalledTimes(1);
  });

  it('a refusal for one recipient (permission, cytotechnologist) does not stop the others and is reported', async () => {
    const { d } = deps({ multi: true, refuse: { R2: 'recipientIsCytotechnologist' } });
    const r = await delegateToRecipients({ ...base, recipients: users('R1', 'R2', 'R3') }, d);
    expect(r.ok).toBe(false);
    expect(r.delegated.map(x => x.toUserId)).toEqual(['R1', 'R3']);
    expect(r.refused).toEqual([{ recipient: { kind: 'user', id: 'R2', name: 'R2' }, error: 'recipientIsCytotechnologist' }]);
    expect(r.error).toBe('recipientIsCytotechnologist');
  });

  it('without the delegation capability every recipient is refused (the single-delegation check runs for each)', async () => {
    const { d } = deps({ multi: true, refuse: { R1: 'notPermitted', R2: 'notPermitted' } });
    const r = await delegateToRecipients({ ...base, recipients: users('R1', 'R2') }, d);
    expect(r.delegated).toEqual([]);
    expect(r.refused.map(x => x.error)).toEqual(['notPermitted', 'notPermitted']);
  });
});

describe('picking recipients in the dialog', () => {
  it('with several allowed, clicks add and remove', () => {
    expect(toggleRecipientId(['a'], 'b', true)).toEqual(['a', 'b']);
    expect(toggleRecipientId(['a', 'b'], 'a', true)).toEqual(['b']);
    expect(addRecipientId(['a'], 'a', true)).toEqual(['a']);
  });
  it('with one allowed, a click replaces; clicking the chosen one clears it', () => {
    expect(toggleRecipientId(['a'], 'b', false)).toEqual(['b']);
    expect(toggleRecipientId(['a'], 'a', false)).toEqual([]);
  });
  it('switching to a single-recipient type keeps only the first', () => {
    expect(limitRecipientIds(['a', 'b', 'c'], false)).toEqual(['a']);
    expect(limitRecipientIds(['a', 'b'], true)).toEqual(['a', 'b']);
  });
  it('uniqueRecipients keeps order', () => {
    expect(uniqueRecipients([...users('a', 'b'), ...users('a')]).map(r => r.id)).toEqual(['a', 'b']);
  });
});
