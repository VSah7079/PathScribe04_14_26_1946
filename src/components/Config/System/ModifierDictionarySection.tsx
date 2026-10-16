// src/components/Config/System/ModifierDictionarySection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct guidance's own "Bring-Your-Own-License (BYOL)
// Ingestion" best practice: a real, licensed customer uploads their
// own real, licensed CPT modifier descriptions here - PathScribe
// itself never embeds or redistributes real AMA text (see
// cptModifierDictionary.ts's own header). Mirrors
// RvuCodeMapSection.tsx's own established, proven upload/preview/
// import pattern - download a real template, upload a real file, see
// a real preview before anything is committed, one click to save.
//
// Real, per direct guidance's own "Isolate Synthetic Data" best
// practice: every version carries an explicit, required
// licenseStatus - the uploading admin must affirmatively attest they
// hold a real, current AMA license before any import is ever marked
// 'licensed' rather than 'synthetic'. Never inferred from a filename
// or label.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { parseCsv, toCsv, downloadCsv, isCsvFile, readFileAsText } from '@/utils/csv';
import { formatDate as formatLocaleDate } from '@/utils/formatDate';
import { modifierDictionaryService } from '@/services';
import type { ModifierTableVersion } from '@/services/billing/ModifierTableVersion';
import { parseModifierUploadRows, modifierUploadTemplateRows, MODIFIER_UPLOAD_TEMPLATE_FILENAME, type CptModifierEntry } from '@/services/billing/cptModifierDictionary';
import { getSessionUser } from '@/services/auth/caseAccessControl';
import { LoadingState } from '@/components/Common/LoadingState';

// Batch 452: dates in the user's language (was a hard-coded 'en-US').
const formatDate = (iso: string, language: string) => formatLocaleDate(iso, language);

/** Real, per direct follow-up: "why do I always have to use a CSV
 *  file to correct a single entry" - a real, single-entry edit modal,
 *  matching RvuCodeMapSection.tsx's own EntryModal pattern exactly,
 *  so correcting one modifier's description no longer requires a
 *  full spreadsheet round-trip. */
const EntryModal: React.FC<{ entry: CptModifierEntry; onSave: (e: CptModifierEntry) => void; onClose: () => void; busy: boolean }> = ({ entry, onSave, onClose, busy }) => {
  const { t } = useTranslation();
  const [description, setDescription] = useState(entry.description);
  return (
    <div className="ps-ms-overlay">
      <div className="ps-ms-modal">
        <div className="ps-ms-header">{t('modifierDictionarySection.entryModal.headerEdit', { code: entry.code })}</div>
        <div className="ps-ms-body">
          <div className="ps-conf-form-field">
            <label className="ps-conf-label">{t('modifierDictionarySection.entryModal.codeLabel')}</label>
            <input aria-label={t('modifierDictionarySection.entryModal.codeLabel')} className="ps-conf-input" value={entry.code} disabled />
          </div>
          <div className="ps-conf-form-field">
            <label className="ps-conf-label">{t('modifierDictionarySection.entryModal.descriptionLabel')}</label>
            <input aria-label={t('modifierDictionarySection.entryModal.descriptionLabel')} className="ps-conf-input" value={description} onChange={e => setDescription(e.target.value)} autoFocus />
          </div>
          <p className="ps-billing-reason-hint">
            {t('modifierDictionarySection.entryModal.disclosure')}
          </p>
        </div>
        <div className="ps-ms-footer">
          <button className="ps-conf-btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
          <button className="ps-conf-btn-primary" disabled={busy || !description.trim()} onClick={() => onSave({ ...entry, description: description.trim() })}>
            {busy ? t('modifierDictionarySection.submitting') : t('modifierDictionarySection.submit')}
          </button>
        </div>
      </div>
    </div>
  );
};

const ModifierDictionarySection: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [versions, setVersions] = useState<ModifierTableVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOlder, setShowOlder] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadPreview, setUploadPreview] = useState<CptModifierEntry[] | null>(null);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadLabel, setUploadLabel] = useState('');
  const [uploadEffectiveDate, setUploadEffectiveDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Real, per direct guidance's own "Isolate Synthetic Data" best
  // practice - a real, required attestation, never defaulted to true.
  const [confirmLicensed, setConfirmLicensed] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CptModifierEntry | null>(null);

  const refresh = useCallback(() => {
    modifierDictionaryService.getAllVersions().then(res => {
      if (res.ok) setVersions(res.data);
      setLoading(false);
    });
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const activeVersion = versions.find(v => v.isActive) ?? null;
  const olderVersions = versions.filter(v => !v.isActive);
  const pendingCount = versions.filter(v => v.approvalStatus === 'PENDING_APPROVAL').length;

  /** Real, per direct follow-up: a single-entry correction now goes
   *  through the exact same real path a full upload does -
   *  createVersion, submitted for approval - just built from the
   *  active version's own entries with one row changed, rather than a
   *  freshly parsed spreadsheet. Never activates immediately; see
   *  modifierDictionaryService.ts's own createVersion. */
  const handleSaveEntry = async (entry: CptModifierEntry) => {
    if (!activeVersion) return;
    setBusy(true);
    const user = getSessionUser();
    const newEntries = activeVersion.entries.map(e => e.code === entry.code ? entry : e);
    const res = await modifierDictionaryService.createVersion({
      label: `Manual edit — ${entry.code}`,
      effectiveDate: new Date().toISOString(),
      entries: newEntries,
      uploadedBy: user?.id ?? 'admin',
      licenseStatus: activeVersion.licenseStatus,
    });
    setBusy(false);
    if (res.ok === false) { setToast(res.error); return; }
    setEditingEntry(null);
    setToast(t('modifierDictionarySection.toast.entrySubmitted', { code: entry.code }));
    refresh();
  };

  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    if (!isCsvFile(file)) {
      setUploadError(t('modifierDictionarySection.upload.invalidFileType', { fileName: file.name }));
      return;
    }
    try {
      const text = await readFileAsText(file);
      const rows = parseCsv(text);
      const { entries, problems } = parseModifierUploadRows(rows);
      if (entries.length === 0 && problems.length === 0) {
        setUploadError(t('modifierDictionarySection.upload.noRowsFound'));
        return;
      }
      if (problems.length > 0) setUploadError(problems.slice(0, 5).map(p => t('modifierDictionarySection.upload.missingCodeRow', { row: p.row })).join(' '));
      setUploadPreview(entries);
      setUploadFileName(file.name);
      if (!uploadLabel) setUploadLabel(t('modifierDictionarySection.upload.defaultLabel', { name: file.name.replace(/\.csv$/i, '') }));
    } catch {
      setUploadError(t('modifierDictionarySection.upload.readError'));
    }
  };

  // Batch 452 (Pete, Oct 4): every failure is shown. Before, an invalid
  // effective date threw out of this handler (new Date('').toISOString())
  // and a service refusal or thrown error left the screen unchanged.
  const handleApplyUpload = async () => {
    if (!uploadPreview || uploadPreview.length === 0) return;
    if (!confirmLicensed) { setUploadError(t('modifierDictionarySection.upload.confirmLicenseRequired')); return; }
    const effective = new Date(uploadEffectiveDate);
    if (isNaN(effective.getTime())) { setUploadError(t('modifierDictionarySection.upload.invalidEffectiveDate')); return; }
    setBusy(true);
    try {
      const user = getSessionUser();
      const res = await modifierDictionaryService.createVersion({
        label: uploadLabel.trim() || uploadFileName,
        effectiveDate: effective.toISOString(),
        entries: uploadPreview,
        uploadedBy: user?.id ?? 'admin',
        licenseStatus: 'licensed',
        sourceFileName: uploadFileName,
      });
      if (res.ok === false) { setUploadError(t('modifierDictionarySection.upload.saveFailed', { reason: res.error })); return; }
      setToast(t('modifierDictionarySection.toast.uploadSubmitted', { label: res.data.label }));
      setUploadPreview(null);
      setUploadFileName('');
      setUploadLabel('');
      setConfirmLicensed(false);
      refresh();
    } catch (e) {
      setUploadError(t('modifierDictionarySection.upload.saveFailed', { reason: e instanceof Error ? e.message : String(e) }));
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadTemplate = () => {
    downloadCsv(MODIFIER_UPLOAD_TEMPLATE_FILENAME, toCsv(modifierUploadTemplateRows()));
  };

  if (loading) return <LoadingState label={t('modifierDictionarySection.loading')} />;

  return (
    <div>
      <div className="ps-conf-section-header">
        <div>
          <h3 className="ps-conf-section-title">{t('modifierDictionarySection.title')}</h3>
          <p className="ps-conf-section-subtitle">
            {t('modifierDictionarySection.subtitle')}
          </p>
        </div>
        <div className="ps-conf-row-actions">
          <button className="ps-conf-btn-secondary" onClick={handleDownloadTemplate}>{t('modifierDictionarySection.downloadTemplate')}</button>
          <button className="ps-conf-btn-secondary" onClick={() => fileInputRef.current?.click()}>{t('modifierDictionarySection.uploadSpreadsheet')}</button>
          <input ref={fileInputRef} type="file" hidden accept=".csv,text/csv"
            onChange={e => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]); e.target.value = ''; }} />
        </div>
      </div>

      {toast && <p className="ps-billing-reason-hint">{toast}</p>}
      {/* Batch 452 (PS-48 follow-up): a refusal before any preview opens
          (wrong file type, empty file, unreadable file) was set but never
          shown, because it only rendered inside the preview. */}
      {uploadError && !uploadPreview && <p className="ps-conf-error-text" role="alert">{uploadError}</p>}
      {pendingCount > 0 && (
        <p className="ps-billing-reason-hint">
          {t('modifierDictionarySection.pendingApproval', { count: pendingCount })}
        </p>
      )}

      {activeVersion && (
        <div className="ps-conf-table-wrap">
          <div className="ps-conf-section-header">
            <div>
              <span className="ps-conf-status-text ps-conf-status-text--active">{t('modifierDictionarySection.activeVersion.eyebrow')}</span>
              <div className="ps-conf-identity-name">{activeVersion.label}</div>
            </div>
            <span className="ps-billing-reason-hint">
              {activeVersion.licenseStatus === 'licensed'
                ? t('modifierDictionarySection.activeVersion.effectiveLicensed', { date: formatDate(activeVersion.effectiveDate, i18n.language) })
                : t('modifierDictionarySection.activeVersion.effectiveSynthetic', { date: formatDate(activeVersion.effectiveDate, i18n.language) })}
            </span>
          </div>
          <div className="ps-conf-table-scroll">
            <table className="ps-conf-table">
              <thead><tr><th className="ps-conf-th">{t('modifierDictionarySection.activeVersion.table.code')}</th><th className="ps-conf-th">{t('modifierDictionarySection.activeVersion.table.description')}</th><th className="ps-conf-th">{t('modifierDictionarySection.activeVersion.table.actions')}</th></tr></thead>
              <tbody>
                {activeVersion.entries.map(e => (
                  <tr key={e.code} className="ps-conf-tr">
                    <td className="ps-conf-td"><span className="ps-conf-identity-name">{e.code}</span></td>
                    <td className="ps-conf-td">{e.description}</td>
                    <td className="ps-conf-td"><button className="ps-conf-btn-row" onClick={() => setEditingEntry(e)}>{t('common.edit')}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {olderVersions.length > 0 && (
        <div className="ps-conf-form-field">
          <button data-config-nav className="ps-conf-btn-row" onClick={() => setShowOlder(o => !o)}>
            {showOlder
              ? t('modifierDictionarySection.olderVersions.toggleHide', { count: olderVersions.length })
              : t('modifierDictionarySection.olderVersions.toggleShow', { count: olderVersions.length })}
          </button>
          {showOlder && (
            <div className="ps-conf-table-wrap">
              <table className="ps-conf-table">
                <thead><tr>
                  {([
                    ['label', t('modifierDictionarySection.olderVersions.table.label')],
                    ['effective', t('modifierDictionarySection.olderVersions.table.effective')],
                    ['license', t('modifierDictionarySection.olderVersions.table.license')],
                    ['approvalStatus', t('modifierDictionarySection.olderVersions.table.approvalStatus')],
                  ] as const).map(([key, label]) => <th key={key} className="ps-conf-th">{label}</th>)}
                </tr></thead>
                <tbody>
                  {olderVersions.map(v => (
                    <tr key={v.id} className="ps-conf-tr">
                      <td className="ps-conf-td">{v.label}</td>
                      <td className="ps-conf-td">{formatDate(v.effectiveDate, i18n.language)}</td>
                      <td className="ps-conf-td">{v.licenseStatus === 'licensed' ? t('modifierDictionarySection.olderVersions.license.licensed') : t('modifierDictionarySection.olderVersions.license.synthetic')}</td>
                      <td className="ps-conf-td">
                        {v.approvalStatus === 'PENDING_APPROVAL' ? t('modifierDictionarySection.olderVersions.status.pending')
                          : v.approvalStatus === 'REJECTED' ? (v.rejectionReason ? t('modifierDictionarySection.olderVersions.status.rejectedWithReason', { reason: v.rejectionReason }) : t('modifierDictionarySection.olderVersions.status.rejected'))
                          : v.approvalStatus === 'APPROVED' ? t('modifierDictionarySection.olderVersions.status.approved')
                          : t('modifierDictionarySection.olderVersions.status.none')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {uploadPreview && (
        <div className="ps-ms-overlay">
          <div className="ps-ms-modal ps-ms-modal--extra-wide">
            <div className="ps-ms-header">{t('modifierDictionarySection.uploadModal.importTitle', { fileName: uploadFileName })}</div>
            <div className="ps-ms-body">
              {uploadError && <p className="ps-conf-error-text">{uploadError}</p>}
              <div className="ps-conf-form-row">
                <div className="ps-conf-form-field">
                  <label className="ps-conf-label">{t('modifierDictionarySection.uploadModal.versionLabel')}</label>
                  <input aria-label={t('modifierDictionarySection.uploadModal.versionLabel')} className="ps-conf-input" value={uploadLabel} onChange={e => setUploadLabel(e.target.value)} />
                </div>
                <div className="ps-conf-form-field">
                  <label className="ps-conf-label">{t('modifierDictionarySection.uploadModal.effectiveFrom')}</label>
                  <input aria-label={t('modifierDictionarySection.uploadModal.effectiveFrom')} className="ps-conf-input" type="date" value={uploadEffectiveDate} onChange={e => setUploadEffectiveDate(e.target.value)} />
                </div>
              </div>
              <div className="ps-conf-table-wrap">
                <div className="ps-conf-table-scroll">
                  <table className="ps-conf-table">
                    <thead><tr><th className="ps-conf-th">{t('modifierDictionarySection.uploadModal.table.code')}</th><th className="ps-conf-th">{t('modifierDictionarySection.uploadModal.table.description')}</th></tr></thead>
                    <tbody>
                      {uploadPreview.map((e, i) => (
                        <tr key={`${e.code}-${i}`} className="ps-conf-tr">
                          <td className="ps-conf-td">{e.code}</td>
                          <td className="ps-conf-td">{e.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="ps-conf-form-field">
                <label className="ps-conf-label">
                  <input type="checkbox" checked={confirmLicensed} onChange={e => setConfirmLicensed(e.target.checked)} />
                  {' '}{t('modifierDictionarySection.uploadModal.licenseConfirm')}
                </label>
              </div>
              <p className="ps-billing-reason-hint">
                {t('modifierDictionarySection.uploadModal.disclosure')}
              </p>
            </div>
            <div className="ps-ms-footer">
              <button className="ps-conf-btn-secondary" onClick={() => { setUploadPreview(null); setUploadError(null); }}>{t('common.cancel')}</button>
              <button className="ps-conf-btn-primary" disabled={busy || !confirmLicensed} onClick={handleApplyUpload}>
                {busy ? t('modifierDictionarySection.submitting') : t('modifierDictionarySection.submit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingEntry && (
        <EntryModal entry={editingEntry} busy={busy} onSave={handleSaveEntry} onClose={() => setEditingEntry(null)} />
      )}
    </div>
  );
};

export default ModifierDictionarySection;
