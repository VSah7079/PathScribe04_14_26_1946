// src/pages/SynopticReportPage/components/RightSynopticPanel.tsx
// Schema-driven synoptic field renderer — dark navy theme.

<<<<<<< HEAD
import React, { useImperativeHandle, forwardRef } from 'react';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Case } from '@/types/case/Case';
import type {
  EditorTemplate,
=======
import React, { useImperativeHandle, forwardRef, useState, useEffect, useCallback, useRef } from 'react';
import type { Case } from '@/types/case/Case';
import { useAuth } from '@/contexts/AuthContext';
import type {
  
>>>>>>> upstream/main
  EditorField,
  EditorSection,
  FieldOption,
} from '@/components/Config/Protocols/SynopticEditor';
import type { TemplateDetail } from '@/services/templates/templateService';
<<<<<<< HEAD
import { listTemplates, getTemplate } from '@/services/templates/templateService';
import { generateAiSuggestionsForReport, saveReportSuggestions, recordAiFeedback } from '@/services/cases/mockCaseService';
import { aiBehaviorService } from '@/services';
import { callAi } from '@/services/aiIntegration/aiProviderService';
import { getOrchestratorMode } from '@/components/Config/NarrativeTemplates';
import { narrativeTemplateConfig } from '@/components/Config/NarrativeTemplates/narrativeTemplateConfig';
import NarrativeEditor from '@/components/Editor/NarrativeEditor';

const AUTO_DRAFT_MS = 1800;

// ─── Helpers ──────────────────────────────────────────────────
=======
import { getTemplateCached, listTemplatesCached } from '@/services/templates/templateService';
import { generateAiSuggestionsForReport, saveReportSuggestions, recordAiFeedback } from '@/services/cases/mockCaseService';
import { aiBehaviorService } from '@/services';
import { getOrgOrchestratorDefault, resolveOrchestratorMode } from '@/components/Config/AI/orchestratorModeConfig';
import { matchSourceText } from '@/utils/sourceTextMatching';



// ─── Helpers ──────────────────────────────────────────────────────────────────
>>>>>>> upstream/main
type VisCond = EditorField['visibleWhen'];

function isVisible(cond: VisCond | undefined, ans: Record<string, string | string[]>): boolean {
  if (!cond) return true;
  const v = ans[cond.fieldId];
  if (!v) return false;
  return Array.isArray(v) ? v.includes(cond.answerId) : v === cond.answerId;
}

<<<<<<< HEAD
function buildPrompt(tpl: EditorTemplate, ans: Record<string, string | string[]>, c: Case): string {
  const lines: string[] = [];
  tpl.sections.forEach(sec => {
    if (!isVisible(sec.visibleWhen, ans)) return;
    lines.push(`\n### ${sec.title}`);
    sec.fields.forEach(f => {
      if (!isVisible(f.visibleWhen, ans)) return;
      const raw = ans[f.id]; if (!raw) return;
      const display = f.options?.length
        ? (Array.isArray(raw) ? raw : [raw]).map(id => f.options.find((o: FieldOption) => o.id === id)?.label ?? id).join(', ')
        : Array.isArray(raw) ? raw.join(', ') : raw;
      lines.push(`${f.label}: ${display}`);
    });
  });
  const instr = narrativeTemplateConfig.sections.filter(s => s.enabled).map(s => `- ${s.title}: ${s.aiInstruction}`).join('\n');
  return [`You are a pathology reporting assistant. Generate a professional narrative pathology report.`,
    `Rules: Do not invent findings. Use formal clinical prose.\n${instr}`,
    `Case: ${c.id}`, `Gross: ${c.diagnostic?.grossDescription ?? '—'}`,
    `Micro: ${c.diagnostic?.microscopicDescription ?? '—'}`,
    `Ancillary: ${c.diagnostic?.ancillaryStudies ?? '—'}`,
    `\n## Synoptic Data`, ...lines, `\nGenerate the full narrative report now.`].join('\n');
}

// ─── Input styles (dark theme) ────────────────────────────────
=======


// ─── Input styles ─────────────────────────────────────────────────────────────
>>>>>>> upstream/main
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '7px 10px', borderRadius: 6,
  border: '1px solid #334155', background: '#0f172a',
  color: '#e2e8f0', fontSize: 13,
};

<<<<<<< HEAD
// ─── Single field renderer ────────────────────────────────────
interface AiSuggestion {
=======
// ─── Types ────────────────────────────────────────────────────────────────────
export interface AiSuggestion {
>>>>>>> upstream/main
  value: string | string[];
  confidence: number;
  source: string;
  verification: 'unverified' | 'verified' | 'disputed';
}

<<<<<<< HEAD
const FieldRow: React.FC<{
=======
// ─── FieldRow ─────────────────────────────────────────────────────────────────
interface FieldRowProps {
>>>>>>> upstream/main
  field: EditorField;
  value: string | string[];
  onChange: (id: string, v: string | string[]) => void;
  aiSuggestion?: AiSuggestion;
  onVerify?: (fieldId: string, v: 'verified' | 'disputed') => void;
  onLabelClick?: () => void;
  isActive?: boolean;
  aiAttempted?: boolean;
<<<<<<< HEAD
  isPulsing?: boolean;
  fieldRef?: (el: HTMLDivElement | null) => void;
  onFieldFocus?: (fieldId: string) => void;
}> = ({ field, value, onChange, aiSuggestion, onVerify, onLabelClick, isActive = false, aiAttempted = false, isPulsing = false, fieldRef, onFieldFocus }) => {
=======
  belowThreshold?: boolean;
  belowThresholdConf?: number;
  belowThresholdSource?: string;
  isPulsing?: boolean;
  fieldRef?: (el: HTMLDivElement | null) => void;
  onFieldFocus?: (fieldId: string) => void;
  /** True when this field is the currently-active/highlighted one AND
   *  the AI's cited source text couldn't actually be located in the
   *  report — an honest signal instead of the highlight silently
   *  doing nothing. */
  sourceNotFound?: boolean;
}

const FieldRow: React.FC<FieldRowProps> = ({
  field, value, onChange, aiSuggestion, onVerify, onLabelClick,
  isActive = false, aiAttempted = false,
  belowThreshold = false, belowThresholdConf, belowThresholdSource,
  isPulsing = false, fieldRef, onFieldFocus, sourceNotFound = false,
}) => {
>>>>>>> upstream/main
  const strVal = (value ?? '') as string;
  const arrVal = Array.isArray(value) ? value as string[] : [];
  const ai = aiSuggestion;
  const conf = ai?.confidence ?? 0;
  const isHighConf = conf >= 85;
  const isMedConf  = conf >= 50 && conf < 85;
  const vStatus = ai?.verification ?? 'unverified';
<<<<<<< HEAD

  // Derive user-filled-without-AI state
  const hasValue = Array.isArray(value) ? value.length > 0 : (value ?? '') !== '';
  const isManualEntry = !ai && aiAttempted && hasValue;

  const confBadgeStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 8,
    background: vStatus === 'verified' ? 'rgba(16,185,129,0.2)'  :
                vStatus === 'disputed' ? 'rgba(251,191,36,0.15)' :
                isHighConf            ? 'rgba(16,185,129,0.2)'  :
                isMedConf             ? 'rgba(251,191,36,0.15)' :
                                        'rgba(148,163,184,0.12)',
    color:      vStatus === 'verified' ? '#34d399' :
                vStatus === 'disputed' ? '#fbbf24' :
                isHighConf            ? '#34d399' :
                isMedConf             ? '#fbbf24' :
                                        '#94a3b8',
=======
  const hasValue = Array.isArray(value) ? value.length > 0 : (value ?? '') !== '';
  const isManualEntry = !ai && !belowThreshold && aiAttempted && hasValue;

  const confBadgeStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 8,
    background: vStatus === 'verified' ? 'rgba(16,185,129,0.2)'
              : vStatus === 'disputed' ? 'rgba(251,191,36,0.15)'
              : isHighConf             ? 'rgba(16,185,129,0.2)'
              : isMedConf              ? 'rgba(251,191,36,0.15)'
              :                          'rgba(148,163,184,0.12)',
    color:      vStatus === 'verified' ? '#34d399'
              : vStatus === 'disputed' ? '#fbbf24'
              : isHighConf             ? '#34d399'
              : isMedConf              ? '#fbbf24'
              :                          '#94a3b8',
>>>>>>> upstream/main
  };

  const handleActivate = () => {
    onLabelClick?.();
    onFieldFocus?.(field.id);
  };

  return (
    <div
      ref={fieldRef}
      style={{
        marginBottom: 18,
        borderLeft: isPulsing              ? '3px solid #f59e0b'
                  : isActive && ai         ? '3px solid rgba(8,145,178,0.6)'
                  : isManualEntry          ? '3px solid rgba(168,85,247,0.5)'
                  : aiAttempted && !ai && !hasValue ? '3px solid rgba(100,116,139,0.3)'
                  : '3px solid transparent',
        paddingLeft: (ai || aiAttempted || isPulsing) ? 10 : 0,
<<<<<<< HEAD
        background: isPulsing ? 'rgba(245,158,11,0.06)' : 'transparent',
=======
        background: isPulsing ? 'rgba(245,158,11,0.06)'
                  : isActive && hasValue ? 'rgba(8,145,178,0.05)'
                  : 'transparent',
>>>>>>> upstream/main
        borderRadius: isPulsing ? 6 : 2,
        outline: isPulsing ? '1px solid rgba(245,158,11,0.25)' : 'none',
        outlineOffset: '3px',
        transition: 'border-color 0.2s, background 0.4s ease, outline 0.4s ease',
      }}
      onFocus={() => { handleActivate(); onFieldFocus?.(field.id); }}
    >
<<<<<<< HEAD
      {/* Field header row — click anywhere to activate highlight */}
=======
      {/* Field header */}
>>>>>>> upstream/main
      <div
        onClick={handleActivate}
        style={{ fontSize: 12, color: '#94a3b8', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', cursor: 'pointer' }}
      >
        <span
          style={{ color: isActive ? '#e2e8f0' : '#94a3b8', transition: 'color 0.15s' }}
          title={ai ? 'Click to highlight source in report' : 'Click to focus field'}
        >{field.label}</span>
        {field.required && <span style={{ color: '#f87171', fontSize: 10 }}>*</span>}

<<<<<<< HEAD
        {/* AI not found — attempted but no suggestion */}
        {!ai && aiAttempted && !hasValue && (
=======
        {/* Below-threshold warning badge */}
        {belowThreshold && (
          <span
            title={`AI confidence ${belowThresholdConf}% is below your threshold — review carefully.\nSource: ${belowThresholdSource ?? '—'}`}
            style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 8,
              background: 'rgba(245,158,11,0.12)',
              border: '1px solid rgba(245,158,11,0.4)',
              color: '#fbbf24',
              cursor: 'default',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}
          >
            <span style={{ fontSize: 11 }}>⚠</span>
            AI: low confidence ({belowThresholdConf}%)
          </span>
        )}

        {/* AI not found */}
        {!ai && !belowThreshold && aiAttempted && !hasValue && (
>>>>>>> upstream/main
          <span
            title="AI analysed the report text but could not find evidence for this field. Fill in manually."
            style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 8,
              background: 'rgba(100,116,139,0.15)',
              border: '1px dashed rgba(100,116,139,0.5)',
<<<<<<< HEAD
              color: '#94a3b8',
              cursor: 'default',
=======
              color: '#94a3b8', cursor: 'default',
>>>>>>> upstream/main
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}
          >
            <span style={{ fontSize: 11 }}>◌</span> AI: not found
          </span>
        )}

<<<<<<< HEAD
        {/* Manual entry — user filled a field AI missed */}
=======
        {/* Manual entry */}
>>>>>>> upstream/main
        {isManualEntry && (
          <span
            title="You filled this field manually — AI had no suggestion. This helps train the AI."
            style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 8,
              background: 'rgba(168,85,247,0.15)',
              border: '1px solid rgba(168,85,247,0.4)',
<<<<<<< HEAD
              color: '#c084fc',
              cursor: 'default',
=======
              color: '#c084fc', cursor: 'default',
>>>>>>> upstream/main
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}
          >
            <span style={{ fontSize: 11 }}>✎</span> Manual — AI missed
          </span>
        )}

<<<<<<< HEAD
        {/* AI confidence + verification */}
        {ai && (
          <>
            <span
              style={{ ...confBadgeStyle, cursor: 'default' }}
            >
              {vStatus === 'verified' ? '✓ AI Confirmed' : vStatus === 'disputed' ? '✎ Overridden' : `${conf}%`}
            </span>
=======
        {/* AI confidence badge + Confirm/Override */}
        {ai && (
          <>
            {/* The low-confidence warning badge above already states the
                percentage — skip the plain duplicate badge for unverified
                below-threshold fields so the same number doesn't appear
                twice in the row. */}
            {!(belowThreshold && vStatus === 'unverified') && (
              <span style={{ ...confBadgeStyle, cursor: 'default' }}>
                {vStatus === 'verified' ? '✓ AI Confirmed' : vStatus === 'disputed' ? '✎ Overridden' : `${conf}%`}
              </span>
            )}
>>>>>>> upstream/main
            {vStatus === 'unverified' && (
              <>
                <button
                  onClick={() => onVerify?.(field.id, 'verified')}
                  style={{ fontSize: 11, fontWeight: 600, padding: '1px 8px', borderRadius: 10, cursor: 'pointer', border: '1.5px solid rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.1)', color: '#34d399', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.2)'; e.currentTarget.style.borderColor = '#10B981'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.1)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.4)'; }}
                >✓ Confirm</button>
                <button
                  onClick={() => onVerify?.(field.id, 'disputed')}
                  style={{ fontSize: 11, fontWeight: 600, padding: '1px 8px', borderRadius: 10, cursor: 'pointer', border: '1.5px solid rgba(251,191,36,0.4)', background: 'rgba(251,191,36,0.08)', color: '#fbbf24', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(251,191,36,0.15)'; e.currentTarget.style.borderColor = '#f59e0b'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(251,191,36,0.08)'; e.currentTarget.style.borderColor = 'rgba(251,191,36,0.4)'; }}
                >✎ Override</button>
              </>
            )}
            {vStatus !== 'unverified' && (
              <button
                onClick={() => onVerify?.(field.id, vStatus === 'verified' ? 'disputed' : 'verified')}
                style={{ fontSize: 10, fontWeight: 500, padding: '1px 6px', borderRadius: 8, cursor: 'pointer', border: '1px solid rgba(100,116,139,0.3)', background: 'transparent', color: '#64748b', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = 'rgba(100,116,139,0.6)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = 'rgba(100,116,139,0.3)'; }}
              >undo</button>
            )}
          </>
        )}
      </div>

<<<<<<< HEAD
=======
      {/* Input controls */}
>>>>>>> upstream/main
      {field.type === 'text' && (
        <input type="text" value={strVal} onChange={e => onChange(field.id, e.target.value)} style={inputStyle} />
      )}
      {field.type === 'longtext' && (
        <textarea rows={3} value={strVal} onChange={e => onChange(field.id, e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} />
      )}
      {field.type === 'numeric' && (
        <input type="number" value={strVal} onChange={e => onChange(field.id, e.target.value)} style={{ ...inputStyle, width: '50%' }} />
      )}
      {field.type === 'dropdown' && (
<<<<<<< HEAD
        <select value={strVal} onChange={e => onChange(field.id, e.target.value)} style={inputStyle}>
=======
        <select value={strVal} onChange={e => onChange(field.id, e.target.value)} style={inputStyle} aria-label={field.label}>
>>>>>>> upstream/main
          <option value="">— Select —</option>
          {field.options?.map((o: FieldOption) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      )}
      {field.type === 'radio' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {field.options?.map((o: FieldOption) => (
            <label key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#e2e8f0', cursor: 'pointer' }}>
<<<<<<< HEAD
              <input type="radio" name={field.id} checked={strVal === o.id} onChange={() => onChange(field.id, o.id)}
                style={{ accentColor: '#0891B2' }} />
=======
              <input type="radio" name={field.id} checked={strVal === o.id} onChange={() => onChange(field.id, o.id)} style={{ accentColor: '#0891B2' }} />
>>>>>>> upstream/main
              {o.label}
            </label>
          ))}
        </div>
      )}
      {field.type === 'checkboxes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {field.options?.map((o: FieldOption) => (
            <label key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#e2e8f0', cursor: 'pointer' }}>
<<<<<<< HEAD
              <input type="checkbox" checked={arrVal.includes(o.id)}
=======
              <input
                type="checkbox"
                checked={arrVal.includes(o.id)}
>>>>>>> upstream/main
                onChange={e => {
                  const next = new Set(arrVal);
                  e.target.checked ? next.add(o.id) : next.delete(o.id);
                  onChange(field.id, Array.from(next));
                }}
<<<<<<< HEAD
                style={{ accentColor: '#0891B2' }} />
=======
                style={{ accentColor: '#0891B2' }}
              />
>>>>>>> upstream/main
              {o.label}
            </label>
          ))}
        </div>
      )}

      {strVal && field.type === 'dropdown' && (
        <div style={{ marginTop: 4, fontSize: 11, color: '#38bdf8' }}>
          ✓ {field.options?.find((o: FieldOption) => o.id === strVal)?.label ?? strVal}
        </div>
      )}

<<<<<<< HEAD
      {/* AI source citation */}
=======
      {/* AI source + low-confidence source */}
>>>>>>> upstream/main
      {ai && vStatus === 'unverified' && (
        <div style={{ marginTop: 4, fontSize: 10, fontStyle: 'italic', color: '#64748b' }}>
          AI source: {ai.source}
        </div>
      )}
<<<<<<< HEAD
=======
      {belowThreshold && belowThresholdSource && (
        <div style={{ marginTop: 4, fontSize: 10, fontStyle: 'italic', color: '#78350f' }}>
          AI source: {belowThresholdSource}
        </div>
      )}
      {isActive && sourceNotFound && (
        <div
          style={{ marginTop: 4, fontSize: 10, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}
          title="The AI cited a source for this suggestion, but this app couldn't find that exact text anywhere in the Gross, Microscopic, or Ancillary sections."
        >
          <span aria-hidden="true">◐</span> Source not found in report text — verify this value manually
        </div>
      )}
>>>>>>> upstream/main
    </div>
  );
};

<<<<<<< HEAD
// ─── Template picker ──────────────────────────────────────────
interface TemplateOption { id: string; name: string; source: string; version: string; category: string; }

const TemplatePicker: React.FC<{ templates: TemplateOption[]; onSelect: (id: string) => void }> = ({ templates, onSelect }) => (
  <div style={{ padding: 24 }}>
    <h2 style={{ marginBottom: 4, color: '#e2e8f0' }}>Synoptic Report</h2>
    <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>No synoptic template is attached to this case.</p>
    {templates.length === 0
      ? <p style={{ fontSize: 12, color: '#64748b' }}>No approved synoptic templates are available.</p>
      : templates.map(t => (
        <button key={t.id} onClick={() => onSelect(t.id)}
          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', marginBottom: 6, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.2)', color: '#e2e8f0', cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#0891B2'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(148,163,184,0.2)'}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>{t.source} · v{t.version} · {t.category}</div>
        </button>
      ))
    }
  </div>
);

// ─── Main component ───────────────────────────────────────────
// Handle exposed via ref for parent (SynopticReportPage) to call at finalize time
=======
// ─── TemplatePicker ───────────────────────────────────────────────────────────
interface TemplateOption { id: string; name: string; source: string; version: string; category: string; }

const TemplatePicker: React.FC<{ templates: TemplateOption[]; specimenDescriptions: string[]; onSelect: (id: string) => void }> = ({ templates, specimenDescriptions, onSelect }) => {
  // Real fix, per direct report: this list was showing every published
  // template in the entire system, regardless of relevance (a thyroid
  // case listing Breast/Lung/Prostate/Kidney templates alongside
  // whatever real, relevant one exists) — genuinely not useful with a
  // real template library this size. A simple, safe text match — each
  // template's own category (e.g. "BREAST", "LUNG") against the case's
  // real specimen descriptions — surfaces likely matches first, without
  // ever hiding anything: no real subspecialty-to-category mapping
  // exists in this codebase to match TemplateRoutingService.ts's own,
  // more precise automatic-assignment logic (which is what runs BEFORE
  // this manual fallback ever shows at all), so a wrong or missing
  // match here must never prevent the pathologist from finding and
  // picking the template they actually need.
  const haystack = specimenDescriptions.join(' ').toLowerCase();
  const suggested = templates.filter(t => t.category && haystack.includes(t.category.toLowerCase()));
  const suggestedIds = new Set(suggested.map(t => t.id));
  const rest = templates.filter(t => !suggestedIds.has(t.id));

  const renderTemplateButton = (t: TemplateOption) => (
    <button
      key={t.id}
      onClick={() => onSelect(t.id)}
      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', marginBottom: 6, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.2)', color: '#e2e8f0', cursor: 'pointer' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#0891B2'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(148,163,184,0.2)'; }}
    >
      <div style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</div>
      <div style={{ fontSize: 11, color: '#64748b' }}>{t.source} · v{t.version} · {t.category}</div>
    </button>
  );

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginBottom: 4, color: '#e2e8f0' }}>Synoptic Report</h2>
      <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>No synoptic template is attached to this case.</p>
      {templates.length === 0 ? (
        <p style={{ fontSize: 12, color: '#64748b' }}>No approved synoptic templates are available.</p>
      ) : (
        <>
          {suggested.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#0891B2', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>
                Suggested for this case
              </div>
              {suggested.map(renderTemplateButton)}
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', margin: '16px 0 8px' }}>
                All templates
              </div>
            </>
          )}
          {rest.map(renderTemplateButton)}
        </>
      )}
    </div>
  );
};


// ─── Exported types ───────────────────────────────────────────────────────────
>>>>>>> upstream/main
export interface ReviewField {
  fieldId:      string;
  fieldLabel:   string;
  sectionTitle: string;
  aiValue:      string | string[];
  confidence:   number;
  source:       string;
  verification: 'unverified' | 'verified' | 'disputed';
<<<<<<< HEAD
}

export interface MissingRequiredField {
  sectionId: string;
  sectionTitle: string;
  fieldId: string;
  fieldLabel: string;
}

export interface RightSynopticPanelHandle {
  /**
   * Validates required fields — call BEFORE sweepAndGetFinalState.
   * Returns list of missing required fields, empty array if all complete.
   */
  validateRequired(): MissingRequiredField[];

  /**
   * Returns required fields that are AI-suggested, unverified, and below
   * the confidence threshold — these need triage before finalization.
   */
  getUncertainRequiredFields(threshold?: number): ReviewField[];

  /**
   * Programmatically confirm or dispute a field from outside the panel.
   * Used by AiReviewModal to update verification state.
   */
  setFieldVerification(fieldId: string, v: 'verified' | 'disputed'): void;

  /**
   * Sweeps all unverified AI suggestions to 'verified' and returns the
   * final answers + suggestions state for persisting before finalization.
   * Fields the pathologist changed are already marked 'overridden'.
   * Fields without AI suggestions that were filled are already 'missed'.
   */
=======
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
  setFieldVerification(fieldId: string, v: 'verified' | 'disputed'): void;
>>>>>>> upstream/main
  sweepAndGetFinalState(): {
    answers: Record<string, string | string[]>;
    aiSuggestions: Record<string, AiSuggestion>;
    verificationSummary: {
<<<<<<< HEAD
      autoConfirmed: number;
=======
>>>>>>> upstream/main
      explicitConfirmed: number;
      overridden: number;
      missed: number;
      notFound: number;
<<<<<<< HEAD
=======
      /** Real fix, stronger version: fields left honestly unverified
       *  because nobody explicitly confirmed or overrode them —
       *  required fields with this problem are now hard-blocked
       *  upstream by getBlockingUnverifiedFields() before finalize
       *  ever reaches this point, so in practice this only reflects
       *  non-required fields nobody happened to review. Never
       *  silently auto-confirmed, regardless of source-match. */
      leftUnverified: number;
>>>>>>> upstream/main
    };
  };
}

interface RightSynopticPanelProps {
  caseData: Case | null;
  activeTab: string;
  activeReportInstanceId?: string;
<<<<<<< HEAD
  onReportInstanceChange?: (id: string) => void;
  onCaseUpdate?: (updated: Case) => void;
  isDirty?: boolean;
  scrollToField?: string | null;
  onScrollComplete?: () => void;
  onHighlight?: (source: string | null) => void;
}

// Module-level template cache — survives re-renders, cleared only on page reload
const TEMPLATE_CACHE = new Map<string, any>();

const RightSynopticPanel = forwardRef<RightSynopticPanelHandle, RightSynopticPanelProps>(({ caseData: initialCaseData, activeReportInstanceId, onCaseUpdate, isDirty, scrollToField, onScrollComplete, onHighlight }, ref) => {
  const orchestratorMode = React.useMemo(() => getOrchestratorMode(), []);

  const caseData = initialCaseData;
  const [templateDetail, setTemplateDetail] = React.useState<TemplateDetail | null>(null);
  const [answers, setAnswers]             = React.useState<Record<string, string | string[]>>({});
  const loadedAnswersRef = React.useRef<string>('');

  // Propagate answer changes to parent for dirty detection.
  // Skip if answers match what was loaded (not a user edit).
  React.useEffect(() => {
    if (!caseData || !activeReportInstanceId) return;
    const current = JSON.stringify(answers);
    if (current === loadedAnswersRef.current) return; // same as loaded — skip
    const updatedReports = (caseData.synopticReports ?? []).map(r =>
=======
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
}

// ─── Main component ───────────────────────────────────────────────────────────
const RightSynopticPanel = forwardRef<RightSynopticPanelHandle, RightSynopticPanelProps>(
  ({ caseData: initialCaseData, activeReportInstanceId, activeReportType = 'synoptic', activeSpecimenId, onReportInstanceChange, onCaseUpdate, scrollToField, onScrollComplete, onHighlight, highlightNotFound, computationalResults, onAiSuggestionsUpdate }, ref) => {

  // Real fix, found via a direct audit: same as HeaderBar.tsx — this
  // used to call the old, superseded getOrchestratorMode() instead of
  // the real resolveOrchestratorMode(), silently never applying the
  // real per-lab override. Defaults to the sync org-level value first,
  // then resolves the full, per-lab-aware value.
  const [orchestratorMode, setOrchestratorMode] = useState<boolean>(getOrgOrchestratorDefault);
  useEffect(() => {
    resolveOrchestratorMode(initialCaseData?.order?.clientId).then(setOrchestratorMode).catch(() => {});
  }, [initialCaseData?.order?.clientId]);
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
        setConfidenceThreshold(res.data.confidenceThreshold ?? 75);
        setAutoInsertSuggestions(res.data.autoInsertSuggestions ?? false);
        setMicroscopicAiEnabled(res.data.microscopicEnabled ?? true);
      }
    });
  }, []);

  // ── Propagate answer changes to parent ────────────────────────────────────
  useEffect(() => {
    if (!caseData || !activeReportInstanceId) return;
    const current = JSON.stringify(answers);
    if (current === loadedAnswersRef.current) return;
    const updatedReports = getActiveReports(caseData).map(r =>
>>>>>>> upstream/main
      r.instanceId === activeReportInstanceId
        ? { ...r, answers, updatedAt: new Date().toISOString() }
        : r
    );
<<<<<<< HEAD
    onCaseUpdate?.({ ...caseData, synopticReports: updatedReports, updatedAt: new Date().toISOString() });
  }, [answers]);
  const [availableTemplates, setAvailableTemplates] = React.useState<TemplateOption[]>([]);
  const [loading, setLoading]             = React.useState(true);
  const [error, setError]                 = React.useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = React.useState('');
  const [aiSuggestions, setAiSuggestions] = React.useState<Record<string, AiSuggestion>>({});
  const [activeFieldId, setActiveFieldId] = React.useState<string | null>(null);
  const [pulsingFieldId, setPulsingFieldId] = React.useState<string | null>(null);
  const [confidenceThreshold, setConfidenceThreshold] = React.useState(0); // 0 = show all until loaded

  // Orchestrator
  const [narrativeContent, setNarrativeContent] = React.useState('');
  const [isGenerating, setIsGenerating]         = React.useState(false);
  const [generateError, setGenerateError]       = React.useState<string | null>(null);
  const [lastGeneratedAt, setLastGeneratedAt]   = React.useState<Date | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Jump to field helper — scrolls, activates, and pulses the field ────────
  const jumpToField = React.useCallback((fieldId: string, sectionId: string) => {
    setActiveSectionId(sectionId);
    setActiveFieldId(fieldId);
    setPulsingFieldId(fieldId);
    lastJumpedFieldId.current = fieldId;
    setTimeout(() => {
      const el = fieldRefs.current[fieldId];
      if (el) {
        // Scroll to the input itself so the answer field is centred, not the label
=======
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
>>>>>>> upstream/main
        const input = el.querySelector<HTMLElement>('input, select, textarea, [role="combobox"]');
        const scrollTarget = input ?? el;
        scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (input) input.focus();
      }
      setTimeout(() => setPulsingFieldId(null), 2000);
    }, 80);
<<<<<<< HEAD
  }, []);

  // ── Voice: next unanswered / next required ────────────────────────────────
  React.useEffect(() => {
    const handleNextUnanswered = () => {
      if (!templateDetail) return;
      const sections = templateDetail.template.sections.filter((s: any) => isVisible(s.visibleWhen, answers));
      const all: { fieldId: string; sectionId: string }[] = [];
      for (const sec of sections)
=======
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
>>>>>>> upstream/main
        for (const f of sec.fields)
          if (isVisible(f.visibleWhen, answers) && !answers[f.id])
            all.push({ fieldId: f.id, sectionId: sec.id });
      if (!all.length) return;
      const cur = all.findIndex(x => x.fieldId === lastJumpedFieldId.current);
<<<<<<< HEAD
      const next = all[cur >= 0 && cur < all.length - 1 ? cur + 1 : 0];
      jumpToField(next.fieldId, next.sectionId);
    };
    const handleNextRequired = () => {
      if (!templateDetail) return;
      const sections = templateDetail.template.sections.filter((s: any) => isVisible(s.visibleWhen, answers));
      const all: { fieldId: string; sectionId: string }[] = [];
      for (const sec of sections)
=======
      jumpToField(all[cur >= 0 && cur < all.length - 1 ? cur + 1 : 0].fieldId, all[cur >= 0 && cur < all.length - 1 ? cur + 1 : 0].sectionId);
    };
    const handleNextRequired = () => {
      if (!templateDetail) return;
      const all: { fieldId: string; sectionId: string }[] = [];
      for (const sec of templateDetail.template.sections.filter((s: any) => isVisible(s.visibleWhen, answers)))
>>>>>>> upstream/main
        for (const f of sec.fields)
          if (f.required && isVisible(f.visibleWhen, answers) && !answers[f.id])
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
  }, [templateDetail, answers, jumpToField]);
<<<<<<< HEAD
  const fieldRefs        = React.useRef<Record<string, HTMLDivElement | null>>({});
  const lastJumpedFieldId    = React.useRef<string | null>(null);

  // Load confidence threshold from AI behavior config
  React.useEffect(() => {
    aiBehaviorService.get().then(res => {
      if (res.ok) setConfidenceThreshold(res.data.confidenceThreshold ?? 0);
    });
  }, []);

  // ── Expose sweep method to parent via ref ────────────────────────────────────
=======

  // ── Imperative handle ─────────────────────────────────────────────────────
>>>>>>> upstream/main
  useImperativeHandle(ref, () => ({
    getUncertainRequiredFields(threshold?: number): ReviewField[] {
      const effectiveThreshold = threshold ?? confidenceThreshold ?? 75;
      if (!templateDetail) return [];
      const results: ReviewField[] = [];
      templateDetail.template.sections.forEach((sec: any) => {
        if (!isVisible(sec.visibleWhen, answers)) return;
        sec.fields.forEach((f: any) => {
<<<<<<< HEAD
          if (!f.required) return;
          if (!isVisible(f.visibleWhen, answers)) return;
          const sug = aiSuggestions[f.id];
          if (!sug) return;
          if (sug.verification !== 'unverified') return;
          if (sug.confidence >= effectiveThreshold) return; // high confidence — auto-confirm at finalize
          results.push({
            fieldId:      f.id,
            fieldLabel:   f.label,
            sectionTitle: sec.title,
            aiValue:      sug.value as string | string[],
            confidence:   sug.confidence,
            source:       sug.source ?? '',
            verification: sug.verification,
          });
        });
      });
      // Sort by confidence ascending — lowest confidence first
      return results.sort((a, b) => a.confidence - b.confidence);
    },

=======
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

>>>>>>> upstream/main
    setFieldVerification(fieldId: string, v: 'verified' | 'disputed') {
      setAiSuggestions(prev => {
        const sug = prev[fieldId];
        if (!sug) return prev;
        const next = { ...prev, [fieldId]: { ...sug, verification: v } };
<<<<<<< HEAD
        if (caseData && activeReportInstanceId) {
          saveReportSuggestions(caseData.id, activeReportInstanceId, next);
        }
=======
        if (caseData && activeReportInstanceId) saveReportSuggestions(caseData.id, activeReportInstanceId, next);
>>>>>>> upstream/main
        return next;
      });
    },

    validateRequired(): MissingRequiredField[] {
      if (!templateDetail) return [];
<<<<<<< HEAD
      const inst = caseData?.synopticReports?.find(r => r.instanceId === activeReportInstanceId) as any;

      // If assigned to someone else, block finalization
      if (inst?.assignedTo && inst.assignedTo !== 'PATH-001') { // TODO: replace with auth context
        return [{
          sectionId: '__assignment__',
          sectionTitle: 'Assignment',
=======
      const inst = getActiveReports(caseData).find(r => r.instanceId === activeReportInstanceId) as any;
      if (inst?.assignedTo && inst.assignedTo !== user?.id) {
        return [{
          sectionId: '__assignment__', sectionTitle: 'Assignment',
>>>>>>> upstream/main
          fieldId: '__assigned__',
          fieldLabel: `This synoptic is assigned to ${inst.assignedToName ?? inst.assignedTo} — they must finalise it`,
        }];
      }
<<<<<<< HEAD

      // If marked deferred, allow sign-out without required field validation
=======
>>>>>>> upstream/main
      if (inst?.status === 'deferred') return [];
      const missing: MissingRequiredField[] = [];
      templateDetail.template.sections.forEach((sec: any) => {
        if (!isVisible(sec.visibleWhen, answers)) return;
        sec.fields.forEach((f: any) => {
<<<<<<< HEAD
          if (!f.required) return;
          if (!isVisible(f.visibleWhen, answers)) return;
          const val = answers[f.id];
          const isEmpty = !val || (Array.isArray(val) ? val.length === 0 : val.toString().trim() === '');
          if (isEmpty) {
            missing.push({
              sectionId:    sec.id,
              sectionTitle: sec.title,
              fieldId:      f.id,
              fieldLabel:   f.label,
            });
          }
=======
          if (!f.required || !isVisible(f.visibleWhen, answers)) return;
          const val = answers[f.id];
          const isEmpty = !val || (Array.isArray(val) ? val.length === 0 : val.toString().trim() === '');
          if (isEmpty) missing.push({ sectionId: sec.id, sectionTitle: sec.title, fieldId: f.id, fieldLabel: f.label });
>>>>>>> upstream/main
        });
      });
      return missing;
    },

    sweepAndGetFinalState() {
<<<<<<< HEAD
      // Auto-confirm all unverified suggestions — finalization IS confirmation
      const finalSuggestions = { ...aiSuggestions };
      let autoConfirmed = 0;
      let explicitConfirmed = 0;
      let overridden = 0;
      let missed = 0;
      let notFound = 0;

      Object.entries(finalSuggestions).forEach(([fieldId, sug]) => {
        if (sug.verification === 'unverified') {
          finalSuggestions[fieldId] = { ...sug, verification: 'verified' };
          autoConfirmed++;
        } else if (sug.verification === 'verified') {
          explicitConfirmed++;
        } else if (sug.verification === 'disputed') {
          overridden++;
        }
      });

      // Count fields filled without AI suggestion (missed)
=======
      // Real, stronger fix per direct product decision: no longer
      // auto-confirms anything, for any field, regardless of
      // required status or source-match. Required fields with an
      // unverified AI suggestion are now hard-blocked upstream by
      // getBlockingUnverifiedFields() before finalize ever reaches
      // this point — so a required field genuinely can't still be
      // 'unverified' here in practice. Non-required fields are simply
      // left honestly unverified if nobody explicitly reviewed them;
      // a source happening to match the report text was never a
      // substitute for a human actually looking at the value, and
      // treating it as one is exactly the "AI accepted blindly"
      // pattern this whole fix exists to close. Verification status
      // now only ever changes through an explicit Confirm/Override.
      const finalSuggestions = { ...aiSuggestions };
      let explicitConfirmed = 0, overridden = 0, missed = 0, notFound = 0, leftUnverified = 0;
      Object.values(finalSuggestions).forEach(sug => {
        if (sug.verification === 'unverified') leftUnverified++;
        else if (sug.verification === 'verified') explicitConfirmed++;
        else if (sug.verification === 'disputed') overridden++;
      });
>>>>>>> upstream/main
      if (templateDetail) {
        templateDetail.template.sections.forEach((sec: any) => {
          sec.fields.forEach((f: any) => {
            if (!finalSuggestions[f.id]) {
<<<<<<< HEAD
              const hasValue = Array.isArray(answers[f.id])
                ? (answers[f.id] as string[]).length > 0
                : !!(answers[f.id]);
              if (hasValue) missed++;
              else notFound++;
=======
              const hasVal = Array.isArray(answers[f.id]) ? (answers[f.id] as string[]).length > 0 : !!(answers[f.id]);
              if (hasVal) missed++; else notFound++;
>>>>>>> upstream/main
            }
          });
        });
      }
<<<<<<< HEAD

      // Persist the swept state
      if (caseData && activeReportInstanceId) {
        saveReportSuggestions(caseData.id, activeReportInstanceId, finalSuggestions);
      }

      return {
        answers,
        aiSuggestions: finalSuggestions,
        verificationSummary: { autoConfirmed, explicitConfirmed, overridden, missed, notFound },
      };
    },
  }), [aiSuggestions, answers, templateDetail, caseData, activeReportInstanceId]);

  // Scroll logic
  React.useEffect(() => {
    if (!scrollToField || !templateDetail) return;
    const template = templateDetail.template;
    for (const sec of template.sections) {
      if (!isVisible(sec.visibleWhen, answers)) continue;
      const hasUnanswered = sec.fields.some(f =>
        f.required && isVisible(f.visibleWhen, answers) && !answers[f.id]
      );
      if (hasUnanswered) {
        setActiveSectionId(sec.id);
        setTimeout(() => {
          const firstReqField = sec.fields.find(f =>
            f.required && isVisible(f.visibleWhen, answers) && !answers[f.id]
          );
=======
      if (caseData && activeReportInstanceId) saveReportSuggestions(caseData.id, activeReportInstanceId, finalSuggestions);
      return { answers, aiSuggestions: finalSuggestions, verificationSummary: { explicitConfirmed, overridden, missed, notFound, leftUnverified } };
    },
  }), [aiSuggestions, answers, templateDetail, caseData, activeReportInstanceId, confidenceThreshold, getActiveReports, user?.id]);

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
      const hasUnanswered = sec.fields.some((f: any) => f.required && isVisible(f.visibleWhen, answers) && !answers[f.id]);
      if (hasUnanswered) {
        setActiveSectionId(sec.id);
        setTimeout(() => {
          const firstReqField = sec.fields.find((f: any) => f.required && isVisible(f.visibleWhen, answers) && !answers[f.id]);
>>>>>>> upstream/main
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
<<<<<<< HEAD
  }, [scrollToField]);

  // Load template
  // ── Effect 1: Load template list — only when case changes, not on every report switch
  React.useEffect(() => {
=======
  }, [scrollToField]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load template list ────────────────────────────────────────────────────
  useEffect(() => {
>>>>>>> upstream/main
    let cancelled = false;
    (async () => {
      if (!caseData) return;
      try {
<<<<<<< HEAD
        const approved = await listTemplates('approved');
        if (cancelled) return;
        setAvailableTemplates(approved.map((p: any) => ({
          id: p.id, name: p.name, source: p.source, version: p.version, category: p.category,
        })));
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [initialCaseData?.id]);

  // ── Effect 2: Load active report + template — fast path uses cache
  React.useEffect(() => {
=======
        const approved = await listTemplatesCached('published');
        if (cancelled) return;
        setAvailableTemplates(approved.map((p: any) => ({ id: p.id, name: p.name, source: p.source, version: p.version, category: p.category })));
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [initialCaseData?.id, caseData]);

  // ── Load active report + template ─────────────────────────────────────────
  useEffect(() => {
>>>>>>> upstream/main
    let cancelled = false;
    (async () => {
      if (!caseData) { setLoading(false); return; }
      setLoading(true); setError(null);
      try {
        let templateId: string | undefined;
        let answersToLoad: Record<string, string | string[]> = {};
        let activeInst: any = null;

<<<<<<< HEAD
        if (activeReportInstanceId && caseData.synopticReports?.length) {
          const inst = caseData.synopticReports.find(r => r.instanceId === activeReportInstanceId);
          if (inst) { templateId = inst.templateId; answersToLoad = inst.answers ?? {}; activeInst = inst; }
        } else if (caseData.synopticReports?.length) {
          const first = caseData.synopticReports[0];
=======
        if (activeReportInstanceId && getActiveReports(caseData).length) {
          const inst = getActiveReports(caseData).find(r => r.instanceId === activeReportInstanceId);
          if (inst) { templateId = inst.templateId; answersToLoad = inst.answers ?? {}; activeInst = inst; }
        } else if (getActiveReports(caseData).length) {
          const first = getActiveReports(caseData)[0];
>>>>>>> upstream/main
          templateId = first.templateId; answersToLoad = first.answers ?? {}; activeInst = first;
        } else if (caseData.synopticTemplateId) {
          templateId = caseData.synopticTemplateId;
          answersToLoad = caseData.synopticAnswers ?? {};
        }

        if (templateId) {
<<<<<<< HEAD
          // Use cache — avoids re-fetch when switching between reports with same template
          let detail = TEMPLATE_CACHE.get(templateId);
          if (!detail) {
            detail = await getTemplate(templateId);
            TEMPLATE_CACHE.set(templateId, detail);
          }
          if (cancelled) return;

          // Set everything atomically after the async work is done
          const suggestions: Record<string, AiSuggestion> = (activeInst as any)?.aiSuggestions ?? {};
          setAiSuggestions(suggestions);
          setAnswers(() => {
            const prefilled = { ...answersToLoad };
            Object.entries(suggestions).forEach(([fieldId, sug]) => {
              if (!prefilled[fieldId] || prefilled[fieldId] === '' ||
                 (Array.isArray(prefilled[fieldId]) && (prefilled[fieldId] as string[]).length === 0)) {
                prefilled[fieldId] = Array.isArray(sug.value) ? sug.value : sug.value;
              }
            });
            // Snapshot the AI-prefilled state as baseline — only if case is clean
            if (!isDirty) loadedAnswersRef.current = JSON.stringify(prefilled);
            return prefilled;
          });
=======
          const detail = await getTemplateCached(templateId);
          if (cancelled) return;

          const suggestions: Record<string, AiSuggestion> = (activeInst as any)?.aiSuggestions ?? {};
          updateAiSuggestions(suggestions);

          // Gate pre-fill on autoInsertSuggestions setting:
          // false (default) = fields stay blank, pathologist clicks Confirm per field
          // true            = values above threshold auto-fill into answer fields
          setAnswers(() => {
            const prefilled = { ...answersToLoad };
            if (autoInsertSuggestions) {
              Object.entries(suggestions).forEach(([fieldId, sug]) => {
                const aboveThreshold = (sug.confidence ?? 0) >= (confidenceThreshold || 75);
                const fieldEmpty = !prefilled[fieldId] || prefilled[fieldId] === '' ||
                  (Array.isArray(prefilled[fieldId]) && (prefilled[fieldId] as string[]).length === 0);
                if (aboveThreshold && fieldEmpty) {
                  prefilled[fieldId] = Array.isArray(sug.value) ? sug.value : sug.value;
                }
              });
            }
            // Always update the ref on report switch so the propagation effect
            // doesn't fire spuriously with stale data from the previous report.
            loadedAnswersRef.current = JSON.stringify(prefilled);
            return prefilled;
          });

>>>>>>> upstream/main
          setTemplateDetail(detail);
          if (detail.template.sections.length > 0) setActiveSectionId(detail.template.sections[0].id);
        } else {
          if (cancelled) return;
<<<<<<< HEAD
          setAiSuggestions({});
          setAnswers(() => answersToLoad);
          if (!isDirty) loadedAnswersRef.current = JSON.stringify(answersToLoad); // snapshot only when clean
=======
          updateAiSuggestions({});
          setAnswers(() => answersToLoad);
          loadedAnswersRef.current = JSON.stringify(answersToLoad);
>>>>>>> upstream/main
          setTemplateDetail(null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Failed to load template');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
<<<<<<< HEAD
  }, [initialCaseData?.id, initialCaseData?.synopticTemplateId, initialCaseData?.synopticReports?.length, activeReportInstanceId]);

  // AI Narrative logic
  const generateNarrative = React.useCallback(async () => {
    if (!templateDetail || !caseData) return;
    setIsGenerating(true); setGenerateError(null);
    try {
      const { text } = await callAi({
        system: 'You are a board-certified pathologist assistant. Generate professional pathology report narrative. Never invent findings.',
        prompt: buildPrompt(templateDetail.template, answers, caseData),
      });
      setNarrativeContent(text);
      setLastGeneratedAt(new Date());
    } catch (e: any) { setGenerateError(e?.message); }
    finally { setIsGenerating(false); }
  }, [templateDetail, answers, caseData]);

  // Auto-draft trigger
  React.useEffect(() => {
    if (!orchestratorMode || !templateDetail || !caseData || Object.keys(answers).length === 0) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(generateNarrative, AUTO_DRAFT_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [answers, orchestratorMode, templateDetail, caseData, generateNarrative]);

  const setAnswer = React.useCallback((fieldId: string, value: string | string[]) => {
=======
  }, [initialCaseData?.id, initialCaseData?.synopticTemplateId, initialCaseData?.synopticReports?.length, (initialCaseData as any)?.grossingReports?.length, activeReportInstanceId, activeReportType]); // eslint-disable-line react-hooks/exhaustive-deps

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
      const { generateAiSuggestionsForReport } = await import('@/services/cases/mockCaseService');
      const suggestions = await generateAiSuggestionsForReport(
        caseData, inst.templateId, allFields, computationalResults
      );

      updateAiSuggestions(suggestions as any);

      let nextAnswers: Record<string, string | string[]> = {};
      setAnswers(prev => {
        const next = { ...prev };
        // Unlike the passive page-load prefill, this is an explicit,
        // deliberate click — the pathologist just asked for this
        // specific regeneration, so it isn't gated behind the global
        // Auto-Insert Suggestions toggle (that setting exists to guard
        // against *silent* AI involvement, which doesn't apply to an
        // action someone just triggered on purpose). Still respects
        // the confidence threshold, and still never touches a field
        // that already has a value — same non-destructive guarantee
        // as before, just without the extra passive-only gate.
        Object.entries(suggestions).forEach(([fieldId, sug]: [string, any]) => {
          const aboveThreshold = (sug.confidence ?? 0) >= (confidenceThreshold || 75);
          const fieldEmpty = !next[fieldId] || next[fieldId] === '' ||
            (Array.isArray(next[fieldId]) && (next[fieldId] as string[]).length === 0);
          if (aboveThreshold && fieldEmpty) next[fieldId] = sug.value;
        });
        nextAnswers = next;
        return next;
      });

      // Persist so the regenerated suggestions AND newly-filled answers
      // survive navigation/reload, same mechanism the deferred-toggle
      // button below uses.
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
  }, [caseData, activeReportInstanceId, templateDetail, isRegenerating, computationalResults, confidenceThreshold, onCaseUpdate, updateAiSuggestions, activeReportsKey, getActiveReports]);

  const setAnswer = useCallback((fieldId: string, value: string | string[]) => {
>>>>>>> upstream/main
    setAnswers(prev => {
      const next = { ...prev, [fieldId]: value };
      templateDetail?.template.sections.forEach((sec: EditorSection) => {
        if (!isVisible(sec.visibleWhen, next)) sec.fields.forEach((f: EditorField) => delete next[f.id]);
        else sec.fields.forEach((f: EditorField) => { if (!isVisible(f.visibleWhen, next)) delete next[f.id]; });
      });
      return next;
    });

<<<<<<< HEAD
    // Fire 'missed' feedback when user fills a field the AI had no suggestion for
    // This is the most valuable training signal — tells us what AI is blind to
    if (!aiSuggestions[fieldId] && Object.keys(aiSuggestions).length > 0) {
      const hasValue = Array.isArray(value) ? value.length > 0 : value !== '';
      if (hasValue) {
=======
    // Record 'missed' feedback when user fills a field AI had no suggestion for
    if (!aiSuggestions[fieldId] && Object.keys(aiSuggestions).length > 0) {
      const hasVal = Array.isArray(value) ? value.length > 0 : value !== '';
      if (hasVal) {
>>>>>>> upstream/main
        const fieldLabel = templateDetail?.template.sections
          .flatMap((s: EditorSection) => s.fields)
          .find((f: EditorField) => f.id === fieldId)?.label ?? fieldId;
        recordAiFeedback({
<<<<<<< HEAD
          timestamp:    new Date().toISOString(),
          caseId:       caseData?.id ?? '',
          instanceId:   activeReportInstanceId ?? '',
          templateId:   templateDetail?.template.id ?? '',
          fieldId,
          fieldLabel,
          aiValue:      '',
          aiConfidence: 0,
          userValue:    value,
          action:       'missed',
          source:       'AI had no suggestion for this field',
=======
          timestamp: new Date().toISOString(), caseId: caseData?.id ?? '',
          instanceId: activeReportInstanceId ?? '', templateId: templateDetail?.template.id ?? '',
          fieldId, fieldLabel, aiValue: '', aiConfidence: 0, userValue: value,
          action: 'missed', source: 'AI had no suggestion for this field',
          userId: user?.id, userName: user?.name,
>>>>>>> upstream/main
        });
      }
    }

<<<<<<< HEAD
    // Detect override vs revert-to-AI and persist + log feedback
    setAiSuggestions(prev => {
      const sug = prev[fieldId];
      if (!sug) return prev;

      const sugVal = Array.isArray(sug.value) ? sug.value.join(',') : String(sug.value);
      const newVal = Array.isArray(value) ? value.join(',') : String(value);
      const changed = sugVal !== newVal;

      let nextVerification = sug.verification;
      if (sug.verification === 'unverified' && changed) {
        nextVerification = 'disputed';
      } else if (sug.verification === 'disputed' && !changed) {
        nextVerification = 'unverified';
      }

      if (nextVerification === sug.verification) return prev; // no change

      const nextSuggestions = {
        ...prev,
        [fieldId]: { ...sug, verification: nextVerification },
      };

      // Persist the updated verification state to the case
      if (caseData && activeReportInstanceId) {
        saveReportSuggestions(caseData.id, activeReportInstanceId, nextSuggestions);
      }

      // Record feedback for AI learning when the user overrides
=======
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
>>>>>>> upstream/main
      if (nextVerification === 'disputed') {
        const fieldLabel = templateDetail?.template.sections
          .flatMap((s: EditorSection) => s.fields)
          .find((f: EditorField) => f.id === fieldId)?.label ?? fieldId;
<<<<<<< HEAD

        recordAiFeedback({
          timestamp:    new Date().toISOString(),
          caseId:       caseData?.id ?? '',
          instanceId:   activeReportInstanceId ?? '',
          templateId:   templateDetail?.template.id ?? '',
          fieldId,
          fieldLabel,
          aiValue:      sug.value,
          aiConfidence: sug.confidence,
          userValue:    value,
          action:       'overridden',
          source:       sug.source,
        });
      }

      return nextSuggestions;
    });
  }, [templateDetail, caseData, activeReportInstanceId]);

  // ── handleVerify must be before early returns (Rules of Hooks) ────────────
  const handleVerify = React.useCallback((fieldId: string, v: 'verified' | 'disputed') => {
    setAiSuggestions(prev => {
      const sug = prev[fieldId];
      if (!sug) return prev;

      const nextSuggestions = { ...prev, [fieldId]: { ...sug, verification: v } };

      // Confirm: snap answer back to the AI value
      if (v === 'verified') {
        setAnswers(ans => ({ ...ans, [fieldId]: sug.value as string | string[] }));
      }

      // Persist updated verification
      if (caseData && activeReportInstanceId) {
        saveReportSuggestions(caseData.id, activeReportInstanceId, nextSuggestions);
      }

      // Record feedback for AI learning
      const fieldLabel = templateDetail?.template.sections
        .flatMap((s: EditorSection) => s.fields)
        .find((f: EditorField) => f.id === fieldId)?.label ?? fieldId;

      recordAiFeedback({
        timestamp:    new Date().toISOString(),
        caseId:       caseData?.id ?? '',
        instanceId:   activeReportInstanceId ?? '',
        templateId:   templateDetail?.template.id ?? '',
        fieldId,
        fieldLabel,
        aiValue:      sug.value,
        aiConfidence: sug.confidence,
        userValue:    v === 'verified' ? sug.value : (answers[fieldId] ?? sug.value),
        action:       v === 'verified' ? 'confirmed' : 'overridden',
        source:       sug.source,
      });

      return nextSuggestions;
    });
  }, [caseData, activeReportInstanceId, templateDetail, answers]);

  // Removed the 'save' function and associated local state (isSaving, saveError, etc.)
  // since this is now controlled by the parent/BottomActionBar.

=======
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

  // ── handleVerify ──────────────────────────────────────────────────────────
  const handleVerify = useCallback((fieldId: string, v: 'verified' | 'disputed') => {
    setAiSuggestions(prev => {
      const sug = prev[fieldId];
      if (!sug) return prev;
      const nextSuggestions = { ...prev, [fieldId]: { ...sug, verification: v } };
      // Confirm: snap answer back to AI value
      if (v === 'verified') setAnswers(ans => ({ ...ans, [fieldId]: sug.value as string | string[] }));
      if (caseData && activeReportInstanceId) saveReportSuggestions(caseData.id, activeReportInstanceId, nextSuggestions);
      const fieldLabel = templateDetail?.template.sections
        .flatMap((s: EditorSection) => s.fields)
        .find((f: EditorField) => f.id === fieldId)?.label ?? fieldId;
      recordAiFeedback({
        timestamp: new Date().toISOString(), caseId: caseData?.id ?? '',
        instanceId: activeReportInstanceId ?? '', templateId: templateDetail?.template.id ?? '',
        fieldId, fieldLabel, aiValue: sug.value, aiConfidence: sug.confidence,
        userValue: v === 'verified' ? sug.value : (answers[fieldId] ?? sug.value),
        action: v === 'verified' ? 'confirmed' : 'overridden', source: sug.source,
        userId: user?.id, userName: user?.name,
      });
      return nextSuggestions;
    });
  }, [caseData, activeReportInstanceId, templateDetail, answers, user]);

  // ── Early returns ─────────────────────────────────────────────────────────
>>>>>>> upstream/main
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#94a3b8', fontSize: 14 }}>
      Loading synoptic report…
    </div>
  );
  if (error) return <div style={{ padding: 24, color: '#f87171', fontSize: 13 }}>{error}</div>;
  if (!caseData) return <div style={{ padding: 24, color: '#64748b' }}>No case loaded.</div>;
  if (!templateDetail) return (
<<<<<<< HEAD
    <TemplatePicker templates={availableTemplates} onSelect={async id => {
      const detail = await getTemplate(id);
      const updated = { ...caseData, synopticTemplateId: id, synopticAnswers: {} };
      onCaseUpdate?.(updated);
      setTemplateDetail(detail);
      setAnswers({});
      setAiSuggestions({});
      if (detail.template.sections.length > 0) setActiveSectionId(detail.template.sections[0].id);

      // Trigger AI to auto-populate suggestions from the case text
      const allFields = detail.template.sections.flatMap((s: any) => s.fields);
      const suggestions = await generateAiSuggestionsForReport(caseData, id, allFields);
      if (Object.keys(suggestions).length > 0) {
        setAiSuggestions(suggestions);
        // Pre-fill answers with AI values (user can verify/override)
        setAnswers(prev => {
          const prefilled = { ...prev };
          Object.entries(suggestions).forEach(([fieldId, sug]) => {
            if (!prefilled[fieldId]) prefilled[fieldId] = sug.value as string | string[];
          });
          return prefilled;
        });
=======
    <TemplatePicker
      templates={availableTemplates}
      specimenDescriptions={(caseData?.specimens ?? []).map(s => s.description ?? '')}
      onSelect={async id => {
      const detail = await getTemplateCached(id);
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
      const selectedOption = availableTemplates.find(t => t.id === id);
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
>>>>>>> upstream/main
      }
    }} />
  );

<<<<<<< HEAD
  const template = templateDetail.template;
  const visibleSections = template.sections.filter((s: EditorSection) => isVisible(s.visibleWhen, answers));
  const activeSection = visibleSections.find(s => s.id === activeSectionId) ?? visibleSections[0];

  let total = 0, answered = 0, reqTotal = 0, reqAnswered = 0;
  visibleSections.forEach((s: EditorSection) => s.fields.forEach((f: EditorField) => {
    if (!isVisible(f.visibleWhen, answers)) return;
    total++;
    const has = answers[f.id] !== undefined && answers[f.id] !== '' && !(Array.isArray(answers[f.id]) && (answers[f.id] as string[]).length === 0);
    if (has) answered++;
    if (f.required) { reqTotal++; if (has) reqAnswered++; }
=======
  // ── Derived values ────────────────────────────────────────────────────────
  const template = templateDetail.template;
  const visibleSections = template.sections.filter((s: EditorSection) => isVisible(s.visibleWhen, answers));
  const activeSection = visibleSections.find((s: EditorSection) => s.id === activeSectionId) ?? visibleSections[0];

  let total = 0, answered = 0, reqTotal = 0, reqAnswered = 0, unverifiedCount = 0;
  visibleSections.forEach((s: EditorSection) => s.fields.forEach((f: EditorField) => {
    if (!isVisible(f.visibleWhen, answers)) return;
    total++;
    const has = answers[f.id] !== undefined && answers[f.id] !== '' &&
      !(Array.isArray(answers[f.id]) && (answers[f.id] as string[]).length === 0);
    if (has) answered++;
    if (f.required) { reqTotal++; if (has) reqAnswered++; }
    // "Unverified" here means genuinely reviewable: an AI suggestion
    // exists (a human could actually look at something) and it hasn't
    // been explicitly confirmed or overridden yet. A field with no AI
    // suggestion at all isn't "unverified" in any meaningful sense —
    // there's nothing to review.
    if (aiSuggestions[f.id] && aiSuggestions[f.id].verification === 'unverified') unverifiedCount++;
>>>>>>> upstream/main
  }));

  const progressBadgeStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 10,
    background: reqAnswered === reqTotal ? 'rgba(16,185,129,0.15)' : 'rgba(251,191,36,0.15)',
    color: reqAnswered === reqTotal ? '#10b981' : '#fbbf24',
    border: `1px solid ${reqAnswered === reqTotal ? 'rgba(16,185,129,0.3)' : 'rgba(251,191,36,0.3)'}`,
    display: 'flex', alignItems: 'center', gap: 8,
  };

<<<<<<< HEAD
  const OrchestratorLeft = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#e2e8f0' }}>AI Narrative Report</h3>
          {lastGeneratedAt && <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>Last generated {lastGeneratedAt.toLocaleTimeString()}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {generateError && <span style={{ fontSize: 11, color: '#f87171' }}>⚠ {generateError}</span>}
          <button onClick={generateNarrative} disabled={isGenerating}
            style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
              border: '1px solid rgba(8,145,178,0.4)', background: 'rgba(8,145,178,0.15)',
              color: isGenerating ? '#64748b' : '#38bdf8', cursor: isGenerating ? 'not-allowed' : 'pointer' }}>
            {isGenerating ? '⏳ Generating…' : '↻ Regenerate'}
          </button>
        </div>
      </div>
      <div style={{ fontSize: 11, color: '#475569', marginBottom: 10, fontStyle: 'italic' }}>
        Auto-drafts as you fill synoptic fields · Edit freely after generation
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <NarrativeEditor value={narrativeContent} onChange={setNarrativeContent}
          readOnly={isGenerating} minHeight="calc(100vh - 320px)"
          placeholder="AI-generated narrative will appear here…" />
      </div>
    </div>
  );

=======
  // ── Section fields renderer ───────────────────────────────────────────────
>>>>>>> upstream/main
  const SectionFields = (sec: EditorSection) => (
    <div style={{ padding: '0 0 32px' }}>
      {sec.fields
        .filter((f: EditorField) => isVisible(f.visibleWhen, answers))
<<<<<<< HEAD
        .map((f: EditorField) => (
          <FieldRow
            key={f.id}
            field={f}
            value={answers[f.id] ?? ''}
            onChange={setAnswer}
            aiSuggestion={
              // Only pass suggestion if it meets the confidence threshold
              aiSuggestions[f.id]?.confidence >= confidenceThreshold
                ? aiSuggestions[f.id]
                : undefined
            }
            onVerify={handleVerify}
            isActive={activeFieldId === f.id}
            isPulsing={pulsingFieldId === f.id}
            fieldRef={el => { fieldRefs.current[f.id] = el; }}
            aiAttempted={
              // Show "AI: not found" if:
              // 1. AI ran for this report (other suggestions exist), AND
              // 2. Either no suggestion, or suggestion is below threshold
              Object.keys(aiSuggestions).length > 0 && (
                !aiSuggestions[f.id] ||
                aiSuggestions[f.id].confidence < confidenceThreshold
              )
            }
            onLabelClick={() => {
              setActiveFieldId(f.id);
              const source = aiSuggestions[f.id]?.source ?? null;
              onHighlight?.(source);
            }}
            onFieldFocus={(fid) => { lastJumpedFieldId.current = fid; }}
          />
        ))
      }
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '10px 24px 0', flexShrink: 0 }}>
=======
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
              // Previously: `aboveThreshold ? sug : undefined` — stripped
              // the suggestion entirely for low-confidence fields, which
              // also strips the Confirm/Override buttons (they're gated on
              // `aiSuggestion` being present inside FieldRow). That left
              // exactly the fields most in need of an explicit human
              // decision with no way to record one — only a passive
              // warning badge. Pass the suggestion through unconditionally
              // so low-confidence fields get the warning badge AND the
              // Confirm/Override buttons together, not instead of them.
              aiSuggestion={sug}
              belowThreshold={!!belowThresh}
              belowThresholdConf={belowThresh ? sug!.confidence : undefined}
              belowThresholdSource={belowThresh ? sug!.source : undefined}
              onVerify={handleVerify}
              isActive={activeFieldId === f.id}
              sourceNotFound={activeFieldId === f.id && !!highlightNotFound}
              isPulsing={pulsingFieldId === f.id}
              fieldRef={el => { fieldRefs.current[f.id] = el; }}
              aiAttempted={Object.keys(aiSuggestions).length > 0}
              onLabelClick={() => {
                setActiveFieldId(f.id);
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '10px 24px 0', flexShrink: 0 }}>

        {/* Header row */}
>>>>>>> upstream/main
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, borderBottom: '2px solid #0891B2', paddingBottom: 6 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>
            📝 {template.name}
          </h3>
<<<<<<< HEAD
          {/* Synoptic assignment badge */}
          {(() => {
            const inst = caseData?.synopticReports?.find(r => r.instanceId === activeReportInstanceId) as any;
            if (!inst?.assignedTo) return null;
            const isAssignee = inst.assignedTo === 'PATH-001'; // TODO: replace with auth context
            return (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                background: isAssignee ? 'rgba(6,182,212,0.15)' : 'rgba(100,116,139,0.15)',
                color: isAssignee ? '#22d3ee' : '#94a3b8',
                border: `1px solid ${isAssignee ? 'rgba(6,182,212,0.3)' : 'rgba(100,116,139,0.3)'}`,
              }}>
                {isAssignee ? '✎ Assigned to you' : `👤 ${inst.assignedToName ?? inst.assignedTo}`}
                {inst.requiresCountersign && !isAssignee ? ' · countersign required' : ''}
              </span>
            );
          })()}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {orchestratorMode && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(8,145,178,0.15)', color: '#38bdf8', border: '1px solid rgba(8,145,178,0.3)' }}>
                ⚡ Orchestrator
              </span>
            )}
            {/* Deferred status badge / toggle */}
            {(() => {
              const inst = caseData?.synopticReports?.find(r => r.instanceId === activeReportInstanceId) as any;
=======
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Assignment badge */}
            {(() => {
              const inst = getActiveReports(caseData).find(r => r.instanceId === activeReportInstanceId) as any;
              if (!inst?.assignedTo) return null;
              const isAssignee = inst.assignedTo === user?.id;
              return (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                  background: isAssignee ? 'rgba(6,182,212,0.15)' : 'rgba(100,116,139,0.15)',
                  color: isAssignee ? '#22d3ee' : '#94a3b8',
                  border: `1px solid ${isAssignee ? 'rgba(6,182,212,0.3)' : 'rgba(100,116,139,0.3)'}`,
                }}>
                  {isAssignee ? '✎ Assigned to you' : `👤 ${inst.assignedToName ?? inst.assignedTo}`}
                  {inst.requiresCountersign && !isAssignee ? ' · countersign required' : ''}
                </span>
              );
            })()}
            {orchestratorMode && (
              <button
                onClick={handleRegenerateFromGross}
                disabled={isRegenerating || !templateDetail}
                title={
                  !templateDetail
                    ? 'No synoptic template assigned to this specimen yet — nothing to regenerate against'
                    : "Regenerate AI suggestions for this synoptic from the current Gross description — never overwrites a field you've already answered"
                }
                style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                  background: 'rgba(8,145,178,0.15)', color: '#38bdf8',
                  border: '1px solid rgba(8,145,178,0.3)',
                  cursor: isRegenerating || !templateDetail ? 'default' : 'pointer',
                  opacity: isRegenerating || !templateDetail ? 0.5 : 1,
                }}
              >
                {isRegenerating ? '⚡ Generating…' : '⚡ Orchestrator'}
              </button>
            )}
            {/* Deferred toggle */}
            {(() => {
              const inst = getActiveReports(caseData).find(r => r.instanceId === activeReportInstanceId) as any;
>>>>>>> upstream/main
              const isDeferred = inst?.status === 'deferred';
              return (
                <button
                  title={isDeferred ? 'Marked as deferred — click to unmark' : 'Mark this synoptic as deferred (ancillary results pending)'}
                  onClick={() => {
                    if (!caseData || !activeReportInstanceId) return;
<<<<<<< HEAD
                    const idx = (caseData.synopticReports ?? []).findIndex(r => r.instanceId === activeReportInstanceId);
                    if (idx < 0) return;
                    const updated = { ...caseData };
                    const reports = [...(updated.synopticReports ?? [])];
                    reports[idx] = { ...reports[idx], status: isDeferred ? 'draft' : 'deferred' } as any;
                    updated.synopticReports = reports;
                    onCaseUpdate?.(updated as any);
=======
                    const idx = getActiveReports(caseData).findIndex(r => r.instanceId === activeReportInstanceId);
                    if (idx < 0) return;
                    const reports = [...getActiveReports(caseData)];
                    reports[idx] = { ...reports[idx], status: isDeferred ? 'draft' : 'deferred' } as any;
                    onCaseUpdate?.({ ...caseData, [activeReportsKey]: reports } as any);
>>>>>>> upstream/main
                  }}
                  style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
                    background: isDeferred ? 'rgba(245,158,11,0.15)' : 'rgba(100,116,139,0.08)',
                    border: `1px solid ${isDeferred ? 'rgba(245,158,11,0.4)' : 'rgba(100,116,139,0.2)'}`,
<<<<<<< HEAD
                    color: isDeferred ? '#fbbf24' : '#64748b',
                    cursor: 'pointer',
=======
                    color: isDeferred ? '#fbbf24' : '#64748b', cursor: 'pointer',
>>>>>>> upstream/main
                  }}
                >
                  {isDeferred ? '⏳ Deferred' : '⏳ Mark Deferred'}
                </button>
              );
            })()}
<<<<<<< HEAD
=======
            {/* Progress badge */}
>>>>>>> upstream/main
            <span style={progressBadgeStyle}>
              <span>{reqAnswered}/{reqTotal} req · {answered}/{total} total</span>
              <span style={{ display: 'inline-block', width: 48, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)', overflow: 'hidden', verticalAlign: 'middle' }}>
                <span style={{ display: 'block', height: '100%', width: `${reqTotal > 0 ? (reqAnswered / reqTotal) * 100 : 0}%`, borderRadius: 2, background: reqAnswered === reqTotal ? '#10b981' : '#fbbf24', transition: 'width 0.4s ease' }} />
              </span>
            </span>
          </div>
        </div>

<<<<<<< HEAD
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, padding: '5px 10px', background: 'rgba(8,145,178,0.06)', borderRadius: 8, border: '1px solid rgba(8,145,178,0.15)' }}>
          <span style={{ fontSize: 11, color: '#0369a1', fontWeight: 600 }}>Jump to:</span>
          <button
            onClick={() => {
              // Collect all unanswered fields across all visible sections in order
              const allUnanswered: { fieldId: string; sectionId: string }[] = [];
              for (const sec of visibleSections) {
                for (const f of sec.fields) {
                  if (isVisible(f.visibleWhen, answers) && !answers[f.id]) {
                    allUnanswered.push({ fieldId: f.id, sectionId: sec.id });
                  }
                }
              }
              if (allUnanswered.length === 0) return;
              const currentIdx = allUnanswered.findIndex(x => x.fieldId === lastJumpedFieldId.current);
              // Go to next after current; wrap to start if at end or not found
              const nextIdx = currentIdx >= 0 && currentIdx < allUnanswered.length - 1
                ? currentIdx + 1
                : 0;
              const next = allUnanswered[nextIdx];
              jumpToField(next.fieldId, next.sectionId);
            }}
            style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, border: '1.5px solid #0891B2', background: 'transparent', color: '#38bdf8', cursor: 'pointer' }}>
=======
        {/* Jump-to bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, padding: '5px 10px', background: 'rgba(8,145,178,0.06)', borderRadius: 8, border: '1px solid rgba(8,145,178,0.15)', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: '#0369a1', fontWeight: 600, whiteSpace: 'nowrap' }}>Jump to:</span>
          <button
            onClick={jumpBack}
            disabled={jumpHistoryLength === 0}
            style={{
              padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
              border: `1.5px solid ${jumpHistoryLength > 0 ? '#64748b' : 'rgba(100,116,139,0.25)'}`,
              background: 'transparent',
              color: jumpHistoryLength > 0 ? '#cbd5e1' : '#475569',
              cursor: jumpHistoryLength > 0 ? 'pointer' : 'not-allowed',
              whiteSpace: 'nowrap',
            }}
            title={jumpHistoryLength > 0 ? 'Return to the field you were just on' : 'Nowhere to go back to yet'}
          >
            ← Back
          </button>
          <button
            onClick={() => {
              const all: { fieldId: string; sectionId: string }[] = [];
              for (const sec of visibleSections)
                for (const f of sec.fields)
                  if (isVisible(f.visibleWhen, answers) && !answers[f.id])
                    all.push({ fieldId: f.id, sectionId: sec.id });
              if (!all.length) return;
              const cur = all.findIndex(x => x.fieldId === lastJumpedFieldId.current);
              const next = all[cur >= 0 && cur < all.length - 1 ? cur + 1 : 0];
              jumpToField(next.fieldId, next.sectionId);
            }}
            style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, border: '1.5px solid #0891B2', background: 'transparent', color: '#38bdf8', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
>>>>>>> upstream/main
            → Next Unanswered {total - answered > 0 ? `(${total - answered})` : '✓'}
          </button>
          <button
            onClick={() => {
<<<<<<< HEAD
              // Collect all unanswered required fields in order
              const allRequired: { fieldId: string; sectionId: string }[] = [];
              for (const sec of visibleSections) {
                for (const f of sec.fields) {
                  if (f.required && isVisible(f.visibleWhen, answers) && !answers[f.id]) {
                    allRequired.push({ fieldId: f.id, sectionId: sec.id });
                  }
                }
              }
              if (allRequired.length === 0) return;
              const currentIdx = allRequired.findIndex(x => x.fieldId === lastJumpedFieldId.current);
              const nextIdx = currentIdx >= 0 && currentIdx < allRequired.length - 1
                ? currentIdx + 1
                : 0;
              const next = allRequired[nextIdx];
              jumpToField(next.fieldId, next.sectionId);
            }}
            style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
              border: `1.5px solid ${reqAnswered < reqTotal ? '#dc2626' : '#10b981'}`,
              background: 'transparent',
              color: reqAnswered < reqTotal ? '#f87171' : '#10b981',
              cursor: 'pointer' }}>
            → Next Required {reqTotal - reqAnswered > 0 ? `(${reqTotal - reqAnswered})` : '✓'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {visibleSections.map((sec: EditorSection) => {
            const isActive = sec.id === (activeSectionId || visibleSections[0]?.id);
            const secAnswered = sec.fields.filter(f => isVisible(f.visibleWhen, answers) && answers[f.id]).length;
            const secTotal = sec.fields.filter(f => isVisible(f.visibleWhen, answers)).length;
            return (
              <button key={sec.id} onClick={() => setActiveSectionId(sec.id)}
                style={{
                  padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: isActive ? '#0891B2' : 'rgba(255,255,255,0.06)',
                  border: `2px solid ${isActive ? '#0891B2' : 'rgba(148,163,184,0.2)'}`,
                  color: isActive ? 'white' : '#cbd5e1',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(8,145,178,0.15)'; e.currentTarget.style.borderColor = 'rgba(8,145,178,0.5)'; e.currentTarget.style.color = '#7dd3fc'; }}}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(148,163,184,0.2)'; e.currentTarget.style.color = '#cbd5e1'; }}}>
                {sec.title}
                {secTotal > 0 && (
                  <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.8 }}>
                    ({secAnswered}/{secTotal})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {orchestratorMode ? (
        <div style={{ flex: 1, display: 'flex', gap: 0, minHeight: 0, overflow: 'hidden' }}>
          <div style={{ flex: '0 0 55%', padding: '0 20px 20px', overflowY: 'auto' }}>
            {OrchestratorLeft}
          </div>
          <div style={{ flex: 1, borderLeft: '1px solid rgba(255,255,255,0.08)', padding: '0 24px 24px', overflowY: 'auto' }}>
            {activeSection && SectionFields(activeSection)}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>
          {activeSection && (
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
                {activeSection.title}
              </h4>
              {SectionFields(activeSection)}
            </div>
          )}
        </div>
      )}
=======
              const all: { fieldId: string; sectionId: string }[] = [];
              for (const sec of visibleSections)
                for (const f of sec.fields)
                  if (f.required && isVisible(f.visibleWhen, answers) && !answers[f.id])
                    all.push({ fieldId: f.id, sectionId: sec.id });
              if (!all.length) return;
              const cur = all.findIndex(x => x.fieldId === lastJumpedFieldId.current);
              const next = all[cur >= 0 && cur < all.length - 1 ? cur + 1 : 0];
              jumpToField(next.fieldId, next.sectionId);
            }}
            style={{
              padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
              border: `1.5px solid ${reqAnswered < reqTotal ? '#dc2626' : '#10b981'}`,
              background: 'transparent',
              color: reqAnswered < reqTotal ? '#f87171' : '#10b981',
              cursor: 'pointer',
            }}
          >
            → Next Required {reqTotal - reqAnswered > 0 ? `(${reqTotal - reqAnswered})` : '✓'}
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
            style={{
              padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
              border: `1.5px solid ${unverifiedCount > 0 ? '#a78bfa' : '#10b981'}`,
              background: 'transparent',
              color: unverifiedCount > 0 ? '#c4b5fd' : '#10b981',
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
            title="AI-suggested values that haven't been explicitly confirmed or overridden yet"
          >
            → Next Unverified {unverifiedCount > 0 ? `(${unverifiedCount})` : '✓'}
          </button>
        </div>

        {/* Section tabs + view mode toggle */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
          {/* Toggle button */}
          <div style={{ display: 'flex', borderRadius: 6, border: '1px solid rgba(148,163,184,0.2)', overflow: 'hidden', flexShrink: 0 }}>
            <button
              onClick={() => setViewMode('tabs')}
              title="Tab view — one section at a time"
              style={{
                padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none',
                background: viewMode === 'tabs' ? '#0e7490' : 'transparent',
                color: viewMode === 'tabs' ? '#fff' : '#cbd5e1',
                transition: 'all 0.15s',
              }}
            >
              ⊟ Tabs
            </button>
            <button
              onClick={() => setViewMode('page')}
              title="Page view — all sections scrollable"
              style={{
                padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none',
                borderLeft: '1px solid rgba(148,163,184,0.2)',
                background: viewMode === 'page' ? '#0e7490' : 'transparent',
                color: viewMode === 'page' ? '#fff' : '#cbd5e1',
                transition: 'all 0.15s',
              }}
            >
              ☰ Page
            </button>
          </div>

          {/* Section tabs — tabs mode only */}
          {viewMode === 'tabs' && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
              {visibleSections.map((sec: EditorSection) => {
                const isActive = sec.id === (activeSectionId || visibleSections[0]?.id);
                const secAnswered = sec.fields.filter((f: EditorField) => isVisible(f.visibleWhen, answers) && answers[f.id]).length;
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
                    style={{
                      padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      background: isActive ? '#0e7490' : 'rgba(255,255,255,0.06)',
                      border: `2px solid ${isActive ? '#0e7490' : secUnverified > 0 ? 'rgba(251,191,36,0.5)' : 'rgba(148,163,184,0.2)'}`,
                      color: isActive ? 'white' : '#cbd5e1', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(8,145,178,0.15)'; e.currentTarget.style.borderColor = 'rgba(8,145,178,0.5)'; e.currentTarget.style.color = '#7dd3fc'; }}}
                    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = secUnverified > 0 ? 'rgba(251,191,36,0.5)' : 'rgba(148,163,184,0.2)'; e.currentTarget.style.color = '#cbd5e1'; }}}
                  >
                    {sec.title}
                    {secTotal > 0 && <span style={{ marginLeft: 6, fontSize: 10 }}>({secAnswered}/{secTotal})</span>}
                    {secUnverified > 0 && (
                      <span
                        style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: isActive ? '#fde68a' : '#fbbf24' }}
                        title={`${secUnverified} AI suggestion${secUnverified === 1 ? '' : 's'} awaiting review on this tab`}
                      >
                        · {secUnverified} unverified
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
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>

        {/* Tabs mode — single active section */}
        {viewMode === 'tabs' && activeSection && (
          <div>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: '#8a9db5', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
              {activeSection.title}
            </h4>
            {SectionFields(activeSection)}
          </div>
        )}

        {/* Page mode — all sections stacked */}
        {viewMode === 'page' && visibleSections.map((sec: EditorSection, idx: number) => (
          <div key={sec.id} style={{ marginBottom: idx < visibleSections.length - 1 ? 32 : 0 }}>
            <div
              ref={el => { sectionHeaderRefs.current[sec.id] = el; }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
                paddingBottom: 8, borderBottom: '1px solid rgba(8,145,178,0.25)',
              }}
            >
              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0, flex: 1 }}>
                {sec.title}
              </h4>
              {(() => {
                const secAnswered = sec.fields.filter((f: EditorField) => isVisible(f.visibleWhen, answers) && answers[f.id]).length;
                const secTotal    = sec.fields.filter((f: EditorField) => isVisible(f.visibleWhen, answers)).length;
                const secUnverified = sec.fields.filter((f: EditorField) =>
                  isVisible(f.visibleWhen, answers) &&
                  aiSuggestions[f.id] && aiSuggestions[f.id].verification === 'unverified'
                ).length;
                return (
                  <>
                    {secTotal > 0 && (
                      <span style={{ fontSize: 10, color: secAnswered === secTotal ? '#10b981' : '#8a9db5', fontWeight: 600 }}>
                        {secAnswered}/{secTotal}
                      </span>
                    )}
                    {secUnverified > 0 && (
                      <span
                        style={{ fontSize: 10, fontWeight: 700, color: '#fbbf24' }}
                        title={`${secUnverified} AI suggestion${secUnverified === 1 ? '' : 's'} awaiting review on this tab`}
                      >
                        {secUnverified} unverified
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
>>>>>>> upstream/main
    </div>
  );
});

RightSynopticPanel.displayName = 'RightSynopticPanel';
<<<<<<< HEAD

export default RightSynopticPanel;
=======
export default RightSynopticPanel;
>>>>>>> upstream/main
