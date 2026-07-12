// src/pages/SynopticReportPage/components/MaterialTreePanel.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Visual, clickable material tree — Specimen (container) → Block/Decant →
// StainOrder (slide) — reading real data already produced at accession
// (Specimen.blocks/.decants, see types/case/Material.ts and Specimen.ts).
//
// Deliberately not a second editor. Clicking a block or slide opens the
// real, already-working BlockStainEditorModal (the same one HeaderBar's
// "Edit" button opens) — this component is a navigation/viewing layer,
// not a competing place to change status/stains. See the conversation
// that led here: a first pass at this material model duplicated
// HistologyBlock/StainOrder before that was caught; this component reuses
// them directly rather than re-flattening its own copy.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import type { Case } from '@/types/case/Case';

interface MaterialTreePanelProps {
  caseData: Case | null;
  onOpenBlockEditor: () => void;
  /** Replaces the old Add Orders modal's "Specimens" tab — opens the
   *  real SpecimenEditModal directly. */
  onAddSpecimen: () => void;
  /** Replaces the old Add Orders modal's "Blocks/Recut" tab — appends a
   *  real HistologyBlock to the specimen, not the old free-text
   *  cassette_key/total_cassettes fields the tree doesn't read from. */
  onAddBlock: (specimenId: string) => void;
}

const ContainerIcon: React.FC = () => (
  <div style={{ position: 'relative', width: 40, flexShrink: 0 }}>
    {/* Screw-top lid — wider than the body, with ridge lines to read as
        threaded plastic rather than a flat box top. */}
    <div style={{
      width: 32, height: 8, margin: '0 auto', background: 'rgba(56,130,246,0.4)',
      border: '0.5px solid rgba(148,163,184,0.35)', borderRadius: '3px 3px 0 0',
      position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', alignItems: 'center',
    }}>
      <div style={{ width: 24, height: 0.5, background: 'rgba(148,163,184,0.4)' }} />
      <div style={{ width: 24, height: 0.5, background: 'rgba(148,163,184,0.4)' }} />
    </div>
    {/* Body — flat bottom, real specimen containers sit flat on a
        bench, not rounded like a cup. Blue, distinct from the block's
        warm amber, so the two tiers read apart at a glance. */}
    <div style={{
      background: 'rgba(56,130,246,0.15)', border: '0.5px solid rgba(148,163,184,0.3)',
      borderTop: 'none', borderRadius: '0 0 2px 2px',
      width: 28, height: 30, margin: '0 auto',
    }} />
  </div>
);

const BlockIcon: React.FC<{ label: string }> = ({ label }) => (
  <div style={{ width: 44, flexShrink: 0 }}>
    <div style={{
      background: 'rgba(186,117,23,0.18)',
      border: '0.5px solid rgba(148,163,184,0.3)',
      borderRadius: 3, width: 42, height: 28, position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {/* Lid seam — a real cassette's hinged lid is flush with the
          body, not a separate protrusion. A thin line inside the same
          rectangle reads as a hinge; the earlier offset tab above the
          body read as a manila folder instead. */}
      <div style={{ position: 'absolute', top: 5, left: 3, right: 3, height: 1, background: 'rgba(148,163,184,0.35)' }} />
      {/* Explicit slot rows, not a CSS gradient trick — the real
          cassette's perforated face is a stack of horizontal slots
          that let fixative through. Bright against the dark theme
          background, not a dark line that was blending into it. */}
      <div style={{ position: 'absolute', inset: '9px 4px 3px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ height: 2, background: 'rgba(226,232,240,0.55)', borderRadius: 1 }} />
          ))}
        </div>
      </div>
      <span style={{ position: 'relative', fontSize: 11, fontWeight: 700, color: '#e2e8f0', background: '#1e293b', padding: '0 3px', borderRadius: 2, marginTop: 4 }}>{label}</span>
    </div>
  </div>
);

const DecantIcon: React.FC<{ label: string }> = ({ label }) => (
  <div style={{ width: 36, flexShrink: 0 }}>
    <div style={{
      background: 'rgba(15,110,86,0.15)', border: '0.5px solid rgba(148,163,184,0.3)',
      borderRadius: '50%', width: 32, height: 32,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: '#e2e8f0' }}>{label}</span>
    </div>
  </div>
);

const SlideChip: React.FC<{ level: string; stainName: string; status: string; onClick: () => void }> = ({ level, stainName, status, onClick }) => {
  // 'Pending Cut' / 'Cut & Placed' / 'Staining' — the stain is real and
  // known, it just hasn't produced a finished, reviewable slide yet.
  // The dashed visual reflects that in-progress state; it never hides
  // the stain name itself, which is always known once ordered.
  const notYetReady = status !== 'Coverslipped' && status !== 'Ready for Review';
  return (
    <div
      onClick={onClick}
      title={`${level} · ${stainName} · ${status}`}
      style={{ cursor: 'pointer' }}
    >
      <div style={{
        background: notYetReady ? 'transparent' : 'rgba(212,83,126,0.15)',
        border: notYetReady ? '0.5px dashed rgba(148,163,184,0.5)' : '0.5px solid rgba(148,163,184,0.3)',
        borderRadius: 3, width: 68, height: 28, position: 'relative',
        display: 'flex', alignItems: 'stretch',
      }}>
        {/* Frosted end — real slides carry a matte strip at one end for
            a hand-written label; the vertical line is that strip's
            edge, and the ID sits centered inside it, same as where a
            real slide's ID would actually be written. */}
        <div style={{
          width: 20, flexShrink: 0, borderRight: '1px solid rgba(148,163,184,0.4)',
          background: 'rgba(148,163,184,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#cbd5e1' }}>{level}</span>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
          <span style={{
            fontSize: 10, fontWeight: 600, color: notYetReady ? '#94a3b8' : '#e2e8f0',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {stainName}
          </span>
        </div>
      </div>
    </div>
  );
};

const MaterialTreePanel: React.FC<MaterialTreePanelProps> = ({ caseData, onOpenBlockEditor, onAddSpecimen, onAddBlock }) => {
  const specimens = caseData?.specimens ?? [];

  if (specimens.length === 0) {
    return (
      <div style={{ padding: 24, color: '#64748b', fontSize: 13 }}>
        No specimens on this case yet.
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 24px', overflowY: 'auto', height: '100%' }}>
      {specimens.map((sp: any) => {
        const blocks = sp.blocks ?? [];
        const decants = sp.decants ?? [];
        const hasMaterial = blocks.length > 0 || decants.length > 0;

        return (
          <div key={sp.id} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <ContainerIcon />
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>{sp.label}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>{sp.description}</div>
              </div>
            </div>

            {!hasMaterial && (
              <div style={{ marginLeft: 52, fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
                No blocks or decants recorded yet.
              </div>
            )}

            {blocks.map((block: any) => (
              <div key={block.id} style={{ display: 'flex', alignItems: 'center', gap: 14, marginLeft: 40, marginBottom: 10 }}>
                <div onClick={onOpenBlockEditor} style={{ cursor: 'pointer' }} title={`${sp.label}${block.label} · ${block.status}`}>
                  <BlockIcon label={`${sp.label}${block.label}`} />
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(block.stains ?? []).length === 0 && (
                    <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>no slides yet</div>
                  )}
                  {(block.stains ?? []).map((stain: any, i: number) => (
                    <SlideChip
                      key={stain.id}
                      level={`L${i + 1}`}
                      stainName={stain.stainName}
                      status={stain.status}
                      onClick={onOpenBlockEditor}
                    />
                  ))}
                </div>
              </div>
            ))}

            {decants.map((decant: any) => (
              <div key={decant.id} style={{ display: 'flex', alignItems: 'center', gap: 14, marginLeft: 40, marginBottom: 10 }}>
                <div title={`${sp.label}${decant.label} · ${decant.decantType}`}>
                  <DecantIcon label={`${sp.label}${decant.label}`} />
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {decant.stains.length === 0 && (
                    <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>no slides yet</div>
                  )}
                  {decant.stains.map((stain: any, i: number) => (
                    <SlideChip
                      key={stain.id}
                      level={`L${i + 1}`}
                      stainName={stain.stainName}
                      status={stain.status}
                      onClick={onOpenBlockEditor}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Only offered when this specimen isn't already on the
                cytology/decant branch — a surgical specimen gets more
                blocks, a cytology one doesn't suddenly grow a block. */}
            {decants.length === 0 && (
              <div
                onClick={() => onAddBlock(sp.id)}
                style={{ marginLeft: 40, marginTop: 4, fontSize: 12, color: '#64748b', cursor: 'pointer', display: 'inline-block' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
                onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
              >
                + Request block/recut
              </div>
            )}
          </div>
        );
      })}

      <div
        onClick={onAddSpecimen}
        style={{ fontSize: 13, color: '#94a3b8', cursor: 'pointer', marginBottom: 20, display: 'inline-block' }}
        onMouseEnter={e => (e.currentTarget.style.color = '#e2e8f0')}
        onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
      >
        + Add specimen
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 8, paddingTop: 12, borderTop: '1px solid rgba(148,163,184,0.15)', fontSize: 11, color: '#94a3b8' }}>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'rgba(212,83,126,0.3)', borderRadius: 2, verticalAlign: 'middle', marginRight: 4 }} />stained</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, border: '0.5px dashed #94a3b8', borderRadius: 2, verticalAlign: 'middle', marginRight: 4 }} />held, unstained</span>
      </div>
    </div>
  );
};

export default MaterialTreePanel;
