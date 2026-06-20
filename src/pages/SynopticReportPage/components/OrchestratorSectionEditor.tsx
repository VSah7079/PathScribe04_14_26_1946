// src/pages/SynopticReportPage/components/OrchestratorSectionEditor.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Section-based narrative editor for Orchestration mode — right-hand pane.
//
// Deliberately mirrors RightSynopticPanel's structure so a pathologist who
// knows CoPilot mode already knows this layout:
//   • Sticky header: title bar → completion summary → Jump-to bar →
//     view-mode toggle (Tabs/Page) + section pills
//   • Tabs mode: one section visible at a time
//   • Page mode: all sections stacked, single scroll
//
// Architectural shift from the old OrchestratorReportPanel: sections are now
// first-class — each gets its OWN NarrativeEditor instance, rather than one
// merged ProseMirror document with non-editable anchor headings. This avoids
// the entire class of "anchor accidentally editable" / cursor-placement-after-
// heading bugs we hit with the single-document approach.
//
// One shared toolbar is portalled from whichever section is currently
// focused — same principle as the old version, just retargeted dynamically.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import NarrativeEditor from '@/components/Editor/NarrativeEditor';
import { useVoice } from '@/contexts/VoiceProvider';
import type { PathScribeEditorHandle } from '@/components/Editor/PathScribeEditorRef';
import type { Case } from '@/types/case/Case';
import { mockMacroService } from '@/services/macros/mockMacroService';
import { useSystemConfig } from '@/contexts/SystemConfigContext';
import { PathScribeAIService, type SpellingFlag } from '@/services/aiIntegration/GeminiAIIntegrationService';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OrchestratorSection {
  id:                  string;
  label:               string;
  type?:               'narrative' | 'synoptic';
  synopticInstanceId?: string;
  text:                string;
  aiGenerated:         string;
  userEdited:          boolean;
  isStreaming:         boolean;
  pendingDraft?:       string;
  required?:           boolean;
  hint?:               string;
  committed?:          boolean;
  lockedAt?:           string;
}

type SectionStatus = 'empty' | 'ai-generated' | 'accepted' | 'accepted-manual';

function getSectionStatus(s: OrchestratorSection): SectionStatus {
  if (!s.text && !s.aiGenerated) return 'empty';
  if (s.committed || s.userEdited) {
    // Was this ever AI-sourced, or is this purely the pathologist's own
    // writing? Mirrors RightSynopticPanel's distinction between "AI
    // Confirmed" (AI drafted it, pathologist signed off) and "Manual —
    // AI missed" (pathologist wrote it because AI had nothing).
    return s.aiGenerated ? 'accepted' : 'accepted-manual';
  }
  if (s.aiGenerated) return 'ai-generated';
  return 'empty';
}

const STATUS_META: Record<SectionStatus, { color: string; title: string; icon: string }> = {
  'empty':           { color: '#475569', title: 'Empty',          icon: '○' },
  'ai-generated':    { color: '#0891b2', title: 'AI generated',   icon: '◉' },
  // Matches RightSynopticPanel's field-level convention exactly: once
  // accepted, the badge still names the AI's involvement explicitly
  // ("AI Confirmed") rather than going generic ("Accepted") — provenance
  // stays visible permanently, only the styling/urgency settles down.
  'accepted':        { color: '#10b981', title: 'AI Confirmed',   icon: '✓' },
  // Pathologist wrote this section themselves — AI had no draft for it.
  // Distinct purple styling, same as RightSynopticPanel's "Manual — AI
  // missed" field badge.
  'accepted-manual': { color: '#c084fc', title: 'Manual entry',   icon: '✎' },
};

// ── HTML helpers — unchanged from the original implementation ────────────────

export function textToHtml(text: string): string {
  if (!text.trim()) return '';
  if (text.trimStart().startsWith('<')) return text;
  return '<p>' + text.split(/\n\n+/).filter(Boolean).join('</p><p>') + '</p>';
}

// ── Spell-check review popover ────────────────────────────────────────────────
// Shows one flagged word at a time, highlighted in its surrounding sentence
// for context, with the AI's suggestion and three actions: apply the fix,
// keep the original wording, or skip (move on without deciding either way —
// functionally same as keep, but visually distinct so the pathologist knows
// they explicitly chose not to engage with this one).

function getWordContext(plainText: string, original: string, radius = 40): { before: string; after: string } {
  const idx = plainText.indexOf(original);
  if (idx === -1) return { before: '', after: '' };
  const start = Math.max(0, idx - radius);
  const end   = Math.min(plainText.length, idx + original.length + radius);
  return {
    before: (start > 0 ? '…' : '') + plainText.slice(start, idx),
    after:  plainText.slice(idx + original.length, end) + (end < plainText.length ? '…' : ''),
  };
}

const SpellCheckPopover: React.FC<{
  sectionLabel: string;
  text: string;       // current working HTML — used to derive plain-text context
  flag: SpellingFlag;
  index: number;
  total: number;
  onFix: () => void;
  onKeep: () => void;
  onSkip: () => void;
  onCancel: () => void;
}> = ({ sectionLabel, text, flag, index, total, onFix, onKeep, onSkip, onCancel }) => {
  const plainText = useMemo(() => text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(), [text]);
  const { before, after } = useMemo(() => getWordContext(plainText, flag.original), [plainText, flag.original]);

  return (
    <div className="ps-ose-spellcheck-overlay">
      <div className="ps-ose-spellcheck-popover">
        <div className="ps-ose-spellcheck-header">
          <span className="ps-ose-spellcheck-eyebrow">✦ Spelling check · {sectionLabel}</span>
          <span className="ps-ose-spellcheck-counter">{index + 1} of {total}</span>
        </div>

        <div className="ps-ose-spellcheck-context">
          {before}<mark className="ps-ose-spellcheck-flagged">{flag.original}</mark>{after}
        </div>

        <div className="ps-ose-spellcheck-suggestion-row">
          <span className="ps-ose-spellcheck-arrow">→</span>
          <span className="ps-ose-spellcheck-suggestion">{flag.suggestion}</span>
        </div>
        <div className="ps-ose-spellcheck-reason">{flag.reason}</div>

        <div className="ps-ose-spellcheck-actions">
          <button className="ps-ose-spellcheck-btn ps-ose-spellcheck-btn--skip" onClick={onSkip} title="Move on without deciding">Skip</button>
          <button className="ps-ose-spellcheck-btn ps-ose-spellcheck-btn--keep" onClick={onKeep} title="Keep original wording">Keep original</button>
          <button className="ps-ose-spellcheck-btn ps-ose-spellcheck-btn--fix" onClick={onFix} title="Apply suggested correction">✓ Apply fix</button>
        </div>

        <button className="ps-ose-spellcheck-cancel" onClick={onCancel}>Cancel review — accept as written</button>
      </div>
    </div>
  );
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  sections:             OrchestratorSection[];
  isGenerating:         boolean;
  onSectionChange:      (sectionId: string, html: string) => void;
  onAcceptDraft:        (sectionId: string) => void;
  onKeepVersion:        (sectionId: string) => void;
  // ── Explicit Accept — distinct from onSectionChange ──────────────────────
  // Accept must unambiguously mark a section as accepted regardless of
  // whether the text actually changed (it usually doesn't — Accept on an
  // AI draft commits it as-is, or with spell-check corrections applied).
  // Relying on onSectionChange's text-equality inference for this was the
  // bug: a no-op text pass-through could fail to flip userEdited, leaving
  // the Accept button visibly "active" on an already-accepted section.
  onAcceptSection?:     (sectionId: string, finalText: string) => void;
  onRegenerateSection?: (sectionId: string) => void;
  onEditSynoptic?:      (instanceId: string) => void;
  lastGeneratedAt?:     Date | null;
  caseData?:            Case | null;
  resolvedTemplateName?:string;
  resolvedBy?:          string;
  overrideTemplateId?:  string | null;
  onOverrideTemplate?:  (templateId: string | null) => void;
  onAcceptAll?:         () => void;

  // ── Shared active-section state — lifted to SynopticReportPage so the
  //    navigator, centre Full Report pane, and this editor all stay in sync.
  activeSectionId?:     string | null;
  onActiveSectionChange?: (id: string) => void;

  // ── User-configurable tab width — lifted to SynopticReportPage so the
  //    setting is shared/persisted across all section editors in this case.
  tabWidthChars?:       number;
  onTabWidthChange?:    (chars: number) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

const OrchestratorSectionEditor: React.FC<Props> = ({
  sections, isGenerating, onSectionChange, onAcceptDraft, onKeepVersion,
  onRegenerateSection, onEditSynoptic, lastGeneratedAt, caseData,
  resolvedTemplateName, resolvedBy, overrideTemplateId, onOverrideTemplate,
  onAcceptAll, activeSectionId, onActiveSectionChange,
  tabWidthChars = 4, onTabWidthChange, onAcceptSection,
}) => {
  // ── Refs ─────────────────────────────────────────────────────────────────────
  const editorRefs    = useRef<Record<string, PathScribeEditorHandle | null>>({});
  const sectionRefs   = useRef<Record<string, HTMLDivElement | null>>({});
  const pageScrollRef = useRef<HTMLDivElement>(null);

  // ── Jurisdiction — for locale-aware spelling checks ──────────────────────────
  const { config: systemConfig } = useSystemConfig();
  const aiService = useMemo(() => new PathScribeAIService(), []);

  // ── Spell-check review state ─────────────────────────────────────────────────
  // When Accept is clicked, we run a spelling check before actually committing.
  // If flags come back, spellCheckReview holds the in-progress review so the
  // popover can render; null means no review is active.
  const [spellCheckReview, setSpellCheckReview] = useState<{
    sectionId: string;
    text: string;            // working copy — edited as flags are resolved
    flags: SpellingFlag[];
    flagIndex: number;
  } | null>(null);
  const [spellCheckLoading, setSpellCheckLoading] = useState<string | null>(null); // sectionId currently being checked

  // ── View mode ─────────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<'tabs' | 'page'>('page');

  // ── Active section — controlled from parent or local fallback ────────────────
  const [localActiveId, setLocalActiveId] = useState<string>(sections[0]?.id ?? '');
  const activeId = activeSectionId ?? localActiveId;
  const setActiveId = useCallback((id: string) => {
    setLocalActiveId(id);
    onActiveSectionChange?.(id);
  }, [onActiveSectionChange]);

  // ── Focused section — determines which editor owns the portalled toolbar ──────
  const [focusedSectionId, setFocusedSectionId] = useState<string>(activeId);
  useEffect(() => { setFocusedSectionId(activeId); }, [activeId]);

  const activeSection = sections.find(s => s.id === activeId) ?? sections[0];

  // ── jumpToSection — must be declared before any useEffect that calls it ───────
  const jumpToSection = useCallback((id: string) => {
    setActiveId(id);
    if (viewMode === 'page') {
      setTimeout(() => {
        const el = sectionRefs.current[id];
        const container = pageScrollRef.current;
        if (el && container) {
          const containerRect = container.getBoundingClientRect();
          const elRect = el.getBoundingClientRect();
          const relativeTop = elRect.top - containerRect.top + container.scrollTop;
          container.scrollTo({ top: Math.max(0, relativeTop - 16), behavior: 'smooth' });
        }
      }, 30);
    }
    setTimeout(() => {
      const handle = editorRefs.current[id];
      const editor = handle?.getEditor?.();
      if (!editor) return;
      try { editor.commands.focus('start'); } catch { /* ignore */ }
    }, viewMode === 'page' ? 200 : 50);
  }, [viewMode, setActiveId]);

  // ── Voice dictation ───────────────────────────────────────────────────────────
  const { startDictation, stopDictation, phase, dictationTarget } = useVoice();

  const registerDictationTarget = useCallback((section: OrchestratorSection) => {
    const editorHandle = editorRefs.current[section.id];
    const editor = editorHandle?.getEditor?.();
    if (!editor) return;
    startDictation({
      fieldId: section.id,
      label:   section.label,
      context: section.label.toLowerCase().replace(/[^a-z]/g, ' ').trim(),
      onText: (text: string, isInterim?: boolean) => {
        editor.chain().focus().insertContent(text + (isInterim ? '' : ' ')).run();
        onSectionChange(section.id, editor.getHTML());
      },
      onDone: () => { /* VoiceProvider handles phase reset */ },
    });
  }, [startDictation, onSectionChange]);

  // ── Bind NavBar mic to the focused section ────────────────────────────────────
  // The mic button lives outside this component (NavBar/VoiceToggleButton) and
  // we deliberately don't import or modify it — everything here reacts to
  // VoiceProvider's shared state instead, via useVoice().
  //
  // When the pathologist presses the mic with no specific target already set
  // (dictationTarget === null) and a section in THIS editor currently has
  // focus, we register that section as the dictation target — wiring the
  // editor's onText handler into the stream that's already running.
  //
  // CRITICAL: this only runs when phase has ALREADY transitioned to 'dictate'
  // — i.e. in response to the mic being pressed — never as a side effect of
  // focusing a field. Focusing a field on its own does nothing here.
  useEffect(() => {
    if (phase !== 'dictate' || dictationTarget) return;
    const section = sections.find(s => s.id === focusedSectionId);
    if (!section || section.committed) return;
    registerDictationTarget(section);
  }, [phase, dictationTarget, focusedSectionId, sections, registerDictationTarget]);

  // ── Insert Specimen (IS) ───────────────────────────────────────────────────────
  // Inserts one line per specimen on the case, in the exact format:
  //   Specimen A: [Right hemicolectomy]
  //   Specimen B: [Ileocolic lymph node]
  //   Specimen C: [Appendix]
  // Pulled live from caseData.specimens — same source as the left sidebar and
  // the Add/Edit Specimen modal, so this always reflects the case's actual
  // specimen list, not a stale snapshot.
  const insertSpecimens = useCallback((section: OrchestratorSection) => {
    const editorHandle = editorRefs.current[section.id];
    const editor = editorHandle?.getEditor?.();
    if (!editor) return;

    const specimens = caseData?.specimens ?? [];
    if (specimens.length === 0) return;

    const html = specimens
      .map(sp => `<p>Specimen ${sp.label}: [${sp.description}]</p>`)
      .join('');

    editor.chain().focus().insertContent(html).run();
    onSectionChange(section.id, editor.getHTML());
  }, [caseData, onSectionChange]);

  // ── Accept with spell check ───────────────────────────────────────────────────
  // Runs a locale-aware spelling check before committing the Accept. If the
  // check finds nothing, accept proceeds immediately (no added friction for
  // the common case). If it finds flags, we open the review popover instead
  // of accepting — the section only actually commits once the pathologist
  // has stepped through every flag (fix, keep, or skip).
  const handleAcceptWithSpellCheck = useCallback(async (section: OrchestratorSection) => {
    setSpellCheckLoading(section.id);
    try {
      const result = await aiService.checkSpelling(section.text, systemConfig?.jurisdiction);
      const commit = (finalText: string) => {
        if (onAcceptSection) onAcceptSection(section.id, finalText);
        else onSectionChange(section.id, finalText); // fallback for parents not yet wired
      };
      if (result.success && result.data.flags.length > 0) {
        setSpellCheckReview({
          sectionId: section.id,
          text: section.text,
          flags: result.data.flags,
          flagIndex: 0,
        });
      } else {
        // No flags (or check failed) — accept as-is rather than blocking
        // the pathologist on an AI service hiccup.
        commit(section.text);
      }
    } finally {
      setSpellCheckLoading(null);
    }
  }, [aiService, systemConfig?.jurisdiction, onSectionChange, onAcceptSection]);

  // Resolve the current flag in an active review: apply the suggestion,
  // keep the original wording, or just move on (skip = same as keep, but
  // tracked separately in case we want different telemetry later).
  const resolveSpellCheckFlag = useCallback((action: 'fix' | 'keep' | 'skip') => {
    setSpellCheckReview(prev => {
      if (!prev) return prev;
      const flag = prev.flags[prev.flagIndex];
      const nextText = action === 'fix' && flag
        ? prev.text.split(flag.original).join(flag.suggestion)
        : prev.text;

      const nextIndex = prev.flagIndex + 1;
      if (nextIndex >= prev.flags.length) {
        // All flags resolved — commit the section now, explicitly
        if (onAcceptSection) onAcceptSection(prev.sectionId, nextText);
        else onSectionChange(prev.sectionId, nextText);
        return null;
      }
      return { ...prev, text: nextText, flagIndex: nextIndex };
    });
  }, [onSectionChange, onAcceptSection]);

  const cancelSpellCheckReview = useCallback(() => {
    // Cancel = accept the section as originally written, flags un-applied.
    // The pathologist saw the flags existed (via the popover) and chose not
    // to act on them right now — that's a legitimate outcome, not an error.
    setSpellCheckReview(prev => {
      if (prev) {
        if (onAcceptSection) onAcceptSection(prev.sectionId, prev.text);
        else onSectionChange(prev.sectionId, prev.text);
      }
      return null;
    });
  }, [onSectionChange, onAcceptSection]);

  // ── Voice / keyboard event listeners ─────────────────────────────────────────
  useEffect(() => {
    const onJumpSection = (e: Event) => {
      const idx = (e as CustomEvent).detail?.index ?? 0;
      const section = sections[idx];
      if (section) jumpToSection(section.id);
    };
    const onNextSection = () => {
      const idx = sections.findIndex(s => s.id === activeId);
      const next = sections[idx + 1];
      if (next) jumpToSection(next.id);
    };
    const onPrevSection = () => {
      const idx = sections.findIndex(s => s.id === activeId);
      const prev = sections[idx - 1];
      if (prev) jumpToSection(prev.id);
    };
    const onRegenAll = () => {
      if (onRegenerateSection) sections.forEach(s => onRegenerateSection(s.id));
    };
    const onDictateSection = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        sectionId?: string;
        sectionIndex?: number;
        label?: string;
      };
      let section: OrchestratorSection | undefined;
      if (detail.sectionId)    section = sections.find(s => s.id === detail.sectionId);
      if (!section && detail.sectionIndex !== undefined) section = sections[detail.sectionIndex];
      if (!section && detail.label) {
        const q = detail.label.toLowerCase();
        section = sections.find(s => s.label.toLowerCase().includes(q));
      }
      if (!section) return;
      jumpToSection(section.id);
      registerDictationTarget(section);
    };

    window.addEventListener('PATHSCRIBE_ORCH_JUMP_SECTION',    onJumpSection);
    window.addEventListener('PATHSCRIBE_ORCH_NEXT_SECTION',    onNextSection);
    window.addEventListener('PATHSCRIBE_ORCH_PREV_SECTION',    onPrevSection);
    window.addEventListener('PATHSCRIBE_ORCH_REGEN_ALL',       onRegenAll);
    window.addEventListener('PATHSCRIBE_ORCH_DICTATE_SECTION', onDictateSection);

    return () => {
      window.removeEventListener('PATHSCRIBE_ORCH_JUMP_SECTION',    onJumpSection);
      window.removeEventListener('PATHSCRIBE_ORCH_NEXT_SECTION',    onNextSection);
      window.removeEventListener('PATHSCRIBE_ORCH_PREV_SECTION',    onPrevSection);
      window.removeEventListener('PATHSCRIBE_ORCH_REGEN_ALL',       onRegenAll);
      window.removeEventListener('PATHSCRIBE_ORCH_DICTATE_SECTION', onDictateSection);
    };
  }, [sections, activeId, jumpToSection, onRegenerateSection, registerDictationTarget]);

  // ── Macros — loaded from service ────────────────────────────────────────────
  const [macros, setMacros] = useState<{ id: string; trigger: string; name: string; content: string }[]>([]);
  useEffect(() => {
    mockMacroService.getAll().then(r => {
      if (r.ok) {
        setMacros(
          r.data.filter(m => m.status === 'Active').map(m => ({
            id: m.id, trigger: m.shortcut, name: m.name, content: m.content,
          }))
        );
      }
    });
  }, []);

  // ── Completion summary (mirrors synoptic panel's answered/total badges) ─────
  const totalSections = sections.length;
  const acceptedCount = sections.filter(s => { const st = getSectionStatus(s); return st === 'accepted' || st === 'accepted-manual'; }).length;
  const requiredSections = sections.filter(s => s.required);
  const requiredDone     = requiredSections.filter(s => { const st = getSectionStatus(s); return st === 'accepted' || st === 'accepted-manual'; }).length;

  // ── Jump-to: Next Unanswered / Next Required ────────────────────────────────

  const jumpToNextEmpty = useCallback(() => {
    const all = sections.filter(s => !s.text);
    if (!all.length) return;
    const curIdx = all.findIndex(s => s.id === activeId);
    const next = all[curIdx >= 0 && curIdx < all.length - 1 ? curIdx + 1 : 0];
    jumpToSection(next.id);
  }, [sections, activeId, jumpToSection]);

  const jumpToNextRequired = useCallback(() => {
    const all = requiredSections.filter(s => { const st = getSectionStatus(s); return st !== 'accepted' && st !== 'accepted-manual'; });
    if (!all.length) return;
    const curIdx = all.findIndex(s => s.id === activeId);
    const next = all[curIdx >= 0 && curIdx < all.length - 1 ? curIdx + 1 : 0];
    jumpToSection(next.id);
  }, [requiredSections, activeId, jumpToSection]);

  // ── Render one section's editor card ────────────────────────────────────────
  const renderSectionCard = (section: OrchestratorSection, showHeader: boolean) => {
    const status = getSectionStatus(section);
    const meta = STATUS_META[status];
    const isLocked = !!section.committed;
    return (
      <div
        key={section.id}
        ref={el => { sectionRefs.current[section.id] = el; }}
        className={`ps-ose-section-card${activeId === section.id ? ' ps-ose-section-card--active' : ''}${isLocked ? ' ps-ose-section-card--locked' : ''}`}
      >
        {showHeader && (
          <div className="ps-ose-section-card-header">
            <span className="ps-ose-section-card-title">{section.label}</span>
            <span className="ps-ose-section-card-status" style={{ color: meta.color }} title={meta.title}>
              {meta.icon} {meta.title}
            </span>
            {section.required && status !== 'accepted' && status !== 'accepted-manual' && (
              <span className="ps-ose-section-card-required" title="Required">⚠ Required</span>
            )}
            {isLocked && (
              <span className="ps-ose-section-card-locked-badge" title="Committed — locked. Editing requires an Amendment.">
                🔒 Locked
              </span>
            )}
            {/* Insert Specimen — available on any unlocked section, independent of accept status */}
            {!isLocked && (caseData?.specimens?.length ?? 0) > 0 && (
              <button
                className="ps-ose-section-insert-specimen-btn"
                title={`Insert all ${caseData?.specimens?.length} specimen(s) as "Specimen [Letter]: [Description]"`}
                onClick={() => insertSpecimens(section)}
              >
                IS
              </button>
            )}
            {/* Per-section accept — only shown for AI-generated, unaccepted sections */}
            {!isLocked && status === 'ai-generated' && !isGenerating && (
              <button
                className="ps-ose-section-accept-btn"
                title="Check spelling and accept this section"
                disabled={spellCheckLoading === section.id}
                onClick={() => handleAcceptWithSpellCheck(section)}
              >
                {spellCheckLoading === section.id ? '⋯ Checking' : '✓ Accept'}
              </button>
            )}

          </div>
        )}
        <div
          className={`ps-ose-section-card-body${isLocked ? ' ps-ose-section-card-body--locked' : ''}`}
          onFocus={() => {
            if (isLocked) return;
            setActiveId(section.id);
            setFocusedSectionId(section.id);
            // Passive focus tracking only — does NOT call startDictation.
            // focusedSectionId is read by the NavBar mic handler (in
            // AppShell/NavBar — outside this component) to know which
            // section to target IF the pathologist explicitly presses the
            // mic. Voice should only ever activate from an explicit action:
            // a recognized "Dictate [section]" command, or a deliberate
            // mic press — never as a side effect of clicking into a field.
          }}
          onBlur={() => {
            // Only stop dictation on blur if we're actively dictating —
            // don't interrupt if the pathologist clicked the NavBar mic
            // or another app control while the section was focused.
            // VoiceProvider's stop phrases ("done", "stop dictation") are
            // the primary exit path during active dictation.
          }}
        >
          {isLocked && (
            <div className="ps-ose-locked-overlay-note">
              This section is committed and read-only. Use Delegate → Amendment to make changes after sign-out.
            </div>
          )}
          <NarrativeEditor
            ref={(h: any) => { editorRefs.current[section.id] = h; }}
            value={textToHtml(section.text)}
            onChange={html => onSectionChange(section.id, html)}
            readOnly={isGenerating || isLocked}
            minHeight="120px"
            placeholder={section.hint ?? `Begin ${section.label.toLowerCase()}…`}
            macros={macros}
            suppressToolbar
            theme="dark"
            toolbarPortalId={!isLocked && focusedSectionId === section.id ? 'ps-ose-tb-portal' : undefined}
            tabWidthChars={tabWidthChars}
            onTabWidthChange={onTabWidthChange}
          />
        </div>
        {section.pendingDraft && (
          <div className="ps-ose-pending-banner">
            <span>New AI draft available for this section.</span>
            <div className="ps-ose-pending-actions">
              <button onClick={() => onAcceptDraft(section.id)} className="ps-ose-pending-btn ps-ose-pending-btn--accept">Use new draft</button>
              <button onClick={() => onKeepVersion(section.id)} className="ps-ose-pending-btn">Keep my version</button>
            </div>
          </div>
        )}
        {spellCheckReview && spellCheckReview.sectionId === section.id && (
          <SpellCheckPopover
            sectionLabel={section.label}
            text={spellCheckReview.text}
            flag={spellCheckReview.flags[spellCheckReview.flagIndex]}
            index={spellCheckReview.flagIndex}
            total={spellCheckReview.flags.length}
            onFix={() => resolveSpellCheckFlag('fix')}
            onKeep={() => resolveSpellCheckFlag('keep')}
            onSkip={() => resolveSpellCheckFlag('skip')}
            onCancel={cancelSpellCheckReview}
          />
        )}
      </div>
    );
  };

  return (
    <div className="ps-ose-shell">

      {/* ── Sticky header zone ─────────────────────────────────────────────── */}
      <div className="ps-ose-sticky-header">

        {/* Single row: [Tabs/Page — left] [Jump to — center] [counts/actions — right] */}
        <div className="ps-ose-summary-row">

          {/* Group 1: Tabs / Page toggle — left justified */}
          <div className="ps-ose-view-toggle">
            <button
              className={`ps-ose-view-toggle-btn${viewMode === 'tabs' ? ' ps-ose-view-toggle-btn--active' : ''}`}
              onClick={() => setViewMode('tabs')}
              title="Tab view — one section at a time"
            >⊟ Tabs</button>
            <button
              className={`ps-ose-view-toggle-btn${viewMode === 'page' ? ' ps-ose-view-toggle-btn--active' : ''}`}
              onClick={() => setViewMode('page')}
              title="Page view — all sections scrollable"
            >☰ Page</button>
          </div>

          {/* Group 2: Jump to — center */}
          <div className="ps-ose-summary-centre">
            <span className="ps-ose-jumpto-label">Jump to:</span>
            <button className="ps-ose-jumpto-btn ps-ose-jumpto-btn--unanswered" onClick={jumpToNextEmpty}>
              → Next Empty {totalSections - sections.filter(s => s.text).length > 0 ? `(${totalSections - sections.filter(s => s.text).length})` : '✓'}
            </button>
            <button
              className={`ps-ose-jumpto-btn ps-ose-jumpto-btn--required${requiredDone < requiredSections.length ? ' ps-ose-jumpto-btn--required-pending' : ''}`}
              onClick={jumpToNextRequired}
            >
              → Next Required {requiredSections.length - requiredDone > 0 ? `(${requiredSections.length - requiredDone})` : '✓'}
            </button>
          </div>

          {/* Group 3: counts + actions — right justified */}
          <div className="ps-ose-summary-right">
            {isGenerating && (
              <span className="ps-ose-generating-badge"><span className="ps-ose-dot-pulse" />Generating…</span>
            )}
            {!isGenerating && lastGeneratedAt && (
              <span className="ps-ose-generated-time">
                Generated {lastGeneratedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <span className="ps-ose-summary-count">
              {acceptedCount}/{totalSections} sections
            </span>
            {requiredSections.length > 0 && (
              <span className={`ps-ose-summary-count${requiredDone < requiredSections.length ? ' ps-ose-summary-count--warn' : ' ps-ose-summary-count--ok'}`}>
                {requiredDone}/{requiredSections.length} required
              </span>
            )}
            {onRegenerateSection && !isGenerating && (
              <button
                className="ps-ose-summary-btn ps-ose-regen-btn"
                onClick={() => sections.forEach(s => onRegenerateSection(s.id))}
                title="Regenerate all sections"
              >↺ Regen all</button>
            )}
            {onAcceptAll && !isGenerating && sections.some(s => s.aiGenerated && !s.userEdited && !s.committed) && (
              <button className="ps-ose-summary-btn ps-ose-accept-btn" onClick={onAcceptAll} title="Accept all AI-generated sections">
                ✓ Accept all
              </button>
            )}
          </div>
        </div>

        {/* Row 2: section pills — Tabs mode only */}
        {viewMode === 'tabs' && (
          <div className="ps-ose-tabs-row">
            <div className="ps-ose-pills">
              {sections.map(s => {
                const status = getSectionStatus(s);
                const meta = STATUS_META[status];
                return (
                  <button
                    key={s.id}
                    className={`ps-ose-pill${activeId === s.id ? ' ps-ose-pill--active' : ''}`}
                    onClick={() => jumpToSection(s.id)}
                  >
                    {s.label}
                    <span className="ps-ose-pill-dot" style={{ color: activeId === s.id ? 'currentColor' : meta.color }}>{meta.icon}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Row 3: toolbar (portalled from focused section's editor) —
            positioned LAST, directly above the content body, so the
            formatting controls sit as close as possible to the actual
            text being edited. */}
        <div className="ps-ose-toolbar">
          <div id="ps-ose-tb-portal" className="ps-ose-tb-portal" />
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div className="ps-ose-body" ref={pageScrollRef}>
        {sections.length === 0 ? (
          <div className="ps-ose-empty">
            <div className="ps-ose-empty-icon">✍️</div>
            <div className="ps-ose-empty-title">Report Draft</div>
            <div className="ps-ose-empty-text">
              Complete the synoptic fields, then press <strong>⚡ Generate Report</strong> to create an AI-drafted narrative.
            </div>
            <div className="ps-ose-empty-hint">
              Sections appear here as they generate. Every section is fully editable — your changes are preserved if you regenerate.
            </div>
          </div>
        ) : viewMode === 'tabs' ? (
          activeSection && renderSectionCard(activeSection, false)
        ) : (
          sections.map(s => renderSectionCard(s, true))
        )}
      </div>
    </div>
  );
};

export default OrchestratorSectionEditor;
