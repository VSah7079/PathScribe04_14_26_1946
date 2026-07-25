// src/pages/SynopticReportPage/components/MarkersPanel.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Phase D of the biomarker display work (see PRIORITY_FIXES.md #13-related
// entry). Shows resolved biomarker values in the cyan-badge grid style
// originally seen in FullReportPage.tsx's "Synoptic Summary" card — reused
// here rather than rebuilt from scratch, but driven by real, flexible,
// specimen-type-aware marker data (via getMarkersFromAnswers()) instead of
// a hardcoded ER/PR/HER2/Ki-67-only shape.
//
// No provenance/block-slide linking yet — that's a real, separate future
// piece (see PRIORITY_FIXES.md's note on CoPilot mode needing real LIS
// material-list data, not PathScribe's own mock blocks, before that's
// safe to build for CoPilot cases specifically).
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import type { ResolvedAnswer } from '@/orchestrator/contextBuilder';

interface MarkersPanelProps {
  markers: ResolvedAnswer[];
}

const MarkersPanel: React.FC<MarkersPanelProps> = ({ markers }) => {
  if (markers.length === 0) return null;

  return (
    <div style={{ background: 'rgba(8,145,178,0.06)', borderRadius: '8px', padding: '14px 16px', marginBottom: '20px', border: '1px solid rgba(8,145,178,0.2)' }}>
      <div style={{ fontSize: '10px', fontWeight: 700, color: '#0891B2', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '10px' }}>
        Biomarkers
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px' }}>
        {markers.map(m => (
          <div
            key={m.fieldId}
            style={{ padding: '10px 14px', background: 'rgba(8,145,178,0.08)', borderRadius: '8px', border: '1px solid rgba(8,145,178,0.2)', textAlign: 'center' }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#0891B2', marginBottom: '4px' }}>{m.fieldLabel}</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>{m.displayValue || '—'}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarkersPanel;
