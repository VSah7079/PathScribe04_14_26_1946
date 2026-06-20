import React from 'react';
import PathScribeEditor from './PathScribeEditor';
import type { PathScribeEditorHandle } from './PathScribeEditorRef';

export interface NarrativeEditorProps {
  value: string;
  onChange: (html: string) => void;
  readOnly?: boolean;
  minHeight?: string;
  macros?: any[];
  placeholder?: string;
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
