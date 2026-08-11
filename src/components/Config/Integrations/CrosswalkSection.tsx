// src/components/Config/Integrations/CrosswalkSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real admin UI for the Specimen Code Crosswalk - closes a real gap
// flagged directly: services/orderIntake/'s SpecimenCodeCrosswalkEntry
// and its listCrosswalkEntries/addCrosswalkEntry methods were real and
// already implemented, with zero UI anywhere to view or manage them.
//
// Real, working end-to-end already, per direct investigation:
// resolveOrder() already consults this table on every incoming order,
// and already self-learns a new "pending" entry (createdBy: 'system')
// when nothing matches, rather than blocking. This screen is the
// missing piece: a place to SEE that table, add a real entry ahead of
// time (so a known client code never has to self-learn at all), and
// tell system-learned entries apart from admin-confirmed ones.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import '../../../pathscribe.css';
import { orderIntakeService, facilityService, specimenDictionaryService } from '@/services';
import type { SpecimenCodeCrosswalkEntry } from '@/services/orderIntake/IOrderIntakeService';
import type { Facility as Client } from '@/services/facilities/IFacilityService';
import type { SpecimenEntry } from '@/services/specimenDictionary/specimenTypes';
import { SearchableCombobox } from '@/components/Common/SearchableCombobox';

const CrosswalkSection: React.FC = () => {
  const [entries, setEntries] = useState<SpecimenCodeCrosswalkEntry[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [dictionary, setDictionary] = useState<SpecimenEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAdd, setShowAdd] = useState(false);
  const [newClientId, setNewClientId] = useState('');
  const [newExternalCode, setNewExternalCode] = useState('');
  const [newDictionaryEntryId, setNewDictionaryEntryId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = () => {
    Promise.all([
      orderIntakeService.listCrosswalkEntries(),
      facilityService.getAll(),
      specimenDictionaryService.getAll(),
    ]).then(([xwalkRes, clientsRes, dictRes]) => {
      if (xwalkRes.ok) setEntries(xwalkRes.data);
      if (clientsRes.ok) setClients(clientsRes.data);
      if (dictRes.ok) setDictionary(dictRes.data);
      setLoading(false);
    });
  };

  useEffect(() => { refresh(); }, []);

  const clientName = (id: string) => clients.find(c => c.id === id)?.name ?? id;
  const entryName = (id: string) => dictionary.find(d => d.id === id)?.name ?? id;

  const handleAdd = async () => {
    setError(null);
    if (!newClientId || !newExternalCode.trim() || !newDictionaryEntryId) {
      setError('Client, external code, and specimen type are all required.');
      return;
    }
    setSaving(true);
    const res = await orderIntakeService.addCrosswalkEntry({
      clientId: newClientId,
      externalCode: newExternalCode.trim(),
      dictionaryEntryId: newDictionaryEntryId,
      createdBy: 'admin',
    });
    setSaving(false);
    if (res.ok === false) {
      setError(res.error);
    } else {
      setShowAdd(false);
      setNewClientId(''); setNewExternalCode(''); setNewDictionaryEntryId('');
      refresh();
    }
  };

  if (loading) return <div className="ps-conf-section-subtitle">Loading…</div>;

  const pendingCount = entries.filter(e => e.createdBy === 'system').length;

  return (
    <div>
      <div className="ps-conf-section-header">
        <div>
          <h3 className="ps-conf-section-title">Specimen Code Map</h3>
          <p className="ps-conf-section-subtitle">
            Maps each client's own local specimen codes (from inbound HL7/API orders) to a real Specimen
            Dictionary entry — the same code string means different things at different sending systems, so
            entries are scoped per client. Every incoming order already consults this table automatically;
            an unrecognized code self-learns a real, pending entry here rather than blocking the order —
            review those below, or add a known mapping ahead of time so it never has to self-learn at all.
          </p>
        </div>
        <button className="ps-conf-btn-primary" onClick={() => setShowAdd(true)}>+ Add Mapping</button>
      </div>

      {pendingCount > 0 && (
        <div className="ps-conf-section-subtitle" style={{ color: '#f59e0b', fontWeight: 600, margin: '12px 0' }}>
          ⚠ {pendingCount} entr{pendingCount === 1 ? 'y was' : 'ies were'} auto-learned from an unrecognized order code — review for accuracy below.
        </div>
      )}

      <div className="ps-conf-table-wrap" style={{ marginTop: '16px' }}>
        <table className="ps-conf-table">
          <thead>
            <tr>
              <th className="ps-conf-th">Facility</th>
              <th className="ps-conf-th">External Code</th>
              <th className="ps-conf-th">Resolves To</th>
              <th className="ps-conf-th">Source</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr><td className="ps-conf-td" colSpan={4}>No crosswalk entries yet.</td></tr>
            )}
            {entries.map(e => (
              <tr key={e.id}>
                <td className="ps-conf-td">{clientName(e.clientId)}</td>
                <td className="ps-conf-td">{e.externalCode}</td>
                <td className="ps-conf-td">{entryName(e.dictionaryEntryId)}</td>
                <td className="ps-conf-td">
                  {e.createdBy === 'system'
                    ? <span style={{ color: '#f59e0b', fontWeight: 600 }}>Auto-learned — pending review</span>
                    : <span style={{ color: '#94a3b8' }}>Admin-confirmed</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div style={{ marginTop: '20px', padding: '16px', borderRadius: '10px', border: '1px solid rgba(56,189,248,0.3)', background: 'rgba(56,189,248,0.06)' }}>
          <div style={{ fontWeight: 700, marginBottom: '10px' }}>Add a mapping</div>
          {error && <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '10px' }}>{error}</div>}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', fontSize: '12px', gap: '4px' }}>
              Client
              <select className="ps-conf-select" value={newClientId} onChange={e => setNewClientId(e.target.value)}>
                <option value="">Select a facility…</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', fontSize: '12px', gap: '4px' }}>
              External code
              <input className="ps-conf-input" value={newExternalCode} onChange={e => setNewExternalCode(e.target.value)} placeholder="e.g. TISSUE-01" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', fontSize: '12px', gap: '4px', minWidth: '260px' }}>
              Resolves to specimen type
              <SearchableCombobox
                value={newDictionaryEntryId}
                onChange={setNewDictionaryEntryId}
                placeholder="Select a specimen type…"
                noMatchText="No specimen types match"
                options={dictionary.map(d => ({
                  id: d.id,
                  label: d.name,
                  sublabel: [d.procedure, d.type].filter(Boolean).join(' · '),
                  searchText: d.synonyms.join(' '),
                }))}
              />
            </label>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="ps-conf-btn-primary" disabled={saving} onClick={handleAdd}>{saving ? 'Saving…' : 'Save Mapping'}</button>
            <button className="ps-conf-btn-row" onClick={() => { setShowAdd(false); setError(null); }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CrosswalkSection;
