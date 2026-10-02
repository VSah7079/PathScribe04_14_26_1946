// src/pages/MolecularBatchPage/MolecularRackWorklistPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct follow-up: "Implement the load into extraction
// rack workflow step (§5.1's secondary_rack stage)." Matches this
// app's own established worklist/detail split
// (MolecularWorkcenterPage.tsx/MolecularPlateBuilderPage.tsx).
//
// Batch 406: services come from @/services (off the deployment baseline); the
// rows (services/molecular/rackWorklist.ts) show where each rack stands:
// loading, needing sample IDs, or on an instrument (and slot). Dates follow
// the user's language.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import '../../pathscribe.css';
import { molecularExtractionRackService, rackWorklistRows, type RackWorklistRow } from '@/services';
import { formatDateTime } from '@/utils/formatDate';

const MolecularRackWorklistPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [rows, setRows] = useState<RackWorklistRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    molecularExtractionRackService.getAll().then(res => {
      if (res.ok) setRows(rackWorklistRows(res.data));
      setLoading(false);
    });
  }, []);

  const status = (r: RackWorklistRow) =>
    r.status === 'placed'
      ? (r.deckSlotId
        ? t('molecularRackWorklistPage.statusPlacedSlot', { instrument: r.instrumentCode, slot: r.deckSlotId })
        : t('molecularRackWorklistPage.statusPlaced', { instrument: r.instrumentCode }))
      : t(`molecularRackWorklistPage.status.${r.status}`);

  return (
    <div className="ps-app-root ps-page-container ps-page-container--medium">
      <div className="ps-page-header-row">
        <div>
          <h1 className="ps-page-title">{t('molecularRackWorklistPage.title')}</h1>
          <p className="ps-page-subtitle">
            {t('molecularRackWorklistPage.subtitle')}
          </p>
        </div>
        <button className="ps-conf-btn-secondary" onClick={() => navigate('/molecular-rack/new')}>{t('molecularRackWorklistPage.newRack')}</button>
      </div>

      <div className="ps-conf-table-wrap">
        <div className="ps-conf-table-scroll">
          <table className="ps-conf-table">
            <thead className="ps-conf-thead-sticky">
              <tr>
                <th className="ps-conf-th">{t('molecularRackWorklistPage.colRack')}</th>
                <th className="ps-conf-th">{t('molecularRackWorklistPage.colCapacity')}</th>
                <th className="ps-conf-th">{t('molecularRackWorklistPage.colOccupied')}</th>
                <th className="ps-conf-th">{t('molecularRackWorklistPage.colStatus')}</th>
                <th className="ps-conf-th">{t('molecularRackWorklistPage.colCreated')}</th>
              </tr>
            </thead>
            <tbody>
              {loading && (<tr><td className="ps-conf-empty-row" colSpan={5}>{t('molecularRackWorklistPage.loading')}</td></tr>)}
              {!loading && rows.length === 0 && (<tr><td className="ps-conf-empty-row" colSpan={5}>{t('molecularRackWorklistPage.empty')}</td></tr>)}
              {!loading && rows.map(r => (
                <tr key={r.id} className="ps-conf-tr ps-conf-tr--clickable" onClick={() => navigate(`/molecular-rack/${r.id}`)}>
                  <td className="ps-conf-td">{r.rackBarcode}</td>
                  <td className="ps-conf-td">{r.capacity}</td>
                  <td className="ps-conf-td">{t('molecularRackWorklistPage.occupiedOf', { occupied: r.occupied, capacity: r.capacity })}</td>
                  <td className={`ps-conf-td ps-rack-status ps-rack-status--${r.status}`}>{status(r)}</td>
                  <td className="ps-conf-td">{formatDateTime(r.createdAt, i18n.language)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MolecularRackWorklistPage;
