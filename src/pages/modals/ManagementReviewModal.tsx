// src/pages/modals/ManagementReviewModal.tsx
// ─────────────────────────────────────────────────────────────
// The real ISO 15189 Management Review activity — a periodic,
// top-level look at a batch of closed deficiencies for patterns, not a
// per-item sign-off. Everything closed-but-unreviewed is in scope by
// default; a reviewer can deselect anything genuinely out of scope
// before submitting. One findings field for the whole batch is the
// actual point of doing this as a review, not a checklist.
// ─────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import '../../pathscribe.css';
import type { SpecimenDeficiency, DeficiencyType } from '@/services/deficiencies/IDeficiencyService';

interface Props {
  unreviewedClosed: SpecimenDeficiency[];
  deficiencyTypes: DeficiencyType[];
  onSubmit: (deficiencyIds: string[], findings: string) => void;
  onClose: () => void;
}

export const ManagementReviewModal: React.FC<Props> = ({ unreviewedClosed, deficiencyTypes, onSubmit, onClose }) => {
  const [selected, setSelected] = useState<Set<string>>(new Set(unreviewedClosed.map(d => d.id)));
  const [findings, setFindings] = useState('');

  const typeName = (id: string) => deficiencyTypes.find(t => t.id === id)?.name ?? id;
  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  return (
    <div className="ps-ms-overlay">
      <div className="ps-ms-modal ps-ms-modal--wide">
        <div className="ps-ms-header">Management Review</div>
        <div className="ps-ms-body">
          <p className="ps-fixgate-intro">
            {unreviewedClosed.length} closed deficienc{unreviewedClosed.length === 1 ? 'y' : 'ies'} not yet
            covered by a review — all included by default, deselect anything genuinely out of scope for this
            session.
          </p>

          <div className="ps-mrev-list">
            {unreviewedClosed.map(d => (
              <label key={d.id} className="ps-mrev-item">
                <input type="checkbox" checked={selected.has(d.id)} onChange={() => toggle(d.id)} />
                <div className="ps-mrev-item-text">
                  <strong>{d.caseId}</strong> — {d.specimenLabel ? `Specimen ${d.specimenLabel}` : 'Case-level'} — {typeName(d.deficiencyTypeId)}
                  {!!d.reopenCount && <span className="ps-defic-reopen-badge">↺ {d.reopenCount}</span>}
                </div>
              </label>
            ))}
            {unreviewedClosed.length === 0 && (
              <div className="ps-cmnt-thread-empty">Nothing closed since the last review.</div>
            )}
          </div>

          <div className="ps-conf-form-field">
            <label className="ps-conf-label">Findings <span className="ps-conf-required">*</span></label>
            <textarea className="ps-conf-input ps-conf-textarea" value={findings} onChange={e => setFindings(e.target.value)}
              placeholder="Patterns across this batch — recurring types, systemic causes, anything worth escalating. Not a per-item summary." />
          </div>
        </div>
        <div className="ps-ms-footer">
          <button className="ps-ms-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="ps-ms-btn-apply" onClick={() => onSubmit([...selected], findings.trim())}
            disabled={selected.size === 0 || !findings.trim()}>
            Complete Review ({selected.size})
          </button>
        </div>
      </div>
    </div>
  );
};
