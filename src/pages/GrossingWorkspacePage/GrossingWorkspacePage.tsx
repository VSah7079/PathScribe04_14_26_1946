// src/pages/GrossingWorkspacePage/GrossingWorkspacePage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 720 (Pete): Grossing is its own tile under Pathology Workspace, for the
// pathology assistant and the grossing pathologist. This is the page behind it:
// the cases waiting to be grossed, and a box to open one by its accession
// number. Opening a case goes to the Grossing screen (/case/:ref/grossing),
// which keeps its own case-access checks; nothing here decides who may see a
// case. No patient name is listed, only the accession, specimens and priority.
// The report's Material tab still opens the same screen for a case in hand.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import '../../pathscribe.css';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { LoadingState } from '@/components/Common/LoadingState';
import { useOpenCase } from '@/hooks/useOpenCase';
import { caseService } from '@/services';
import type { Case } from '@/types/case/Case';
import { waitingToGross, findByAccession } from './grossingQueue';

export default function GrossingWorkspacePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const openCase = useOpenCase();
  const { pushCrumb } = useBreadcrumb();
  const [cases, setCases] = useState<Case[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [entry, setEntry] = useState('');
  const [notFound, setNotFound] = useState(false);

  useEffect(() => { pushCrumb(t('grossingWorkspace.pageTitle'), '/workstations/grossing'); }, [pushCrumb, t]);

  const load = useCallback(async () => {
    setFailed(false);
    const res = await caseService.getAll();
    if (res.ok) setCases(res.data); else { setCases([]); setFailed(true); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const queue = waitingToGross(cases ?? []);

  const openByAccession = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = findByAccession(cases ?? [], entry);
    setNotFound(!found);
    if (found) await openCase(found.id, 'grossing');
  };

  return (
    <div className="ps-page ps-page--loaded">
      <div className="ps-page-bg" />
      <div className="ps-page-gradient" />
      <div className="ps-page-content">
        <main className="ps-home-main">
          <header className="ps-home-header ps-home-header--split">
            <div>
              <h1 className="ps-home-title">{t('grossingWorkspace.pageTitle')}</h1>
              <p className="ps-home-card-desc ps-mt-4">{t('grossingWorkspace.pageSubtitle')}</p>
            </div>
            <button className="ps-btn-ghost-dark" onClick={() => navigate('/pathology-workspace')}>
              {t('grossingWorkspace.backToWorkspace')}
            </button>
          </header>

          <form onSubmit={openByAccession} className="ps-mb-16">
            <label htmlFor="grossing-accession" className="ps-home-card-desc">{t('grossingWorkspace.openLabel')}</label>
            <div className="ps-mt-4">
              <input
                id="grossing-accession"
                className="ps-input-dark"
                value={entry}
                onChange={e => { setEntry(e.target.value); setNotFound(false); }}
                placeholder={t('grossingWorkspace.openPlaceholder')}
                autoComplete="off"
                data-phi="accession"
              />
              {' '}
              <button type="submit" className="ps-conf-btn-primary" disabled={!entry.trim()}>{t('grossingWorkspace.openButton')}</button>
            </div>
            {notFound && <p role="alert" className="ps-home-card-desc ps-mt-4">{t('grossingWorkspace.notFound')}</p>}
          </form>

          <h2 className="ps-home-card-title">{t('grossingWorkspace.waitingTitle', { count: queue.length })}</h2>
          {cases === null && <LoadingState label={t('grossingWorkspace.loading')} />}
          {failed && <p role="alert" className="ps-home-card-desc">{t('grossingWorkspace.loadFailed')}</p>}
          {cases !== null && !failed && queue.length === 0 && <p className="ps-home-card-desc">{t('grossingWorkspace.empty')}</p>}
          {queue.length > 0 && (
            <div className="ps-table-wrap">
              <table className="ps-table">
                <thead>
                  <tr>
                    <th>{t('grossingWorkspace.col.case')}</th>
                    <th>{t('grossingWorkspace.col.specimens')}</th>
                    <th>{t('grossingWorkspace.col.priority')}</th>
                    <th>{t('grossingWorkspace.col.accessioned')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {queue.map(row => (
                    <tr key={row.id}>
                      <td data-phi="accession">{row.accession}</td>
                      <td>{row.specimenCount}</td>
                      <td>{t(`grossingWorkspace.priority.${row.priority}`)}</td>
                      <td>{row.accessionedAt ? new Date(row.accessionedAt).toLocaleString() : ''}</td>
                      <td>
                        <button className="ps-conf-btn-primary" onClick={() => void openCase(row.id, 'grossing')}>
                          {t('grossingWorkspace.gross')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
