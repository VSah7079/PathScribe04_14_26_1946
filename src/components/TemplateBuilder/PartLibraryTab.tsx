// src/components/TemplateBuilder/PartLibraryTab.tsx
// Config tab — browse, create, edit and duplicate Report Parts.
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ReportPart, ReportPartType } from '../../types/reportPart';
import { mockReportPartService, onReportPartsChanged } from '../../services/reportParts/mockReportPartService';

const svc = mockReportPartService;

const TYPE_CONFIG: Record<ReportPartType, { label: string; icon: string; color: string; bg: string }> = {
  header: { label: 'Header', icon: '▲', color: '#1e40af', bg: '#eff6ff' },
  footer: { label: 'Footer', icon: '▼', color: '#7c3aed', bg: '#faf5ff' },
  body:   { label: 'Body',   icon: '▬', color: '#166534', bg: '#f0fdf4' },
};

const PartCard: React.FC<{
  part: ReportPart;
  onEdit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  isProtected: boolean;
  isDuplicating: boolean;
}> = ({ part, onEdit, onDuplicate, onArchive, isProtected, isDuplicating }) => {
  const [hovered, setHovered] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const tc = TYPE_CONFIG[part.partType];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirmArchive(false); }}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
        borderRadius: 10, border: `1px solid ${hovered ? '#e2e8f0' : '#f1f5f9'}`,
        background: hovered ? '#f8fafc' : '#fff', transition: 'all 0.1s',
        marginBottom: 6,
      }}
    >
      {/* Type icon */}
      <div style={{ width: 36, height: 36, borderRadius: 9, background: tc.bg, color: tc.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
        {tc.icon}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {part.name}
          </span>
          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
            background: part.status === 'published' ? '#f0fdf4' : '#fefce8',
            color: part.status === 'published' ? '#166534' : '#854d0e', textTransform: 'capitalize' }}>
            {part.status}
          </span>
          {isProtected && (
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
              background: '#eff6ff', color: '#1e40af' }}>
              BUILT-IN
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: '#64748b' }}>
          {tc.label} · {part.specialty}{part.subspecialty ? ` — ${part.subspecialty}` : ''}
          {part.description && ` · ${part.description}`}
        </div>
      </div>

      {/* Actions */}
      {hovered && (
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
          {!isProtected && (
            <button onClick={onEdit} style={btn('#0891b2')}>Edit</button>
          )}
          <button onClick={onDuplicate} disabled={isDuplicating} style={btn('#475569')}>
            {isDuplicating ? 'Duplicating…' : 'Duplicate'}
          </button>
          {!isProtected && (
            confirmArchive ? (
              <>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>Archive?</span>
                <button onClick={onArchive} style={btn('#ef4444')}>Yes</button>
                <button onClick={() => setConfirmArchive(false)} style={btn('#e2e8f0', '#475569')}>No</button>
              </>
            ) : (
              <button onClick={() => setConfirmArchive(true)} style={btn('#e2e8f0', '#475569')}>Archive</button>
            )
          )}
        </div>
      )}
    </div>
  );
};

const PROTECTED = new Set([
  'std_header_page1','std_header_p2plus','std_footer_page1','std_footer_p2plus',
  'std_body_demographics','std_body_clinical','std_body_specimens','std_body_diagnosis',
  'std_body_synoptic','std_body_gross','std_body_microscopic','std_body_ancillary',
  'std_body_comment','std_body_signoff',
]);

const PartLibraryTab: React.FC = () => {
  const navigate = useNavigate();
  const [parts, setParts]         = useState<ReportPart[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<ReportPartType | 'all'>('all');
  const [search, setSearch]       = useState('');
  const [duplicating, setDuplicating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await svc.getAll();
    if (r.ok) setParts(r.data.filter((p: any) => p.status !== 'archived'));
    else setError(r.error);
    setLoading(false);
  }, []);

  useEffect(() => { load(); return onReportPartsChanged(load); }, [load]);

  const handleDuplicate = async (id: string) => {
    setDuplicating(id);
    const r = await svc.clone(id);
    if (r.ok) navigate(`/admin/parts/${r.data.id}/edit`);
    else setError(r.error);
    setDuplicating(null);
  };

  const handleArchive = async (id: string) => {
    const r = await svc.archive(id);
    if (!r.ok) setError(r.error);
  };

  const filtered = parts
    .filter(p => typeFilter === 'all' || p.partType === typeFilter)
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()));

  const grouped: Record<ReportPartType, ReportPart[]> = {
    header: filtered.filter(p => p.partType === 'header'),
    body:   filtered.filter(p => p.partType === 'body'),
    footer: filtered.filter(p => p.partType === 'footer'),
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Part Library</h2>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: '3px 0 0' }}>
            Reusable report parts — headers, footers and body sections assembled into templates
          </p>
        </div>
        <button onClick={() => navigate('/admin/parts/new')}
          style={{ background: '#0891b2', border: 'none', color: '#fff', borderRadius: 7,
            padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          + New Part
        </button>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 6, fontSize: 12, color: '#fca5a5', display: 'flex', justifyContent: 'space-between' }}>
          {error}
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 2, background: '#0d1117', borderRadius: 7, padding: 3, border: '1px solid #1e293b' }}>
          {(['all', 'header', 'body', 'footer'] as const).map(f => (
            <button key={f} onClick={() => setTypeFilter(f)} style={{
              background: typeFilter === f ? '#1e293b' : 'transparent', border: 'none',
              borderRadius: 5, color: typeFilter === f ? '#f1f5f9' : '#475569',
              fontSize: 11, fontWeight: typeFilter === f ? 600 : 400,
              padding: '4px 12px', cursor: 'pointer', textTransform: 'capitalize',
            }}>
              {f === 'all' ? 'All' : `${TYPE_CONFIG[f].icon} ${TYPE_CONFIG[f].label}s`}
            </button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search parts…"
          style={{ flex: 1, maxWidth: 280, background: '#0d1117', border: '1px solid #1e293b',
            borderRadius: 6, color: '#f1f5f9', fontSize: 12, padding: '6px 10px', outline: 'none' }}
        />
      </div>

      {loading ? (
        <div style={{ padding: 32, textAlign: 'center', fontSize: 13, color: '#94a3b8' }}>Loading parts…</div>
      ) : (
        (['header', 'body', 'footer'] as ReportPartType[]).map(type => {
          const group = grouped[type];
          if (typeFilter !== 'all' && typeFilter !== type) return null;
          const tc = TYPE_CONFIG[type];
          return (
            <div key={type}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
                paddingBottom: 8, borderBottom: `2px solid ${tc.bg}` }}>
                <span style={{ fontSize: 16, color: tc.color }}>{tc.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: tc.color }}>{tc.label}s</span>
                <span style={{ fontSize: 10, color: '#94a3b8', background: '#1e293b',
                  padding: '1px 8px', borderRadius: 10 }}>{group.length}</span>
              </div>
              {group.length === 0
                ? <div style={{ fontSize: 12, color: '#475569', fontStyle: 'italic', padding: '8px 0' }}>
                    No {tc.label.toLowerCase()} parts yet
                  </div>
                : group.map(p => (
                  <PartCard
                    key={p.id} part={p}
                    isProtected={PROTECTED.has(p.id)}
                    isDuplicating={duplicating === p.id}
                    onEdit={() => navigate(`/admin/parts/${p.id}/edit`)}
                    onDuplicate={() => handleDuplicate(p.id)}
                    onArchive={() => handleArchive(p.id)}
                  />
                ))
              }
            </div>
          );
        })
      )}
    </div>
  );
};

export default PartLibraryTab;

function btn(bg: string, color = '#fff'): React.CSSProperties {
  return { background: bg, border: 'none', borderRadius: 5, color, cursor: 'pointer', fontSize: 11, fontWeight: 600, padding: '4px 10px', whiteSpace: 'nowrap' };
}
