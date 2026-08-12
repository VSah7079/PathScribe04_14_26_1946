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
import BiopsyArrayDiagram, { type BiopsyArrayPosition } from './BiopsyArrayDiagram';

interface MaterialTreePanelProps {
  caseData: Case | null;
  /** Real fix, item #36: which specimen's synoptic report is currently
   *  being viewed on the right-hand panel — used to highlight the
   *  matching section here so switching specimens keeps the tree in
   *  sync rather than leaving the last-viewed selection stale. */
  activeSpecimenId?: string;
  /** Real fix, item #28: previously took no argument at all, so
   *  clicking any specific block opened the editor generically without
   *  telling it which block was actually clicked - the editor always
   *  showed whatever block happened to be focused already, not the one
   *  the pathologist just clicked. */
  onOpenBlockEditor: (blockId: string) => void;
  /** Replaces the old Add Orders modal's "Specimens" tab — opens the
   *  real SpecimenEditModal directly. */
  onAddSpecimen: () => void;
  /** Replaces the old Add Orders modal's "Blocks/Recut" tab — appends a
   *  real HistologyBlock to the specimen, not the old free-text
   *  cassette_key/total_cassettes fields the tree doesn't read from. */
  onAddBlock: (specimenId: string) => void;
  /** Real fix: opens the real AddCodeModal, pre-targeted at this
   *  specific specimen and landed directly on the CPT tab - the
   *  "contextual entry point" that puts base-code assignment right
   *  where the specimen already is, instead of a separate, unanchored
   *  global "Codes" button. specimenIndex is this specimen's real
   *  position in caseData.specimens (what AddCodeModal's own
   *  activeSpecimenIndex/specimenIndex targeting already expects). */
  onAssignBaseCode: (specimenId: string, specimenIndex: number) => void;
  /** Real feature, per direct confirmation: "I wanted to be able to
   *  assign each core to a specific section of a single block... This
   *  is a grossing activity." Opens CreateBiopsyArrayModal. Only shown
   *  when there are 2+ specimens on the case, since a Biopsy Array is
   *  inherently a multi-specimen concept. */
  onCreateBiopsyArray: () => void;
  /** Real feature, per direct confirmation: completes the Biopsy
   *  Array feature — "allowing edits." Opens CreateBiopsyArrayModal
   *  in edit mode for the given cassetteId. */
  onEditBiopsyArray: (cassetteId: string) => void;
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
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', minWidth: 0 }}>
          <span style={{
            fontSize: 10, fontWeight: 600, color: notYetReady ? '#94a3b8' : '#e2e8f0',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            display: 'block', maxWidth: '100%',
          }}>
            {stainName}
          </span>
        </div>
      </div>
    </div>
  );
};

const MaterialTreePanel: React.FC<MaterialTreePanelProps> = ({ caseData, activeSpecimenId, onOpenBlockEditor, onAddSpecimen, onAddBlock, onAssignBaseCode, onCreateBiopsyArray, onEditBiopsyArray }) => {
  const specimens = caseData?.specimens ?? [];

  // Real feature, per direct confirmation: group every block across
  // every specimen by its sharedCassetteId (Biopsy Array link) — a plain
  // object keyed by cassette id, built once per render from real
  // block data. Cheap: at most a handful of entries even on a large
  // case, no different in cost from any other array pass already
  // happening in this component.
  const biopsyArrayGroups = new Map<string, BiopsyArrayPosition[]>();
  for (const sp of specimens) {
    for (const block of (sp.blocks ?? [])) {
      if (!block.sharedCassetteId) continue;
      const list = biopsyArrayGroups.get(block.sharedCassetteId) ?? [];
      list.push({
        position: block.positionInBlock ?? 0,
        specimenLabel: sp.label,
        specimenDescription: sp.description,
        blockId: block.id,
        blockLabel: block.label,
      });
      biopsyArrayGroups.set(block.sharedCassetteId, list);
    }
  }
  // sharedCassetteId IS the human-readable cassette label the PA typed
  // in CreateBiopsyArrayModal (e.g. "C3") — no separate lookup needed.

  if (specimens.length === 0) {
    return (
      <div style={{ padding: 24, color: '#64748b', fontSize: 13 }}>
        No specimens on this case yet.
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 24px', overflowY: 'auto', height: '100%' }}>
      {specimens.map((sp: any, specimenIndex: number) => {
        const blocks = sp.blocks ?? [];
        const decants = sp.decants ?? [];
        const hasMaterial = blocks.length > 0 || decants.length > 0;
        const hasBaseCode = ((sp.coding?.cpt ?? []) as string[]).length > 0;
        const isActiveSpecimen = !!activeSpecimenId && sp.id === activeSpecimenId;

        return (
          <div key={sp.id} style={{
            marginBottom: 28, marginLeft: -12, marginRight: -12, padding: '8px 12px', borderRadius: 8,
            background: isActiveSpecimen ? 'rgba(8,145,178,0.08)' : 'transparent',
            borderLeft: isActiveSpecimen ? '2px solid #0891B2' : '2px solid transparent',
            transition: 'background 0.15s, border-color 0.15s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <ContainerIcon />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>{sp.label}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>{sp.description}</div>
              </div>
              {/* Real fix: contextual entry point for base-code
                  assignment, right on the specimen it applies to,
                  rather than a separate, unanchored global button. */}
              {!hasBaseCode && (
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                  background: 'rgba(245,158,11,0.15)', color: '#f59e0b', whiteSpace: 'nowrap',
                }} title="This specimen has no base surgical pathology CPT code assigned yet">
                  Pending Base Code
                </span>
              )}
              <button
                onClick={() => onAssignBaseCode(sp.id, specimenIndex)}
                style={{
                  fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6,
                  background: 'rgba(56,130,246,0.12)', border: '1px solid rgba(56,130,246,0.3)',
                  color: '#60a5fa', cursor: 'pointer', whiteSpace: 'nowrap',
                }}
                title="Assign this specimen's base CPT code"
              >
                + Code
              </button>
            </div>

            {!hasMaterial && (
              <div style={{ marginLeft: 52, fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
                No blocks or decants recorded yet.
              </div>
            )}

            {blocks.filter((block: any) => !block.sharedCassetteId).map((block: any) => {
              const isCancelled = block.status === 'Cancelled';
              return (
                <div key={block.id} style={{ display: 'flex', alignItems: 'center', gap: 14, marginLeft: 40, marginBottom: 10, opacity: isCancelled ? 0.45 : 1 }}>
                  <div onClick={() => onOpenBlockEditor(block.id)} style={{ cursor: 'pointer' }} title={`${sp.label}${block.label} · ${block.status}${isCancelled && block.cancelReason ? ` — ${block.cancelReason}` : ''}`}>
                    <BlockIcon label={`${sp.label}${block.label}`} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {isCancelled && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#f87171', textDecoration: 'line-through' }}>
                        CANCELLED
                      </span>
                    )}
                    {(block.stains ?? []).length === 0 && (
                      <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>no slides yet</div>
                    )}
                    {(block.stains ?? []).map((stain: any, i: number) => (
                      <SlideChip
                        key={stain.id}
                        level={`L${i + 1}`}
                        stainName={stain.stainName}
                        status={stain.status}
                        onClick={() => onOpenBlockEditor(block.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Real feature, per direct confirmation: this specimen's
                tissue is part of a shared cassette — the full diagram
                renders once, in the dedicated Biopsy Array section
                below, rather than duplicating it under every
                participating specimen. */}
            {blocks.filter((block: any) => block.sharedCassetteId).map((block: any) => (
              <div
                key={block.id}
                onClick={() => onOpenBlockEditor(block.id)}
                style={{ marginLeft: 40, marginBottom: 10, fontSize: 12, color: '#7dd3fc', cursor: 'pointer' }}
              >
                🧩 Part of Biopsy Array {block.sharedCassetteId} (position {block.positionInBlock}) — see Biopsy Array section below
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
                      onClick={() => onOpenBlockEditor(decant.id)}
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

      {biopsyArrayGroups.size > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 10, letterSpacing: 0.4 }}>
            Biopsy Arrays
          </div>
          {Array.from(biopsyArrayGroups.entries()).map(([cassetteId, positions]) => (
            <div key={cassetteId} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 4 }}>
              <BiopsyArrayDiagram
                cassetteLabel={cassetteId}
                positions={positions}
                onOpenBlockEditor={onOpenBlockEditor}
              />
              {/* Real feature, per direct confirmation: completes the
                  Biopsy Array feature — "allowing edits." */}
              <button
                onClick={() => onEditBiopsyArray(cassetteId)}
                style={{
                  fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6, marginTop: 8,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#94a3b8', cursor: 'pointer', whiteSpace: 'nowrap',
                }}
                title={`Edit Biopsy Array ${cassetteId}`}
              >
                ✏️ Edit
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        onClick={onAddSpecimen}
        style={{ fontSize: 13, color: '#94a3b8', cursor: 'pointer', marginBottom: 12, display: 'inline-block', marginRight: 20 }}
        onMouseEnter={e => (e.currentTarget.style.color = '#e2e8f0')}
        onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
      >
        + Add specimen
      </div>

      {/* Real feature, per direct confirmation: only meaningful with
          2+ specimens on the case — a Biopsy Array is inherently a
          multi-specimen concept. */}
      {specimens.length >= 2 && (
        <div
          onClick={onCreateBiopsyArray}
          style={{ fontSize: 13, color: '#94a3b8', cursor: 'pointer', marginBottom: 20, display: 'inline-block' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#e2e8f0')}
          onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
        >
          + Create Biopsy Array
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, marginTop: 8, paddingTop: 12, borderTop: '1px solid rgba(148,163,184,0.15)', fontSize: 11, color: '#94a3b8' }}>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'rgba(212,83,126,0.3)', borderRadius: 2, verticalAlign: 'middle', marginRight: 4 }} />stained</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, border: '0.5px dashed #94a3b8', borderRadius: 2, verticalAlign: 'middle', marginRight: 4 }} />held, unstained</span>
      </div>
    </div>
  );
};

export default MaterialTreePanel;
