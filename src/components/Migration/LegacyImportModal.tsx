// src/components/Migration/LegacyImportModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 611 (#132, #166): "Import legacy file" on Migration Jobs. Choose the
// source system (one with saved field mappings), choose a CSV or JSON file,
// run. The file is read here in the browser and handed to importLegacyFile
// (services/migration/), which does the mapping, validation, MPI matching and
// creates the draft cases (Simulated bulk import). Nothing but the job's
// counts and per-record results is kept. The file's name is not shown or
// recorded: a file name can name a patient.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingState } from '@/components/Common/LoadingState';
import {
  importLegacyFile, migrationFieldMappingService, parseLegacyFile, legacyFormatOf, sourceSystemsWithMappings,
  LEGACY_IMPORT_MAX_RECORDS, type LegacyFileFormat, type LegacyImportOutcome, type LegacyImportSummary,
} from '@/services';

interface Props {
  onClose: () => void;
  /** Called when a run finishes, so the page can refresh its list. */
  onFinished: (summary: LegacyImportSummary) => void;
  /** "View job": the page opens the finished job's detail. */
  onOpenJob: (job: LegacyImportSummary['job']) => void;
}

interface Picked { format: LegacyFileFormat; text: string }

export const LegacyImportModal: React.FC<Props> = ({ onClose, onFinished, onOpenJob }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [systems, setSystems] = useState<string[] | null>(null);
  const [system, setSystem] = useState('');
  const [picked, setPicked] = useState<Picked | null>(null);
  const [pickError, setPickError] = useState<'unsupported' | 'unreadable' | null>(null);
  const [claimed, setClaimed] = useState('');
  const [createCases, setCreateCases] = useState(true);
  const [running, setRunning] = useState(false);
  const [outcome, setOutcome] = useState<LegacyImportOutcome | null>(null);

  useEffect(() => {
    migrationFieldMappingService.getAll().then(res => {
      const list = res.ok ? sourceSystemsWithMappings(res.data) : [];
      setSystems(list);
      if (list.length === 1) setSystem(list[0]);
    });
  }, []);

  const preview = useMemo(() => (picked ? parseLegacyFile(picked.text, picked.format) : null), [picked]);

  const onFile = async (file: File | undefined) => {
    setOutcome(null); setPickError(null); setPicked(null);
    if (!file) return;
    const format = legacyFormatOf(file.name);
    if (!format) { setPickError('unsupported'); return; }
    try { setPicked({ format, text: await file.text() }); } catch { setPickError('unreadable'); }
  };

  const claimedCount = claimed.trim() === '' ? undefined : Math.max(0, Math.floor(Number(claimed)));
  const canRun = !running && !!system && !!picked && !!preview && preview.ok && !outcome?.ok;

  const run = async () => {
    if (!picked || !canRun) return;
    setRunning(true);
    const result = await importLegacyFile({
      text: picked.text, format: picked.format, sourceSystemName: system,
      claimedSourceRecordCount: Number.isFinite(claimedCount) ? claimedCount : undefined,
      createDraftCases: createCases,
      createdByUserId: user?.id ?? 'unknown', createdByUserName: user?.name ?? 'unknown',
    });
    setRunning(false);
    setOutcome(result);
    if (result.ok) onFinished(result.summary);
  };

  const errorText = (e: Exclude<LegacyImportOutcome, { ok: true }>) => t(`migrationImport.error.${e.error}`, { max: e.max ?? LEGACY_IMPORT_MAX_RECORDS });

  return (
    <div className="ps-conf-backdrop" onClick={onClose}>
      <div className="ps-conf-modal ps-conf-modal--medium" role="dialog" aria-modal="true" aria-label={t('migrationImport.title')} onClick={e => e.stopPropagation()}>
        <div className="ps-conf-modal-header">{t('migrationImport.title')}</div>
        <div className="ps-conf-modal-body">
          <p className="ps-migration-import-banner" role="note">{t('migrationImport.simulatedBanner')}</p>

          {systems === null ? <LoadingState variant="inline" label={t('migrationImport.loading')} /> : systems.length === 0 ? (
            <p className="ps-conf-empty-row">{t('migrationImport.noMappings')}</p>
          ) : (
            <>
              <label className="ps-conf-form-field">
                <span className="ps-conf-label">{t('migrationImport.sourceSystem')}</span>
                <select className="ps-conf-select" value={system} onChange={e => setSystem(e.target.value)}>
                  <option value="">{t('migrationImport.chooseSystem')}</option>
                  {systems.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>

              <label className="ps-conf-form-field">
                <span className="ps-conf-label">{t('migrationImport.file')}</span>
                <input className="ps-conf-input" type="file" accept=".csv,.tsv,.txt,.json" onChange={e => { void onFile(e.target.files?.[0]); }} />
                <span className="ps-conf-hint">{t('migrationImport.fileHint', { max: LEGACY_IMPORT_MAX_RECORDS })}</span>
              </label>
              {pickError && <p className="ps-conf-error-text" role="alert">{t(`migrationImport.pick.${pickError}`)}</p>}
              {preview && preview.ok && (
                <p className="ps-migration-import-note" role="status">
                  {t('migrationImport.preview', { count: preview.records.length, fields: preview.fields.length, format: t(`migrationImport.format.${preview.format}`) })}
                  {preview.skippedNested > 0 && ` ${t('migrationImport.previewNested', { count: preview.skippedNested })}`}
                </p>
              )}
              {preview && !preview.ok && <p className="ps-conf-error-text" role="alert">{t(`migrationImport.error.${preview.error}`, { max: preview.max ?? LEGACY_IMPORT_MAX_RECORDS })}</p>}

              <label className="ps-conf-form-field">
                <span className="ps-conf-label">{t('migrationImport.claimedCount')}</span>
                <input className="ps-conf-input ps-migration-import-number" type="number" min={0} value={claimed} onChange={e => setClaimed(e.target.value)} />
                <span className="ps-conf-hint">{t('migrationImport.claimedHint')}</span>
              </label>

              <label className="ps-migration-import-check">
                <input type="checkbox" checked={createCases} onChange={e => setCreateCases(e.target.checked)} />
                <span>{t('migrationImport.createCases')}</span>
              </label>
            </>
          )}

          {running && <LoadingState variant="inline" label={t('migrationImport.running')} />}
          {outcome && !outcome.ok && <p className="ps-conf-error-text" role="alert">{errorText(outcome)}</p>}
          {outcome?.ok && (
            <div className="ps-conf-card ps-migration-import-result" role="status">
              <p>{t('migrationImport.result.counts', {
                succeeded: outcome.summary.job.succeededCount, failed: outcome.summary.job.failedCount,
                needsReview: outcome.summary.job.needsReviewCount, total: outcome.summary.job.totalRecordsProcessed,
              })}</p>
              <p>{t('migrationImport.result.cases', { count: outcome.summary.draftCasesCreated })}</p>
              {outcome.summary.alreadyImported > 0 && <p>{t('migrationImport.result.already', { count: outcome.summary.alreadyImported })}</p>}
              {outcome.summary.unmappedFields.length > 0 && <p>{t('migrationImport.result.unmapped', { fields: outcome.summary.unmappedFields.join(', ') })}</p>}
            </div>
          )}
        </div>
        <div className="ps-conf-modal-footer">
          <button className="ps-conf-btn-secondary" onClick={onClose}>{outcome?.ok ? t('common.close') : t('common.cancel')}</button>
          {!outcome?.ok && <button className="ps-conf-btn-primary" onClick={() => { void run(); }} disabled={!canRun}>{t('migrationImport.run')}</button>}
          {outcome?.ok && <button className="ps-conf-btn-primary" onClick={() => onOpenJob(outcome.summary.job)}>{t('migrationImport.viewJob')}</button>}
        </div>
      </div>
    </div>
  );
};
