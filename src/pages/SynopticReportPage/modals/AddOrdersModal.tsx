/**
 * AddOrdersModal.tsx
 * src/pages/SynopticReportPage/modals/AddOrdersModal.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Replaces the old, single-purpose "+ Add Specimen" button. That button
 * conflated three genuinely different tiers of the real specimen hierarchy —
 * Specimen (a new OR container of tissue) → Block (tissue cut and cassetted
 * during grossing) → Section/Level (a slide cut from a block) — under one
 * label and one flow. A specimen-tier action is rare and deliberate; a
 * block/recut or stain order is the common, routine click. This modal gives
 * each tier its own real tab instead of pretending they're the same action.
 *
 * Tab order is dynamic, not fixed — driven by what's actually likely to be
 * clicked given the case's current stage:
 *   Pre-gross-complete ('draft' | 'accessioned' — PA actively at the bench):
 *     Blocks → Specimens → Stains
 *   Post-gross-complete (pathologist territory — everything from
 *     'gross-complete' onward): Stains → Blocks → Specimens
 *
 * Specimens tab and Stains tab deliberately don't reimplement anything —
 * they hand off to the real, already-working SpecimenEditModal and
 * FlagManagerModal rather than risk the exact kind of duplicate-mechanism
 * problem found and removed once already tonight. Only Blocks/Recut is a
 * genuinely new, purpose-built form, because nothing else in the app
 * currently handles "additional cassette on an existing specimen" as its
 * own action.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { useState, useMemo } from 'react';
import '@/pathscribe.css';
import type { Case } from '@/types/case/Case';

export type OrderTab = 'blocks' | 'specimens' | 'stains';

interface AddOrdersModalProps {
  show: boolean;
  caseData: Case | null;
  /** Specimen currently selected in the Sidebar, if any — pre-selects it
   *  in the Blocks and Stains tabs so the common case (I'm already
   *  looking at the specimen I want to act on) needs no extra click. */
  activeSpecimenId?: string | null;
  /** Force the modal to open on a specific tab, overriding the default
   *  status-driven tabOrder[0] — e.g. a keyboard shortcut or action-registry
   *  entry (ADD_ORDERS_BLOCK / ADD_ORDERS_STAIN / ADD_ORDERS_SPECIMEN) that
   *  wants to land the user directly on that tab instead of requiring a
   *  manual click. undefined (or ADD_ORDERS's generic entry) falls back to
   *  the existing status-driven default. Re-applied every time the modal
   *  opens, not just on first mount, since this component stays mounted
   *  (returns null internally) across show/hide cycles. */
  initialTab?: OrderTab;
  onClose: () => void;
  /** "Specimens" tab chosen — caller closes this modal and opens the
   *  real SpecimenEditModal, exactly as the old + Add Specimen button did. */
  onGoToAddSpecimen: () => void;
  /** "Stains" tab chosen — caller closes this modal and opens the real
   *  Flag Manager, pre-scoped to specimenId if one was selected. */
  onGoToAddStain: (specimenId?: string) => void;
  /** "Blocks/Recut" tab submitted — caller appends the generated
   *  sentence to caseData.diagnostic.grossDescription and updates the
   *  target specimen's grossing instance (cassette count/key + a
   *  mirrored note in its own comments field), then persists. */
  onAddBlock: (specimenId: string, cassetteLabel: string, note: string) => void;
}

const TAB_LABEL: Record<OrderTab, string> = {
  blocks:    '🧱 Blocks / Recut',
  specimens: '🧫 Specimens',
  stains:    '🎨 Stains / Sectioning',
};

const AddOrdersModal: React.FC<AddOrdersModalProps> = ({
  show, caseData, activeSpecimenId, initialTab, onClose, onGoToAddSpecimen, onGoToAddStain, onAddBlock,
}) => {
  // Pre-gross-complete = PA actively at the bench, hasn't finalized
  // Grossing yet. Everything from 'gross-complete' onward is
  // pathologist/microscopic territory — deliberately a simple allowlist
  // of the two "still grossing" statuses rather than trying to
  // enumerate every later status, so this stays correct even if new
  // post-gross statuses get added later.
  const isPreGrossComplete = caseData?.status === 'draft' || caseData?.status === 'accessioned';

  const tabOrder: OrderTab[] = isPreGrossComplete
    ? ['blocks', 'specimens', 'stains']
    : ['stains', 'blocks', 'specimens'];

  const [activeTab, setActiveTab] = useState<OrderTab>(initialTab ?? tabOrder[0]);

  // This component stays mounted (returns null internally, see below)
  // across show/hide cycles rather than being conditionally rendered by
  // its parent — so the useState initializer above only ever runs once,
  // on first mount. Re-apply initialTab explicitly every time the modal
  // transitions to open, so ADD_ORDERS_BLOCK/STAIN/SPECIMEN land on the
  // requested tab on every open, not just the first.
  React.useEffect(() => {
    if (show) setActiveTab(initialTab ?? tabOrder[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, initialTab]);

  // If the modal re-opens later in the case's life (grossing now done
  // when it wasn't before), land on the tab that's actually first for
  // the current status rather than whatever was last selected.
  const resolvedActiveTab = tabOrder.includes(activeTab) ? activeTab : tabOrder[0];

  // ── Blocks/Recut tab state ────────────────────────────────────────────
  const [blockSpecimenId, setBlockSpecimenId] = useState(activeSpecimenId ?? '');
  const [cassetteLabel,   setCassetteLabel]   = useState('');
  const [blockError,      setBlockError]      = useState('');

  const specimens = caseData?.specimens ?? [];
  const selectedSpecimen = specimens.find(sp => sp.id === blockSpecimenId);

  const generatedSentence = useMemo(() => {
    if (!selectedSpecimen) return '';
    const blockRef = cassetteLabel.trim() || '[block]';
    return `Specimen ${selectedSpecimen.label} represents deeper levels cut from Block ${blockRef}, ordered for advanced microscopic evaluation.`;
  }, [selectedSpecimen, cassetteLabel]);

  const handleSubmitBlock = () => {
    if (!blockSpecimenId) { setBlockError('Select which specimen this block/recut is from.'); return; }
    if (!cassetteLabel.trim()) { setBlockError('Enter a cassette/block label.'); return; }
    setBlockError('');
    onAddBlock(blockSpecimenId, cassetteLabel.trim(), generatedSentence);
    setCassetteLabel('');
  };

  if (!show) return null;

  return (
    <div className="ps-conf-backdrop" onClick={onClose}>
      <div
        className="fm-modal fm-modal--config"
        style={{ width: 'min(640px, 96vw)' }}
        onClick={e => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-labelledby="add-orders-title"
      >
        <div className="fm-modal-header">
          <div>
            <div className="fm-eyebrow">
              {isPreGrossComplete ? 'Grossing in progress' : 'Microscopic review'}
            </div>
            <h2 id="add-orders-title" className="fm-title" style={{ fontSize: 16 }}>Add Orders</h2>
          </div>
        </div>

        {/* Tabs — order itself is the signal; no separate label needed
            explaining why they're arranged this way. */}
        <div style={{ display: 'flex', gap: 4, padding: '0 20px', borderBottom: '1px solid rgba(148,163,184,0.15)' }}>
          {tabOrder.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '10px 14px', fontSize: 13, fontWeight: resolvedActiveTab === tab ? 600 : 400,
                color: resolvedActiveTab === tab ? '#38bdf8' : 'rgba(148,163,184,0.7)',
                background: 'none', border: 'none',
                borderBottom: resolvedActiveTab === tab ? '2px solid #38bdf8' : '2px solid transparent',
                cursor: 'pointer',
              }}
            >
              {TAB_LABEL[tab]}
            </button>
          ))}
        </div>

        <div className="ps-client-editor-body">

          {resolvedActiveTab === 'blocks' && (
            <div>
              <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 0 }}>
                Additional cassette or recut from tissue already grossed and described — not a new specimen. Appends a real sentence to the case's gross description automatically; no new physical description needed since nothing new was received.
              </p>

              <label className="ps-conf-label">Specimen</label>
              <select
                className="ps-conf-input" style={{ marginBottom: 16 }}
                value={blockSpecimenId}
                onChange={e => setBlockSpecimenId(e.target.value)}
              >
                <option value="">Select the specimen this is from…</option>
                {specimens.map(sp => (
                  <option key={sp.id} value={sp.id}>{sp.label}: {sp.description}</option>
                ))}
              </select>

              <label className="ps-conf-label">Cassette / block label</label>
              <input
                className="ps-conf-input" style={{ marginBottom: 16 }}
                placeholder="e.g. A2, A3"
                value={cassetteLabel}
                onChange={e => setCassetteLabel(e.target.value)}
              />

              {selectedSpecimen && (
                <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic', marginBottom: 16, padding: '10px 12px', background: 'rgba(56,189,248,0.06)', borderRadius: 8 }}>
                  Will append: "{generatedSentence}"
                </div>
              )}

              {blockError && <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 12 }}>{blockError}</div>}
            </div>
          )}

          {resolvedActiveTab === 'specimens' && (
            <div>
              <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 0 }}>
                A genuinely new OR container of tissue that wasn't accounted for during the original accession — not a recut or a stain order. Uncommon; opens the full specimen intake form, including a mandatory physical description and real Grossing template assignment.
              </p>
              <button className="fm-btn-apply" onClick={onGoToAddSpecimen} style={{ marginTop: 8 }}>
                Continue to new specimen intake →
              </button>
            </div>
          )}

          {resolvedActiveTab === 'stains' && (
            <div>
              <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 0 }}>
                Ordering an additional level, IHC panel, or special stain on tissue that's already been grossed. This is exactly what applying a flag to a specimen already means — opens the real Flag Manager rather than a second, separate ordering mechanism.
              </p>
              <button className="fm-btn-apply" onClick={() => onGoToAddStain(activeSpecimenId ?? undefined)} style={{ marginTop: 8 }}>
                Continue to Flag Manager →
              </button>
            </div>
          )}

        </div>

        <div className="fm-footer">
          <span className="fm-footer-status" />
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} className="fm-btn-cancel">Close</button>
            {resolvedActiveTab === 'blocks' && (
              <button onClick={handleSubmitBlock} className="fm-btn-apply">Add block / recut</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddOrdersModal;
