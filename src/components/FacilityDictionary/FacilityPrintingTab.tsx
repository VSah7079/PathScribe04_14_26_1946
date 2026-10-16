// src/components/FacilityDictionary/FacilityPrintingTab.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 517 (PS-337): the Facility editor's Printing tab. Until now a
// facility's report-printing settings could only be set in seed data.
//
//   • Report printing (performing labs): print released reports or not, the
//     delivery mode, the QZ Tray printer, paper size, and the network printer
//     used when no print routing rule matches.
//   • Paper handling (any facility, as the ordering client): paper tray and
//     duplex for its reports; "report default" leaves the report type's own
//     choice in place.
//
// Saves on its own button through facilityService.setPrintSettings, which
// checks config:print-settings:manage; the facility's main Save never changes
// these settings. Rules: services/printing/facilityReportPrinting.ts.
// Batch 553: the default printer is one of this facility's site agent
// printers (picked from its list) or a printer address.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { facilityService } from '@/services';
import type { Facility } from '@/services/facilities/IFacilityService';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import {
  DUPLEX_MODES, PAPER_SIZES, PAPER_SOURCES, PRINT_DELIVERY_MODES, PRINT_PROTOCOLS,
  facilityPrintForm, facilityPrintProblem, facilityPrintSettingsFromForm, isFacilityPrintProblem,
  type FacilityPrintForm,
} from '@/services/printing/facilityReportPrinting';
import { CONFIG_NOT_PERMITTED } from '@/services/authorization/guardConfigWrites';
import { useAgentPrinters } from '@/hooks/useAgentPrinters';
import { agentChoiceMissing } from '@/services/printRouting/printDestinationRules';
import { LoadingState } from '@/components/Common/LoadingState';
import { Link } from 'react-router';

const K = 'facilityPrintingTab';

interface Props {
  facility: Facility;
  /** Show the performing-lab section (delivery mode and printer). */
  isPerformingLab: boolean;
  /** Called with the saved facility. */
  onSaved?: (facility: Facility) => void;
}


export const FacilityPrintingTab: React.FC<Props> = ({ facility, isPerformingLab, onSaved }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState<FacilityPrintForm>(() => facilityPrintForm(facility));
  const [status, setStatus] = useState<{ kind: 'saved' | 'error'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  // The list the editor was opened from may predate a save made here earlier, so read the stored settings.
  useEffect(() => {
    let live = true;
    void facilityService.getById(facility.id).then(r => { if (live && r.ok) setForm(facilityPrintForm(r.data)); });
    return () => { live = false; };
  }, [facility.id]);
  const set = <F extends keyof FacilityPrintForm>(field: F, value: FacilityPrintForm[F]) => {
    setForm(f => ({ ...f, [field]: value }));
    setStatus(null);
  };
  const settings = facilityPrintSettingsFromForm(form, facility.id);
  const problem = facilityPrintProblem(settings, facility.id);
  const agentPicker = isPerformingLab && form.mode === 'DIRECT_NETWORK_PRINT' && form.destinationKind === 'agent';
  const agents = useAgentPrinters(agentPicker ? facility.id : null, 'facilityDefault');
  const agentStale = agentPicker && agentChoiceMissing(form.destinationAgentPrinterId, agents);

  const save = async () => {
    setSaving(true);
    const result = await facilityService.setPrintSettings(facility.id, settings);
    setSaving(false);
    if (result.ok) {
      setStatus({ kind: 'saved', message: t(`${K}.saved`) });
      onSaved?.(result.data);
    } else {
      const message = isFacilityPrintProblem(result.error) ? t(`${K}.problems.${result.error}`)
        : result.error === CONFIG_NOT_PERMITTED ? t(`${K}.notPermitted`) : t(`${K}.saveFailed`);
      setStatus({ kind: 'error', message });
    }
  };

  return (
    <div className="ps-client-editor-form">
      {isPerformingLab && (
        <>
          <div className="cem-section">{t(`${K}.delivery.title`)}</div>
          <p className="cem-hint-sm">{t(`${K}.delivery.intro`)}</p>
          <label className="cem-toggle-row">
            <input type="checkbox" className="cem-checkbox-toggle" checked={form.printingConfigured && form.enabled}
              onChange={e => { set('printingConfigured', true); set('enabled', e.target.checked); }} />
            <span className="cem-toggle-label--bold">{t(`${K}.delivery.enabled`)}</span>
          </label>
          {form.printingConfigured && (
            <div className="ps-client-editor-grid-2">
              <div>
                <label className="cem-label" htmlFor="fpt-mode">{t(`${K}.delivery.mode`)}</label>
                <select id="fpt-mode" className="cem-input" value={form.mode} onChange={e => set('mode', e.target.value as FacilityPrintForm['mode'])}>
                  {PRINT_DELIVERY_MODES.map(m => <option key={m} value={m}>{t(`${K}.modes.${m}`)}</option>)}
                </select>
                <div className="cem-hint">{t(`${K}.modeHints.${form.mode}`)}</div>
              </div>
              <div>
                <label className="cem-label" htmlFor="fpt-paper-size">{t(`${K}.delivery.paperSize`)}</label>
                <select id="fpt-paper-size" className="cem-input" value={form.paperSize} onChange={e => set('paperSize', e.target.value as FacilityPrintForm['paperSize'])}>
                  <option value="">{t(`${K}.delivery.paperSizeDefault`)}</option>
                  {PAPER_SIZES.map(s => <option key={s} value={s}>{t(`${K}.paperSizes.${s}`)}</option>)}
                </select>
              </div>
              {form.mode === 'NATIVE_QZ_TRAY' && (
                <div className="cem-field--span">
                  <label className="cem-label" htmlFor="fpt-printer">{t(`${K}.delivery.printerName`)}</label>
                  <input id="fpt-printer" className="cem-input" value={form.printerName} onChange={e => set('printerName', e.target.value)} />
                  <div className="cem-hint">{t(`${K}.delivery.printerNameHint`)}</div>
                </div>
              )}
              {form.mode === 'DIRECT_NETWORK_PRINT' && (
                <>
                  <div className="cem-field--span cem-hint-sm">{t(`${K}.destination.intro`)}</div>
                  <div className="cem-field--span">
                    <label className="cem-label" htmlFor="fpt-dest-kind">{t('printDestination.kind')}</label>
                    <select id="fpt-dest-kind" className="cem-input" value={form.destinationKind} onChange={e => set('destinationKind', e.target.value as FacilityPrintForm['destinationKind'])}>
                      <option value="agent">{t('printDestination.kinds.agent')}</option>
                      <option value="network">{t('printDestination.kinds.network')}</option>
                    </select>
                  </div>
                  {form.destinationKind === 'agent' && (
                    <div className="cem-field--span">
                      <label className="cem-label" htmlFor="fpt-agent-printer">{t('printDestination.printer')}</label>
                      <select id="fpt-agent-printer" className="cem-input" value={form.destinationAgentPrinterId} disabled={agents.loading}
                        onChange={e => { const p = agents.printers.find(x => x.destinationId === e.target.value); set('destinationAgentPrinterId', p?.destinationId ?? ''); set('destinationAgentPrinterName', p?.label ?? ''); }}>
                        <option value="">{t(`${K}.destination.noDefault`)}</option>
                        {agentStale && <option value={form.destinationAgentPrinterId}>{form.destinationAgentPrinterName || form.destinationAgentPrinterId}</option>}
                        {agents.printers.map(p => <option key={p.destinationId} value={p.destinationId}>{p.label}</option>)}
                      </select>
                      {agents.loading && <LoadingState variant="inline" className="cem-hint" label={t('printDestination.loadingPrinters')} />}
                      {agents.error === 'NOT_PERMITTED' && <div className="cem-hint">{t('printDestination.printersNotPermitted')}</div>}
                      {agents.error && agents.error !== 'NOT_PERMITTED' && <div className="cem-hint">{t('printDestination.printersUnavailable')}</div>}
                      {!agents.loading && !agents.error && agents.printers.length === 0 && (
                        <div className="cem-hint ps-print-dest-note">
                          <span>{t('printDestination.noPrinters')}</span>
                          <Link to="/configuration?tab=system&section=site_agents">{t('printDestination.openSiteAgents')}</Link>
                        </div>
                      )}
                      {agentStale && <div className="cem-note">{t('printDestination.printerNotListed')}</div>}
                    </div>
                  )}
                  {form.destinationKind === 'network' && (
                  <>
                  <div>
                    <label className="cem-label" htmlFor="fpt-protocol">{t(`${K}.destination.protocol`)}</label>
                    <select id="fpt-protocol" className="cem-input" value={form.destinationProtocol} onChange={e => set('destinationProtocol', e.target.value as FacilityPrintForm['destinationProtocol'])}>
                      {PRINT_PROTOCOLS.map(p => <option key={p} value={p}>{t(`${K}.protocols.${p}`)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="cem-label" htmlFor="fpt-address">{t(`${K}.destination.address`)}</label>
                    <input id="fpt-address" className="cem-input" value={form.destinationAddress} onChange={e => set('destinationAddress', e.target.value)} />
                  </div>
                  <div>
                    <label className="cem-label" htmlFor="fpt-port">{t(`${K}.destination.port`)}</label>
                    <input id="fpt-port" className="cem-input" inputMode="numeric" value={form.destinationPort} onChange={e => set('destinationPort', e.target.value)} />
                    <div className="cem-hint">{t(`${K}.destination.portHint`)}</div>
                  </div>
                  {form.destinationProtocol === 'LPR_LPD' && (
                    <div>
                      <label className="cem-label" htmlFor="fpt-queue">{t(`${K}.destination.queue`)}</label>
                      <input id="fpt-queue" className="cem-input" value={form.destinationQueue} onChange={e => set('destinationQueue', e.target.value)} />
                    </div>
                  )}
                  {form.destinationProtocol === 'IPP' && (
                    <div>
                      <label className="cem-label" htmlFor="fpt-path">{t(`${K}.destination.path`)}</label>
                      <input id="fpt-path" className="cem-input" value={form.destinationPath} onChange={e => set('destinationPath', e.target.value)} />
                    </div>
                  )}
                  <div className="cem-field--span">
                    <label className="cem-label" htmlFor="fpt-dest-name">{t(`${K}.destination.name`)}</label>
                    <input id="fpt-dest-name" className="cem-input" value={form.destinationName} onChange={e => set('destinationName', e.target.value)} />
                  </div>
                  </>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}

      <div className="cem-section cem-section--spaced">{t(`${K}.presentation.title`)}</div>
      <p className="cem-hint-sm">{t(`${K}.presentation.intro`)}</p>
      <div className="ps-client-editor-grid-2">
        <div>
          <label className="cem-label" htmlFor="fpt-tray">{t(`${K}.presentation.paperSource`)}</label>
          <select id="fpt-tray" className="cem-input" value={form.paperSource} onChange={e => set('paperSource', e.target.value as FacilityPrintForm['paperSource'])}>
            <option value="">{t(`${K}.presentation.reportDefault`)}</option>
            {PAPER_SOURCES.map(s => <option key={s} value={s}>{t(`${K}.paperSources.${s}`)}</option>)}
          </select>
        </div>
        <div>
          <label className="cem-label" htmlFor="fpt-duplex">{t(`${K}.presentation.duplex`)}</label>
          <select id="fpt-duplex" className="cem-input" value={form.duplexMode} onChange={e => set('duplexMode', e.target.value as FacilityPrintForm['duplexMode'])}>
            <option value="">{t(`${K}.presentation.reportDefault`)}</option>
            {DUPLEX_MODES.map(m => <option key={m} value={m}>{t(`${K}.duplexModes.${m}`)}</option>)}
          </select>
        </div>
      </div>

      {problem && <p className="cem-note ps-facility-print-problem" role="alert">{t(`${K}.problems.${problem}`)}</p>}
      {status && (
        <p className={status.kind === 'saved' ? 'cem-hint ps-facility-print-saved' : 'cem-note ps-facility-print-problem'} role="status">{status.message}</p>
      )}
      <div className="ps-facility-print-actions">
        <CapabilityButton capability="config:print-settings:manage" className="ps-conf-btn-primary"
          disabled={!!problem || saving} disabledTitle={problem ? t(`${K}.problems.${problem}`) : undefined}
          onClick={() => { void save(); }}>
          {t(`${K}.save`)}
        </CapabilityButton>
      </div>
    </div>
  );
};
