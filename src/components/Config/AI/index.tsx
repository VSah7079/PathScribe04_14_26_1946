import React, { useState, useEffect } from 'react';
import '../../../pathscribe.css';
import { aiBehaviorService } from '../../../services/aiBehavior/IAIBehaviorService';
import type { AIBehaviorConfig } from '../../../services/aiBehavior/IAIBehaviorService';
import AiProviderSettings from './AiProviderSettings';

const AITab: React.FC<{ ModelsPanel?: React.ComponentType }> = ({ ModelsPanel }) => {
  const [config,     setConfig]     = useState<AIBehaviorConfig | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [modelsOpen, setModelsOpen] = useState(false);

  useEffect(() => {
    aiBehaviorService.get().then(res => {
      if (res.ok) setConfig(res.data);
      setLoading(false);
    });
  }, []);

  const update = async (changes: Partial<AIBehaviorConfig>) => {
    if (!config) return;
    setSaving(true);
    const res = await aiBehaviorService.update(changes);
    if (res.ok) setConfig(res.data);
    setSaving(false);
  };

  if (loading || !config) return (
    <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--ps-conf-text-3)', fontSize: 14 }}>
      Loading AI settings…
    </div>
  );

  return (
    <div style={{ padding: '24px' }}>
      <h2 className="ps-conf-section-title">AI Behavior</h2>
      <p className="ps-conf-section-subtitle" style={{ marginBottom: 24 }}>
        Configure how the AI assists with gross and microscopic reporting.
      </p>

      {/* ── Gross-Driven AI ── */}
      <div className="ps-conf-card" style={{ marginBottom: 12 }}>
        <div className="ps-conf-row">
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ps-conf-text)', marginBottom: 4 }}>
              Gross-Driven AI
            </div>
            <div style={{ fontSize: 13, color: 'var(--ps-conf-text-2)' }}>
              AI suggestions based on gross examination findings.
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flexShrink: 0 }}>
            <input type="checkbox" checked={config.grossEnabled}
              onChange={e => update({ grossEnabled: e.target.checked })}
              style={{ width: 16, height: 16, accentColor: 'var(--ps-conf-teal)' }} />
            <span style={{ fontSize: 14, color: 'var(--ps-conf-text)' }}>Enabled</span>
          </label>
        </div>
      </div>

      {/* ── Microscopic-Driven AI ── */}
      <div className="ps-conf-card" style={{ marginBottom: 12 }}>
        <div className="ps-conf-row">
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ps-conf-text)', marginBottom: 4 }}>
              Microscopic-Driven AI
            </div>
            <div style={{ fontSize: 13, color: 'var(--ps-conf-text-2)' }}>
              AI suggestions based on microscopic diagnosis findings.
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flexShrink: 0 }}>
            <input type="checkbox" checked={config.microscopicEnabled}
              onChange={e => update({ microscopicEnabled: e.target.checked })}
              style={{ width: 16, height: 16, accentColor: 'var(--ps-conf-teal)' }} />
            <span style={{ fontSize: 14, color: 'var(--ps-conf-text)' }}>Enabled</span>
          </label>
        </div>
      </div>

      {/* ── Confidence Threshold ── */}
      <div className="ps-conf-card" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ps-conf-text)', marginBottom: 4 }}>
          Confidence Threshold
        </div>
        <div style={{ fontSize: 13, color: 'var(--ps-conf-text-2)', marginBottom: 16 }}>
          Minimum confidence score before AI suggestions are shown.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <input type="range" min={0} max={100} value={config.confidenceThreshold}
            onChange={e => update({ confidenceThreshold: Number(e.target.value) })}
            style={{ flex: 1, accentColor: 'var(--ps-conf-teal)' }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ps-conf-teal)', minWidth: 44 }}>
            {config.confidenceThreshold}%
          </span>
        </div>
      </div>

      {/* ── Additional Toggles ── */}
      <div className="ps-conf-card" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ps-conf-text)', marginBottom: 4 }}>
          Advanced
        </div>
        <div style={{ fontSize: 13, color: 'var(--ps-conf-text-2)', marginBottom: 8 }}>
          Additional AI behaviour settings.
        </div>
        {([
          ['autoInsertSuggestions', 'Auto-insert suggestions at or above confidence threshold'],
          ['showConfidenceScores',  'Show confidence scores in the editor UI'],
          ['macroSuggestions',      'Suggest macros based on diagnosis context'],
          ['subspecialtyRouting',   'Filter AI suggestions by subspecialty'],
        ] as const).map(([key, label]) => (
          <label key={key} className="ps-conf-row" style={{ cursor: 'pointer', alignItems: 'center' }}>
            <span style={{ fontSize: 14, color: 'var(--ps-conf-text)' }}>{label}</span>
            <input type="checkbox" checked={config[key] as boolean}
              onChange={e => update({ [key]: e.target.checked })}
              style={{ width: 16, height: 16, accentColor: 'var(--ps-conf-teal)', flexShrink: 0 }} />
          </label>
        ))}
      </div>

      {/* ── Actions ── */}
      <div style={{ display: 'flex', gap: 10, marginTop: 8, alignItems: 'center' }}>
        <button
          onClick={async () => {
            setSaving(true);
            const res = await aiBehaviorService.reset();
            if (res.ok) setConfig(res.data);
            setSaving(false);
          }}
          className="ps-btn-secondary"
        >
          Reset to Defaults
        </button>
        {saving && <span style={{ fontSize: 13, color: 'var(--ps-conf-text-3)' }}>Saving…</span>}
      </div>

      {/* ── AI Provider Configuration ── */}
      <div style={{ marginTop: 40, borderTop: '1px solid var(--ps-conf-border)', paddingTop: 32 }}>
        <AiProviderSettings isAdmin={true} />
      </div>

      {/* ── Model Versions — admin only ── */}
      {ModelsPanel && (
        <div style={{ marginTop: 32, borderTop: '1px solid var(--ps-conf-border)', paddingTop: 24 }}>
          <button
            onClick={() => setModelsOpen(o => !o)}
            className="ps-conf-label"
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none',
              border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{ transition: 'transform 0.2s', transform: modelsOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            Model Versions
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10,
              background: 'rgba(255,255,255,0.06)', color: 'var(--ps-conf-text-dim)', letterSpacing: 0 }}>
              Admin only
            </span>
          </button>
          {modelsOpen && <div style={{ marginTop: 20 }}><ModelsPanel /></div>}
        </div>
      )}
    </div>
  );
};

export default AITab;
