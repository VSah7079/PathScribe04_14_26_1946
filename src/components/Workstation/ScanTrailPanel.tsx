// src/components/Workstation/ScanTrailPanel.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 729 (Lab Workflow & Batch spec §7.4): the Case History scan trail at a
// station: every station scan of the case's cassettes, blocks and slides, newest
// first, with who, where and when, the carrier and the outcome. Shown on the
// Grossing, Embedding, Microtome and Slide Distribution screens for the case at
// the bench. Closed until opened, so it costs nothing on a busy bench. Only for
// people with station:scan-history:view (the service checks it too). A scan made
// for every item in a carrier (the carrier was scanned) is marked as such.
// Presentation only: hooks/useScanTrail.ts loads it.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useCapabilities } from '@/hooks/useCapabilities';
import { useScanTrail } from '@/hooks/useScanTrail';
import { LoadingState } from '@/components/Common/LoadingState';
import { formatDateTime } from '@/utils/formatDate';
import './ScanTrailPanel.css';

interface Props {
  caseAccession: string | undefined;
  /** Only this item's scans; the whole case when absent. */
  itemId?: string;
}

const ScanTrailPanel: React.FC<Props> = ({ caseAccession, itemId }) => {
  const { t, i18n } = useTranslation();
  const { has } = useCapabilities();
  const trail = useScanTrail(caseAccession, itemId);
  if (!caseAccession || !has('station:scan-history:view')) return null;

  return (
    <section className="ps-scan-trail" aria-label={t('scanTrail.title')}>
      <button type="button" className="ps-scan-trail-toggle" aria-expanded={trail.open} onClick={trail.toggle}>
        {trail.open ? t('scanTrail.hide') : t('scanTrail.show')}
      </button>
      {trail.open && (
        <div className="ps-scan-trail-body">
          {trail.loading && <LoadingState variant="inline" className="ps-scan-trail-note" label={t('scanTrail.loading')} />}
          {trail.refused && <p className="ps-scan-trail-note" role="alert">{t('scanTrail.refused')}</p>}
          {!trail.loading && !trail.refused && trail.events.length === 0 && <p className="ps-scan-trail-note">{t('scanTrail.empty')}</p>}
          {trail.events.length > 0 && (
            <table className="ps-scan-trail-table">
              <thead>
                <tr>
                  <th scope="col">{t('scanTrail.cols.when')}</th>
                  <th scope="col">{t('scanTrail.cols.item')}</th>
                  <th scope="col">{t('scanTrail.cols.where')}</th>
                  <th scope="col">{t('scanTrail.cols.who')}</th>
                  <th scope="col">{t('scanTrail.cols.what')}</th>
                </tr>
              </thead>
              <tbody>
                {trail.events.map(e => (
                  <tr key={e.id} className={e.result === 'ok' ? undefined : 'ps-scan-trail-row--flag'}>
                    <td>{formatDateTime(e.at, i18n.language)}</td>
                    <td data-phi="accession">
                      {e.itemId}
                      {e.parentItemId && <span className="ps-scan-trail-sub">{t('scanTrail.cameFrom', { parent: e.parentItemId })}</span>}
                    </td>
                    <td>
                      {e.stationName}
                      {e.node && <span className="ps-scan-trail-sub">{t(`batchManagement.nodes.${e.node}`)}</span>}
                    </td>
                    <td>{e.userName}</td>
                    <td>
                      {t(`scanTrail.actions.${e.action}`)}
                      {e.result !== 'ok' && <span className="ps-scan-trail-sub">{t(`scanTrail.results.${e.result}`)}</span>}
                      {e.carrierId && <span className="ps-scan-trail-sub">{t('scanTrail.inCarrier', { carrier: e.carrierId })}</span>}
                      {e.inferredFromCarrier && <span className="ps-scan-trail-sub">{t('scanTrail.byCarrier')}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </section>
  );
};

export default ScanTrailPanel;
