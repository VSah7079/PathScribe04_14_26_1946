// src/services/fieldRequirements/messagingChecks.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-359, Batch 384. What the message drawer needs before it can send, per the
// organisation's Field Requirements (page "messaging"):
//   - a new internal message   newMessageMissing
//   - a secure external email  secureEmailMissing
//   - a reply in a thread      replyMissing
// The drawer decided this inline in three places, and its voice "send" path
// checked less than the Send button did (no subject check). Every path asks
// these now. The locked fields reproduce what the drawer required before.
//
// Pure.
// ─────────────────────────────────────────────────────────────────────────────

import { missingRequiredFields, type FieldGroup, type ResolvedFieldRequirement } from './fieldRequirementRules';

const filled = (v: string): string => v.trim();
const inGroup = (requirements: readonly ResolvedFieldRequirement[], group: FieldGroup) =>
  requirements.filter(f => f.group === group);

/** Whether a messaging field is required (drives the "*" beside a label). */
export function messagingFieldRequired(requirements: readonly ResolvedFieldRequirement[], fieldId: string): boolean {
  return requirements.find(f => f.id === fieldId)?.required ?? false;
}

/** A new internal message: at least one recipient, the subject (unless switched off) and the text. */
export function newMessageMissing(recipientCount: number, subject: string, body: string, requirements: readonly ResolvedFieldRequirement[]): string[] {
  return missingRequiredFields(inGroup(requirements, 'newMessage'), {
    messageRecipient: recipientCount > 0 ? 'yes' : '',
    messageSubject: filled(subject),
    messageBody: filled(body),
  }).map(f => f.id);
}

/** A secure external email: an address (it must contain an @), the subject (unless switched off) and the text. */
export function secureEmailMissing(to: string, subject: string, body: string, requirements: readonly ResolvedFieldRequirement[]): string[] {
  return missingRequiredFields(inGroup(requirements, 'secureEmail'), {
    secureEmailTo: to.includes('@') ? to.trim() : '',
    secureEmailSubject: filled(subject),
    secureEmailBody: filled(body),
  }).map(f => f.id);
}

/** A reply in an open thread needs text. */
export function replyMissing(text: string, requirements: readonly ResolvedFieldRequirement[]): string[] {
  return missingRequiredFields(inGroup(requirements, 'reply'), { messageReply: filled(text) }).map(f => f.id);
}
