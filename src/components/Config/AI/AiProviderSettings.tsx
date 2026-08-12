// src/components/Config/AI/AiProviderSettings.tsx
// ─────────────────────────────────────────────────────────────
// Admin UI for configuring the org-level AI provider.
// Accessible from Settings → AI Provider.
//
// Admins select the provider and model; API keys are configured
// in the backend secrets manager and never entered here.
// Developers can set a personal override (with key) for local testing.
<<<<<<< HEAD
=======
//
// Labels/notes below deliberately show real vendor and model names —
// unlike the internal AiProviderId type (protocol-shape-named, see
// aiProviderConfig.ts), an admin picking a provider here needs to know
// which real vendor account/contract they're actually configuring.
>>>>>>> upstream/main
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import {
  resolveAiConfig,
  setOrgAiConfig,
  setUserAiConfig,
  clearUserAiConfig,
  isDevMode,
  PROVIDER_MODELS,
  type AiProviderId,
  type AiProviderConfig,
} from '@/components/Config/AI/aiProviderConfig';

const PROVIDER_LABELS: Record<AiProviderId, string> = {
<<<<<<< HEAD
  anthropic:   'Anthropic (Claude)',
  openai:      'OpenAI (GPT-4)',
  azure_openai:'Azure OpenAI',
  aws_bedrock: 'AWS Bedrock',
  custom:      'Self-hosted / Custom endpoint',
};

const PROVIDER_NOTES: Record<AiProviderId, string> = {
  anthropic:   'API key managed server-side. Contact PathScribe support to rotate keys.',
  openai:      'API key managed server-side. Contact PathScribe support to rotate keys.',
  azure_openai:'Requires Azure deployment name and endpoint. Key managed server-side.',
  aws_bedrock: 'Uses IAM role credentials on the server. No API key needed here.',
  custom:      'Must be an OpenAI-compatible endpoint. Auth managed server-side.',
=======
  structured_messages:      'Anthropic (Claude)',
  chat_completions:         'OpenAI (GPT-4)',
  chat_completions_managed: 'Azure OpenAI',
  model_gateway:            'AWS Bedrock',
  structured_content:       'Google (Gemini)',
  mock:                     'Mock — Demo Mode',
  custom:                   'Self-hosted / Custom endpoint',
};

const PROVIDER_NOTES: Record<AiProviderId, string> = {
  structured_messages:      'API key managed server-side. Contact PathScribe support to rotate keys.',
  chat_completions:         'API key managed server-side. Contact PathScribe support to rotate keys.',
  chat_completions_managed: 'Requires Azure deployment name and endpoint. Key managed server-side.',
  model_gateway:            'Uses IAM role credentials on the server. No API key needed here.',
  structured_content:       'API key managed server-side. Contact PathScribe support to rotate keys.',
  mock:                     'No API connection. Returns instant deterministic responses. Use for demos and offline testing only.',
  custom:                   'Must be an OpenAI-compatible endpoint. Auth managed server-side.',
>>>>>>> upstream/main
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1px solid rgba(148,163,184,0.3)',
  background: '#0f172a', color: '#e2e8f0', fontSize: 13,
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: '#64748b',
  textTransform: 'uppercase', letterSpacing: '0.05em',
  marginBottom: 6, display: 'block',
};

interface AiProviderSettingsProps {
  /** true = org admin view (saves org config), false = dev override view */
  isAdmin?: boolean;
  onSaved?: () => void;
}

const AiProviderSettings: React.FC<AiProviderSettingsProps> = ({
  isAdmin = false,
  onSaved,
}) => {
<<<<<<< HEAD
  const current = resolveAiConfig();

  const [providerId,    setProviderId]    = useState<AiProviderId>(current.providerId);
  const [modelId,       setModelId]       = useState(current.modelId);
  const [azureEndpoint, setAzureEndpoint] = useState(current.azureEndpoint ?? '');
  const [azureDeployment, setAzureDeployment] = useState(current.azureDeploymentName ?? '');
  const [awsRegion,     setAwsRegion]     = useState(current.awsRegion ?? 'us-east-1');
=======
  const rawConfig = resolveAiConfig();
  // Guard: if the stored providerId isn't a known key (e.g. after a host
  // migration corrupted / cleared localStorage), fall back to
  // 'structured_messages' so PROVIDER_MODELS[providerId] is never undefined.
  const current = PROVIDER_MODELS[rawConfig.providerId]
    ? rawConfig
    : { ...rawConfig, providerId: 'structured_messages' as AiProviderId, modelId: PROVIDER_MODELS['structured_messages'][0].id };

  const [providerId,    setProviderId]    = useState<AiProviderId>(current.providerId);
  const [modelId,       setModelId]       = useState(current.modelId);
  const [managedEndpoint, setManagedEndpoint] = useState(current.managedEndpoint ?? '');
  const [managedDeployment, setManagedDeployment] = useState(current.managedDeploymentName ?? '');
  const [gatewayRegion, setGatewayRegion] = useState(current.gatewayRegion ?? 'us-east-1');
>>>>>>> upstream/main
  const [customEndpoint,setCustomEndpoint]= useState(current.customEndpoint ?? '');
  const [devApiKey,     setDevApiKey]     = useState('');
  const [saved,         setSaved]         = useState(false);
  const [testResult,    setTestResult]    = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [testError,     setTestError]     = useState('');

  // When provider changes, reset model to first available
  useEffect(() => {
    const models = PROVIDER_MODELS[providerId];
    if (models?.length) setModelId(models[0].id);
  }, [providerId]);

  const handleSave = () => {
    const config = {
      providerId,
      modelId,
<<<<<<< HEAD
      azureDeploymentName: azureEndpoint ? azureDeployment : undefined,
      azureEndpoint:       azureEndpoint || undefined,
      awsRegion:           awsRegion || undefined,
      customEndpoint:      customEndpoint || undefined,
=======
      managedDeploymentName: managedEndpoint ? managedDeployment : undefined,
      managedEndpoint:       managedEndpoint || undefined,
      gatewayRegion:         gatewayRegion || undefined,
      customEndpoint:        customEndpoint || undefined,
>>>>>>> upstream/main
    };

    if (isAdmin) {
      setOrgAiConfig(config);
    } else {
      // Dev override — include API key if provided
      const devConfig: Partial<AiProviderConfig> = { ...config };
      if (devApiKey) devConfig.apiKey = devApiKey;
      setUserAiConfig(devConfig);
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    onSaved?.();
  };

  const handleTest = async () => {
    setTestResult('testing');
    setTestError('');
    try {
      // Dynamic import to avoid pulling the service into admin bundles unnecessarily
      const { callAi } = await import('@/services/aiIntegration/aiProviderService');
      const { text } = await callAi({
        system: 'You are a test assistant.',
        prompt: 'Reply with exactly: PathScribe AI connection OK',
        maxTokens: 20,
      });
      setTestResult(text.includes('OK') || text.length > 0 ? 'ok' : 'fail');
    } catch (e: any) {
      setTestResult('fail');
      setTestError(e?.message ?? 'Unknown error');
    }
  };

  const handleClearOverride = () => {
    clearUserAiConfig();
    const refreshed = resolveAiConfig();
    setProviderId(refreshed.providerId);
    setModelId(refreshed.modelId);
<<<<<<< HEAD
    setAzureEndpoint(refreshed.azureEndpoint ?? '');
    setAzureDeployment(refreshed.azureDeploymentName ?? '');
    setAwsRegion(refreshed.awsRegion ?? 'us-east-1');
=======
    setManagedEndpoint(refreshed.managedEndpoint ?? '');
    setManagedDeployment(refreshed.managedDeploymentName ?? '');
    setGatewayRegion(refreshed.gatewayRegion ?? 'us-east-1');
>>>>>>> upstream/main
    setCustomEndpoint(refreshed.customEndpoint ?? '');
    setDevApiKey('');
  };

  const devOnly = !isAdmin;

  return (
    <div style={{ maxWidth: 560, padding: '24px 0' }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>
        {isAdmin ? '🔧 AI Provider — Organisation Settings' : '🧪 AI Provider — Developer Override'}
      </h2>
      <p style={{ fontSize: 12, color: '#64748b', marginBottom: 24 }}>
        {isAdmin
          ? 'Sets the AI provider for all users in this organisation. API keys are managed server-side and never entered here.'
          : 'Local override for development and testing. Takes priority over org settings. Never use in production.'}
      </p>

      {/* Active config summary */}
      <div style={{ background: 'rgba(8,145,178,0.08)', border: '1px solid rgba(8,145,178,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 24, fontSize: 12, color: '#38bdf8' }}>
        <strong>Currently active:</strong>{' '}
        {PROVIDER_LABELS[current.providerId]} · {current.modelId}
        {isDevMode() && <span style={{ marginLeft: 8, color: '#fbbf24' }}>⚠ Dev mode — direct API calls enabled</span>}
      </div>

<<<<<<< HEAD
=======
      {/* Demo mode banner */}
      {providerId === 'mock' && (
        <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 24, fontSize: 12, color: '#34d399' }}>
          <strong>Demo Mode active</strong> — AI responses are instant and simulated. No API calls are made. Safe for offline demos and testing. Switch to a real provider before clinical use.
        </div>
      )}

>>>>>>> upstream/main
      {/* Provider selector */}
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>AI Provider</label>
        <select
          value={providerId}
          onChange={e => setProviderId(e.target.value as AiProviderId)}
          style={inputStyle}
        >
<<<<<<< HEAD
          {(Object.keys(PROVIDER_LABELS) as AiProviderId[]).map(id => (
            <option key={id} value={id}>{PROVIDER_LABELS[id]}</option>
          ))}
=======
          {/* Real providers */}
          <optgroup label="Production Providers">
            {(['structured_messages', 'chat_completions', 'chat_completions_managed', 'model_gateway', 'structured_content', 'custom'] as AiProviderId[]).map(id => (
              <option key={id} value={id}>{PROVIDER_LABELS[id]}</option>
            ))}
          </optgroup>
          {/* Mock for demos */}
          <optgroup label="Development &amp; Demo">
            <option value="mock">{PROVIDER_LABELS.mock}</option>
          </optgroup>
>>>>>>> upstream/main
        </select>
        <p style={{ fontSize: 11, color: '#475569', marginTop: 6 }}>
          {PROVIDER_NOTES[providerId]}
        </p>
      </div>

      {/* Model selector */}
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Model</label>
        <select value={modelId} onChange={e => setModelId(e.target.value)} style={inputStyle}>
<<<<<<< HEAD
          {PROVIDER_MODELS[providerId].map(m => (
=======
          {(PROVIDER_MODELS[providerId] ?? PROVIDER_MODELS['structured_messages']).map(m => (
>>>>>>> upstream/main
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
      </div>

<<<<<<< HEAD
      {/* Azure-specific fields */}
      {providerId === 'azure_openai' && (
=======
      {/* Managed-deployment-specific fields */}
      {providerId === 'chat_completions_managed' && (
>>>>>>> upstream/main
        <>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Azure Resource Endpoint</label>
            <input
<<<<<<< HEAD
              type="url" value={azureEndpoint}
              onChange={e => setAzureEndpoint(e.target.value)}
=======
              type="url" value={managedEndpoint}
              onChange={e => setManagedEndpoint(e.target.value)}
>>>>>>> upstream/main
              placeholder="https://my-org.openai.azure.com"
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Deployment Name</label>
            <input
<<<<<<< HEAD
              type="text" value={azureDeployment}
              onChange={e => setAzureDeployment(e.target.value)}
=======
              type="text" value={managedDeployment}
              onChange={e => setManagedDeployment(e.target.value)}
>>>>>>> upstream/main
              placeholder="my-gpt4-deployment"
              style={inputStyle}
            />
          </div>
        </>
      )}

<<<<<<< HEAD
      {/* Bedrock region */}
      {providerId === 'aws_bedrock' && (
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>AWS Region</label>
          <input
            type="text" value={awsRegion}
            onChange={e => setAwsRegion(e.target.value)}
=======
      {/* Model gateway region */}
      {providerId === 'model_gateway' && (
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>AWS Region</label>
          <input
            type="text" value={gatewayRegion}
            onChange={e => setGatewayRegion(e.target.value)}
>>>>>>> upstream/main
            placeholder="us-east-1"
            style={inputStyle}
          />
        </div>
      )}

      {/* Custom endpoint */}
      {providerId === 'custom' && (
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Endpoint Base URL</label>
          <input
            type="url" value={customEndpoint}
            onChange={e => setCustomEndpoint(e.target.value)}
            placeholder="https://my-llm.hospital.internal/v1"
            style={inputStyle}
          />
          <p style={{ fontSize: 11, color: '#475569', marginTop: 6 }}>
            Must be OpenAI-compatible (POST /chat/completions).
          </p>
        </div>
      )}

      {/* Dev-only: API key field */}
      {devOnly && isDevMode() && (
        <div style={{ marginBottom: 20, padding: '12px 14px', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 8 }}>
          <label style={{ ...labelStyle, color: '#f59e0b' }}>
            ⚠ Dev API Key (local only — never commit this)
          </label>
          <input
            type="password" value={devApiKey}
            onChange={e => setDevApiKey(e.target.value)}
            placeholder="sk-ant-... or sk-..."
            style={{ ...inputStyle, borderColor: 'rgba(251,191,36,0.3)' }}
          />
          <p style={{ fontSize: 11, color: '#78350f', marginTop: 6 }}>
            Only used when VITE_AI_DEV_MODE=true. Set VITE_AI_API_KEY in .env instead to avoid entering this each session.
          </p>
        </div>
      )}

      {/* Action row */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
        <button
          onClick={handleSave}
<<<<<<< HEAD
          style={{
            padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700,
            background: '#0891B2', border: 'none', color: '#fff', cursor: 'pointer',
          }}
=======
          className="ps-conf-btn-primary"
>>>>>>> upstream/main
        >
          {saved ? '✓ Saved' : isAdmin ? 'Save Org Config' : 'Save Override'}
        </button>

        <button
          onClick={handleTest}
          disabled={testResult === 'testing'}
<<<<<<< HEAD
          style={{
            padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: 'transparent',
=======
          className="ps-conf-btn-secondary"
          style={{
>>>>>>> upstream/main
            border: `1.5px solid ${testResult === 'ok' ? '#10b981' : testResult === 'fail' ? '#f87171' : 'rgba(148,163,184,0.3)'}`,
            color: testResult === 'ok' ? '#10b981' : testResult === 'fail' ? '#f87171' : '#94a3b8',
            cursor: testResult === 'testing' ? 'wait' : 'pointer',
          }}
        >
          {testResult === 'testing' ? '⏳ Testing…'
           : testResult === 'ok'    ? '✓ Connection OK'
           : testResult === 'fail'  ? '✗ Failed'
           :                          'Test Connection'}
        </button>

        {devOnly && (
          <button
            onClick={handleClearOverride}
<<<<<<< HEAD
            style={{
              marginLeft: 'auto', padding: '9px 16px', borderRadius: 8,
              fontSize: 12, background: 'transparent',
              border: '1px solid rgba(148,163,184,0.2)', color: '#64748b', cursor: 'pointer',
            }}
=======
            className="ps-conf-btn-secondary"
            style={{ marginLeft: 'auto', fontSize: 12 }}
>>>>>>> upstream/main
          >
            Clear Override
          </button>
        )}
      </div>

      {testResult === 'fail' && testError && (
        <p style={{ marginTop: 10, fontSize: 12, color: '#f87171' }}>
          Error: {testError}
        </p>
      )}
    </div>
  );
};

export default AiProviderSettings;
