/**
 * CreateBiopsyArrayModal.tsx
 * src/pages/SynopticReportPage/modals/CreateBiopsyArrayModal.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Real feature, per direct confirmation: "I wanted to be able to assign each
 * core to a specific section of a single block... This is a grossing
 * activity." Select two or more specimens whose tissue is going into one
 * shared cassette, assign a cassette label, and the positions are simply
 * the order they were selected in (adjustable by re-ordering before saving)
 * — deliberately as simple as possible, no drag-and-drop, no separate
 * position-picker UI.
 *
 * Also handles editing an existing array (per direct request completing
 * the feature: "allowing edits of the Biopsy array") — pass
 * existingCassetteId + initialSelectedIds to open in edit mode. The
 * cassette label is locked once created — renaming would mean
 * handleUpdateBiopsyArray also has to handle changing the array's own
 * identity, which wasn't asked for; dissolve-and-recreate covers that
 * rare case without adding complexity to the common one.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { useState } from 'react';
import '@/pathscribe.css';
import type { Specimen } from '@/types/case/Specimen';

interface CreateBiopsyArrayModalProps {
  specimens: Specimen[];
  onSave: (specimenIds: string[], cassetteLabel: string) => void;
  onClose: () => void;
  /** Real feature, per direct confirmation: set both of these to open
   *  in edit mode instead of create mode. */
  existingCassetteId?: string;
  initialSelectedIds?: string[];
  /** Only meaningful in edit mode — a direct, explicit "undo the
   *  whole array" action, clearer than editing the selection down to
   *  zero specimens. */
  onDissolve?: () => void;
}

const CreateBiopsyArrayModal: React.FC<CreateBiopsyArrayModalProps> = ({
  specimens, onSave, onClose, existingCassetteId, initialSelectedIds, onDissolve,
}) => {
  const isEditMode = !!existingCassetteId;
  // Order IS the position — position 1 is whichever specimen was
  // selected first, etc. Deliberately no separate re-ordering UI for
  // v1: click to add in the order tissue will actually sit in the
  // block, click again to remove. Simplest possible interaction that
  // still produces a real, meaningful position number.
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds ?? []);
  const [cassetteLabel, setCassetteLabel] = useState(existingCassetteId ?? '');
  const [confirmingDissolve, setConfirmingDissolve] = useState(false);

  const toggle = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const canSave = selectedIds.length >= 2 && cassetteLabel.trim().length > 0;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#1e293b', border: '1px solid rgba(148,163,184,0.2)',
          borderRadius: 10, width: 460, maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(148,163,184,0.15)' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>
            {isEditMode ? `Edit Biopsy Array ${existingCassetteId}` : 'Create Biopsy Array'}
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
            {isEditMode
              ? 'Add or remove specimens, or reorder which position each one sits in.'
              : 'Select the specimens whose tissue is going into one shared cassette. Position is the order you select them in.'}
          </div>
        </div>

        <div style={{ padding: '14px 20px', overflowY: 'auto', flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>
            Cassette Label
          </div>
          <input
            value={cassetteLabel}
            onChange={e => setCassetteLabel(e.target.value)}
            placeholder="e.g. C3"
            disabled={isEditMode}
            title={isEditMode ? "Cassette label can't be changed once created — dissolve and create a new one to rename" : undefined}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 7, marginBottom: 16,
              border: '1px solid rgba(255,255,255,0.12)',
              background: isEditMode ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)',
              color: isEditMode ? '#94a3b8' : '#f1f5f9', fontSize: 13, outline: 'none', boxSizing: 'border-box',
              cursor: isEditMode ? 'not-allowed' : 'text',
            }}
          />

          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>
            Specimens ({selectedIds.length} selected)
          </div>
          {specimens.map(sp => {
            const idx = selectedIds.indexOf(sp.id);
            const selected = idx !== -1;
            return (
              <div
                key={sp.id}
                onClick={() => toggle(sp.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                  borderRadius: 7, cursor: 'pointer', marginBottom: 4,
                  background: selected ? 'rgba(8,145,178,0.12)' : 'transparent',
                  border: `1px solid ${selected ? 'rgba(8,145,178,0.4)' : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: selected ? '#0891B2' : 'rgba(255,255,255,0.06)',
                  fontSize: 10, fontWeight: 700, color: 'white',
                }}>
                  {selected ? idx + 1 : ''}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>Specimen {sp.label}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{sp.description}</div>
                </div>
              </div>
            );
          })}
          {selectedIds.length === 1 && (
            <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 8 }}>
              {isEditMode
                ? 'Dropping to one specimen will dissolve the whole array — select at least one more, or use Dissolve Array below.'
                : 'Select at least one more specimen — a Biopsy Array needs two or more.'}
            </div>
          )}

          {isEditMode && onDissolve && (
            <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid rgba(148,163,184,0.1)' }}>
              {!confirmingDissolve ? (
                <button
                  onClick={() => setConfirmingDissolve(true)}
                  style={{
                    fontSize: 12, color: '#f87171', background: 'transparent',
                    border: 'none', cursor: 'pointer', padding: 0,
                  }}
                >
                  🗑 Dissolve this array — specimens become separate blocks again
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: '#f87171' }}>Dissolve {existingCassetteId}? This can't be undone.</span>
                  <button
                    onClick={onDissolve}
                    style={{ fontSize: 12, fontWeight: 600, color: 'white', background: '#dc2626', border: 'none', borderRadius: 5, padding: '4px 10px', cursor: 'pointer' }}
                  >
                    Confirm Dissolve
                  </button>
                  <button
                    onClick={() => setConfirmingDissolve(false)}
                    style={{ fontSize: 12, color: '#94a3b8', background: 'transparent', border: 'none', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(148,163,184,0.15)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', borderRadius: 7, fontSize: 13, fontWeight: 600,
              background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: '#cbd5e1', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            disabled={!canSave}
            onClick={() => canSave && onSave(selectedIds, cassetteLabel.trim())}
            style={{
              padding: '8px 16px', borderRadius: 7, fontSize: 13, fontWeight: 600,
              background: canSave ? '#0891B2' : 'rgba(255,255,255,0.06)',
              color: canSave ? 'white' : '#64748b',
              border: 'none', cursor: canSave ? 'pointer' : 'not-allowed',
            }}
          >
            {isEditMode ? 'Save Changes' : 'Create Biopsy Array'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateBiopsyArrayModal;
