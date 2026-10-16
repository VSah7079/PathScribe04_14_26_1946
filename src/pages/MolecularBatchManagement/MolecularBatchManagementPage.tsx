// src/pages/MolecularBatchManagement/MolecularBatchManagementPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct guidance: "I want a separate Batch Management as it
// will need to associate QA to the specimens in their test run
// locations. Using the engine to translate." Deliberately its own,
// separate module from src/pages/BatchManagement/ — that module is
// real, but is about physical histology tissue processing (cassettes/
// slides moving through Processor/Embedding/Staining nodes via
// barcode scans), a genuinely different domain from molecular
// instrument runs. Confirmed directly before building this, not
// assumed — reusing that module's own real batch concept would have
// been a real, wrong fit, not a shortcut.
//
// Real, "engine translates, PathScribe ingests" data flow: every real
// batch shown here, and every real specimen's own association to one,
// comes from processInboundMolecularBatchEvent.ts (services/hl7/) —
// this page is read-only, matching hpvAbnormalFlag/hpvReferenceRange's
// own established "never set by manual UI entry" posture for
// molecular-platform-sourced data.
//
// Real, direct correction (Sep 2026), per direct follow-up ("I'm not
// sure it makes sense to have Molecular Testing and Molecular Batch
// Management as separate tiles") and a direct, confirmed
// architectural relationship (see services/molecular/README.md's own
// account of the two real, separate event payloads both real
// pipelines report): no longer its own standalone home-page tile or
// route. Now rendered as the "QC & Specimen Association" tab of
// MolecularWorkcenterPage.tsx — kept as its own real, distinct tab
// (not blended into that page's own History & Archive list) since
// this remains a genuinely different real data model
// (MolecularQcRunRecord, not MolecularBatch), reporting a genuinely
// different real event type from the same real molecular-run
// lifecycle.
//
// i18n note: `sp.accessionNumber`/`.specimenLabel`/`.patientMrn`,
// `batch.instrumentId`/`.assayName`/`.reagentLotNumber`/
// `.totalSamplesRun` are all real, interface-engine-sourced data —
// never translated.
//
// Batch 406: services from @/services (off the deployment baseline); sorting
// and the specimen-to-run lookup moved to services/cytology/molecularQcRunLinks.ts;
// run dates follow the user's language.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import '../../pathscribe.css';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { molecularQcRunRecordService, qcRunsNewestFirst, specimensByMolecularRun, type QcRunSpecimenLink } from '@/services';
import type { MolecularQcRunRecord } from '@/services/cytology/IMolecularQcRunRecordService';
import { caseRouter } from '@/services/cases/CaseRouter';
import { formatDate } from '@/utils/formatDate';
import { pressable } from '@/utils/a11y/pressable';
import { LoadingState } from '@/components/Common/LoadingState';

const MolecularBatchManagementPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { pushCrumb } = useBreadcrumb();
  useEffect(() => { pushCrumb(t('molecularBatchManagementPage.title'), '/molecular?tab=qc'); }, [pushCrumb, t]);

  const [batches, setBatches] = useState<MolecularQcRunRecord[]>([]);
  const [specimensByRunId, setSpecimensByRunId] = useState<Record<string, QcRunSpecimenLink[]>>({});
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [batchesRes, casesRes] = await Promise.all([
        molecularQcRunRecordService.getAll(),
        caseRouter.getAll(),
      ]);
      setBatches(batchesRes.ok ? qcRunsNewestFirst(batchesRes.data) : []);
      // Real, reverse lookup (services/cytology/molecularQcRunLinks.ts): the
      // molecularRunId the inbound batch event set; this page never assigns it.
      setSpecimensByRunId(specimensByMolecularRun(casesRes.ok ? casesRes.data : []));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingState label={t('molecularBatchManagementPage.loading')} />;

  return (
    <div className="ps-batch-page">
      <div className="ps-batch-scroll">
        <div className="ps-batch-inner">
          <div className="ps-batch-page-header">
            <h1 className="ps-batch-page-title">{t('molecularBatchManagementPage.title')}</h1>
            <p className="ps-batch-page-subtitle">
              {t('molecularBatchManagementPage.subtitle')}
            </p>
          </div>

          <div className="ps-conf-table-wrap">
            <div className="ps-conf-table-scroll">
              <table className="ps-conf-table">
                <thead className="ps-conf-thead-sticky">
                  <tr>
                    <th className="ps-conf-th"></th>
                    <th className="ps-conf-th">{t('cytologyQaTab.molQcFailureTable.runDate')}</th>
                    <th className="ps-conf-th">{t('molecularOrderQueue.typeInstrument')}</th>
                    <th className="ps-conf-th">{t('molecularOrderQueue.col.assay')}</th>
                    <th className="ps-conf-th">{t('cytologyQaTab.molQcFailureTable.reagentLot')}</th>
                    <th className="ps-conf-th">{t('cytologyQaTab.molQcFailureTable.samplesRun')}</th>
                    <th className="ps-conf-th">{t('molecularBatchManagementPage.specimensLinkedHeader')}</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map(batch => {
                    const linked = specimensByRunId[batch.id] ?? [];
                    const isExpanded = expandedRunId === batch.id;
                    return (
                      <React.Fragment key={batch.id}>
                        <tr className="ps-conf-tr ps-conf-tr--clickable" {...pressable(() => setExpandedRunId(isExpanded ? null : batch.id), { role: null })}>
                          <td className="ps-conf-td">{isExpanded ? '▾' : '▸'}</td>
                          <td className="ps-conf-td">{formatDate(batch.runDate, i18n.language)}</td>
                          <td className="ps-conf-td">{batch.instrumentId}</td>
                          <td className="ps-conf-td">{batch.assayName}</td>
                          <td className="ps-conf-td">{batch.reagentLotNumber}</td>
                          <td className="ps-conf-td">{batch.totalSamplesRun}</td>
                          <td className="ps-conf-td">{linked.length}</td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={7} className="ps-molbatch-expand-cell">
                              <div className="ps-molbatch-expand-panel">
                                {linked.length === 0 && (
                                  <div className="ps-molbatch-empty-text">
                                    {t('molecularBatchManagementPage.noLinkedSpecimens')}
                                  </div>
                                )}
                                {linked.length > 0 && (
                                  <table className="ps-conf-table">
                                    <thead>
                                      <tr>
                                        <th className="ps-conf-th">{t('cytologyQaTab.headers.accession')}</th>
                                        <th className="ps-conf-th">{t('qualityAssurance.common.specimen')}</th>
                                        <th className="ps-conf-th">{t('cytologyQaTab.histologyTable.patientMrn')}</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {linked.map(sp => (
                                        <tr key={sp.specimenId} className="ps-conf-tr">
                                          <td className="ps-conf-td" data-phi="accession">{sp.accessionNumber ?? '—'}</td>
                                          <td className="ps-conf-td">{sp.specimenLabel}</td>
                                          <td className="ps-conf-td" data-phi="mrn">{sp.patientMrn ?? '—'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {batches.length === 0 && (<tr><td className="ps-conf-empty-row" colSpan={7}>{t('molecularBatchManagementPage.noBatches')}</td></tr>)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MolecularBatchManagementPage;
