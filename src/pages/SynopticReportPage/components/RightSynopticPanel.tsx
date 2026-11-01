// src/pages/SynopticReportPage/components/RightSynopticPanel.tsx
// Schema-driven synoptic field renderer — dark navy theme.

import { resolveFieldToConfirm } from '@/utils/synopticConfirmField'; import { useSynopticEditField } from '../hooks/useSynopticEditField';
import React, { useImperativeHandle, forwardRef, useState, useEffect, useCallback, useRef } from 'react';
import { nodeCountBelowSum, textNodeCountExceeds, textNodeCountProblem } from '@/services/templates/nodeCountText';
import { useTranslation } from 'react-i18next';
import '../../../pathscribe.css'; import '../aiGovernance.css';
import type { Case, PendingReevaluation, SynopticReportInstance } from '@/types/case/Case';
import { resolveReevaluation } from '@/services/assistPolling/assistMilestoneRules';
import { useAuth } from '@/contexts/AuthContext';
import {
  isVisible,
} from '@/components/Config/Protocols/SynopticEditor';
import type {
  EditorField,
  EditorSection,
  FieldOption,
} from '@/components/Config/Protocols/SynopticEditor';
import type { TemplateDetail } from '@/services/templates/templateService';
import { mustHaveFields, type MustHaveFields } from '@/services/templates/aiSynthesisStatus';
import { getTemplateCached, listTemplatesCached } from '@/services/templates/templateService';
import { filterAutopsyTemplateToActiveSections } from '@/services/autopsy/filterAutopsyTemplateToActiveSections';
import { calculateAutopsyBodyMassIndex } from '@/services/autopsy/calculateAutopsyBodyMassIndex';

import { resolveEmbeddedCodesForAnswer, appendEmbeddedCodesToSpecimen } from '../resolveEmbeddedCoding';
import { resolveConfidenceThresholdForClient } from '@/components/Config/AI/resolveClientAiModel';
import { aiBehaviorService, generateAiSuggestionsForReport, saveReportSuggestions, recordAiFeedback, auditService } from '@/services';
import { applyAiAutoFill, recordAiAutoFill } from '@/services/aiGovernance/aiAutoFill';
import { getOrgOrchestratorDefault, resolveOrchestratorMode } from '@/components/Config/AI/orchestratorModeConfig';
import { matchSourceText } from '@/utils/sourceTextMatching';
import { SpellCheckedTextarea } from '@/components/SpellCheck/SpellCheckedTextarea';
import { MohsStagesInput } from '@/components/OrganMap/MohsStagesInput';
import { applyAnswerPatch, mohsDefaultHistology, type AnswerPatchOrUpdate } from '@/services/templates/mohsStages';
import { BUILT_IN_ORGAN_MAP_SCHEME } from '@/services/organMapping/organMapScheme';
import { loadOrganMapContext, loadOrganMapScheme, type OrganMapContext } from '@/services/organMapping/organMapLive';
import { derivedFieldIds } from '@/services/organMapping/organMapDerived';
import { molecularFieldNotice } from '@/services/templates/molecularResultBinding';
import { derivedMarginAnswers } from '@/services/organMapping/organMapDerivedAnswers';
import { collectMarginInk, inkForMarginLabel, type MarginInkEntry } from '@/services/grossing/marginInkLabels';
import { MarginInkChip } from '@/components/Common/MarginInkChip';
import type { OrganMapScheme } from '@/services/organMapping/organMapTypes';
import {
  clearSynopticFieldAnswers, computedSumPatch, partGridCellHasProblem, partGridCountProblems, partGridKey, partGridRowHeading, sumFieldState, sumOfTotal, wholeNumberFieldProblem, fieldExceedsProblem, partGridRowsForField, partGridRowsOf, synopticFieldAnswered, synopticFieldComplete, synopticFieldMissing, type PartGridColumn, type PartGridRow,
} from '@/services/templates/partGrid';
import { shownSynopticFields } from '@/services/templates/synopticEntryChecks';
import { pressable } from '@/utils/a11y/pressable';
import { LoadingState } from '@/components/Common/LoadingState'; import { DemoWordingTag } from '@/components/Synoptic/DemoWordingTag'; import { offeredOnCasePicker } from '@/services/templates/demoChecklists'; import { TemplatePicker, type TemplateOption } from './TemplatePicker';



// ─── Helpers ──────────────────────────────────────────────────────────────────
/**
 * Real fix, found by this app's own inline-CSS/business-logic sweep:
 * this file used to keep its own local copy of isVisible(), even
 * though this exact header comment already documented the intent
 * that it be "reused, not re-implemented" by useSignOutWorkflow.ts's
 * finalize gate. The local copy was never updated for PS-272's
 * multi-value `answerIds` OR-condition support, which
 * SynopticEditor.tsx's own isVisible() (the real source of truth —
 * exported for exactly this reuse) already had. That meant every
 * consumer of the old local copy — this file's own required-field
 * checks, unanswered-field counts, and section-progress percentages,
 * AND useSignOutWorkflow.ts's Microscopic finalize completeness gate
 * — silently ignored `answerIds` conditions: a real autopsy template
 * field conditioned on either of two answers (e.g. linear OR
 * depressed/comminuted skull fracture, from
 * autopsy_gross_examination.json) would only be recognized as visible
 * for the first of the two answers, letting a case be signed out with
 * a genuinely-required field left blank. Now imports the one real
 * implementation directly instead of shadowing it.
 */
export { isVisible };



// ─── Types ────────────────────────────────────────────────────────────────────
export interface AiSuggestion {
  value: string | string[];
  confidence: number;
  source: string;
  verification: 'unverified' | 'verified' | 'disputed';
}

// ─── FieldRow ─────────────────────────────────────────────────────────────────
/** An answer as the pathologist sees it: choice ids as their labels. */
const displayAnswer = (field: EditorField, value: string | string[]) =>
  (Array.isArray(value) ? value : [value]).map(v => field.options?.find((o: FieldOption) => o.id === v)?.label ?? v).join(', ');

interface FieldRowProps {
  /** Batch 610 (#9): the ink colour recorded on the margin this field's label names, shown beside the label. */
  marginInk?: MarginInkEntry;
  field: EditorField;
  value: string | string[];
  onChange: (id: string, v: string | string[]) => void;
  aiSuggestion?: AiSuggestion;
  onVerify?: (fieldId: string, v: 'verified' | 'disputed') => void;
  onLabelClick?: () => void;
  isActive?: boolean;
  aiAttempted?: boolean;
  belowThreshold?: boolean;
  belowThresholdSource?: string;
  isPulsing?: boolean;
  fieldRef?: (el: HTMLDivElement | null) => void;
  onFieldFocus?: (fieldId: string) => void;
  /** True when this field is the currently-active/highlighted one AND
   *  the AI's cited source text couldn't actually be located in the
   *  report — an honest signal instead of the highlight silently
   *  doing nothing. */
  sourceNotFound?: boolean;
  /** Batch 426: a newer AI suggestion for a field the pathologist had set, waiting for "keep or update?". */
  reevaluation?: PendingReevaluation;
  onReevaluation?: (fieldId: string, choice: 'keep' | 'accept') => void;
  /** Batch 461: a results grid question reads its cells from all the answers, one row per part. */
  answers?: Record<string, string | string[]>;
  gridRows?: PartGridRow[];
  /** Batch 463: the Mohs stage question — its colours, default histology and how its changes are applied. */
  mohs?: { scheme: OrganMapScheme; defaultHistology?: string; onPatch: (patch: AnswerPatchOrUpdate) => void };
  /** Batch 465b: a hand-entered total's grid total, shown beside it. */
  sumTotal?: number;
  /** Batch 466b: calculated from the organ map's margin questions (locked). */
  derivedFromMap?: boolean;
  /** Batch 467: this question was answered from an in-house molecular result, or the result differs from the answer. */
  molecular?: { assayName: string; orderId: string; delta?: { resultLabel: string; onAccept: () => void } };
  /** Batch 466b: this count is above the question it can't exceed (the two values). */
  exceeds?: { value: number; limit: number };
  /** Batch 519 (PS-494): this total is below the sum of the counts it covers. */
  belowSum?: { value: number; sum: number };
}

/** Batch 461: the results grid (one row per part of the case). Each cell is an ordinary answer. */
const PartGridInput: React.FC<{
  field: EditorField; rows: PartGridRow[]; answers: Record<string, string | string[]>;
  onChange: (id: string, v: string | string[]) => void;
}> = ({ field, rows, answers, onChange }) => {
  const { t } = useTranslation();
  const columns: PartGridColumn[] = field.columns ?? [];
  if (rows.length === 0) return <div className="ps-syn-partgrid-empty">{t('rightSynopticPanel.partGrid.noParts')}</div>;
  const rowHeading = partGridRowHeading(field as never);
  // Batch 465b (Pete): a count above the column it can't exceed (nodes positive > examined) is shown on its row.
  const problems = partGridCountProblems(field as never, answers, rows);
  return (
    <div className="ps-syn-partgrid-wrap">
      <table className="ps-syn-partgrid">
        <thead>
          <tr>
            <th scope="col">{rowHeading ?? t('rightSynopticPanel.partGrid.partColumn')}</th>
            {columns.map(c => <th key={c.id} scope="col">{c.unit ? t('rightSynopticPanel.partGrid.columnWithUnit', { label: c.label, unit: c.unit }) : c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id}>
              <th scope="row" className="ps-syn-partgrid-part" title={row.description}>{row.label}</th>
              {columns.map(c => {
                const key = partGridKey(field.id, row.id, c.id);
                const v = answers[key];
                const value = Array.isArray(v) ? '' : String(v ?? '');
                const label = t('rightSynopticPanel.partGrid.cellLabel', { part: row.label, column: c.label });
                const wrong = partGridCellHasProblem(problems, row.id, c.id);
                return (
                  <td key={c.id}>
                    {c.type === 'dropdown' ? (
                      <select className="ps-syn-input ps-syn-partgrid-input" value={value} aria-label={label} onChange={e => onChange(key, e.target.value)}>
                        <option value="">{t('rightSynopticPanel.partGrid.select')}</option>
                        {(c.options ?? []).map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                      </select>
                    ) : (
                      <input type="number" min={0} step={c.wholeNumber ? 1 : undefined} className={`ps-syn-input ps-syn-partgrid-input ps-syn-partgrid-input--numeric${wrong ? ' ps-syn-partgrid-input--problem' : ''}`} value={value} aria-label={label} aria-invalid={wrong || undefined} onChange={e => onChange(key, e.target.value)} />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {problems.map(p => (
        <p key={`${p.rowId}-${p.columnId}`} className="ps-syn-partgrid-problem" role="alert">
          {p.kind === 'notWhole'
            ? t('synopticChecks.rowNotWhole', { row: p.rowLabel, column: p.columnLabel, value: p.entered })
            : t('synopticChecks.rowExceeds', { row: p.rowLabel, column: p.columnLabel, value: p.value, limit: p.limitLabel, limitValue: p.limit })}
        </p>
      ))}
    </div>
  );
};

const FieldRow: React.FC<FieldRowProps> = ({
  field, value, onChange, aiSuggestion, onVerify, onLabelClick,
  isActive = false, aiAttempted = false,
  belowThreshold = false, belowThresholdSource,
  isPulsing = false, fieldRef, onFieldFocus, sourceNotFound = false, reevaluation, onReevaluation,
  answers, gridRows, mohs, sumTotal, derivedFromMap = false, exceeds, belowSum, molecular, marginInk,
}) => {
  const { t } = useTranslation();
  const sumState = sumFieldState(field, sumTotal);
  const notWhole = wholeNumberFieldProblem(field as never, { [field.id]: value as string });
  const notCount = textNodeCountProblem(field as never, { [field.id]: value as string });
  const strVal = (value ?? '') as string;
  const arrVal = Array.isArray(value) ? value as string[] : [];
  const ai = aiSuggestion;
  const vStatus = ai?.verification ?? 'unverified';
  const hasValue = field.type === 'partGrid' || field.type === 'spatialStageCanvas'
    ? synopticFieldComplete(field, answers ?? {})
    : Array.isArray(value) ? value.length > 0 : (value ?? '') !== '';
  const isManualEntry = !ai && !belowThreshold && aiAttempted && hasValue;

  const confBadgeClass =
    vStatus === 'verified' ? 'ps-syn-badge--confirmed'
    : vStatus === 'disputed' ? 'ps-syn-badge--disputed'
    : '';

  const handleActivate = () => {
    onLabelClick?.();
    onFieldFocus?.(field.id);
  };

  const rowClassNames = [
    'ps-syn-field-row',
    (ai || aiAttempted || isPulsing) ? 'ps-syn-field-row--ai-padding' : '', ai && hasValue && vStatus === 'unverified' ? 'ps-syn-field-row--ai-unreviewed' : '', // Batch 681: a quiet cue, no click needed
    isPulsing
      ? 'ps-syn-field-row--pulsing'
      : [
          isActive && ai ? 'ps-syn-field-row--active-ai'
            : isManualEntry ? 'ps-syn-field-row--manual'
            : aiAttempted && !ai && !hasValue ? 'ps-syn-field-row--attempted-empty'
            : '',
          isActive && hasValue ? 'ps-syn-field-row--active-value' : '',
        ].filter(Boolean).join(' '),
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={fieldRef}
      className={rowClassNames}
      onFocus={() => { handleActivate(); onFieldFocus?.(field.id); }}
    >
      {/* Field header */}
      <div
        {...pressable(handleActivate, { role: null })}
        className="ps-syn-field-header"
      >
        <span
          className={`ps-syn-field-label${isActive ? ' ps-syn-field-label--active' : ''}`}
          title={ai ? t('rightSynopticPanel.fieldRow.clickToHighlightTitle') : t('rightSynopticPanel.fieldRow.clickToFocusTitle')}
        >{field.label}</span>
        {marginInk && <MarginInkChip ink={marginInk} />}
        {field.required && <span className="ps-syn-field-required">*</span>}

        {/* Below-threshold warning badge */}
        {belowThreshold && (
          <span
            title={t('rightSynopticPanel.fieldRow.checkSourceTitle')}
            className="ps-syn-badge-outlined ps-syn-badge--warn"
          >
            <span className="ps-syn-badge-icon">⚠</span>
            {t('rightSynopticPanel.fieldRow.checkSourceBadge')}
          </span>
        )}

        {/* AI not found */}
        {!ai && !belowThreshold && aiAttempted && !hasValue && (
          <span
            title={t('rightSynopticPanel.fieldRow.notFoundTitle')}
            className="ps-syn-badge-outlined ps-syn-badge--muted"
          >
            <span className="ps-syn-badge-icon">◌</span> {t('rightSynopticPanel.fieldRow.notFoundBadge')}
          </span>
        )}

        {/* Manual entry */}
        {isManualEntry && (
          <span
            title={t('rightSynopticPanel.fieldRow.manualEntryTitle')}
            className="ps-syn-badge-outlined ps-syn-badge--manual"
          >
            <span className="ps-syn-badge-icon">✎</span> {t('rightSynopticPanel.fieldRow.manualEntryBadge')}
          </span>
        )}

        {/* AI confidence badge + Confirm/Override */}
        {ai && (
          <>
            {/* The warning badge above already names this field; skip the duplicate badge for unverified below-threshold fields. */}
            {!(belowThreshold && vStatus === 'unverified') && (
              <span className={`ps-syn-badge ${confBadgeClass}`}>
                {vStatus === 'verified' ? t('rightSynopticPanel.fieldRow.confirmedBadge') : vStatus === 'disputed' ? t('rightSynopticPanel.fieldRow.overriddenBadge') : t('rightSynopticPanel.fieldRow.aiSuggestionBadge')}
              </span>
            )}
            {vStatus === 'unverified' && (
              <>
                <button
                  onClick={() => onVerify?.(field.id, 'verified')}
                  className="ps-syn-confirm-btn"
                >{t('rightSynopticPanel.fieldRow.confirmButton')}</button>
                <button
                  onClick={() => onVerify?.(field.id, 'disputed')}
                  className="ps-syn-override-btn"
                >{t('rightSynopticPanel.fieldRow.overrideButton')}</button>
              </>
            )}
            {vStatus !== 'unverified' && (
              <button
                onClick={() => onVerify?.(field.id, vStatus === 'verified' ? 'disputed' : 'verified')}
                className="ps-syn-undo-btn"
              >{t('rightSynopticPanel.fieldRow.undoButton')}</button>
            )}
          </>
        )}
      </div>

      {/* Batch 426: the narrative changed and the AI now suggests something else for a field the
          pathologist set. Never applied on its own: keep theirs, or take the new value. */}
      {reevaluation && (
        <div className="ps-syn-reeval" role="note">
          <span className="ps-syn-reeval-text">
            {t('rightSynopticPanel.reevaluation.suggests', { value: displayAnswer(field, reevaluation.value) })}
          </span>
          {reevaluation.source && <span className="ps-syn-reeval-source" data-phi="true">{reevaluation.source}</span>}
          <span className="ps-syn-reeval-actions">
            <button type="button" className="ps-syn-reeval-btn" onClick={() => onReevaluation?.(field.id, 'keep')}>{t('rightSynopticPanel.reevaluation.keep')}</button>
            <button type="button" className="ps-syn-reeval-btn ps-syn-reeval-btn--accept" onClick={() => onReevaluation?.(field.id, 'accept')}>{t('rightSynopticPanel.reevaluation.accept')}</button>
          </span>
        </div>
      )}

      {/* Input controls */}
      {field.type === 'text' && (
        <input aria-label={field.label} type="text" value={strVal} onChange={e => onChange(field.id, e.target.value)}
          aria-invalid={notCount !== undefined || undefined}
          className={`ps-syn-input${notCount !== undefined ? ' ps-syn-partgrid-input--problem' : ''}`} />
      )}
      {/* Batch 519 (PS-494): a free-text node count — a whole number, "cannot be determined" or "at least N". */}
      {field.type === 'text' && notCount !== undefined && (
        <p className="ps-syn-partgrid-problem" role="alert">{t('synopticChecks.notCountHint', { value: notCount })}</p>
      )}
      {field.type === 'text' && notCount === undefined && exceeds && (
        <p className="ps-syn-partgrid-problem" role="alert">{t('synopticChecks.fieldExceedsHint', { value: exceeds.value, limitValue: exceeds.limit })}</p>
      )}
      {(field.type === 'text' || field.type === 'numeric') && belowSum && (
        <p className="ps-syn-partgrid-problem" role="alert">{t('synopticChecks.belowSumHint', { value: belowSum.value, sum: belowSum.sum })}</p>
      )}
      {field.type === 'longtext' && (
        <SpellCheckedTextarea rows={3} value={strVal} onChange={e => onChange(field.id, e.target.value)} className="ps-syn-input ps-syn-input--textarea" />
      )}
      {field.type === 'numeric' && (
        <input aria-label={field.label}
          type="number"
          value={strVal}
          onChange={e => onChange(field.id, e.target.value)}
          // Real, per direct follow-up: "it all needs to be wired" —
          // now auto-computed by setAnswer's own real BMI wiring
          // above, matching the spec's own "[Auto-Calculated]" label
          // (Q1.1) \u2014 read-only so a real user can't enter a value
          // that would just get silently overwritten the next time
          // weight or height changes.
          disabled={field.id === 'body_mass_index' || sumState === 'calculated'}
          // Batch 466 (Pete): a node count is a whole number, 0 or more.
          min={field.wholeNumber ? 0 : undefined}
          step={field.wholeNumber ? 1 : undefined}
          aria-invalid={notWhole !== undefined || undefined}
          className={`ps-syn-input ps-syn-input--numeric${notWhole !== undefined ? ' ps-syn-partgrid-input--problem' : ''}`}
        />
      )}
      {field.type === 'numeric' && notWhole !== undefined && (
        <p className="ps-syn-partgrid-problem" role="alert">{t('synopticChecks.notWholeHint', { value: notWhole })}</p>
      )}
      {field.type === 'numeric' && notWhole === undefined && exceeds && (
        <p className="ps-syn-partgrid-problem" role="alert">{t('synopticChecks.fieldExceedsHint', { value: exceeds.value, limitValue: exceeds.limit })}</p>
      )}
      {/* Batch 465b: a total from its grid — calculated once the grid has counts, else entered by hand; an
          override total is entered by hand with the grid's total beside it. */}
      {field.type === 'numeric' && sumState && (
        <div className="ps-syn-field-hint">
          {sumState === 'calculated' ? t('synopticChecks.calculatedHint')
            : sumState === 'open' ? t('synopticChecks.calculatedWhenFilled')
              : sumTotal === undefined ? t('synopticChecks.gridEmptyHint') : t('synopticChecks.gridTotalHint', { total: sumTotal })}
        </div>
      )}
      {field.type === 'dropdown' && (
        <select value={strVal} onChange={e => onChange(field.id, e.target.value)} className="ps-syn-input" aria-label={field.label} disabled={derivedFromMap}>
          <option value="">{t('rightSynopticPanel.fieldRow.selectPlaceholder')}</option>
          {field.options?.map((o: FieldOption) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      )}
      {field.type === 'radio' && (
        <div className="ps-syn-options-list">
          {field.options?.map((o: FieldOption) => (
            <label key={o.id} className="ps-syn-option-label">
              <input type="radio" name={field.id} checked={strVal === o.id} onChange={() => onChange(field.id, o.id)} className="ps-syn-option-input" disabled={derivedFromMap} />
              {o.label}
            </label>
          ))}
        </div>
      )}
      {field.type === 'checkboxes' && (
        <div className="ps-syn-options-list">
          {field.options?.map((o: FieldOption) => (
            <label key={o.id} className="ps-syn-option-label">
              <input
                type="checkbox"
                checked={arrVal.includes(o.id)}
                onChange={e => {
                  const next = new Set(arrVal);
                  e.target.checked ? next.add(o.id) : next.delete(o.id);
                  onChange(field.id, Array.from(next));
                }}
                className="ps-syn-option-input"
                disabled={derivedFromMap}
              />
              {o.label}
            </label>
          ))}
        </div>
      )}

      {/* Batch 466b (Pete): a generic margin question calculated from the map's margin questions. */}
      {derivedFromMap && <div className="ps-syn-field-hint">{t('synopticChecks.derivedFromMapHint')}</div>}
      {/* Batch 467 (Pete): an answer from an in-house molecular result, or the "engine delta" — the result differs. */}
      {molecular && !molecular.delta && <div className="ps-syn-field-hint">{t('molecularOrders.synoptic.fromResult', { assay: molecular.assayName, order: molecular.orderId })}</div>}
      {molecular?.delta && (
        <div className="ps-syn-molecular-delta" role="status">
          <span className="ps-syn-molecular-delta-tag">{t('molecularOrders.synoptic.deltaTag')}</span>
          <span>{t('molecularOrders.synoptic.deltaText', { assay: molecular.assayName, order: molecular.orderId, result: molecular.delta.resultLabel })}</span>
          <button type="button" className="ps-syn-molecular-delta-btn" onClick={molecular.delta.onAccept}>{t('molecularOrders.synoptic.useResult')}</button>
        </div>
      )}
      {field.type === 'partGrid' && (
        <PartGridInput field={field} rows={gridRows ?? []} answers={answers ?? {}} onChange={onChange} />
      )}
      {field.type === 'spatialStageCanvas' && mohs && (
        <MohsStagesInput fieldId={field.id} answers={answers ?? {}} scheme={mohs.scheme} defaultHistology={mohs.defaultHistology} onPatch={mohs.onPatch} />
      )}

      {strVal && field.type === 'dropdown' && (
        <div className="ps-syn-dropdown-confirm">
          ✓ {field.options?.find((o: FieldOption) => o.id === strVal)?.label ?? strVal}
        </div>
      )}

      {/* AI source + low-confidence source */}
      {ai && vStatus === 'unverified' && (
        <div className="ps-syn-ai-source">
          {t('rightSynopticPanel.fieldRow.aiSourceLabel', { source: ai.source })}
        </div>
      )}
      {belowThreshold && belowThresholdSource && (
        <div className="ps-syn-ai-source ps-syn-ai-source--warn">
          {t('rightSynopticPanel.fieldRow.aiSourceLabel', { source: belowThresholdSource })}
        </div>
      )}
      {isActive && sourceNotFound && (
        <div
          className="ps-syn-source-notfound"
          title={t('rightSynopticPanel.fieldRow.sourceNotFoundTitle')}
        >
          <span aria-hidden="true">◐</span> {t('rightSynopticPanel.fieldRow.sourceNotFoundText')}
        </div>
      )}
    </div>
  );
};

// ─── Exported types ───────────────────────────────────────────────────────────
export interface ReviewField {
  fieldId:      string;
  fieldLabel:   string;
  sectionTitle: string;
  aiValue:      string | string[];
  confidence:   number;
  source:       string;
  verification: 'unverified' | 'verified' | 'disputed';
  sourceNotFound?: boolean;
}

export interface MissingRequiredField {
  sectionId:    string;
  sectionTitle: string;
  fieldId:      string;
  fieldLabel:   string;
}

export interface RightSynopticPanelHandle {
  validateRequired(): MissingRequiredField[];
  getUncertainRequiredFields(threshold?: number): ReviewField[];
  /** Real fix, per direct product decision: any REQUIRED field with an
   *  AI suggestion still sitting 'unverified' — regardless of
   *  confidence or whether its source can be matched — is a
   *  regulatory concern if finalize is allowed to proceed anyway. No
   *  confidence-based leniency here: an unconfirmed AI value on a
   *  required field blocks finalize outright, full stop, the same
   *  "absolute block, no soft path" principle already applied
   *  elsewhere (see resolveClientAiModel.ts). Returns the same shape
   *  as validateRequired() so callers can navigate to the first one
   *  the same way. */
  getBlockingUnverifiedFields(): MissingRequiredField[];
  /** Batch 691: clears these answers (unconfirmed AI values left out of the signed report); the suggestions stay. */
  omitFields(fieldIds: string[]): void;
  setFieldVerification(fieldId: string, v: 'verified' | 'disputed'): void;
  sweepAndGetFinalState(): {
    answers: Record<string, string | string[]>;
    aiSuggestions: Record<string, AiSuggestion>;
    verificationSummary: {
      explicitConfirmed: number;
      overridden: number;
      missed: number;
      notFound: number;
      /** Real fix, stronger version: fields left honestly unverified
       *  because nobody explicitly confirmed or overrode them —
       *  required fields with this problem are now hard-blocked
       *  upstream by getBlockingUnverifiedFields() before finalize
       *  ever reaches this point, so in practice this only reflects
       *  non-required fields nobody happened to review. Never
       *  silently auto-confirmed, regardless of source-match. */
      leftUnverified: number;
    };
  };
}

interface RightSynopticPanelProps {
  caseData: Case | null;
  activeTab: string;
  activeReportInstanceId?: string;
  /** Which array activeReportInstanceId actually lives in — this panel
   *  is a generic template-field editor, usable for either a Grossing
   *  instance (grossingReports) or a diagnostic Synoptic instance
   *  (synopticReports). Defaults to 'synoptic' for any caller that
   *  hasn't been updated to pass this explicitly. */
  activeReportType?: 'grossing' | 'synoptic';
  onReportInstanceChange?: (id: string) => void;
  onReportTypeChange?: (type: 'grossing' | 'synoptic') => void;
  onCaseUpdate?: (updated: Case) => void;
  /** Real fix, needed by the "no template attached yet" picker below:
   *  a new SynopticReportInstance is per-specimen (SynopticReportInstance.specimenId
   *  is required), but this panel previously had no way to know which
   *  specimen it was even showing — it's a generic template-field
   *  editor keyed by activeReportInstanceId, which doesn't exist yet
   *  for a specimen with no report at all. The parent page already
   *  reliably tracks this as activeSpecimenId (set on load, on sidebar
   *  selection, and on navigation) — threaded through here rather than
   *  duplicating that tracking. */
  activeSpecimenId?: string;
  isDirty?: boolean;
  /**
   * Either the legacy sentinel 'scroll_to_unanswered' (jump to whatever the
   * first missing required field currently is), or a real field ID to jump
   * to that specific field directly. Any other truthy value is treated as
   * a field ID lookup, falling back to the legacy behavior if no field
   * with that ID is found.
   */
  scrollToField?: string | null;
  onScrollComplete?: () => void;
  onHighlight?: (source: string | null) => void;
  /** Whether the last onHighlight source was actually found in the
   *  report text — see LeftReportPanel's matchResult. When true, shows
   *  an honest indicator next to the currently-highlighted field
   *  instead of silently doing nothing. */
  highlightNotFound?: boolean;
  /**
   * Discrete computational results keyed by assay name (e.g. "HER2 IHC").
   * Passed into the AI prompt so the AI uses discrete LIS data rather than
   * relying solely on narrative text. Higher confidence results when present.
   */
  computationalResults?: Record<string, Record<string, string | number | boolean | null>>;
  /**
   * Called whenever AI suggestions are loaded or updated.
   * Previously also fed SidecarDisplay's concordance check against a
   * discrete computational result — removed along with the rest of
   * the ordering/result apparatus. Kept here since aiSuggestions are
   * still genuinely used elsewhere (report drafting, verification).
   */
  onAiSuggestionsUpdate?: (suggestions: Record<string, AiSuggestion>) => void;
  /** PS-329 (Batch 437): the template's Must Have fields for the answers so
   *  far, so the report header's AI badge counts only those. */
  onMustHaveFieldsUpdate?: (fields: MustHaveFields | null) => void;
  /**
   * Batch 577 (review): changes when the page takes up someone else's saved version (Show their changes, Use
   * their version), so the form reads its answers from the case again instead of keeping the ones it holds.
   */
  reloadKey?: number;
}

// ─── Main component ───────────────────────────────────────────────────────────
const RightSynopticPanel = forwardRef<RightSynopticPanelHandle, RightSynopticPanelProps>(
  ({ caseData: initialCaseData, reloadKey = 0, activeReportInstanceId, activeReportType = 'synoptic', activeSpecimenId, onReportInstanceChange, onCaseUpdate, scrollToField, onScrollComplete, onHighlight, highlightNotFound, computationalResults, onAiSuggestionsUpdate, onMustHaveFieldsUpdate }, ref) => {
  const { t } = useTranslation();

  // Real fix, found via a direct audit: same as HeaderBar.tsx — this
  // used to call the old, superseded getOrchestratorMode() instead of
  // the real resolveOrchestratorMode(), silently never applying the
  // real per-lab override. Defaults to the sync org-level value first,
  // then resolves the full, per-lab-aware value.
  const [orchestratorMode, setOrchestratorMode] = useState<boolean>(getOrgOrchestratorDefault);
  useEffect(() => {
    resolveOrchestratorMode(initialCaseData?.order?.facilityId).then(setOrchestratorMode).catch(() => {});
  }, [initialCaseData?.order?.facilityId]);
  const caseData = initialCaseData;
  // Fixes a confirmed bug: this used to hardcode 'PATH-001' for both
  // the assignment-validation check and the "Assigned to you" badge,
  // meaning any pathologist other than that one specific demo user
  // would see incorrect results regardless of who was actually logged
  // in and actually assigned. Now compares against the real signed-in
  // user.
  const { user } = useAuth();

  // This panel is a generic template-field editor — it doesn't care
  // whether it's editing a Grossing instance or a diagnostic Synoptic
  // one, only which array to read/write. These two helpers are the
  // single place that decision gets made, so every load/save site
  // below stays identical regardless of which kind of report is active.
  const activeReportsKey: 'grossingReports' | 'synopticReports' =
    activeReportType === 'grossing' ? 'grossingReports' : 'synopticReports';
  const getActiveReports = useCallback((c: Case | null): any[] =>
    (c as any)?.[activeReportsKey] ?? [], [activeReportsKey]);

  // ── State ──────────────────────────────────────────────────────────────────
  const [templateDetail,      setTemplateDetail]      = useState<TemplateDetail | null>(null);
  const [answers,             setAnswers]             = useState<Record<string, string | string[]>>({});
  const [availableTemplates,  setAvailableTemplates]  = useState<TemplateOption[]>([]);
  const [loading,             setLoading]             = useState(true);
  const [error,               setError]               = useState<string | null>(null);
  const [activeSectionId,     setActiveSectionId]     = useState('');
  const [viewMode,            setViewMode]            = useState<'tabs' | 'page'>('tabs');
  const [aiSuggestions,       setAiSuggestions]       = useState<Record<string, AiSuggestion>>({});
  const [isRegenerating,      setIsRegenerating]      = useState(false);

  // Notify parent whenever suggestions update — previously also fed
  // SidecarDisplay's concordance check, removed along with the rest
  // of the ordering/result apparatus.
  const updateAiSuggestions = useCallback((sugs: Record<string, AiSuggestion>) => {
    setAiSuggestions(sugs);
    onAiSuggestionsUpdate?.(sugs);
  }, [onAiSuggestionsUpdate]);
  const [activeFieldId,       setActiveFieldId]       = useState<string | null>(null);
  const [pulsingFieldId,      setPulsingFieldId]      = useState<string | null>(null);
  const [confidenceThreshold, setConfidenceThreshold] = useState(75);
  const [autoInsertSuggestions, setAutoInsertSuggestions] = useState(false);
  const [microscopicAiEnabled, setMicroscopicAiEnabled] = useState(true);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const loadedAnswersRef   = useRef<string>('');
  const fieldRefs          = useRef<Record<string, HTMLDivElement | null>>({});
  const sectionHeaderRefs  = useRef<Record<string, HTMLDivElement | null>>({});
  const lastJumpedFieldId  = useRef<string | null>(null);
  const lastJumpedSectionId = useRef<string | null>(null);
  // Real fix, per direct report: all three jump-to buttons only ever
  // moved forward — skip past something (click Next again without
  // answering it) and there was no way back to it short of manually
  // scrolling or cycling all the way around. One unified history
  // stack, not three separate "Previous X" buttons: it correctly
  // tracks wherever the pathologist actually was, even across
  // different jump categories (e.g. Next Unanswered, then Next
  // Unverified, then wanting to go back) — three category-specific
  // stacks would each only see their own category's moves and miss
  // that case entirely.
  const jumpHistory = useRef<{ fieldId: string; sectionId: string }[]>([]);
  const [jumpHistoryLength, setJumpHistoryLength] = useState(0);

  // ── Load AI behavior settings ──────────────────────────────────────────────
  useEffect(() => {
    aiBehaviorService.get().then(res => {
      if (res.ok) {
        const orgThreshold = res.data.confidenceThreshold ?? 75;
        setConfidenceThreshold(orgThreshold);
        // Batch 609 (#173): the model's own threshold override, when the organisation set one.
        void resolveConfidenceThresholdForClient(initialCaseData?.order?.facilityId, orgThreshold).then(setConfidenceThreshold);
        setAutoInsertSuggestions(res.data.autoInsertSuggestions ?? false);
        setMicroscopicAiEnabled(res.data.microscopicEnabled ?? true);
      }
    });
  }, [initialCaseData?.order?.facilityId]);

  // ── PS-329: the template's Must Have fields, for the header's AI badge ─────
  useEffect(() => {
    onMustHaveFieldsUpdate?.(mustHaveFields(templateDetail?.template, answers));
  }, [templateDetail, answers, onMustHaveFieldsUpdate]);

  // ── Propagate answer changes to parent ────────────────────────────────────
  useEffect(() => {
    if (!caseData || !activeReportInstanceId) return;
    const current = JSON.stringify(answers);
    if (current === loadedAnswersRef.current) return;
    const updatedReports = getActiveReports(caseData).map(r =>
      r.instanceId === activeReportInstanceId
        ? { ...r, answers, updatedAt: new Date().toISOString() }
        : r
    );
    onCaseUpdate?.({ ...caseData, [activeReportsKey]: updatedReports, updatedAt: new Date().toISOString() } as any);
  }, [answers]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Jump to field ─────────────────────────────────────────────────────────
  const jumpToField = useCallback((fieldId: string, sectionId: string, opts?: { isBack?: boolean }) => {
    // Record where we're leaving FROM, not where we're going — "Back"
    // should return to the field the pathologist just left, not the
    // one they're about to land on. Skipped entirely when this jump
    // IS itself a back-navigation, so repeated Back presses walk the
    // real history backward instead of bouncing between two fields.
    if (!opts?.isBack && lastJumpedFieldId.current && lastJumpedFieldId.current !== fieldId) {
      jumpHistory.current.push({ fieldId: lastJumpedFieldId.current, sectionId: lastJumpedSectionId.current ?? sectionId });
      setJumpHistoryLength(jumpHistory.current.length);
    }
    if (viewMode === 'tabs') setActiveSectionId(sectionId);
    setActiveFieldId(fieldId);
    setPulsingFieldId(fieldId);
    lastJumpedFieldId.current = fieldId;
    lastJumpedSectionId.current = sectionId;
    setTimeout(() => {
      const el = fieldRefs.current[fieldId];
      if (el) {
        const input = el.querySelector<HTMLElement>('input, select, textarea, [role="combobox"]');
        const scrollTarget = input ?? el;
        scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (input) input.focus();
      }
      setTimeout(() => setPulsingFieldId(null), 2000);
    }, 80);
  }, [viewMode]);

  // ── Jump back — real fix for the skip-and-can't-return gap ────────────────
  const jumpBack = useCallback(() => {
    const prev = jumpHistory.current.pop();
    if (!prev) return;
    setJumpHistoryLength(jumpHistory.current.length);
    jumpToField(prev.fieldId, prev.sectionId, { isBack: true });
  }, [jumpToField]);

  // ── View mode + section navigation voice/action events ───────────────────
  useEffect(() => {
    const onFullView     = () => setViewMode('page');
    const onTabbedView   = () => setViewMode('tabs');

    const onNextTab = () => {
      if (!templateDetail) return;
      const sections = templateDetail.template.sections.filter((s: any) => isVisible(s.visibleWhen, answers));
      if (viewMode === 'tabs') {
        const idx = sections.findIndex((s: any) => s.id === (activeSectionId || sections[0]?.id));
        const next = sections[Math.min(idx + 1, sections.length - 1)];
        if (next) setActiveSectionId(next.id);
      } else {
        // Page mode — scroll to next section header
        const idx = sections.findIndex((s: any) =>
          sectionHeaderRefs.current[s.id] &&
          (sectionHeaderRefs.current[s.id]?.getBoundingClientRect().top ?? 0) > 10
        );
        const target = sections[idx >= 0 ? idx : 0];
        if (target) sectionHeaderRefs.current[target.id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    const onPreviousTab = () => {
      if (!templateDetail) return;
      const sections = templateDetail.template.sections.filter((s: any) => isVisible(s.visibleWhen, answers));
      if (viewMode === 'tabs') {
        const idx = sections.findIndex((s: any) => s.id === (activeSectionId || sections[0]?.id));
        const prev = sections[Math.max(idx - 1, 0)];
        if (prev) setActiveSectionId(prev.id);
      } else {
        // Page mode — scroll to previous section header above viewport
        const visible = sections.filter((s: any) =>
          (sectionHeaderRefs.current[s.id]?.getBoundingClientRect().top ?? 1) < 0
        );
        const target = visible[visible.length - 1];
        if (target) sectionHeaderRefs.current[target.id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    window.addEventListener('PATHSCRIBE_FULL_VIEW',    onFullView);
    window.addEventListener('PATHSCRIBE_TABBED_VIEW',  onTabbedView);
    window.addEventListener('PATHSCRIBE_NEXT_TAB',     onNextTab);
    window.addEventListener('PATHSCRIBE_PREVIOUS_TAB', onPreviousTab);
    return () => {
      window.removeEventListener('PATHSCRIBE_FULL_VIEW',    onFullView);
      window.removeEventListener('PATHSCRIBE_TABBED_VIEW',  onTabbedView);
      window.removeEventListener('PATHSCRIBE_NEXT_TAB',     onNextTab);
      window.removeEventListener('PATHSCRIBE_PREVIOUS_TAB', onPreviousTab);
    };
  }, [templateDetail, answers, viewMode, activeSectionId]);
  useEffect(() => {
    const handleNextUnanswered = () => {
      if (!templateDetail) return;
      const all: { fieldId: string; sectionId: string }[] = [];
      for (const sec of templateDetail.template.sections.filter((s: any) => isVisible(s.visibleWhen, answers)))
        for (const f of sec.fields)
          if (isVisible(f.visibleWhen, answers) && !synopticFieldComplete(f, answers))
            all.push({ fieldId: f.id, sectionId: sec.id });
      if (!all.length) return;
      const cur = all.findIndex(x => x.fieldId === lastJumpedFieldId.current);
      jumpToField(all[cur >= 0 && cur < all.length - 1 ? cur + 1 : 0].fieldId, all[cur >= 0 && cur < all.length - 1 ? cur + 1 : 0].sectionId);
    };
    const handleNextRequired = () => {
      if (!templateDetail) return;
      const all: { fieldId: string; sectionId: string }[] = [];
      for (const sec of templateDetail.template.sections.filter((s: any) => isVisible(s.visibleWhen, answers)))
        for (const f of sec.fields)
          if (isVisible(f.visibleWhen, answers) && synopticFieldMissing(f, answers))
            all.push({ fieldId: f.id, sectionId: sec.id });
      if (!all.length) return;
      const cur = all.findIndex(x => x.fieldId === lastJumpedFieldId.current);
      const next = all[cur >= 0 && cur < all.length - 1 ? cur + 1 : 0];
      jumpToField(next.fieldId, next.sectionId);
    };
    window.addEventListener('PATHSCRIBE_NEXT_UNANSWERED', handleNextUnanswered);
    window.addEventListener('PATHSCRIBE_NEXT_REQUIRED',   handleNextRequired);
    return () => {
      window.removeEventListener('PATHSCRIBE_NEXT_UNANSWERED', handleNextUnanswered);
      window.removeEventListener('PATHSCRIBE_NEXT_REQUIRED',   handleNextRequired);
    };
  }, [templateDetail, answers, jumpToField]); useSynopticEditField({ answersCommand: caseData?.reportingMode === 'assist', sections: templateDetail?.template.sections, answers, jumpToField });

  // ── Imperative handle ─────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    getUncertainRequiredFields(threshold?: number): ReviewField[] {
      const effectiveThreshold = threshold ?? confidenceThreshold ?? 75;
      if (!templateDetail) return [];
      const results: ReviewField[] = [];
      templateDetail.template.sections.forEach((sec: any) => {
        if (!isVisible(sec.visibleWhen, answers)) return;
        sec.fields.forEach((f: any) => {
          if (!f.required || !isVisible(f.visibleWhen, answers)) return;
          const sug = aiSuggestions[f.id];
          if (!sug || sug.verification !== 'unverified') return;
          // Real fix: previously only checked confidence, so a
          // high-confidence field whose source genuinely can't be
          // matched in the report text (see sourceTextMatching.ts)
          // sailed through this check untouched — and could then get
          // silently auto-confirmed at finalize with no human ever
          // having seen it. A confidently-wrong value is at least as
          // concerning as an honestly-uncertain one, not less.
          const belowConfidence = sug.confidence < effectiveThreshold;
          const sourceUnmatched = !matchSourceText(sug.source, caseData).found;
          if (!belowConfidence && !sourceUnmatched) return;
          results.push({
            fieldId: f.id, fieldLabel: f.label, sectionTitle: sec.title,
            aiValue: sug.value as string | string[],
            confidence: sug.confidence, source: sug.source ?? '', verification: sug.verification,
            sourceNotFound: sourceUnmatched,
          });
        });
      });
      return results.sort((a, b) => a.confidence - b.confidence);
    },

    getBlockingUnverifiedFields(): MissingRequiredField[] {
      if (!templateDetail) return [];
      const results: MissingRequiredField[] = [];
      templateDetail.template.sections.forEach((sec: any) => {
        if (!isVisible(sec.visibleWhen, answers)) return;
        sec.fields.forEach((f: any) => {
          if (!f.required || !isVisible(f.visibleWhen, answers)) return;
          const sug = aiSuggestions[f.id];
          if (!sug || sug.verification !== 'unverified') return;
          results.push({ sectionId: sec.id, sectionTitle: sec.title, fieldId: f.id, fieldLabel: f.label });
        });
      });
      return results;
    },

    omitFields(fieldIds: string[]) { setAnswers(prev => { const next = { ...prev }; fieldIds.forEach(id => { delete next[id]; }); return next; }); },

    setFieldVerification(fieldId: string, v: 'verified' | 'disputed') {
      setAiSuggestions(prev => {
        const sug = prev[fieldId];
        if (!sug) return prev;
        const next = { ...prev, [fieldId]: { ...sug, verification: v } };
        if (caseData && activeReportInstanceId) saveReportSuggestions(caseData.id, activeReportInstanceId, next);
        return next;
      });
    },

    validateRequired(): MissingRequiredField[] {
      if (!templateDetail) return [];
      const inst = getActiveReports(caseData).find(r => r.instanceId === activeReportInstanceId) as any;
      if (inst?.assignedTo && inst.assignedTo !== user?.id) {
        return [{
          sectionId: '__assignment__', sectionTitle: t('rightSynopticPanel.assignment.sectionTitle'),
          fieldId: '__assigned__',
          fieldLabel: t('rightSynopticPanel.assignment.fieldLabel', { name: inst.assignedToName ?? inst.assignedTo }),
        }];
      }
      const missing: MissingRequiredField[] = [];
      templateDetail.template.sections.forEach((sec: any) => {
        if (!isVisible(sec.visibleWhen, answers)) return;
        sec.fields.forEach((f: any) => {
          if (!isVisible(f.visibleWhen, answers)) return;
          if (synopticFieldMissing(f, answers)) missing.push({ sectionId: sec.id, sectionTitle: sec.title, fieldId: f.id, fieldLabel: f.label });
        });
      });
      return missing;
    },

    sweepAndGetFinalState() {
      // Nothing is auto-confirmed. Required fields with an unverified AI value are blocked upstream
      // (getBlockingUnverifiedFields); optional ones are left unverified, and Batch 691 leaves them out of the signed report.
      const finalSuggestions = { ...aiSuggestions };
      let explicitConfirmed = 0, overridden = 0, missed = 0, notFound = 0, leftUnverified = 0;
      Object.values(finalSuggestions).forEach(sug => {
        if (sug.verification === 'unverified') leftUnverified++;
        else if (sug.verification === 'verified') explicitConfirmed++;
        else if (sug.verification === 'disputed') overridden++;
      });
      if (templateDetail) {
        templateDetail.template.sections.forEach((sec: any) => {
          sec.fields.forEach((f: any) => {
            if (!finalSuggestions[f.id]) {
              const hasVal = synopticFieldAnswered(f, answers);
              if (hasVal) missed++; else notFound++;
            }
          });
        });
      }
      if (caseData && activeReportInstanceId) saveReportSuggestions(caseData.id, activeReportInstanceId, finalSuggestions);
      return { answers, aiSuggestions: finalSuggestions, verificationSummary: { explicitConfirmed, overridden, missed, notFound, leftUnverified } };
    },
  }), [aiSuggestions, answers, templateDetail, caseData, activeReportInstanceId, confidenceThreshold, getActiveReports, user?.id, t]);

  // ── Scroll to missing field ───────────────────────────────────────────────
  // `scrollToField` historically only worked as a truthy TRIGGER, not an
  // actual field ID — any value (including a real field ID passed by a
  // caller expecting targeted navigation) fell through to "jump to
  // whatever the first unanswered required field is," ignoring the value
  // entirely. That's correct behavior for the legacy
  // 'scroll_to_unanswered' sentinel (used by the "Click to review →" alert
  // banner, which genuinely means "first missing required field, whichever
  // one that is") but silently wrong for any caller passing a specific
  // field ID expecting to land on THAT field — e.g. the AI confidence
  // badge's "click to review the flagged field," which always landed on
  // the first unanswered required field instead, regardless of which
  // field was actually flagged.
  useEffect(() => {
    if (!scrollToField || !templateDetail) return;

    if (scrollToField !== 'scroll_to_unanswered') {
      // Treat as a real field ID — jump to that specific field, wherever
      // it lives, using the same pulse/focus/scroll behavior as every
      // other targeted jump (jumpToField) rather than a one-off outline.
      for (const sec of templateDetail.template.sections) {
        if (!isVisible(sec.visibleWhen, answers)) continue;
        const match = sec.fields.find((f: any) => f.id === scrollToField);
        if (match) {
          jumpToField(match.id, sec.id);
          onScrollComplete?.();
          return;
        }
      }
      // ID not found (stale reference, template changed since the badge
      // computed it, etc.) — fall through to the legacy behavior below
      // rather than silently doing nothing.
    }

    for (const sec of templateDetail.template.sections) {
      if (!isVisible(sec.visibleWhen, answers)) continue;
      const hasUnanswered = sec.fields.some((f: any) => isVisible(f.visibleWhen, answers) && synopticFieldMissing(f, answers));
      if (hasUnanswered) {
        setActiveSectionId(sec.id);
        setTimeout(() => {
          const firstReqField = sec.fields.find((f: any) => isVisible(f.visibleWhen, answers) && synopticFieldMissing(f, answers));
          if (firstReqField) {
            const el = fieldRefs.current[firstReqField.id];
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.style.outline = '2px solid #f59e0b';
              el.style.outlineOffset = '3px';
              setTimeout(() => { if (el) { el.style.outline = ''; el.style.outlineOffset = ''; } }, 2000);
            }
          }
          onScrollComplete?.();
        }, 150);
        break;
      }
    }
  }, [scrollToField]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load template list ────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!caseData) return;
      try {
        const approved = await listTemplatesCached('published');
        if (cancelled) return;
        // Real fix, per direct report: "I selected one of the other
        // templates and it did not return the synoptic report
        // structure." Traced to getTemplate()'s own fallback — a
        // registry entry with no matching editorStore content
        // silently resolves to an empty sections: [] template,
        // regardless of what the registry's own `fields` count claims.
        // Confirmed this is exactly the shape of the two 'TEST'-category
        // registry entries ('Generic Synoptic Test Form -- Basic'/
        // '-- Complex') — registered for browsing/admin purposes per
        // protocolShared.tsx's own comment ("non-clinical test
        // templates"), never given real content, never meant to be
        // selectable by a pathologist reporting on a real case.
        // Filtered here, not fixed by inventing fake content for them —
        // a live-tested, empty template would still be worth catching
        // for any future 'TEST'-category entry, not just these two.
        setAvailableTemplates(
          approved
            .filter((p: any) => offeredOnCasePicker(p)) // Batch 755b: also leaves out the unused demo checklists
            .map((p: any) => ({ id: p.id, name: p.name, source: p.source, version: p.version, category: p.category }))
        );
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [initialCaseData?.id, caseData]);

  // ── Load active report + template ─────────────────────────────────────────
  // Batch 579: a re-read for the same report (the page took up someone else's version, `reloadKey`) keeps the
  // section open if the template still has it; opening another report starts at its first section as before.
  const loadedForRef = useRef<{ reportKey: string; reloadKey: number } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const reportKey = `${initialCaseData?.id ?? ''}|${activeReportType}|${activeReportInstanceId ?? ''}`;
    const isReRead = loadedForRef.current?.reportKey === reportKey && loadedForRef.current.reloadKey !== reloadKey;
    loadedForRef.current = { reportKey, reloadKey };
    (async () => {
      if (!caseData) { setLoading(false); return; }
      setLoading(true); setError(null);
      try {
        let templateId: string | undefined;
        let answersToLoad: Record<string, string | string[]> = {};
        let activeInst: any = null;

        if (activeReportInstanceId && getActiveReports(caseData).length) {
          const inst = getActiveReports(caseData).find(r => r.instanceId === activeReportInstanceId);
          if (inst) { templateId = inst.templateId; answersToLoad = inst.answers ?? {}; activeInst = inst; }
        } else if (getActiveReports(caseData).length) {
          const first = getActiveReports(caseData)[0];
          templateId = first.templateId; answersToLoad = first.answers ?? {}; activeInst = first;
        } else if (caseData.synopticTemplateId) {
          templateId = caseData.synopticTemplateId;
          answersToLoad = caseData.synopticAnswers ?? {};
        }

        if (templateId) {
          const rawDetail = await getTemplateCached(templateId);
          if (cancelled) return;
          // Real, per direct guidance's own confirmed organ-driven
          // section visibility — filters the loaded template's own
          // sections down to only those active for this case's real
          // specimens. Scoped internally to category === 'AUTOPSY'
          // only; every other real template passes through this call
          // completely unaffected. Never mutates the shared template
          // cache getTemplateCached() itself returns.
          const detail = rawDetail
            ? { ...rawDetail, template: filterAutopsyTemplateToActiveSections(rawDetail.template, caseData.specimens ?? []) }
            : rawDetail;

          const suggestions: Record<string, AiSuggestion> = (activeInst as any)?.aiSuggestions ?? {};
          updateAiSuggestions(suggestions);

          // Gate pre-fill on autoInsertSuggestions setting:
          // false (default) = fields stay blank, pathologist clicks Confirm per field
          // true            = values above threshold auto-fill into answer fields
          // Batch 689: the shared helper fills empty fields only; the fill is audited once, outside the updater.
          const auto = autoInsertSuggestions ? applyAiAutoFill(answersToLoad, suggestions, confidenceThreshold || 75) : { answers: { ...answersToLoad }, filled: [] as string[] };
          recordAiAutoFill(auditService, auto.filled.length, 'page-load', { caseId: initialCaseData?.id ?? null, userName: user?.name ?? '' });
          setAnswers(() => {
            const prefilled = auto.answers;
            // Always update the ref on report switch so the propagation effect
            // doesn't fire spuriously with stale data from the previous report.
            loadedAnswersRef.current = JSON.stringify(prefilled);
            return prefilled;
          });

          setTemplateDetail(detail);
          if (detail.template.sections.length > 0) {
            const first = detail.template.sections[0].id;
            setActiveSectionId(prev => (isReRead && detail.template.sections.some(sec => sec.id === prev) ? prev : first));
          }
        } else {
          if (cancelled) return;
          updateAiSuggestions({});
          setAnswers(() => answersToLoad);
          loadedAnswersRef.current = JSON.stringify(answersToLoad);
          setTemplateDetail(null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? t('rightSynopticPanel.loadFailedFallback'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [initialCaseData?.id, initialCaseData?.synopticTemplateId, initialCaseData?.synopticReports?.length, (initialCaseData as any)?.grossingReports?.length, activeReportInstanceId, activeReportType, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── setAnswer ─────────────────────────────────────────────────────────────
  // ── Regenerate AI suggestions from the current Gross description ──────────
  // Triggered by the "⚡ Orchestrator" pill. Non-destructive by design,
  // same convention as the initial-load prefill above: aiSuggestions
  // always gets the fresh result (so Confirm/Override badges update to
  // reflect it), but answers only gets touched for fields that are
  // still empty AND autoInsertSuggestions is on — a field the
  // pathologist already typed into, confirmed, or overrode is never
  // silently replaced.
  const handleRegenerateFromGross = useCallback(async () => {
    if (!caseData || !activeReportInstanceId || !templateDetail || isRegenerating) return;
    const inst = getActiveReports(caseData).find(r => r.instanceId === activeReportInstanceId);
    if (!inst) return;

    setIsRegenerating(true);
    try {
      const allFields = templateDetail.template.sections.flatMap((s: EditorSection) => s.fields);
      const { generateAiSuggestionsForReport } = await import('@/services');
      const suggestions = await generateAiSuggestionsForReport(
        caseData, inst.templateId, allFields, computationalResults
      );

      updateAiSuggestions(suggestions as any);

      let nextAnswers: Record<string, string | string[]> = {};
      // An explicit click, so not gated behind Auto-insert; still respects the threshold and never touches
      // a field that has a value. Batch 689: the fill is audited; the values stay unverified until confirmed.
      let filledCount = 0;
      setAnswers(prev => {
        const { answers: next, filled } = applyAiAutoFill(prev, suggestions as never, confidenceThreshold || 75);
        filledCount = filled.length;
        nextAnswers = next;
        return next;
      });
      recordAiAutoFill(auditService, filledCount, 'regenerate-from-gross', { caseId: caseData.id, userName: user?.name ?? '' });

      // Persist so the regenerated suggestions AND newly-filled answers
      // survive navigation/reload.
      const idx = getActiveReports(caseData).findIndex(r => r.instanceId === activeReportInstanceId);
      if (idx >= 0) {
        const reports = [...getActiveReports(caseData)];
        reports[idx] = { ...reports[idx], aiSuggestions: suggestions, answers: nextAnswers } as any;
        onCaseUpdate?.({ ...caseData, [activeReportsKey]: reports } as any);
      }
    } catch (e) {
      console.error('[RightSynopticPanel] Regenerate from Gross failed:', e);
    } finally {
      setIsRegenerating(false);
    }
  }, [caseData, activeReportInstanceId, templateDetail, isRegenerating, computationalResults, confidenceThreshold, onCaseUpdate, user?.name, updateAiSuggestions, activeReportsKey, getActiveReports]);

  const setAnswer = useCallback((fieldId: string, value: string | string[]) => {
    setAnswers(prev => {
      const next = { ...prev, [fieldId]: value };
      // Real, per direct follow-up: "it all needs to be wired" —
      // calculateAutopsyBodyMassIndex.ts had no real rendering-layer
      // wiring at all, despite the Autopsy Grossing Synoptic's own
      // spec explicitly calling for it ("Body Mass Index: [Auto-
      // Calculated kg/m\u00b2]"). Scoped naturally to only the Autopsy
      // template's own field ids \u2014 setAnswer is genuinely shared
      // across every real template, so this only ever does anything
      // when body_weight_kg/body_length_cm are actually present,
      // which no other real template's own fields happen to be
      // named. Recomputed on every real change to either input,
      // including recomputing to undefined (cleared) if either
      // input becomes blank/invalid \u2014 never leaves a stale BMI
      // behind a since-changed weight or height.
      if (fieldId === 'body_weight_kg' || fieldId === 'body_length_cm') {
        const weightKg = parseFloat(String(next.body_weight_kg ?? ''));
        const heightCm = parseFloat(String(next.body_length_cm ?? ''));
        const bmi = calculateAutopsyBodyMassIndex(weightKg, heightCm);
        if (bmi !== undefined) next.body_mass_index = bmi.toFixed(1);
        else delete next.body_mass_index;
      }
      templateDetail?.template.sections.forEach((sec: EditorSection) => {
        if (!isVisible(sec.visibleWhen, next)) sec.fields.forEach((f: EditorField) => clearSynopticFieldAnswers(f, next));
        else sec.fields.forEach((f: EditorField) => { if (!isVisible(f.visibleWhen, next)) clearSynopticFieldAnswers(f, next); });
      });
      return next;
    });

    // Record 'missed' feedback when user fills a field AI had no suggestion for
    if (!aiSuggestions[fieldId] && Object.keys(aiSuggestions).length > 0) {
      const hasVal = Array.isArray(value) ? value.length > 0 : value !== '';
      if (hasVal) {
        const fieldLabel = templateDetail?.template.sections
          .flatMap((s: EditorSection) => s.fields)
          .find((f: EditorField) => f.id === fieldId)?.label ?? fieldId;
        recordAiFeedback({
          timestamp: new Date().toISOString(), caseId: caseData?.id ?? '',
          instanceId: activeReportInstanceId ?? '', templateId: templateDetail?.template.id ?? '',
          fieldId, fieldLabel, aiValue: '', aiConfidence: 0, userValue: value,
          action: 'missed', source: 'AI had no suggestion for this field',
          userId: user?.id, userName: user?.name,
        });
      }
    }

    // Detect override vs revert-to-AI
    setAiSuggestions(prev => {
      const sug = prev[fieldId];
      if (!sug) return prev;
      const sugVal = Array.isArray(sug.value) ? sug.value.join(',') : String(sug.value);
      const newVal = Array.isArray(value) ? value.join(',') : String(value);
      const changed = sugVal !== newVal;
      let nextVerification = sug.verification;
      if (sug.verification === 'unverified' && changed) nextVerification = 'disputed';
      else if (sug.verification === 'disputed' && !changed) nextVerification = 'unverified';
      if (nextVerification === sug.verification) return prev;
      const nextSuggestions = { ...prev, [fieldId]: { ...sug, verification: nextVerification } };
      if (caseData && activeReportInstanceId) saveReportSuggestions(caseData.id, activeReportInstanceId, nextSuggestions);
      if (nextVerification === 'disputed') {
        const fieldLabel = templateDetail?.template.sections
          .flatMap((s: EditorSection) => s.fields)
          .find((f: EditorField) => f.id === fieldId)?.label ?? fieldId;
        recordAiFeedback({
          timestamp: new Date().toISOString(), caseId: caseData?.id ?? '',
          instanceId: activeReportInstanceId ?? '', templateId: templateDetail?.template.id ?? '',
          fieldId, fieldLabel, aiValue: sug.value, aiConfidence: sug.confidence,
          userValue: value, action: 'overridden', source: sug.source,
          userId: user?.id, userName: user?.name,
        });
      }
      return nextSuggestions;
    });
  }, [templateDetail, caseData, activeReportInstanceId, aiSuggestions, user]);

  // Batch 463: a change of several answers at once (the Mohs stage question), then the same clean-up as setAnswer.
  const applyPatch = useCallback((patch: AnswerPatchOrUpdate) => {
    setAnswers(prev => {
      const next = applyAnswerPatch(prev, patch) as Record<string, string | string[]>;
      templateDetail?.template.sections.forEach((sec: EditorSection) => {
        if (!isVisible(sec.visibleWhen, next)) sec.fields.forEach((f: EditorField) => clearSynopticFieldAnswers(f, next));
        else sec.fields.forEach((f: EditorField) => { if (!isVisible(f.visibleWhen, next)) clearSynopticFieldAnswers(f, next); });
      });
      return next;
    });
  }, [templateDetail]);

  // Batch 465b (Pete): totals calculated from their grid (the neck's nodes positive and examined), kept in step
  // whatever changed the answers — typing, an AI suggestion confirmed or auto-inserted, the report loading. Only
  // the questions shown are filled (a hidden total stays cleared).
  useEffect(() => {
    const sections = templateDetail?.template.sections;
    if (!sections) return;
    const patch = computedSumPatch(shownSynopticFields(sections as never, answers) as never, answers, partGridRowsOf(caseData?.specimens));
    if (Object.keys(patch).length) setAnswers(prev => ({ ...prev, ...patch }));
  }, [answers, templateDetail, caseData?.specimens]);

  // Batch 463: the facility's map colours, for the Mohs stage canvas.
  const [mapScheme, setMapScheme] = useState<OrganMapScheme>(BUILT_IN_ORGAN_MAP_SCHEME);
  const mapFacilityId = initialCaseData?.order?.facilityId ?? null;
  useEffect(() => {
    let cancelled = false;
    void loadOrganMapScheme(mapFacilityId).then(r => { if (!cancelled) setMapScheme(r.scheme); }).catch(() => {});
    return () => { cancelled = true; };
  }, [mapFacilityId]);

  // Batch 466b (Pete: derive the form from the map): the template's generic margin questions follow the map's
  // margin questions — calculated whatever changed the answers, and locked.
  const [mapContext, setMapContext] = useState<OrganMapContext | null>(null);
  const mapTemplateId = templateDetail?.template.id;
  useEffect(() => {
    let cancelled = false;
    // A new template: the old one's binding never applies to its answers.
    setMapContext(null);
    if (!mapTemplateId) return;
    void loadOrganMapContext({ templateId: mapTemplateId, facilityId: mapFacilityId }).then(c => { if (!cancelled) setMapContext(c); }).catch(() => {});
    return () => { cancelled = true; };
  }, [mapTemplateId, mapFacilityId]);
  const currentMapContext = mapContext && mapContext.template?.id === mapTemplateId ? mapContext : null;
  const derivedIds = derivedFieldIds(currentMapContext?.binding);
  useEffect(() => {
    const sections = templateDetail?.template.sections;
    if (!sections || !currentMapContext?.binding?.derived) return;
    const patch = derivedMarginAnswers({
      binding: currentMapContext.binding, answers, fields: shownSynopticFields(sections as never, answers) as never,
      scheme: currentMapContext.scheme.scheme, thresholds: currentMapContext.scheme.thresholds, rows: partGridRowsOf(caseData?.specimens),
    });
    // Through applyPatch, so questions that depend on the margin status are shown or cleared as usual.
    if (Object.keys(patch).length) applyPatch(patch);
  }, [answers, templateDetail, currentMapContext, caseData?.specimens, applyPatch]);

  // ── handleVerify ──────────────────────────────────────────────────────────
  const handleVerify = useCallback((fieldId: string, v: 'verified' | 'disputed') => {
    setAiSuggestions(prev => {
      const sug = prev[fieldId];
      if (!sug) return prev;
      const nextSuggestions = { ...prev, [fieldId]: { ...sug, verification: v } };
      // Confirm: snap answer back to AI value
      if (v === 'verified') setAnswers(ans => ({ ...ans, [fieldId]: sug.value as string | string[] }));
      if (caseData && activeReportInstanceId) saveReportSuggestions(caseData.id, activeReportInstanceId, nextSuggestions);
      const field = templateDetail?.template.sections
        .flatMap((s: EditorSection) => s.fields)
        .find((f: EditorField) => f.id === fieldId);
      const fieldLabel = field?.label ?? fieldId;
      recordAiFeedback({
        timestamp: new Date().toISOString(), caseId: caseData?.id ?? '',
        instanceId: activeReportInstanceId ?? '', templateId: templateDetail?.template.id ?? '',
        fieldId, fieldLabel, aiValue: sug.value, aiConfidence: sug.confidence,
        userValue: v === 'verified' ? sug.value : (answers[fieldId] ?? sug.value),
        action: v === 'verified' ? 'confirmed' : 'overridden', source: sug.source,
        userId: user?.id, userName: user?.name,
      });
      // Real, per direct guidance: "AI will suggest selections to the
      // synoptic report. The Pathologist approve the selection... at
      // that point, the related codes are applied to the case." This
      // is that real, missing wiring — see resolveEmbeddedCoding.ts's
      // own header for the full account. Only ever on 'verified' —
      // disputing a field never touches any previously-applied code;
      // that stays the pathologist's own, explicit act via Code
      // Manager's existing remove action, never an automatic reversal.
      if (v === 'verified' && field && caseData) {
        const embedded = resolveEmbeddedCodesForAnswer(field, sug.value);
        if (embedded.length > 0 && activeSpecimenId) {
          const updatedSpecimens = appendEmbeddedCodesToSpecimen(caseData.specimens ?? [], activeSpecimenId, embedded);
          onCaseUpdate?.({ ...caseData, specimens: updatedSpecimens } as any);
        }
      }
      return nextSuggestions;
    });
  }, [caseData, activeReportInstanceId, templateDetail, answers, user, activeSpecimenId, onCaseUpdate]);
  // PS-66: the Confirm Field shortcut (Ctrl+Alt+Shift+A) sends this event.
  useEffect(() => {
    const onConfirmField = () => {
      const id = resolveFieldToConfirm(lastJumpedFieldId.current, activeFieldId, aiSuggestions);
      if (id) handleVerify(id, 'verified');
    };
    window.addEventListener('PATHSCRIBE_CONFIRM_FIELD', onConfirmField);
    return () => window.removeEventListener('PATHSCRIBE_CONFIRM_FIELD', onConfirmField);
  }, [activeFieldId, aiSuggestions, handleVerify]);


  // Batch 426: "keep or update?" for a re-evaluated field (services/assistPolling/assistMilestoneRules.ts).
  const activeInstance = getActiveReports(caseData).find(r => r.instanceId === activeReportInstanceId) as SynopticReportInstance | undefined;
  const activeReevaluations: Record<string, PendingReevaluation> = activeInstance?.reevaluations ?? {};
  const handleReevaluation = useCallback((fieldId: string, choice: 'keep' | 'accept') => {
    if (!caseData || !activeInstance) return;
    const next = resolveReevaluation({ ...activeInstance, answers }, fieldId, choice);
    if (choice === 'accept') {
      setAnswers(next.answers);
      setAiSuggestions(next.aiSuggestions ?? {});
      saveReportSuggestions(caseData.id, activeInstance.instanceId, next.aiSuggestions ?? {});
    }
    const reports = getActiveReports(caseData).map(r => (r.instanceId === activeInstance.instanceId ? { ...next, updatedAt: new Date().toISOString() } : r));
    onCaseUpdate?.({ ...caseData, [activeReportsKey]: reports, updatedAt: new Date().toISOString() } as any);
  }, [caseData, activeInstance, answers, getActiveReports, onCaseUpdate, activeReportsKey]);

  // ── Early returns ─────────────────────────────────────────────────────────
  if (loading) return (
    <LoadingState label={t('rightSynopticPanel.loading')} />
  );
  if (error) return <div className="ps-syn-error">{error}</div>;
  if (!caseData) return <div className="ps-syn-empty-case">{t('rightSynopticPanel.noCaseLoaded')}</div>;
  if (!templateDetail) return (
    <TemplatePicker
      templates={availableTemplates}
      specimenDescriptions={(caseData?.specimens ?? []).map(s => s.description ?? '')}
      activeSpecimenLabel={caseData?.specimens?.find(s => s.id === activeSpecimenId)?.label}
      onSelect={async id => {
      const rawDetail = await getTemplateCached(id);
      // Real, same organ-driven section-visibility filter as the
      // main load effect above — this is the manual "pick a new
      // template" path (Add Synoptic), which needs the identical
      // treatment so a freshly-assigned Autopsy template also opens
      // pre-filtered to the case's real specimens, not every section.
      const detail = rawDetail
        ? { ...rawDetail, template: filterAutopsyTemplateToActiveSections(rawDetail.template, caseData.specimens ?? []) }
        : rawDetail;
      // Real fix, per direct report: "it has the attached synoptic
      // report attached to the specimen, why is it not displaying the
      // template?" Traced precisely — this previously wrote to
      // synopticTemplateId/synopticAnswers, singular case-level fields
      // nothing else in the app actually reads. The real, correct
      // model is the per-specimen synopticReports[] array (see
      // SynopticReportInstance in types/case/Case.ts) — every other
      // creation path (AddSynopticModal → handleAddSynopticReports)
      // already builds a real instance and appends it there. This is
      // that same shape, so a case loaded fresh finds it the same way
      // regardless of which path created it.
      const selectedOption = availableTemplates.find(opt => opt.id === id);
      const newInstanceId = `${activeSpecimenId ?? caseData.id}_${id}_${Date.now().toString(36)}`;
      const newInstance = {
        instanceId: newInstanceId,
        specimenId: activeSpecimenId ?? '',
        templateId: id,
        templateName: selectedOption?.name ?? detail.template.name ?? id,
        status: 'draft' as const,
        answers: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      onCaseUpdate?.({
        ...caseData,
        synopticReports: [...(caseData.synopticReports ?? []), newInstance],
      } as Case);
      onReportInstanceChange?.(newInstanceId);
      setTemplateDetail(detail);
      setAnswers({});
      updateAiSuggestions({});
      if (detail.template.sections.length > 0) setActiveSectionId(detail.template.sections[0].id);
      // Microscopic-Driven AI toggle (Config → AI Behavior) — same gap as
      // Gross-Driven AI: persisted correctly, read by nothing. Wired here
      // rather than call generateAiSuggestionsForReport unconditionally.
      if (microscopicAiEnabled) {
        const allFields = detail.template.sections.flatMap((s: any) => s.fields);
        const suggestions = await generateAiSuggestionsForReport(caseData, id, allFields, computationalResults);
        if (Object.keys(suggestions).length > 0) {
          updateAiSuggestions(suggestions);
          setAnswers(prev => {
            const prefilled = { ...prev };
            Object.entries(suggestions).forEach(([fieldId, sug]) => {
              if (!prefilled[fieldId]) prefilled[fieldId] = sug.value as string | string[];
            });
            return prefilled;
          });
        }
      }
    }} />
  );

  // ── Derived values ────────────────────────────────────────────────────────
  const template = templateDetail.template;
  // Batch 467: questions answered from (or differing from) an in-house molecular result (services/templates).
  const molecularInstance = getActiveReports(caseData).find(r => r.instanceId === activeReportInstanceId) as SynopticReportInstance | undefined;
  const molecularFieldState = (fieldId: string): FieldRowProps['molecular'] => {
    const n = molecularFieldNotice(template as never, answers, molecularInstance?.resultSources, fieldId);
    if (!n) return undefined;
    const delta = n.delta;
    return { assayName: n.assayName, orderId: n.orderId, ...(delta ? { delta: { resultLabel: delta.resultLabel, onAccept: () => setAnswer(fieldId, delta.answer) } } : {}) };
  };
  const visibleSections = template.sections.filter((s: EditorSection) => isVisible(s.visibleWhen, answers));
  const activeSection = visibleSections.find((s: EditorSection) => s.id === activeSectionId) ?? visibleSections[0];

  let total = 0, answered = 0, reqTotal = 0, reqAnswered = 0, unverifiedCount = 0;
  visibleSections.forEach((s: EditorSection) => s.fields.forEach((f: EditorField) => {
    if (!isVisible(f.visibleWhen, answers)) return;
    total++;
    const has = synopticFieldComplete(f, answers);
    if (has) answered++;
    if (f.required) { reqTotal++; if (has) reqAnswered++; }
    // "Unverified" here means genuinely reviewable: an AI suggestion
    // exists (a human could actually look at something) and it hasn't
    // been explicitly confirmed or overridden yet. A field with no AI
    // suggestion at all isn't "unverified" in any meaningful sense —
    // there's nothing to review.
    if (aiSuggestions[f.id] && aiSuggestions[f.id].verification === 'unverified') unverifiedCount++;
  }));

  const gridRows = partGridRowsOf(caseData.specimens);
  const marginInkEntries = collectMarginInk(caseData.specimens);

  // ── Section fields renderer ───────────────────────────────────────────────
  const SectionFields = (sec: EditorSection) => (
    <div className="ps-syn-section-fields">
      {sec.fields
        .filter((f: EditorField) => isVisible(f.visibleWhen, answers))
        .map((f: EditorField) => {
          const sug = aiSuggestions[f.id];
          const aboveThreshold = sug && (sug.confidence ?? 0) >= confidenceThreshold;
          const belowThresh = sug && !aboveThreshold;
          return (
            <FieldRow
              key={f.id}
              field={f}
              value={answers[f.id] ?? ''}
              onChange={setAnswer}
              answers={f.type === 'partGrid' || f.type === 'spatialStageCanvas' ? answers : undefined}
              mohs={f.type === 'spatialStageCanvas' ? { scheme: mapScheme, defaultHistology: mohsDefaultHistology(template, f, answers), onPatch: applyPatch } : undefined}
              gridRows={f.type === 'partGrid' ? partGridRowsForField(f as never, gridRows) : undefined}
              derivedFromMap={derivedIds.includes(f.id)}
              marginInk={inkForMarginLabel(marginInkEntries, f.label)}
              molecular={molecularFieldState(f.id)}
              exceeds={fieldExceedsProblem(f as never, answers) ?? textNodeCountExceeds(f as never, answers)}
              belowSum={nodeCountBelowSum(f as never, answers)}
              sumTotal={f.sumOf ? sumOfTotal(f as never, template.sections.flatMap((s: EditorSection) => s.fields) as never, answers, gridRows) : undefined}
              // Previously: `aboveThreshold ? sug : undefined` — stripped
              // the suggestion entirely for low-confidence fields, which
              // also strips the Confirm/Override buttons (they're gated on
              // `aiSuggestion` being present inside FieldRow). That left
              // exactly the fields most in need of an explicit human
              // decision with no way to record one — only a passive
              // warning badge. Pass the suggestion through unconditionally
              // so low-confidence fields get the warning badge AND the
              // Confirm/Override buttons together, not instead of them.
              // Batch 466b: a question calculated from the map takes no AI suggestion (it can't be confirmed or overridden).
              aiSuggestion={derivedIds.includes(f.id) ? undefined : sug}
              belowThreshold={!!belowThresh}
              belowThresholdSource={belowThresh ? sug!.source : undefined}
              onVerify={handleVerify}
              isActive={activeFieldId === f.id}
              sourceNotFound={activeFieldId === f.id && !!highlightNotFound}
              isPulsing={pulsingFieldId === f.id}
              reevaluation={activeReevaluations[f.id]}
              onReevaluation={handleReevaluation}
              fieldRef={el => { fieldRefs.current[f.id] = el; }}
              // Real fix, per direct report: "AI badges on an empty
              // Grossing Template doesn't make sense, only when we
              // are in Gross Dictation mode is it relevant."
              // Confirmed directly: this was checking whether AI had
              // run ANYWHERE in the whole form (Object.keys(
              // aiSuggestions).length > 0), not whether it had run
              // for THIS section's own fields — so as soon as AI
              // touched even one field in a completely different
              // section, every still-empty field here would
              // incorrectly show "AI: not found", even before real
              // Gross dictation had ever started. Scoped to this
              // section's own fields — the same real bug would have
              // affected Micro/Diagnosis too, not just Gross.
              aiAttempted={sec.fields.some((sf: EditorField) => sf.id in aiSuggestions)}
              onLabelClick={() => {
                setActiveFieldId(f.id);
                lastJumpedFieldId.current = f.id;
                onHighlight?.(sug?.source ?? null);
              }}
              onFieldFocus={fid => { lastJumpedFieldId.current = fid; }}
            />
          );
        })}
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="ps-syn-panel">
      <div className="ps-syn-panel-head">

        {/* Header row */}
        <div className="ps-syn-header-row">
          <h3 className="ps-syn-template-name">
            📝 {template.name}<DemoWordingTag templateId={template.id} />
          </h3>
          <div className="ps-syn-header-actions">
            {/* Assignment badge */}
            {(() => {
              const inst = getActiveReports(caseData).find(r => r.instanceId === activeReportInstanceId) as any;
              if (!inst?.assignedTo) return null;
              const isAssignee = inst.assignedTo === user?.id;
              return (
                <span className={`ps-syn-assign-badge${isAssignee ? ' ps-syn-assign-badge--assignee' : ' ps-syn-assign-badge--other'}`}>
                  {isAssignee ? t('rightSynopticPanel.header.assignedToYou') : t('rightSynopticPanel.header.assignedToOther', { name: inst.assignedToName ?? inst.assignedTo })}
                  {inst.requiresCountersign && !isAssignee ? ` · ${t('rightSynopticPanel.header.countersignRequiredSuffix')}` : ''}
                </span>
              );
            })()}
            {orchestratorMode && (
              <button
                onClick={handleRegenerateFromGross}
                disabled={isRegenerating || !templateDetail}
                title={
                  !templateDetail
                    ? t('rightSynopticPanel.header.orchestratorTitleDisabled')
                    : t('rightSynopticPanel.header.orchestratorTitleEnabled')
                }
                className={`ps-syn-orch-btn${isRegenerating || !templateDetail ? ' ps-syn-orch-btn--disabled' : ''}`}
              >
                {isRegenerating ? t('rightSynopticPanel.header.orchestratorGenerating') : t('rightSynopticPanel.header.orchestratorButton')}
              </button>
            )}
            {/* Progress badge */}
            <span className={`ps-syn-progress-badge${reqAnswered === reqTotal ? ' ps-syn-progress-badge--complete' : ' ps-syn-progress-badge--incomplete'}`}>
              <span>{t('rightSynopticPanel.header.progressBadge', { reqAnswered, reqTotal, answered, total })}</span>
              <span className="ps-syn-progress-track">
                <span
                  className={`ps-syn-progress-fill${reqAnswered === reqTotal ? ' ps-syn-progress-fill--complete' : ' ps-syn-progress-fill--incomplete'}`}
                  style={{ '--syn-progress-pct': `${reqTotal > 0 ? (reqAnswered / reqTotal) * 100 : 0}%` } as React.CSSProperties}
                />
              </span>
            </span>
          </div>
        </div>

        {/* Jump-to bar */}
        <div className="ps-syn-jumpbar">
          <span className="ps-syn-jumpbar-label">{t('rightSynopticPanel.jumpBar.label')}</span>
          <button
            onClick={jumpBack}
            disabled={jumpHistoryLength === 0}
            className={`ps-syn-jump-back-btn${jumpHistoryLength > 0 ? ' ps-syn-jump-back-btn--enabled' : ''}`}
            title={jumpHistoryLength > 0 ? t('rightSynopticPanel.jumpBar.backTitleEnabled') : t('rightSynopticPanel.jumpBar.backTitleDisabled')}
          >
            {t('rightSynopticPanel.jumpBar.backButton')}
          </button>
          <button
            onClick={() => {
              const all: { fieldId: string; sectionId: string }[] = [];
              for (const sec of visibleSections)
                for (const f of sec.fields)
                  if (isVisible(f.visibleWhen, answers) && !synopticFieldComplete(f, answers))
                    all.push({ fieldId: f.id, sectionId: sec.id });
              if (!all.length) return;
              const cur = all.findIndex(x => x.fieldId === lastJumpedFieldId.current);
              const next = all[cur >= 0 && cur < all.length - 1 ? cur + 1 : 0];
              jumpToField(next.fieldId, next.sectionId);
            }}
            className="ps-syn-jump-next-btn"
          >
            {t('rightSynopticPanel.jumpBar.nextUnansweredLabel')} {total - answered > 0 ? `(${total - answered})` : '✓'}
          </button>
          <button
            onClick={() => {
              const all: { fieldId: string; sectionId: string }[] = [];
              for (const sec of visibleSections)
                for (const f of sec.fields)
                  if (isVisible(f.visibleWhen, answers) && synopticFieldMissing(f, answers))
                    all.push({ fieldId: f.id, sectionId: sec.id });
              if (!all.length) return;
              const cur = all.findIndex(x => x.fieldId === lastJumpedFieldId.current);
              const next = all[cur >= 0 && cur < all.length - 1 ? cur + 1 : 0];
              jumpToField(next.fieldId, next.sectionId);
            }}
            className={`ps-syn-jump-required-btn${reqAnswered < reqTotal ? ' ps-syn-jump-required-btn--pending' : ' ps-syn-jump-required-btn--done'}`}
          >
            {t('rightSynopticPanel.jumpBar.nextRequiredLabel')} {reqTotal - reqAnswered > 0 ? `(${reqTotal - reqAnswered})` : '✓'}
          </button>
          <button
            onClick={() => {
              const all: { fieldId: string; sectionId: string }[] = [];
              for (const sec of visibleSections)
                for (const f of sec.fields)
                  if (isVisible(f.visibleWhen, answers) && aiSuggestions[f.id] && aiSuggestions[f.id].verification === 'unverified')
                    all.push({ fieldId: f.id, sectionId: sec.id });
              if (!all.length) return;
              const cur = all.findIndex(x => x.fieldId === lastJumpedFieldId.current);
              const next = all[cur >= 0 && cur < all.length - 1 ? cur + 1 : 0];
              jumpToField(next.fieldId, next.sectionId);
            }}
            className={`ps-syn-jump-unverified-btn${unverifiedCount > 0 ? ' ps-syn-jump-unverified-btn--pending' : ' ps-syn-jump-unverified-btn--done'}`}
            title={t('rightSynopticPanel.jumpBar.unverifiedTitle')}
          >
            {t('rightSynopticPanel.jumpBar.nextUnverifiedLabel')} {unverifiedCount > 0 ? `(${unverifiedCount})` : '✓'}
          </button>
        </div>

        {/* Section tabs + view mode toggle */}
        <div className="ps-syn-tabsrow">
          {/* Toggle button */}
          <div className="ps-syn-viewtoggle">
            <button
              onClick={() => setViewMode('tabs')}
              title={t('rightSynopticPanel.viewToggle.tabsTitle')}
              className={`ps-syn-viewtoggle-btn${viewMode === 'tabs' ? ' ps-syn-viewtoggle-btn--active' : ''}`}
            >
              {t('rightSynopticPanel.viewToggle.tabsButton')}
            </button>
            <button
              onClick={() => setViewMode('page')}
              title={t('rightSynopticPanel.viewToggle.pageTitle')}
              className={`ps-syn-viewtoggle-btn ps-syn-viewtoggle-btn--right${viewMode === 'page' ? ' ps-syn-viewtoggle-btn--active' : ''}`}
            >
              {t('rightSynopticPanel.viewToggle.pageButton')}
            </button>
          </div>

          {/* Section tabs — tabs mode only */}
          {viewMode === 'tabs' && (
            <div className="ps-syn-section-tabs">
              {visibleSections.map((sec: EditorSection) => {
                const isActive = sec.id === (activeSectionId || visibleSections[0]?.id);
                const secAnswered = sec.fields.filter((f: EditorField) => isVisible(f.visibleWhen, answers) && synopticFieldComplete(f, answers)).length;
                const secTotal = sec.fields.filter((f: EditorField) => isVisible(f.visibleWhen, answers)).length;
                // Real fix, per direct report: this tab button previously
                // showed only the confirmed-answer count, with zero
                // indication that a section had a real, pending AI
                // suggestion waiting for review — a section could show
                // "(0/3)" and look identically empty whether it genuinely
                // had nothing, or had an unverified 78%-confidence
                // suggestion sitting one click away. Same amber styling
                // already established for unverified indicators elsewhere
                // in this app (Sidebar.tsx's per-report tags).
                const secUnverified = sec.fields.filter((f: EditorField) =>
                  isVisible(f.visibleWhen, answers) &&
                  aiSuggestions[f.id] && aiSuggestions[f.id].verification === 'unverified'
                ).length;
                return (
                  <button
                    key={sec.id}
                    onClick={() => setActiveSectionId(sec.id)}
                    className={[
                      'ps-syn-section-tab',
                      isActive ? 'ps-syn-section-tab--active' : '',
                      !isActive && secUnverified > 0 ? 'ps-syn-section-tab--unverified' : '',
                    ].filter(Boolean).join(' ')}
                  >
                    {sec.title}
                    {secTotal > 0 && <span className="ps-syn-section-tab-count">({secAnswered}/{secTotal})</span>}
                    {secUnverified > 0 && (
                      <span
                        className={`ps-syn-section-tab-unverified${isActive ? ' ps-syn-section-tab-unverified--active' : ''}`}
                        title={t('rightSynopticPanel.sectionTabs.unverifiedTitle', { count: secUnverified })}
                      >
                        · {t('rightSynopticPanel.sectionTabs.unverifiedLabel', { count: secUnverified })}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="ps-syn-body">

        {/* Tabs mode — single active section */}
        {viewMode === 'tabs' && activeSection && (
          <div>
            <h4 className="ps-syn-section-heading">
              {activeSection.title}
            </h4>
            {SectionFields(activeSection)}
          </div>
        )}

        {/* Page mode — all sections stacked */}
        {viewMode === 'page' && visibleSections.map((sec: EditorSection) => (
          <div key={sec.id} className="ps-syn-page-section">
            <div
              ref={el => { sectionHeaderRefs.current[sec.id] = el; }}
              className="ps-syn-page-section-header"
            >
              <h4 className="ps-syn-page-section-title">
                {sec.title}
              </h4>
              {(() => {
                const secAnswered = sec.fields.filter((f: EditorField) => isVisible(f.visibleWhen, answers) && synopticFieldComplete(f, answers)).length;
                const secTotal    = sec.fields.filter((f: EditorField) => isVisible(f.visibleWhen, answers)).length;
                const secUnverified = sec.fields.filter((f: EditorField) =>
                  isVisible(f.visibleWhen, answers) &&
                  aiSuggestions[f.id] && aiSuggestions[f.id].verification === 'unverified'
                ).length;
                return (
                  <>
                    {secTotal > 0 && (
                      <span className={`ps-syn-page-section-count${secAnswered === secTotal ? ' ps-syn-page-section-count--complete' : ''}`}>
                        {secAnswered}/{secTotal}
                      </span>
                    )}
                    {secUnverified > 0 && (
                      <span
                        className="ps-syn-page-section-unverified"
                        title={t('rightSynopticPanel.sectionTabs.unverifiedTitle', { count: secUnverified })}
                      >
                        {t('rightSynopticPanel.sectionTabs.unverifiedLabel', { count: secUnverified })}
                      </span>
                    )}
                  </>
                );
              })()}
            </div>
            {SectionFields(sec)}
          </div>
        ))}

      </div>
    </div>
  );
});

RightSynopticPanel.displayName = 'RightSynopticPanel';
export default RightSynopticPanel;
