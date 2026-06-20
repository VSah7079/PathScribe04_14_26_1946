// src/components/Config/System/RuleModal.tsx
// Extracted from RoutingRulesSection to avoid OXC/rolldown parse issues
// with chevron SVG template literals in co-located component functions.

import React, { useState } from 'react';
import '../../../pathscribe.css';
import { RoutingRule } from '../../../services/cases/caseRoutingService';
import { Subspecialty } from '../../../services/subspecialties/ISubspecialtyService';

// ─── Styles ───────────────────────────────────────────────────────────────────

const INPUT: React.CSSProperties = {
  padding: '8px 12px', fontSize: 13, color: '#e5e7eb',
  background: '#0f0f0f', border: '1px solid #374151',
  borderRadius: 7, outline: 'none', width: '100%',
  boxSizing: 'border-box', fontFamily: 'inherit',
};
const LABEL: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: '#9ca3af',
  textTransform: 'uppercase', letterSpacing: '0.08em',
  marginBottom: 5, display: 'block',
};

// ─── Rule Modal ───────────────────────────────────────────────────────────────

const RuleModal: React.FC<{
  mode:   'add' | 'edit';
  rule?:  RoutingRule;
  pools:  Subspecialty[];
  allRules: RoutingRule[];
  onSave: (rule: Omit<RoutingRule, 'id' | 'builtIn'>) => void;
  onClose: () => void;
}> = ({ mode, rule, pools, allRules, onSave, onClose }) => {
  const [subspecialtyId, setSubspecialtyId] = useState(rule?.subspecialtyId ?? (pools[0]?.id ?? ''));
  const [keywords,       setKeywords]       = useState<string[]>(rule?.keywords ?? []);
  const [keywordInput,   setKeywordInput]   = useState('');
  const [priority,       setPriority]       = useState(rule?.priority ?? 100);
  const [active,         setActive]         = useState(rule?.active ?? true);
  const [note,           setNote]           = useState(rule?.note ?? '');
  const [error,          setError]          = useState('');

  const addKeyword = () => {
    const kw = keywordInput.trim().toLowerCase();
    if (!kw) return;
    if (keywords.includes(kw)) { setError(`"${kw}" already in list`); return; }
    setKeywords(prev => [...prev, kw]);
    setKeywordInput('');
    setError('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); addKeyword(); }
  };

  const handleSave = () => {
    if (!subspecialtyId) { setError('Select a pool'); return; }
    if (keywords.length === 0) { setError('Add at least one keyword'); return; }
    const conflict = allRules.find(r => r.priority === priority && r.id !== rule?.id);
    if (conflict) {
      setError(`Priority ${priority} is already used by another rule — choose a different value`);
      return;
    }
    onSave({ subspecialtyId, keywords, priority, active, note: note.trim() || undefined });
  };

  return (
    <div className="ps-conf-backdrop">
      <div className="fm-modal fm-modal--config" style={{ width: 'min(600px, 96vw)' }} onClick={e => e.stopPropagation()}>
        <div className="fm-modal-header">
          <div>
            <div className="fm-eyebrow">Configuration · Case Routing</div>
            <h2 className="fm-title" style={{ fontSize: 16 }}>{mode === 'add' ? 'Add Routing Rule' : 'Edit Rule'}</h2>
          </div>
        </div>
        <div className="ps-client-editor-body">

          {/* Pool */}
          <div>
            <label style={LABEL}>Route to Pool <span style={{ color: '#ef4444' }}>*</span></label>
            {pools.length === 0 ? (
              <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', fontSize: 12, color: '#fbbf24' }}>
                ⚠ No active pools. Enable "Pool / Workgroup" on a Subspecialty first.
              </div>
            ) : (
              <select value={subspecialtyId} onChange={e => setSubspecialtyId(e.target.value)} className="ps-conf-select">
                {pools.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
          </div>

          {/* Keywords */}
          <div>
            <label style={LABEL}>Keywords <span style={{ color: '#ef4444' }}>*</span></label>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
              If a specimen description contains any of these words, the case routes to the pool above. Case-insensitive, partial match.
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                value={keywordInput}
                onChange={e => setKeywordInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type keyword and press Enter or Add"
                style={{ ...INPUT, flex: 1 }}
              />
              <button onClick={addKeyword}
                style={{ padding: '8px 16px', borderRadius: 7, border: '1px solid rgba(138,180,248,0.3)', background: 'rgba(138,180,248,0.1)', color: '#8AB4F8', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Add
              </button>
            </div>
            {keywords.length === 0 ? (
              <div style={{ padding: '12px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', fontSize: 12, color: '#4b5563', textAlign: 'center' }}>
                No keywords yet
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {keywords.map(kw => (
                  <span key={kw} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: 'rgba(138,180,248,0.1)', color: '#8AB4F8', border: '1px solid rgba(138,180,248,0.2)' }}>
                    {kw}
                    <span onClick={() => setKeywords(prev => prev.filter(k => k !== kw))}
                      style={{ cursor: 'pointer', fontSize: 13, opacity: 0.6, lineHeight: 1 }}>x</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Priority */}
          <div>
            <label style={LABEL}>Priority</label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <input type="number" min={1} max={999} value={priority}
                onChange={e => setPriority(parseInt(e.target.value) || 1)}
                style={{ ...INPUT, width: 100 }} />
              <span style={{ fontSize: 12, color: '#6b7280' }}>
                Lower number = checked first. Built-in rules use 10–60. Custom rules default to 100.
              </span>
            </div>
          </div>

          {/* Note */}
          <div>
            <label style={LABEL}>Note (optional)</label>
            <input value={note} onChange={e => setNote(e.target.value)}
              placeholder="e.g. Added for thyroid specimens pending thoracic subspecialty setup"
              style={INPUT} />
          </div>

          {/* Active toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <div onClick={() => setActive(v => !v)}
              className={`ps-sub-toggle-track${active ? ' ps-sub-toggle-track--on' : ' ps-sub-toggle-track--off'}`}>
              <div className={`ps-sub-toggle-thumb${active ? ' ps-sub-toggle-thumb--on' : ' ps-sub-toggle-thumb--off'}`} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: active ? '#22c55e' : '#6b7280' }}>{active ? 'Active' : 'Inactive'}</span>
          </div>

          {error && <div style={{ fontSize: 12, color: '#ef4444' }}>{error}</div>}
        </div>

        <div className="fm-footer">
          <span className="fm-footer-status" />
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} className="fm-btn-cancel">Cancel</button>
            <button onClick={handleSave} disabled={keywords.length === 0 || !subspecialtyId} className="fm-btn-apply">
              {mode === 'add' ? 'Add Rule' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RuleModal;
