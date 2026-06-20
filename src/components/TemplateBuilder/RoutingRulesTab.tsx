// src/components/TemplateBuilder/RoutingRulesTab.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Admin UI for template routing rule management and testing.
//
// Three sections:
//   1. Client Overrides    — specific client always gets a specific template
//   2. Physician Preferences — specific physician preference
//   3. Test Panel          — enter case details, see which template resolves
//
// Lives as a sub-tab within Report Templates section alongside
// "Report Templates" and "Part Library".
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState, useCallback } from 'react';
import '@/pathscribe.css';
import { useAuditLog } from '@/components/Audit/useAuditLog';
import { mockRoutingRuleService }       from '@/services/routingRules/mockRoutingRuleService';
import { resolveReportTemplate }        from '@/services/reportTemplates/TemplateRoutingService';
import { mockReportTemplateService }    from '@/services/reportTemplates/mockReportTemplateService';
import { mockClientService }            from '@/services/clients/mockClientService';
import { mockPhysicianService }         from '@/services/physicians/mockPhysicianService';
import type { RoutingRule, RoutingRuleType } from '@/services/routingRules/IRoutingRuleService';
import type { ReportTemplate }          from '@/types/reportPart';
import type { Client }                  from '@/services/clients/IClientService';
import type { Physician }               from '@/services/physicians/IPhysicianService';

// ── Add/Edit Rule Modal ───────────────────────────────────────────────────────

const RuleModal: React.FC<{
  type:       RoutingRuleType;
  rule?:      RoutingRule;
  templates:  ReportTemplate[];
  clients:    Client[];
  physicians: Physician[];
  onSave:     (rule: Partial<RoutingRule>) => void;
  onClose:    () => void;
}> = ({ type, rule, templates, clients, physicians, onSave, onClose }) => {
  const [entityId,    setEntityId]    = useState(rule?.entityId    ?? '');
  const [templateId,  setTemplateId]  = useState(rule?.templateId  ?? '');
  const [note,        setNote]        = useState(rule?.note        ?? '');

  const entityLabel  = type === 'client' ? 'Client' : 'Physician';
  const entityList   = type === 'client'
    ? clients.map(c => ({ id: c.id as string, name: `${c.name} (${c.code})` }))
    : physicians.map(p => ({ id: p.id as string, name: `${p.lastName}, ${p.firstName} — ${p.specialty}` }));

  const selectedEntity   = entityList.find(e => e.id === entityId);
  const selectedTemplate = templates.find(t => t.id === templateId);

  const canSave = entityId && templateId;

  return (
    <div className="ps-overlay" onClick={onClose}>
      <div className="ps-modal-dark ps-modal-dark--narrow" onClick={e => e.stopPropagation()}>
        <div className="ps-modal-dark-header">
          <span className="ps-modal-dark-title">
            {rule ? 'Edit' : 'Add'} {entityLabel} Routing Rule
          </span>
          <button className="ps-research-close" onClick={onClose}>✕</button>
        </div>

        <div className="ps-modal-dark-body" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '20px 24px' }}>
          <div>
            <div className="ps-conf-label">{entityLabel}</div>
            <select
              className="ps-conf-select"
              value={entityId}
              onChange={e => setEntityId(e.target.value)}
            >
              <option value="">— Select {entityLabel.toLowerCase()} —</option>
              {entityList.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="ps-conf-label">Report Template</div>
            <select
              className="ps-conf-select"
              value={templateId}
              onChange={e => setTemplateId(e.target.value)}
            >
              <option value="">— Select template —</option>
              {templates.filter(t => t.status === 'published').map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="ps-conf-label">Note (optional)</div>
            <input
              className="ps-conf-input"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Why does this override exist?"
            />
          </div>

          {entityId && templateId && (
            <div className="ps-rr-preview">
              <span className="ps-rr-preview-arrow">→</span>
              <span className="ps-rr-preview-entity">{selectedEntity?.name}</span>
              <span className="ps-rr-preview-always">always uses</span>
              <span className="ps-rr-preview-template">{selectedTemplate?.name}</span>
            </div>
          )}
        </div>

        <div className="ps-modal-dark-footer">
          <button className="ps-btn-ghost-dark" onClick={onClose}>Cancel</button>
          <button
            className="ps-btn-primary"
            disabled={!canSave}
            onClick={() => onSave({
              type, entityId, templateId, note,
              entityName:   selectedEntity?.name ?? entityId,
              templateName: selectedTemplate?.name ?? templateId,
              active: true,
            })}
          >
            {rule ? 'Save Changes' : 'Add Rule'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Rule Row ──────────────────────────────────────────────────────────────────

const RuleRow: React.FC<{
  rule:      RoutingRule;
  onEdit:    () => void;
  onDelete:  () => void;
  onToggle:  () => void;
}> = ({ rule, onEdit, onDelete, onToggle }) => {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className={`ps-rr-row${!rule.active ? ' ps-rr-row--inactive' : ''}`}>
      <div className="ps-rr-row-main">
        <span className="ps-rr-entity">{rule.entityName}</span>
        <span className="ps-rr-arrow">→</span>
        <span className="ps-rr-template">{rule.templateName}</span>
        {rule.note && <span className="ps-rr-note">{rule.note}</span>}
      </div>
      <div className="ps-rr-row-actions">
        <button
          className={`ps-rr-toggle${rule.active ? ' ps-rr-toggle--on' : ''}`}
          onClick={onToggle}
          title={rule.active ? 'Disable rule' : 'Enable rule'}
        >
          {rule.active ? 'Active' : 'Disabled'}
        </button>
        <button className="ps-rr-btn" onClick={onEdit}>Edit</button>
        {confirmDelete ? (
          <>
            <span className="ps-rr-confirm-text">Delete?</span>
            <button className="ps-rr-btn ps-rr-btn--danger" onClick={onDelete}>Yes</button>
            <button className="ps-rr-btn" onClick={() => setConfirmDelete(false)}>No</button>
          </>
        ) : (
          <button className="ps-rr-btn ps-rr-btn--ghost" onClick={() => setConfirmDelete(true)}>Delete</button>
        )}
      </div>
    </div>
  );
};

// ── Test Panel ────────────────────────────────────────────────────────────────

const TestPanel: React.FC<{
  templates:  ReportTemplate[];
  clients:    Client[];
  physicians: Physician[];
  rules:      RoutingRule[];
}> = ({ templates, clients, physicians, rules }) => {
  const [synopticId,   setSynopticId]   = useState('');
  const [subspecialty, setSubspecialty] = useState('');
  const [clientId,     setClientId]     = useState('');
  const [physicianId,  setPhysicianId]  = useState('');
  const [result,       setResult]       = useState<any>(null);

  const test = () => {
    // Build dynamic override maps from active rules
    const clientMap:    Record<string, string> = {};
    const physicianMap: Record<string, string> = {};
    rules.filter(r => r.active).forEach(r => {
      if (r.type === 'client')    clientMap[r.entityId]    = r.templateId;
      if (r.type === 'physician') physicianMap[r.entityId] = r.templateId;
    });

    const resolved = resolveReportTemplate({
      synopticTemplateIds:  synopticId.trim() ? [synopticId.trim()] : [],
      subspecialtyId:       subspecialty || undefined,
      performingClientId:   clientId     || undefined,
      orderingPhysicianId:  physicianId  || undefined,
      _clientOverrides:     clientMap,
      _physicianOverrides:  physicianMap,
    } as any);
    const template = templates.find(t => t.id === resolved.templateId);
    setResult({ ...resolved, templateName: template?.name ?? resolved.templateId });
  };

  const PASS_LABELS: Record<string, string> = {
    'client-override':    'Pass 0 — Client override',
    'physician-preference': 'Pass 0b — Physician preference',
    'cap-protocol':       'Pass 1 — CAP protocol match',
    'subspecialty':       'Pass 2 — Subspecialty fallback',
    'gold-standard':      'Pass 3 — Gold standard fallback',
  };

  const PASS_COLORS: Record<string, string> = {
    'client-override':      '#f59e0b',
    'physician-preference': '#a78bfa',
    'cap-protocol':         '#10b981',
    'subspecialty':         '#38bdf8',
    'gold-standard':        '#64748b',
  };

  return (
    <div className="ps-rr-test">
      <div className="ps-rr-test-title">🧪 Test Template Routing</div>
      <div className="ps-rr-test-subtitle">
        Enter case details to see which template would be selected and why.
      </div>

      <div className="ps-rr-test-fields">
        <div>
          <div className="ps-conf-label">CAP Synoptic Template ID</div>
          <input className="ps-conf-input" value={synopticId} onChange={e => setSynopticId(e.target.value)} placeholder="e.g. cap-breast-invasive-resection" />
        </div>
        <div>
          <div className="ps-conf-label">Subspecialty</div>
          <select className="ps-conf-select" value={subspecialty} onChange={e => setSubspecialty(e.target.value)}>
            <option value="">— Any —</option>
            {['breast','gi','thoracic','uro','derm','neuro','heme','gyn'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <div className="ps-conf-label">Performing Client</div>
          <select className="ps-conf-select" value={clientId} onChange={e => setClientId(e.target.value)}>
            <option value="">— None —</option>
            {clients.map(c => <option key={c.id as string} value={c.id as string}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <div className="ps-conf-label">Ordering Physician</div>
          <select className="ps-conf-select" value={physicianId} onChange={e => setPhysicianId(e.target.value)}>
            <option value="">— None —</option>
            {physicians.map(p => <option key={p.id as string} value={p.id as string}>{p.lastName}, {p.firstName}</option>)}
          </select>
        </div>
      </div>

      <button className="ps-btn-primary" onClick={test} style={{ marginTop: 8 }}>
        Test Routing →
      </button>

      {result && (
        <div className="ps-rr-result">
          <div className="ps-rr-result-template">{result.templateName}</div>
          <div
            className="ps-rr-result-pass"
            style={{ color: PASS_COLORS[result.resolvedBy] ?? '#64748b' }}
          >
            {PASS_LABELS[result.resolvedBy] ?? result.resolvedBy}
          </div>
          {result.ambiguous && (
            <div className="ps-rr-result-warn">
              ⚠️ Ambiguous — multiple templates qualify: {result.candidates.join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Main Tab ──────────────────────────────────────────────────────────────────

const RoutingRulesTab: React.FC = () => {
  const [rules,      setRules]      = useState<RoutingRule[]>([]);
  const [templates,  setTemplates]  = useState<ReportTemplate[]>([]);
  const [clients,    setClients]    = useState<Client[]>([]);
  const [physicians, setPhysicians] = useState<Physician[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState<{ type: RoutingRuleType; rule?: RoutingRule } | null>(null);
  const { log } = useAuditLog();

  const load = useCallback(async () => {
    setLoading(true);
    const [rulesRes, templatesRes, clientsRes, physiciansRes] = await Promise.all([
      mockRoutingRuleService.getAll(),
      mockReportTemplateService.getAll(),
      mockClientService.getAll(),
      mockPhysicianService.getAll(),
    ]);
    if ((rulesRes as any).ok)      setRules((rulesRes as any).data);
    if ((templatesRes as any).ok)  setTemplates((templatesRes as any).data);
    if ((clientsRes as any).ok)    setClients((clientsRes as any).data.filter((c: Client) => c.status === 'Active'));
    if ((physiciansRes as any).ok) setPhysicians((physiciansRes as any).data.filter((p: Physician) => p.status === 'Active'));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (data: Partial<RoutingRule>) => {
    if (modal?.rule) {
      await mockRoutingRuleService.update(modal.rule.id, data);
      log('validation_routing_rule_updated', {
        entityName:   data.entityName  ?? modal.rule.entityName,
        templateName: data.templateName ?? modal.rule.templateName,
      });
    } else {
      await mockRoutingRuleService.add({ ...data, createdBy: 'admin' } as any);
      log('validation_routing_rule_added', {
        entityName:   data.entityName  ?? '',
        templateName: data.templateName ?? '',
        ruleType:     data.type ?? 'client',
      });
    }
    setModal(null);
    load();
  };

  const handleDelete = async (id: string) => {
    const rule = rules.find(r => r.id === id);
    await mockRoutingRuleService.remove(id);
    if (rule) log('validation_routing_rule_deleted', { entityName: rule.entityName, ruleType: rule.type });
    load();
  };

  const handleToggle = async (rule: RoutingRule) => {
    await mockRoutingRuleService.update(rule.id, { active: !rule.active });
    load();
  };

  const clientRules    = rules.filter(r => r.type === 'client');
  const physicianRules = rules.filter(r => r.type === 'physician');

  if (loading) return <div className="ps-conf-loading">Loading routing rules…</div>;

  return (
    <div className="ps-rr-root">

      {/* Header */}
      <div className="ps-rr-header">
        <div>
          <h2 className="tmpl-list-title">Template Routing Rules</h2>
          <p className="tmpl-list-subtitle">
            Define which report template is selected for specific clients or physicians.
            Rules override the default CAP protocol → subspecialty → gold standard chain.
          </p>
        </div>
      </div>

      <div className="ps-rr-layout">
        <div className="ps-rr-tables">

          {/* Priority chain reference */}
          <div className="ps-rr-priority">
            <div className="ps-rr-priority-title">Resolution priority</div>
            {[
              { pass: '0',   label: 'Client override',       color: '#f59e0b' },
              { pass: '0b',  label: 'Physician preference',  color: '#a78bfa' },
              { pass: '1',   label: 'CAP protocol match',    color: '#10b981' },
              { pass: '2',   label: 'Subspecialty fallback', color: '#38bdf8' },
              { pass: '3',   label: 'Gold standard',         color: '#64748b' },
            ].map(p => (
              <div key={p.pass} className="ps-rr-priority-row">
                <span className="ps-rr-priority-pass" style={{ color: p.color }}>Pass {p.pass}</span>
                <span className="ps-rr-priority-label">{p.label}</span>
                {['0','0b'].includes(p.pass) && <span className="ps-rr-priority-admin">← admin-defined</span>}
              </div>
            ))}
          </div>

          {/* Client overrides */}
          <div className="ps-rr-section">
            <div className="ps-rr-section-header">
              <span className="ps-rr-section-title">Client Overrides</span>
              <span className="ps-rr-section-pass" style={{ color: '#f59e0b' }}>Pass 0</span>
              <button className="ps-section-add-btn" onClick={() => setModal({ type: 'client' })}>
                + Add Client Rule
              </button>
            </div>
            {clientRules.length === 0 ? (
              <div className="ps-rr-empty">No client overrides defined — routing falls through to CAP protocol matching.</div>
            ) : clientRules.map(r => (
              <RuleRow
                key={r.id} rule={r}
                onEdit={() => setModal({ type: 'client', rule: r })}
                onDelete={() => handleDelete(r.id)}
                onToggle={() => handleToggle(r)}
              />
            ))}
          </div>

          {/* Physician preferences */}
          <div className="ps-rr-section">
            <div className="ps-rr-section-header">
              <span className="ps-rr-section-title">Physician Preferences</span>
              <span className="ps-rr-section-pass" style={{ color: '#a78bfa' }}>Pass 0b</span>
              <button className="ps-section-add-btn" onClick={() => setModal({ type: 'physician' })}>
                + Add Physician Rule
              </button>
            </div>
            {physicianRules.length === 0 ? (
              <div className="ps-rr-empty">No physician preferences defined.</div>
            ) : physicianRules.map(r => (
              <RuleRow
                key={r.id} rule={r}
                onEdit={() => setModal({ type: 'physician', rule: r })}
                onDelete={() => handleDelete(r.id)}
                onToggle={() => handleToggle(r)}
              />
            ))}
          </div>
        </div>

        {/* Test panel */}
        <TestPanel
          templates={templates}
          clients={clients}
          physicians={physicians}
          rules={rules}
        />
      </div>

      {modal && (
        <RuleModal
          type={modal.type}
          rule={modal.rule}
          templates={templates}
          clients={clients}
          physicians={physicians}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
};

export default RoutingRulesTab;
