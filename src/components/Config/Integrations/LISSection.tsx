/**
 * LISSection.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Configuration UI for LIS (Laboratory Information System) integration settings.
 *
 * Architecture role:
 *   One of several focused section components that make up the System config tab
 *   (alongside FlagConfigPage, SpecimenDictionary, FontsSection, etc.).
 *   Each section is its own file — this keeps the System tab index lean and
 *   makes individual sections easy to find, test, and extend.
 *
 * What it configures:
 *   - Whether LIS integration is enabled
 *   - The LIS endpoint URL / display name
 *   - Whether the LIS owns major case statuses
 *   - Whether pathologists can initiate Addendum/Amendment directly in
 *     pathscribe (vs. being directed to the LIS)
 *
 * State:
 *   Reads from and writes to SystemConfigContext via useSystemConfig().
 *   Changes are shallow-merged and immediately persisted to localStorage —
 *   no explicit Save button needed for toggle-style settings.
 *   The endpoint field uses local draft state and saves on blur/confirm
 *   to avoid persisting every keystroke.
 *
 * Consumed by:
 *   components/Config/System/index.tsx  (renders this as the 'lis' section)
 *
 * Related files:
 *   types/systemConfig.ts               ← SystemConfig interface + defaults
 *   contexts/SystemConfigContext.tsx    ← provider + useSystemConfig hook
 *   pages/SynopticReportPage.tsx        ← reads lisIntegrationEnabled,
 *                                          allowPathScribePostFinalActions
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect } from 'react';
import '../../../pathscribe.css';
import { useSystemConfig } from '../../../contexts/SystemConfigContext';
import { mockReportReleaseService } from '../../../services/reportRelease/mockReportReleaseService';
import type { ReportReleaseOrgConfig } from '../../../services/reportRelease/IReportReleaseService';

// ─── Small reusable toggle ────────────────────────────────────────────────────

interface ToggleProps {
  enabled: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
  ariaLabel: string;
}

const Toggle: React.FC<ToggleProps> = ({ enabled, onChange, disabled = false, ariaLabel }) => (
  <button
    role="switch"
    aria-checked={enabled}
    aria-label={ariaLabel}
    disabled={disabled}
    onClick={() => !disabled && onChange(!enabled)}
    style={{
      width: '44px', height: '24px', borderRadius: '12px', border: 'none',
      background: disabled ? '#334155' : enabled ? '#0891B2' : '#475569',
      cursor: disabled ? 'not-allowed' : 'pointer',
      position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      opacity: disabled ? 0.5 : 1,
    }}
  >
    <span style={{
      position: 'absolute', top: '3px',
      left: enabled ? '23px' : '3px',
      width: '18px', height: '18px', borderRadius: '50%',
      background: 'white', transition: 'left 0.2s',
      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
    }} />
  </button>
);

// ─── Setting row ──────────────────────────────────────────────────────────────

interface SettingRowProps {
  label: string;
  description: string;
  children: React.ReactNode;
  /** Visually indent to show this setting is a child of another */
  indented?: boolean;
  /** Grey out the entire row when a parent setting is disabled */
  dimmed?: boolean;
}

const SettingRow: React.FC<SettingRowProps> = ({
  label, description, children, indented = false, dimmed = false,
}) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '14px 16px',
    marginLeft: indented ? '20px' : '0',
    borderLeft: indented ? '2px solid rgba(8,145,178,0.3)' : 'none',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '8px', marginBottom: '8px',
    opacity: dimmed ? 0.65 : 1,
    transition: 'opacity 0.2s',
  }}>
    <div style={{ flex: 1, marginRight: '16px' }}>
      <div style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9', marginBottom: '3px' }}>
        {label}
      </div>
      <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.5' }}>
        {description}
      </div>
    </div>
    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', paddingTop: '2px' }}>
      {children}
    </div>
  </div>
);

// ─── Connection status badge ──────────────────────────────────────────────────

const ConnectionStatus: React.FC<{ connected: boolean }> = ({ connected }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '10px 14px', borderRadius: '8px',
    background: connected ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
    border: `1px solid ${connected ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
    marginBottom: '20px',
  }}>
    <span style={{
      width: '8px', height: '8px', borderRadius: '50%',
      background: connected ? '#10B981' : '#ef4444',
      boxShadow: connected ? '0 0 6px #10B981' : '0 0 6px #ef4444',
      display: 'inline-block', flexShrink: 0,
    }} />
    <span style={{ fontSize: '13px', fontWeight: 600, color: connected ? '#10B981' : '#ef4444' }}>
      {connected ? 'Connected' : 'Not Connected'}
    </span>
    {connected && (
      <span style={{ fontSize: '12px', color: '#64748b' }}>— Last sync: 2 minutes ago</span>
    )}
  </div>
);

// ─── Post-Sign-Out Release Buffer (Phase 2) ────────────────────────────────────
// Real feature, per direct specification. Org-wide default only — the
// real, per-facility override lives on the Facility Configuration edit
// modal, same established split as idle-session-timeout (see
// SessionSecuritySection.tsx's own header comment: "Per-performing-lab
// overrides are set on the Facility Configuration edit modal instead").
// Deliberately placed under LIS Integration, per direct specification's
// own stated navigation: "Under Integration sublevel LIS Integrations."

const DURATION_MIN = 1;
const DURATION_MAX = 30;

const ReleaseBufferSettings: React.FC = () => {
  const [config, setConfig] = useState<ReportReleaseOrgConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    mockReportReleaseService.getOrgDefault().then(res => {
      if (res.ok) setConfig(res.data);
      setLoading(false);
    });
  }, []);

  const persist = async (next: ReportReleaseOrgConfig) => {
    setConfig(next);
    const res = await mockReportReleaseService.setOrgDefault(next);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  if (loading || !config) return null;
  const durationDimmed = !config.enabled;

  return (
    <div style={{ marginTop: '28px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px' }}>
          ⏳ Post-Sign-Out Release Buffer
        </h2>
        <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, lineHeight: '1.5' }}>
          A temporary hold window between sign-out and genuine external release,
          during which the signing pathologist can recall and correct a report
          without triggering a formal amendment. This is the org-wide default —
          individual performing labs can inherit it or define their own values
          on the Facility Configuration edit modal.
        </p>
      </div>

      <SettingRow
        label="Enable Post-Sign-Out Release Buffer"
        description="When on, a signed report is held at Pending Release for the configured duration before genuinely finalizing, unless a bypass rule below applies."
      >
        <Toggle enabled={config.enabled} onChange={val => persist({ ...config, enabled: val })} ariaLabel="Enable Post-Sign-Out Release Buffer" />
      </SettingRow>

      <SettingRow
        label="Buffer Duration"
        description={`How long a report stays recallable after sign-out, in minutes (${DURATION_MIN}–${DURATION_MAX}).`}
        indented
        dimmed={durationDimmed}
      >
        <input
          type="number"
          min={DURATION_MIN}
          max={DURATION_MAX}
          value={config.durationMinutes}
          disabled={!config.enabled}
          onChange={e => {
            const raw = Number(e.target.value);
            const clamped = Number.isFinite(raw) ? Math.min(DURATION_MAX, Math.max(DURATION_MIN, raw)) : config.durationMinutes;
            persist({ ...config, durationMinutes: clamped });
          }}
          style={{
            width: '80px', padding: '8px 12px', borderRadius: '7px',
            border: '1px solid rgba(255,255,255,0.12)',
            background: config.enabled ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
            color: '#f1f5f9', fontSize: '13px', outline: 'none',
            cursor: config.enabled ? 'text' : 'not-allowed',
          }}
        />
      </SettingRow>

      <SettingRow
        label="Bypass Buffer for STAT Cases"
        description="STAT-priority cases release immediately upon sign-out, regardless of the buffer duration above."
        indented
        dimmed={durationDimmed}
      >
        <Toggle
          enabled={config.bypassForStat}
          onChange={val => persist({ ...config, bypassForStat: val })}
          disabled={!config.enabled}
          ariaLabel="Bypass Buffer for STAT Cases"
        />
      </SettingRow>

      <SettingRow
        label="Watermark Banner Text"
        description="Rendered diagonally across any on-screen view of a Pending Release report, and sent through to hardcopy PDF generation."
        indented
        dimmed={durationDimmed}
      >
        <input
          type="text"
          value={config.watermarkText}
          disabled={!config.enabled}
          onChange={e => persist({ ...config, watermarkText: e.target.value })}
          style={{
            width: '360px', padding: '8px 12px', borderRadius: '7px',
            border: '1px solid rgba(255,255,255,0.12)',
            background: config.enabled ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
            color: '#f1f5f9', fontSize: '13px', outline: 'none',
            cursor: config.enabled ? 'text' : 'not-allowed',
          }}
        />
      </SettingRow>

      <SettingRow
        label="Restrict In-House Hardcopy Printing"
        description="Blocks hardcopy printing while a report is Pending Release, by default. An operator can override per print action — the printed PDF still carries the watermark above when they do."
        indented
        dimmed={durationDimmed}
      >
        <Toggle
          enabled={config.restrictHardcopyPrinting}
          onChange={val => persist({ ...config, restrictHardcopyPrinting: val })}
          disabled={!config.enabled}
          ariaLabel="Restrict In-House Hardcopy Printing"
        />
      </SettingRow>

      {saved && (
        <div style={{ marginTop: '4px', marginLeft: '16px', fontSize: '12px', color: '#22c55e', fontWeight: 600 }}>
          ✓ Saved
        </div>
      )}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const LISSection: React.FC = () => {
  const { config, updateConfig } = useSystemConfig();

  // Local draft state for the endpoint field — avoids persisting every keystroke.
  // Committed to context on blur.
  const [endpointDraft, setEndpointDraft] = useState(config.lisEndpoint);

  const {
    lisIntegrationEnabled,
    lisOwnsStatuses,
    allowPathScribePostFinalActions,
  } = config;

  // Derived: post-final action toggle is only meaningful when LIS is enabled
  const postFinalDimmed = !lisIntegrationEnabled;

  return (
    <div style={{ padding: '4px 0' }}>

      {/* ── Section header ── */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px' }}>
          🔗 LIS Integration
        </h2>
        <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, lineHeight: '1.5' }}>
          Configure how pathscribe interacts with your Laboratory Information System.
          When LIS integration is enabled, pathscribe sends status updates to the LIS
          at key workflow events so both systems stay in sync.
        </p>
      </div>

      {/* ── Connection status ── */}
      <ConnectionStatus connected={lisIntegrationEnabled} />

      {/* ── Master toggle ── */}
      <SettingRow
        label="LIS Integration Enabled"
        description="Connect pathscribe to your Laboratory Information System. Enables status synchronisation, endpoint configuration, and post-finalization workflow options below."
      >
        <Toggle
          enabled={lisIntegrationEnabled}
          onChange={val => updateConfig({ lisIntegrationEnabled: val })}
          ariaLabel="LIS Integration Enabled"
        />
      </SettingRow>

      {/* ── Endpoint ── */}
      <div style={{
        marginLeft: '20px', borderLeft: '2px solid rgba(8,145,178,0.3)',
        padding: '14px 16px', background: 'rgba(255,255,255,0.03)',
        borderRadius: '8px', marginBottom: '8px',
        opacity: lisIntegrationEnabled ? 1 : 0.65,
        transition: 'opacity 0.2s',
      }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9', marginBottom: '3px' }}>
          LIS Endpoint
        </div>
        <div style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '10px', lineHeight: '1.5' }}>
          Display name or URL of your LIS. Used for reference and status push notifications.
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={endpointDraft}
            disabled={!lisIntegrationEnabled}
            onChange={e => setEndpointDraft(e.target.value)}
            onBlur={() => updateConfig({ lisEndpoint: endpointDraft })}
            placeholder="e.g. CoPath Plus — https://lis.hospital.org/api"
            style={{
              flex: 1, padding: '8px 12px', borderRadius: '7px',
              border: '1px solid rgba(255,255,255,0.12)',
              background: lisIntegrationEnabled ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
              color: '#f1f5f9', fontSize: '13px', outline: 'none',
              cursor: lisIntegrationEnabled ? 'text' : 'not-allowed',
            }}
          />
          <button
            disabled={!lisIntegrationEnabled}
            onClick={() => updateConfig({ lisEndpoint: endpointDraft })}
            style={{
              padding: '8px 14px', borderRadius: '7px',
              background: lisIntegrationEnabled ? '#0891B2' : 'rgba(255,255,255,0.05)',
              border: 'none', color: lisIntegrationEnabled ? 'white' : '#475569',
              fontSize: '12px', fontWeight: 600,
              cursor: lisIntegrationEnabled ? 'pointer' : 'not-allowed',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (lisIntegrationEnabled) e.currentTarget.style.background = '#0e7490'; }}
            onMouseLeave={e => { if (lisIntegrationEnabled) e.currentTarget.style.background = '#0891B2'; }}
          >
            Save
          </button>
        </div>
      </div>

      {/* ── LIS owns statuses ── */}
      <SettingRow
        label="LIS Owns Case Statuses"
        description="When enabled, the LIS is the authoritative source for all major case statuses (Received, In Progress, Signed Out, Amended). pathscribe sends notifications but does not independently set these statuses."
        indented
        dimmed={!lisIntegrationEnabled}
      >
        <Toggle
          enabled={lisOwnsStatuses}
          onChange={val => updateConfig({ lisOwnsStatuses: val })}
          disabled={!lisIntegrationEnabled}
          ariaLabel="LIS Owns Case Statuses"
        />
      </SettingRow>

      {/* ── Section divider ── */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.07)',
        margin: '20px 0 16px',
      }} />

      {/* ── Post-finalization actions header ── */}
      <div style={{ marginBottom: '12px', opacity: postFinalDimmed ? 0.65 : 1, transition: 'opacity 0.2s' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#cbd5e1', marginBottom: '3px' }}>
          Post-Finalization Workflows
        </div>
        <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.5' }}>
          Controls whether Addendum and Amendment actions can be initiated directly
          in pathscribe after a case is signed out. Only relevant when LIS integration
          is enabled — without a LIS, pathscribe always owns these workflows.
        </div>
      </div>

      {/* ── Allow pathscribe to initiate Addendum / Amendment ── */}
      <SettingRow
        label="Allow pathscribe to Initiate Addendum / Amendment"
        description={
          lisIntegrationEnabled
            ? "When on: pathologists can start Addendum and Amendment workflows in pathscribe. pathscribe notifies the LIS so statuses stay in sync. When off: these buttons are hidden — pathologists must initiate post-finalization actions in the LIS."
            : "Only applicable when LIS integration is enabled. Without a LIS, pathscribe always owns Addendum and Amendment workflows."
        }
        indented
        dimmed={postFinalDimmed}
      >
        <Toggle
          enabled={allowPathScribePostFinalActions}
          onChange={val => updateConfig({ allowPathScribePostFinalActions: val })}
          disabled={!lisIntegrationEnabled}
          ariaLabel="Allow pathscribe to Initiate Addendum / Amendment"
        />
      </SettingRow>

      {/* ── Contextual note when LIS is on but actions are disabled ── */}
      {lisIntegrationEnabled && !allowPathScribePostFinalActions && (
        <div style={{
          marginLeft: '20px',
          padding: '10px 14px',
          borderRadius: '8px',
          background: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.25)',
          fontSize: '12px', color: '#fbbf24', lineHeight: '1.5',
        }}>
          ⚠️ Addendum and Amendment buttons are hidden on the Synoptic Report page.
          Pathologists will be directed to initiate these actions in the LIS.
        </div>
      )}

      {/* ── Contextual note when LIS is on and actions are enabled ── */}
      {lisIntegrationEnabled && allowPathScribePostFinalActions && (
        <div style={{
          marginLeft: '20px',
          padding: '10px 14px',
          borderRadius: '8px',
          background: 'rgba(8,145,178,0.08)',
          border: '1px solid rgba(8,145,178,0.2)',
          fontSize: '12px', color: '#7dd3fc', lineHeight: '1.5',
        }}>
          ✓ pathscribe will send a status update to the LIS when an Addendum
          or Amendment is signed out. Ensure your LIS endpoint above is correctly
          configured to receive these notifications.
        </div>
      )}

      <ReleaseBufferSettings />

    </div>
  );
};

export default LISSection;
