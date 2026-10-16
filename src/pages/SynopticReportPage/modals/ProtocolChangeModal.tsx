// src/pages/SynopticReportPage/modals/ProtocolChangeModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Shown when AI re-evaluates synoptic protocol assignments after microscopic
// description is submitted. Displays a diff of current vs proposed protocols
// with per-change checkboxes and a commit action.
//
// Trigger: microscopic saved → AI evaluates → if changes proposed → this modal.
//
// i18n note: `change.reason` is a real, AI-generated justification string
// (data) — interpolated into a translated quoted template, never itself
// translated, same as other real reason/justification strings elsewhere
// (e.g. BlockStainEditorModal.tsx's cancel/restain reason lines).
// `change.specimenLabel`/`.specimenDesc`/`.currentTemplateName`/
// `.proposedTemplateName` are likewise real data.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../../pathscribe.css';
import type { ProtocolChange, ProtocolChangeAction } from '@/types/case/Case';

// ProtocolChange / ProtocolChangeAction moved to Case.ts (see comment
// there) — this file no longer defines them, only imports and uses them.
export type { ProtocolChange, ProtocolChangeAction };

interface ProtocolChangeModalProps {
  show:       boolean;
  changes:    ProtocolChange[];
  /** Called with the IDs of changes the pathologist approved */
  onCommit:   (acceptedIds: string[]) => void | Promise<void>;
  onCancel:   () => void;
}

// ── Confidence colour ─────────────────────────────────────────────────────────

function confColor(c: number): string {
  return c >= 85 ? '#34d399' : c >= 70 ? '#fbbf24' : '#f87171';
}

// ── Change row ────────────────────────────────────────────────────────────────

const ChangeRow: React.FC<{
  change:    ProtocolChange;
  selected:  boolean;
  onToggle:  () => void;
}> = ({ change, selected, onToggle }) => {
  const { t } = useTranslation();
  return (
    // Batch 567 (axe nested-interactive): the row was a button holding a checkbox. It is now the checkbox's label,
    // so clicking anywhere on it ticks the box, and keyboard and screen-reader users have the one checkbox.
    <label
      className={`ps-proto-change-row${selected ? ' ps-proto-change-row--selected' : ''}`}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        className="ps-proto-change-checkbox"
        // Named by the specimen and the proposed template, described by the reason (not the whole row read out).
        aria-labelledby={`ps-proto-${change.id}-specimen ps-proto-${change.id}-proposed`}
        aria-describedby={`ps-proto-${change.id}-reason`}
      />

      <span className="ps-proto-change-body">
        {/* Specimen label */}
        <span className="ps-proto-change-specimen" id={`ps-proto-${change.id}-specimen`}>
          <span className="ps-proto-change-specimen-badge">{change.specimenLabel}</span>
          <span className="ps-proto-change-specimen-desc">{change.specimenDesc}</span>
        </span>

        {/* Protocol diff — 'add' has no current template, 'remove' has no proposed one */}
        <span className="ps-proto-change-diff">
          <span className="ps-proto-change-current">
            <span className="ps-proto-change-diff-label">{t('protocolChangeModal.currentLabel')}</span>
            <span className="ps-proto-change-diff-name ps-proto-change-diff-name--current">
              {change.currentTemplateName ?? t('protocolChangeModal.noneAssigned')}
            </span>
          </span>
          <span className="ps-proto-change-arrow">→</span>
          <span className="ps-proto-change-proposed">
            <span className="ps-proto-change-diff-label">{t('protocolChangeModal.proposedLabel')}</span>
            <span className="ps-proto-change-diff-name ps-proto-change-diff-name--proposed" id={`ps-proto-${change.id}-proposed`}>
              {change.proposedTemplateName ?? t('protocolChangeModal.removeNoLongerNeeded')}
            </span>
          </span>
        </span>

        {/* AI reason */}
        <span className="ps-proto-change-reason" id={`ps-proto-${change.id}-reason`}>{t('protocolChangeModal.reasonQuoted', { reason: change.reason })}</span>

        {/* Confidence */}
        <span
          className="ps-proto-change-confidence"
          style={{ '--ps-hue': confColor(change.confidence) } as React.CSSProperties}
        >
          ✦ {t('protocolChangeModal.confidencePercent', { percent: change.confidence })}
        </span>
      </span>
    </label>
  );
};

// ── Main modal ────────────────────────────────────────────────────────────────

export const ProtocolChangeModal: React.FC<ProtocolChangeModalProps> = ({
  show, changes, onCommit, onCancel,
}) => {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Set<string>>(() => new Set(changes.map(c => c.id)));

  // Reset selection when modal opens with new changes
  React.useEffect(() => {
    if (show) setSelected(new Set(changes.map(c => c.id)));
  }, [show, changes]);

  const allSelected  = selected.size === changes.length;
  const noneSelected = selected.size === 0;

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(changes.map(c => c.id)));
  };

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCommit = () => onCommit(Array.from(selected));

  if (!show || changes.length === 0) return null;

  return (
    <div className="ps-overlay ps-overlay--proto-change">
      <div className="ps-modal-dark ps-proto-modal">

        {/* Header */}
        <div className="ps-proto-modal-header">
          <div className="ps-proto-modal-header-left">
            <div className="fm-eyebrow fm-eyebrow--sky">
              ✦ {t('protocolChangeModal.eyebrow')}
            </div>
            <h2 className="ps-modal-dark-title ps-modal-dark-title--no-margin">
              {t('protocolChangeModal.title')}
            </h2>
            <p className="ps-modal-dark-hint ps-modal-dark-hint--tight">
              {t('protocolChangeModal.subtitle', { count: changes.length })}
            </p>
          </div>
          <button type="button" onClick={onCancel} className="ps-modal-close" aria-label={t('common.close')} title={t('common.close')}>×</button>
        </div>

        {/* Select all */}
        {/* Batch 567: the checkbox's label (was a button holding the checkbox). */}
        <label className="ps-proto-select-all">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            ref={el => { if (el) el.indeterminate = !allSelected && !noneSelected; }}
            className="ps-proto-change-checkbox"
          />
          <span className="ps-proto-select-all-label">
            {allSelected ? t('protocolChangeModal.deselectAll') : t('protocolChangeModal.selectAll')}
          </span>
          <span className="ps-proto-select-all-count">
            {t('protocolChangeModal.selectedCount', { selected: selected.size, total: changes.length })}
          </span>
        </label>

        {/* Change list */}
        <div className="ps-proto-modal-list">
          {changes.map(change => (
            <ChangeRow
              key={change.id}
              change={change}
              selected={selected.has(change.id)}
              onToggle={() => toggle(change.id)}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="ps-modal-dark-footer ps-modal-dark-footer--stretch">
          <button className="ps-btn-ghost-dark ps-proto-modal-footer-btn--flex1" onClick={onCancel}>
            {t('protocolChangeModal.keepExistingButton')}
          </button>
          <button
            onClick={handleCommit}
            disabled={noneSelected}
            className={`ps-proto-modal-footer-btn--flex2 ${noneSelected ? 'ps-btn-ghost-dark' : 'ps-btn-primary'}`}
          >
            {noneSelected
              ? t('protocolChangeModal.noChangesSelected')
              : t('protocolChangeModal.applyChangesButton', { count: selected.size })}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ProtocolChangeModal;
