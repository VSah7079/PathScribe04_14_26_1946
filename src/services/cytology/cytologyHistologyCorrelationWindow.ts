// src/services/cytology/cytologyHistologyCorrelationWindow.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 452 (PS-156): which correlation rule applies to a cytology case, and
// the window it gives. Pure.
//
//   resolveEffectiveCorrelationRule  enterprise → jurisdiction → facility
//   resolveCorrelationWindow          the window for one specimen: start date
//                                     from the configured anchor, falling back
//                                     collection → receipt → sign-out when a
//                                     date is missing (and saying which it used)
//   isInCorrelationWindow             whether a later case's date falls in it
//   validateCorrelationRule           what a settings screen or service refuses
//
// See ICytologyHistologyCorrelationSettingsService.ts for why the anchor is
// collection by default (Pete, Oct 4 2026).
// ─────────────────────────────────────────────────────────────────────────────

import {
  CORRELATION_WINDOW_ANCHORS, DEFAULT_CYTOLOGY_HISTOLOGY_CORRELATION_SETTINGS, MAX_CORRELATION_WINDOW_DAYS,
  type CorrelationWindowAnchor, type CytologyHistologyCorrelationRule, type CytologyHistologyCorrelationSettingsConfig,
  type FacilityCytologyHistologyCorrelationOverride,
} from './ICytologyHistologyCorrelationSettingsService';

export type CorrelationRuleSource = 'enterprise' | 'jurisdiction' | 'facility';

export interface EffectiveCorrelationRule extends CytologyHistologyCorrelationRule {
  /** Where the rule came from (the most specific layer that set anything). */
  source: CorrelationRuleSource;
}

export function resolveEffectiveCorrelationRule(
  enterprise: CytologyHistologyCorrelationSettingsConfig | null | undefined,
  jurisdiction: string | null | undefined,
  facilityOverride: FacilityCytologyHistologyCorrelationOverride | null | undefined,
): EffectiveCorrelationRule {
  const base = enterprise ?? DEFAULT_CYTOLOGY_HISTOLOGY_CORRELATION_SETTINGS;
  let rule: EffectiveCorrelationRule = { windowDays: base.windowDays, anchor: base.anchor, source: 'enterprise' };
  const regional = jurisdiction ? base.jurisdictionRules?.[jurisdiction] : undefined;
  if (regional) rule = { windowDays: regional.windowDays, anchor: regional.anchor, source: 'jurisdiction' };
  const own = facilityOverride?.overrides;
  if (own && (own.windowDays !== undefined || own.anchor !== undefined)) {
    rule = { windowDays: own.windowDays ?? rule.windowDays, anchor: own.anchor ?? rule.anchor, source: 'facility' };
  }
  return rule;
}

export type CorrelationRuleProblem = 'windowDaysInvalid' | 'anchorInvalid';

export function validateCorrelationRule(rule: Partial<CytologyHistologyCorrelationRule>): CorrelationRuleProblem[] {
  const problems: CorrelationRuleProblem[] = [];
  if (rule.windowDays !== undefined && !(Number.isInteger(rule.windowDays) && rule.windowDays >= 1 && rule.windowDays <= MAX_CORRELATION_WINDOW_DAYS)) problems.push('windowDaysInvalid');
  if (rule.anchor !== undefined && !CORRELATION_WINDOW_ANCHORS.includes(rule.anchor)) problems.push('anchorInvalid');
  return problems;
}

/** The window stored on the cytology specimen at sign-out
 *  (CytologyScreeningRecord.histologyCorrelationWindow), so a biopsy that
 *  arrives later is still matched against the rule that applied. */
export interface CorrelationWindow {
  /** The anchor the rule asked for. */
  anchor: CorrelationWindowAnchor;
  /** The anchor actually used: differs when that date was missing. */
  anchorUsed: CorrelationWindowAnchor;
  startsAt: string;
  endsAt: string;
  windowDays: number;
  ruleSource: CorrelationRuleSource;
}

const validDate = (iso: string | undefined | null): iso is string => !!iso && !Number.isNaN(Date.parse(iso));

/** The window for one cytology specimen. Order tried: the configured anchor,
 *  then collection, receipt, sign-out. */
export function resolveCorrelationWindow(
  specimen: { collectedAt?: string; receivedAt?: string },
  signedOutAt: string,
  rule: EffectiveCorrelationRule,
): CorrelationWindow | null {
  const dates: Record<CorrelationWindowAnchor, string | undefined> = { collection: specimen.collectedAt, receipt: specimen.receivedAt, signOut: signedOutAt };
  const order: CorrelationWindowAnchor[] = [rule.anchor, ...(['collection', 'receipt', 'signOut'] as const).filter(a => a !== rule.anchor)];
  const anchorUsed = order.find(a => validDate(dates[a]));
  if (!anchorUsed) return null;
  const start = new Date(dates[anchorUsed]!);
  const end = new Date(start.getTime() + rule.windowDays * 86_400_000);
  return { anchor: rule.anchor, anchorUsed, startsAt: start.toISOString(), endsAt: end.toISOString(), windowDays: rule.windowDays, ruleSource: rule.source };
}

/** True when any of the given dates (a later case's collection or receipt)
 *  falls inside the window, both ends included. */
export function isInCorrelationWindow(window: Pick<CorrelationWindow, 'startsAt' | 'endsAt'>, dates: (string | undefined)[]): boolean {
  const start = Date.parse(window.startsAt), end = Date.parse(window.endsAt);
  return dates.some(d => validDate(d) && Date.parse(d) >= start && Date.parse(d) <= end);
}
