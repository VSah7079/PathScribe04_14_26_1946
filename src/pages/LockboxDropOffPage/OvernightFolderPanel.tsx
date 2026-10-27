// src/pages/LockboxDropOffPage/OvernightFolderPanel.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 645: the Overnight folder: receipts not yet accessioned, urgent first then oldest first, with waiting time, state, the
// matched accession number or placeholder id, and who received it. Per row: Mark accessioned, Link to order (a placeholder),
// and a link to the Accession screen. Each action adds an entry; nothing is edited. The QA summary is time to receipt.
// Rendering only: ordering, waiting time and the figures come from services/lockbox.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { dwellLabel, accessionLinkForReceipt } from '@/services';
import type { LockboxFolder, LockboxTimeSummary } from '@/services';
import { formatDateTime } from '@/utils/formatDate';
import { lockboxErrorKey } from './lockboxMessages';

interface Props {
  folder: LockboxFolder | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onMarkAccessioned: (receiptId: string) => Promise<boolean>;
  onResolve: (receiptId: string, accessionNumber: string) => Promise<boolean>;
}

const Summary: React.FC<{ s: LockboxTimeSummary }> = ({ s }) => {
  const { t } = useTranslation();
  const mins = (m: number | null) => { if (m === null) return t('lockboxDropOff.folder.summary.none'); const d = dwellLabel(m); return t(`lockboxDropOff.folder.dwell.${d.key}`, d.values); };
  const rows: [string, string | number][] = [
    ['accessioned', s.accessionedCount], ['median', mins(s.medianMinutes)], ['mean', mins(s.meanMinutes)], ['longest', mins(s.maxMinutes)],
    ['urgentMedian', mins(s.urgentMedianMinutes)], ['waiting', s.waitingCount], ['oldestWaiting', mins(s.oldestWaitingMinutes)],
  ];
  return (
    <section className="ps-lbx-summary" aria-labelledby="ps-lbx-summary-title">
      <h2 id="ps-lbx-summary-title" className="ps-lbx-section-title">{t('lockboxDropOff.folder.summary.title')}</h2>
      <p className="ps-lbx-note">{t('lockboxDropOff.folder.summary.note')}</p>
      <dl className="ps-lbx-facts ps-lbx-facts--grid">
        {rows.map(([k, v]) => <div key={k}><dt>{t(`lockboxDropOff.folder.summary.${k}`)}</dt><dd>{v}</dd></div>)}
      </dl>
    </section>
  );
};

export const OvernightFolderPanel: React.FC<Props> = ({ folder, loading, error, onRefresh, onMarkAccessioned, onResolve }) => {
  const { t, i18n } = useTranslation();
  const [resolving, setResolving] = useState<string | null>(null);
  const [number, setNumber] = useState('');
  const dwell = (m: number) => { const d = dwellLabel(m); return t(`lockboxDropOff.folder.dwell.${d.key}`, d.values); };
  const closeResolve = () => { setResolving(null); setNumber(''); };
  const link = async (receiptId: string) => { if (await onResolve(receiptId, number)) closeResolve(); };

  return (
    <div className="ps-lbx-panel" onKeyDown={e => { if (e.key === 'Escape') closeResolve(); }}>
      <div className="ps-lbx-actions">
        <h2 className="ps-lbx-section-title">{t('lockboxDropOff.folder.title')}</h2>
        <button type="button" className="ps-lbx-secondary" onClick={onRefresh} disabled={loading}>{t('lockboxDropOff.folder.refresh')}</button>
      </div>
      {error && <p className="ps-lbx-error" role="alert">{t(lockboxErrorKey(error))}</p>}
      {folder && <Summary s={folder.summary} />}
      {folder && folder.entries.length === 0 && <p className="ps-lbx-note">{t('lockboxDropOff.folder.empty')}</p>}
      {folder && folder.entries.length > 0 && (
        <table className="ps-lbx-table">
          <thead>
            <tr>
              {['priority', 'reference', 'state', 'facility', 'dwell', 'receivedAt', 'receivedBy', 'actions'].map(c => <th key={c} scope="col">{t(`lockboxDropOff.folder.columns.${c}`)}</th>)}
            </tr>
          </thead>
          <tbody>
            {folder.entries.map(e => {
              const r = e.receipt;
              const ref = e.linkedAccessionNumber ?? r.accessionNumber ?? r.placeholderId;
              return (
                <React.Fragment key={r.id}>
                  <tr className={r.urgent ? 'ps-lbx-row--urgent' : undefined}>
                    <td>{r.urgent && <span className="ps-lbx-badge ps-lbx-badge--urgent">{t('lockboxDropOff.folder.urgent')}</span>}</td>
                    <td className="ps-lbx-ref" data-phi="true">{ref}</td>
                    <td>{t(`lockboxDropOff.folder.status.${e.status}`)}</td>
                    <td>{r.facilityName ?? r.clientFreeText ?? t('lockboxDropOff.received.noFacility')}</td>
                    <td>{dwell(e.dwellMinutes)}</td>
                    <td>{formatDateTime(r.receivedAt, i18n.language)}</td>
                    <td>{r.receivedBy.userName}</td>
                    <td className="ps-lbx-row-actions">
                      {e.status === 'placeholderOpen' ? (
                        <CapabilityButton capability="lockbox:placeholder:resolve" className="ps-lbx-secondary" onClick={() => { setResolving(r.id); setNumber(''); }}>{t('lockboxDropOff.folder.resolve')}</CapabilityButton>
                      ) : (
                        <>
                          <CapabilityButton capability="lockbox:folder:review" className="ps-lbx-primary" onClick={() => void onMarkAccessioned(r.id)}>{t('lockboxDropOff.folder.markAccessioned')}</CapabilityButton>
                          <Link className="ps-lbx-link" to={accessionLinkForReceipt(r)}>{t('lockboxDropOff.folder.openAccession')}</Link>
                        </>
                      )}
                    </td>
                  </tr>
                  {resolving === r.id && (
                    <tr>
                      <td colSpan={8}>
                        <form className="ps-lbx-resolve" onSubmit={ev => { ev.preventDefault(); void link(r.id); }}>
                          <label className="ps-lbx-field ps-lbx-field--inline">
                            <span>{t('lockboxDropOff.folder.resolveLabel')}</span>
                            <input type="text" autoFocus autoComplete="off" value={number} maxLength={64} onChange={ev => setNumber(ev.target.value)} data-phi="true" />
                          </label>
                          <button type="submit" className="ps-lbx-primary" disabled={!number.trim()}>{t('lockboxDropOff.folder.resolveSave')}</button>
                          <button type="button" className="ps-lbx-secondary" onClick={closeResolve}>{t('lockboxDropOff.folder.resolveCancel')}</button>
                        </form>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};
