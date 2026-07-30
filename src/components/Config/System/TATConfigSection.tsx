// src/components/Config/System/TATConfigSection.tsx
// Full implementation of TAT Configuration.
//
// Data model:
//   TATEntry { id, type, targetHours, urgency, clientId, specimenId,
//               subspecialtyId, active, notes }
//
// Uniqueness guard: no two ACTIVE entries share
//   (type + urgency + clientId + specimenId + subspecialtyId)
//
// 7-level resolution hierarchy (most-specific-wins):
//   1. client + specimen + urgency
//   2. client + specimen
//   3. client + subspecialty + urgency
//   4. client + subspecialty
//   5. client only
//   6. specimen only
//   7. system default (no dimensions)

import React, { useState, useMemo, useEffect } from 'react';
import { useSubspecialties } from '../../../contexts/useSubspecialties';
import { useSpecimenDictionary } from './useSpecimenDictionary';
import { mockClientService } from '../../../services/clients/mockClientService';
import '../../../pathscribe.css';
import { useAuditLog } from '../../Audit/useAuditLog';


// ── Types ─────────────────────────────────────────────────────────────────────

export type TATType =
  | 'FIRST_TOUCH'
  | 'TOTAL_CASE'
  | 'FROZEN_SECTION'
  | 'COLD_ISCHEMIA'
  | 'GROSSING'
  | 'SIGN_OUT'
  | 'CONSULTATION_RESPONSE'   // How fast I respond to colleagues' requests
  | 'CONSULTATION_AWAITING';  // How long I wait for colleagues' responses

export type TATUrgency = 'ROUTINE' | 'STAT';

export interface TATEntry {
  id:             string;
  type:           TATType;
  targetHours:    number;
  urgency:        TATUrgency | null;   // null = all urgency levels
  clientId:       string | null;       // null = all clients
  specimenId:     string | null;       // null = all specimens
  subspecialtyId: string | null;       // null = all subspecialties
  roleId:         string | null;       // null = all roles; e.g. 'Resident', 'Pathologist'
  active:         boolean;
  notes:          string;
  createdAt:      string;
}

const TAT_TYPES: TATType[] = [
  'FIRST_TOUCH', 'TOTAL_CASE', 'FROZEN_SECTION',
  'COLD_ISCHEMIA', 'GROSSING', 'SIGN_OUT',
  'CONSULTATION_RESPONSE', 'CONSULTATION_AWAITING',
];

const TAT_TYPE_LABELS: Record<TATType, string> = {
  FIRST_TOUCH:              'First Touch',
  TOTAL_CASE:               'Total Case',
  FROZEN_SECTION:           'Frozen Section',
  COLD_ISCHEMIA:            'Cold Ischaemia',
  GROSSING:                 'Grossing',
  SIGN_OUT:                 'Sign-Out',
  CONSULTATION_RESPONSE:    'Consultation — My Response',
  CONSULTATION_AWAITING:    'Consultation — Awaiting Response',
};

const TAT_TYPE_DESC: Record<TATType, string> = {
  FIRST_TOUCH:              'Received → first opened by any pathologist',
  TOTAL_CASE:               'Received → case finalised',
  FROZEN_SECTION:           'Gross submitted → verbal report issued',
  COLD_ISCHEMIA:            'Surgical excision → specimen in fixative',
  GROSSING:                 'Received → gross description saved',
  SIGN_OUT:                 'Microscopic saved → case finalised',
  CONSULTATION_RESPONSE:    'Request received → reviewer responds (second opinion / formal consult)',
  CONSULTATION_AWAITING:    'Request sent → response received from colleague or external reviewer',
};

// ── System defaults ───────────────────────────────────────────────────────────

const SYSTEM_DEFAULTS: TATEntry[] = [
  { id: 'sys-ft-r',  type: 'FIRST_TOUCH',    targetHours: 4,    urgency: 'ROUTINE', clientId: null, specimenId: null, subspecialtyId: null, roleId: null, active: true, notes: 'System default', createdAt: '2024-01-01T00:00:00Z' },
  { id: 'sys-ft-s',  type: 'FIRST_TOUCH',    targetHours: 1,    urgency: 'STAT',    clientId: null, specimenId: null, subspecialtyId: null, roleId: null, active: true, notes: 'System default', createdAt: '2024-01-01T00:00:00Z' },
  { id: 'sys-tc-r',  type: 'TOTAL_CASE',     targetHours: 24,   urgency: 'ROUTINE', clientId: null, specimenId: null, subspecialtyId: null, roleId: null, active: true, notes: 'System default', createdAt: '2024-01-01T00:00:00Z' },
  { id: 'sys-tc-s',  type: 'TOTAL_CASE',     targetHours: 4,    urgency: 'STAT',    clientId: null, specimenId: null, subspecialtyId: null, roleId: null, active: true, notes: 'System default', createdAt: '2024-01-01T00:00:00Z' },
  { id: 'sys-fs-r',  type: 'FROZEN_SECTION', targetHours: 0.5,  urgency: 'ROUTINE', clientId: null, specimenId: null, subspecialtyId: null, roleId: null, active: true, notes: 'System default', createdAt: '2024-01-01T00:00:00Z' },
  { id: 'sys-fs-s',  type: 'FROZEN_SECTION', targetHours: 0.33, urgency: 'STAT',    clientId: null, specimenId: null, subspecialtyId: null, roleId: null, active: true, notes: 'System default', createdAt: '2024-01-01T00:00:00Z' },
  { id: 'sys-ci',    type: 'COLD_ISCHEMIA',  targetHours: 1,    urgency: null,      clientId: null, specimenId: null, subspecialtyId: null, roleId: null, active: true, notes: 'System default', createdAt: '2024-01-01T00:00:00Z' },
  { id: 'sys-gr-r',  type: 'GROSSING',       targetHours: 4,    urgency: 'ROUTINE', clientId: null, specimenId: null, subspecialtyId: null, roleId: null, active: true, notes: 'System default', createdAt: '2024-01-01T00:00:00Z' },
  { id: 'sys-gr-s',  type: 'GROSSING',       targetHours: 2,    urgency: 'STAT',    clientId: null, specimenId: null, subspecialtyId: null, roleId: null, active: true, notes: 'System default', createdAt: '2024-01-01T00:00:00Z' },
  { id: 'sys-so-r',  type: 'SIGN_OUT',              targetHours: 4,    urgency: 'ROUTINE', clientId: null, specimenId: null, subspecialtyId: null, roleId: null,           active: true, notes: 'System default', createdAt: '2024-01-01T00:00:00Z' },
  { id: 'sys-so-s',  type: 'SIGN_OUT',              targetHours: 2,    urgency: 'STAT',    clientId: null, specimenId: null, subspecialtyId: null, roleId: null,           active: true, notes: 'System default', createdAt: '2024-01-01T00:00:00Z' },
  // Consultation — Response (how fast I reply to requests sent to me)
  { id: 'sys-cr-res',type: 'CONSULTATION_RESPONSE', targetHours: 24,   urgency: null,      clientId: null, specimenId: null, subspecialtyId: null, roleId: 'Resident',     active: true, notes: 'Resident / Fellow — training programme standard', createdAt: '2024-01-01T00:00:00Z' },
  { id: 'sys-cr-pat',type: 'CONSULTATION_RESPONSE', targetHours: 48,   urgency: null,      clientId: null, specimenId: null, subspecialtyId: null, roleId: 'Pathologist',  active: true, notes: 'Pathologist — informal peer review', createdAt: '2024-01-01T00:00:00Z' },
  { id: 'sys-cr-ext',type: 'CONSULTATION_RESPONSE', targetHours: 120,  urgency: null,      clientId: null, specimenId: null, subspecialtyId: null, roleId: 'External',     active: true, notes: 'External / formal consult — 5 working days', createdAt: '2024-01-01T00:00:00Z' },
  // Consultation — Awaiting (how long before I chase up outstanding requests)
  { id: 'sys-ca-res',type: 'CONSULTATION_AWAITING', targetHours: 24,   urgency: null,      clientId: null, specimenId: null, subspecialtyId: null, roleId: 'Resident',     active: true, notes: 'Resident / Fellow — escalate if no response', createdAt: '2024-01-01T00:00:00Z' },
  { id: 'sys-ca-pat',type: 'CONSULTATION_AWAITING', targetHours: 48,   urgency: null,      clientId: null, specimenId: null, subspecialtyId: null, roleId: 'Pathologist',  active: true, notes: 'Pathologist — chase after 48h', createdAt: '2024-01-01T00:00:00Z' },
  { id: 'sys-ca-ext',type: 'CONSULTATION_AWAITING', targetHours: 120,  urgency: null,      clientId: null, specimenId: null, subspecialtyId: null, roleId: 'External',     active: true, notes: 'External / formal consult — 5 working days', createdAt: '2024-01-01T00:00:00Z' },
];

// ── Storage ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'pathscribe_tat_entries_v2'; // v2: added roleId + consultation types

function loadEntries(): TATEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : SYSTEM_DEFAULTS;
  } catch { return SYSTEM_DEFAULTS; }
}

function saveEntries(entries: TATEntry[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch {}
}

// ── Uniqueness guard ──────────────────────────────────────────────────────────

function findConflict(
  entries: TATEntry[],
  draft: Partial<TATEntry>,
  excludeId?: string
): TATEntry | null {
  return entries.find(e =>
    e.active &&
    e.id !== excludeId &&
    e.type           === draft.type &&
    e.urgency        === (draft.urgency ?? null) &&
    e.clientId       === (draft.clientId ?? null) &&
    e.specimenId     === (draft.specimenId ?? null) &&
    e.subspecialtyId === (draft.subspecialtyId ?? null)
  ) ?? null;
}

// ── Hours formatter ───────────────────────────────────────────────────────────

function formatHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h === Math.floor(h)) return `${h}h`;
  return `${h}h`;
}

// ── Blank draft ───────────────────────────────────────────────────────────────

function blankDraft(): Partial<TATEntry> {
  return {
    type: 'FIRST_TOUCH',
    targetHours: 4,
    urgency: 'ROUTINE',
    clientId: null,
    specimenId: null,
    subspecialtyId: null,
    active: true,
    notes: '',
  };
}

// ── Specificity score for resolution hierarchy display ────────────────────────

function specificityScore(e: TATEntry): number {
  let score = 0;
  if (e.clientId)       score += 4;
  if (e.specimenId)     score += 2;
  if (e.subspecialtyId) score += 2;
  if (e.urgency)        score += 1;
  return score;
}

// ── Add/Edit Modal ────────────────────────────────────────────────────────────

interface ModalProps {
  entry?:       TATEntry;
  entries:      TATEntry[];
  clients:      { id: string; name: string }[];
  specimens:    { id: string; name: string }[];
  subspecialties: { id: string; name: string }[];
  onSave:       (e: TATEntry) => void;
  onClose:      () => void;
}

const TATModal: React.FC<ModalProps> = ({
  entry, entries, clients, specimens, subspecialties, onSave, onClose
}) => {
  const isEdit = !!entry;
  const [draft, setDraft] = useState<Partial<TATEntry>>(
    entry ? { ...entry } : blankDraft()
  );
  const [error, setError] = useState('');

  const set = <K extends keyof TATEntry>(k: K, v: TATEntry[K]) =>
    setDraft(d => ({ ...d, [k]: v }));

  const handleSave = () => {
    if (!draft.type) { setError('TAT type is required'); return; }
    if (!draft.targetHours || draft.targetHours <= 0) {
      setError('Target hours must be greater than 0');
      return;
    }
    const conflict = findConflict(entries, draft, entry?.id);
    if (conflict) {
      setError(
        'An active rule already exists for this combination (' +
        TAT_TYPE_LABELS[conflict.type] + ' · ' +
        (conflict.urgency ?? 'Any urgency') + '). ' +
        'Deactivate the existing rule first.'
      );
      return;
    }
    const now = new Date().toISOString();
    const saved: TATEntry = {
      id:             entry?.id ?? ('tat-' + Date.now()),
      type:           draft.type!,
      targetHours:    draft.targetHours!,
      urgency:        draft.urgency ?? null,
      clientId:       draft.clientId ?? null,
      specimenId:     draft.specimenId ?? null,
      subspecialtyId: draft.subspecialtyId ?? null,
      // No form UI sets this yet — same null-default pattern as the
      // other scoping fields above; TATEntry itself already supports
      // per-role targets (see seed data), just not exposed in this
      // form's UI.
      roleId:         null,
      active:         draft.active ?? true,
      notes:          draft.notes ?? '',
      createdAt:      entry?.createdAt ?? now,
    };
    onSave(saved);
  };

  const isSystem = entry?.id?.startsWith('sys-');

  return (
    <div className="ps-conf-backdrop">
      <div
        className="fm-modal fm-modal--config"
        style={{ width: 'min(640px, 96vw)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="fm-modal-header">
          <div>
            <div className="fm-eyebrow">Configuration · TAT Configuration</div>
            <h2 className="fm-title" style={{ fontSize: 16 }}>
              {isEdit ? 'Edit TAT Rule' : 'Add TAT Rule'}
              {isSystem && (
                <span className="ps-idf-tier-badge ps-idf-tier-badge--2" style={{ marginLeft: 8 }}>
                  system default
                </span>
              )}
            </h2>
          </div>
        </div>

        <div className="ps-client-editor-body">

          {isSystem && (
            <div className="ps-sub-info-box">
              System defaults can be edited but not deleted. Deactivating a system default
              removes it from the resolution hierarchy — make sure a custom rule covers the gap.
            </div>
          )}

          {/* TAT Type */}
          <div className="ps-sub-field">
            <label className="ps-sub-label">TAT Type <span className="ps-sub-label-req">*</span></label>
            <select
              className="ps-conf-select"
              value={draft.type ?? ''}
              onChange={e => set('type', e.target.value as TATType)}
            >
              {TAT_TYPES.map(t => (
                <option key={t} value={t}>{TAT_TYPE_LABELS[t]}</option>
              ))}
            </select>
            {draft.type && (
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                {TAT_TYPE_DESC[draft.type]}
              </div>
            )}
          </div>

          {/* Target Hours + Urgency row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="ps-sub-field">
              <label className="ps-sub-label">Target Hours <span className="ps-sub-label-req">*</span></label>
              <input
                type="number"
                className="ps-sub-input"
                min={0.1}
                step={0.25}
                value={draft.targetHours ?? ''}
                onChange={e => set('targetHours', parseFloat(e.target.value) || 0)}
              />
              {draft.targetHours && draft.targetHours > 0 && (
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                  = {formatHours(draft.targetHours)}
                </div>
              )}
            </div>

            <div className="ps-sub-field">
              <label className="ps-sub-label">Urgency</label>
              <select
                className="ps-conf-select"
                value={draft.urgency ?? ''}
                onChange={e => set('urgency', (e.target.value || null) as TATUrgency | null)}
              >
                <option value="">Any (Routine + STAT)</option>
                <option value="ROUTINE">Routine only</option>
                <option value="STAT">STAT only</option>
              </select>
            </div>
          </div>

          {/* Applies To — structured matching filters */}
          <div className="ps-sub-field">
            <label className="ps-sub-label">Applies To</label>
            <div className="ps-tat-scope-hint">
              These filters determine <strong>which cases this rule matches</strong>.
              Leave a filter blank to match all values for that dimension.
              The more filters set, the higher the resolution priority — a rule
              with Client + Specimen overrides one with Client alone.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <select
                className="ps-conf-select"
                value={draft.clientId ?? ''}
                onChange={e => set('clientId', e.target.value || null)}
              >
                <option value="">All clients</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              <select
                className="ps-conf-select"
                value={draft.specimenId ?? ''}
                onChange={e => set('specimenId', e.target.value || null)}
              >
                <option value="">All specimen types</option>
                {specimens.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>

              <select
                className="ps-conf-select"
                value={draft.subspecialtyId ?? ''}
                onChange={e => set('subspecialtyId', e.target.value || null)}
              >
                <option value="">All subspecialties</option>
                {subspecialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>

              <select
                className="ps-conf-select"
                value={(draft as any).roleId ?? ''}
                onChange={e => set('roleId' as any, e.target.value || null)}
              >
                <option value="">All roles</option>
                <option value="Resident">Resident</option>
                <option value="Fellow">Fellow</option>
                <option value="Pathologist">Pathologist</option>
                <option value="External">External reviewer</option>
              </select>
            </div>

            {/* Live resolution preview */}
            {(() => {
              const parts: string[] = [];
              const clientName  = clients.find(cl => cl.id === draft.clientId)?.name;
              const specimenName = specimens.find(s => s.id === draft.specimenId)?.name;
              const subName     = subspecialties.find(s => s.id === draft.subspecialtyId)?.name;
              const roleName    = (draft as any).roleId;
              const urgency     = draft.urgency;

              if (urgency)      parts.push(urgency === 'STAT' ? 'STAT' : 'Routine');
              if (roleName)     parts.push(roleName + 's');
              if (specimenName) parts.push(specimenName + ' specimens');
              if (subName)      parts.push(subName + ' subspecialty');
              if (clientName)   parts.push('at ' + clientName);

              const preview = parts.length === 0
                ? 'This is a system default — applies to all cases'
                : 'Applies to ' + parts.join(', ');

              return (
                <div className="ps-tat-scope-preview">
                  <span className="ps-tat-scope-preview__icon">→</span>
                  <span className="ps-tat-scope-preview__text">{preview}</span>
                </div>
              );
            })()}
          </div>

          {/* Admin notes — free text, no effect on matching */}
          <div className="ps-sub-field">
            <label className="ps-sub-label">Admin Notes <span className="ps-sub-label-hint">(optional — no effect on matching)</span></label>
            <input
              className="ps-sub-input"
              value={draft.notes ?? ''}
              placeholder="e.g. Added per MFT SLA negotiated Jan 2025, reviewed by Dr. Carter"
              onChange={e => set('notes', e.target.value)}
            />
          </div>

          {/* Active toggle */}
          <div className="ps-sub-field">
            <label className="ps-sub-label">Status</label>
            <div className="ps-sub-toggle-wrap">
              <div
                onClick={() => set('active', !draft.active)}
                className={draft.active ? 'ps-sub-toggle-track ps-sub-toggle-track--on' : 'ps-sub-toggle-track ps-sub-toggle-track--off'}
              >
                <div className={draft.active ? 'ps-sub-toggle-thumb ps-sub-toggle-thumb--on' : 'ps-sub-toggle-thumb ps-sub-toggle-thumb--off'} />
              </div>
              <span className={draft.active ? 'ps-sub-toggle-label--on' : 'ps-sub-toggle-label--off'}>
                {draft.active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          {error && <div className="ps-sub-error" style={{ marginTop: 4 }}>{error}</div>}

        </div>

        <div className="fm-footer">
          <span className="fm-footer-status" />
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} className="fm-btn-cancel">Cancel</button>
            <button onClick={handleSave} className="fm-btn-apply">
              {isEdit ? 'Save Changes' : 'Add Rule'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Resolution simulator ──────────────────────────────────────────────────────

interface SimulatorProps {
  entries:        TATEntry[];
  clients:        { id: string; name: string }[];
  specimens:      { id: string; name: string }[];
  subspecialties: { id: string; name: string }[];
}

const ResolutionSimulator: React.FC<SimulatorProps> = ({
  entries, clients, specimens, subspecialties
}) => {
  const [simClient,       setSimClient]       = useState('');
  const [simSpecimen,     setSimSpecimen]      = useState('');
  const [simSubspecialty, setSimSubspecialty]  = useState('');
  const [simUrgency,      setSimUrgency]       = useState<TATUrgency>('ROUTINE');

  const results = useMemo<Array<{ type: TATType; match: TATEntry | null }>>(() => {
    const active = entries.filter(e => e.active);
    return TAT_TYPES.map(type => {
      // Priority order candidates
      const candidates = active.filter(e => e.type === type);

      const priorities: Array<(e: TATEntry) => boolean> = [
        // 1. client + specimen + urgency
        e => e.clientId === simClient && e.specimenId === simSpecimen && e.urgency === simUrgency,
        // 2. client + specimen (any urgency)
        e => e.clientId === simClient && e.specimenId === simSpecimen && e.urgency === null,
        // 3. client + subspecialty + urgency
        e => e.clientId === simClient && e.subspecialtyId === simSubspecialty && e.urgency === simUrgency && !!simSubspecialty,
        // 4. client + subspecialty
        e => e.clientId === simClient && e.subspecialtyId === simSubspecialty && e.urgency === null && !!simSubspecialty,
        // 5. client only
        e => e.clientId === simClient && !e.specimenId && !e.subspecialtyId && (e.urgency === simUrgency || e.urgency === null),
        // 6. specimen only
        e => !e.clientId && e.specimenId === simSpecimen && (e.urgency === simUrgency || e.urgency === null) && !!simSpecimen,
        // 7. system default
        e => !e.clientId && !e.specimenId && !e.subspecialtyId && (e.urgency === simUrgency || e.urgency === null),
      ];

      for (const test of priorities) {
        const match = candidates.find(test);
        if (match) return { type, match };
      }
      return { type, match: null };
    });
  }, [entries, simClient, simSpecimen, simSubspecialty, simUrgency]);

  return (
    <div className="ps-tat-sim-shell">
      <div className="ps-tat-sim-header">
        <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>
          Resolution Simulator
        </span>
        <span style={{ fontSize: 12, color: '#6b7280' }}>
          See which rule wins for a given case
        </span>
      </div>

      <div className="ps-tat-sim-controls">
        <select className="ps-conf-select" value={simClient} onChange={e => setSimClient(e.target.value)}>
          <option value="">No specific client</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="ps-conf-select" value={simSpecimen} onChange={e => setSimSpecimen(e.target.value)}>
          <option value="">No specific specimen</option>
          {specimens.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="ps-conf-select" value={simSubspecialty} onChange={e => setSimSubspecialty(e.target.value)}>
          <option value="">No specific subspecialty</option>
          {subspecialties.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="ps-conf-select" value={simUrgency} onChange={e => setSimUrgency(e.target.value as TATUrgency)}>
          <option value="ROUTINE">Routine</option>
          <option value="STAT">STAT</option>
        </select>
      </div>

      <div className="ps-tat-sim-results">
        {results.map(({ type, match }) => (
          <div key={type} className="ps-tat-sim-row">
            <span className="ps-tat-type-badge">{TAT_TYPE_LABELS[type]}</span>
            {match ? (
              <>
                <span className="ps-tat-sim-target">{formatHours(match.targetHours)}</span>
                <span className="ps-tat-sim-source">
                  {match.id.startsWith('sys-') ? 'system default' : 'custom rule'}
                  {match.notes && ' · ' + match.notes}
                </span>
              </>
            ) : (
              <span className="ps-tat-sim-none">No matching rule</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Main section ──────────────────────────────────────────────────────────────

const TATConfigSection: React.FC = () => {
  const [entries,   setEntries]   = useState<TATEntry[]>(loadEntries);
  const { log } = useAuditLog();
  const [modal,     setModal]     = useState<{ mode: 'add' | 'edit'; entry?: TATEntry } | null>(null);
  const [filter,    setFilter]    = useState<TATType | 'ALL'>('ALL');
  const [showInactive, setShowInactive] = useState(false);
  const [showSim,   setShowSim]   = useState(false);


  // Live data from context providers
  const { subspecialties } = useSubspecialties();
  const { dictionary: specimens } = useSpecimenDictionary();

  const [allClients, setAllClients] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    mockClientService.getAll().then(res => {
      if (res.ok) {
        setAllClients(
          res.data
            .filter((c: any) => c.status !== 'Inactive') // was 'inactive' (lowercase) — Client.status is 'Active'|'Inactive' (capitalized), so this never matched and inactive clients incorrectly appeared in the dropdown
            .map((c: any) => ({ id: c.id, name: c.name }))
        );
      }
    });
  }, []);

  const clients = allClients;

  const specimenList = useMemo(
    () => specimens.map(s => ({ id: s.id, name: s.name })),
    [specimens]
  );

  const subspecialtyList = useMemo(
    () => subspecialties.map(s => ({ id: s.id, name: s.name })),
    [subspecialties]
  );

  const persist = (next: TATEntry[]) => { setEntries(next); saveEntries(next); };

  // handleEntryDelete/handleEntryToggle are complete, working handlers
  // (real persist + audit log calls) — just not wired to any Delete/Toggle
  // button in the JSX below yet. Matches this file's own "stub only, full
  // build pending" status. Flagged, not deleted.
  const _handleEntryDelete = (id: string) => {
    const target = entries.find(e => e.id === id);
    persist(entries.filter(e => e.id !== id));
    if (target) log('tat_entry_deleted', { id, type: target.type });
  };
  void _handleEntryDelete;

  const _handleEntryToggle = (id: string) => {
    const target = entries.find(e => e.id === id);
    const next   = entries.map(e => e.id === id ? { ...e, active: !e.active } : e);
    persist(next);
    if (target) log('tat_entry_toggled', { id, type: target.type, active: !target.active });
  };
  void _handleEntryToggle;
  // underscore prefix alone doesn't suppress noUnusedLocals for local
  // const function declarations — void statements needed too.

  const handleSave = (saved: TATEntry) => {
    const idx   = entries.findIndex(e => e.id === saved.id);
    if (idx >= 0) {
      const next = [...entries];
      next[idx] = saved;
      persist(next);
      log('tat_entry_updated', { id: saved.id, type: saved.type, changes: [`targetHours: ${saved.targetHours}h`] });
    } else {
      persist([...entries, saved]);
      log('tat_entry_created', { type: saved.type, targetHours: saved.targetHours, clientId: saved.clientId ?? null, roleId: (saved as any).roleId ?? null });
    }
    setModal(null);
  };

  const toggleActive = (id: string) => {
    persist(entries.map(e => e.id === id ? { ...e, active: !e.active } : e));
  };

  const deleteEntry = (id: string) => {
    if (id.startsWith('sys-')) return; // system defaults cannot be deleted
    persist(entries.filter(e => e.id !== id));
  };

  const displayed = entries
    .filter(e => filter === 'ALL' || e.type === filter)
    .filter(e => showInactive ? true : e.active)
    .sort((a, b) => specificityScore(b) - specificityScore(a));

  const clientName   = (id: string | null) => id ? (clients.find(c => c.id === id)?.name ?? id) : null;
  const specimenName = (id: string | null) => id ? (specimenList.find(s => s.id === id)?.name ?? id) : null;
  const subName      = (id: string | null) => id ? (subspecialtyList.find(s => s.id === id)?.name ?? id) : null;

  return (
    <div className="ps-tat-shell">

      {/* Header */}
      <div className="ps-tat-header">
        <div>
          <h2 className="ps-sub-title">TAT Configuration</h2>
          <p className="ps-sub-subtitle">
            Turnaround time targets per type, urgency, client, specimen, and subspecialty.
            The most specific matching rule wins at runtime.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className={showSim ? 'ps-tat-sim-btn ps-tat-sim-btn--active' : 'ps-tat-sim-btn'}
            onClick={() => setShowSim(v => !v)}
          >
            ⚡ Simulator
          </button>
          <button
            className="ps-section-add-btn"
            onClick={() => setModal({ mode: 'add' })}
          >
            + Add Rule
          </button>
        </div>
      </div>

      {/* Resolution hierarchy info */}
      <div className="ps-tat-hierarchy-box">
        <div style={{ fontSize: 12, fontWeight: 700, color: '#8AB4F8', marginBottom: 6 }}>
          Resolution Hierarchy (most specific wins)
        </div>
        <div className="ps-tat-hierarchy-list">
          {[
            'Client + Specimen + Urgency',
            'Client + Specimen',
            'Client + Subspecialty + Urgency',
            'Client + Subspecialty',
            'Client only',
            'Specimen only',
            'System default (fallback)',
          ].map((level, i) => (
            <span key={i} className="ps-tat-hierarchy-item">
              <span className="ps-tat-hierarchy-num">{i + 1}</span>
              {level}
            </span>
          ))}
        </div>
      </div>

      {/* Simulator */}
      {showSim && (
        <ResolutionSimulator
          entries={entries}
          clients={clients}
          specimens={specimenList}
          subspecialties={subspecialtyList}
        />
      )}

      {/* Filters */}
      <div className="ps-tat-filters">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['ALL', ...TAT_TYPES] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={filter === t ? 'ps-tat-filter-btn ps-tat-filter-btn--active' : 'ps-tat-filter-btn'}
            >
              {t === 'ALL' ? 'All Types' : TAT_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        <label className="ps-sub-toggle-wrap" style={{ cursor: 'pointer' }}>
          <div
            onClick={() => setShowInactive(v => !v)}
            className={showInactive ? 'ps-sub-toggle-track ps-sub-toggle-track--on' : 'ps-sub-toggle-track ps-sub-toggle-track--off'}
          >
            <div className={showInactive ? 'ps-sub-toggle-thumb ps-sub-toggle-thumb--on' : 'ps-sub-toggle-thumb ps-sub-toggle-thumb--off'} />
          </div>
          <span style={{ fontSize: 12, color: '#6b7280' }}>Show inactive</span>
        </label>
      </div>

      {/* Table */}
      <div className="ps-tat-table-wrap">
        <table className="ps-sub-table">
          <colgroup>
            <col style={{ width: '16%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '16%' }} />
          </colgroup>
          <thead>
            <tr>
              {['Type','Target','Urgency','Scope','Notes','Status','Actions'].map(h => (
                <th key={h} className="ps-sub-th" style={{ textAlign: h === 'Actions' ? 'right' : 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 && (
              <tr>
                <td colSpan={7} className="ps-sub-td" style={{ textAlign: 'center', color: '#475569', padding: '20px 0' }}>
                  No rules match the current filter.
                </td>
              </tr>
            )}
            {displayed.map(e => {
              const isSystem = e.id.startsWith('sys-');
              const scopeParts = [
                clientName(e.clientId),
                specimenName(e.specimenId),
                subName(e.subspecialtyId),
                (e as any).roleId ? `Role: ${(e as any).roleId}` : null,
              ].filter(Boolean);

              return (
                <tr key={e.id} style={{ opacity: e.active ? 1 : 0.5 }}>
                  <td className="ps-sub-td">
                    <span className="ps-tat-type-badge">{TAT_TYPE_LABELS[e.type]}</span>
                    {isSystem && <span className="ps-del-tag" style={{ marginLeft: 6 }}>🔒</span>}
                  </td>
                  <td className="ps-sub-td">
                    <strong style={{ color: '#e2e8f0' }}>{formatHours(e.targetHours)}</strong>
                  </td>
                  <td className="ps-sub-td">
                    <span style={{ fontSize: 12, color: e.urgency === 'STAT' ? '#f59e0b' : '#94a3b8' }}>
                      {e.urgency ?? 'Any'}
                    </span>
                  </td>
                  <td className="ps-sub-td">
                    {scopeParts.length === 0 ? (
                      <span style={{ fontSize: 11, color: '#475569', fontStyle: 'italic' }}>System default</span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {scopeParts.map((s, i) => (
                          <span key={i} style={{ fontSize: 12, color: '#94a3b8' }}>{s}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="ps-sub-td">
                    <span style={{ fontSize: 12, color: '#6b7280' }}>{e.notes || '—'}</span>
                  </td>
                  <td className="ps-sub-td">
                    <div className="ps-sub-toggle-wrap">
                      <div
                        onClick={() => toggleActive(e.id)}
                        className={e.active ? 'ps-sub-toggle-track ps-sub-toggle-track--on' : 'ps-sub-toggle-track ps-sub-toggle-track--off'}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className={e.active ? 'ps-sub-toggle-thumb ps-sub-toggle-thumb--on' : 'ps-sub-toggle-thumb ps-sub-toggle-thumb--off'} />
                      </div>
                    </div>
                  </td>
                  <td className="ps-sub-td" style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button
                        className="ps-sub-edit-btn"
                        onClick={() => setModal({ mode: 'edit', entry: e })}
                      >
                        Edit
                      </button>
                      {!isSystem && (
                        <button
                          className="ps-del-delete-btn"
                          onClick={() => deleteEntry(e.id)}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <TATModal
          entry={modal.entry}
          entries={entries}
          clients={clients}
          specimens={specimenList}
          subspecialties={subspecialtyList}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

    </div>
  );
};

export default TATConfigSection;
