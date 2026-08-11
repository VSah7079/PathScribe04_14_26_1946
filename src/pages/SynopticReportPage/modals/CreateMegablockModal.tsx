/**
 * CreateMegablockModal.tsx
 * src/pages/SynopticReportPage/modals/CreateMegablockModal.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Real feature, per direct confirmation: "I wanted to be able to assign each
 * core to a specific section of a single block... This is a grossing
 * activity." Select two or more specimens whose tissue is going into one
 * shared cassette, assign a cassette label, and the positions are simply
 * the order they were selected in (adjustable by re-ordering before saving)
 * — deliberately as simple as possible, no drag-and-drop, no separate
 * position-picker UI.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { useState } from 'react';
import '@/pathscribe.css';
import type { Specimen } from '@/types/case/Specimen';

interface CreateMegablockModalProps {
  specimens: Specimen[];
  onSave: (specimenIds: string[], cassetteLabel: string) => void;
  onClose: () => void;
}

const CreateMegablockModal: React.FC<CreateMegablockModalProps> = ({ specimens, onSave, onClose }) => {
  // Order IS the position — position 1 is whichever specimen was
  // selected first, etc. Deliberately no separate re-ordering UI for
  // v1: click to add in the order tissue will actually sit in the
  // block, click again to remove. Simplest possible interaction that
  // still produces a real, meaningful position number.
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [cassetteLabel, setCassetteLabel] = useState('');

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
          <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>Create Megablock</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
            Select the specimens whose tissue is going into one shared cassette.
            Position is the order you select them in.
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
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 7, marginBottom: 16,
              border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)',
              color: '#f1f5f9', fontSize: 13, outline: 'none', boxSizing: 'border-box',
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
              Select at least one more specimen — a megablock needs two or more.
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
            Create Megablock
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateMegablockModal;
