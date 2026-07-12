// src/pages/SynopticReportPage/components/OrchestratorReportPanel.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Rebuilt report draft panel — full navigator + sticky toolbar architecture.
//
// Layout (left → right):
//   [220px Section Navigator] [flex Document Canvas]
//
// Features:
//   • 220px fixed section navigator with status dots + scroll-sync highlight
//   • Sticky toolbar above the white page canvas (never scrolls away)
//   • Sticky section headers within the canvas scroll area
//   • Protected fields (LIS-sourced patient/accession data) — read-only with
//     lock indicator, rendered above the editable narrative
//   • Per-section status: empty | ai-generated | edited | accepted
//   • Print (print CSS hides chrome, shows only report body)
//   • Export PDF via native print window (no dependencies, clean clinical output)
//   • Template picker preserved from previous version
//   • buildDocumentHtml / parseDocumentHtml logic unchanged
// ─────────────────────────────────────────────────────────────────────────────

import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import NarrativeEditor from '@/components/Editor/NarrativeEditor';
import type { PathScribeEditorHandle } from '@/components/Editor/PathScribeEditorRef';
import type { Case } from '@/types/case/Case';
import type { ReportTemplate } from '@/types/reportPart';
import { mockReportTemplateService } from '@/services/reportTemplates/mockReportTemplateService';
import { mockMacroService } from '@/services/macros/mockMacroService';

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
  // Multi-session workflow: committed sections are locked and preserved
  // across generate cycles (Gross, Frozen). Non-committed sections are
  // regenerated when the pathologist hits Generate Report.
  committed?:          boolean;
  lockedAt?:           string;  // ISO timestamp — when the section was committed
}

type SectionStatus = 'empty' | 'ai-generated' | 'edited' | 'accepted';

function getSectionStatus(s: OrchestratorSection): SectionStatus {
  if (s.committed) return 'accepted';
  if (!s.text && !s.aiGenerated) return 'empty';
  if (s.userEdited) return 'accepted';   // editing implicitly accepts
  if (s.aiGenerated) return 'ai-generated';
  return 'empty';
}

// ── HTML helpers ──────────────────────────────────────────────────────────────

export function textToHtml(text: string): string {
  if (!text.trim()) return '';
  if (text.trimStart().startsWith('<')) return text;
  return '<p>' + text.split(/\n\n+/).filter(Boolean).join('</p><p>') + '</p>';
}

function sectionAnchor(id: string, label: string): string {
  return `<h3 data-section-id="${id}" data-section-label="${label}" class="ps-orch4-anchor" contenteditable="false">${label}</h3>`;
}

function buildDocumentHtml(sections: OrchestratorSection[]): string {
  return sections.map(s => {
    const anchor  = sectionAnchor(s.id, s.label);
    const content = textToHtml(s.text) || '<p><br></p>';
    return anchor + content;
  }).join('');
}

function parseDocumentHtml(html: string, sectionIds: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  const parser = new DOMParser();
  const doc    = parser.parseFromString(html, 'text/html');
  const body   = doc.body;
  let currentId: string | null = null;
  let buffer: string[] = [];
  const flush = () => {
    if (currentId) result[currentId] = buffer.join('').trim();
    buffer = [];
  };
  body.childNodes.forEach(node => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el  = node as Element;
      const sid = el.getAttribute('data-section-id');
      if (sid && sectionIds.includes(sid)) { flush(); currentId = sid; return; }
    }
    if (currentId) buffer.push((node as Element).outerHTML ?? node.textContent ?? '');
  });
  flush();
  return result;
}

// ── Status dot ────────────────────────────────────────────────────────────────

const STATUS_META: Record<SectionStatus, { color: string; title: string; icon: string }> = {
  'empty':        { color: '#475569', title: 'Empty',        icon: '○' },
  'ai-generated': { color: '#0891b2', title: 'AI generated', icon: '◉' },
  'edited':       { color: '#10b981', title: 'Accepted',     icon: '✓' },  // editing = accepted
  'accepted':     { color: '#10b981', title: 'Accepted',     icon: '✓' },
};

const SectionDot: React.FC<{ status: SectionStatus }> = ({ status }) => {
  const meta = STATUS_META[status];
  return (
    <span
      className="ps-orch4-nav-dot"
      title={meta.title}
      style={{ color: meta.color }}
    >
      {meta.icon}
    </span>
  );
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  sections:             OrchestratorSection[];
  isGenerating:         boolean;
  onSectionChange:      (sectionId: string, html: string) => void;
  onAcceptDraft:        (sectionId: string) => void;
  onKeepVersion:        (sectionId: string) => void;
  onRegenerateSection?: (sectionId: string) => void;
  onEditSynoptic?:      (instanceId: string) => void;
  lastGeneratedAt?:     Date | null;
  caseData?:            Case | null;
  resolvedTemplateName?:string;
  resolvedBy?:          string;
  overrideTemplateId?:  string | null;
  onOverrideTemplate?:  (templateId: string | null) => void;
  onAcceptAll?:         () => void;
  onOpenPreview?:       () => void;
  isPreviewOpen?:       boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

const OrchestratorReportPanel: React.FC<Props> = ({
  sections, isGenerating, onSectionChange, onAcceptDraft,
  onKeepVersion, onRegenerateSection, onEditSynoptic,
  lastGeneratedAt, caseData,
  resolvedTemplateName, resolvedBy, overrideTemplateId, onOverrideTemplate,
  onAcceptAll,
  onOpenPreview,
  isPreviewOpen = false,
}) => {
  const editorRef    = useRef<PathScribeEditorHandle>(null);
  const prevDocRef   = useRef<string>('');
  const canvasRef    = useRef<HTMLDivElement>(null);
  const reportBodyRef = useRef<HTMLDivElement>(null);

  // ── Case meta (protected fields) ────────────────────────────────────────
  const accession  = caseData?.accession?.fullAccession ?? caseData?.accession?.accessionNumber ?? '';
  const patient    = caseData?.patient ? `${caseData.patient.lastName}, ${caseData.patient.firstName}` : '';
  const mrn        = caseData?.patient?.mrn ?? '';
  const dob        = caseData?.patient?.dateOfBirth
    ? new Date(caseData.patient.dateOfBirth).toLocaleDateString() : '';
  const sex        = caseData?.patient?.sex ?? '';
  const priority   = (caseData?.order as any)?.priority ?? '';
  const attending  = (caseData as any)?.attending ?? '';
  const department = (caseData as any)?.department ?? '';
  const facility   = (caseData as any)?.facility ?? '';

  // ── Institution data (from template header part — mock until org service wired) ─
  // originHospitalId drives which lab identity to show.
  // In production this comes from Organisation → Site → Lab resolution.
  const institutionName = (() => {
    const id = caseData?.originHospitalId;
    if (id === 'HOSP-002') return 'Manchester University NHS Foundation Trust';
    if (id === 'HOSP-003') return 'PathScribe Reference Laboratory — West';
    return 'PathScribe Reference Laboratory';
  })();
  const institutionDept    = 'Department of Anatomical Pathology';
  const institutionAddress = caseData?.originHospitalId === 'HOSP-002'
    ? 'Oxford Road, Manchester M13 9WL, United Kingdom'
    : '1234 Lab Drive, Suite 200, Tucson AZ 85701';
  const institutionPhone   = caseData?.originHospitalId === 'HOSP-002'
    ? '+44 161 276 1234'
    : '+1 520 555 0100';

  // ── Dark mode toggle ────────────────────────────────────────────────────
  const [darkMode, setDarkMode] = useState(false);

  // Page numbers removed — print output uses @page CSS counter(pages)

  // ── LIS header collapsed (saves vertical space) ──────────────────────
  const [lisHeaderCollapsed, setLisHeaderCollapsed] = useState(false);

  // ── Template picker state ────────────────────────────────────────────────
  const [templates, setTemplates]             = useState<ReportTemplate[]>([]);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  // ── Macros — loaded from service, mapped to PathScribeEditor shape ───────
  const [macros, setMacros] = useState<{ id: string; trigger: string; name: string; content: string }[]>([]);

  useEffect(() => {
    mockMacroService.getAll().then(r => {
      if (r.ok) {
        setMacros(
          r.data
            .filter(m => m.status === 'Active')
            .map(m => ({
              id:      m.id,
              trigger: m.shortcut,   // PathScribeEditor uses 'trigger', service uses 'shortcut'
              name:    m.name,
              content: m.content,
            }))
        );
      }
    });
  }, []);

  useEffect(() => {
    mockReportTemplateService.getAll().then((r: any) => {
      if (r.ok) setTemplates(r.data.filter((t: ReportTemplate) => t.status === 'published'));
    });
  }, []);

  // ── Active section tracking for navigator ────────────────────────────────
  const [activeNavSection, setActiveNavSection] = useState<string>(sections[0]?.id ?? '');

  // ── Derived ──────────────────────────────────────────────────────────────
  const sectionIds   = useMemo(() => sections.map(s => s.id), [sections]);
  const editedCount  = sections.filter(s => s.userEdited).length;
  const pendingCount = sections.filter(s => s.pendingDraft).length;

  // ── Rebuild editor when sections change ──────────────────────────────────
  useEffect(() => {
    if (!editorRef.current || isGenerating) return;
    const newHtml = buildDocumentHtml(sections);
    if (newHtml !== prevDocRef.current) {
      editorRef.current.setContent(newHtml);
      prevDocRef.current = newHtml;
    }
  }, [sections, isGenerating]); // eslint-disable-line

  useEffect(() => {
    editorRef.current?.setEditable(!isGenerating);
  }, [isGenerating]);

  // ── Handle edits ─────────────────────────────────────────────────────────
  const handleChange = useCallback((html: string) => {
    prevDocRef.current = html;
    const parsed = parseDocumentHtml(html, sectionIds);
    sections.forEach(s => {
      if (parsed[s.id] !== undefined && parsed[s.id] !== s.text) {
        onSectionChange(s.id, parsed[s.id]);
      }
    });
  }, [sections, sectionIds, onSectionChange]);

  // ── Scroll sync: scroll → active navigator item ──────────────────────────
  // Must listen on the actual scrolling element — could be canvasRef OR the
  // ProseMirror editor div (which has its own scroll context).
  const handleCanvasScroll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sections.length) return;

    // Search within ProseMirror DOM for anchors
    const proseMirror = canvas.querySelector<HTMLElement>('.ProseMirror');
    const searchRoot  = proseMirror ?? canvas;
    const anchors     = searchRoot.querySelectorAll<HTMLElement>('[data-section-id]');
    if (!anchors.length) return;

    const canvasRect = canvas.getBoundingClientRect();
    const threshold  = canvasRect.top + 140; // below sticky toolbar

    let found = sections[0]?.id ?? '';
    anchors.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top <= threshold) found = el.getAttribute('data-section-id') ?? found;
    });

    if (found !== activeNavSection) setActiveNavSection(found);
  }, [sections, activeNavSection]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Listen on canvas itself
    canvas.addEventListener('scroll', handleCanvasScroll, { passive: true });

    // Also listen on ProseMirror if it has its own scroll context
    const pm = canvas.querySelector<HTMLElement>('.ProseMirror');
    const pmParent = pm?.parentElement;
    if (pmParent && pmParent !== canvas) {
      pmParent.addEventListener('scroll', handleCanvasScroll, { passive: true });
    }

    return () => {
      canvas.removeEventListener('scroll', handleCanvasScroll);
      const pm2 = canvas.querySelector<HTMLElement>('.ProseMirror');
      const pmParent2 = pm2?.parentElement;
      if (pmParent2 && pmParent2 !== canvas) {
        pmParent2.removeEventListener('scroll', handleCanvasScroll);
      }
    };
  }, [handleCanvasScroll]);

  // ── Navigator click → scroll + place cursor (Word-style) ───────────────
  // Industry standard: scroll to section, place cursor at start of first
  // editable paragraph AFTER the anchor heading (not in the heading itself).
  const scrollToSection = useCallback((id: string) => {
    setActiveNavSection(id);
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ── 1. Scroll to the anchor ──────────────────────────────────────────
    const proseMirror = canvas.querySelector<HTMLElement>('.ProseMirror');
    const searchRoot  = proseMirror ?? canvas;
    const anchor      = searchRoot.querySelector<HTMLElement>(`[data-section-id="${id}"]`);

    if (anchor) {
      const canvasRect  = canvas.getBoundingClientRect();
      const anchorRect  = anchor.getBoundingClientRect();
      const relativeTop = anchorRect.top - canvasRect.top + canvas.scrollTop;
      canvas.scrollTo({ top: Math.max(0, relativeTop - 120), behavior: 'smooth' });
    } else {
      // Fallback: proportional scroll by section index
      const idx = sections.findIndex(s => s.id === id);
      if (idx >= 0 && sections.length > 0) {
        canvas.scrollTo({ top: canvas.scrollHeight * (idx / sections.length), behavior: 'smooth' });
      }
    }

    // ── 2. Place cursor at start of first paragraph after the anchor ─────
    // Use Tiptap's document model to find the position just after the h3 node.
    // This mirrors Word's Navigation Pane behaviour: heading is non-editable,
    // cursor lands at the first writable position in the section body.
    const editor = editorRef.current?.getEditor?.();
    if (!editor) return;

    // Walk the document nodes to find the h3 with matching data-section-id
    let targetPos: number | null = null;
    editor.state.doc.descendants((node, pos) => {
      if (targetPos !== null) return false; // already found
      if (
        node.type.name === 'heading' &&
        node.attrs['data-section-id'] === id
      ) {
        // Position after this node = pos + node.nodeSize
        // That's the start of the next node (first paragraph of section body)
        targetPos = pos + node.nodeSize;
        return false;
      }
    });

    // Fallback: search by matching text content of the anchor heading
    if (targetPos === null) {
      const sectionLabel = sections.find(s => s.id === id)?.label ?? '';
      editor.state.doc.descendants((node, pos) => {
        if (targetPos !== null) return false;
        if (
          (node.type.name === 'heading' || node.type.name === 'paragraph') &&
          node.textContent === sectionLabel
        ) {
          targetPos = pos + node.nodeSize;
          return false;
        }
      });
    }

    if (targetPos !== null) {
      setTimeout(() => {
        try {
          const docSize = editor.state.doc.content.size;
          const safePos = Math.max(1, Math.min(targetPos, docSize - 1));
          // Verify the position resolves to inline content before setting
          const resolved = editor.state.doc.resolve(safePos);
          if (resolved.parent.isTextblock) {
            editor.chain().focus().setTextSelection(safePos).run();
          } else {
            // Find nearest text block
            editor.chain().focus().run();
          }
        } catch (e) {
          // Position invalid — just focus the editor without moving cursor
          editor.commands.focus();
        }
      }, 150);
    }
  }, [sections]);

  // ── Build clean print HTML ───────────────────────────────────────────────
  // Opens report content in an isolated window — no app chrome, no nav,
  // no toolbar. The browser's Save as PDF produces a clean clinical document.
  const buildPrintWindow = useCallback((title: string) => {
    const el = reportBodyRef.current;
    if (!el) return;

    const reportHtml = el.innerHTML;
    const patientLine = [patient, mrn ? `MRN ${mrn}` : '', dob ? `DOB ${dob}${sex ? ` · ${sex}` : ''}` : '']
      .filter(Boolean).join('  ·  ');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1a1a1a;
      background: white;
      padding: 0;
    }

    /* Running header on every page */
    @page {
      size: A4;
      margin: 18mm 20mm 22mm 20mm;
      @top-left   { content: "${accession}"; font-size: 8pt; color: #666; font-family: Arial, sans-serif; }
      @top-right  { content: "CONFIDENTIAL — CLINICAL RECORD"; font-size: 8pt; color: #666; font-family: Arial, sans-serif; }
      @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 8pt; color: #666; font-family: Arial, sans-serif; }
    }

    /* Patient header */
    .print-header {
      border-bottom: 2px solid #1a1a1a;
      padding-bottom: 10px;
      margin-bottom: 18px;
    }
    .print-accession {
      font-size: 18pt;
      font-weight: bold;
      letter-spacing: -0.02em;
      margin-bottom: 4px;
    }
    .print-patient-line {
      font-size: 10pt;
      color: #333;
      font-family: Arial, sans-serif;
    }

    /* Section anchors */
    h3[data-section-id] {
      font-size: 11pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      border-left: 3pt solid #0891b2;
      padding: 6pt 0 6pt 10pt;
      margin: 20pt 0 8pt;
      page-break-after: avoid;
      color: #1a1a1a;
    }

    p {
      margin-bottom: 8pt;
      orphans: 3;
      widows: 3;
    }

    /* Protected badge — hidden in print */
    .ps-orch4-protected-badge { display: none; }
    .ps-orch4-ph-rule { display: none; }

    /* Protected header grid — convert to print layout */
    .ps-orch4-protected-header {
      background: white !important;
      border: none !important;
      padding: 0 !important;
    }
    .ps-orch4-ph-accession { display: none; } /* shown in .print-accession above */
    .ps-orch4-ph-grid {
      display: grid;
      grid-template-columns: 80pt 1fr;
      gap: 3pt 10pt;
      font-family: Arial, sans-serif;
      font-size: 9.5pt;
    }
    .ps-orch4-ph-key { color: #555; font-weight: bold; text-transform: uppercase; font-size: 8pt; letter-spacing: 0.05em; }
    .ps-orch4-ph-val { color: #1a1a1a; }
    .ps-orch4-editor-body { padding: 0 !important; }
  </style>
</head>
<body>
  <div class="print-header">
    <div class="print-accession">${accession || 'PathScribe Report'}</div>
    ${patientLine ? `<div class="print-patient-line">${patientLine}</div>` : ''}
  </div>
  ${reportHtml}
  <script>
    window.onload = function () {
      window.focus();
      window.print();
      // Close after a delay to allow the print dialog to open
      setTimeout(function () { window.close(); }, 1000);
    };
  </script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      // Pop-up blocked — fall back to page print
      window.print();
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
  }, [accession, patient, mrn, dob, sex]);

  // ── Print (current page) ─────────────────────────────────────────────────
  const handlePrint = useCallback(() => {
    buildPrintWindow(accession ? `${accession} — PathScribe Report` : 'PathScribe Report');
  }, [accession, buildPrintWindow]);

  // ── Export PDF (same mechanism — user chooses Save as PDF in print dialog) ─
  const handleExportPdf = useCallback(() => {
    buildPrintWindow(accession ? `${accession} — PathScribe Report` : 'PathScribe Report');
  }, [accession, buildPrintWindow]);

  // ── Voice/keyboard event listeners ──────────────────────────────────────────
  // These events are fired by SynopticReportPage keyboard shortcuts and voice actions
  useEffect(() => {
    const jumpSection = (e: Event) => {
      const idx = (e as CustomEvent).detail?.index ?? 0;
      const section = sections[idx];
      if (section) scrollToSection(section.id);
    };
    const nextSection = () => {
      const currentIdx = sections.findIndex(s => s.id === activeNavSection);
      const next = sections[currentIdx + 1];
      if (next) scrollToSection(next.id);
    };
    const prevSection = () => {
      const currentIdx = sections.findIndex(s => s.id === activeNavSection);
      const prev = sections[currentIdx - 1];
      if (prev) scrollToSection(prev.id);
    };
    const regenAll = () => {
      if (onRegenerateSection) sections.forEach(s => onRegenerateSection(s.id));
    };
    const toggleDark = () => setDarkMode(v => !v);

    window.addEventListener('PATHSCRIBE_ORCH_JUMP_SECTION', jumpSection);
    window.addEventListener('PATHSCRIBE_ORCH_NEXT_SECTION', nextSection);
    window.addEventListener('PATHSCRIBE_ORCH_PREV_SECTION', prevSection);
    window.addEventListener('PATHSCRIBE_ORCH_REGEN_ALL',    regenAll);
    window.addEventListener('PATHSCRIBE_ORCH_TOGGLE_DARK',  toggleDark);

    return () => {
      window.removeEventListener('PATHSCRIBE_ORCH_JUMP_SECTION', jumpSection);
      window.removeEventListener('PATHSCRIBE_ORCH_NEXT_SECTION', nextSection);
      window.removeEventListener('PATHSCRIBE_ORCH_PREV_SECTION', prevSection);
      window.removeEventListener('PATHSCRIBE_ORCH_REGEN_ALL',    regenAll);
      window.removeEventListener('PATHSCRIBE_ORCH_TOGGLE_DARK',  toggleDark);
    };
  }, [sections, activeNavSection, onRegenerateSection, scrollToSection]);

  // ── Empty state ──────────────────────────────────────────────────────────
  if (sections.length === 0) {
    return (
      <div className="ps-orch4-shell">
        <div className="ps-orch4-empty">
          <div className="ps-orch4-empty-icon">✍️</div>
          <div className="ps-orch4-empty-title">Report Draft</div>
          <div className="ps-orch4-empty-body">
            Complete the synoptic fields, then press{' '}
            <span className="ps-orch4-empty-cta">⚡ Generate Report</span>{' '}
            to create an AI-drafted narrative.
          </div>
          <div className="ps-orch4-empty-hint">
            Sections appear here as they generate. Every section is fully
            editable — your changes are preserved if you regenerate.
          </div>
        </div>
      </div>
    );
  }

  const resolvedName = overrideTemplateId
    ? (templates.find(t => t.id === overrideTemplateId)?.name ?? overrideTemplateId)
    : (resolvedTemplateName ?? 'Gold Standard — General Surgical Pathology');

  const resolvedByLabel = overrideTemplateId
    ? 'pathologist override'
    : resolvedBy ? `resolved by ${resolvedBy.replace(/-/g, ' ')}` : 'default';

  const initialHtml = buildDocumentHtml(sections);

  return (
    <div className="ps-orch4-shell">

      {/* ══════════════════════════════════════════════════════════════════
          LEFT: Section Navigator
      ══════════════════════════════════════════════════════════════════ */}
      <nav className="ps-orch4-nav" aria-label="Report sections">

        <div className="ps-orch4-nav-header">
          <span className="ps-orch4-nav-title">NAVIGATOR</span>
        </div>

        {/* Status legend */}
        <div className="ps-orch4-nav-legend">
          {(['empty', 'ai-generated', 'accepted'] as SectionStatus[]).map(k => {
            const v = STATUS_META[k];
            return (
              <span key={k} className="ps-orch4-nav-legend-item" title={v.title}>
                <span style={{ color: v.color, fontSize: 11 }}>{v.icon}</span>
                <span>{k === 'accepted' ? 'Accepted' : v.title}</span>
              </span>
            );
          })}
        </div>

        <div className="ps-orch4-nav-divider" />

        {/* Section list */}
        <ul className="ps-orch4-nav-list" role="list">
          {sections.map((s, idx) => {
            const status  = getSectionStatus(s);
            const isActive = activeNavSection === s.id;
            return (
              <li key={s.id}>
                <button
                  className={`ps-orch4-nav-item${isActive ? ' ps-orch4-nav-item--active' : ''}`}
                  onClick={() => scrollToSection(s.id)}
                  aria-current={isActive ? 'true' : undefined}
                  data-section-nav={s.id}
                >
                  <span className="ps-orch4-nav-num">{idx + 1}</span>
                  <span className="ps-orch4-nav-label">{s.label}</span>
                  {s.isStreaming && <span className="ps-orch4-nav-streaming" title="Generating…">⟳</span>}
                  {s.committed && <span className="ps-orch4-nav-lock" title="Committed — locked">🔒</span>}
                  {s.required && !s.text && !s.isStreaming && (
                    <span className="ps-orch4-nav-required" title="Required — not yet completed">⚠</span>
                  )}
                  <SectionDot status={status} />
                </button>
              </li>
            );
          })}
        </ul>

        {/* Generation status + template + regen at bottom of nav */}
        <div className="ps-orch4-nav-footer">
          {isGenerating && (
            <div className="ps-orch4-nav-gen-status">
              <span className="ps-orch4-dot-pulse" />
              <span>Generating…</span>
            </div>
          )}
          {!isGenerating && lastGeneratedAt && (
            <div className="ps-orch4-nav-gen-time">
              Generated {lastGeneratedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
          {editedCount > 0 && !isGenerating && (
            <div className="ps-orch4-nav-edited">
              {editedCount} section{editedCount !== 1 ? 's' : ''} edited
            </div>
          )}

          <div className="ps-orch4-nav-footer-divider" />

          {/* Template indicator */}
          <div className="ps-orch4-nav-tmpl-name">
            {overrideTemplateId
              ? (templates.find(t => t.id === overrideTemplateId)?.name ?? overrideTemplateId)
              : (resolvedTemplateName ?? 'Gold Standard')}
          </div>
          <div className="ps-orch4-nav-tmpl-by">
            {overrideTemplateId ? 'pathologist override' : resolvedBy ? `by ${resolvedBy.replace(/-/g,' ')}` : 'gold standard'}
          </div>

          <div className="ps-orch4-nav-tmpl-actions">
            <div className="ps-orch4-tmpl-change-wrap">
              <button className="ps-orch4-nav-tmpl-btn" onClick={() => setShowTemplatePicker(v => !v)}>
                Change ▾
              </button>
              {showTemplatePicker && (
                <div className="ps-orch4-tmpl-picker ps-orch4-tmpl-picker--nav">
                  <div className="ps-orch4-tmpl-picker-title">Select report template</div>
                  {sections.some(s => s.text) && (
                    <div className="ps-orch4-tmpl-picker-warn">
                      ⚠️ Changing template will regenerate all sections.
                    </div>
                  )}
                  {templates.map(t => (
                    <div
                      key={t.id}
                      className={`ps-orch4-tmpl-option${(overrideTemplateId ?? '') === t.id ? ' ps-orch4-tmpl-option--active' : ''}`}
                      onClick={() => { onOverrideTemplate?.(t.id); setShowTemplatePicker(false); }}
                    >
                      <span className="ps-orch4-tmpl-option-name">{t.name}</span>
                      {t.specialty && <span className="ps-orch4-tmpl-option-meta">{t.specialty}</span>}
                    </div>
                  ))}
                  <div className="ps-orch4-tmpl-option" onClick={() => { onOverrideTemplate?.(null); setShowTemplatePicker(false); }}>
                    <span className="ps-orch4-tmpl-option-name">↺ System-resolved</span>
                    <span className="ps-orch4-tmpl-option-meta">{resolvedTemplateName ?? 'Gold Standard'}</span>
                  </div>
                </div>
              )}
            </div>
            {overrideTemplateId && (
              <button className="ps-orch4-nav-tmpl-btn" onClick={() => onOverrideTemplate?.(null)}>↺ Reset</button>
            )}
            {onRegenerateSection && !isGenerating && (
              <button
                className="ps-orch4-nav-tmpl-btn ps-orch4-nav-regen-btn"
                onClick={() => sections.forEach(s => onRegenerateSection?.(s.id))}
                title="Regenerate all sections"
              >
                ↺ Regen all
              </button>
            )}
            {onAcceptAll && !isGenerating && sections.some(s => s.aiGenerated && !s.userEdited && !s.committed) && (
              <button
                className="ps-orch4-nav-tmpl-btn ps-orch4-nav-accept-btn"
                onClick={onAcceptAll}
                title="Accept all AI-generated sections"
              >
                ✓ Accept all
              </button>
            )}
          </div>
          {/* Keyboard shortcuts — discovery hints */}
          <div className="ps-orch4-nav-shortcuts">
            <div className="ps-orch4-nav-shortcut-row">
              <span className="ps-orch4-nav-shortcut-key">Ctrl+S</span>
              <span className="ps-orch4-nav-shortcut-label">Save draft</span>
            </div>
            <div className="ps-orch4-nav-shortcut-row">
              <span className="ps-orch4-nav-shortcut-key">Ctrl+G</span>
              <span className="ps-orch4-nav-shortcut-label">Generate</span>
            </div>
            <div className="ps-orch4-nav-shortcut-row">
              <span className="ps-orch4-nav-shortcut-key">Alt+1–4</span>
              <span className="ps-orch4-nav-shortcut-label">Jump section</span>
            </div>
            <div className="ps-orch4-nav-shortcut-row">
              <span className="ps-orch4-nav-shortcut-key">Ctrl+⇧+F</span>
              <span className="ps-orch4-nav-shortcut-label">Full report</span>
            </div>
          </div>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════════════
          RIGHT: Toolbar + Canvas
      ══════════════════════════════════════════════════════════════════ */}
      <div className="ps-orch4-main">

        {/* ── Sticky toolbar ───────────────────────────────────────────── */}
        {/* The Tiptap toolbar portals INTO ps-orch4-tb-portal via toolbarPortalId.
            Action buttons (template, regen, print, export) sit to the right. */}
        <div className="ps-orch4-toolbar" role="toolbar" aria-label="Document toolbar">

          {/* Portal target — PathScribeEditor renders its full toolbar here */}
          <div id="ps-orch4-tb-portal" className="ps-orch4-tb-portal" />

          {/* Right: generation status + template + actions */}
          <div className="ps-orch4-toolbar-right">

            {/* Dark mode toggle */}
            <button
              className={`ps-orch4-tb-btn ps-orch4-tb-darkmode${darkMode ? ' ps-orch4-tb-darkmode--on' : ''}`}
              onClick={() => setDarkMode(v => !v)}
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? '☀' : '🌙'}
            </button>

            {/* Preview window — click to reopen if closed */}
            <button
              className={`ps-orch4-tb-icon-action${isPreviewOpen ? ' ps-orch4-tb-icon-action--live' : ''}`}
              onClick={() => onOpenPreview?.()}
              title={isPreviewOpen ? 'Preview window open — click to focus' : 'Reopen report preview window'}
            >📋</button>

            {/* Print — icon only */}
            <button className="ps-orch4-tb-icon-action" onClick={handlePrint} title="Print report">
              🖨
            </button>

            {/* Export PDF — icon only */}
            <button className="ps-orch4-tb-icon-action ps-orch4-tb-icon-action--primary" onClick={handleExportPdf} title="Export as PDF">
              ⬇
            </button>
          </div>
        </div>

        {/* ── Ruler row — below toolbar, above canvas (Word-style) ──────── */}
        <div id="ps-orch4-ruler-portal" className="ps-orch4-ruler-row" />

        {/* ── Pending draft banner ─────────────────────────────────────── */}
        {pendingCount > 0 && (
          <div className="ps-orch4-pending-bar">
            <span className="ps-orch4-pending-label">
              ⚡ {pendingCount} section{pendingCount !== 1 ? 's have' : ' has'} a new AI draft
            </span>
            <div className="ps-orch4-pending-btns">
              {sections.filter(s => s.pendingDraft).map(s => (
                <React.Fragment key={s.id}>
                  <button className="ps-orch4-btn-replace" onClick={() => onAcceptDraft(s.id)}>
                    Replace {s.label}
                  </button>
                  <button className="ps-orch4-btn-keep" onClick={() => onKeepVersion(s.id)}>
                    Keep mine
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* ── Scrollable canvas ────────────────────────────────────────── */}
        <div className={`ps-orch4-canvas-wrap${darkMode ? ' ps-orch4-canvas-wrap--dark' : ''}`} ref={canvasRef}>
          <div className={`ps-orch4-page${darkMode ? ' ps-orch4-page--dark' : ''}`} ref={reportBodyRef}>

            {/* ── Institution header — compact single line ────────────────── */}
            <div className={`ps-orch4-inst-header ps-orch4-inst-header--compact${darkMode ? ' ps-orch4-inst-header--dark' : ''}`}>
              <div className="ps-orch4-inst-compact-left">
                <span className="ps-orch4-inst-name">{institutionName}</span>
                <span className="ps-orch4-inst-sep">·</span>
                <span className="ps-orch4-inst-dept">{institutionDept}</span>
                <span className="ps-orch4-inst-sep">·</span>
                <span className="ps-orch4-inst-addr">{institutionAddress}</span>
              </div>
              <div className="ps-orch4-inst-right">
                <span className="ps-orch4-inst-logo-text">PathScribe</span>
              </div>
            </div>

            {/* ── Protected header block — collapsible ────────────────── */}
            {(accession || patient) && (
              <div className={`ps-orch4-protected-header${darkMode ? ' ps-orch4-protected-header--dark' : ''}`}>
                <button
                  className="ps-orch4-ph-collapse-btn"
                  onClick={() => setLisHeaderCollapsed(v => !v)}
                  title={lisHeaderCollapsed ? 'Expand patient details' : 'Collapse patient details'}
                >
                  {lisHeaderCollapsed ? '▶ Patient details' : '▼ Hide details'}
                </button>
                {!lisHeaderCollapsed && <>
                <div className="ps-orch4-protected-badge">
                  <span className="ps-orch4-lock-icon">🔒</span>
                  <span>Protected — LIS data</span>
                </div>
                <div className="ps-orch4-ph-accession">{accession}</div>
                <div className="ps-orch4-ph-grid">
                  {patient    && <><span className="ps-orch4-ph-key">Patient</span>    <span className="ps-orch4-ph-val">{patient}</span></>}
                  {mrn        && <><span className="ps-orch4-ph-key">MRN</span>        <span className="ps-orch4-ph-val">{mrn}</span></>}
                  {dob        && <><span className="ps-orch4-ph-key">DOB</span>        <span className="ps-orch4-ph-val">{dob}{sex ? ` · ${sex}` : ''}</span></>}
                  {priority   && <><span className="ps-orch4-ph-key">Priority</span>   <span className="ps-orch4-ph-val">{priority}</span></>}
                  {attending  && <><span className="ps-orch4-ph-key">Attending</span>  <span className="ps-orch4-ph-val">{attending}</span></>}
                  {department && <><span className="ps-orch4-ph-key">Department</span> <span className="ps-orch4-ph-val">{department}</span></>}
                  {facility   && <><span className="ps-orch4-ph-key">Facility</span>   <span className="ps-orch4-ph-val">{facility}</span></>}
                </div>
                <div className="ps-orch4-ph-rule" />
                </>}
              </div>
            )}

            {/* ── Editable narrative body ──────────────────────────────── */}
            <div className="ps-orch4-editor-body">
              <NarrativeEditor
                ref={editorRef as any}
                value={initialHtml}
                onChange={handleChange}
                readOnly={isGenerating}
                minHeight="400px"
                placeholder=""
                toolbarPortalId="ps-orch4-tb-portal"
                // rulerPortalId removed — no ruler-rendering feature
                // exists anywhere in the editor chain (NarrativeEditor
                // or PathScribeEditor) to actually use it; the portal
                // div above (#ps-orch4-ruler-portal) stays as a
                // harmless, unused anchor in case a real ruler feature
                // gets built later.
                macros={macros}
              />
            </div>

            {/* ── Footer (from template footer part) ───────────────────── */}
            <div className={`ps-orch4-page-footer${darkMode ? ' ps-orch4-page-footer--dark' : ''}`}>
              <div className="ps-orch4-footer-left">
                {patient && <span className="ps-orch4-footer-patient">{patient}</span>}
                {dob     && <span className="ps-orch4-footer-sep">·</span>}
                {dob     && <span className="ps-orch4-footer-dob">DOB {dob}{sex ? ` · ${sex}` : ''}</span>}
                {accession && <span className="ps-orch4-footer-sep">·</span>}
                {accession && <span className="ps-orch4-footer-acc">{accession}</span>}
              </div>
              <div className="ps-orch4-footer-center">
                <span className="ps-orch4-footer-confidential">CONFIDENTIAL — PATHOLOGY REPORT</span>
              </div>
              <div className="ps-orch4-footer-right" />
            </div>

          </div>
        </div>
      </div>

    </div>
  );
};

export default OrchestratorReportPanel;
