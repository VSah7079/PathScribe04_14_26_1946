// src/pages/AccessionPage/ReportDeficiencyModal.tsx
// ─────────────────────────────────────────────────────────────
// Manual deficiency reporting — distinct from the auto-detected
// order-import dictionary mismatch. Not every real specimen issue gets
// auto-detected (container damage, insufficient volume, a labeling
// discrepancy noticed by the accessioner) — this is how an accessioner
// flags one of those by hand. Raised, not raised-and-resolved: the
// actual resolution happens later, from the dedicated Deficiencies
// work queue (src/pages/DeficienciesPage.tsx), independent of this
// case's own lifecycle — see that page's own header comment for why.
// ─────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import '../../pathscribe.css';
import type { DeficiencyType } from '@/services/deficiencies/IDeficiencyService';

interface Props {
  /** Which level this modal instance was opened for — filters
   *  deficiencyTypes down to only the ones actually meaningful in this
   *  context (a type's own `level` of 'case', 'specimen', or 'both').
   *  A type with no `level` set at all (predates this field, or an
   *  admin hasn't classified it yet) is treated as 'both' — shown
   *  either way, the same safe default IDeficiencyService.ts documents. */
  context: 'case' | 'specimen';
  specimenLabel?: string;
  deficiencyTypes: DeficiencyType[];
  existing?: { deficiencyTypeId: string; comment: string };
  onSave: (deficiencyTypeId: string, comment: string) => void;
  onRemove: () => void;
  onClose: () => void;
}

export const ReportDeficiencyModal: React.FC<Props> = ({ context, specimenLabel, deficiencyTypes, existing, onSave, onRemove, onClose }) => {
  // Always include the existing selection even if it wouldn't otherwise
  // match this context — an admin can reclassify a type's level after
  // the fact, and a previously-saved record referencing it shouldn't
  // silently disappear from its own edit dropdown.
  const applicableTypes = deficiencyTypes.filter(t =>
    !t.level || t.level === 'both' || t.level === context || t.id === existing?.deficiencyTypeId
  );
  const [deficiencyTypeId, setDeficiencyTypeId] = useState(existing?.deficiencyTypeId ?? applicableTypes[0]?.id ?? '');
  const [comment, setComment] = useState(existing?.comment ?? '');

  return (
    <div className="ps-ms-overlay">
      <div className="ps-ms-modal">
        <div className="ps-ms-header">
          ⚠ Report a Deficiency{specimenLabel ? ` — Specimen ${specimenLabel}` : ' — Whole Case'}
        </div>
        <div className="ps-ms-body">
          <p className="ps-fixgate-intro">
            This creates an open nonconformance record, tracked to resolution independently of this case —
            not something you're expected to resolve right now.
          </p>
          <div className="ps-conf-form-field">
            <label className="ps-conf-label" htmlFor="report-deficiency-type">Issue <span className="ps-conf-required">*</span></label>
            <select id="report-deficiency-type" className="ps-conf-select" value={deficiencyTypeId} onChange={e => setDeficiencyTypeId(e.target.value)}>
              {applicableTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="ps-conf-form-field">
            <label className="ps-conf-label">Detail</label>
            <textarea className="ps-conf-input ps-conf-textarea" value={comment} onChange={e => setComment(e.target.value)}
              placeholder="What's wrong, specifically?" />
          </div>
        </div>
        <div className="ps-ms-footer">
          {existing && <button className="ps-ms-btn-cancel" onClick={onRemove}>Remove</button>}
          <button className="ps-ms-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="ps-ms-btn-apply" onClick={() => onSave(deficiencyTypeId, comment)} disabled={!deficiencyTypeId}>
            {existing ? 'Update' : 'Report Deficiency'}
          </button>
        </div>
      </div>
    </div>
  );
};
