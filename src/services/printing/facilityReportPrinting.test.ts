// src/services/printing/facilityReportPrinting.test.ts
import { describe, it, expect } from 'vitest';
import { facilityPrintForm, facilityPrintProblem, facilityPrintSettingsFromForm, isFacilityPrintProblem } from './facilityReportPrinting';

describe('facility report-printing settings (Batch 517, PS-337)', () => {
  it('a facility with nothing configured round-trips to nothing (printing stays off, report defaults apply)', () => {
    const form = facilityPrintForm({});
    expect(form.printingConfigured).toBe(false);
    expect(facilityPrintSettingsFromForm(form)).toEqual({ printDeliveryConfig: undefined, printPresentationPreference: undefined });
  });

  it('round-trips a direct network configuration with its default printer', () => {
    const settings = {
      printDeliveryConfig: { enabled: true, mode: 'DIRECT_NETWORK_PRINT' as const, paperSize: 'A4' as const,
        directNetworkPrintDestination: { protocol: 'IPP' as const, ipAddress: '10.1.2.3', port: 631, resourcePath: '/ipp/print', displayName: 'Histology front desk' } },
      printPresentationPreference: { duplexMode: 'SIMPLEX' as const },
    };
    expect(facilityPrintSettingsFromForm(facilityPrintForm(settings))).toEqual(settings);
  });

  it('drops fields that do not apply to the chosen mode or protocol, and trims text', () => {
    const form = { ...facilityPrintForm({}), printingConfigured: true, enabled: true, mode: 'INTERFACE_ENGINE_HANDOFF' as const, printerName: 'Old QZ printer', destinationAddress: '10.0.0.1' };
    expect(facilityPrintSettingsFromForm(form).printDeliveryConfig).toEqual({ enabled: true, mode: 'INTERFACE_ENGINE_HANDOFF' });
    const lpr = { ...form, mode: 'DIRECT_NETWORK_PRINT' as const, destinationKind: 'network' as const, destinationProtocol: 'LPR_LPD' as const, destinationAddress: ' printer.lab ', destinationQueue: ' lp ', destinationPath: '/ipp/print' };
    expect(facilityPrintSettingsFromForm(lpr).printDeliveryConfig?.directNetworkPrintDestination).toEqual({ protocol: 'LPR_LPD', ipAddress: 'printer.lab', queueName: 'lp' });
  });

  it('names what is wrong', () => {
    const base = { ...facilityPrintForm({}), printingConfigured: true, enabled: true };
    expect(facilityPrintProblem(facilityPrintSettingsFromForm(base))).toBe('printerNameRequired');
    expect(facilityPrintProblem(facilityPrintSettingsFromForm({ ...base, enabled: false }))).toBeNull();
    const net = { ...base, mode: 'DIRECT_NETWORK_PRINT' as const, destinationKind: 'network' as const };
    expect(facilityPrintProblem(facilityPrintSettingsFromForm(net))).toBeNull();
    expect(facilityPrintProblem(facilityPrintSettingsFromForm({ ...net, destinationName: 'Front desk' }))).toBe('destinationAddressRequired');
    expect(facilityPrintProblem(facilityPrintSettingsFromForm({ ...net, destinationAddress: 'http://x/y' }))).toBe('destinationAddressInvalid');
    expect(facilityPrintProblem(facilityPrintSettingsFromForm({ ...net, destinationAddress: '10.0.0.9', destinationPort: '70000' }))).toBe('portOutOfRange');
    expect(facilityPrintProblem(facilityPrintSettingsFromForm({ ...net, destinationAddress: '10.0.0.9', destinationPort: 'abc' }))).toBe('portOutOfRange');
    expect(isFacilityPrintProblem('portOutOfRange')).toBe(true);
    expect(isFacilityPrintProblem('CONFIG_NOT_PERMITTED')).toBe(false);
  });

  it('Batch 553: a new facility defaults to a site agent printer of its own; another site is refused', () => {
    const form = { ...facilityPrintForm({}), printingConfigured: true, enabled: true, mode: 'DIRECT_NETWORK_PRINT' as const };
    expect(form.destinationKind).toBe('agent');
    expect(facilityPrintSettingsFromForm(form, 'F1').printDeliveryConfig?.directNetworkPrintDestination).toBeUndefined(); // no printer picked: no default
    const picked = facilityPrintSettingsFromForm({ ...form, destinationAgentPrinterId: 'rep-1', destinationAgentPrinterName: 'Front desk' }, 'F1');
    expect(picked.printDeliveryConfig?.directNetworkPrintDestination).toEqual({ agentPrinter: { siteId: 'F1', destinationId: 'rep-1' }, displayName: 'Front desk' });
    expect(facilityPrintProblem(picked, 'F1')).toBeNull();
    expect(facilityPrintProblem(picked, 'F2')).toBe('agentPrinterOtherSite');
    const back = facilityPrintForm(picked);
    expect([back.destinationKind, back.destinationAgentPrinterId, back.destinationAgentPrinterName]).toEqual(['agent', 'rep-1', 'Front desk']);
  });
});
