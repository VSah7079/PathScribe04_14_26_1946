import React from 'react';
import '../../../pathscribe.css';
import type { CaseRole } from '../synopticTypes';

const OtherRoleComment: React.FC<{
  role: string;
  meta: { label: string; color: string; bg: string; border: string };
  content: string;
  hasContent: boolean;
}> = ({ role: _role, meta, content, hasContent }) => {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div style={{ marginBottom: '10px', border: `1px solid ${hasContent ? meta.border : '#e2e8f0'}`, borderRadius: '8px', overflow: 'hidden' }}>
      <div
        onClick={() => { if (hasContent) setExpanded(v => !v); }}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: hasContent ? meta.bg : '#f8fafc', cursor: hasContent ? 'pointer' : 'default' }}
      >
        <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: hasContent ? 'white' : '#e2e8f0', color: hasContent ? meta.color : '#94a3b8', border: `1px solid ${hasContent ? meta.border : '#e2e8f0'}` }}>
          {meta.label}
        </span>
        {hasContent
          ? <span style={{ fontSize: '11px', color: meta.color, fontWeight: 600, flex: 1 }}>● Has comment</span>
          : <span style={{ fontSize: '11px', color: '#94a3b8', flex: 1 }}>No comment</span>
        }
        {hasContent && (
          <span style={{ fontSize: '12px', color: meta.color, transition: 'transform 0.2s', display: 'inline-block', transform: expanded ? 'rotate(180deg)' : 'none' }}>▼</span>
        )}
      </div>
      {expanded && hasContent && (
        <div style={{ borderTop: `1px solid ${meta.border}`, background: 'white' }}>
          <PathScribeEditor
            content={content}
            onChange={() => {}}
            readOnly
            minHeight="auto"
          />
        </div>
      )}
    </div>
  );
};

// ─── ConfidenceBadge (SR-07) ──────────────────────────────────────────────────
// Extracted as a proper component so useState is legal (hooks can't live inside
// a plain render function called from a loop).

export { OtherRoleComment };
