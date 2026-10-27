// src/services/delegations/delegateToRecipients.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 652: delegating one case to several people at once, for the delegation types that allow it.
//
// A delegation type's "multiAssign" setting (Configuration > System > Delegation Types) was stored and shown as a
// "multi-recipient" tag but nothing read it: the Delegate dialog held a single recipient, so "Teaching Case"
// (seeded multiAssign) could only go to one resident or fellow. This file is where the setting is applied.
//
// Each recipient is its own delegation through delegationService.delegate(), so every person gets exactly what a
// single delegation gives them: the case:delegation:create check, the cytotechnologist refusal, the participant
// entry on the case and the "Case delegated" audit entry. Nothing is bypassed for the extra recipients.
//   - More than one recipient needs a type with multiAssign on; otherwise nothing is delegated.
//   - Pools are never combined (a pool hand-off is a single queue), nor mixed with people.
//   - The same person twice is delegated once.
//   - If one recipient is refused the others still go through; the result lists who was delegated and who was not.
// ─────────────────────────────────────────────────────────────────────────────
import type { ServiceResult } from '../types';
import type { IDelegationTypeService } from '../delegationTypes/IDelegationTypeService';
import type { DelegationError, DelegationRecipient, DelegationRecord, DelegationRequest, IDelegationService } from './IDelegationService';

export type MultiDelegationError = DelegationError | 'multipleRecipientsNotAllowed' | 'noRecipient';

export interface MultiDelegationRequest extends Omit<DelegationRequest, 'recipient'> {
  recipients: DelegationRecipient[];
}

export interface MultiDelegationResult {
  /** True when every recipient was delegated. */
  ok: boolean;
  delegated: DelegationRecord[];
  /** Recipients that were not delegated, each with the reason. */
  refused: { recipient: DelegationRecipient; error: MultiDelegationError }[];
  /** The first reason, for a single message. */
  error?: MultiDelegationError;
}

export interface DelegateToRecipientsDeps {
  delegationService: Pick<IDelegationService, 'delegate'>;
  delegationTypeService: Pick<IDelegationTypeService, 'getById'>;
}

/** Whether a delegation type lets one case go to several recipients. Unknown type: no. */
export async function typeAllowsSeveralRecipients(
  typeId: string, typeService: Pick<IDelegationTypeService, 'getById'>,
): Promise<boolean> {
  const res: ServiceResult<{ multiAssign: boolean }> = await typeService.getById(typeId);
  return res.ok && !!res.data?.multiAssign;
}

/** The recipients with repeats removed (same kind and id), in the order given. */
export function uniqueRecipients(recipients: readonly DelegationRecipient[]): DelegationRecipient[] {
  const seen = new Set<string>();
  return recipients.filter(r => { const k = `${r.kind}:${r.id}`; if (seen.has(k)) return false; seen.add(k); return true; });
}

export async function delegateToRecipients(
  request: MultiDelegationRequest,
  deps: DelegateToRecipientsDeps,
): Promise<MultiDelegationResult> {
  const recipients = uniqueRecipients(request.recipients);
  const refuseAll = (error: MultiDelegationError): MultiDelegationResult =>
    ({ ok: false, delegated: [], refused: recipients.map(recipient => ({ recipient, error })), error });

  if (recipients.length === 0) return refuseAll('noRecipient');
  if (recipients.length > 1) {
    const allPeople = recipients.every(r => r.kind === 'user');
    if (!allPeople || !(await typeAllowsSeveralRecipients(request.delegationType, deps.delegationTypeService))) {
      return refuseAll('multipleRecipientsNotAllowed');
    }
  }

  const { recipients: _unused, ...base } = request;
  void _unused;
  const delegated: DelegationRecord[] = [];
  const refused: MultiDelegationResult['refused'] = [];
  for (const recipient of recipients) {
    const res = await deps.delegationService.delegate({ ...base, recipient });
    if (res.ok) delegated.push(res.data);
    else refused.push({ recipient, error: res.error as MultiDelegationError });
  }
  return { ok: refused.length === 0, delegated, refused, ...(refused.length > 0 ? { error: refused[0].error } : {}) };
}

// ─── Picking recipients in the Delegate dialog ───────────────────────────────

/** Adds a recipient: with several allowed it is appended (once); otherwise it replaces the choice. */
export function addRecipientId(current: readonly string[], id: string, several: boolean): string[] {
  if (!several) return [id];
  return current.includes(id) ? [...current] : [...current, id];
}

/** Clicking a recipient: a chosen one is removed, an unchosen one is added (see addRecipientId). */
export function toggleRecipientId(current: readonly string[], id: string, several: boolean): string[] {
  return current.includes(id) ? current.filter(x => x !== id) : addRecipientId(current, id, several);
}

/** When the type changes: with several not allowed, only the first choice is kept. */
export function limitRecipientIds(current: readonly string[], several: boolean): string[] {
  return several ? [...current] : current.slice(0, 1);
}
