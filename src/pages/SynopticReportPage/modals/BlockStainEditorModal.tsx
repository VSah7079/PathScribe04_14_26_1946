// src/pages/SynopticReportPage/modals/BlockStainEditorModal.tsx
// ─────────────────────────────────────────────────────────────
// The actual visual editor at the bench — voice commands (next/
// previous block, mark grossed, confirm triage) existed before this,
// but there was no way to hand-edit a block at all: no UI to change
// status to anything other than the next step forward, no UI to add
// or remove a stain after auto-generation, no UI to override priority
// per block. This is that editor.
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect, useMemo, useRef } from 'react';
import '../../../pathscribe.css';
import { stainTypeService } from '@/services';
import type { StainType } from '@/services/stains/IStainService';
import type { CasePriority } from '@/services/cases/ICaseService';

const BLOCK_STATUSES = ['Pending', 'Grossed', 'Embedded', 'Exhausted'] as const;
const PRIORITY_OPTIONS: CasePriority[] = ['Routine', 'Rush', 'STAT'];

// ── Real search + multi-select for stains, same pattern as the Protocol ────
// ── editor's picker — reused rather than reinvented for the same reason: ───
// ── a live Stain Dictionary can run to hundreds of entries. ─────────────────
const StainMultiSelect: React.FC<{
  stainTypes: StainType[];
  stains: { id: string; stainName: string; status: string }[];
  onChange: (stains: { id: string; stainName: string; status: string }[]) => void;
}> = ({ stainTypes, stains, onChange }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const matches = stainTypes
    .filter(s => !stains.some(existing => existing.stainName === s.name))
    .filter(s => {
      const q = query.trim().toLowerCase();
      return !q || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
    })
    .slice(0, 20);

  const add = (s: StainType) => {
    onChange([...stains, { id: `stain-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, stainName: s.name, status: 'Pending Cut' }]);
    setQuery('');
  };
  const remove = (id: string) => onChange(stains.filter(s => s.id !== id));

  return (
    <div className="ps-protocol-stainselect" ref={wrapRef}>
      {stains.length > 0 && (
        <div className="ps-protocol-stainselect-chips">
          {stains.map(s => (
            <span key={s.id} className="ps-protocol-stainselect-chip">
              {s.stainName}
              <button type="button" onClick={() => remove(s.id)} className="ps-protocol-stainselect-chip-remove">×</button>
            </span>
          ))}
        </div>
      )}
      <input
        className="ps-conf-input"
        placeholder="Search stains to add — name or category…"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
      />
      {open && matches.length > 0 && (
        <div className="ps-protocol-stainselect-dropdown">
          {matches.map(s => (
            <div key={s.id} className="ps-protocol-stainselect-option" onMouseDown={() => add(s)}>
              <span>{s.name}</span>
              <span className="ps-protocol-stainselect-option-cat">{s.category}</span>
            </div>
          ))}
        </div>
      )}
      {open && query.trim() && matches.length === 0 && (
        <div className="ps-protocol-stainselect-dropdown">
          <div className="ps-protocol-stainselect-empty">No matching stains.</div>
        </div>
      )}
    </div>
  );
};

interface BlockRow {
  specimenId: string;
  specimenLabel: string;
  block: any;
}

interface Props {
  blocks: BlockRow[];
  casePriority: CasePriority;
  onUpdateBlock: (specimenId: string, blockId: string, changes: Partial<any>) => void;
  onClose: () => void;
}

export const BlockStainEditorModal: React.FC<Props> = ({ blocks, casePriority, onUpdateBlock, onClose }) => {
  const [stainTypes, setStainTypes] = useState<StainType[]>([]);
  useEffect(() => {
    stainTypeService.getAll().then(res => { if (res.ok) setStainTypes(res.data.filter(s => s.active)); });
  }, []);

  return (
    <div className="ps-ms-overlay">
      <div className="ps-ms-modal ps-ms-modal--protocol">
        <div className="ps-ms-header-row">
          <div className="ps-ms-header">Blocks &amp; Stains</div>
          <button className="ps-ms-close-btn" onClick={onClose} title="Close">✕</button>
        </div>
        <div className="ps-ms-body">
          <p className="ps-fixgate-intro">
            Direct edits — status, stains, and a per-block priority override. Priority defaults to inheriting the
            case's own priority ({casePriority}); only set an override here if this specific block genuinely needs
            different urgency than the rest of the case.
          </p>
          <div className="ps-protocol-tracks-scroll">
            {blocks.map(({ specimenId, specimenLabel, block }) => (
              <div key={block.id} className="ps-protocol-track-card">
                <div className="ps-protocol-track-header">
                  <strong className="ps-protocol-track-name">
                    {specimenLabel}{block.label}{block.sourcePathwayName ? ` — ${block.sourcePathwayName}` : ''}
                  </strong>
                </div>
                <div className="ps-conf-form-row">
                  <div className="ps-conf-form-field">
                    <label className="ps-conf-label">Status</label>
                    <select className="ps-conf-select" value={block.status}
                      onChange={e => onUpdateBlock(specimenId, block.id, { status: e.target.value })}>
                      {BLOCK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="ps-conf-form-field">
                    <label className="ps-conf-label">Priority</label>
                    <select className="ps-conf-select" value={block.priority ?? ''}
                      onChange={e => onUpdateBlock(specimenId, block.id, { priority: e.target.value || undefined })}>
                      <option value="">Inherit from case ({casePriority})</option>
                      {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p} (override)</option>)}
                    </select>
                  </div>
                </div>
                <label className="ps-conf-label">Stains</label>
                <StainMultiSelect
                  stainTypes={stainTypes}
                  stains={block.stains}
                  onChange={stains => onUpdateBlock(specimenId, block.id, { stains })}
                />
              </div>
            ))}
            {blocks.length === 0 && <div className="ps-cmnt-thread-empty">No blocks on this case yet.</div>}
          </div>
        </div>
        <div className="ps-ms-footer">
          <button className="ps-ms-btn-apply" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
};
