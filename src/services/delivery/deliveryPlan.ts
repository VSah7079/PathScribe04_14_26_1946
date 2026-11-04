// src/services/delivery/deliveryPlan.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 520 (PS-280): which channels a release goes out on, and in what role
// (spec 3.1.3, the client delivery preference matrix). A delivery rule now holds
// a plan: primary and secondary channels go at once; fallback channels go only
// when a primary channel fails. Rules from before Batch 520 have only an
// action, and their plan follows it (ELECTRONIC_ONLY → primary ELECTRONIC, and
// so on), so nothing configured earlier changes.
//
// The fax recipient, the file-drop document name and the metadata are decided
// here too. Pure.
// ─────────────────────────────────────────────────────────────────────────────
import { DELIVERY_CHANNELS, type DeliveryAction, type DeliveryChannel, type DeliveryChannelPlan, type DeliveryRule } from '@/types/delivery/DeliveryRule';

export type ChannelRole = keyof DeliveryChannelPlan;
export const CHANNEL_ROLES: readonly ChannelRole[] = ['primary', 'secondary', 'fallback'];
export const EMPTY_PLAN: DeliveryChannelPlan = { primary: [], secondary: [], fallback: [] };

/** The plan an action stands for (rules saved before Batch 520). */
export function planFromAction(action: DeliveryAction): DeliveryChannelPlan {
  switch (action) {
    case 'ELECTRONIC_ONLY': return { primary: ['ELECTRONIC'], secondary: [], fallback: [] };
    case 'PRINT_ONLY': return { primary: ['PRINT'], secondary: [], fallback: [] };
    case 'DUAL': return { primary: ['ELECTRONIC', 'PRINT'], secondary: [], fallback: [] };
    case 'SUPPRESS': return { ...EMPTY_PLAN };
  }
}

/** A rule's plan: its channels, or the one its action stands for. */
export const rulePlan = (rule: Pick<DeliveryRule, 'action' | 'channels'>): DeliveryChannelPlan => rule.channels ?? planFromAction(rule.action);

/** The action that matches a plan's electronic and print sending (kept on the rule for older readers). */
export function actionFromPlan(plan: DeliveryChannelPlan): DeliveryAction {
  const now = immediateChannels(plan);
  const e = now.includes('ELECTRONIC');
  const p = now.includes('PRINT');
  return e && p ? 'DUAL' : e ? 'ELECTRONIC_ONLY' : p ? 'PRINT_ONLY' : 'SUPPRESS';
}

/** The channels that go at once: primary, then secondary. */
export const immediateChannels = (plan: DeliveryChannelPlan): DeliveryChannel[] =>
  [...plan.primary, ...plan.secondary.filter(c => !plan.primary.includes(c))];

/** A channel's role in the plan, or 'off'. */
export function channelRole(plan: DeliveryChannelPlan, channel: DeliveryChannel): ChannelRole | 'off' {
  return CHANNEL_ROLES.find(r => plan[r].includes(channel)) ?? 'off';
}

/** The plan with a channel moved to a role (or taken out); the channel order stays as listed. */
export function withChannelRole(plan: DeliveryChannelPlan, channel: DeliveryChannel, role: ChannelRole | 'off'): DeliveryChannelPlan {
  const next: DeliveryChannelPlan = { primary: [], secondary: [], fallback: [] };
  for (const r of CHANNEL_ROLES) {
    next[r] = DELIVERY_CHANNELS.filter(c => (c === channel ? role === r : plan[r].includes(c)));
  }
  return next;
}

export type DeliveryPlanProblem = 'fallbackWithoutPrimary' | 'fileDropNeedsTarget' | 'faxNumberInvalid';

/** What's wrong with a rule's plan before it can be saved. */
export function deliveryPlanProblem(plan: DeliveryChannelPlan, rule: Pick<DeliveryRule, 'fileDropTargetId' | 'faxNumber'>): DeliveryPlanProblem | null {
  if (plan.fallback.length > 0 && plan.primary.length === 0) return 'fallbackWithoutPrimary';
  if (channelRole(plan, 'FILE_DROP') !== 'off' && !rule.fileDropTargetId?.trim()) return 'fileDropNeedsTarget';
  if (channelRole(plan, 'FAX') !== 'off' && rule.faxNumber?.trim() && !normalizeFaxNumber(rule.faxNumber)) return 'faxNumberInvalid';
  return null;
}

/** The plan's roles that have channels, in order, for a summary ("Primary: Electronic · Fallback: Print"). */
export const planSummary = (plan: DeliveryChannelPlan): { role: ChannelRole; channels: DeliveryChannel[] }[] =>
  CHANNEL_ROLES.filter(r => plan[r].length > 0).map(r => ({ role: r, channels: plan[r] }));

/** The rule's fields as saved from the editor: the plan, the action kept in step, and the fax
 *  number and file-drop target only where their channel is used. */
export function ruleDeliveryFields(plan: DeliveryChannelPlan, faxNumber: string, fileDropTargetId: string): Pick<DeliveryRule, 'channels' | 'action' | 'faxNumber' | 'fileDropTargetId'> {
  return {
    channels: plan,
    action: actionFromPlan(plan),
    faxNumber: channelRole(plan, 'FAX') !== 'off' && faxNumber.trim() ? faxNumber.trim() : undefined,
    fileDropTargetId: channelRole(plan, 'FILE_DROP') !== 'off' && fileDropTargetId.trim() ? fileDropTargetId.trim() : undefined,
  };
}

/** How a channel went: sent (or accepted by the receiver), failed, not set up
 *  (nothing to send it to), or sent without an outcome to wait for (the result
 *  message goes through its own queue and dispatch loop). */
export type ChannelOutcome = 'sent' | 'failed' | 'not_configured' | 'queued';

/** The fallback channels to send at once, given how the channels that went at once fared: all of
 *  them when a primary channel had nowhere to go (no printer, no file-drop target: retrying can't
 *  help); none otherwise. A primary channel that failed falls back only after its retries run out
 *  (Batch 521, PS-281: deliveryRetries.ts). A fallback channel that already went is not sent again. */
export function fallbackChannels(plan: DeliveryChannelPlan, outcomes: Partial<Record<DeliveryChannel, ChannelOutcome>>): DeliveryChannel[] {
  const nowhereToGo = plan.primary.some(c => outcomes[c] === 'not_configured');
  return nowhereToGo ? plan.fallback.filter(c => outcomes[c] === undefined) : [];
}

/** A fax number as entered (spaces, dots, dashes, brackets dropped; + kept); null when it isn't
 *  one (7 to 15 digits). The interface server checks it the same way. */
export function normalizeFaxNumber(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const s = raw.trim();
  const plus = s.startsWith('+');
  const body = (plus ? s.slice(1) : s).replace(/[\s().-]/g, '');
  if (!/^\d+$/.test(body) || body.length < 7 || body.length > 15) return null;
  return (plus ? '+' : '') + body;
}

export interface FaxRecipient { number: string; name?: string; from: 'rule' | 'physician' | 'facility' }

/** Who a fax goes to: the rule's own number, else the ordering physician's fax, else the ordering
 *  facility's. Null when none of them is a fax number. */
export function faxRecipient(
  ruleFax: string | undefined,
  physician: { fax?: string; firstName?: string; lastName?: string } | undefined,
  facility: { fax?: string; name?: string } | undefined,
): FaxRecipient | null {
  const fromRule = normalizeFaxNumber(ruleFax);
  if (fromRule) return { number: fromRule, from: 'rule' };
  const fromPhysician = normalizeFaxNumber(physician?.fax);
  if (fromPhysician) return { number: fromPhysician, name: [physician?.firstName, physician?.lastName].filter(Boolean).join(' ') || undefined, from: 'physician' };
  const fromFacility = normalizeFaxNumber(facility?.fax);
  if (fromFacility) return { number: fromFacility, name: facility?.name || undefined, from: 'facility' };
  return null;
}

/** The delivered document's name: accession, report type and release time (UTC), e.g.
 *  "S26-0001_FINAL_20261010T200000Z". Letters, digits, dot, dash and underscore only. */
export function deliveryDocumentName(accession: string, reportType: string, releasedAt: string): string {
  const stamp = releasedAt.replace(/\.\d+Z$/, 'Z').replace(/[-:]/g, '');
  return `${accession}_${reportType}_${stamp}`.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^[._]+/, '').slice(0, 120);
}
