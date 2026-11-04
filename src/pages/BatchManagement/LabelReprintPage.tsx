// src/pages/BatchManagement/LabelReprintPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 518 (PS-123): Batch Management → Label reprint. Reprints labels for
// many cases at once.
//
//   1. Find the cases by accession date and/or accession number range.
//   2. Untick any you don't want; choose requisition, container and/or
//      cassette labels, and the cassette printer.
//   3. Reprint: the labels print one at a time with "X of Y" progress.
//   4. Failed labels can be retried.
//
// The run, its permission (label:batch:reprint: Histotechnologist and Admin,
// Pete Oct 2), the on-demand guardrail for cassettes and the run log are all
// in services/labels/batchLabelReprint.ts; each label is audited by the label
// printers (PS-282). Placed under Batch Management rather than Audit Log →
// Interfaces (the proposal) because both roles that hold the permission open
// Batch Management, and Histotechnologists don't open the Audit Log.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../pathscribe.css';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { useAuth } from '@/contexts/AuthContext';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import {
  caseService, printerProfileService, casesForReprint, reprintItems, reprintLabels, retryFailedLabels, reprintSummary,
  batchLabelReprintDeps, REPRINT_LABEL_KINDS,
  type ReprintLabelKind, type ReprintCaseFilter, type LabelReprintRun,
} from '@/services';
import type { Case } from '@/types/case/Case';
import type { PrinterProfile } from '@/services/printerProfiles/IPrinterProfileService';

const K = 'labelReprint';

const LabelReprintPage: React.FC = () => {
  const { t } = useTranslation();
  const { pushCrumb } = useBreadcrumb();
  const { user } = useAuth();
  useEffect(() => { pushCrumb(t(`${K}.pageTitle`), '/batch-management/label-reprint'); }, [pushCrumb, t]);

  const [allCases, setAllCases] = useState<Case[]>([]);
  const [printers, setPrinters] = useState<PrinterProfile[]>([]);
  const [filter, setFilter] = useState<ReprintCaseFilter>({});
  const [found, setFound] = useState<Case[] | null>(null);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [kinds, setKinds] = useState<ReprintLabelKind[]>(['requisition', 'container']);
  const [printerId, setPrinterId] = useState('');
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [run, setRun] = useState<LabelReprintRun | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);

  useEffect(() => {
    void caseService.getAll().then(r => { if (r.ok) setAllCases(r.data); });
    void printerProfileService.getAll().then(r => { if (r.ok) setPrinters(r.data); });
  }, []);

  const selected = useMemo(() => (found ?? []).filter(c => !excluded.has(c.id)), [found, excluded]);
  const items = useMemo(() => reprintItems(selected, kinds), [selected, kinds]);
  const busy = progress !== null;

  const search = () => { setFound(casesForReprint(allCases, filter)); setExcluded(new Set()); setRun(null); setRefusal(null); };
  const toggleCase = (id: string) => setExcluded(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const toggleKind = (k: ReprintLabelKind) => setKinds(prev => (prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]));
  const onProgress = (done: number, total: number) => setProgress({ done, total });

  const finish = (result: LabelReprintRun | string) => {
    setProgress(null);
    if (typeof result === 'string') setRefusal(t(`${K}.refusals.${result}`));
    else { setRun(result); setRefusal(null); }
  };
  const start = async () => {
    setRefusal(null);
    setProgress({ done: 0, total: items.length });
    finish(await reprintLabels({ items, printerProfileId: printerId || undefined, startedBy: user?.id ?? 'unknown' }, batchLabelReprintDeps, onProgress));
  };
  const retry = async () => {
    if (!run) return;
    setProgress({ done: 0, total: run.items.filter(i => i.status === 'failed').length });
    finish(await retryFailedLabels(run, batchLabelReprintDeps, onProgress));
  };

  const summary = run ? reprintSummary(run) : null;
  const problems = run ? run.items.filter(i => i.status === 'failed' || i.status === 'blocked') : [];

  return (
    <div className="ps-conf-section ps-label-reprint">
      <div className="ps-conf-section-header">
        <div>
          <h1 className="ps-conf-section-title">{t(`${K}.pageTitle`)}</h1>
          <p className="ps-conf-section-subtitle">{t(`${K}.intro`)}</p>
        </div>
      </div>

      <div className="ps-label-reprint-filters">
        <label className="ps-conf-label" htmlFor="lr-from">{t(`${K}.accessionedFrom`)}</label>
        <input id="lr-from" type="date" className="ps-conf-input" value={filter.accessionedFrom ?? ''} onChange={e => setFilter(f => ({ ...f, accessionedFrom: e.target.value || undefined }))} />
        <label className="ps-conf-label" htmlFor="lr-to">{t(`${K}.accessionedTo`)}</label>
        <input id="lr-to" type="date" className="ps-conf-input" value={filter.accessionedTo ?? ''} onChange={e => setFilter(f => ({ ...f, accessionedTo: e.target.value || undefined }))} />
        <label className="ps-conf-label" htmlFor="lr-acc-from">{t(`${K}.accessionFrom`)}</label>
        <input id="lr-acc-from" className="ps-conf-input" value={filter.accessionFrom ?? ''} onChange={e => setFilter(f => ({ ...f, accessionFrom: e.target.value }))} />
        <label className="ps-conf-label" htmlFor="lr-acc-to">{t(`${K}.accessionTo`)}</label>
        <input id="lr-acc-to" className="ps-conf-input" value={filter.accessionTo ?? ''} onChange={e => setFilter(f => ({ ...f, accessionTo: e.target.value }))} />
        <button type="button" className="ps-conf-btn-secondary" onClick={search} disabled={busy}>{t(`${K}.find`)}</button>
      </div>

      {found && (
        <>
          <p className="ps-conf-hint">{found.length === 0 ? t(`${K}.noCases`) : t(`${K}.casesFound`, { count: found.length, selected: selected.length })}</p>
          {found.length > 0 && (
            <div className="ps-conf-table-wrap">
              <div className="ps-conf-table-scroll ps-label-reprint-cases">
                <table className="ps-conf-table">
                  <thead className="ps-conf-thead-sticky">
                    <tr>
                      <th className="ps-conf-th">{t(`${K}.include`)}</th>
                      <th className="ps-conf-th">{t(`${K}.accession`)}</th>
                      <th className="ps-conf-th">{t(`${K}.specimens`)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {found.map(c => (
                      <tr key={c.id} className="ps-conf-tr">
                        <td className="ps-conf-td">
                          <input type="checkbox" checked={!excluded.has(c.id)} disabled={busy} onChange={() => toggleCase(c.id)}
                            aria-label={t(`${K}.includeAria`)} />
                        </td>
                        <td className="ps-conf-td" data-phi="accession">{c.accession?.fullAccession ?? c.accession?.accessionNumber ?? c.id}</td>
                        <td className="ps-conf-td">{(c.specimens ?? []).length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="ps-label-reprint-options">
            <span className="ps-conf-label">{t(`${K}.labels`)}</span>
            {REPRINT_LABEL_KINDS.map(k => (
              <label key={k} className="ps-label-reprint-kind">
                <input type="checkbox" checked={kinds.includes(k)} disabled={busy} onChange={() => toggleKind(k)} />
                {' '}{t(`${K}.kinds.${k}`)}
              </label>
            ))}
            {kinds.includes('cassette') && (
              <>
                <label className="ps-conf-label" htmlFor="lr-printer">{t(`${K}.cassettePrinter`)}</label>
                <select id="lr-printer" className="ps-conf-select" value={printerId} disabled={busy} onChange={e => setPrinterId(e.target.value)}>
                  <option value="">{t(`${K}.choosePrinter`)}</option>
                  {printers.map(p => <option key={p.id} value={p.id}>{p.printerId}</option>)}
                </select>
              </>
            )}
          </div>
          <p className="ps-conf-hint">{t(`${K}.labelCount`, { count: items.length })}</p>
          <div className="ps-label-reprint-actions">
            <CapabilityButton capability="label:batch:reprint" className="ps-conf-btn-primary" disabled={busy || items.length === 0} onClick={() => { void start(); }}>
              {t(`${K}.reprint`)}
            </CapabilityButton>
          </div>
        </>
      )}

      {progress && <p className="ps-conf-hint" role="status">{t(`${K}.progress`, { done: progress.done, total: progress.total })}</p>}
      {refusal && <p className="ps-conf-hint ps-conf-hint--warning" role="alert">{refusal}</p>}

      {run && summary && (
        <div className="ps-label-reprint-result">
          <p className="ps-conf-hint" role="status">{t(`${K}.summary`, { printed: summary.printed, failed: summary.failed, blocked: summary.blocked })}</p>
          {problems.length > 0 && (
            <ul className="ps-label-reprint-problems">
              {problems.map(i => (
                <li key={i.key}>
                  <span data-phi="accession">{i.accession}</span>
                  {' '}{t(`${K}.problemLine`, { kind: t(`${K}.kinds.${i.kind}`), target: i.target ?? '', status: t(`${K}.statuses.${i.status}`), message: i.message ?? '' })}
                </li>
              ))}
            </ul>
          )}
          {summary.failed > 0 && (
            <CapabilityButton capability="label:batch:reprint" className="ps-conf-btn-secondary" disabled={busy} onClick={() => { void retry(); }}>
              {t(`${K}.retryFailed`, { count: summary.failed })}
            </CapabilityButton>
          )}
        </div>
      )}
    </div>
  );
};

export default LabelReprintPage;
