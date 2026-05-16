// src/components/TemplateBuilder/TemplateAssemblyPage.tsx
// ─────────────────────────────────────────────────────────────
// Report Template Assembly Page.
//
// The pathologist's view of a report template:
//   "What parts does this report contain, in what order?"
//
// Each row = one AssemblySlot:
//   [role badge]  [part name]  [specialty]  [status]  [⊗ remove]
//
// Drag rows to reorder body parts.
// Click "+ Add slot" to pick a part from the library.
// ─────────────────────────────────────────────────────────────
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { ReportTemplate, AssemblySlot, AssemblyRole, ReportPart } from '../../types/reportPart';
import {
  ASSEMBLY_ROLE_LABELS, ASSEMBLY_ROLE_ICONS, ROLE_DISPLAY_ORDER,
  VALID_ROLES_FOR_PART, validateAssembly,
} from '../../types/reportPart';
import { mockReportTemplateService } from '../../services/reportTemplates/mockReportTemplateService';
import { TemplatePreviewPanel } from './TemplatePreviewPanel';
import type { ReportTemplate as OldTemplate } from '../../types/template';
import { mockReportPartService } from '../../services/reportParts/mockReportPartService';

const svc  = mockReportTemplateService;
const pSvc = mockReportPartService;

// ── Page zone definitions (driven by ROLE_DISPLAY_ORDER) ───────
const PAGE1_ROLES    = ROLE_DISPLAY_ORDER.filter(r => r === 'body' || r.endsWith('-p1'));
const PAGE2PLUS_ROLES = ROLE_DISPLAY_ORDER.filter(r => r.endsWith('-p2plus'));

// ── Role badge ─────────────────────────────────────────────────

const ROLE_COLORS: Record<AssemblyRole, { bg: string; color: string; border: string }> = {
  'header-p1':     { bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' },
  'header-p2plus': { bg: '#eef2ff', color: '#3730a3', border: '#c7d2fe' },
  'body':          { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
  'footer-p2plus': { bg: '#fdf4ff', color: '#6b21a8', border: '#e9d5ff' },
  'footer-p1':     { bg: '#faf5ff', color: '#7c3aed', border: '#ddd6fe' },
};

const RoleBadge: React.FC<{ role: AssemblyRole }> = ({ role }) => {
  const c = ROLE_COLORS[role];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 700,
      background: c.bg, color: c.color,
      border: `1px solid ${c.border}`,
      whiteSpace: 'nowrap',
    }}>
      <span>{ASSEMBLY_ROLE_ICONS[role]}</span>
      {ASSEMBLY_ROLE_LABELS[role]}
    </span>
  );
};

// ── Part type badge ────────────────────────────────────────────

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  header: { bg: '#eff6ff', color: '#1e40af' },
  footer: { bg: '#faf5ff', color: '#7c3aed' },
  body:   { bg: '#f0fdf4', color: '#166534' },
};

// ── Part picker modal ──────────────────────────────────────────


// ── StatusBadge ────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { bg: string; color: string }> = {
    published: { bg: 'rgba(14,159,110,0.15)', color: '#0e9f6e' },
    draft:     { bg: 'rgba(234,179,8,0.15)',  color: '#eab308' },
    archived:  { bg: 'rgba(100,116,139,0.15)',color: '#64748b' },
  };
  const c = map[status] ?? map.draft;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
      background: c.bg, color: c.color, textTransform: 'capitalize' }}>
      {status}
    </span>
  );
};


const PartPicker: React.FC<{
  role: AssemblyRole;
  onPick: (part: ReportPart) => void;
  onClose: () => void;
}> = ({ role, onPick, onClose }) => {
  const validTypes = Object.entries(VALID_ROLES_FOR_PART)
    .filter(([, roles]) => roles.includes(role))
    .map(([t]) => t);

  const [parts, setParts] = useState<ReportPart[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pSvc.getAll({ partType: validTypes[0] as any }).then(r => {
      if (r.ok) setParts(r.data);
      setLoading(false);
    });
  }, []);

  const filtered = parts.filter(p =>
    p.status === 'published' &&
    (!search || p.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        width: 560, maxHeight: '70vh', background: '#fff', borderRadius: 12,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
            Select a Part
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
            Adding to slot: <RoleBadge role={role} />
          </div>
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search parts…"
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '8px 12px', borderRadius: 7,
              border: '1.5px solid #e2e8f0', fontSize: 13, outline: 'none',
              color: '#0f172a',
            }}
          />
        </div>
        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          {loading && <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>Loading…</div>}
          {!loading && filtered.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>No published parts found</div>
          )}
          {filtered.map(part => {
            const tc = TYPE_COLORS[part.partType];
            return (
              <div
                key={part.id}
                onClick={() => onPick(part)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '12px 12px', borderRadius: 8, cursor: 'pointer',
                  border: '1px solid transparent', marginBottom: 4,
                  transition: 'all 0.1s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'transparent';
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                  background: tc.bg, color: tc.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700,
                }}>
                  {part.partType === 'header' ? '▲' : part.partType === 'footer' ? '▼' : '▬'}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 2 }}>
                    {part.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>
                    {part.description ?? `${part.specialty} · ${part.partType}`}
                  </div>
                </div>
                <div style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                  background: '#f0fdf4', color: '#166534', flexShrink: 0, alignSelf: 'center',
                }}>
                  {part.status}
                </div>
              </div>
            );
          })}
        </div>
        {/* Footer */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '7px 16px', borderRadius: 7, border: '1px solid #e2e8f0',
            background: '#f8fafc', color: '#475569', cursor: 'pointer', fontSize: 12, fontWeight: 600,
          }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Slot row ───────────────────────────────────────────────────

const SlotRow: React.FC<{
  slot: AssemblySlot;
  dragging: boolean;
  onDragStart: () => void;
  onRemove: () => void;
  onToggle: () => void;
  onEdit: () => void;
}> = ({ slot, dragging, onDragStart, onRemove, onToggle, onEdit }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      draggable={slot.role === 'body'}
      onDragStart={onDragStart}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px',
        background: hovered ? '#f8fafc' : '#fff',
        border: '1px solid',
        borderColor: hovered ? '#e2e8f0' : '#f1f5f9',
        borderRadius: 10,
        opacity: slot.enabled ? 1 : 0.45,
        transition: 'all 0.1s',
        cursor: slot.role === 'body' ? 'grab' : 'default',
        marginBottom: 4,
        boxShadow: dragging ? '0 4px 12px rgba(0,0,0,0.12)' : '0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      {/* Drag handle — body only */}
      <div style={{ color: '#cbd5e1', fontSize: 14, flexShrink: 0, cursor: slot.role === 'body' ? 'grab' : 'default' }}>
        {slot.role === 'body' ? '⠿' : '⠀'}
      </div>

      {/* Role badge */}
      <RoleBadge role={slot.role} />

      {/* Part name + description */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {slot.partName}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
        {/* Enable/disable */}
        <button onClick={onToggle} title={slot.enabled ? 'Disable slot' : 'Enable slot'} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px',
          borderRadius: 5, fontSize: 14,
          color: slot.enabled ? '#22c55e' : '#cbd5e1',
        }}>
          {slot.enabled ? '●' : '○'}
        </button>
        {/* Edit part */}
        <button onClick={onEdit} title="Edit this part" style={{
          background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8',
          borderRadius: 5, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
        }}>
          Edit part
        </button>
        {/* Remove */}
        <button onClick={onRemove} title="Remove from template" style={{
          background: 'none', border: '1px solid transparent', color: '#fca5a5',
          borderRadius: 5, padding: '4px 8px', fontSize: 12, cursor: 'pointer',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#fecaca'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'transparent'; }}
        >
          ✕
        </button>
      </div>
    </div>
  );
};

// ── Add slot button ────────────────────────────────────────────

const AddSlotRow: React.FC<{ role: AssemblyRole; onAdd: () => void }> = ({ role, onAdd }) => (
  <button onClick={onAdd} style={{
    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 16px', borderRadius: 8, marginBottom: 4,
    border: '1.5px dashed #e2e8f0', background: 'transparent',
    cursor: 'pointer', transition: 'all 0.1s',
  }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = '#0891b2'; e.currentTarget.style.background = '#f0f9ff'; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = 'transparent'; }}
  >
    <span style={{ fontSize: 16, color: '#0891b2' }}>+</span>
    <span style={{ fontSize: 12, fontWeight: 600, color: '#0891b2' }}>
      Add {ASSEMBLY_ROLE_LABELS[role]}
    </span>
  </button>
);

// ── Main page ──────────────────────────────────────────────────

export const TemplateAssemblyPage: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();

  const [template, setTemplate] = useState<ReportTemplate | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [picker, setPicker]     = useState<AssemblyRole | null>(null);
  const [draggingSlotId, setDraggingSlotId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [resolvedParts, setResolvedParts] = useState<ReportPart[]>([]);

  // Load
  useEffect(() => {
    if (!templateId) return;
    svc.getById(templateId).then(r => {
      if (r.ok) setTemplate(r.data);
      else setError(r.error);
      setLoading(false);
    });
  }, [templateId]);

  const save = useCallback(async (updated: ReportTemplate) => {
    setSaving(true);
    const r = await svc.save(updated);
    if (r.ok) setTemplate(r.data);
    else setError(r.error);
    setSaving(false);
  }, []);

  const updateAssembly = useCallback((assembly: AssemblySlot[]) => {
    if (!template) return;
    const updated = { ...template, assembly };
    setTemplate(updated);
    save(updated);
  }, [template, save]);

  // Slot operations
  const addSlot = useCallback((role: AssemblyRole, part: ReportPart) => {
    if (!template) return;
    const bodyOrder = template.assembly.filter(s => s.role === 'body').length;
    const newSlot: AssemblySlot = {
      slotId: crypto.randomUUID(),
      partId: part.id, partName: part.name, partType: part.partType,
      role, enabled: true,
      order: role === 'body' ? bodyOrder : 0,
    };
    updateAssembly([...template.assembly, newSlot]);
    setPicker(null);
  }, [template, updateAssembly]);

  const removeSlot = useCallback((slotId: string) => {
    if (!template) return;
    updateAssembly(template.assembly.filter(s => s.slotId !== slotId));
  }, [template, updateAssembly]);

  const toggleSlot = useCallback((slotId: string) => {
    if (!template) return;
    updateAssembly(template.assembly.map(s => s.slotId === slotId ? { ...s, enabled: !s.enabled } : s));
  }, [template, updateAssembly]);

  // Validation — computed once per render, displayed as warnings below error banner
  const validation = template ? validateAssembly(template) : null;

  if (loading) return <div style={S.loading}>Loading template…</div>;
  if (!template) return <div style={S.loading}>Template not found.</div>;

  // Group slots by role display order
  const slotsByRole = (role: AssemblyRole) =>
    template.assembly
      .filter(s => s.role === role)
      .sort((a, b) => a.order - b.order);

  const bodySlots = slotsByRole('body');

  // ── Reorder body via dataTransfer (reliable) ─────────────────
  const handleBodyDragStart = (e: React.DragEvent, slotId: string) => {
    e.dataTransfer.setData('text/plain', slotId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingSlotId(slotId);
  };

  const handleBodyDrop = (e: React.DragEvent, targetSlotId: string) => {
    e.preventDefault();
    const fromId = e.dataTransfer.getData('text/plain');
    if (!fromId || fromId === targetSlotId || !template) return;
    const bodySlots = template.assembly.filter(s => s.role === 'body');
    const others    = template.assembly.filter(s => s.role !== 'body');
    const fromIdx   = bodySlots.findIndex(s => s.slotId === fromId);
    const toIdx     = bodySlots.findIndex(s => s.slotId === targetSlotId);
    if (fromIdx < 0 || toIdx < 0) return;
    const reordered = [...bodySlots];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    updateAssembly([...others, ...reordered.map((s, i) => ({ ...s, order: i }))]);
    setDraggingSlotId(null);
  };

  return (
    <div style={S.root}>

      {/* ── Topbar ── */}
      <header style={S.topbar}>
        <div style={S.topLeft}>
          <button onClick={() => navigate(-1)} style={S.backBtn}>←</button>
          <div>
            <input value={template.name}
              onChange={e => setTemplate({ ...template, name: e.target.value })}
              onBlur={() => save(template)}
              style={S.nameInput} />
            <div style={S.nameSub}>{template.specialty || 'General'} · {template.standard ?? 'Custom'}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>{saving ? '⟳ Saving…' : '✓ Saved'}</span>
          <StatusBadge status={template.status} />
          <button onClick={async () => {
            if (!template) return;
            const slotsInOrder = template.assembly.filter(s => s.enabled);
            const partResults = await Promise.all(slotsInOrder.map(s => mockReportPartService.getById(s.partId)));
            setResolvedParts(partResults.filter(r => r.ok).map(r => (r as { ok: true; data: ReportPart }).data));
            setPreviewOpen(true);
          }} style={{ ...S.btn, background: '#0f766e', color: '#fff', border: 'none' }}>
            Preview
          </button>
          <button onClick={async () => { const r = await svc.publish(template.id); if (r.ok) setTemplate(r.data); }}
            disabled={template.status === 'published'}
            style={{ ...S.btn, background: '#0891b2', color: '#fff', border: 'none', opacity: template.status === 'published' ? 0.5 : 1 }}>
            {template.status === 'published' ? 'Published' : 'Publish'}
          </button>
        </div>
      </header>

      {/* ── Two-page layout ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px', background: '#e2e8f0' }}>

        {/* Service errors */}
        {error && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fef2f2',
            border: '1px solid #fecaca', borderRadius: 6, fontSize: 12, color: '#dc2626' }}>
            {error}
          </div>
        )}

        {/* Assembly validation warnings */}
        {validation && !(validation as any).valid && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: '#fffbeb',
            border: '1px solid #fde68a', borderRadius: 6, fontSize: 12, color: '#92400e' }}>
            <strong>Assembly issues:</strong>
            <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
              {((validation as any).errors ?? []).map((msg: string, i: number) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Description */}
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
            {template.name}
          </div>
          <div style={{ fontSize: 13, color: '#64748b' }}>
            Drag body parts to reorder · Click a zone to assign or change a part · Toggle ● to enable/disable
          </div>
        </div>

        {/* Two-column page layout — zones driven by PAGE1_ROLES / PAGE2PLUS_ROLES */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 1200, margin: '0 auto' }}>

          {/* ── Page 1 ── */}
          <div>
            <div style={S.pageLabel}>Page 1</div>
            <div style={S.pageCard}>
              {PAGE1_ROLES.map(role => {
                if (role === 'body') return (
                  <React.Fragment key="body">
                    <div style={{ ...S.zoneHeader, marginTop: 8 }}>
                      <span style={S.zoneIcon}>▬</span>
                      <span style={S.zoneTitle}>Body</span>
                      <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94a3b8' }}>
                        {bodySlots.filter(s => s.enabled).length} active · drag to reorder
                      </span>
                    </div>
                    {bodySlots.length === 0 && (
                      <div style={{ padding: '20px', textAlign: 'center', fontSize: 13,
                        color: '#94a3b8', fontStyle: 'italic', borderBottom: '1px solid #f1f5f9' }}>
                        No body parts added yet
                      </div>
                    )}
                    {bodySlots.map((slot, i) => (
                      <div key={slot.slotId} draggable
                        onDragStart={e => handleBodyDragStart(e, slot.slotId)}
                        onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={e => handleBodyDrop(e, slot.slotId)}
                        onDragEnd={() => setDraggingSlotId(null)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 14px', borderBottom: '1px solid #f1f5f9',
                          background: draggingSlotId === slot.slotId ? '#f0f9ff' : '#fff',
                          opacity: draggingSlotId === slot.slotId ? 0.5 : 1,
                          transition: 'background 0.1s', cursor: 'grab',
                        }}
                      >
                        <span style={{ fontSize: 16, color: '#94a3b8', cursor: 'grab', flexShrink: 0 }}>⠿</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', minWidth: 20, textAlign: 'center' }}>{i + 1}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: '#dcfce7', color: '#166534', flexShrink: 0 }}>Body</span>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: slot.enabled ? '#0f172a' : '#94a3b8', textDecoration: slot.enabled ? 'none' : 'line-through', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{slot.partName}</span>
                        <button onClick={() => toggleSlot(slot.slotId)} title={slot.enabled ? 'Disable' : 'Enable'}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: slot.enabled ? '#0891b2' : '#cbd5e1', flexShrink: 0 }}>
                          {slot.enabled ? '●' : '○'}
                        </button>
                        <button onClick={() => navigate(`/admin/parts/${slot.partId}/edit`)}
                          style={{ fontSize: 11, fontWeight: 600, color: '#0891b2', background: 'none', border: '1px solid #bae6fd', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', flexShrink: 0 }}>
                          Edit part
                        </button>
                        <button onClick={() => removeSlot(slot.slotId)}
                          style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>
                          ✕
                        </button>
                      </div>
                    ))}
                    <AddSlotRow role="body" onAdd={() => setPicker('body')} />
                  </React.Fragment>
                );
                const icon = role.startsWith('header') ? '▲' : '▼';
                const label = role.startsWith('header') ? 'Header' : 'Footer';
                return (
                  <React.Fragment key={role}>
                    <div style={{ ...S.zoneHeader, ...(role !== PAGE1_ROLES[0] ? { marginTop: 8 } : {}) }}>
                      <span style={S.zoneIcon}>{icon}</span>
                      <span style={S.zoneTitle}>{label}</span>
                    </div>
                    {slotsByRole(role).map(slot => (
                      <SlotRow key={slot.slotId} slot={slot}
                        dragging={false} onDragStart={() => {}}
                        onEdit={() => navigate(`/admin/parts/${slot.partId}/edit`)}
                        onRemove={() => removeSlot(slot.slotId)}
                        onToggle={() => toggleSlot(slot.slotId)}
                      />
                    ))}
                    <AddSlotRow role={role} onAdd={() => setPicker(role)} />
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* ── Pages 2+ ── */}
          <div>
            <div style={S.pageLabel}>Pages 2+</div>
            <div style={S.pageCard}>
              {PAGE2PLUS_ROLES.map((role, i) => {
                const icon = role.startsWith('header') ? '▲' : '▼';
                const label = role.startsWith('header') ? 'Header' : 'Footer';
                return (
                  <React.Fragment key={role}>
                    <div style={{ ...S.zoneHeader, ...(i > 0 ? { marginTop: 8 } : {}) }}>
                      <span style={S.zoneIcon}>{icon}</span>
                      <span style={S.zoneTitle}>{label}</span>
                    </div>
                    {slotsByRole(role).map(slot => (
                      <SlotRow key={slot.slotId} slot={slot}
                        dragging={false} onDragStart={() => {}}
                        onEdit={() => navigate(`/admin/parts/${slot.partId}/edit`)}
                        onRemove={() => removeSlot(slot.slotId)}
                        onToggle={() => toggleSlot(slot.slotId)}
                      />
                    ))}
                    <AddSlotRow role={role} onAdd={() => setPicker(role)} />
                    {/* Body reference sits between header and footer on pages 2+ */}
                    {role.startsWith('header') && (
                      <>
                        <div style={{ ...S.zoneHeader, marginTop: 8 }}>
                          <span style={S.zoneIcon}>▬</span>
                          <span style={S.zoneTitle}>Body</span>
                          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94a3b8' }}>same as Page 1</span>
                        </div>
                        <div style={{ padding: '14px 16px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', color: '#94a3b8', fontSize: 12, fontStyle: 'italic' }}>
                          {bodySlots.length === 0 ? 'No body parts — add them in Page 1'
                            : `${bodySlots.length} part${bodySlots.length !== 1 ? 's' : ''} continue across all pages`}
                        </div>
                      </>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

        </div>{/* end two-column grid */}
      </div>{/* end scroll area */}

      {/* ── Part picker modal ── */}
      {picker && (
        <PartPicker role={picker} onPick={part => addSlot(picker, part)}
          onClose={() => setPicker(null)} />
      )}

      {/* ── Preview panel ── */}
      {previewOpen && template && (() => {
        const flatNodes = resolvedParts.flatMap(p => p.nodes);
        const syntheticTemplate: OldTemplate = {
          id: template.id, name: template.name, specialty: template.specialty,
          standard: template.standard, status: template.status,
          orchestrationEnabled: template.orchestrationEnabled,
          institutionId: template.institutionId, createdBy: template.createdBy,
          createdAt: template.createdAt, updatedAt: template.updatedAt,
          version: template.version, nodes: flatNodes,
        };
        return <TemplatePreviewPanel template={syntheticTemplate} onClose={() => setPreviewOpen(false)} />;
      })()}

    </div>
  );
};

// ── Styles ─────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  root:      { display: 'flex', flexDirection: 'column', height: '100vh',
               fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", overflow: 'hidden' },
  topbar:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between',
               padding: '0 24px', height: 56, background: '#0f172a',
               borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, gap: 16 },
  topLeft:   { display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  backBtn:   { background: 'none', border: '1px solid #334155', color: '#94a3b8',
               cursor: 'pointer', borderRadius: 7, width: 32, height: 32,
               display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 },
  nameInput: { background: 'transparent', border: 'none', color: '#f1f5f9',
               fontSize: 16, fontWeight: 700, outline: 'none', padding: '0 2px', maxWidth: 400 },
  nameSub:   { fontSize: 11, color: '#64748b' },
  btn:       { padding: '7px 16px', borderRadius: 7, cursor: 'pointer', fontSize: 13,
               fontWeight: 600, border: '1px solid #475569', background: '#1e293b', color: '#e2e8f0' },
  pageLabel: { fontSize: 11, fontWeight: 800, color: '#64748b', letterSpacing: '0.08em',
               textTransform: 'uppercase', marginBottom: 10, paddingLeft: 2 },
  pageCard:  { background: '#ffffff', borderRadius: 12,
               boxShadow: '0 2px 8px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
               overflow: 'hidden' },
  zoneHeader:{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
               background: '#f8fafc', borderBottom: '1px solid #f1f5f9',
               borderTop: '2px solid #e2e8f0' },
  zoneIcon:  { fontSize: 11, color: '#94a3b8', flexShrink: 0 },
  zoneTitle: { fontSize: 11, fontWeight: 800, color: '#64748b',
               letterSpacing: '0.06em', textTransform: 'uppercase' },
  loading:   { display: 'flex', alignItems: 'center', justifyContent: 'center',
               height: '100vh', fontSize: 14, color: '#94a3b8' },
};

export default TemplateAssemblyPage;
