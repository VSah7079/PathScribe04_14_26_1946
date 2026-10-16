// src/pages/MyExportsPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 550 (PS-539 phase 2d, D7; ASYNC_EXPORT_API.md §5 and §7): "My exports".
// The signed-in user's exports from the API server, newest first: status,
// rows, when asked for and when the file is deleted, with Download for a
// ready one and Cancel for one still being prepared. Reached from an export
// notice and the top bar. Only the user's own exports are listed (the server
// answers for the requester only), and each download checks the export's
// capability again. In the demo exports download at once, so there is
// nothing to list.
//
// Renders and dispatches: hooks/useMyExports.ts.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useMyExports } from '@/hooks/useMyExports';
import { LoadingState } from '@/components/Common/LoadingState';
import { formatDateTime } from '@/utils/formatDate';
import { exportProblemKey, type ExportTracker } from '@/services/exports/exportTracker';

const K = 'myExports';

const MyExportsPage: React.FC<{ tracker?: ExportTracker }> = ({ tracker }) => {
  const { t, i18n } = useTranslation();
  const { viaServer, jobs, problem, actionProblem, reload, download, cancel } = useMyExports(tracker);

  return (
    <div className="ps-regx-page">
      <header className="ps-page-header-row">
        <div>
          <h1 className="ps-page-title">{t(`${K}.title`)}</h1>
          <p className="ps-page-subtitle">{t(`${K}.subtitle`)}</p>
        </div>
        {viaServer && (
          <div className="ps-regx-header-actions">
            <button type="button" className="ps-btn-ghost-dark" onClick={() => { void reload(); }}>{t(`${K}.refresh`)}</button>
          </div>
        )}
      </header>

      {!viaServer && <p className="ps-myexports-note">{t(`${K}.demoNote`)}</p>}
      {viaServer && problem && <p className="ps-myexports-note" role="alert">{t(exportProblemKey(problem))}</p>}

      {viaServer && jobs === null && <LoadingState variant="inline" className="ps-regx-empty" label={t(`${K}.loading`)} />}
      {viaServer && jobs !== null && jobs.length === 0 && !problem && <p className="ps-myexports-note">{t(`${K}.empty`)}</p>}

      {viaServer && jobs !== null && jobs.length > 0 && (
        <div className="ps-table-wrap">
          <table className="ps-table">
            <thead>
              <tr>
                <th>{t(`${K}.columns.title`)}</th>
                <th>{t(`${K}.columns.status`)}</th>
                <th>{t(`${K}.columns.rows`)}</th>
                <th>{t(`${K}.columns.requested`)}</th>
                <th>{t(`${K}.columns.expires`)}</th>
                <th><span className="ps-sr-only">{t(`${K}.columns.actions`)}</span></th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => (
                <tr key={job.exportId}>
                  <td><span className="ps-myexports-title" data-phi="accession">{job.title}</span></td>
                  <td>
                    <span className={`ps-myexports-status ps-myexports-status--${job.status}`}>{t(`${K}.status.${job.status}`)}</span>
                    {job.status === 'failed' && job.error && <span className="ps-myexports-problem">{t(exportProblemKey(job.error.code))}</span>}
                    {actionProblem?.exportId === job.exportId && <span className="ps-myexports-problem" role="alert">{t(exportProblemKey(actionProblem.problem))}</span>}
                  </td>
                  <td>{job.rowCount !== undefined ? job.rowCount.toLocaleString(i18n.language) : ''}</td>
                  <td>{formatDateTime(job.requestedAt, i18n.language)}</td>
                  <td>{job.expiresAt ? formatDateTime(job.expiresAt, i18n.language) : ''}</td>
                  <td>
                    <span className="ps-myexports-actions">
                      {job.status === 'ready' && (
                        <button type="button" className="ps-conf-btn-primary" onClick={() => { void download(job.exportId); }}>{t(`${K}.download`)}</button>
                      )}
                      {(job.status === 'queued' || job.status === 'running') && (
                        <button type="button" className="ps-conf-btn-secondary" onClick={() => { void cancel(job.exportId); }}>{t(`${K}.cancel`)}</button>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MyExportsPage;
