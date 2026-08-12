<<<<<<< HEAD
/**
 * CaseSignOutModal
 * ----------------
 * A standalone modal component responsible for signing out an entire case
 * after all synoptic reports have been finalized. This replaces the large
 * inline JSX block previously embedded inside SynopticReportPage.tsx.
 *
 * PURPOSE
 * -------
 * - Prompt the user for username + password before signing out a case.
 * - Display authentication errors (e.g., incorrect credentials).
 * - Trigger the parent’s sign-out workflow upon confirmation.
 *
 * PROPS
 * -----
 * show: boolean
 *    Controls visibility of the modal.
 *
 * overlayStyle: React.CSSProperties
 *    The shared modal overlay style from SynopticReportPage.
 *
 * accession: string
 *    The case accession number, displayed in the modal text.
 *
 * signOutUser: string
 *    Username entered by the user.
 *
 * signOutPassword: string
 *    Password entered by the user.
 *
 * signOutError: string
 *    Error message shown when authentication fails.
 *
 * onClose(): void
 *    Closes the modal without signing out.
 *
 * onUserChange(value: string): void
 *    Updates the username input in the parent component.
 *
 * onPasswordChange(value: string): void
 *    Updates the password input in the parent component.
 *
 * onConfirm(): void
 *    Parent callback that performs the actual sign-out logic.
 *
 * BEHAVIOR
 * --------
 * - Renders username + password fields.
 * - Shows an error message if signOutError is non-empty.
 * - Calls onConfirm() when the user presses Enter or clicks the button.
 * - Calls onClose() when the user cancels.
 *
 * NOTES
 * -----
 * - This component contains no business logic.
 * - All sign-out logic remains inside SynopticReportPage.
 * - This extraction isolates authentication UI and reduces page size.
 */

import React from 'react';

interface CaseSignOutModalProps {
  show: boolean;
  overlayStyle: React.CSSProperties;
=======
import React, { useState, useEffect } from 'react';
import '../../../pathscribe.css';
import { stainTypeService } from '@/services';
import type { StainType } from '@/services/stains/IStainService';
import { computeCaseCodingSummary } from '@/services/billing/codeMapTable';

interface CaseSignOutModalProps {
  show: boolean;
>>>>>>> upstream/main
  accession: string;
  signOutUser: string;
  signOutPassword: string;
  signOutError: string;
  onClose: () => void;
  onUserChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirm: () => void;
<<<<<<< HEAD
}

const CaseSignOutModal: React.FC<CaseSignOutModalProps> = ({
  show,
  overlayStyle,
  accession,
  signOutUser,
  signOutPassword,
  signOutError,
  onClose,
  onUserChange,
  onPasswordChange,
  onConfirm,
}) => {
  if (!show) return null;

  return (
    <div data-capture-hide="true" style={overlayStyle}>
      <div
        style={{
          width: '460px',
          backgroundColor: '#fff',
          padding: '40px',
          borderRadius: '20px',
          textAlign: 'center',
          border: '1px solid #e2e8f0',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ fontSize: '44px', marginBottom: '12px' }}>✍️</div>
        <h2
          style={{
            fontSize: '22px',
            fontWeight: 800,
            color: '#0f172a',
            margin: '0 0 6px',
          }}
        >
          Sign Out Case
        </h2>
        <p
          style={{
            color: '#64748b',
            marginBottom: '6px',
            fontSize: '13px',
            lineHeight: '1.5',
          }}
        >
          All synoptic reports for{' '}
          <strong data-phi="accession">Case {accession}</strong> have been
          finalized.
        </p>
        <p
          style={{
            color: '#64748b',
            marginBottom: '24px',
            fontSize: '13px',
            lineHeight: '1.5',
          }}
        >
          Enter your username and password to sign out this case from PathScribe.
        </p>
        <div style={{ textAlign: 'left', marginBottom: '12px' }}>
          <label
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#475569',
              display: 'block',
              marginBottom: '4px',
            }}
          >
            Username
          </label>
          <input
            type="text"
            autoFocus
            value={signOutUser}
            onChange={e => onUserChange(e.target.value)}
            placeholder="Your username"
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              border: `2px solid ${signOutError ? '#ef4444' : '#e2e8f0'}`,
              fontSize: '14px',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        </div>
        <div style={{ textAlign: 'left', marginBottom: '8px' }}>
          <label
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#475569',
              display: 'block',
              marginBottom: '4px',
            }}
          >
            Password
          </label>
          <input
            type="password"
            value={signOutPassword}
            onChange={e => onPasswordChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onConfirm()}
            placeholder="Your password"
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              border: `2px solid ${signOutError ? '#ef4444' : '#e2e8f0'}`,
              fontSize: '14px',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        </div>
        {signOutError && (
          <p
            style={{
              color: '#ef4444',
              fontSize: '12px',
              margin: '0 0 8px',
              textAlign: 'left',
            }}
          >
            {signOutError}
          </p>
        )}
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '10px',
              background: 'transparent',
              border: '2px solid #e2e8f0',
              color: '#64748b',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '10px',
              background: '#047857',
              border: 'none',
              color: '#fff',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#065f46';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#047857';
            }}
          >
            ✍️ Sign Out Case
          </button>
        </div>
=======
  /** True when this case was released by a resident and is now
   *  genuinely being countersigned, not just a routine sign-out. */
  isCountersign?: boolean;
  residentName?: string;
  countersignFeedback?: string;
  onCountersignFeedbackChange?: (value: string) => void;
  /** Real fix, Piece 3 of the workflow-friction plan: this case's real
   *  specimens (with their real, current coding/blocks/stains), used
   *  to compute a live pre-signout coding summary right where a person
   *  is already stopping to review, rather than requiring a separate
   *  trip through the codes modal to find out. Optional - a case
   *  without a real, populated specimen list simply shows no summary,
   *  same as before this feature existed. */
  specimens?: { id: string; label: string; coding?: { cpt?: string[] }; blocks?: { id: string; label: string; stains?: { stainName: string }[]; coding?: { cpt?: string[] } }[] }[];
  /** Real fix: lets the soft warning's "Assign" link jump straight to
   *  the real, contextual codes modal for the specific specimen that's
   *  missing its base code - the same real callback MaterialTreePanel's
   *  own "+Code" button already uses (Piece 1), reused here rather than
   *  duplicated. */
  onAssignBaseCode?: (specimenId: string, specimenIndex: number) => void;
}

const CaseSignOutModal: React.FC<CaseSignOutModalProps> = ({
  show, accession, signOutUser, signOutPassword, signOutError,
  onClose, onUserChange, onPasswordChange, onConfirm,
  isCountersign, residentName, countersignFeedback, onCountersignFeedbackChange,
  specimens, onAssignBaseCode,
}) => {
  // Real fix, Piece 3: same self-contained data-fetch pattern this
  // app's other modals already use (e.g. BlockStainEditorModal.tsx),
  // rather than lifting this fetch up into the already-large parent
  // page.
  const [stainTypes, setStainTypes] = useState<StainType[]>([]);
  useEffect(() => {
    if (!show) return;
    stainTypeService.getAll().then(res => { if (res.ok) setStainTypes(res.data.filter(s => s.active)); });
  }, [show]);

  const codingSummary = specimens ? computeCaseCodingSummary(specimens, stainTypes) : [];
  const specimenIndexById = new Map((specimens ?? []).map((sp, i) => [sp.id, i]));

  if (!show) return null;

  return (
    <div data-capture-hide="true" className="ps-overlay">
      <div className="ps-modal-dark ps-modal-dark--sm ps-modal-dark--centered">

        <div className="ps-modal-dark-emoji">{isCountersign ? '🎓' : '✍️'}</div>

        <div className="ps-modal-dark-header ps-modal-dark-header--center">
          <span className="ps-modal-dark-title">{isCountersign ? 'Countersign Case' : 'Sign Out Case'}</span>
        </div>

        <p className="ps-modal-dark-body ps-modal-dark-body--center">
          {isCountersign
            ? <>Released by <strong className="ps-text-light">{residentName ?? 'the resident'}</strong> for your countersign — <strong className="ps-text-light" data-phi="accession">Case {accession}</strong>.</>
            : <>All synoptic reports for <strong className="ps-text-light" data-phi="accession">Case {accession}</strong> have been finalized.</>}
        </p>
        <p className="ps-modal-dark-hint ps-modal-dark-hint--center">
          Enter your username and password to sign out this case from PathScribe.
        </p>

        {isCountersign && (
          <div className="ps-conf-form-field" style={{ marginBottom: 12 }}>
            <label className="ps-modal-dark-label">Feedback for {residentName ?? 'the resident'} — optional</label>
            <textarea
              className="ps-conf-input ps-conf-textarea"
              value={countersignFeedback ?? ''}
              onChange={e => onCountersignFeedbackChange?.(e.target.value)}
              placeholder="Targeted feedback — captured here at countersign, not a separate note later."
            />
          </div>
        )}

        {/* Real fix, Piece 3 of the workflow-friction plan: a real,
            live pre-signout coding summary - specimen base codes next
            to block ancillary codes, right at the point a person is
            already stopping to review before finalizing. Soft warning
            only - never blocks the Sign Out button below; matches
            Pete's own "soft warning... quick link to resolve" spec. */}
        {codingSummary.length > 0 && (
          <div className="ps-conf-form-field" style={{ marginBottom: 14, textAlign: 'left' }}>
            <label className="ps-modal-dark-label">Coding Summary</label>
            <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 10px' }}>
              {codingSummary.map(sp => (
                <div key={sp.specimenId} style={{ fontSize: 12, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{sp.specimenLabel}</span>
                    <span style={{ color: sp.hasBaseCode ? '#94a3b8' : '#f59e0b' }}>
                      {sp.hasBaseCode ? sp.baseCptCodes.join(', ') : 'No base code'}
                    </span>
                  </div>
                  {sp.blocks.filter(b => b.appliedAncillaryCodes.length > 0 || b.unappliedSuggestions.length > 0).map(b => (
                    <div key={b.blockId} style={{ display: 'flex', justifyContent: 'space-between', marginLeft: 12, color: '#64748b' }}>
                      <span>{sp.specimenLabel}{b.blockLabel}</span>
                      <span>
                        {b.appliedAncillaryCodes.join(', ')}
                        {b.unappliedSuggestions.length > 0 && (
                          <span style={{ color: '#f59e0b' }}> (suggested, not applied: {b.unappliedSuggestions.join(', ')})</span>
                        )}
                      </span>
                    </div>
                  ))}
                  {sp.hasAncillaryButNoBaseCode && onAssignBaseCode && (
                    <div style={{ marginTop: 3 }}>
                      <button
                        onClick={() => { onAssignBaseCode(sp.specimenId, specimenIndexById.get(sp.specimenId) ?? 0); onClose(); }}
                        style={{ fontSize: 11, color: '#f59e0b', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
                      >
                        ⚠ This specimen has ancillary codes but no base code — Assign now
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="ps-modal-dark-fields">
          <div>
            <label className="ps-modal-dark-label">Username</label>
            <input
              type="text"
              autoFocus
              value={signOutUser}
              onChange={e => onUserChange(e.target.value)}
              placeholder="Your username"
              className={`ps-modal-dark-input${signOutError ? ' ps-modal-dark-input--error' : ''}`}
            />
          </div>
          <div>
            <label className="ps-modal-dark-label">Password</label>
            <input
              type="password"
              value={signOutPassword}
              onChange={e => onPasswordChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onConfirm()}
              placeholder="Your password"
              className={`ps-modal-dark-input${signOutError ? ' ps-modal-dark-input--error' : ''}`}
            />
          </div>
          {signOutError && <p className="ps-modal-dark-field-error">{signOutError}</p>}
        </div>

        <div className="ps-modal-dark-footer ps-modal-dark-footer--stretch">
          <button className="ps-btn-ghost-dark ps-modal-dark-footer__flex-btn" onClick={onClose}>Cancel</button>
          <button onClick={onConfirm} className="ps-btn-green ps-modal-dark-footer__flex-btn">✍️ Sign Out Case</button>
        </div>

>>>>>>> upstream/main
      </div>
    </div>
  );
};

<<<<<<< HEAD
export default CaseSignOutModal;
=======
export default CaseSignOutModal;
>>>>>>> upstream/main
