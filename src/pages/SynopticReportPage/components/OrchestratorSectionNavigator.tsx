// src/pages/SynopticReportPage/components/OrchestratorSectionNavigator.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Foldable section navigator — leftmost column of the three-pane Orchestration
// layout (Navigator | Full Report | Section Editor).
//
// Extracted from the old OrchestratorReportPanel so it can sit alongside the
// centre Full Report pane and the right-hand OrchestratorSectionEditor as an
// independent column, all three driven by one shared activeSectionId.
//
// Enterprise-standard collapse/expand — pathologists who lean on voice
// navigation can fold this away entirely once comfortable.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import type { OrchestratorSection } from './OrchestratorSectionEditor';

type SectionStatus = 'empty' | 'ai-generated' | 'accepted';

function getSectionStatus(s: OrchestratorSection): SectionStatus {
  if (s.committed)               return 'accepted';
  if (s.userEdited)              return 'accepted';
  if (!s.text && !s.aiGenerated) return 'empty';
  if (s.aiGenerated)             return 'ai-generated';
  return 'empty';
}

const STATUS_META: Record<SectionStatus, { color: string; title: string; icon: string }> = {
  'empty':        { color: '#475569', title: 'Empty',        icon: '○' },
  'ai-generated': { color: '#0891b2', title: 'AI generated', icon: '◉' },
  'accepted':     { color: '#10b981', title: 'Accepted',     icon: '✓' },
};

interface Props {
  sections:         OrchestratorSection[];
  activeSectionId:  string | null;
  onSectionClick:   (id: string) => void;
  isGenerating?:    boolean;
  isCollapsed:      boolean;
  onToggleCollapse: () => void;
}

const OrchestratorSectionNavigator: React.FC<Props> = ({
  sections, activeSectionId, onSectionClick, isGenerating, isCollapsed, onToggleCollapse,
}) => {
  if (isCollapsed) {
    return (
      <div className="ps-osn-collapsed">
        <button className="ps-osn-expand-btn" onClick={onToggleCollapse} title="Show navigator">
          ›
        </button>
      </div>
    );
  }

  return (
    <nav className="ps-osn-shell" aria-label="Report sections">

      <div className="ps-osn-header">
        <span className="ps-osn-title">NAVIGATOR</span>
        <button className="ps-osn-collapse-btn" onClick={onToggleCollapse} title="Hide navigator">‹</button>
      </div>

      {/* Status legend */}
      <div className="ps-osn-legend">
        {(['empty', 'ai-generated', 'accepted'] as SectionStatus[]).map(k => {
          const v = STATUS_META[k];
          return (
            <span key={k} className="ps-osn-legend-item" title={v.title}>
              <span style={{ color: v.color, fontSize: 11 }}>{v.icon}</span>
              <span>{v.title}</span>
            </span>
          );
        })}
      </div>

      <div className="ps-osn-divider" />

      {/* Section list */}
      <ul className="ps-osn-list" role="list">
        {sections.map((s, idx) => {
          const status   = getSectionStatus(s);
          const isActive = activeSectionId === s.id;
          return (
            <li key={s.id}>
              <button
                className={`ps-osn-item${isActive ? ' ps-osn-item--active' : ''}`}
                onClick={() => onSectionClick(s.id)}
                aria-current={isActive ? 'true' : undefined}
              >
                <span className="ps-osn-num">{idx + 1}</span>
                <span className="ps-osn-label">{s.label}</span>
                {s.isStreaming && <span className="ps-osn-streaming" title="Generating…">⟳</span>}
                {s.committed && <span className="ps-osn-lock" title="Committed — locked">🔒</span>}
                {s.required && !s.text && !s.isStreaming && (
                  <span className="ps-osn-required" title="Required — not yet completed">⚠</span>
                )}
                <span className="ps-osn-dot" style={{ color: STATUS_META[status].color }} title={STATUS_META[status].title}>
                  {STATUS_META[status].icon}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {isGenerating && (
        <div className="ps-osn-footer">
          <div className="ps-osn-gen-status">
            <span className="ps-osn-dot-pulse" />
            <span>Generating…</span>
          </div>
        </div>
      )}
    </nav>
  );
};

export default OrchestratorSectionNavigator;
