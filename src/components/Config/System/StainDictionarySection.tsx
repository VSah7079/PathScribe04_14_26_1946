// src/components/Config/System/StainDictionarySection.tsx
// ─────────────────────────────────────────────────────────────
// Admin screen for the stain catalog — three related, tabbed
// dictionaries. See IStainService.ts's own header comment for the full
// design reasoning (orthogonal Stain Type / Sectioning Protocol,
// composed via quick-order macros for the ordering UX without merging
// the two dimensions in the data).
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect, useMemo } from 'react';
import '../../../pathscribe.css';
import { stainTypeService, sectioningProtocolService, stainOrderMacroService } from '../../../services';
import type { StainType, StainCategory, SectioningProtocol, StainOrderMacro } from '../../../services';

type SubTab = 'types' | 'protocols' | 'macros';

// ── Stain Type editor ───────────────────────────────────────────────────────

const STAIN_CATEGORIES: StainCategory[] = ['Routine', 'Special Stain', 'IHC', 'Immunofluorescence', 'Molecular', 'Other'];

interface StainTypeModalProps {
  entry?: StainType;
  onSave: (draft: Omit<StainType, 'id' | 'version' | 'updatedBy' | 'updatedAt'>) => void;
  onClose: () => void;
}
const StainTypeModal: React.FC<StainTypeModalProps> = ({ entry, onSave, onClose }) => {
  const [name, setName] = useState(entry?.name ?? '');
  const [category, setCategory] = useState<StainCategory>(entry?.category ?? 'Routine');
  const [description, setDescription] = useState(entry?.description ?? '');
  const [antibodyClone, setAntibodyClone] = useState(entry?.antibodyClone ?? '');
  const [vendor, setVendor] = useState(entry?.vendor ?? '');
  const [turnaround, setTurnaround] = useState(entry?.defaultTurnaroundHours?.toString() ?? '');
  const [active, setActive] = useState(entry?.active ?? true);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(), category, description: description.trim() || undefined,
      antibodyClone: antibodyClone.trim() || undefined, vendor: vendor.trim() || undefined,
      defaultTurnaroundHours: turnaround ? Number(turnaround) : undefined, active,
    });
  };

  return (
    <div className="ps-ms-overlay">
      <div className="ps-ms-modal">
        <div className="ps-ms-header">{entry ? `Edit — ${entry.name}` : 'Add Stain Type'}</div>
        <div className="ps-ms-body">
          <div className="ps-conf-form-row">
            <div className="ps-conf-form-field">
              <label className="ps-conf-label">Name <span className="ps-conf-required">*</span></label>
              <input className="ps-conf-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ki-67" />
            </div>
            <div className="ps-conf-form-field">
              <label className="ps-conf-label">Category</label>
              <select className="ps-conf-select" value={category} onChange={e => setCategory(e.target.value as StainCategory)}>
                {STAIN_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="ps-conf-form-field">
            <label className="ps-conf-label">Description</label>
            <textarea className="ps-conf-input ps-conf-textarea" value={description} onChange={e => setDescription(e.target.value)} placeholder="What this stain is used for" />
          </div>
          {(category === 'IHC' || category === 'Immunofluorescence') && (
            <div className="ps-conf-form-row">
              <div className="ps-conf-form-field">
                <label className="ps-conf-label">Antibody Clone</label>
                <input className="ps-conf-input" value={antibodyClone} onChange={e => setAntibodyClone(e.target.value)} placeholder="e.g. 30-9" />
              </div>
              <div className="ps-conf-form-field">
                <label className="ps-conf-label">Vendor</label>
                <input className="ps-conf-input" value={vendor} onChange={e => setVendor(e.target.value)} placeholder="e.g. Ventana" />
              </div>
            </div>
          )}
          <div className="ps-conf-form-row">
            <div className="ps-conf-form-field">
              <label className="ps-conf-label">Default Turnaround (hours)</label>
              <input className="ps-conf-input" type="number" min="0" value={turnaround} onChange={e => setTurnaround(e.target.value)} placeholder="e.g. 24" />
            </div>
            <div className="ps-conf-form-field">
              <label className="ps-conf-label">Status</label>
              <div className="ps-conf-toggle-row">
                <div onClick={() => setActive(!active)} className={`ps-conf-toggle-track ${active ? 'ps-conf-toggle-track--active' : ''}`}>
                  <div className="ps-conf-toggle-thumb" />
                </div>
                <span className={`ps-conf-toggle-label ${active ? 'ps-conf-toggle-label--active' : ''}`}>{active ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="ps-ms-footer">
          <button className="ps-ms-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="ps-ms-btn-apply" onClick={handleSave}>{entry ? 'Save Changes' : 'Add Stain Type'}</button>
        </div>
      </div>
    </div>
  );
};

// ── Sectioning Protocol editor ──────────────────────────────────────────────

interface ProtocolModalProps {
  entry?: SectioningProtocol;
  onSave: (draft: Omit<SectioningProtocol, 'id' | 'version' | 'updatedBy' | 'updatedAt'>) => void;
  onClose: () => void;
}
const ProtocolModal: React.FC<ProtocolModalProps> = ({ entry, onSave, onClose }) => {
  const [name, setName] = useState(entry?.name ?? '');
  const [description, setDescription] = useState(entry?.description ?? '');
  const [active, setActive] = useState(entry?.active ?? true);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), description: description.trim() || undefined, active });
  };

  return (
    <div className="ps-ms-overlay">
      <div className="ps-ms-modal">
        <div className="ps-ms-header">{entry ? `Edit — ${entry.name}` : 'Add Sectioning Protocol'}</div>
        <div className="ps-ms-body">
          <div className="ps-conf-form-field">
            <label className="ps-conf-label">Name <span className="ps-conf-required">*</span></label>
            <input className="ps-conf-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Level x 3" />
          </div>
          <div className="ps-conf-form-field">
            <label className="ps-conf-label">Description</label>
            <textarea className="ps-conf-input ps-conf-textarea" value={description} onChange={e => setDescription(e.target.value)} placeholder="What this sectioning instruction means" />
          </div>
          <div className="ps-conf-form-field">
            <label className="ps-conf-label">Status</label>
            <div className="ps-conf-toggle-row">
              <div onClick={() => setActive(!active)} className={`ps-conf-toggle-track ${active ? 'ps-conf-toggle-track--active' : ''}`}>
                <div className="ps-conf-toggle-thumb" />
              </div>
              <span className={`ps-conf-toggle-label ${active ? 'ps-conf-toggle-label--active' : ''}`}>{active ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
        </div>
        <div className="ps-ms-footer">
          <button className="ps-ms-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="ps-ms-btn-apply" onClick={handleSave}>{entry ? 'Save Changes' : 'Add Protocol'}</button>
        </div>
      </div>
    </div>
  );
};

// ── Quick-Order Macro editor ────────────────────────────────────────────────

interface MacroModalProps {
  entry?: StainOrderMacro;
  stainTypes: StainType[];
  protocols: SectioningProtocol[];
  onSave: (draft: Omit<StainOrderMacro, 'id' | 'version' | 'updatedBy' | 'updatedAt'>) => void;
  onClose: () => void;
}
const MacroModal: React.FC<MacroModalProps> = ({ entry, stainTypes, protocols, onSave, onClose }) => {
  const [label, setLabel] = useState(entry?.label ?? '');
  const [stainTypeId, setStainTypeId] = useState(entry?.stainTypeId ?? stainTypes[0]?.id ?? '');
  const [sectioningProtocolId, setSectioningProtocolId] = useState(entry?.sectioningProtocolId ?? protocols[0]?.id ?? '');
  const [sortOrder, setSortOrder] = useState(entry?.sortOrder?.toString() ?? '99');
  const [active, setActive] = useState(entry?.active ?? true);

  const handleSave = () => {
    if (!label.trim() || !stainTypeId || !sectioningProtocolId) return;
    onSave({ label: label.trim(), stainTypeId, sectioningProtocolId, sortOrder: Number(sortOrder) || 99, active });
  };

  return (
    <div className="ps-ms-overlay">
      <div className="ps-ms-modal">
        <div className="ps-ms-header">{entry ? `Edit — ${entry.label}` : 'Add Quick-Order Macro'}</div>
        <div className="ps-ms-body">
          <div className="ps-conf-form-field">
            <label className="ps-conf-label">Label <span className="ps-conf-required">*</span></label>
            <input className="ps-conf-input" value={label} onChange={e => setLabel(e.target.value)} placeholder='e.g. "H&E x 3"' />
          </div>
          <div className="ps-conf-form-row">
            <div className="ps-conf-form-field">
              <label className="ps-conf-label">Stain Type <span className="ps-conf-required">*</span></label>
              <select className="ps-conf-select" value={stainTypeId} onChange={e => setStainTypeId(e.target.value)}>
                {stainTypes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="ps-conf-form-field">
              <label className="ps-conf-label">Sectioning Protocol <span className="ps-conf-required">*</span></label>
              <select className="ps-conf-select" value={sectioningProtocolId} onChange={e => setSectioningProtocolId(e.target.value)}>
                {protocols.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div className="ps-conf-form-row">
            <div className="ps-conf-form-field">
              <label className="ps-conf-label">Sort Order</label>
              <input className="ps-conf-input" type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)} />
            </div>
            <div className="ps-conf-form-field">
              <label className="ps-conf-label">Status</label>
              <div className="ps-conf-toggle-row">
                <div onClick={() => setActive(!active)} className={`ps-conf-toggle-track ${active ? 'ps-conf-toggle-track--active' : ''}`}>
                  <div className="ps-conf-toggle-thumb" />
                </div>
                <span className={`ps-conf-toggle-label ${active ? 'ps-conf-toggle-label--active' : ''}`}>{active ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="ps-ms-footer">
          <button className="ps-ms-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="ps-ms-btn-apply" onClick={handleSave}>{entry ? 'Save Changes' : 'Add Macro'}</button>
        </div>
      </div>
    </div>
  );
};

// ── Main section ─────────────────────────────────────────────────────────

const StainDictionarySection: React.FC = () => {
  const [subTab, setSubTab] = useState<SubTab>('types');
  const [stainTypes, setStainTypes] = useState<StainType[]>([]);
  const [protocols, setProtocols] = useState<SectioningProtocol[]>([]);
  const [macros, setMacros] = useState<StainOrderMacro[]>([]);
  const [search, setSearch] = useState('');
  const [typeModal, setTypeModal] = useState<{ entry?: StainType } | null>(null);
  const [protocolModal, setProtocolModal] = useState<{ entry?: SectioningProtocol } | null>(null);
  const [macroModal, setMacroModal] = useState<{ entry?: StainOrderMacro } | null>(null);

  const loadAll = () => {
    stainTypeService.getAll().then(res => { if (res.ok) setStainTypes(res.data); });
    sectioningProtocolService.getAll().then(res => { if (res.ok) setProtocols(res.data); });
    stainOrderMacroService.getAll().then(res => { if (res.ok) setMacros(res.data); });
  };
  useEffect(() => { loadAll(); }, []);

  const filteredTypes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stainTypes.filter(s => !q || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q));
  }, [stainTypes, search]);

  const stainName = (id: string) => stainTypes.find(s => s.id === id)?.name ?? '—';
  const protocolName = (id: string) => protocols.find(p => p.id === id)?.name ?? '—';

  return (
    <div>
      <div className="ps-conf-section-header">
        <div>
          <h3 className="ps-conf-section-title">Stain Dictionary</h3>
          <p className="ps-conf-section-subtitle">
            Stain Type and Sectioning Protocol are independent dimensions — Quick-Order Macros compose
            one of each into a single ordering preset for the UX, without merging them in the data.
          </p>
        </div>
      </div>

      <div className="ps-tab-bar ps-staindict-tabs">
        <button className={`ps-tab-btn ${subTab === 'types' ? 'active' : ''}`} onClick={() => setSubTab('types')}>Stain Types ({stainTypes.length})</button>
        <button className={`ps-tab-btn ${subTab === 'protocols' ? 'active' : ''}`} onClick={() => setSubTab('protocols')}>Sectioning Protocols ({protocols.length})</button>
        <button className={`ps-tab-btn ${subTab === 'macros' ? 'active' : ''}`} onClick={() => setSubTab('macros')}>Quick-Order Macros ({macros.length})</button>
      </div>

      {subTab === 'types' && (
        <>
          <div className="ps-conf-form-row--3">
            <input type="text" placeholder="Search stain types..." value={search} onChange={e => setSearch(e.target.value)} className="ps-conf-search" />
            <div />
            <button className="ps-conf-btn-primary" onClick={() => setTypeModal({})}>+ Add Stain Type</button>
          </div>
          <div className="ps-conf-table-wrap">
            <div className="ps-conf-table-scroll">
              <table className="ps-conf-table">
                <thead className="ps-conf-thead-sticky">
                  <tr>{['Name', 'Category', 'Clone / Vendor', 'Turnaround', 'Status', 'Actions'].map(h => <th key={h} className="ps-conf-th">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {filteredTypes.map(s => (
                    <tr key={s.id} className="ps-conf-tr">
                      <td className="ps-conf-td"><div className="ps-conf-identity-name">{s.name}</div></td>
                      <td className="ps-conf-td">{s.category}</td>
                      <td className="ps-conf-td"><div className="ps-specreq-meta">{[s.antibodyClone, s.vendor].filter(Boolean).join(' · ') || '—'}</div></td>
                      <td className="ps-conf-td">{s.defaultTurnaroundHours ? `${s.defaultTurnaroundHours}h` : '—'}</td>
                      <td className="ps-conf-td">
                        <span className="ps-conf-status-cell">
                          <span className={`ps-conf-status-dot ${s.active ? 'ps-conf-status-dot--active' : ''}`} />
                          <span className={`ps-conf-status-text ${s.active ? 'ps-conf-status-text--active' : ''}`}>{s.active ? 'Active' : 'Inactive'}</span>
                        </span>
                      </td>
                      <td className="ps-conf-td"><button className="ps-conf-btn-row" onClick={() => setTypeModal({ entry: s })}>Edit</button></td>
                    </tr>
                  ))}
                  {filteredTypes.length === 0 && <tr><td className="ps-conf-empty-row" colSpan={6}>No stain types match the current search.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {subTab === 'protocols' && (
        <>
          <div className="ps-conf-form-row--3">
            <div /><div />
            <button className="ps-conf-btn-primary" onClick={() => setProtocolModal({})}>+ Add Protocol</button>
          </div>
          <div className="ps-conf-table-wrap">
            <div className="ps-conf-table-scroll">
              <table className="ps-conf-table">
                <thead className="ps-conf-thead-sticky"><tr>{['Name', 'Description', 'Status', 'Actions'].map(h => <th key={h} className="ps-conf-th">{h}</th>)}</tr></thead>
                <tbody>
                  {protocols.map(p => (
                    <tr key={p.id} className="ps-conf-tr">
                      <td className="ps-conf-td"><div className="ps-conf-identity-name">{p.name}</div></td>
                      <td className="ps-conf-td"><div className="ps-specreq-meta">{p.description ?? '—'}</div></td>
                      <td className="ps-conf-td">
                        <span className="ps-conf-status-cell">
                          <span className={`ps-conf-status-dot ${p.active ? 'ps-conf-status-dot--active' : ''}`} />
                          <span className={`ps-conf-status-text ${p.active ? 'ps-conf-status-text--active' : ''}`}>{p.active ? 'Active' : 'Inactive'}</span>
                        </span>
                      </td>
                      <td className="ps-conf-td"><button className="ps-conf-btn-row" onClick={() => setProtocolModal({ entry: p })}>Edit</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {subTab === 'macros' && (
        <>
          <div className="ps-conf-form-row--3">
            <div /><div />
            <button className="ps-conf-btn-primary" onClick={() => setMacroModal({})}>+ Add Macro</button>
          </div>
          <div className="ps-conf-table-wrap">
            <div className="ps-conf-table-scroll">
              <table className="ps-conf-table">
                <thead className="ps-conf-thead-sticky"><tr>{['Label', 'Stain Type', 'Sectioning Protocol', 'Status', 'Actions'].map(h => <th key={h} className="ps-conf-th">{h}</th>)}</tr></thead>
                <tbody>
                  {macros.map(m => (
                    <tr key={m.id} className="ps-conf-tr">
                      <td className="ps-conf-td"><div className="ps-conf-identity-name">{m.label}</div></td>
                      <td className="ps-conf-td">{stainName(m.stainTypeId)}</td>
                      <td className="ps-conf-td">{protocolName(m.sectioningProtocolId)}</td>
                      <td className="ps-conf-td">
                        <span className="ps-conf-status-cell">
                          <span className={`ps-conf-status-dot ${m.active ? 'ps-conf-status-dot--active' : ''}`} />
                          <span className={`ps-conf-status-text ${m.active ? 'ps-conf-status-text--active' : ''}`}>{m.active ? 'Active' : 'Inactive'}</span>
                        </span>
                      </td>
                      <td className="ps-conf-td"><button className="ps-conf-btn-row" onClick={() => setMacroModal({ entry: m })}>Edit</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {typeModal && (
        <StainTypeModal entry={typeModal.entry}
          onSave={async draft => {
            if (typeModal.entry) await stainTypeService.update(typeModal.entry.id, draft);
            else await stainTypeService.add(draft);
            setTypeModal(null); loadAll();
          }}
          onClose={() => setTypeModal(null)} />
      )}
      {protocolModal && (
        <ProtocolModal entry={protocolModal.entry}
          onSave={async draft => {
            if (protocolModal.entry) await sectioningProtocolService.update(protocolModal.entry.id, draft);
            else await sectioningProtocolService.add(draft);
            setProtocolModal(null); loadAll();
          }}
          onClose={() => setProtocolModal(null)} />
      )}
      {macroModal && (
        <MacroModal entry={macroModal.entry} stainTypes={stainTypes} protocols={protocols}
          onSave={async draft => {
            if (macroModal.entry) await stainOrderMacroService.update(macroModal.entry.id, draft);
            else await stainOrderMacroService.add(draft);
            setMacroModal(null); loadAll();
          }}
          onClose={() => setMacroModal(null)} />
      )}
    </div>
  );
};

export default StainDictionarySection;
