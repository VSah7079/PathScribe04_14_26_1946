// src/components/TemplateBuilder/TemplateListTab.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ReportTemplate } from '../../types/reportPart';
import {
  mockReportTemplateService,
  onReportTemplatesChanged,
  STANDARD_TEMPLATE_ID,
} from '../../services/reportTemplates/mockReportTemplateService';

const svc = mockReportTemplateService;

// ── Status badge ───────────────────────────────────────────────

const StatusBadge: React.FC<{ status: ReportTemplate['status'] }> = ({ status }) => {
  const map: Record<ReportTemplate['status'], { bg: string; color: string }> = {
    published: { bg: 'rgba(14,159,110,0.15)',  color: '#0e9f6e' },
    draft:     { bg: 'rgba(234,179,8,0.15)',   color: '#eab308' },
    archived:  { bg: 'rgba(100,116,139,0.15)', color: '#64748b' },
  };
  const c = map[status] ?? map.draft;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
      background: c.bg, color: c.color, letterSpacing: '0.04em', textTransform: 'capitalize' }}>
      {status}
    </span>
  );
};

// ── Empty state ────────────────────────────────────────────────

const EmptyState: React.FC<{ onBlank: () => void; onStandard: () => void }> = ({ onBlank, onStandard }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '64px 20px', gap: 16 }}>
    <div style={{ fontSize: 40, opacity: 0.12 }}>⊞</div>
    <div style={{ fontSize: 15, fontWeight: 600, color: '#334155' }}>No report templates yet</div>
    <div style={{ fontSize: 13, color: '#475569', textAlign: 'center', maxWidth: 380 }}>
      Report templates define the structure, fields, and AI generation rules for Orchestration mode.
      Start from the standard surgical pathology layout or build from scratch.
    </div>
    <div style={{ display: 'flex', gap: 10 }}>
      <button onClick={onStandard} style={btn('#0891b2')}>Use Standard Template</button>
      <button onClick={onBlank}    style={btn('#334155')}>Start Blank</button>
    </div>
  </div>
);

// ── Template row ───────────────────────────────────────────────

const TemplateRow: React.FC<{
  template:      ReportTemplate;
  onEdit:        () => void;
  onDuplicate:   () => void;
  onDelete:      () => void;
  isDeleting:    boolean;
  isDuplicating: boolean;
}> = ({ template, onEdit, onDuplicate, onDelete, isDeleting, isDuplicating }) => {
  const [hovered, setHovered]           = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isStandard = template.id === STANDARD_TEMPLATE_ID;

  const nodeCount = countNodes(template);
  const updatedAt = new Date(template.updatedAt).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirmDelete(false); }}
      style={{
        display: 'flex', alignItems: 'center', padding: '14px 16px',
        borderRadius: 8, gap: 14, transition: 'all 0.1s',
        background: hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
        border: `1px solid ${hovered ? '#1e293b' : 'transparent'}`,
      }}
    >
      {/* Icon */}
      <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0,
        background: isStandard ? 'rgba(8,145,178,0.15)' : 'rgba(255,255,255,0.06)',
        color: isStandard ? '#0891b2' : '#475569',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
        ⊞
      </div>

      {/* Name + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {template.name}
          </span>
          <StatusBadge status={template.status} />
          {template.orchestrationEnabled && (
            <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
              background: 'rgba(14,159,110,0.15)', color: '#0e9f6e' }}>
              AI
            </span>
          )}
          {isStandard && (
            <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
              background: 'rgba(8,145,178,0.12)', color: '#0891b2' }}>
              STANDARD
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: '#475569', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {template.specialty && (
            <span>{template.specialty}{template.subspecialty ? ` — ${template.subspecialty}` : ''}</span>
          )}
          {template.standard && <span>{template.standard}</span>}
          <span>{nodeCount} active slot{nodeCount !== 1 ? 's' : ''}</span>
          <span>Updated {updatedAt}</span>
        </div>
      </div>

      {/* Actions */}
      {hovered && (
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
          {!isStandard && (
            <button onClick={onEdit} style={btn('#0891b2', true)}>Edit</button>
          )}
          <button onClick={onDuplicate} disabled={isDuplicating} style={btn('#475569', true)}>
            {isDuplicating ? '…' : 'Duplicate'}
          </button>
          {!isStandard && (
            confirmDelete ? (
              <>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>Delete?</span>
                <button onClick={onDelete} disabled={isDeleting} style={btn('#ef4444', true)}>
                  {isDeleting ? '…' : 'Yes'}
                </button>
                <button onClick={() => setConfirmDelete(false)} style={btn('#1e293b', true)}>No</button>
              </>
            ) : (
              <button onClick={() => setConfirmDelete(true)} style={btn('#1e293b', true)}>Delete</button>
            )
          )}
        </div>
      )}
    </div>
  );
};

// ── Main tab ───────────────────────────────────────────────────

const TemplateListTab: React.FC = () => {
  const navigate = useNavigate();
  const [templates, setTemplates]           = useState<ReportTemplate[]>([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState<string | null>(null);
  const [filter, setFilter]                 = useState<'all' | ReportTemplate['status']>('all');
  const [search, setSearch]                 = useState('');
  const [deletingId, setDeletingId]         = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await svc.getAll();
      if (result.ok) setTemplates(result.data);
      else setError(result.error);
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    return onReportTemplatesChanged(load);
  }, [load]);

  const handleCreate = async (fromStandardId?: string) => {
    if (fromStandardId) {
      const result = await svc.clone(fromStandardId, 'My Surgical Pathology Report');
      if (result.ok) navigate(`/admin/templates/${result.data.id}/edit`);
      else setError(result.error);
    } else {
      navigate('/admin/templates/new');
    }
  };

  const handleDuplicate = async (id: string) => {
    setDuplicatingId(id);
    try {
      const result = await svc.clone(id);
      if (result.ok) navigate(`/admin/templates/${result.data.id}/edit`);
      else setError(result.error);
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Failed to duplicate');
    } finally {
      setDuplicatingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const result = await svc.remove(id);
      if (!result.ok) setError(result.error);
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = templates
    .filter(t => filter === 'all' || t.status === filter)
    .filter(t => !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.specialty ?? '').toLowerCase().includes(search.toLowerCase())
    );

  const counts = {
    all:       templates.length,
    published: templates.filter(t => t.status === 'published').length,
    draft:     templates.filter(t => t.status === 'draft').length,
    archived:  templates.filter(t => t.status === 'archived').length,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 4 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Report Templates</h2>
          <p style={{ fontSize: 12, color: '#475569', margin: '3px 0 0' }}>
            Define structure, fields, and AI generation for Orchestration mode
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => handleCreate(STANDARD_TEMPLATE_ID)}
            style={btn('#334155')}
            title="Copy the standard surgical pathology layout as a starting point"
          >
            From Standard
          </button>
          <button onClick={() => handleCreate()} style={btn('#0891b2')}>
            + New Template
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, fontSize: 12, color: '#fca5a5',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {error}
          <button onClick={() => setError(null)}
            style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Filter + search */}
      {!loading && templates.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', gap: 2, background: '#0d1117', borderRadius: 6,
            padding: 2, border: '1px solid #1e293b' }}>
            {(['all', 'published', 'draft', 'archived'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                background: filter === f ? '#1e293b' : 'transparent', border: 'none',
                borderRadius: 4, color: filter === f ? '#f1f5f9' : '#475569',
                fontSize: 11, fontWeight: filter === f ? 600 : 400,
                padding: '4px 10px', cursor: 'pointer', textTransform: 'capitalize',
              }}>
                {f}{counts[f] > 0 && <span style={{ opacity: 0.6 }}> ({counts[f]})</span>}
              </button>
            ))}
          </div>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search templates…"
            style={{ flex: 1, maxWidth: 260, background: '#0d1117', border: '1px solid #1e293b',
              borderRadius: 6, color: '#cbd5e1', fontSize: 12, padding: '6px 10px', outline: 'none' }}
          />
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{ padding: 32, textAlign: 'center', fontSize: 13, color: '#334155' }}>
          Loading templates…
        </div>
      ) : filtered.length === 0 && templates.length === 0 ? (
        <EmptyState
          onBlank={() => handleCreate()}
          onStandard={() => handleCreate(STANDARD_TEMPLATE_ID)}
        />
      ) : filtered.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', fontSize: 13, color: '#334155' }}>
          No templates match your search
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filtered.map(t => (
            <TemplateRow
              key={t.id}
              template={t}
              onEdit={() => navigate(`/admin/templates/${t.id}/edit`)}
              onDuplicate={() => handleDuplicate(t.id)}
              onDelete={() => handleDelete(t.id)}
              isDeleting={deletingId === t.id}
              isDuplicating={duplicatingId === t.id}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TemplateListTab;

// ── Helpers ────────────────────────────────────────────────────

function countNodes(template: ReportTemplate): number {
  return template.assembly?.filter(s => s.enabled).length ?? 0;
}

function btn(color: string, small = false): React.CSSProperties {
  return {
    background: color, border: 'none', borderRadius: small ? 5 : 7,
    color: '#fff', cursor: 'pointer', fontSize: small ? 11 : 12,
    fontWeight: 600, padding: small ? '4px 10px' : '7px 16px', whiteSpace: 'nowrap',
  };
}
