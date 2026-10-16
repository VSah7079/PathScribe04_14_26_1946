// src/services/printRouting/printDestinationRules.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 553 (PS-539 phase 2d; SITE_AGENT_API.md §3): a report print goes to a
// site agent's printer, named by site and printer id, or to a printer address
// sent to directly. Routing rules, the facility's default and Redirect all
// hold one of the two. These are the rules the three screens share. Pure.
// ─────────────────────────────────────────────────────────────────────────────
import {
  isAgentPrintDestination,
  type AgentPrintDestination,
  type NetworkPrintDestination,
  type PrintDestination,
} from '@/types/printRouting/PrintDestination';
import type { AgentPrinter } from '../siteAgent/siteAgentContract';

/** Which kind of destination a screen is editing. */
export type PrintDestinationKind = 'agent' | 'network';

export type PrintDestinationProblem =
  | 'agentPrinterRequired'
  | 'addressRequired'
  | 'addressInvalid'
  | 'portOutOfRange';

/** Host names and IPv4/IPv6 addresses: letters, digits, dots, hyphens, colons. */
const ADDRESS = /^[A-Za-z0-9.:-]+$/;

export function printDestinationKind(d: PrintDestination | undefined): PrintDestinationKind {
  return isAgentPrintDestination(d) ? 'agent' : 'network';
}

/** The destination for one of a site's agent printers. The printer's name is kept for lists and the audit trail. */
export function agentPrintDestination(siteId: string, printer: Pick<AgentPrinter, 'destinationId' | 'displayName'>): AgentPrintDestination {
  const name = printer.displayName?.trim();
  return { agentPrinter: { siteId, destinationId: printer.destinationId }, ...(name ? { displayName: name } : {}) };
}

/** The first problem with a destination, or null. */
export function printDestinationProblem(d: PrintDestination | undefined): PrintDestinationProblem | null {
  if (!d) return null;
  if (isAgentPrintDestination(d)) {
    return d.agentPrinter.siteId?.trim() && d.agentPrinter.destinationId?.trim() ? null : 'agentPrinterRequired';
  }
  const net = d as NetworkPrintDestination;
  const address = (net.ipAddress ?? '').trim();
  if (!address) return 'addressRequired';
  if (!ADDRESS.test(address)) return 'addressInvalid';
  if (net.port !== undefined && !(Number.isInteger(net.port) && net.port >= 1 && net.port <= 65535)) return 'portOutOfRange';
  return null;
}

/** One line for lists, the Print Queue and the audit trail: the printer's name, else its id or address. */
export function printDestinationText(d: PrintDestination | undefined): string {
  if (!d) return '';
  if (d.displayName?.trim()) return d.displayName.trim();
  if (isAgentPrintDestination(d)) return d.agentPrinter.destinationId;
  const net = d as NetworkPrintDestination;
  return `${net.protocol} ${net.ipAddress}${net.port ? `:${net.port}` : ''}`;
}

/**
 * Whether a chosen agent printer is missing from its site's list as loaded
 * (removed or renamed since it was chosen): the screens keep showing it, with
 * a warning to choose another. False while loading or when the list couldn't
 * be read, since nothing is known then.
 */
export function agentChoiceMissing(printerId: string, list: { printers: readonly { destinationId: string }[]; loading: boolean; error: unknown }): boolean {
  return !!printerId && !list.loading && !list.error && !list.printers.some(p => p.destinationId === printerId);
}

/** With exactly one report printer on the site and none chosen yet, that one is the likely answer (rule 8). */
export function onlyAgentChoice<T extends { destinationId: string }>(printerId: string, list: { printers: readonly T[]; loading: boolean; error: unknown }): T | null {
  return !printerId && !list.loading && !list.error && list.printers.length === 1 ? list.printers[0] : null;
}

/** The printers to offer, by name; a report printer only (label printers take labels, not reports). */
export function agentPrinterChoices(printers: readonly AgentPrinter[]): { destinationId: string; label: string }[] {
  return printers
    .filter(p => p.kind === 'report')
    .map(p => ({ destinationId: p.destinationId, label: p.displayName?.trim() || p.destinationId }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * The one site jobs share, for Redirect's printer list: a report must stay at
 * the lab that performed it. Null when the jobs come from more than one site,
 * or a job's site isn't known (older jobs); only a printer address is offered then.
 */
export function sharedSite(jobs: readonly { performingFacilityId?: string }[]): string | null {
  return redirectSites(jobs).site;
}

/** Why Redirect can or can't offer agent printers: one lab's jobs, jobs from several labs, or a job whose lab isn't recorded. */
export type RedirectSiteReason = 'oneSite' | 'severalSites' | 'noSite';

export function redirectSites(jobs: readonly { performingFacilityId?: string }[]): { site: string | null; reason: RedirectSiteReason } {
  if (jobs.length === 0 || jobs.some(j => !j.performingFacilityId)) return { site: null, reason: 'noSite' };
  const first = jobs[0].performingFacilityId as string;
  return jobs.every(j => j.performingFacilityId === first) ? { site: first, reason: 'oneSite' } : { site: null, reason: 'severalSites' };
}

/**
 * Whether a destination may print a job of this performing lab: an agent
 * printer must be on the lab's own site. Redirect refuses another lab's agent
 * printer; at release, a routing rule naming one is skipped for this lab.
 */
export function redirectSiteAllowed(job: { performingFacilityId?: string }, destination: PrintDestination | undefined): boolean {
  if (!isAgentPrintDestination(destination)) return true;
  return !!job.performingFacilityId && job.performingFacilityId === destination.agentPrinter.siteId;
}

/**
 * Batch 553: the audit trail's wording, in English (audit text is literal,
 * CLAUDE.md rule 3). It always names the printer itself, not only its name,
 * which an administrator can change.
 */
export function printDestinationAuditText(d: PrintDestination | undefined): string {
  if (!d) return 'no printer';
  const name = d.displayName?.trim();
  if (isAgentPrintDestination(d)) {
    const id = `site agent printer ${d.agentPrinter.destinationId} at site ${d.agentPrinter.siteId}`;
    return name ? `${name} (${id})` : id;
  }
  const net = d as NetworkPrintDestination;
  const address = `${net.protocol} ${net.ipAddress}${net.port ? `:${net.port}` : ''}`;
  return name ? `${name} (${address})` : address;
}

// ─── The form the routing rule window and Redirect edit ─────────────────────

/** A destination being edited. '' means not set. */
export interface PrintDestinationDraft {
  kind: PrintDestinationKind;
  /** Agent: the site (performing lab) and the printer chosen from its list. */
  siteId: string;
  agentPrinterId: string;
  agentPrinterName: string;
  /** Printer address. */
  protocol: NetworkPrintDestination['protocol'];
  ipAddress: string;
  port: string;
  queueName: string;
  resourcePath: string;
  displayName: string;
}

/**
 * The draft for a destination. A new one is a site agent printer (the way
 * that works from the cloud), on `defaultSiteId` when the screen knows the
 * site, so most rules need only the printer picked (rule 8).
 */
export function printDestinationDraft(d?: PrintDestination, defaultSiteId = ''): PrintDestinationDraft {
  const blank: PrintDestinationDraft = {
    kind: 'agent', siteId: defaultSiteId, agentPrinterId: '', agentPrinterName: '',
    protocol: 'RAW_9100', ipAddress: '', port: '', queueName: '', resourcePath: '', displayName: '',
  };
  if (!d) return blank;
  if (isAgentPrintDestination(d)) {
    return { ...blank, siteId: d.agentPrinter.siteId, agentPrinterId: d.agentPrinter.destinationId, agentPrinterName: d.displayName ?? '' };
  }
  const net = d as NetworkPrintDestination;
  return {
    ...blank, kind: 'network', protocol: net.protocol ?? 'RAW_9100', ipAddress: net.ipAddress ?? '',
    port: net.port !== undefined ? String(net.port) : '', queueName: net.queueName ?? '',
    resourcePath: net.resourcePath ?? '', displayName: net.displayName ?? '',
  };
}

/** Choosing a printer from the site's list keeps its name with the choice. */
export function withAgentPrinter(draft: PrintDestinationDraft, printer: { destinationId: string; label: string } | undefined): PrintDestinationDraft {
  return { ...draft, agentPrinterId: printer?.destinationId ?? '', agentPrinterName: printer?.label ?? '' };
}

/** Another site means another printer list: the printer chosen is cleared. */
export function withSite(draft: PrintDestinationDraft, siteId: string): PrintDestinationDraft {
  return draft.siteId === siteId ? draft : { ...draft, siteId, agentPrinterId: '', agentPrinterName: '' };
}

const PORT_TEXT = /^\d{1,5}$/;

/** The destination a draft saves; fields that don't apply to its kind or protocol are dropped. */
export function printDestinationFromDraft(draft: PrintDestinationDraft): PrintDestination {
  if (draft.kind === 'agent') {
    return agentPrintDestination(draft.siteId.trim(), { destinationId: draft.agentPrinterId.trim(), displayName: draft.agentPrinterName });
  }
  const port = draft.port.trim();
  const out: NetworkPrintDestination = { protocol: draft.protocol, ipAddress: draft.ipAddress.trim() };
  // A port that isn't a whole number is kept as NaN, so the check below names it rather than dropping it.
  if (port) out.port = PORT_TEXT.test(port) ? Number(port) : Number.NaN;
  if (draft.protocol === 'LPR_LPD' && draft.queueName.trim()) out.queueName = draft.queueName.trim();
  if (draft.protocol === 'IPP' && draft.resourcePath.trim()) out.resourcePath = draft.resourcePath.trim();
  if (draft.displayName.trim()) out.displayName = draft.displayName.trim();
  return out;
}

/** The first problem with a draft, or null when it can be saved. */
export function printDestinationDraftProblem(draft: PrintDestinationDraft): PrintDestinationProblem | null {
  return printDestinationProblem(printDestinationFromDraft(draft));
}

/** The site a routing rule's agent printer must be on, when the rule fixes it: a facility-tier rule prints at that facility. Null otherwise (the site is chosen). */
export function routingRuleSite(scopeType: string, scopeId: string): string | null {
  return scopeType === 'facility' ? scopeId.trim() : null;
}

/** Redirect's draft: a site agent printer on the jobs' own site when they share one, otherwise a printer address. */
export function redirectDraft(siteId: string | null): PrintDestinationDraft {
  const draft = printDestinationDraft(undefined, siteId ?? '');
  return siteId ? draft : { ...draft, kind: 'network' };
}

/** The site an agent destination prints at, or null for a printer address. */
export function printDestinationSiteId(d: PrintDestination | undefined): string | null {
  return isAgentPrintDestination(d) ? d.agentPrinter.siteId : null;
}

/** Batch 553: the message key for a routing rule the service refused (the window stays open with it). */
export function routingRuleErrorKey(error: string): string {
  if (['agentPrinterRequired', 'addressRequired', 'addressInvalid', 'portOutOfRange'].includes(error)) return `printDestination.problems.${error}`;
  if (error === 'agentPrinterOtherSite') return 'printRoutingRulesSection.errors.agentPrinterOtherSite';
  if (error === 'CONFIG_NOT_PERMITTED') return 'printRoutingRulesSection.errors.notPermitted';
  return 'printRoutingRulesSection.errors.saveFailed';
}

/** Batch 553: the facilities a report can print at (performing labs), for the rule window's site picker. */
export function performingLabSites(facilities: readonly { id: string; name: string; roles?: readonly string[] }[]): { id: string; name: string }[] {
  return facilities.filter(f => (f.roles ?? []).includes('performing_lab')).map(f => ({ id: f.id, name: f.name }));
}
