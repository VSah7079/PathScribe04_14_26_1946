// src/components/Config/System/RvuCodeMapSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real admin UI for the versioned CPT-to-work-RVU table
// (services/billing/). Built directly from a real product question -
// "is there a UI to update the table?" (no) and "these need to be
// versioned, correct?" (yes) - closing both gaps together.
//
// Deliberately easy to use, per direct request:
//   - The active version is front and center - what an admin cares
//     about 99% of the time.
//   - Older versions are collapsed behind a single toggle by default -
//     they're never deleted (see RvuTableVersion.ts for why), but
//     shouldn't clutter the common case.
//   - Upload flow matches this app's own established, real pattern
//     (SpecimenDictionarySection.tsx): download a real template first,
//     upload a real file, see a real preview before anything is
//     committed, then one click to save - and "activate immediately" is
//     checked by default, since an admin uploading a new CMS file
//     almost always wants it live right away, not sitting inactive
//     needing a second trip back to this screen.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import '../../../pathscribe.css';
import { mockRvuCodeMapService } from '@/services/billing/mockRvuCodeMapService';
import type { RvuTableVersion, CptWorkRvuEntry } from '@/services/billing/RvuTableVersion';
import { parseRvuUploadRows } from '@/services/billing/codeMapTable';
import { getSessionUser } from '@/services/auth/caseAccessControl';

const TEMPLATE_EXAMPLE_ROWS = [
  { Code: '88305', Description: 'Surgical pathology, gross and microscopic examination (Level IV)', WorkRVU: 0.73 },
  { Code: '88307', Description: 'Surgical pathology, gross and microscopic examination (Level V)',  WorkRVU: 1.55 },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

const RvuCodeMapSection: React.FC = () => {
  const [versions, setVersions]   = useState<RvuTableVersion[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showOlder, setShowOlder] = useState(false);
  const [busy, setBusy]           = useState(false);
  const [toast, setToast]         = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload preview state - nothing is committed until the admin
  // explicitly confirms, same "preview then apply" pattern this app
  // already uses for spreadsheet uploads elsewhere.
  const [uploadPreview, setUploadPreview] = useState<CptWorkRvuEntry[] | null>(null);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadLabel, setUploadLabel] = useState('');
  const [uploadEffectiveDate, setUploadEffectiveDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [activateOnSave, setActivateOnSave] = useState(true);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    mockRvuCodeMapService.getAllVersions().then(res => {
      if (res.ok) setVersions(res.data);
      setLoading(false);
    });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const activeVersion = versions.find(v => v.isActive) ?? null;
  const olderVersions = versions.filter(v => !v.isActive);

  const handleActivate = async (versionId: string) => {
    setBusy(true);
    const res = await mockRvuCodeMapService.activateVersion(versionId);
    setBusy(false);
    if (res.ok === false) {
      setToast(res.error);
    } else {
      setToast(`"${res.data.label}" is now the active version.`);
      refresh();
    }
  };

  // ── Spreadsheet upload ────────────────────────────────────────────────────

  const handleFileUpload = (file: File) => {
    setUploadError(null);
    const reader = new FileReader();
    reader.onload = evt => {
      const data = evt.target?.result;
      if (!data) return;
      try {
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        const { entries, problems, skippedNonPayable } = parseRvuUploadRows(rows);

        if (entries.length === 0 && problems.length === 0) {
          setUploadError('No real rows found in this file - check it has Code and WorkRVU columns.');
          return;
        }
        if (problems.length > 0) {
          setUploadError(problems.slice(0, 5).join(' '));
        }
        if (skippedNonPayable > 0) {
          setToast(`${entries.length} real, payable codes found — ${skippedNonPayable} non-payable/modifier rows skipped automatically.`);
        }
        setUploadPreview(entries);
        setUploadFileName(file.name);
        if (!uploadLabel) setUploadLabel(`Upload — ${file.name.replace(/\.(xlsx|csv)$/i, '')}`);
      } catch {
        setUploadError('Could not read this file - make sure it\'s a real .xlsx or .csv spreadsheet.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleApplyUpload = async () => {
    if (!uploadPreview || uploadPreview.length === 0) return;
    setBusy(true);
    const user = getSessionUser();
    const res = await mockRvuCodeMapService.createVersion({
      label: uploadLabel.trim() || uploadFileName,
      effectiveDate: new Date(uploadEffectiveDate).toISOString(),
      entries: uploadPreview,
      uploadedBy: user?.id ?? 'admin',
      sourceFileName: uploadFileName,
    });

    if (res.ok === false) {
      setBusy(false);
      setUploadError(res.error);
      return;
    }

    if (activateOnSave) {
      await mockRvuCodeMapService.activateVersion(res.data.id);
    }
    setBusy(false);
    setToast(`"${res.data.label}" saved${activateOnSave ? ' and activated' : ''}.`);
    setUploadPreview(null);
    setUploadFileName('');
    setUploadLabel('');
    refresh();
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet(TEMPLATE_EXAMPLE_ROWS);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'RVU Codes');
    XLSX.writeFile(wb, 'RvuCodeMapTemplate.xlsx');
  };

  if (loading) return <div className="ps-conf-section-subtitle">Loading…</div>;

  return (
    <div>
      <div className="ps-conf-section-header">
        <div>
          <h3 className="ps-conf-section-title">RVU Code Map</h3>
          <p className="ps-conf-section-subtitle">
            CPT-to-work-RVU values used for real workload/productivity tracking (not a billing
            system — no claims, modifiers, or payer rules). Every update becomes a new, dated
            version — older versions are kept, never edited, so past cases keep the real rates
            that were in effect when they were finalized.
          </p>
        </div>
        <div className="ps-specdict-header-actions">
          <button className="ps-conf-btn-secondary" onClick={handleDownloadTemplate}>Download Template</button>
          <button className="ps-conf-btn-secondary" onClick={() => fileInputRef.current?.click()}>Upload Spreadsheet</button>
          <input ref={fileInputRef} type="file" hidden accept=".csv,.xlsx"
            onChange={e => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]); e.target.value = ''; }} />
        </div>
      </div>

      {toast && <div className="ps-conf-section-subtitle" style={{ color: '#10b981', fontWeight: 600 }}>{toast}</div>}

      {/* ── Active version — front and center ── */}
      {activeVersion ? (
        <div style={{ margin: '16px 0', padding: '16px', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Active version</span>
              <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '2px' }}>{activeVersion.label}</div>
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>Effective {formatDate(activeVersion.effectiveDate)}</div>
          </div>
          <div className="ps-conf-table-wrap" style={{ marginTop: '12px' }}>
            <table className="ps-conf-table">
              <thead><tr><th className="ps-conf-th">Code</th><th className="ps-conf-th">Description</th><th className="ps-conf-th">Work RVU</th></tr></thead>
              <tbody>
                {activeVersion.entries.map(e => (
                  <tr key={e.code}>
                    <td className="ps-conf-td">{e.code}</td>
                    <td className="ps-conf-td">{e.description}</td>
                    <td className="ps-conf-td">{e.workRvu}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="ps-conf-section-subtitle" style={{ margin: '16px 0' }}>No active version yet — upload a spreadsheet below to get started.</div>
      )}

      {/* ── Older versions — collapsed by default, never deleted ── */}
      {olderVersions.length > 0 && (
        <div style={{ marginTop: '8px' }}>
          <button className="ps-conf-btn-row" onClick={() => setShowOlder(s => !s)}>
            {showOlder ? '▾' : '▸'} Older versions ({olderVersions.length})
          </button>
          {showOlder && (
            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {olderVersions
                .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))
                .map(v => (
                <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{v.label}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                      Effective {formatDate(v.effectiveDate)} · {v.entries.length} codes
                      {v.sourceFileName && <> · from {v.sourceFileName}</>}
                    </div>
                  </div>
                  <button className="ps-conf-btn-row" disabled={busy} onClick={() => handleActivate(v.id)}>Activate</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Upload preview panel ── */}
      {uploadPreview && (
        <div style={{ marginTop: '20px', padding: '16px', borderRadius: '10px', border: '1px solid rgba(56,189,248,0.3)', background: 'rgba(56,189,248,0.06)' }}>
          <div style={{ fontWeight: 700, marginBottom: '10px' }}>Review before saving</div>

          {uploadError && <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '10px' }}>{uploadError}</div>}

          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', flexDirection: 'column', fontSize: '12px', gap: '4px' }}>
              Version label
              <input value={uploadLabel} onChange={e => setUploadLabel(e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', fontSize: '12px', gap: '4px' }}>
              Effective date
              <input type="date" value={uploadEffectiveDate} onChange={e => setUploadEffectiveDate(e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px' }} />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', marginTop: '18px' }}>
              <input type="checkbox" checked={activateOnSave} onChange={e => setActivateOnSave(e.target.checked)} />
              Activate immediately
            </label>
          </div>

          <div className="ps-conf-table-wrap" style={{ maxHeight: '240px', overflowY: 'auto' }}>
            <table className="ps-conf-table">
              <thead><tr><th className="ps-conf-th">Code</th><th className="ps-conf-th">Description</th><th className="ps-conf-th">Work RVU</th></tr></thead>
              <tbody>
                {uploadPreview.map((e, i) => (
                  <tr key={`${e.code}-${i}`}>
                    <td className="ps-conf-td">{e.code}</td>
                    <td className="ps-conf-td">{e.description}</td>
                    <td className="ps-conf-td">{e.workRvu}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button className="ps-conf-btn-primary" disabled={busy || uploadPreview.length === 0} onClick={handleApplyUpload}>
              {busy ? 'Saving…' : `Save Version (${uploadPreview.length} codes)`}
            </button>
            <button className="ps-conf-btn-row" onClick={() => { setUploadPreview(null); setUploadError(null); }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RvuCodeMapSection;
