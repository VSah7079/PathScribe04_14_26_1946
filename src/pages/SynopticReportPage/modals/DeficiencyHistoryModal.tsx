// src/pages/SynopticReportPage/modals/DeficiencyHistoryModal.tsx
// ─────────────────────────────────────────────────────────────
// Read-only view of a case's specimen deficiency history — raised and
// resolved records only, no new deficiencies get created from here.
// Closes a real gap: getByCaseId() already existed on
// ISpecimenDeficiencyService with zero UI ever calling it — both
// Accession and this page only ever wrote deficiency records, never
// read them back. The Config admin log was the only place to see one,
// disconnected from the case itself.
// ─────────────────────────────────────────────────────────────

import React from 'react';
import '../../../pathscribe.css';
import type { SpecimenDeficiency, DeficiencyType, ResolutionType } from '../../../services/deficiencies/IDeficiencyService';

interface Props {
  deficiencies: SpecimenDeficiency[];
  deficiencyTypes: DeficiencyType[];
  resolutionTypes: ResolutionType[];
  onClose: () => void;
}

const formatTimestamp = (iso?: string) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); }
  catch { return iso; }
};

export const DeficiencyHistoryModal: React.FC<Props> = ({ deficiencies, deficiencyTypes, resolutionTypes, onClose }) => {
  const typeName = (id: string) => deficiencyTypes.find(t => t.id === id)?.name ?? id;
  const resolutionName = (id?: string) => id ? (resolutionTypes.find(t => t.id === id)?.name ?? id) : '—';

  const sorted = [...deficiencies].sort((a, b) => b.raisedAt.localeCompare(a.raisedAt));

  return (
    <div className="ps-ms-overlay">
      <div className="ps-ms-modal ps-ms-modal--wide">
        <div className="ps-ms-header">⚠ Deficiency History</div>
        <div className="ps-ms-body">
          <p className="ps-fixgate-intro">
            {deficiencies.length} deficienc{deficiencies.length === 1 ? 'y' : 'ies'} recorded for this case —
            raised and resolved, read-only.
          </p>
          {sorted.length === 0 && (
            <div className="ps-cmnt-thread-empty">No deficiencies recorded for this case.</div>
          )}
          {sorted.map(d => (
            <div key={d.id} className="ps-defichist-item">
              <div className="ps-defichist-header">
                <strong className="ps-defichist-specimen">{d.specimenLabel ? `Specimen ${d.specimenLabel}` : 'Case-level'}</strong>
                <span className={`ps-defichist-status ps-defichist-status--${d.status}`}>
                  {d.status === 'closed' ? '✓ Closed' : d.status === 'pending-verification' ? '⏳ Pending Verification' : '⏳ Open'}
                </span>
              </div>
              <div className="ps-defichist-row">
                <span className="ps-defichist-label">Issue:</span> {typeName(d.deficiencyTypeId)}
              </div>
              {d.comment && (
                <div className="ps-defichist-row ps-defichist-comment">{d.comment}</div>
              )}
              <div className="ps-defichist-row">
                <span className="ps-defichist-label">Raised by</span> {d.raisedBy === 'system' ? 'System (auto-detected)' : d.raisedBy} · {formatTimestamp(d.raisedAt)}
              </div>
              {(d.status === 'pending-verification' || d.status === 'closed') && (
                <div className="ps-defichist-row">
                  <span className="ps-defichist-label">Corrective action:</span> {d.correctiveAction || resolutionName(d.resolutionTypeId)} — by {d.resolvedBy} · {formatTimestamp(d.resolvedAt)}
                  {d.resolutionComment && <div className="ps-defichist-comment">{d.resolutionComment}</div>}
                  {d.preventiveAction && <div className="ps-defichist-comment">Preventive action: {d.preventiveAction}</div>}
                </div>
              )}
              {d.status === 'closed' && d.verifiedBy && (
                <div className="ps-defichist-row">
                  <span className="ps-defichist-label">Verified effective:</span> by {d.verifiedBy} · {formatTimestamp(d.verifiedAt)}
                  {d.verificationComment && <div className="ps-defichist-comment">{d.verificationComment}</div>}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="ps-ms-footer">
          <button className="ps-ms-btn-cancel" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};
