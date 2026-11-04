// src/services/printRouting/printDestinationRules.test.ts
import { describe, it, expect } from 'vitest';
import {
  agentChoiceMissing, agentPrintDestination, agentPrinterChoices, onlyAgentChoice, printDestinationAuditText, printDestinationDraft, printDestinationDraftProblem, printDestinationFromDraft,
  printDestinationKind, printDestinationProblem, printDestinationText, redirectDraft, redirectSiteAllowed, redirectSites, routingRuleSite, sharedSite, withAgentPrinter, withSite,
} from './printDestinationRules';
import { isAgentPrintDestination, isNetworkPrintDestination } from '@/types/printRouting/PrintDestination';
import type { AgentPrinter } from '../siteAgent/siteAgentContract';

const printers: AgentPrinter[] = [
  { destinationId: 'rep-2', kind: 'report', protocol: 'IPPS', host: 'p2', port: 631, displayName: 'Zeta desk' },
  { destinationId: 'rep-1', kind: 'report', protocol: 'IPPS', host: 'p1', port: 631, displayName: ' Alpha desk ' },
  { destinationId: 'lab-1', kind: 'label', protocol: 'RAW_9100', host: 'p3', port: 9100, labelLanguage: 'ZPL' },
  { destinationId: 'rep-3', kind: 'report', protocol: 'RAW_9100', host: 'p4', port: 9100 },
];

describe('print destinations: a site agent printer or a printer address (Batch 553)', () => {
  it('tells the two kinds apart', () => {
    const agent = agentPrintDestination('S1', printers[0]);
    expect(isAgentPrintDestination(agent)).toBe(true);
    expect(isNetworkPrintDestination(agent)).toBe(false);
    expect(isNetworkPrintDestination({ protocol: 'IPP', ipAddress: '10.0.0.1' })).toBe(true);
    expect(isAgentPrintDestination(undefined)).toBe(false);
    expect(printDestinationKind(agent)).toBe('agent');
    expect(printDestinationKind(undefined)).toBe('network');
  });

  it('offers report printers only, by name, falling back to the id', () => {
    expect(agentPrinterChoices(printers)).toEqual([
      { destinationId: 'rep-1', label: 'Alpha desk' }, { destinationId: 'rep-3', label: 'rep-3' }, { destinationId: 'rep-2', label: 'Zeta desk' },
    ]);
  });

  it('names what is wrong', () => {
    expect(printDestinationProblem(undefined)).toBeNull();
    expect(printDestinationProblem({ agentPrinter: { siteId: 'S1', destinationId: '' } })).toBe('agentPrinterRequired');
    expect(printDestinationProblem({ agentPrinter: { siteId: '', destinationId: 'rep-1' } })).toBe('agentPrinterRequired');
    expect(printDestinationProblem({ protocol: 'RAW_9100', ipAddress: ' ' })).toBe('addressRequired');
    expect(printDestinationProblem({ protocol: 'RAW_9100', ipAddress: 'http://x/y' })).toBe('addressInvalid');
    expect(printDestinationProblem({ protocol: 'RAW_9100', ipAddress: '10.0.0.1', port: 0 })).toBe('portOutOfRange');
    expect(printDestinationProblem({ protocol: 'RAW_9100', ipAddress: '10.0.0.1', port: 9100 })).toBeNull();
  });

  it('one line for lists and the audit trail', () => {
    expect(printDestinationText(agentPrintDestination('S1', printers[1]))).toBe('Alpha desk');
    expect(printDestinationText({ agentPrinter: { siteId: 'S1', destinationId: 'rep-9' } })).toBe('rep-9');
    expect(printDestinationText({ protocol: 'IPP', ipAddress: '10.0.0.1', port: 631 })).toBe('IPP 10.0.0.1:631');
    expect(printDestinationText(undefined)).toBe('');
  });

  it('says when a chosen printer has left the site\'s list', () => {
    const list = { printers, loading: false, error: null };
    expect(agentChoiceMissing('rep-1', list)).toBe(false);
    expect(agentChoiceMissing('gone', list)).toBe(true);
    expect(agentChoiceMissing('', list)).toBe(false);
    expect(agentChoiceMissing('gone', { ...list, loading: true })).toBe(false); // nothing known yet
    expect(agentChoiceMissing('gone', { ...list, error: 'UNAVAILABLE' })).toBe(false);
  });

  it('with one report printer on the site and none chosen, that one is offered first (rule 8)', () => {
    const one = { printers: [{ destinationId: 'rep-1', label: 'Front desk' }], loading: false, error: null };
    expect(onlyAgentChoice('', one)).toEqual({ destinationId: 'rep-1', label: 'Front desk' });
    expect(onlyAgentChoice('rep-1', one)).toBeNull();
    expect(onlyAgentChoice('', { ...one, printers: [...one.printers, { destinationId: 'rep-2', label: 'B' }] })).toBeNull();
    expect(onlyAgentChoice('', { ...one, loading: true })).toBeNull();
  });

  it('the audit trail always names the printer itself, not only its name', () => {
    expect(printDestinationAuditText({ agentPrinter: { siteId: 'S1', destinationId: 'rep-1' }, displayName: 'Front desk' })).toBe('Front desk (site agent printer rep-1 at site S1)');
    expect(printDestinationAuditText({ agentPrinter: { siteId: 'S1', destinationId: 'rep-1' } })).toBe('site agent printer rep-1 at site S1');
    expect(printDestinationAuditText({ protocol: 'IPP', ipAddress: '10.0.0.1', port: 631, displayName: 'Desk' })).toBe('Desk (IPP 10.0.0.1:631)');
    expect(printDestinationAuditText(undefined)).toBe('no printer');
  });

  it('a draft round-trips either kind, and a new one is an agent printer on the screen\'s site', () => {
    const blank = printDestinationDraft(undefined, 'S1');
    expect([blank.kind, blank.siteId]).toEqual(['agent', 'S1']);
    expect(printDestinationDraftProblem(blank)).toBe('agentPrinterRequired');
    const picked = withAgentPrinter(blank, { destinationId: 'rep-1', label: 'Alpha desk' });
    expect(printDestinationFromDraft(picked)).toEqual({ agentPrinter: { siteId: 'S1', destinationId: 'rep-1' }, displayName: 'Alpha desk' });
    expect(printDestinationDraft(printDestinationFromDraft(picked))).toMatchObject({ kind: 'agent', siteId: 'S1', agentPrinterId: 'rep-1', agentPrinterName: 'Alpha desk' });
    expect(withSite(picked, 'S2')).toMatchObject({ siteId: 'S2', agentPrinterId: '', agentPrinterName: '' });
    expect(withSite(picked, 'S1')).toBe(picked);
    const net = { ...blank, kind: 'network' as const, protocol: 'LPR_LPD' as const, ipAddress: ' printer.lab ', port: '515', queueName: ' lp ', resourcePath: '/ipp', displayName: ' Desk ' };
    expect(printDestinationFromDraft(net)).toEqual({ protocol: 'LPR_LPD', ipAddress: 'printer.lab', port: 515, queueName: 'lp', displayName: 'Desk' });
    expect(printDestinationDraftProblem({ ...net, port: 'abc' })).toBe('portOutOfRange');
    expect(printDestinationDraft({ protocol: 'IPP', ipAddress: '10.0.0.1', port: 631, resourcePath: '/p' })).toMatchObject({ kind: 'network', port: '631', resourcePath: '/p' });
  });

  it('routing rules: a facility-tier rule fixes the site; Redirect stays on the jobs\' own site', () => {
    expect(routingRuleSite('facility', ' F1 ')).toBe('F1');
    expect(routingRuleSite('location', 'ICU')).toBeNull();
    expect(sharedSite([{ performingFacilityId: 'S1' }, { performingFacilityId: 'S1' }])).toBe('S1');
    expect(sharedSite([{ performingFacilityId: 'S1' }, { performingFacilityId: 'S2' }])).toBeNull();
    expect(sharedSite([{ performingFacilityId: 'S1' }, {}])).toBeNull();
    expect(sharedSite([])).toBeNull();
    expect(redirectSites([{ performingFacilityId: 'S1' }, { performingFacilityId: 'S2' }]).reason).toBe('severalSites');
    expect(redirectSites([{ performingFacilityId: 'S1' }, {}]).reason).toBe('noSite');
    expect(redirectSites([{ performingFacilityId: 'S1' }])).toEqual({ site: 'S1', reason: 'oneSite' });
    expect(redirectDraft('S1')).toMatchObject({ kind: 'agent', siteId: 'S1' });
    expect(redirectDraft(null).kind).toBe('network');
    const agent = agentPrintDestination('S1', printers[0]);
    expect(redirectSiteAllowed({ performingFacilityId: 'S1' }, agent)).toBe(true);
    expect(redirectSiteAllowed({ performingFacilityId: 'S2' }, agent)).toBe(false);
    expect(redirectSiteAllowed({}, agent)).toBe(false);
    expect(redirectSiteAllowed({}, { protocol: 'IPP', ipAddress: '10.0.0.1' })).toBe(true);
  });
});

describe('the routing rule service refuses a destination it can\'t use (Batch 553)', () => {
  it('a facility-tier rule must name an agent printer on its own facility', async () => {
    const { routingRuleDestinationProblem } = await import('./mockPrintRoutingRuleService');
    const agent = { agentPrinter: { siteId: 'F1', destinationId: 'rep-1' } };
    expect(routingRuleDestinationProblem({ scopeType: 'facility', scopeId: 'F1', printDestination: agent })).toBeNull();
    expect(routingRuleDestinationProblem({ scopeType: 'facility', scopeId: 'F2', printDestination: agent })).toBe('agentPrinterOtherSite');
    expect(routingRuleDestinationProblem({ scopeType: 'location', scopeId: 'ICU', printDestination: agent })).toBeNull();
    expect(routingRuleDestinationProblem({ scopeType: 'location', scopeId: 'ICU', printDestination: { protocol: 'IPP', ipAddress: '' } })).toBe('addressRequired');
  });
});
