import React from 'react';
import PathScribeEditor from './PathScribeEditor';
<<<<<<< HEAD
=======
import type { PathScribeEditorHandle } from './PathScribeEditorRef';
>>>>>>> upstream/main

export interface NarrativeEditorProps {
  value: string;
  onChange: (html: string) => void;
  readOnly?: boolean;
  minHeight?: string;
  macros?: any[];
  placeholder?: string;
<<<<<<< HEAD
}

/**
 * NarrativeEditor
 * ---------------------------------------------------------------------------
 * A thin wrapper around PathScribeEditor that applies narrative‑specific
 * defaults and provides a clean integration point for Orchestrator Mode.
 *
 * This component intentionally contains **no business logic**. It simply
 * configures the editor for narrative use and exposes a stable API.
 *
 * Future additions (already scaffolded):
 *   - Section header insertion helpers
 *   - Orchestrator streaming hooks
 *   - AI‑generated section markers
 *   - Regenerate section UI
 *   - Inline provenance markers
 */
const NarrativeEditor: React.FC<NarrativeEditorProps> = ({
  value,
  onChange,
  readOnly = false,
  minHeight = '500px',
  macros = [],
  placeholder = 'Begin narrative report…',
}) => {
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      <PathScribeEditor
=======
  // ── Multi-instance shared toolbar — see PathScribeEditor for full docs ───
  suppressToolbar?: boolean;
  toolbarPortalId?: string;
  theme?: 'light' | 'dark';
  // ── User-configurable tab width — see PathScribeEditor for full docs ─────
  tabWidthChars?: number;
  onTabWidthChange?: (chars: number) => void;
}

const NarrativeEditor = React.forwardRef<PathScribeEditorHandle, NarrativeEditorProps>((
  {
    value,
    onChange,
    readOnly = false,
    minHeight = '500px',
    macros = [],
    placeholder = 'Begin narrative report…',
    suppressToolbar = false,
    toolbarPortalId,
    theme = 'light',
    tabWidthChars,
    onTabWidthChange,
  },
  ref,
) => {
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      <PathScribeEditor
        ref={ref}
>>>>>>> upstream/main
        content={value}
        onChange={onChange}
        readOnly={readOnly}
        minHeight={minHeight}
        placeholder={placeholder}
        macros={macros}
        approvedFonts={[
          'Arial',
          'Times New Roman',
          'Calibri',
          'Courier New',
          'Georgia',
        ]}
<<<<<<< HEAD
        showRulerDefault={true}
      />
    </div>
  );
};

export default NarrativeEditor;
=======
        suppressToolbar={suppressToolbar}
        toolbarPortalId={toolbarPortalId}
        theme={theme}
        tabWidthChars={tabWidthChars}
        onTabWidthChange={onTabWidthChange}
      />
    </div>
  );
});

NarrativeEditor.displayName = 'NarrativeEditor';

export default NarrativeEditor;
>>>>>>> upstream/main
