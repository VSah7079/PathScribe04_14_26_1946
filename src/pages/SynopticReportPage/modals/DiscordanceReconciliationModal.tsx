// src/pages/SynopticReportPage/modals/DiscordanceReconciliationModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Fires at sign-out only when this case has a merged intraop specimen
// with a real frozen category set (not 'deferred' — no real frozen call
// was made, so there's nothing to reconcile against). Concordant is one
// click, nothing else to fill in. Discordant asks for Delta, Severity,
// and Root Cause — the pathologist's own judgment, not something this
// modal infers or auto-grades.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import '../../../pathscribe.css';
import { discordanceService } from '@/services';
import type { FrozenCategory } from '@/types/intraop/IntraoperativeEntry';
import type { DiscordanceDelta, DiscordanceSeverity, DiscordanceRootCause } from '@/types/quality/DiscordanceRecord';

const CATEGORY_LABEL: Record<FrozenCategory, string> = {
  benign: 'Benign', malignant: 'Malignant', atypical_suspicious: 'Atypical / Suspicious', deferred: 'Deferred',
};

interface Props {
  caseId: string;
  specimenId: string;
  caseType: string;
  frozenCategory: FrozenCategory;
  frozenDx: string;
  performedBy: { userId: string; userName: string };
  onDone: () => void;
}

export const DiscordanceReconciliationModal: React.FC<Props> = ({ caseId, specimenId, caseType, frozenCategory, frozenDx, performedBy, onDone }) => {
  const [finalCategory, setFinalCategory] = useState<FrozenCategory | ''>('');
  const [finalDx, setFinalDx] = useState('');
  const [showDiscordantForm, setShowDiscordantForm] = useState(false);
  const [delta, setDelta] = useState<DiscordanceDelta | ''>('');
  const [severity, setSeverity] = useState<DiscordanceSeverity | ''>('');
  const [rootCause, setRootCause] = useState<DiscordanceRootCause | ''>('');
  const [rootCauseNote, setRootCauseNote] = useState('');
  const [busy, setBusy] = useState(false);

  const canConfirmConcordant = finalDx.trim() && finalCategory;
  const canSubmitDiscordant = canConfirmConcordant && delta && severity && rootCause && (rootCause !== 'other' || rootCauseNote.trim());

  const confirmConcordant = () => {
    // Concordant isn't a discordance — nothing recorded, sign-out just proceeds.
    onDone();
  };

  const submitDiscordant = async () => {
    if (!finalCategory || !delta || !severity || !rootCause) return;
    setBusy(true);
    await discordanceService.create({
      caseId, specimenId, caseType,
      frozenCategory, finalCategory,
      frozenDx, finalDx: finalDx.trim(),
      delta, severity, rootCause,
      rootCauseNote: rootCauseNote.trim() || undefined,
      recordedBy: performedBy,
    });
    setBusy(false);
    onDone();
  };

  return (
    <div className="ps-ms-overlay">
      <div className="ps-ms-modal">
        <div className="ps-ms-header">Frozen-to-Permanent Reconciliation</div>
        <div className="ps-ms-body">
          <div className="ps-intraop-note">
            <span className="ps-intraop-note-label">Frozen section — {CATEGORY_LABEL[frozenCategory]}</span>
            {frozenDx || '(no diagnosis text recorded)'}
          </div>

          <div className="ps-conf-form-field">
            <label className="ps-conf-label">Final diagnosis</label>
            <textarea className="ps-conf-input ps-conf-textarea" value={finalDx} onChange={e => setFinalDx(e.target.value)} placeholder="Enter the final diagnosis for this specimen" />
          </div>
          <div className="ps-conf-form-field">
            <label className="ps-conf-label">Final category</label>
            <select className="ps-conf-select" value={finalCategory} onChange={e => { setFinalCategory(e.target.value as FrozenCategory | ''); setShowDiscordantForm(false); }}>
              <option value="">Select…</option>
              <option value="benign">Benign</option>
              <option value="malignant">Malignant</option>
              <option value="atypical_suspicious">Atypical / Suspicious</option>
            </select>
          </div>

          {finalCategory && finalCategory !== frozenCategory && !showDiscordantForm && (
            <p className="ps-intraop-gate-note">Final category differs from frozen — this needs to be logged as a discordance before sign-out can continue.</p>
          )}

          {finalCategory && finalCategory !== frozenCategory && (
            <div className="ps-intraop-action-block">
              <div className="ps-conf-form-field">
                <label className="ps-conf-label">Delta</label>
                <select className="ps-conf-select" value={delta} onChange={e => setDelta(e.target.value as DiscordanceDelta | '')}>
                  <option value="">Select…</option>
                  <option value="upgrade">Upgrade — frozen understated severity</option>
                  <option value="downgrade">Downgrade — frozen overstated severity</option>
                  <option value="minor_variance">Minor variance — same overall call, subtype/detail shifted</option>
                </select>
              </div>
              <div className="ps-conf-form-field">
                <label className="ps-conf-label">Clinical impact</label>
                <select className="ps-conf-select" value={severity} onChange={e => setSeverity(e.target.value as DiscordanceSeverity | '')}>
                  <option value="">Select…</option>
                  <option value="low">Tier 1 — No clinical impact</option>
                  <option value="medium">Tier 2 — Minimal / moderate clinical impact</option>
                  <option value="high">Tier 3 — Significant clinical impact</option>
                </select>
              </div>
              <div className="ps-conf-form-field">
                <label className="ps-conf-label">Root cause</label>
                <select className="ps-conf-select" value={rootCause} onChange={e => setRootCause(e.target.value as DiscordanceRootCause | '')}>
                  <option value="">Select…</option>
                  <option value="sampling_error">Sampling error — diagnostic tissue not in the frozen piece</option>
                  <option value="interpretation_error">Interpretation error</option>
                  <option value="technical_artifact">Technical artifact — sectioning, staining</option>
                  <option value="other">Other</option>
                </select>
              </div>
              {rootCause === 'other' && (
                <div className="ps-conf-form-field">
                  <label className="ps-conf-label">Explain</label>
                  <input className="ps-conf-input" value={rootCauseNote} onChange={e => setRootCauseNote(e.target.value)} placeholder="Brief explanation" />
                </div>
              )}
            </div>
          )}
        </div>
        <div className="ps-ms-footer">
          {finalCategory && finalCategory === frozenCategory ? (
            <button className="ps-ms-btn-apply" disabled={!canConfirmConcordant} onClick={confirmConcordant}>Confirm Concordant — Continue Sign-Out</button>
          ) : (
            <button className="ps-ms-btn-apply" disabled={busy || !canSubmitDiscordant} onClick={submitDiscordant}>Record Discordance — Continue Sign-Out</button>
          )}
        </div>
      </div>
    </div>
  );
};
